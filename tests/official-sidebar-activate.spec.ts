import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { expect, test } from 'vitest'
import { apply } from '../src/client/index.ts'
import { CodexSidebar } from '../src/client/CodexSidebar.tsx'

test('官方侧栏已声明 panellist 时，本插件仍能激活并在卸载后留下官方侧栏', async () => {
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
  const register = slots.register as (options: { name: string; children?: Record<string, { kind: string; scope: string }> }, component: () => null) => () => void
  register({ name: 'root', children: { sidebar: { kind: 'single', scope: 'root' } } }, () => null)
  const official = () => null
  register({
    name: 'sidebar',
    children: {
      'sidebar.panellist': { kind: 'list', scope: 'root' },
      'sidebar.workspaces': { kind: 'single', scope: 'root' },
      'sidebar.settings': { kind: 'single', scope: 'root' },
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
    },
  }, official)
  expect(() => apply(ctx as never)).not.toThrow()
  await new Promise(resolve => queueMicrotask(() => resolve(undefined)))
  expect(slots.entriesOfSlot('sidebar')[0]?.component).toBe(CodexSidebar)
  expect(slots.entries('sidebar').some(entry => entry.component === official)).toBe(true)
  for (const dispose of disposers.reverse()) dispose()
  expect(slots.entriesOfSlot('sidebar')[0]?.component).toBe(official)
})
