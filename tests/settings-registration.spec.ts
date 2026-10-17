import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Context } from '@deepseek-ai/cordis'
import { SlotCore, type PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { expect, test, vi } from 'vitest'
import { registerSettingsPage } from '../src/client/settings-page-registration.ts'
import { loadClientBundle } from './client-module-loader.ts'
import { CodexSettingsPage, CodexGeneralSettings, type CodexSettingsPageProps, type SettingsPageInjected } from '../src/client/CodexSettingsPage.tsx'
import { act, createElement, type ReactNode } from 'react'
import { openSettingsSection } from '../src/client/settings-navigation.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({ ConnectionIndicator: () => null }))
const require = createRequire(import.meta.url)

function officialSettings(): { apply: (ctx: Context) => void } {
  let official: { apply: (ctx: Context) => void } | undefined
  const code = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-settings-general/client'), 'utf8')
  new Function('window', code)({ __ModuleLoader__: { load: ({ factory }: { factory: (require: (id: string) => unknown) => typeof official }) => {
    official = factory(id => id === '@deepseek-ai/dsh-client-ui-primitives' ? {} : require(id))
  } } })
  return official!
}

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
    shortcuts: { register: () => () => {} },
    get: () => ({ state: { getSnapshot: () => 'connected', subscribe: () => () => {} } }),
    remote: { $host: { isLoopback: false } },
    inject: () => () => {},
    effect: (callback: () => () => void) => { const off = callback(); disposers.push(off); return off },
  } as unknown as Context
  let officialInstalled = false
  const declare = (withOfficial = true) => {
    const removeRoot = slots.register({ name: 'root', children: { 'sidebar.settings': { kind: 'single', scope: 'root' } } }, (_props: PropsRenderSlots<'sidebar.settings'>) => null)
    if (withOfficial && !officialInstalled) {
      officialInstalled = true
      officialSettings().apply(ctx)
    }
    return removeRoot
  }
  return { slots, ctx, declare, disposers, dispose: () => disposers.reverse().forEach(off => off()) }
}

async function flushSlotWave(): Promise<void> {
  for (let i = 0; i < 4; i += 1) await new Promise(resolve => queueMicrotask(() => resolve(undefined)))
}

test('快捷键服务晚于设置壳注册时仍能读到 catalog', async () => {
  const { slots, ctx, declare, dispose } = setup()
  const removeRoot = declare()
  const pending: Array<(shortcutCtx: { shortcuts: { catalog: { getSnapshot: () => readonly { id: string; keys: readonly string[]; aria?: string }[]; subscribe: (listener: () => void) => () => void } } }) => (() => void) | void> = []
  ctx.inject = ((names: string[], callback: (shortcutCtx: { shortcuts: { catalog: { getSnapshot: () => readonly { id: string; keys: readonly string[]; aria?: string }[]; subscribe: (listener: () => void) => () => void } } }) => (() => void) | void) => {
    if (names.includes('shortcuts')) pending.push(callback)
    return () => {}
  }) as unknown as Context['inject']
  registerSettingsPage(ctx)
  await flushSlotWave()
  const injected = (slots.entriesOfSlot('sidebar.settings')[0]!.inject as unknown as () => SettingsPageInjected)()
  expect(injected.shortcuts?.getSnapshot()).toEqual([])
  const rows = [{ id: 'settings.open', keys: ['Ctrl', ','] as const, aria: 'Control+Comma' }]
  const stop = pending[0]?.({ shortcuts: { catalog: { getSnapshot: () => rows, subscribe: () => () => {} } } })
  expect(injected.shortcuts?.getSnapshot()).toEqual(rows)
  stop?.()
  expect(injected.shortcuts?.getSnapshot()).toEqual([])
  dispose(); removeRoot()
})

test('账号入口晚注册和撤销时设置壳订阅翻转，保留分区导航', async () => {
  const { slots, ctx, declare, dispose } = setup()
  const removeRoot = declare()
  registerSettingsPage(ctx)
  await flushSlotWave()
  const entry = slots.entriesOfSlot('sidebar.settings')[0]!
  const injected = (entry.inject as unknown as () => SettingsPageInjected)()
  expect(slots.spec('settings.launcher')).toBeDefined()
  const changed = vi.fn()
  const unsubscribe = injected.accountLauncher!.subscribe(changed)
  const container = document.createElement('div')
  document.body.append(container)
  const { createRoot } = require('react-dom/client') as { createRoot: (element: HTMLElement) => { render: (node: ReactNode) => void; unmount: () => void } }
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const root = createRoot(container)
  let removeLauncher: (() => void) | undefined
  try {
    await act(async () => { root.render(createElement(CodexSettingsPage, {
      ...injected, wide: true,
      useSessions: (selector: (value: object) => unknown) => selector({ phase: 'ready', byId: {} }),
      t: (key: string) => key,
      renderSlot: (name: string, owner: { openSettings?: () => void }) => name === 'settings.launcher'
        ? createElement('button', { 'data-account-launcher': true, onClick: owner.openSettings }, 'Account')
        : name === 'settings.trigger' ? 'Settings' : null,
    } as CodexSettingsPageProps)) })
    expect(injected.accountLauncher!.getSnapshot()).toBe(false)
    expect(container.querySelector('[data-dcu-settings-trigger]')).not.toBeNull()
    await act(async () => { removeLauncher = slots.register({ name: 'settings.launcher' }, (() => null) as never); await flushSlotWave() })
    expect(changed).toHaveBeenCalled()
    expect(injected.accountLauncher!.getSnapshot()).toBe(true)
    expect(container.querySelector('[data-dcu-settings-trigger]')).toBeNull()
    expect(container.querySelector('[data-account-launcher]')).not.toBeNull()
    await act(async () => { openSettingsSection(container, 'settings.general') })
    expect(document.querySelector('[data-settings-section]')?.getAttribute('data-settings-section')).toBe('general')
    await act(async () => { document.querySelector<HTMLButtonElement>('.dcu-settings-back')!.click(); removeLauncher!(); await flushSlotWave() })
    expect(injected.accountLauncher!.getSnapshot()).toBe(false)
    expect(container.querySelector('[data-dcu-settings-trigger]')).not.toBeNull()
    expect(container.querySelector('[data-account-launcher]')).toBeNull()
  } finally {
    await act(async () => { root.unmount() })
    unsubscribe(); removeLauncher?.(); dispose(); removeRoot(); container.remove()
  }
})

test.each([false, true])('官方设置壳晚到=%s 时保留官方并回退', async (late) => {
  const { slots, ctx, declare, dispose, disposers } = setup()
  const removeRoot = declare(false)
  const before = disposers.length
  if (late) {
    registerSettingsPage(ctx)
    await flushSlotWave()
    expect(slots.spec('settings.launcher')).toBeUndefined()
  }
  const officialStart = disposers.length
  expect(() => officialSettings().apply(ctx)).not.toThrow()
  const officialDisposers = disposers.splice(officialStart)
  const original = slots.entries('sidebar.settings').find(entry => entry.component !== CodexSettingsPage)!
  if (!late) registerSettingsPage(ctx)
  await flushSlotWave()
  expect(slots.entriesOfSlot('sidebar.settings')[0]?.component).not.toBe(original.component)
  expect(slots.spec('settings.codex.launcher')).toBeDefined()
  expect(slots.entries('sidebar.settings').some(entry => entry.component === original.component)).toBe(true)
  while (disposers.length > before) disposers.pop()?.()
  expect(slots.entriesOfSlot('sidebar.settings')[0]?.component).toBe(original.component)
  for (const off of officialDisposers.reverse()) off()
  dispose()
  removeRoot()
})

test('设置超时兜底不抢共享声明，官方晚到后仍镜像通用设置行', async () => {
  vi.useFakeTimers()
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { slots, ctx, declare, dispose } = setup()
  const removeRoot = declare(false)
  try {
    registerSettingsPage(ctx)
    await vi.advanceTimersByTimeAsync(3000)
    expect(slots.entries('sidebar.settings')).toHaveLength(1)
    expect(slots.spec('settings.launcher')).toBeUndefined()
    expect(slots.spec('settings.codex.launcher')).toBeDefined()
    expect(warn).toHaveBeenCalled()
    expect(() => officialSettings().apply(ctx)).not.toThrow()
    await vi.advanceTimersByTimeAsync(3000)
    expect(slots.entries('sidebar.settings')).toHaveLength(2)
    const row = () => null
    slots.register({ name: 'settings.general.item', id: 'late-row' }, row as never)
    await vi.advanceTimersByTimeAsync(0)
    expect(slots.entriesOfSlot('settings.codex.general.item').some(entry => entry.options.id === 'late-row')).toBe(true)
    expect(slots.entries('settings.section').filter(entry => entry.options.id === 'general')).toHaveLength(2)
  } finally {
    dispose()
    removeRoot()
    warn.mockRestore()
    vi.useRealTimers()
  }
})

test('发布补丁不静态停用官方首消息标题 LLM', () => {
  const patch = readFileSync('cordis.patch.yml', 'utf8')
  expect(patch).not.toMatch(/id: session-title-llm\s+disabled: true/)
  expect(patch).not.toMatch(/id: session-title\s*\n\s+disabled: true/)
  const plugin = readFileSync('src/session-title-plugin.ts', 'utf8')
  expect(plugin).toMatch(/export const name = 'michengai-codex-ui-session-title'/)
  expect(plugin).toMatch(/export const inject = \['sessionTitle', 'llm', 'loader'\]/)
  expect(plugin).toMatch(/startSessionTitleLifecycle/)
  expect(patch).toMatch(/id: michengai-codex-ui-session-title\s+name: '@michengai\/dsh-codex-ui\/session-title'/)
  expect(readFileSync('src/index.ts', 'utf8')).not.toMatch(/registerSessionTitleProvider/)
  expect(readFileSync('src/session-title-provider.ts', 'utf8')).not.toMatch(/titleDiag|DCU_TITLE_LOG|session-title-diag|Reflect\.get/)
  expect(readFileSync('src/session-title-plugin.ts', 'utf8')).toMatch(/ctx\.effect\(\(\) => lifecycle\.dispose/)
})

test('官方设置树重新挂载后恢复功能贡献', async () => {
  const patch = readFileSync('cordis.patch.yml', 'utf8')
  expect(patch).not.toMatch(/id: ui-settings-general\s+disabled: true/)
  expect(patch).not.toMatch(/id: ui-sidebar\s+disabled: true/)
  const { slots, ctx, declare, dispose } = setup()
  registerSettingsPage(ctx)
  const removeRoot = declare()
  await flushSlotWave()
  const row = () => null
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({ name: 'settings.general.item', id: 'theme' }, row))
  expect(slots.entriesOfSlot('sidebar.settings')[0]?.component).not.toBe(CodexSettingsPage)
  expect(slots.entriesOfSlot('settings.section')[0]?.component).not.toBe(CodexGeneralSettings)
  expect(slots.spec('settings.codex.general.item')).toBeDefined()
  expect(slots.spec('settings.launcher')).toBeDefined()
  expect(slots.entriesOfSlot('settings.general.item')[0]?.component).toBe(row)
  removeRoot()
  expect(slots.entriesOfSlot('settings.general.item')).toEqual([])
  const removeAgain = declare()
  await flushSlotWave()
  expect(slots.entriesOfSlot('settings.general.item')[0]?.component).toBe(row)
  dispose()
  removeAgain()
})

test.each([
  ['configForms', false],
  ['configForms', true],
] as const)('真实 Cordis 注入生命周期：%s loopback=%s 的配置文件入口', async (service, loopback) => {
  const { SlotRegistry } = loadClientBundle('@deepseek-ai/dsh-client-ui-renderer/client') as { SlotRegistry: new (ctx: Context) => Context['slots'] }
  const ctx=new Context()
  new SlotRegistry(ctx)
  const removeLocale=ctx.provide('locale', {bind:()=> (key:string)=>key,getSnapshot:()=>({revision:0}),subscribe:()=>()=>{}} as never)
  const removeConnection=ctx.provide('connection',{state:{getSnapshot:()=> 'connected',subscribe:()=>()=>{}},reconnect:()=>{}} as never)
  const removeRoot=ctx.slots.register({name:'root',children:{'sidebar.settings':{kind:'single',scope:'root'},'settings.general.footer':{kind:'list',scope:'root'}}},(_props: PropsRenderSlots<'sidebar.settings'>)=>null)
  registerSettingsPage(ctx)
  expect(ctx.slots.entriesOfSlot('settings.general.footer')).toHaveLength(0)
  const describe={getSnapshot:()=>({view:{hasDocument:true}}),subscribe:()=>()=>{},ensure:async()=>{}}
  const openSettingsDocument=vi.fn(async()=>({ok:true}))
  const removeScope=ctx.provide(service,{describe:()=>describe} as never)
  const removeRemote=ctx.provide('remote',{$host:{isLoopback:loopback},settings:{openSettingsDocument}} as never)
  const removeRemoteSettings=ctx.provide('remote.settings',{} as never)
  try {
    if(loopback){
      await vi.waitFor(()=>expect(ctx.slots.entriesOfSlot('settings.general.footer')).toHaveLength(1))
      const entry=ctx.slots.entriesOfSlot('settings.general.footer')[0]!
      const injected=(entry.inject as unknown as ()=>{describe:unknown;openDocument:()=>Promise<{ok:boolean}>})()
      expect(injected.describe).toBe(describe)
      expect(await injected.openDocument()).toEqual({ok:true})
      expect(openSettingsDocument).toHaveBeenCalledTimes(1)
    }else{
      await new Promise(resolve=>setTimeout(resolve,30))
      expect(ctx.slots.entriesOfSlot('settings.general.footer')).toHaveLength(0)
    }
    await removeRemoteSettings()
    await vi.waitFor(()=>expect(ctx.slots.entriesOfSlot('settings.general.footer')).toHaveLength(0))
  }finally{await removeRemoteSettings();await removeRemote();await removeScope();removeRoot();await removeConnection();await removeLocale()}
})


test('配套插件先注入时等待设置树声明，不会误判为旧壳', async () => {
  const { slots, ctx, declare, dispose } = setup()
  const row = () => null
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'early-plugin' }, row))
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({ name: 'settings.general.item', id: 'early-item' }, row))
  const removeRoot = declare()
  registerSettingsPage(ctx)
  await flushSlotWave()
  expect(slots.entriesOfSlot('sidebar.settings')[0]?.component).not.toBe(CodexSettingsPage)
  expect(slots.spec('settings.codex.launcher')).toBeDefined()
  expect(slots.entriesOfSlot('settings.section').some(entry => entry.options.id === 'early-plugin')).toBe(true)
  expect(slots.entriesOfSlot('settings.general.item')[0]?.component).toBe(row)
  dispose()
  removeRoot()
})

test('configForms 注入时自动为常规设置补充 developer-tools（代码工作视图开关）', async () => {
  const { SlotRegistry } = loadClientBundle('@deepseek-ai/dsh-client-ui-renderer/client') as { SlotRegistry: new (ctx: Context) => Context['slots'] }
  const ctx = new Context()
  new SlotRegistry(ctx)
  const removeLocale = ctx.provide('locale', { bind: () => (key: string) => key, getSnapshot: () => ({ revision: 0 }), subscribe: () => () => {} } as never)
  const removeConnection = ctx.provide('connection', { state: { getSnapshot: () => 'connected', subscribe: () => () => {} }, reconnect: () => {} } as never)
  const removeRoot = ctx.slots.register({ name: 'root', children: { 'sidebar.settings': { kind: 'single', scope: 'root' }, 'settings.general.item': { kind: 'list', scope: 'root' } } }, (() => null) as never)
  const officialDeveloperTools = () => null
  ctx.slots.register({ name: 'settings.general.item', id: 'developer-tools', order: 15 }, officialDeveloperTools as never)
  registerSettingsPage(ctx)

  const devToolsStore = { value: false, listeners: new Set<() => void>() }
  const developerTools = {
    enabled: {
      getSnapshot: () => devToolsStore.value,
      subscribe: (listener: () => void) => { devToolsStore.listeners.add(listener); return () => devToolsStore.listeners.delete(listener) },
    },
    setEnabled: vi.fn(async (enabled: boolean) => {
      devToolsStore.value = enabled
      devToolsStore.listeners.forEach(l => l())
    }),
  }

  const removeForms = ctx.provide('configForms', { developerTools } as never)
  try {
    await vi.waitFor(() => {
      const entry = ctx.slots.entriesOfSlot('settings.general.item').find(e => e.options.id === 'developer-tools')
      expect(entry?.options.priority).toBe(-1)
    })
    const entry = ctx.slots.entriesOfSlot('settings.general.item').find(e => e.options.id === 'developer-tools')!
    expect(entry.options.order).toBe(15)
    const injected = (entry.inject as unknown as () => { developerTools: typeof developerTools })()
    expect(injected.developerTools.enabled.getSnapshot()).toBe(false)
    await injected.developerTools.setEnabled(true)
    expect(developerTools.setEnabled).toHaveBeenCalledWith(true)
    expect(injected.developerTools.enabled.getSnapshot()).toBe(true)
  } finally {
    await removeForms()
    removeRoot()
    await removeConnection()
    await removeLocale()
  }
})
