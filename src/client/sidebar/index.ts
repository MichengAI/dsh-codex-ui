import type { Context as ClientContext } from '@deepseek-ai/cordis'
import React from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'
import { SidebarNav } from './SidebarNav.tsx'
import { injectSidebarStyles, SIDEBAR_ACTIVE_ATTR } from './styles.ts'

export * from './layout.ts'
export * from './SidebarNav.tsx'

const CONTAINER_CLASS = 'dcu-sidebar-nav-root'

/**
 * 校验侧栏子插件是否在 Host 侧启用。
 * 遵循 fail-closed 原则：404、网络失败或未显式 enabled 时视为关闭并回退官方。
 */
export async function checkSidebarEnabled(): Promise<boolean> {
  try {
    const base = typeof document !== 'undefined' && document.baseURI ? document.baseURI : 'http://localhost'
    const normalizedBase = base.endsWith('/') ? base : `${base}/`
    const path = CODEX_UI_API_ENDPOINTS.sidebar.startsWith('/')
      ? CODEX_UI_API_ENDPOINTS.sidebar.slice(1)
      : CODEX_UI_API_ENDPOINTS.sidebar
    const url = new URL(path, normalizedBase).href
    const res = await fetch(url)
    if (!res.ok) return false
    const data = (await res.json()) as { enabled?: boolean }
    return data.enabled === true
  } catch {
    return false
  }
}

/**
 * 挂载并观察侧栏导航增强：
 * - 只有在子插件探活成功时激活；
 * - 在原生 newSession 前挂载唯一的 React 独立导航容器；
 * - 靶向隐藏原生 newSession 与 panelList，绝不删除或克隆宿主 DOM 节点；
 * - 观察器仅监听挂载容器的存续，彻底切断 DOM 自触发循环；
 * - 卸载时彻底 unmount React Root、移除样式与标记，原生侧栏无损秒级复原。
 */
export function observeSidebarNav(ctx: ClientContext): () => void {
  let disposed = false
  let observer: MutationObserver | null = null
  let cleanupStyles: (() => void) | null = null
  let currentContainer: HTMLElement | null = null
  let currentSidebarRoot: HTMLElement | null = null
  let rafPending = false
  let isEnabled = false

  const teardownMount = (): void => {
    if (currentContainer) {
      try {
        unmountComponentAtNode(currentContainer)
      } catch {
        // 忽略 unmount 报错
      }
      currentContainer.remove()
      currentContainer = null
    }
    if (currentSidebarRoot) {
      currentSidebarRoot.removeAttribute(SIDEBAR_ACTIVE_ATTR)
      currentSidebarRoot = null
    }
  }

  const tryMount = (): void => {
    if (disposed || !isEnabled || typeof document === 'undefined') return

    // 已经挂载且仍在 DOM 树中，快速跳过，不触发任何重绘
    if (currentContainer && document.contains(currentContainer)) return

    // 如果之前挂载过但容器脱离了 DOM，必须先彻底释放旧 React 树与订阅，防止泄漏
    if (currentContainer) {
      teardownMount()
    }

    // 寻找宿主原生 newSession 按钮
    const nativeNewSession = document.querySelector('button[class*="newSession"]') as HTMLButtonElement | null
    if (!nativeNewSession) {
      // 宿主侧栏未加载，等待下一次 DOM 变更
      return
    }

    const sidebarRoot = (nativeNewSession.closest('[class*="root"]') ||
      nativeNewSession.parentElement) as HTMLElement | null
    if (!sidebarRoot) return

    // 注入样式
    if (!cleanupStyles) {
      cleanupStyles = injectSidebarStyles()
    }

    // 标记宿主侧栏根节点并创建挂载容器
    sidebarRoot.setAttribute(SIDEBAR_ACTIVE_ATTR, 'true')
    currentSidebarRoot = sidebarRoot

    const container = document.createElement('div')
    container.className = CONTAINER_CLASS
    container.setAttribute('data-dcu-managed', 'true')

    sidebarRoot.insertBefore(container, nativeNewSession)
    currentContainer = container

    // 渲染独立 React 树 (复用宿主 react-dom 静态提供的 render)
    render(React.createElement(SidebarNav, { ctx }), container)
  }

  const scheduleCheck = (): void => {
    if (disposed || rafPending) return
    rafPending = true
    requestAnimationFrame(() => {
      rafPending = false
      if (!disposed && isEnabled) {
        tryMount()
      }
    })
  }

  const sync = async (): Promise<void> => {
    if (disposed) return
    const nextEnabled = await checkSidebarEnabled()
    if (disposed) return
    if (nextEnabled === isEnabled) return
    isEnabled = nextEnabled
    if (isEnabled) {
      tryMount()
    } else {
      teardownMount()
      if (cleanupStyles) {
        cleanupStyles()
        cleanupStyles = null
      }
    }
  }

  // 首轮异步探活
  void sync()

  // 1. 窗口获焦时同步状态（响应用户在插件管理中切开关）
  const onFocus = () => {
    void sync()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus)
  }

  // 2. 观察 DOM 变更：感知宿主侧栏挂载/重载，以及设置弹层开关切换
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    observer = new MutationObserver(mutations => {
      if (disposed) return

      let hasForeignChange = false
      let touchesSettings = false

      for (const m of mutations) {
        // 忽略自身容器内部发生的一切 DOM 变动
        if (m.target instanceof Element && m.target.closest(`.${CONTAINER_CLASS}`)) {
          continue
        }
        hasForeignChange = true

        // 检测设置弹层开闭，以便即刻探活更新状态
        if (!touchesSettings) {
          for (const node of [...m.addedNodes, ...m.removedNodes]) {
            if (node instanceof HTMLElement) {
              if (
                node.getAttribute('data-shortcut-modal') === 'settings' ||
                node.querySelector?.('[data-shortcut-modal="settings"]')
              ) {
                touchesSettings = true
                break
              }
            }
          }
        }
      }

      if (touchesSettings) {
        void sync()
      } else if (hasForeignChange) {
        scheduleCheck()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  return () => {
    disposed = true
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onFocus)
    }
    if (observer) {
      observer.disconnect()
      observer = null
    }
    teardownMount()
    if (cleanupStyles) {
      cleanupStyles()
      cleanupStyles = null
    }
  }
}
