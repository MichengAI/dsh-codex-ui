import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { moveSessionToWorkspace, SessionMoveError, type SessionMigrationServices } from '../src/session-migration.ts'

const temporaryDirectories: string[] = []

afterEach(async () => {
  const { rm } = await import('node:fs/promises')
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

type FixtureOptions = {
  encodeFailure?: boolean
  emitFailure?: boolean
  failLoadStored?: boolean
  failTargetAttach?: boolean
  flushWritesEvent?: boolean
  live?: boolean
  sameWorkspacePath?: boolean
  strictPersistenceOwner?: boolean
  usePersistencePrepare?: boolean
  withoutSessionStore?: boolean
}

async function fixture(options: FixtureOptions = {}) {
  const root = await mkdtemp(join(tmpdir(), 'dcu-session-move-'))
  temporaryDirectories.push(root)
  const sourcePath = join(root, 'source-workspace')
  const targetPath = options.sameWorkspacePath === true ? sourcePath : join(root, 'target-workspace')
  const oldDirectory = join(root, 'artifacts', 'source', 'session-1')
  const newDirectory = join(root, 'artifacts', 'target', 'session-1')
  const oldArtifact = join(oldDirectory, 'session.jsonl')
  const newArtifact = join(newDirectory, 'session.jsonl')
  await Promise.all([mkdir(sourcePath, { recursive: true }), mkdir(targetPath, { recursive: true }), mkdir(oldDirectory, { recursive: true })])
  const header = { id: 'session-1', cwd: sourcePath, createdAt: '2026-09-03T00:00:00.000Z' }
  const event = { type: 'session/title', title: '迁移测试' }
  await writeFile(oldArtifact, `${JSON.stringify(header)}\n${JSON.stringify(event)}\n`, 'utf8')
  await writeFile(join(oldDirectory, 'attachment.bin'), '保留附件', 'utf8')

  const sourceRecord = { sessionIds: ['before', 'session-1', 'after'] }
  const targetRecord = { sessionIds: [] as string[] }
  const source = {
    id: 'source', path: sourcePath, title: '源项目', record: sourceRecord,
    get sessionIds() { return sourceRecord.sessionIds },
    async attachSession(id: string) { if (!sourceRecord.sessionIds.includes(id)) sourceRecord.sessionIds.unshift(id) },
    async detachSession(id: string) { sourceRecord.sessionIds = sourceRecord.sessionIds.filter(item => item !== id) },
    async insertSessionBefore(id: string, beforeId?: string) {
      const ids = sourceRecord.sessionIds.filter(item => item !== id)
      const index = beforeId === undefined ? ids.length : ids.indexOf(beforeId)
      ids.splice(index < 0 ? ids.length : index, 0, id)
      sourceRecord.sessionIds = ids
    },
  }
  const target = {
    id: 'target', path: targetPath, title: '目标项目', record: targetRecord,
    get sessionIds() { return targetRecord.sessionIds },
    async attachSession(id: string) {
      if (options.failTargetAttach === true) throw new Error('目标项目写入失败')
      if (!targetRecord.sessionIds.includes(id)) targetRecord.sessionIds.unshift(id)
    },
    async detachSession(id: string) { targetRecord.sessionIds = targetRecord.sessionIds.filter(item => item !== id) },
    async insertSessionBefore() {},
  }

  const store: NonNullable<SessionMigrationServices['sessions']['store']> = new Map()
  let originalDetachCalls = 0
  let persistenceOwnerActive = options.live === true
  const originalEntry: ReturnType<typeof store.get> = options.live === true
    ? {
        session: { id: 'session-1', header, events: [event] },
        announced: true,
        detach: () => {
          originalDetachCalls += 1
          persistenceOwnerActive = false
          store.delete('session-1')
        },
      }
    : undefined
  if (originalEntry !== undefined) store.set('session-1', originalEntry)

  const lifecycle: string[] = []
  const flushedEvent = { type: 'message', text: '刷新时写入的最后事件' }

  const services: SessionMigrationServices = {
    agents: {
      get: () => options.live === true ? {
        cancel: () => { lifecycle.push('cancel') },
        whenIdle: async () => { lifecycle.push('idle') },
        scope: { dispose: async () => { lifecycle.push('dispose') } },
      } : undefined,
      store: { delete: () => true },
    },
    sessions: {
      get: id => store.get(id)?.session,
      store: options.withoutSessionStore === true ? undefined : store,
      flush: async session => {
        lifecycle.push('flush')
        if (options.flushWritesEvent === true) {
          await writeFile(oldArtifact, `${JSON.stringify(header)}\n${JSON.stringify(event)}\n${JSON.stringify(flushedEvent)}\n`, 'utf8')
          ;(session.events as unknown[]).push(flushedEvent)
        }
      },
      prepare: (id, prepared) => ({ id, header: prepared.meta, events: [...prepared.seed] }),
      enter: session => {
        if (options.strictPersistenceOwner === true && persistenceOwnerActive) {
          throw new Error(`session "${session.id}" already has a live persistence owner (gateway/internal)`)
        }
        persistenceOwnerActive = true
        const entry = {
          session,
          announced: false,
          detach: () => {
            persistenceOwnerActive = false
            if (store.get(session.id) === entry) store.delete(session.id)
          },
        }
        store.set(session.id, entry)
        return entry.detach
      },
    },
    sessionPersistence: {
      list: async () => [header],
      readRaw: async () => {
        lifecycle.push('readRaw')
        return { meta: header, content: await readFile(oldArtifact, 'utf8') }
      },
      locate: meta => ({ path: meta.cwd === targetPath && options.sameWorkspacePath !== true ? newArtifact : oldArtifact }),
      loadStored: async () => {
        const moved = await exists(newArtifact)
        if (options.failLoadStored === true && moved) return undefined
        const content = await readFile(moved ? newArtifact : oldArtifact, 'utf8')
        const lines = content.trimEnd().split('\n')
        return { meta: JSON.parse(lines[0] ?? '{}'), events: lines.slice(1).map(line => JSON.parse(line)) }
      },
    },
    workspaceRegistry: { list: () => [source, target] },
    emit: options.emitFailure === true ? () => { throw new Error('通知失败') } : undefined,
  }
  if (options.usePersistencePrepare === true) {
    services.sessionPersistence.prepare = async id => {
      if (persistenceOwnerActive) throw new Error(`session "${id}" already has a live persistence owner`)
      const stored = await services.sessionPersistence.loadStored(id)
      if (stored === undefined) throw new Error(`session "${id}" not found`)
      return {
        session: services.sessions.prepare(id, {
          seedSource: 'persistence',
          seed: stored.events,
          meta: stored.meta,
          inheritedEventCount: stored.inheritedEventCount,
        }),
        [Symbol.dispose]: () => {},
      }
    }
  }
  return { services, sourcePath, targetPath, oldDirectory, newDirectory, oldArtifact, newArtifact, sourceRecord, targetRecord, store, originalEntry, lifecycle, flushedEvent, originalDetachCalls: () => originalDetachCalls, persistenceOwnerActive: () => persistenceOwnerActive }
}

async function exists(path: string): Promise<boolean> {
  try { await stat(path); return true } catch { return false }
}

describe('会话跨项目迁移', () => {
  test('同步改写 cwd、保留历史和会话目录中的附属文件', async () => {
    const current = await fixture()
    const result = await moveSessionToWorkspace(current.services, 'session-1', 'target')

    expect(result).toMatchObject({ moved: true, sessionId: 'session-1', fromWorkspaceIds: ['source'], toWorkspaceId: 'target' })
    const lines = (await readFile(current.newArtifact, 'utf8')).trimEnd().split('\n')
    expect(JSON.parse(lines[0] ?? '{}').cwd).toBe(current.targetPath)
    expect(JSON.parse(lines[1] ?? '{}')).toEqual({ type: 'session/title', title: '迁移测试' })
    expect(await readFile(join(current.newDirectory, 'attachment.bin'), 'utf8')).toBe('保留附件')
    expect(await exists(current.oldDirectory)).toBe(false)
    expect(current.sourceRecord.sessionIds).toEqual(['before', 'after'])
    expect(current.targetRecord.sessionIds).toEqual(['session-1'])
  })

  test('迁移后读取校验失败时恢复原目录和项目归属', async () => {
    const current = await fixture({ failLoadStored: true })

    await expect(moveSessionToWorkspace(current.services, 'session-1', 'target')).rejects.toMatchObject({
      code: 'session-move/validation-failed',
    } satisfies Partial<SessionMoveError>)
    expect(JSON.parse((await readFile(current.oldArtifact, 'utf8')).split('\n')[0] ?? '{}').cwd).toBe(current.sourcePath)
    expect(await readFile(join(current.oldDirectory, 'attachment.bin'), 'utf8')).toBe('保留附件')
    expect(await exists(current.newDirectory)).toBe(false)
    expect(current.sourceRecord.sessionIds).toEqual(['before', 'session-1', 'after'])
    expect(current.targetRecord.sessionIds).toEqual([])
  })

  test('目标项目记账失败时恢复磁盘、原顺序和原会话入口', async () => {
    const current = await fixture({ failTargetAttach: true, live: true, strictPersistenceOwner: true, usePersistencePrepare: true })

    await expect(moveSessionToWorkspace(current.services, 'session-1', 'target')).rejects.toMatchObject({
      code: 'session-move/accounting-failed',
    } satisfies Partial<SessionMoveError>)
    expect(JSON.parse((await readFile(current.oldArtifact, 'utf8')).split('\n')[0] ?? '{}').cwd).toBe(current.sourcePath)
    expect(await exists(current.newDirectory)).toBe(false)
    expect(current.sourceRecord.sessionIds).toEqual(['before', 'session-1', 'after'])
    expect(current.targetRecord.sessionIds).toEqual([])
    expect(current.store.get('session-1')).toBeDefined()
    expect(current.store.get('session-1')).not.toBe(current.originalEntry)
    expect(current.store.get('session-1')?.session.header.cwd).toBe(current.sourcePath)
    expect(current.persistenceOwnerActive()).toBe(true)
  })

  test('先停止 Agent 并刷新，再读取包含最后事件的迁移工件', async () => {
    const current = await fixture({ live: true, flushWritesEvent: true })

    await moveSessionToWorkspace(current.services, 'session-1', 'target')

    const lines = (await readFile(current.newArtifact, 'utf8')).trimEnd().split('\n')
    expect(lines.slice(1).map(line => JSON.parse(line))).toContainEqual(current.flushedEvent)
    expect(current.lifecycle.slice(0, 4)).toEqual(['cancel', 'idle', 'flush', 'readRaw'])
    expect(current.originalDetachCalls()).toBe(1)
    expect(current.store.get('session-1')).toBeUndefined()
  })

  test('注册迁移后的会话前先释放旧持久化所有者', async () => {
    const current = await fixture({ live: true, strictPersistenceOwner: true, usePersistencePrepare: true })

    await expect(moveSessionToWorkspace(current.services, 'session-1', 'target')).resolves.toMatchObject({ moved: true })

    expect(current.originalDetachCalls()).toBe(1)
    expect(current.persistenceOwnerActive()).toBe(false)
    expect(current.store.get('session-1')).toBeUndefined()
  })

  test('工件编码失败时保留原 Host 会话入口', async () => {
    const current = await fixture({ live: true })
    const encodeArtifact = vi.fn(async () => { throw new Error('编码失败') })

    await expect(moveSessionToWorkspace(current.services, 'session-1', 'target', { encodeArtifact })).rejects.toThrow('编码失败')

    expect(current.store.get('session-1')).toBe(current.originalEntry)
    expect(current.originalDetachCalls()).toBe(0)
    expect(await exists(current.oldArtifact)).toBe(true)
    expect(await exists(current.newDirectory)).toBe(false)
  })

  test('工作目录已是目标路径时只修复项目归属并保留原 Host 会话入口', async () => {
    const current = await fixture({ live: true, sameWorkspacePath: true })

    const result = await moveSessionToWorkspace(current.services, 'session-1', 'target')

    expect(result.moved).toBe(true)
    expect(current.sourceRecord.sessionIds).toEqual(['before', 'after'])
    expect(current.targetRecord.sessionIds).toEqual(['session-1'])
    expect(current.store.get('session-1')).toBe(current.originalEntry)
  })

  test('迁移成功后的通知异常不影响成功结果', async () => {
    const current = await fixture({ emitFailure: true })

    await expect(moveSessionToWorkspace(current.services, 'session-1', 'target')).resolves.toMatchObject({ moved: true })
    expect(await exists(current.newArtifact)).toBe(true)
    expect(current.targetRecord.sessionIds).toEqual(['session-1'])
  })

  test('活跃会话缺少可恢复 Store 时拒绝迁移', async () => {
    const current = await fixture({ live: true, withoutSessionStore: true })

    await expect(moveSessionToWorkspace(current.services, 'session-1', 'target')).rejects.toMatchObject({
      code: 'session-move/service-unavailable',
    } satisfies Partial<SessionMoveError>)
    expect(current.lifecycle).toEqual([])
    expect(await exists(current.oldArtifact)).toBe(true)
  })
})
