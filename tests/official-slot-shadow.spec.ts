import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { expect, test, vi } from 'vitest'
import { registerAfterOfficialWave } from '../src/client/official-slot-shadow.ts'

test('官方异步晚到时不抢占共享声明，停用后回退官方', async () => {
  const slots = new SlotCore()
  slots.register({ name: 'root', children: { sidebar: { kind: 'single', scope: 'root' } } }, (() => null) as never)
  const official = () => null
  const custom = () => null
  const register = vi.fn(() => slots.register({ name: 'sidebar', priority: -1 }, custom as never))
  const remove = registerAfterOfficialWave(slots, 'sidebar', () => slots.entries('sidebar').some(entry => entry.component === official), register, true)
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
  expect(register).not.toHaveBeenCalled()
  slots.register({ name: 'sidebar', children: { 'sidebar.workspaces': { kind: 'single', scope: 'root' } } }, official as never)
  await Promise.resolve()
  expect(slots.entriesOfSlot('sidebar')[0]?.component).toBe(custom)
  remove()
  expect(slots.entriesOfSlot('sidebar')[0]?.component).toBe(official)
  expect(slots.spec('sidebar.workspaces')).toBeDefined()
})

test('等待官方期间停用，不留下延迟注册', async () => {
  const slots = new SlotCore()
  slots.register({ name: 'root', children: { sidebar: { kind: 'single', scope: 'root' } } }, (() => null) as never)
  const register = vi.fn(() => () => {})
  const remove = registerAfterOfficialWave(slots, 'sidebar', () => slots.entries('sidebar').length > 0, register, true)
  remove()
  slots.register({ name: 'sidebar' }, (() => null) as never)
  await Promise.resolve()
  expect(register).not.toHaveBeenCalled()
})
