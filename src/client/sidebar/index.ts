import type { Context as ClientContext } from '@deepseek-ai/cordis'
import React, { useEffect, useState, type FC, type ReactNode } from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'
import { NS } from '../locales.ts'
import { extractAriaKeyshortcuts, NewSessionButton, resolveStartSession } from './NewSessionButton.tsx'
import { SidebarNav } from './SidebarNav.tsx'
import {
  getSessionActionDeclared,
  getSidebarEnabled,
  setSessionActionDeclared,
  setSidebarEnabled,
  subscribeSidebarEnabled,
} from './state.ts'
import { injectSidebarStyles, SIDEBAR_ACTIVE_ATTR } from './styles.ts'

export * from './layout.ts'
export * from './SidebarNav.tsx'

const CONTAINER_CLASS = 'dcu-sidebar-nav-root'
const CLAUDE_STYLE_ATTR = 'data-dsh-claude-style'

function resolveNewSessionLabel(ctx: ClientContext, t?: (key: string) => string): string {
  try {
    const direct = t?.('sidebar.newSession')
    if (direct && direct !== 'sidebar.newSession') return direct
    const bound = ctx.locale?.bind?.(NS)?.('sidebar.newSession' as never)
    if (bound && bound !== 'sidebar.newSession') return bound
  } catch {
    // 回退中文默认
  }
  return '新会话'
}

function createSessionActionLayer(ctx: ClientContext): FC<{ wide?: boolean; children?: ReactNode; t?: (k: string) => string }> {
  // Claude Style 通过宿主按钮的标记识别主操作，替换节点会被它按同行图标布局。
  const shouldReplace = () => getSidebarEnabled() &&
    (typeof document === 'undefined' || !document.body?.hasAttribute(CLAUDE_STYLE_ATTR))
  const SessionActionLayer: FC<{ wide?: boolean; children?: ReactNode; t?: (k: string) => string }> = ({
    wide = false,
    children,
    t,
  }) => {
    const [replace, setReplace] = useState(shouldReplace)
    useEffect(() => {
      const sync = () => setReplace(shouldReplace())
      const unsubscribe = subscribeSidebarEnabled(sync)
      const observer = new MutationObserver(sync)
      observer.observe(document.body, { attributes: true, attributeFilter: [CLAUDE_STYLE_ATTR] })
      sync()
      return () => {
        observer.disconnect()
        unsubscribe()
      }
    }, [])

    if (!replace || !wide || !resolveStartSession(ctx)) {
      return React.createElement(React.Fragment, null, children)
    }

    return React.createElement(NewSessionButton, {
      ctx,
      label: resolveNewSessionLabel(ctx, t),
      ariaHint: extractAriaKeyshortcuts(children),
      tooltipDisabled: wide,
    })
  }
  return SessionActionLayer
}

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
 * - 若宿主声明了 sidebar.session.action HOC，则原位接管新会话按钮为 Codex 扁平风格，保留同行扩展入口，并在其后挂载导航容器；
 * - 旧宿主未声明 sidebar.session.action 时，在原生 newSession 前挂载导航容器并同步隐藏原生入口；
 * - 仅靶向隐藏原生 panelList（及无 HOC 接管时的原生 newSession），绝不删除或克隆宿主 DOM 节点；
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
  let unsubSessionAction: (() => void) | undefined

  setSidebarEnabled(false)
  setSessionActionDeclared(false)

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

  const resolveMountAnchor = (
    sidebarRoot: HTMLElement,
    target: HTMLElement,
  ): HTMLElement | null => {
    let anchor: HTMLElement = target
    while (anchor.parentElement && anchor.parentElement !== sidebarRoot) {
      anchor = anchor.parentElement
    }
    return anchor.parentElement === sidebarRoot ? anchor : null
  }

  const tryMount = (): void => {
    if (disposed || !isEnabled || typeof document === 'undefined') return

    // 已经挂载且仍在 DOM 树中，必要时仅校验与 newSessionRow 的相对位置，不触发任何重绘
    if (currentContainer && document.contains(currentContainer)) {
      if (currentSidebarRoot && currentContainer.parentElement === currentSidebarRoot) {
        const newSessionEl = currentSidebarRoot.querySelector(
          '[class*="newSessionRow"], button[class*="newSession"]',
        ) as HTMLElement | null
        if (newSessionEl) {
          const anchor = resolveMountAnchor(currentSidebarRoot, newSessionEl)
          if (anchor) {
            const wantAfter = getSessionActionDeclared()
            if (wantAfter && anchor.nextElementSibling !== currentContainer) {
              currentSidebarRoot.insertBefore(currentContainer, anchor.nextSibling)
            } else if (!wantAfter && currentContainer.nextElementSibling !== anchor) {
              currentSidebarRoot.insertBefore(currentContainer, anchor)
            }
          }
        }
      }
      return
    }

    // 如果之前挂载过但容器脱离了 DOM，必须先彻底释放旧 React 树与订阅，防止泄漏
    if (currentContainer) {
      teardownMount()
    }

    // 寻找宿主原生 newSessionRow / newSession 按钮，或回退到 panelList（兼容无 session/create 权限场景）
    const nativeSessionEl = document.querySelector(
      '[class*="newSessionRow"], button[class*="newSession"]',
    ) as HTMLElement | null
    const nativePanelList = document.querySelector('nav[class*="panelList"]') as HTMLElement | null
    const anchorTarget = nativeSessionEl ?? nativePanelList
    if (!anchorTarget) {
      // 宿主侧栏未加载，等待下一次 DOM 变更
      return
    }

    const sidebarRoot = (anchorTarget.closest('[class*="root"]') ||
      anchorTarget.parentElement) as HTMLElement | null
    if (!sidebarRoot) return

    const mountAnchor = resolveMountAnchor(sidebarRoot, anchorTarget)
    if (!mountAnchor) return

    const insertAfterAnchor = Boolean(nativeSessionEl && getSessionActionDeclared())
    const insertBeforeNode = insertAfterAnchor ? mountAnchor.nextSibling : mountAnchor

    const container = document.createElement('div')
    container.className = CONTAINER_CLASS
    container.setAttribute('data-dcu-managed', 'true')

    try {
      sidebarRoot.insertBefore(container, insertBeforeNode)
      currentContainer = container

      // 渲染独立 React 树 (复用宿主 react-dom 静态提供的 render)
      render(React.createElement(SidebarNav, { ctx }), container)

      // 成功挂载并渲染后标记宿主侧栏根节点
      sidebarRoot.setAttribute(SIDEBAR_ACTIVE_ATTR, 'true')
      currentSidebarRoot = sidebarRoot
    } catch {
      // 容错保障：挂载或渲染失败时彻底清理，绝不隐藏宿主原生入口
      try {
        unmountComponentAtNode(container)
      } catch {
        // 忽略 unmount 报错
      }
      container.remove()
      currentContainer = null
      sidebarRoot.removeAttribute(SIDEBAR_ACTIVE_ATTR)
      currentSidebarRoot = null
    }
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
    setSidebarEnabled(nextEnabled)
    if (isEnabled) {
      if (!cleanupStyles) {
        cleanupStyles = injectSidebarStyles()
      }
      tryMount()
    } else {
      teardownMount()
      if (cleanupStyles) {
        cleanupStyles()
        cleanupStyles = null
      }
    }
  }

  // 注册 sidebar.session.action HOC：在现代 DSH 宿主上原位替换新会话按钮，保留同行第三方扩展（如会话导入）
  if (typeof ctx.slots?.inject === 'function' && typeof ctx.slots?.register === 'function') {
    const SessionActionLayer = createSessionActionLayer(ctx)
    try {
      const result = ctx.slots.inject('sidebar.session.action', () => {
        const unregister = ctx.slots.register(
          {
            name: 'sidebar.session.action',
            id: 'codex-ui',
            order: Number.MAX_SAFE_INTEGER,
            locale: NS,
          } as never,
          SessionActionLayer as never,
        )
        setSessionActionDeclared(true)
        scheduleCheck()
        return () => {
          unregister?.()
          setSessionActionDeclared(false)
          scheduleCheck()
        }
      })
      if (typeof result === 'function') {
        unsubSessionAction = result
      }
    } catch {
      setSessionActionDeclared(false)
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
    unsubSessionAction?.()
    unsubSessionAction = undefined
    setSessionActionDeclared(false)
    setSidebarEnabled(false)
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
