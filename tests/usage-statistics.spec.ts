import { expect, test, vi } from 'vitest'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { defineStore } from '@deepseek-ai/dsh-client-store'
import type { Context } from '@deepseek-ai/cordis'
import { registerUsageStatistics } from '../src/client/usage-statistics.ts'
vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({}))
test('费用插件迟注册时新增设置入口并共享原 store，卸载后撤销分区', async () => {
  const slots = new SlotCore()
  const removeRoot = slots.register({ name: 'root', children: { 'settings.section': { kind: 'list', scope: 'root' }, 'sidebar.footer.action': { kind: 'list', scope: 'root' } } }, (() => null) as never)
  const disposers: Array<() => void> = []
  const ctx = { slots: new Proxy(slots, { get: (target, key) => key === 'inject' ? (_name: string, fn: () => () => void) => { const off = fn(); disposers.push(off); return off } : typeof Reflect.get(target, key) === 'function' ? Reflect.get(target, key).bind(target) : Reflect.get(target, key) }),
    locale: { bind: () => (key: string) => key }, effect: (fn: () => () => void) => { disposers.push(fn()) }, get: () => undefined } as unknown as Context
  registerUsageStatistics(ctx)
  expect(slots.entriesOfSlot('settings.section')).toHaveLength(0)
  const store = defineStore({ init: () => ({ amount: 0 }), actions: { setAmount: (draft, amount: number) => { draft.amount = amount } } })
  const checkModels = vi.fn()
  const removeBilling = slots.register({ name: 'sidebar.footer.action', id: 'usage-billing', store, locale: 'michengai.codexUi', inject: () => ({ checkModels, publishCosts: vi.fn() }) }, (() => null) as never)
  await Promise.resolve(); await Promise.resolve()
  const usage = slots.entriesOfSlot('settings.section')[0]
  expect(usage?.options.id).toBe('usage-statistics')
  expect(usage?.store).toBe(store)
  expect((usage?.inject?.() as { billing: { checkModels: unknown } }).billing.checkModels).toBe(checkModels)
  removeBilling(); await Promise.resolve(); await Promise.resolve()
  expect(slots.entriesOfSlot('settings.section')).toHaveLength(0)
  disposers.reverse().forEach(dispose => dispose()); removeRoot()
})
