/** 费用插件原组件的独立 iframe 验证入口；仅使用预览服务的空数据。 */
import React, { useSyncExternalStore } from 'react'
import * as ReactDOM from 'react-dom'
import { createRoot } from 'react-dom/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { IconChevronDownOutline14, Menu, Modal, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import * as storeModule from '@deepseek-ai/dsh-client-store'

const modules = { react: React, 'react-dom': ReactDOM, 'react/jsx-runtime': jsxRuntime,
  '@deepseek-ai/dsh-client-ui-primitives': { IconChevronDownOutline14, Menu, Modal, Tooltip },
  '@deepseek-ai/dsh-client-store': storeModule }
let dictionary: Record<string, string> = {}
let footer: { options: any; Component: React.ComponentType<any> } | undefined
const disposers: Array<() => void> = []
const emptySessions = { ids: [], byId: {} }
const sessions = { getSnapshot: () => emptySessions, subscribe: () => () => {} }
const translate = (key: string, values?: Record<string, unknown>) => Object.entries(values ?? {}).reduce(
  (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), dictionary[key] ?? key)

// 只装配原插件的费用入口及本地预算状态，不启动完整宿主、会话或后台通知。
;(window as any).__ModuleLoader__ = { load: ({ factory }: { factory: (require: (id: string) => unknown) => any }) => {
  const plugin = factory(id => {
    if (!(id in modules)) throw new Error(`费用插件新增了未适配依赖：${id}`)
    return modules[id as keyof typeof modules]
  })
  plugin.apply({
    provide: () => {},
    effect: (callback: () => (() => void) | undefined, label: string) => {
      if (label !== 'ui-usage-billing: dictionaries') return
      const dispose = callback(); if (dispose) disposers.push(dispose)
    },
    locale: { register: (_namespace: string, dictionaries: { zh: Record<string, string> }) => { dictionary = dictionaries.zh; return () => {} } },
    slots: {
      inject: (name: string, callback: () => void) => { if (name === 'sidebar.footer.action') callback() },
      register: (options: any, Component: React.ComponentType<any>) => { footer = { options, Component }; return () => {} },
    },
    sessions: { list: sessions },
    remote: { llm: { listProviders: async () => ({ ok: false }), listConfigurableProviders: async () => ({ ok: false }) } },
  })
  if (!footer) throw new Error('费用插件没有注册已知入口')
  const { options, Component } = footer
  const instance = options.store.create()
  const injected = options.inject()
  // 预览未连接模型探活，避免把未知状态显示成厂商故障。
  injected.checkModels = async () => ({ checked: false, available: false, models: 0, failures: 0, okProviders: [], badProviders: [] })
  const useStore = (selector: (value: unknown) => unknown) => selector(useSyncExternalStore(instance.subscribe, instance.getSnapshot))
  const root = createRoot(document.getElementById('billing-root')!)
  root.render(<Component {...injected} wide t={translate} useStore={useStore} actions={instance.actions} renderSlot={() => null}
    registerOpen={(open: () => void) => { queueMicrotask(open); return () => {} }}/>)
  window.addEventListener('pagehide', () => { root.unmount(); instance.dispose?.(); disposers.forEach(dispose => dispose()) }, { once: true })
} }

// 消息只接受同源父页面，用于主题与退出；iframe 内的原生 Modal 自行管理焦点。
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'dcu-billing-theme') return
  document.body.toggleAttribute('data-ds-dark-theme', event.data.dark === true)
})
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.defaultPrevented) parent.postMessage({ type: 'dcu-billing-close' }, location.origin)
})
const reportClose = () => {
  if (document.querySelector('[data-testid="billing-dashboard"]')) return
  if (document.body.dataset.dashboardReady === 'true') parent.postMessage({ type: 'dcu-billing-close' }, location.origin)
}
new MutationObserver(() => {
  if (document.querySelector('[data-testid="billing-dashboard"]')) document.body.dataset.dashboardReady = 'true'
  else reportClose()
}).observe(document.body, { childList: true, subtree: true })
