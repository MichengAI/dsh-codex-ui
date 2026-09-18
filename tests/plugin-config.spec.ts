import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import type { Context } from '@deepseek-ai/cordis'
import { bindPluginConfigLocale, PluginConfigSection } from '../src/client/PluginConfigSection.tsx'
import { PLUGIN_CONFIG_SECTION_ID, PLUGIN_CONFIG_SECTION_ORDER, registerPluginConfigSection } from '../src/client/plugin-config.ts'

const { createRoot } = createRequire(import.meta.url)('react-dom/client') as { createRoot: (element: HTMLElement) => { render: (node: ReactNode) => void; unmount: () => void } }
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const cleanups: Array<() => void> = []
afterEach(async () => { await act(async () => { cleanups.splice(0).forEach(cleanup => cleanup()) }); document.body.innerHTML = '' })

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({}))

function officialPage(props: Record<string, unknown>): ReactNode {
  const renderSlot = props.renderSlot as ((name: string, owner: object, opts?: { entryKey?: string }) => ReactNode) | undefined
  return createElement('div', { 'data-official-plugins': true }, renderSlot?.('plugins.bundle.config', { view: 'page' }, { entryKey: '@michengai/dsh-pua' }))
}

function createCtx(slots: SlotCore) {
  const disposers: Array<() => void> = []
  const ctx = {
    slots: new Proxy(slots, {
      get: (target, key) => key === 'inject'
        ? (_name: string, fn: () => () => void) => { const off = fn(); disposers.push(off); return off }
        : typeof Reflect.get(target, key) === 'function' ? Reflect.get(target, key).bind(target) : Reflect.get(target, key),
    }),
    locale: { bind: () => (key: string) => key },
    effect: (fn: () => () => void) => { disposers.push(fn()) },
    get: () => undefined,
  } as unknown as Context
  return { ctx, disposers }
}

test('官方 main 插件页存在时才注册插件配置，卸载后撤销，且不改写内置插件', async () => {
  const slots = new SlotCore()
  const removeRoot = slots.register({
    name: 'root',
    children: {
      'settings.section': { kind: 'list', scope: 'root' },
      main: { kind: 'keyed', scope: 'root' },
    },
  } as never, (() => null) as never)
  const builtin = slots.register({ name: 'settings.section', id: 'plugins', order: 15, label: '内置插件' }, (() => 'builtin') as never)
  const { ctx, disposers } = createCtx(slots)
  registerPluginConfigSection(ctx)
  expect(slots.entriesOfSlot('settings.section').map(entry => entry.options.id)).toEqual(['plugins'])

  const inject = vi.fn(() => ({ ensure: vi.fn(), loaded: true }))
  const removeOfficial = slots.register({
    name: 'main',
    key: 'plugins',
    locale: 'pluginManager',
    inject,
  } as never, officialPage as never)
  await Promise.resolve(); await Promise.resolve()

  const ids = slots.entriesOfSlot('settings.section').map(entry => entry.options.id)
  expect(ids).toEqual(['plugins', PLUGIN_CONFIG_SECTION_ID])
  const config = slots.entriesOfSlot('settings.section').find(entry => entry.options.id === PLUGIN_CONFIG_SECTION_ID)
  expect(config?.options.order).toBe(PLUGIN_CONFIG_SECTION_ORDER)
  expect(config?.locale).toBe('pluginManager')
  expect(config?.inject).toBe(inject)
  expect(slots.entriesOfSlot('settings.section').find(entry => entry.options.id === 'plugins')?.options.label).toBe('内置插件')

  removeOfficial(); await Promise.resolve(); await Promise.resolve()
  expect(slots.entriesOfSlot('settings.section').map(entry => entry.options.id)).toEqual(['plugins'])

  disposers.reverse().forEach(dispose => dispose())
  builtin()
  removeRoot()
})

test('插件配置必须带上官方 inject 和文案，才能画出宿主插件设置页', async () => {
  const slots = new SlotCore()
  const removeRoot = slots.register({
    name: 'root',
    children: { main: { kind: 'keyed', scope: 'root' } },
  } as never, (() => null) as never)
  const removeOfficial = slots.register({
    name: 'main',
    key: 'plugins',
    children: { 'plugins.item': { kind: 'list', scope: 'root' } },
  } as never, (() => null) as never)
  const store = {
    getSnapshot: () => ({ writable: true, timeoutMs: 1000 }),
    subscribe: () => () => {},
  }
  slots.register({
    name: 'plugins.item',
    id: 'bash',
    locale: 'settings.plugins',
    inject: () => ({ hooks: { bashCard: store }, save() {} }),
  } as never, ((props: { view?: string; t?: (key: string) => string; useBashCard?: (select: (snapshot: { timeoutMs: number }) => number) => number }) => {
    if (props.view === 'summary') return props.t?.('bashDescription') ?? null
    return createElement('form', { 'data-bash-config': true }, String(props.useBashCard?.(snapshot => snapshot.timeoutMs)))
  }) as never)
  function officialList(props: Record<string, unknown>): ReactNode {
    const renderSlot = props.renderSlot as ((name: string, owner: object, opts?: { only?: string }) => ReactNode) | undefined
    return createElement('div', { 'data-official-plugins': true },
      renderSlot?.('plugins.item', { view: 'summary' }, { only: 'bash' }),
      renderSlot?.('plugins.item', { view: 'page' }, { only: 'bash' }))
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(PluginConfigSection, {
      Official: officialList,
      officialLabel: '插件配置',
      slots,
      bindLocale: (ns: string) => (key: string) => `${ns}:${key}`,
    }))
  })
  cleanups.push(() => { root.unmount(); removeOfficial(); removeRoot() })
  expect(container.textContent).toContain('settings.plugins:bashDescription')
  expect(container.querySelector('[data-bash-config]')?.textContent).toBe('1000')
})

test('插件配置文案绑定必须转发插值且保持同一函数身份', () => {
  const translate = vi.fn((key: string, params?: Record<string, unknown>) => `${key}:${params?.n ?? ''}`)
  const bind = bindPluginConfigLocale(() => translate)
  const first = bind('settings.plugins')
  expect(first).toBe(bind('settings.plugins'))
  expect(first('hello', { n: 1 })).toBe('hello:1')
})

test('官方 keyedHooks 必须绑成 use 钩子，文案要带上插值参数', async () => {
  const slots = new SlotCore()
  const removeRoot = slots.register({
    name: 'root',
    children: { main: { kind: 'keyed', scope: 'root' } },
  } as never, (() => null) as never)
  const removeOfficial = slots.register({
    name: 'main',
    key: 'plugins',
    children: { 'plugins.item': { kind: 'list', scope: 'root' } },
  } as never, (() => null) as never)
  const store = {
    getSnapshot: () => ({ label: 'keyed' }),
    subscribe: () => () => {},
  }
  slots.register({
    name: 'plugins.item',
    id: 'keyed-card',
    locale: 'settings.plugins',
    inject: () => ({ keyedHooks: { bundleCard: store } }),
  } as never, ((props: {
    t?: (key: string, params?: Record<string, unknown>) => string
    useBundleCard?: (select: (snapshot: { label: string }) => string) => string
  }) => createElement('form', { 'data-keyed-config': true }, `${props.t?.('timeout', { ms: 12 }) ?? ''}:${props.useBundleCard?.(snapshot => snapshot.label) ?? ''}`)) as never)
  function officialList(props: Record<string, unknown>): ReactNode {
    const renderSlot = props.renderSlot as ((name: string, owner: object, opts?: { only?: string }) => ReactNode) | undefined
    return createElement('div', { 'data-official-plugins': true }, renderSlot?.('plugins.item', { view: 'page' }, { only: 'keyed-card' }))
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(PluginConfigSection, {
      Official: officialList,
      officialLabel: '插件配置',
      slots,
      bindLocale: (ns: string) => (key: string, params?: Record<string, unknown>) => `${ns}:${key}:${params?.ms ?? ''}`,
    }))
  })
  cleanups.push(() => { root.unmount(); removeOfficial(); removeRoot() })
  expect(container.querySelector('[data-keyed-config]')?.textContent).toBe('settings.plugins:timeout:12:keyed')
})

test('官方 plugins.item 缺 inject 抛错时不得拆掉插件配置页', async () => {
  const slots = new SlotCore()
  const removeRoot = slots.register({
    name: 'root',
    children: { main: { kind: 'keyed', scope: 'root' } },
  } as never, (() => null) as never)
  const removeOfficial = slots.register({
    name: 'main',
    key: 'plugins',
    children: { 'plugins.item': { kind: 'list', scope: 'root' } },
  } as never, (() => null) as never)
  slots.register({
    name: 'plugins.item',
    id: 'bash',
  } as never, (() => {
    throw new Error('official plugins.item needs renderer inject')
  }) as never)
  function officialList(props: Record<string, unknown>): ReactNode {
    const renderSlot = props.renderSlot as ((name: string, owner: object, opts?: { only?: string }) => ReactNode) | undefined
    return createElement('div', { 'data-official-plugins': true }, renderSlot?.('plugins.item', { view: 'summary' }, { only: 'bash' }), 'list-ok')
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(PluginConfigSection, { Official: officialList, officialLabel: '插件配置', slots }))
  })
  cleanups.push(() => { root.unmount(); removeOfficial(); removeRoot() })
  expect(container.querySelector('.dcu-plugin-config')).not.toBeNull()
  expect(container.textContent).toContain('list-ok')
})

test('插件配置转交官方 bundle.config，PUA 设置不能被空 renderSlot 吞掉', async () => {
  const slots = new SlotCore()
  const removeRoot = slots.register({
    name: 'root',
    children: {
      main: { kind: 'keyed', scope: 'root' },
    },
  } as never, (() => null) as never)
  const removeOfficial = slots.register({
    name: 'main',
    key: 'plugins',
    children: {
      'plugins.bundle.config': { kind: 'keyed', scope: 'root' },
    },
  } as never, officialPage as never)
  slots.register({
    name: 'plugins.bundle.config',
    key: '@michengai/dsh-pua',
  } as never, (() => createElement('form', { 'data-pua-config': true }, 'PUA 配置')) as never)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(PluginConfigSection, { Official: officialPage, officialLabel: '插件配置', slots }))
  })
  cleanups.push(() => { root.unmount(); removeOfficial(); removeRoot() })
  expect(container.querySelector('.dcu-plugin-config')?.getAttribute('aria-label')).toBe('插件配置')
  expect(container.querySelector('[data-official-plugins]')).not.toBeNull()
  expect(container.querySelector('[data-pua-config]')?.textContent).toBe('PUA 配置')
})
