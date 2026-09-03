import { lstat, mkdir, open, realpath, rename, rm } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

type SessionHeader = Record<string, unknown> & {
  id: string
  cwd?: string
  origin?: string
}

type HostSession = {
  id: string
  header: SessionHeader
  events: readonly unknown[]
}

type SessionStoreEntry = {
  session: HostSession
  announced?: boolean
  detach?: () => void
}

type SessionStore = {
  get: (sessionId: string) => SessionStoreEntry | undefined
  delete: (sessionId: string) => boolean
  set: (sessionId: string, entry: SessionStoreEntry) => unknown
}

type WorkspaceEntity = {
  id: string
  path: string
  title: string
  sessionIds: readonly string[]
  record?: { sessionIds?: readonly string[] }
  attachSession: (sessionId: string) => Promise<void>
  detachSession: (sessionId: string) => Promise<void>
  insertSessionBefore: (sessionId: string, beforeSessionId?: string) => Promise<void>
}

type StoredSession = {
  meta: SessionHeader
  events: readonly unknown[]
  inheritedEventCount?: number
}

type SessionPreparation = {
  session: HostSession
  [Symbol.dispose]: () => void
}

export type SessionMigrationServices = {
  agents: {
    get: (sessionId: string) => {
      cancel: (reason: { kind: 'disposed' }) => void
      whenIdle?: () => Promise<void>
      scope?: { dispose?: () => Promise<void> }
    } | undefined
    store?: { delete: (sessionId: string) => boolean }
  }
  sessions: {
    get: (sessionId: string) => HostSession | undefined
    store?: SessionStore
    flush: (session: HostSession) => Promise<void>
    prepare: (sessionId: string, options: { seedSource: 'persistence'; seed: readonly unknown[]; meta: SessionHeader; inheritedEventCount?: number }) => HostSession
    enter: (session: HostSession) => () => void
    announce?: (session: HostSession) => void
  }
  sessionPersistence: {
    list: () => Promise<readonly SessionHeader[]>
    readRaw: (sessionId: string) => Promise<{ meta: SessionHeader; content: string } | undefined>
    loadStored: (sessionId: string) => Promise<StoredSession | undefined>
    locate: (meta: SessionHeader) => { path: string } | undefined
    prepare?: (sessionId: string) => Promise<SessionPreparation>
  }
  workspaceRegistry: { list: () => readonly WorkspaceEntity[] }
  sessionProjectionCache?: { coldSnapshot?: (sessionId: string) => Promise<unknown> }
  emit?: (event: string, ...args: unknown[]) => void
  logger?: { warn: (message: string) => void; info?: (message: string) => void }
}

export type SessionMoveResult = {
  sessionId: string
  moved: boolean
  fromWorkspaceIds: string[]
  toWorkspaceId: string
  toWorkspaceTitle: string
}

export type SessionMigrationOptions = {
  /** 仅用于隔离测试会话编码失败；生产环境始终使用内置编码器。 */
  encodeArtifact?: typeof encodeSessionArtifact
}

export class SessionMoveError extends Error {
  constructor(readonly code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'SessionMoveError'
  }
}

const movingSessions = new Set<string>()

function rawSessionIds(workspace: WorkspaceEntity): readonly string[] {
  return Array.isArray(workspace.record?.sessionIds) ? workspace.record.sessionIds : workspace.sessionIds
}

function validIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 512 && !/[\u0000-\u001f\u007f]/.test(value)
}

async function pathExists(path: string): Promise<boolean> {
  try { await lstat(path); return true } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

async function writeTemporaryFile(finalPath: string, data: Uint8Array): Promise<string> {
  const temporaryPath = `${finalPath}.${randomBytes(6).toString('hex')}.tmp`
  const handle = await open(temporaryPath, 'wx', 0o600)
  try {
    await handle.writeFile(data)
    await handle.sync()
  } finally {
    await handle.close()
  }
  return temporaryPath
}

async function encodeSessionArtifact(headerLine: string, body: string, zstd: boolean): Promise<Uint8Array> {
  if (!zstd) return Buffer.from(`${headerLine}\n${body}`, 'utf8')
  const { zstdCompress } = await import('node:zlib')
  if (typeof zstdCompress !== 'function') {
    throw new SessionMoveError('session-move/zstd-unavailable', '当前 Node.js 运行时不支持 Zstd 会话迁移。')
  }
  const compress = (data: Uint8Array): Promise<Buffer> => new Promise((resolvePromise, rejectPromise) => {
    zstdCompress(data, (error, output) => { if (error === null) resolvePromise(output); else rejectPromise(error) })
  })
  const headerFrame = await compress(Buffer.from(`${headerLine}\n`, 'utf8'))
  if (body === '') return headerFrame
  const bodyFrame = await compress(Buffer.from(body, 'utf8'))
  return Buffer.concat([headerFrame, bodyFrame])
}

class ArtifactDirectoryMove {
  private directoryMoved = false
  private backupCreated = false
  private published = false
  private temporaryPath?: string
  private readonly oldDirectory: string
  private readonly newDirectory: string
  private readonly movedOldArtifact: string
  private readonly backupArtifact: string

  constructor(private readonly oldArtifact: string, private readonly newArtifact: string) {
    this.oldDirectory = dirname(oldArtifact)
    this.newDirectory = dirname(newArtifact)
    const relativeArtifact = relative(this.oldDirectory, oldArtifact)
    if (relativeArtifact.startsWith('..') || resolve(this.oldDirectory, relativeArtifact) !== resolve(oldArtifact)) {
      throw new SessionMoveError('session-move/path-invalid', '会话工件路径无效。')
    }
    this.movedOldArtifact = join(this.newDirectory, relativeArtifact)
    this.backupArtifact = join(this.newDirectory, `${basename(oldArtifact)}.${randomBytes(6).toString('hex')}.dcu-backup`)
  }

  async publish(bytes: Uint8Array): Promise<void> {
    if (resolve(this.oldDirectory).toLowerCase() === resolve(this.newDirectory).toLowerCase()) {
      throw new SessionMoveError('session-move/path-conflict', '源项目和目标项目使用了相同的会话目录。')
    }
    if (await pathExists(this.newDirectory)) {
      throw new SessionMoveError('session-move/destination-occupied', '目标项目已经存在同名会话工件。')
    }
    try {
      await mkdir(dirname(this.newDirectory), { recursive: true })
      await rename(this.oldDirectory, this.newDirectory)
      this.directoryMoved = true
      await rename(this.movedOldArtifact, this.backupArtifact)
      this.backupCreated = true
      this.temporaryPath = await writeTemporaryFile(this.newArtifact, bytes)
      await rename(this.temporaryPath, this.newArtifact)
      this.temporaryPath = undefined
      this.published = true
    } catch (error) {
      try { await this.rollback() } catch (rollbackError) {
        throw new SessionMoveError('session-move/rollback-failed', '迁移会话工件失败，且自动回滚未完整完成。', { cause: rollbackError })
      }
      if (error instanceof SessionMoveError) throw error
      throw new SessionMoveError('session-move/artifact-failed', '迁移会话工件失败，原会话已恢复。', { cause: error })
    }
  }

  async rollback(): Promise<void> {
    const failures: unknown[] = []
    if (this.temporaryPath !== undefined) {
      try { await rm(this.temporaryPath, { force: true }) } catch (error) { failures.push(error) }
      this.temporaryPath = undefined
    }
    if (this.published) {
      try { await rm(this.newArtifact, { force: true }); this.published = false } catch (error) { failures.push(error) }
    }
    if (this.backupCreated) {
      try { await rename(this.backupArtifact, this.movedOldArtifact); this.backupCreated = false } catch (error) { failures.push(error) }
    }
    if (this.directoryMoved) {
      try { await mkdir(dirname(this.oldDirectory), { recursive: true }); await rename(this.newDirectory, this.oldDirectory); this.directoryMoved = false } catch (error) { failures.push(error) }
    }
    if (failures.length > 0) throw new AggregateError(failures, '会话工件回滚失败')
  }

  async commit(logger?: SessionMigrationServices['logger']): Promise<void> {
    if (!this.backupCreated) return
    try {
      await rm(this.backupArtifact, { force: true })
      this.backupCreated = false
    } catch (error) {
      logger?.warn(`会话迁移成功，但旧工件备份清理失败：${String(error)}`)
    }
  }
}

type WorkspaceSnapshot = {
  workspace: WorkspaceEntity
  contained: boolean
  beforeId?: string
}

function workspaceSnapshots(workspaces: readonly WorkspaceEntity[], sessionId: string): WorkspaceSnapshot[] {
  return workspaces.map(workspace => {
    const ids = [...rawSessionIds(workspace)]
    const index = ids.indexOf(sessionId)
    return { workspace, contained: index >= 0, beforeId: index >= 0 ? ids[index + 1] : undefined }
  })
}

async function restoreWorkspaceSnapshots(snapshots: readonly WorkspaceSnapshot[], sessionId: string): Promise<void> {
  for (const snapshot of snapshots) {
    if (!snapshot.contained && rawSessionIds(snapshot.workspace).includes(sessionId)) {
      await snapshot.workspace.detachSession(sessionId)
    }
  }
  for (const snapshot of snapshots) {
    if (!snapshot.contained) continue
    if (!rawSessionIds(snapshot.workspace).includes(sessionId)) await snapshot.workspace.attachSession(sessionId)
    const currentIds = rawSessionIds(snapshot.workspace)
    const beforeId = snapshot.beforeId !== undefined && currentIds.includes(snapshot.beforeId) ? snapshot.beforeId : undefined
    await snapshot.workspace.insertSessionBefore(sessionId, beforeId)
  }
}

type EnteredStoredSession = {
  detach: () => void
  releasePreparation: () => void
}

async function enterStoredSession(services: SessionMigrationServices, sessionId: string, stored: StoredSession): Promise<EnteredStoredSession> {
  const preparation = services.sessionPersistence.prepare === undefined
    ? undefined
    : await services.sessionPersistence.prepare(sessionId)
  const session = preparation?.session ?? services.sessions.prepare(sessionId, {
    seedSource: 'persistence',
    seed: stored.events,
    meta: stored.meta,
    inheritedEventCount: stored.inheritedEventCount,
  })
  const detach = services.sessions.enter(session)
  try {
    services.sessions.announce?.(session)
  } catch (error) {
    detach()
    preparation?.[Symbol.dispose]()
    throw error
  }
  return {
    detach,
    releasePreparation: () => { preparation?.[Symbol.dispose]() },
  }
}

function detachOriginalEntry(store: SessionStore | undefined, sessionId: string, entry: SessionStoreEntry | undefined): void {
  if (store === undefined || entry === undefined || store.get(sessionId) !== entry) return
  if (entry.detach === undefined) {
    throw new SessionMoveError('session-move/service-unavailable', '宿主无法安全释放原会话入口。')
  }
  entry.detach()
  if (store.get(sessionId) === entry) {
    throw new SessionMoveError('session-move/quiesce-failed', '原会话入口未能完整释放。')
  }
}

async function rollbackMove(
  services: SessionMigrationServices,
  sessionId: string,
  transaction: ArtifactDirectoryMove,
  snapshots: readonly WorkspaceSnapshot[],
  originalStored: StoredSession,
  originalEntry: SessionStoreEntry | undefined,
  enteredPlaceholder: EnteredStoredSession | undefined,
): Promise<void> {
  const failures: unknown[] = []
  try { enteredPlaceholder?.detach() } catch (error) { failures.push(error) }
  try { enteredPlaceholder?.releasePreparation() } catch (error) { failures.push(error) }
  try { await transaction.rollback() } catch (error) { failures.push(error) }

  let restored: EnteredStoredSession | undefined
  try {
    if (services.sessions.get(sessionId) === undefined) restored = await enterStoredSession(services, sessionId, originalStored)
    await restoreWorkspaceSnapshots(snapshots, sessionId)
  } catch (error) {
    failures.push(error)
  } finally {
    try {
      if (originalEntry === undefined) restored?.detach()
      restored?.releasePreparation()
    } catch (error) { failures.push(error) }
  }
  if (failures.length > 0) throw new AggregateError(failures, '会话迁移回滚失败')
}

async function moveAccounting(target: WorkspaceEntity, snapshots: readonly WorkspaceSnapshot[], sessionId: string): Promise<void> {
  for (const snapshot of snapshots) {
    if (snapshot.workspace.id !== target.id && snapshot.contained) await snapshot.workspace.detachSession(sessionId)
  }
  await target.attachSession(sessionId)
}

/**
 * 把持久化会话完整迁移到目标项目。整个会话目录一起移动，任何提交前失败都会恢复原工件和项目顺序。
 */
export async function moveSessionToWorkspace(
  services: SessionMigrationServices,
  sessionId: string,
  targetWorkspaceId: string,
  options: SessionMigrationOptions = {},
): Promise<SessionMoveResult> {
  if (!validIdentifier(sessionId) || !validIdentifier(targetWorkspaceId)) {
    throw new SessionMoveError('session-move/invalid-request', '会话或目标项目标识无效。')
  }
  if (movingSessions.has(sessionId)) throw new SessionMoveError('session-move/busy', '该会话正在移动，请稍后重试。')
  movingSessions.add(sessionId)
  try {
    const workspaces = services.workspaceRegistry.list()
    const target = workspaces.find(workspace => workspace.id === targetWorkspaceId)
    if (target === undefined) throw new SessionMoveError('session-move/workspace-not-found', '目标项目不存在。')
    const snapshots = workspaceSnapshots(workspaces, sessionId)
    const targetSnapshot = snapshots.find(snapshot => snapshot.workspace.id === target.id)
    const sources = snapshots.filter(snapshot => snapshot.contained && snapshot.workspace.id !== target.id)
    if (sources.length > 1 || (targetSnapshot?.contained === true && sources.length > 0)) {
      throw new SessionMoveError('session-move/accounting-invalid', '会话当前的项目归属不一致，无法安全移动。')
    }

    const persistedHeaders = await services.sessionPersistence.list()
    const persistedHeader = persistedHeaders.find(header => header.id === sessionId)
    if (persistedHeader === undefined) throw new SessionMoveError('session-move/session-not-found', '该会话没有可迁移的持久化记录。')
    if (persistedHeader.origin === 'subagent') throw new SessionMoveError('session-move/subagent-unsupported', '子代理会话不能移动到其他项目。')

    const targetPath = await realpath(target.path)
    let currentPath: string | undefined
    if (persistedHeader.cwd !== undefined) {
      try { currentPath = await realpath(persistedHeader.cwd) } catch { currentPath = undefined }
    }
    if (currentPath === targetPath && targetSnapshot?.contained === true && sources.length === 0) {
      return { sessionId, moved: false, fromWorkspaceIds: [target.id], toWorkspaceId: target.id, toWorkspaceTitle: target.title || target.id }
    }

    const liveSession = services.sessions.get(sessionId)
    const originalEntry = services.sessions.store?.get(sessionId)
    if (liveSession !== undefined && (services.sessions.store === undefined || originalEntry === undefined)) {
      throw new SessionMoveError('session-move/service-unavailable', '宿主无法提供可恢复的会话入口，暂时不能移动活跃会话。')
    }

    // 工作目录已经正确时只修复项目归属，不停止 Agent，也不摘除原会话入口。
    if (currentPath === targetPath) {
      const stored = liveSession === undefined ? await services.sessionPersistence.loadStored(sessionId) : undefined
      if (liveSession === undefined && stored === undefined) {
        throw new SessionMoveError('session-move/session-not-found', '读取会话持久化记录失败。')
      }
      let enteredPlaceholder: EnteredStoredSession | undefined
      try {
        if (stored !== undefined) enteredPlaceholder = await enterStoredSession(services, sessionId, stored)
        await moveAccounting(target, snapshots, sessionId)
      } catch (error) {
        try { await restoreWorkspaceSnapshots(snapshots, sessionId) } catch (rollbackError) {
          throw new SessionMoveError('session-move/rollback-failed', '恢复项目归属失败。', { cause: rollbackError })
        }
        throw new SessionMoveError('session-move/accounting-failed', '更新项目归属失败，原会话已恢复。', { cause: error })
      } finally {
        enteredPlaceholder?.detach()
        enteredPlaceholder?.releasePreparation()
      }
      return {
        sessionId,
        moved: true,
        fromWorkspaceIds: sources.map(snapshot => snapshot.workspace.id),
        toWorkspaceId: target.id,
        toWorkspaceTitle: target.title || target.id,
      }
    }

    const agent = services.agents.get(sessionId)
    try {
      if (agent !== undefined) {
        agent.cancel({ kind: 'disposed' })
        await agent.whenIdle?.()
      }
      if (liveSession !== undefined) await services.sessions.flush(liveSession)
    } catch (error) {
      throw new SessionMoveError('session-move/quiesce-failed', '会话仍在运行，暂时无法移动。', { cause: error })
    }

    // 刷新完成后再读取，确保迁移工件包含停止前的最后一批事件。
    const raw = await services.sessionPersistence.readRaw(sessionId)
    const originalStored = await services.sessionPersistence.loadStored(sessionId)
    if (raw === undefined || originalStored === undefined) throw new SessionMoveError('session-move/session-not-found', '读取会话持久化记录失败。')
    const newlineIndex = raw.content.indexOf('\n')
    const headerText = newlineIndex < 0 ? raw.content : raw.content.slice(0, newlineIndex)
    const body = newlineIndex < 0 ? '' : raw.content.slice(newlineIndex + 1)
    let header: SessionHeader
    try { header = JSON.parse(headerText) as SessionHeader } catch (error) {
      throw new SessionMoveError('session-move/artifact-invalid', '会话工件头部无法解析。', { cause: error })
    }
    if (header.id !== sessionId) throw new SessionMoveError('session-move/artifact-invalid', '会话工件标识与请求不一致。')
    const targetHeader = { ...header, cwd: targetPath }
    const targetMeta = { ...raw.meta, cwd: targetPath }
    const oldLocation = services.sessionPersistence.locate(raw.meta)
    const newLocation = services.sessionPersistence.locate(targetMeta)
    if (oldLocation === undefined || newLocation === undefined) throw new SessionMoveError('session-move/path-invalid', '宿主无法定位会话工件。')

    // 编码和路径校验都必须在摘除原 Store 入口前完成，失败时原会话仍可访问。
    const encoder = options.encodeArtifact ?? encodeSessionArtifact
    const bytes = await encoder(JSON.stringify(targetHeader), body, newLocation.path.endsWith('.zstd'))
    const transaction = new ArtifactDirectoryMove(oldLocation.path, newLocation.path)

    try {
      await agent?.scope?.dispose?.()
      services.agents.store?.delete(sessionId)
      detachOriginalEntry(services.sessions.store, sessionId, originalEntry)
    } catch (error) {
      if (originalEntry !== undefined && services.sessions.get(sessionId) === undefined) {
        try {
          const restored = await enterStoredSession(services, sessionId, originalStored)
          restored.releasePreparation()
        } catch (restoreError) {
          throw new SessionMoveError('session-move/rollback-failed', '恢复原会话入口失败。', { cause: restoreError })
        }
      }
      throw new SessionMoveError('session-move/quiesce-failed', '会话仍在运行，暂时无法移动。', { cause: error })
    }

    let enteredPlaceholder: EnteredStoredSession | undefined
    try {
      await transaction.publish(bytes)
      const movedStored = await services.sessionPersistence.loadStored(sessionId)
      if (movedStored === undefined || movedStored.meta.cwd !== targetPath) {
        throw new SessionMoveError('session-move/validation-failed', '迁移后的会话工件校验失败。')
      }
      enteredPlaceholder = await enterStoredSession(services, sessionId, movedStored)
      try {
        await moveAccounting(target, snapshots, sessionId)
      } catch (error) {
        throw new SessionMoveError('session-move/accounting-failed', '更新项目归属失败。', { cause: error })
      }
      enteredPlaceholder.detach()
      enteredPlaceholder.releasePreparation()
      enteredPlaceholder = undefined
      await transaction.commit(services.logger)
    } catch (error) {
      try {
        await rollbackMove(services, sessionId, transaction, snapshots, originalStored, originalEntry, enteredPlaceholder)
      } catch (rollbackError) {
        throw new SessionMoveError('session-move/rollback-failed', '会话移动失败，且自动回滚未完整完成。', { cause: rollbackError })
      }
      if (error instanceof SessionMoveError) throw error
      throw new SessionMoveError('session-move/failed', '会话移动失败，原会话已恢复。', { cause: error })
    }

    try { await services.sessionProjectionCache?.coldSnapshot?.(sessionId) } catch (error) {
      services.logger?.warn(`会话已移动，但投影缓存刷新失败：${String(error)}`)
    }
    services.logger?.info?.(`会话 ${sessionId} 已移动到项目 ${target.id}`)
    return {
      sessionId,
      moved: true,
      fromWorkspaceIds: sources.map(snapshot => snapshot.workspace.id),
      toWorkspaceId: target.id,
      toWorkspaceTitle: target.title || target.id,
    }
  } finally {
    movingSessions.delete(sessionId)
  }
}
