import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Context } from '@deepseek-ai/cordis'
import { SlotCore, type PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { expect, test, vi } from 'vitest'
import { registerSettingsPage } from '../src/client/settings-page-registration.ts'
import { CodexSettingsPage, CodexGeneralSettings } from '../src/client/CodexSettingsPage.tsx'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({ ConnectionIndicator: () => null }))
const require = createRequire(import.meta.url)

/** 用真实 SlotCore 执行声明约束；仅服务和声明生命周期适配为测试环境。 */
function setup() {
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
    get: () => ({ state: { getSnapshot: () => 'connected', subscribe: () => () => {} } }),
    remote: { $host: { isLoopback: false } },
    inject: () => () => {},
    effect: (callback: () => () => void) => { const off = callback(); disposers.push(off); return off },
  } as unknown as Context
  const declare = () => slots.register({ name: 'root', children: { 'sidebar.settings': { kind: 'single', scope: 'root' } } }, (_props: PropsRenderSlots<'sidebar.settings'>) => null)
  return { slots, ctx, declare, dispose: () => disposers.reverse().forEach(off => off()) }
}

test('复现旧宿主：原设置外壳存在时，新壳重复声明子插槽而失败', () => {
  const { slots, ctx, declare, dispose } = setup()
  const removeRoot = declare()
  let official: { apply: (ctx: Context) => void } | undefined
  const code = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-settings-general/client'), 'utf8')
  new Function('window', code)({ __ModuleLoader__: { load: ({ factory }: { factory: (require: (id: string) => unknown) => typeof official }) => {
    official = factory(id => id === '@deepseek-ai/dsh-client-ui-primitives' ? {} : require(id))
  } } })
  official!.apply(ctx)
  const original = slots.entriesOfSlot('sidebar.settings')[0]!
  expect(() => slots.register({ name: 'sidebar.settings', priority: -1, children: original.children }, (() => null) as never)).toThrow(/settings.trigger.*already declared/)
  dispose()
  removeRoot()
})

test('发布配置停用旧壳，新壳唯一声明设置树并在重新挂载后恢复功能贡献', () => {
  const patch = readFileSync('cordis.patch.yml', 'utf8')
  expect(patch).toMatch(/id: ui-settings-general\s+disabled: true/)
  const { slots, ctx, declare, dispose } = setup()
  registerSettingsPage(ctx)
  const removeRoot = declare()
  const row = () => null
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({ name: 'settings.general.item', id: 'theme' }, row))
  expect(slots.entriesOfSlot('sidebar.settings')[0]?.component).toBe(CodexSettingsPage)
  expect(slots.entriesOfSlot('settings.section')[0]?.component).toBe(CodexGeneralSettings)
  expect(slots.entriesOfSlot('settings.general.item')[0]?.component).toBe(row)
  removeRoot()
  expect(slots.entriesOfSlot('settings.general.item')).toEqual([])
  const removeAgain = declare()
  expect(slots.entriesOfSlot('settings.general.item')[0]?.component).toBe(row)
  dispose()
  removeAgain()
})
