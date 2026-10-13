import { readFileSync } from 'node:fs'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { expect, test } from 'vitest'
import { apply } from '../src/client/index.ts'
import { CodexSidebar } from '../src/client/CodexSidebar.tsx'

test.each([false, true])('官方晚到=%s 时反复启停保留官方侧栏', async (late) => {
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
    while (disposers.length > 0) disposers.pop()?.()
    expect(slots.entriesOfSlot('sidebar')[0]?.component).toBe(official)
    expect(slots.spec('sidebar.workspaces')).toBeDefined()
  }
})

test.each(['cordis.patch.yml', 'packages/dsh-codex-suite/cordis.patch.yml'])('发布补丁 %s 不禁用官方侧栏和设置壳', file => {
  expect(readFileSync(file, 'utf8')).not.toMatch(/id: ui-(?:sidebar|settings-general)\s+disabled: true/)
})
