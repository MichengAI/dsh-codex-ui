import { readFileSync } from 'node:fs'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { expect, test, vi } from 'vitest'
import { apply } from '../src/client/index.ts'
import { CodexSidebar } from '../src/client/CodexSidebar.tsx'

function setupSidebar() {
  const slots = new SlotCore()
  const disposers: Array<() => void> = []
  const inject = (key: string, callback: () => () => void) => {
    let active: (() => void) | undefined
    const reconcile = () => { active?.(); active = slots.specDynamic(key) ? callback() : undefined }
    const off = slots.subscribeDeclaration(key, reconcile)
    reconcile()
    const dispose = () => { off(); active?.() }
    disposers.push(dispose)
    return dispose
  }
  const ctx = {
    slots: new Proxy(slots, { get: (target, key) => key === 'inject' ? inject : typeof Reflect.get(target, key) === 'function' ? Reflect.get(target, key).bind(target) : Reflect.get(target, key) }),
    locale: { bind: () => (key: string) => key, register: () => () => {}, getSnapshot: () => ({ revision: 0 }), subscribe: () => () => {} },
    layout: { toggleSidebar: () => {} },
    sessions: { list: { getSnapshot: () => ({ current: undefined, byId: {}, ids: [] }), subscribe: () => () => {} }, binding: () => undefined, open: () => {} },
    workspaces: { list: { getSnapshot: () => ({ items: [] }) }, delete: async () => {}, rename: async () => {}, insertBefore: async () => {}, insertSessionBefore: async () => {} },
    conversation: { input: { for: () => ({ state: {}, setDraft: () => {} }) } },
    get: () => ({ state: { getSnapshot: () => 'connected', subscribe: () => () => {} }, reconnect: () => {} }),
    inject: () => () => {},
    effect: (callback: () => (() => void) | void) => { const off = callback(); if (typeof off === 'function') disposers.push(off); return off },
  }
  const register = slots.register.bind(slots) as (options: { name: string; children?: Record<string, { kind: string; scope: string }> }, component: () => null) => () => void
  register({ name: 'root', children: { sidebar: { kind: 'single', scope: 'root' } } }, () => null)
  const official = () => null
  const registerOfficial = () => register({
    name: 'sidebar',
    children: {
      'sidebar.panellist': { kind: 'list', scope: 'root' },
      'sidebar.workspaces': { kind: 'single', scope: 'root' },
      'sidebar.settings': { kind: 'single', scope: 'root' },
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
    },
  }, official)
  return { slots, ctx, official, registerOfficial, dispose: () => { while (disposers.length > 0) disposers.pop()?.() } }
}

test.each([false, true])('官方晚到=%s 时反复启停保留官方侧栏', async (late) => {
  const { slots, ctx, official, registerOfficial, dispose } = setupSidebar()
  if (!late) registerOfficial()
  for (let cycle = 0; cycle < 3; cycle += 1) {
    expect(() => apply(ctx as never)).not.toThrow()
    if (late && cycle === 0) {
      for (let i = 0; i < 5; i += 1) await Promise.resolve()
      expect(slots.spec('sidebar.workspaces')).toBeUndefined()
      expect(() => registerOfficial()).not.toThrow()
    }
    await Promise.resolve()
    expect(slots.entriesOfSlot('sidebar')[0]?.component).not.toBe(official)
    expect(slots.spec('sidebar.codex.workspaces')).toBeDefined()
    expect(slots.entries('sidebar').some(entry => entry.component === official)).toBe(true)
    dispose()
    expect(slots.entriesOfSlot('sidebar')[0]?.component).toBe(official)
    expect(slots.spec('sidebar.workspaces')).toBeDefined()
  }
})

test('超时只声明自有槽，官方随后到达不冲突且停用后可回退', async () => {
  vi.useFakeTimers()
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { slots, ctx, official, registerOfficial, dispose } = setupSidebar()
  try {
    apply(ctx as never)
    await vi.advanceTimersByTimeAsync(2999)
    expect(slots.entries('sidebar')).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(slots.entries('sidebar')).toHaveLength(1)
    const fallback = slots.entries('sidebar')[0]!
    expect(warn).toHaveBeenCalled()
    expect(slots.spec('sidebar.codex.workspaces')).toBeDefined()
    for (const key of ['sidebar.panellist', 'sidebar.workspaces', 'sidebar.settings', 'sidebar.footer.action']) {
      expect(slots.spec(key as never)).toBeUndefined()
    }
    expect(() => registerOfficial()).not.toThrow()
    await vi.advanceTimersByTimeAsync(0)
    expect(slots.entries('sidebar')).toHaveLength(2)
    expect(slots.entries('sidebar')).toContain(fallback)
    expect(slots.entries('sidebar').filter(entry => entry.component === official)).toHaveLength(1)
    const contribution = () => null
    slots.register({ name: 'sidebar.footer.action', id: 'late-footer' }, contribution as never)
    await vi.advanceTimersByTimeAsync(0)
    expect(slots.entriesOfSlot('sidebar.codex.footer.action')[0]?.options.id).toBe('late-footer')
    dispose()
    expect(slots.entriesOfSlot('sidebar')[0]?.component).toBe(official)
  } finally {
    dispose()
    warn.mockRestore()
    vi.useRealTimers()
  }
})

test('超时前停用取消延迟侧栏注册', async () => {
  vi.useFakeTimers()
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { slots, ctx, dispose } = setupSidebar()
  try {
    apply(ctx as never)
    dispose()
    await vi.advanceTimersByTimeAsync(3000)
    expect(slots.entries('sidebar')).toHaveLength(0)
    expect(warn).not.toHaveBeenCalled()
  } finally {
    dispose()
    warn.mockRestore()
    vi.useRealTimers()
  }
})

test.each(['cordis.patch.yml', 'packages/dsh-codex-suite/cordis.patch.yml'])('发布补丁 %s 不禁用官方侧栏和设置壳', file => {
  expect(readFileSync(file, 'utf8')).not.toMatch(/id: ui-(?:sidebar|settings-general)\s+disabled: true/)
})
