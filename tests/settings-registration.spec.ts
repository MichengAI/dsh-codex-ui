import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Context } from '@deepseek-ai/cordis'
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
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {})
  expect(() => registerSettingsPage(ctx)).not.toThrow()
  expect(slots.entriesOfSlot("sidebar.settings")[0]).toBe(original)
  expect(slots.entriesOfSlot("settings.trigger")).toHaveLength(1)
  expect(warning).toHaveBeenCalled()
  warning.mockRestore()
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


test.each([false, true])('真实 Cordis 注入生命周期：loopback=%s 的配置文件入口', async (loopback) => {
  let runtime: { SlotRegistry: new (ctx: Context) => Context['slots'] } | undefined
  const code=readFileSync(require.resolve('@deepseek-ai/dsh-client-runtime/client'),'utf8')
  new Function('window',code)({__ModuleLoader__:{load:({factory}:{factory:(require:NodeRequire)=>typeof runtime})=>{runtime=factory(require)}}})
  const ctx=new Context()
  new runtime!.SlotRegistry(ctx)
  const removeLocale=ctx.provide('locale', {bind:()=> (key:string)=>key,getSnapshot:()=>({revision:0}),subscribe:()=>()=>{}} as never)
  const removeConnection=ctx.provide('connection',{state:{getSnapshot:()=> 'connected',subscribe:()=>()=>{}},reconnect:()=>{}} as never)
  const removeRoot=ctx.slots.register({name:'root',children:{'sidebar.settings':{kind:'single',scope:'root'}}},(_props: PropsRenderSlots<'sidebar.settings'>)=>null)
  registerSettingsPage(ctx)
  expect(ctx.slots.entriesOfSlot('settings.action')).toHaveLength(0)
  const describe={getSnapshot:()=>({view:{hasDocument:true}}),subscribe:()=>()=>{},ensure:async()=>{}}
  const openSettingsDocument=vi.fn(async()=>({ok:true}))
  const removeScope=ctx.provide('settingsScope',{describe:()=>describe} as never)
  const removeRemote=ctx.provide('remote',{$host:{isLoopback:loopback},settings:{openSettingsDocument}} as never)
  const removeRemoteSettings=ctx.provide('remote.settings',{} as never)
  try {
    if(loopback){
      await vi.waitFor(()=>expect(ctx.slots.entriesOfSlot('settings.action')).toHaveLength(1))
      const entry=ctx.slots.entriesOfSlot('settings.action')[0]!
      const injected=(entry.inject as unknown as ()=>{describe:unknown;openDocument:()=>Promise<{ok:boolean}>})()
      expect(injected.describe).toBe(describe)
      expect(await injected.openDocument()).toEqual({ok:true})
      expect(openSettingsDocument).toHaveBeenCalledTimes(1)
    }else{
      await new Promise(resolve=>setTimeout(resolve,30))
      expect(ctx.slots.entriesOfSlot('settings.action')).toHaveLength(0)
    }
    await removeRemoteSettings()
    await vi.waitFor(()=>expect(ctx.slots.entriesOfSlot('settings.action')).toHaveLength(0))
  }finally{await removeRemoteSettings();await removeRemote();await removeScope();removeRoot();await removeConnection();await removeLocale()}
})
