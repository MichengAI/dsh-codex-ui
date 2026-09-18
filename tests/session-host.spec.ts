import { expect, test } from 'vitest'
import {
  archiveHostSession,
  currentSessionId,
  forkHostSession,
  isBlankOnboardingSession,
  mergePendingInteractions,
  openHostSession,
  probeService,
  renameHostSession,
  sessionIsRunning,
  withSessionBinding,
} from '../src/client/session-host.ts'

test('当前会话先认 list.current，没有再按 retainedBy.mainView 反查', () => {
  expect(currentSessionId({ current: 'legacy', ids: ['a'], byId: { a: { retainedBy: { mainView: 1 } } } })).toBe('legacy')
  expect(currentSessionId({
    ids: ['parked', 'main'],
    byId: {
      parked: { retainedBy: {} },
      main: { id: 'main-view', retainedBy: { mainView: 1 } },
    },
  })).toBe('main-view')
  expect(currentSessionId({ byId: { other: { retainedBy: { sidebar: 1 } } } })).toBeUndefined()
  expect(currentSessionId(undefined)).toBeUndefined()
  expect(currentSessionId({ current: '' })).toBeUndefined()
})

test('空白引导只在就绪且没有非空主视图会话时成立', () => {
  expect(isBlankOnboardingSession({ phase: 'pending', current: undefined, byId: {} })).toBe(false)
  expect(isBlankOnboardingSession({ phase: 'ready', current: undefined, byId: {} })).toBe(true)
  expect(isBlankOnboardingSession({
    phase: 'ready',
    byId: { main: { id: 'main', blank: true, retainedBy: { mainView: 1 } } },
  })).toBe(true)
  expect(isBlankOnboardingSession({
    phase: 'ready',
    byId: { main: { id: 'main', blank: false, retainedBy: { mainView: 1 } } },
  })).toBe(false)
})

test('有 reflect 时只 probe，不硬读未注入的官方导航服务', () => {
  const ctx = {
    reflect: {
      get(name: string) {
        return name === 'uiWorkspace' ? { openSession() {} } : undefined
      },
    },
    get uiWorkspace(): never { throw new Error('hard access') },
    get() { throw new Error('get should wait for reflect') },
  }
  expect(probeService(ctx, 'uiWorkspace')).toEqual({ openSession: expect.any(Function) })
  expect(probeService(ctx, 'missing')).toBeUndefined()
})

test('reflect 没有服务时改走 ctx.get，不硬读属性', () => {
  const opened: string[] = []
  const ctx = {
    reflect: { get() { return undefined } },
    get(name: string) { return name === 'uiWorkspace' ? { openSession: (id: string) => { opened.push(id) } } : undefined },
    get uiWorkspace(): never { throw new Error('hard access') },
    sessions: { open(id: string) { opened.push(`legacy:${id}`) } },
  }
  expect(openHostSession(ctx, 's1')).toBe(true)
  expect(opened).toEqual(['s1'])
})

test('打开会话优先官方导航，没有再回退 sessions.open', () => {
  const opened: string[] = []
  expect(openHostSession({
    reflect: { get(name: string) { return name === 'uiWorkspace' ? { openSession: (id: string) => { opened.push(`nav:${id}`) } } : undefined } },
    sessions: { open(id: string) { opened.push(`legacy:${id}`) } },
  }, 's1')).toBe(true)
  expect(opened).toEqual(['nav:s1'])

  expect(openHostSession({
    reflect: { get() { return undefined } },
    sessions: { open(id: string) { opened.push(id) } },
  }, 's2')).toBe(true)
  expect(opened).toEqual(['nav:s1', 's2'])
  expect(openHostSession({ reflect: { get() { return undefined } }, sessions: {} }, 's3')).toBe(false)
})

test('alpha.2 有 retain 时不把 leftover sessions.open 当成打开成功', () => {
  const opened: string[] = []
  expect(openHostSession({
    reflect: { get() { return undefined } },
    sessions: { retain() { return {} }, open(id: string) { opened.push(id) } },
  }, 's1')).toBe(false)
  expect(opened).toEqual([])
})

test('重命名先 using retain，旧宿主回退 binding', async () => {
  const renamed: string[] = []
  await renameHostSession({
    sessions: {
      using: async (id, options, operation) => {
        expect(id).toBe('s1')
        expect(options.source).toBe('controllerOperation')
        return operation({
          ready: Promise.resolve(),
          binding: { session: { rename: async title => { renamed.push(`using:${title}`); return { ok: true } } } },
        })
      },
      binding() { throw new Error('should use using') },
    },
  }, 's1', '新标题')
  expect(renamed).toEqual(['using:新标题'])

  await renameHostSession({
    sessions: {
      binding: id => id === 's2' ? { session: { rename: async title => { renamed.push(`bind:${title}`); return { ok: true } } } } : undefined,
    },
  }, 's2', '旧宿主')
  expect(renamed).toEqual(['using:新标题', 'bind:旧宿主'])
})

test('分叉优先官方 forkSession，否则 fork 后再打开', async () => {
  const events: string[] = []
  await forkHostSession({
    reflect: { get(name: string) { return name === 'uiWorkspace' ? { forkSession: async (id: string) => { events.push(`nav:${id}`) } } : undefined } },
    sessions: {
      fork: async () => 'child',
      open(id: string) { events.push(`legacy:${id}`) },
    },
  }, 'src')
  expect(events).toEqual(['nav:src'])

  await forkHostSession({
    reflect: { get() { return undefined } },
    sessions: {
      fork: async ({ sessionId }) => `${sessionId}-child`,
      open(id: string) { events.push(`legacy:${id}`) },
    },
  }, 'src')
  expect(events).toEqual(['nav:src', 'legacy:src-child'])
})

test('归档优先官方导航，否则回退 workspaces.archiveSession', async () => {
  const archived: string[] = []
  await archiveHostSession({
    reflect: { get(name: string) { return name === 'uiWorkspace' ? { archiveSession: async (id: string) => { archived.push(`nav:${id}`) } } : undefined } },
    workspaces: { archiveSession: async (id: string) => { archived.push(`legacy:${id}`) } },
  }, 's1')
  expect(archived).toEqual(['nav:s1'])
  await archiveHostSession({
    reflect: { get() { return undefined } },
    workspaces: { archiveSession: async (id: string) => { archived.push(`legacy:${id}`) } },
  }, 's2')
  expect(archived).toEqual(['nav:s1', 'legacy:s2'])
})

test('绑定先 using，没有再 binding，alpha.2 用 retain 包一层', async () => {
  const seen: string[] = []
  await withSessionBinding({
    using: async (_id, _options, operation) => operation({
      ready: Promise.resolve(),
      binding: { ctx: 'using', session: { rename: async () => ({ ok: true }) } },
    }),
    binding() { throw new Error('should use using') },
  }, 's1', binding => { seen.push(String(binding.ctx)); return binding.ctx })
  expect(seen).toEqual(['using'])

  await withSessionBinding({
    binding: id => id === 's2' ? { ctx: 'bind', session: { rename: async () => ({ ok: true }) } } : undefined,
  }, 's2', binding => { seen.push(String(binding.ctx)) })
  expect(seen).toEqual(['using', 'bind'])

  const released: string[] = []
  await withSessionBinding({
    retain: () => ({
      ready: Promise.resolve(),
      binding: { ctx: 'retain', session: { rename: async () => ({ ok: true }) } },
      release() { released.push('released') },
    }),
  }, 's3', binding => { seen.push(String(binding.ctx)) })
  expect(seen).toEqual(['using', 'bind', 'retain'])
  expect(released).toEqual(['released'])
})

test('官方 SessionStatus 的待处理交互覆盖旧 Store，并保留旧宿主条目', () => {
  const merged = mergePendingInteractions(
    new Map([['legacy', { kind: 'question' }], ['shared', { kind: 'approval' }]]),
    new Map([['shared', { pendingInteraction: { kind: 'plan-review' } }], ['status', { pendingInteraction: { kind: 'approval' } }]]),
  )
  expect(merged.get('legacy')).toEqual({ kind: 'question' })
  expect(merged.get('shared')).toEqual({ kind: 'plan-review' })
  expect(merged.get('status')).toEqual({ kind: 'approval' })
})

test('运行态优先认 SessionStatus，没有再回退 SessionSummary.running', () => {
  expect(sessionIsRunning({ running: true }, { running: false })).toBe(false)
  expect(sessionIsRunning({ running: false }, { running: true })).toBe(true)
  expect(sessionIsRunning({ running: true }, undefined)).toBe(true)
  expect(sessionIsRunning(undefined, undefined)).toBe(false)
})
