export type SessionRetainInfo = Readonly<Record<string, number | undefined>>

export type SessionListLike = {
  readonly current?: string
  readonly phase?: string
  readonly ids?: readonly string[]
  readonly byId?: Readonly<Record<string, {
    readonly id?: string
    readonly blank?: boolean
    readonly running?: boolean
    readonly pendingInteraction?: unknown
    readonly retainedBy?: SessionRetainInfo
  }>>
}

export type SessionStatusLike = {
  readonly running?: boolean
  readonly pendingInteraction?: { readonly kind?: unknown }
  readonly completionUnread?: boolean
}

export type SessionStatusSnapshot = ReadonlyMap<string, SessionStatusLike>
export type PendingInteractionSnapshot = ReadonlyMap<string, { readonly kind?: unknown }>

export type SessionBindingLike = {
  readonly ctx?: unknown
  readonly session?: {
    rename(title: string): Promise<{ ok: boolean; error?: { message?: string } }>
  }
}

export type SessionReferenceLike = {
  readonly binding?: SessionBindingLike
  readonly ready?: Promise<unknown>
  release?(): void
}

export type HostSessions = {
  open?(id: string): void
  retain?(id: string, options: { source: string }): SessionReferenceLike
  using?<T>(id: string, options: { source: string }, operation: (reference: SessionReferenceLike) => T | Promise<T>): Promise<T>
  binding?(id: string): SessionBindingLike | undefined
  fork?(opts: { sessionId: string; increaseTitle?: boolean }): Promise<string>
}

export type HostSessionAccess = {
  readonly reflect?: { get?: (name: string) => unknown }
  readonly get?: (name: string) => unknown
  readonly sessions?: HostSessions
  readonly workspaces?: {
    startSession?(workspaceId?: string): void
    archiveSession?(id: string): Promise<void>
  }
}

export class UnknownSessionError extends Error {
  constructor() {
    super('unknown session')
    this.name = 'UnknownSessionError'
  }
}

/** 旧宿主读 list.current；alpha.2 主视图改由 retainedBy.mainView 标记。 */
export function currentSessionId(state: SessionListLike | undefined): string | undefined {
  if (state === undefined) return undefined
  if (typeof state.current === 'string' && state.current !== '') return state.current
  const byId = state.byId ?? {}
  const ids = Array.isArray(state.ids) && state.ids.length > 0 ? state.ids : Object.keys(byId)
  const pick = (id: string, row: (typeof byId)[string] | undefined): string | undefined => {
    if (row === undefined || (row.retainedBy?.mainView ?? 0) <= 0) return undefined
    const explicit = row.id?.trim()
    return explicit !== undefined && explicit !== '' ? explicit : id
  }
  for (const id of ids) {
    const found = pick(id, byId[id])
    if (found !== undefined) return found
  }
  for (const id of Object.keys(byId)) {
    if (ids.includes(id)) continue
    const found = pick(id, byId[id])
    if (found !== undefined) return found
  }
  return undefined
}

/** 官方树在全局面板打开时取消会话选中。 */
export function visibleSelectedSessionId(state: SessionListLike | undefined, panelActive = false): string | undefined {
  return panelActive ? undefined : currentSessionId(state)
}

export function sessionRowUnread(localUnread: boolean, status?: SessionStatusLike, selected = false): boolean {
  return localUnread || (status?.completionUnread === true && !selected)
}

export function sessionRunningFlags(
  byId: Readonly<Record<string, { readonly running?: boolean } | undefined>>,
  status?: SessionStatusSnapshot,
): Readonly<Record<string, boolean>> {
  const ids = new Set<string>(Object.keys(byId))
  if (status !== undefined) for (const id of status.keys()) ids.add(id)
  const next: Record<string, boolean> = {}
  for (const id of ids) next[id] = sessionIsRunning(byId[id], status?.get(id))
  return next
}

/** 旧宿主看 current 是否空会话；alpha.2 看主视图 retain 的 blank。 */
export function isBlankOnboardingSession(state: SessionListLike | undefined): boolean {
  if (state?.phase !== 'ready') return false
  const id = currentSessionId(state)
  return id === undefined || state.byId?.[id]?.blank === true
}

function hostAccess(ctx: object): HostSessionAccess {
  return ctx as HostSessionAccess
}

/** 有 reflect 时只 probe，不能硬读未注入服务，否则 Cordis 会挡住插件激活。 */
export function probeService(ctx: object | undefined, name: string): unknown {
  if (ctx === undefined) return undefined
  const access = hostAccess(ctx)
  const reflectGet = access.reflect?.get
  const hasReflect = typeof reflectGet === 'function'
  if (hasReflect) {
    try {
      const found = reflectGet.call(access.reflect, name)
      if (found !== undefined) return found
    } catch { /* 未注入时不硬读 ctx[name]，改走 get */ }
  }
  if (typeof access.get === 'function') {
    try {
      const found = access.get(name)
      if (found !== undefined) return found
    } catch { return undefined }
  }
  if (hasReflect) return undefined
  try { return (access as Record<string, unknown>)[name] } catch { return undefined }
}

export function openHostSession(ctx: object, id: string): boolean {
  if (id === '') return false
  const access = hostAccess(ctx)
  const uiWorkspace = probeService(access, 'uiWorkspace') as { openSession?(target: string): void } | undefined
  if (typeof uiWorkspace?.openSession === 'function') {
    uiWorkspace.openSession(id)
    return true
  }
  // alpha.2 有 retain：旧的 sessions.open 即使还在也不会写入 mainView，点了等于没打开。
  if (typeof access.sessions?.retain === 'function') return false
  if (typeof access.sessions?.open === 'function') {
    access.sessions.open(id)
    return true
  }
  return false
}

export async function withSessionBinding<T>(
  sessions: HostSessions,
  sessionId: string,
  operation: (binding: SessionBindingLike) => T | Promise<T>,
): Promise<T>
export async function withSessionBinding<T>(
  sessions: object | undefined,
  sessionId: string,
  operation: (binding: SessionBindingLike) => T | Promise<T>,
): Promise<T>
export async function withSessionBinding<T>(
  sessions: HostSessions | object | undefined,
  sessionId: string,
  operation: (binding: SessionBindingLike) => T | Promise<T>,
): Promise<T> {
  const host = sessions === undefined ? undefined : hostAccess({ sessions }).sessions
  if (host === undefined) throw new UnknownSessionError()
  if (typeof host.using === 'function') {
    return host.using(sessionId, { source: 'controllerOperation' }, async reference => {
      if (reference.ready !== undefined) await reference.ready
      if (reference.binding === undefined) throw new UnknownSessionError()
      return operation(reference.binding)
    })
  }
  const existing = host.binding?.(sessionId)
  if (existing !== undefined) return operation(existing)
  if (typeof host.retain !== 'function') throw new UnknownSessionError()
  const reference = host.retain(sessionId, { source: 'controllerOperation' })
  try {
    if (reference.ready !== undefined) await reference.ready
    if (reference.binding === undefined) throw new UnknownSessionError()
    return await operation(reference.binding)
  } finally {
    reference.release?.()
  }
}

export async function renameHostSession(ctx: HostSessionAccess, sessionId: string, title: string): Promise<void>
export async function renameHostSession(ctx: object, sessionId: string, title: string): Promise<void>
export async function renameHostSession(ctx: object, sessionId: string, title: string): Promise<void> {
  await withSessionBinding(hostAccess(ctx).sessions, sessionId, async binding => {
    if (typeof binding.session?.rename !== 'function') throw new UnknownSessionError()
    const result = await binding.session.rename(title)
    if (result.ok === false) throw result.error ?? new Error('rename failed')
  })
}

export async function forkHostSession(ctx: HostSessionAccess, sessionId: string): Promise<void>
export async function forkHostSession(ctx: object, sessionId: string): Promise<void>
export async function forkHostSession(ctx: object, sessionId: string): Promise<void> {
  const access = hostAccess(ctx)
  const uiWorkspace = probeService(access, 'uiWorkspace') as { forkSession?(id: string): Promise<void> } | undefined
  if (typeof uiWorkspace?.forkSession === 'function') {
    await uiWorkspace.forkSession(sessionId)
    return
  }
  const childId = await access.sessions?.fork?.({ sessionId, increaseTitle: true })
  if (typeof childId === 'string' && childId !== '') openHostSession(access, childId)
}

export async function archiveHostSession(ctx: HostSessionAccess, sessionId: string): Promise<void>
export async function archiveHostSession(ctx: object, sessionId: string): Promise<void>
export async function archiveHostSession(ctx: object, sessionId: string): Promise<void> {
  const access = hostAccess(ctx)
  const uiWorkspace = probeService(access, 'uiWorkspace') as { archiveSession?(id: string): Promise<void> } | undefined
  if (typeof uiWorkspace?.archiveSession === 'function') {
    await uiWorkspace.archiveSession(sessionId)
    return
  }
  await access.workspaces?.archiveSession?.(sessionId)
}

export function mergePendingInteractions(
  legacy: PendingInteractionSnapshot,
  status: SessionStatusSnapshot,
): PendingInteractionSnapshot {
  const next = new Map(legacy)
  for (const [id, row] of status) {
    if (row?.pendingInteraction !== undefined) next.set(id, row.pendingInteraction)
  }
  return next
}

export function sessionIsRunning(session: { readonly running?: boolean } | undefined, status?: SessionStatusLike): boolean {
  if (status?.running !== undefined) return status.running === true
  return session?.running === true
}
