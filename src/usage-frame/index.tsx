/** 独立文档中的原费用组件；复用父宿主状态，原始统计请求仍走同源费用接口。 */
import React, { useSyncExternalStore } from 'react'
import * as ReactDOM from 'react-dom'
import { createRoot } from 'react-dom/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { IconChevronDownOutline14, Menu, Modal, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import * as storeModule from '@deepseek-ai/dsh-client-store'
import type { UsageFrameWindow } from './contract.ts'
const modules: Record<string, unknown> = { react: React, 'react-dom': ReactDOM, 'react/jsx-runtime': jsxRuntime,
  '@deepseek-ai/dsh-client-ui-primitives': { IconChevronDownOutline14, Menu, Modal, Tooltip }, '@deepseek-ai/dsh-client-store': storeModule }
let plugin: { UsageBilling: React.ComponentType<Record<string, unknown>> } | undefined
let mounted = false
const bridge = () => (window as UsageFrameWindow).dcuUsageHost
const fail = (message: string) => { const host = bridge(); if (host) host.failed(message); else document.getElementById('billing-root')!.textContent = message }
const start = () => {
  const host = bridge()
  if (!plugin || !host || mounted) return
  mounted = true
  try {
    const useStore = (selector: (snapshot: unknown) => unknown) => selector(useSyncExternalStore(host.subscribe, host.getSnapshot))
    const Component = plugin.UsageBilling
    const root = createRoot(document.getElementById('billing-root')!)
    root.render(<Component wide t={host.translate} useStore={useStore} actions={host.actions} checkModels={host.checkModels}
      publishCosts={host.publishCosts} renderSlot={() => null} registerOpen={(open: () => void) => { queueMicrotask(open); return () => {} }}/>)
    let opened = false
    const observer = new MutationObserver(() => {
      const exists = document.querySelector('[data-testid="billing-dashboard"]') !== null
      if (exists && !opened) { opened = true; host.ready() }
      else if (!exists && opened) { opened = false; host.close() }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('pagehide', () => { observer.disconnect(); root.unmount() }, { once: true })
  } catch (error) { fail(error instanceof Error ? error.message : '费用面板加载失败') }
}
Object.assign(window, { __ModuleLoader__: { load: ({ factory }: { factory: (require: (id: string) => unknown) => typeof plugin }) => {
  try { plugin = factory(id => { if (!(id in modules)) throw new Error(`未适配的费用插件依赖：${id}`); return modules[id] }); start() }
  catch (error) { fail(error instanceof Error ? error.message : '费用插件不兼容') }
} } })
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin) return
  if (event.data?.type === 'dcu-usage-init') start()
})
window.addEventListener('error', event => { fail(event.message || '费用面板资源加载失败') })
