/** 独立文档中的原费用组件；复用父宿主状态，原始统计请求仍走同源费用接口。 */
import React, { useEffect, useId, useRef, useSyncExternalStore } from 'react'
import * as ReactDOM from 'react-dom'
import { createRoot } from 'react-dom/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { IconChevronDownOutline14, Menu, Modal, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import * as storeModule from '@deepseek-ai/dsh-client-store'
import type { UsageFrameWindow } from './contract.ts'
// 在本承载文档中协调 Modal 的 Escape，避免所有打开的 Modal 同时关闭。
const layers = new Map<string, () => void>()
let menuOwnsEscape = false
function FrameModal(props: React.ComponentProps<typeof Modal>) {
  const id = `dcu-layer-${useId().replace(/[^a-z0-9]/gi, '')}`
  const close = useRef(props.onClose)
  close.current = props.onClose
  useEffect(() => {
    if (!props.open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    layers.set(id, () => close.current())
    return () => {
      layers.delete(id)
      if (opener?.isConnected) opener.focus()
    }
  }, [id, props.open])
  return <Modal {...props} className={`${props.className ?? ''} dcu-usage-layer ${id}`} onClose={() => {
    if (!menuOwnsEscape) props.onClose()
  }}/>
}
class FrameBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) { fail(error.message) }
  render() { return this.state.failed ? null : this.props.children }
}
const modules: Record<string, unknown> = { react: React, 'react-dom': ReactDOM, 'react/jsx-runtime': jsxRuntime,
  '@deepseek-ai/dsh-client-ui-primitives': { IconChevronDownOutline14, Menu, Modal: FrameModal, Tooltip }, '@deepseek-ai/dsh-client-store': storeModule }
let plugin: { UsageBilling: React.ComponentType<Record<string, unknown>> } | undefined
let mounted = false
const bridge = () => (window as UsageFrameWindow).dcuUsageHost
let pendingFailure: string | undefined
const fail = (message: string) => { pendingFailure = message; bridge()?.failed(message) }
const start = () => {
  const host = bridge()
  if (pendingFailure) { host?.failed(pendingFailure); return }
  if (!plugin || !host || mounted) return
  mounted = true
  try {
    const useStore = (selector: (snapshot: unknown) => unknown) => selector(useSyncExternalStore(host.subscribe, host.getSnapshot))
    const Component = plugin.UsageBilling
    const root = createRoot(document.getElementById('billing-root')!)
    root.render(<FrameBoundary><Component wide t={host.translate} useStore={useStore} actions={host.actions} checkModels={host.checkModels}
      publishCosts={host.publishCosts} renderSlot={() => null} registerOpen={(open: () => void) => { queueMicrotask(open); return () => {} }}/></FrameBoundary>)
    let opened = false
    const observer = new MutationObserver(() => {
      const exists = document.querySelector('[data-testid="billing-dashboard"]') !== null
      if (exists && !opened) { opened = true; host.ready() }
      else if (!exists && opened) { opened = false; host.dismissed() }
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
  if (event.data?.type !== 'dcu-usage-init') return
  start()
  if (!document.querySelector('[data-dcu-billing-script]') && !pendingFailure) {
    const script = document.createElement('script')
    script.dataset.dcuBillingScript = ''
    script.src = '/api/dsh-codex-ui/usage/plugin.js'
    script.onerror = () => fail('费用插件资源加载失败')
    document.body.append(script)
  }
})
window.addEventListener('error', event => {
  if (event.target instanceof HTMLScriptElement || event.target instanceof HTMLLinkElement || event instanceof ErrorEvent) {
    fail(event instanceof ErrorEvent ? event.message : '费用面板资源加载失败')
  }
}, true)
window.addEventListener('unhandledrejection', event => fail(event.reason instanceof Error ? event.reason.message : '费用面板运行失败'))
const visible = (element: Element) => element.getClientRects().length > 0 && !element.closest('[hidden],[inert]')
window.addEventListener('keydown', event => {
  if (event.defaultPrevented) return
  const dialogs = [...document.querySelectorAll('.dcu-usage-layer')].filter(visible)
  const menu = [...document.querySelectorAll('[role="menu"],[role="listbox"]')].some(visible)
  if (event.key === 'Escape') {
    if (menu) {
      menuOwnsEscape = true
      setTimeout(() => { menuOwnsEscape = false }, 0)
      return
    }
    event.preventDefault()
    event.stopImmediatePropagation()
    if (dialogs.length > 1) {
      const top = dialogs.at(-1)!
      for (const [id, close] of layers) if (top.classList.contains(id)) { close(); return }
    } else bridge()?.close()
  }
  if (event.key === 'Tab' && dialogs.length <= 1 && !menu) {
    const controls = [...document.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex]')]
      .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && visible(element))
    if (controls.length === 0 || document.activeElement === (event.shiftKey ? controls[0] : controls.at(-1))) {
      event.preventDefault()
      bridge()?.focusOutside(event.shiftKey)
    }
  }
}, true)
Object.assign(window, { dcuUsageRuntimeReady: true })
