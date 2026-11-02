import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'
import {
  fetchRestartStatus,
  requestRestart,
  showRestartToast,
  watchRestart,
  type RestartCopy,
} from './restart-client.ts'

/** 「重启应用与 Host」的文案。 */
function restartCopy(zh: boolean): RestartCopy {
  return zh
    ? {
        quitting: '正在退出并重新打开 DeepSeek Harness…',
        relaunched: '已重新启动。',
        cancelled: '应用没有退出，本次重启已取消。',
        launchFailed: '应用已退出，但没能自动重新打开，请手动启动。',
        timeout: '没有在预期时间内完成重启，请稍后确认应用是否还在。',
        close: '关闭',
        failed: '重启失败',
      }
    : {
        quitting: 'Closing and reopening DeepSeek Harness…',
        relaunched: 'Restarted.',
        cancelled: 'The app did not exit; this restart was cancelled.',
        launchFailed: 'The app exited but could not be reopened automatically.',
        timeout: 'The restart did not finish in time; please check the app.',
        close: 'Close',
        failed: 'Restart failed',
      }
}

export interface MenuItemDefinition {
  readonly id: string
  readonly label: string
  readonly separatorBefore?: boolean
  readonly action?: () => void | Promise<void>
}

const MENU_HOST_CLASS = 'dcu-desktop-menu-popover'
const STYLE_ID = 'dcu-desktop-menu-style'

const STYLES = `
.${MENU_HOST_CLASS} {
  position: fixed;
  z-index: 10000;
  min-width: 200px;
  max-width: 320px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-surface-overlay, #1e1e22));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  box-shadow: var(--dsw-elevation-prominent, 0 14px 34px rgba(0,0,0,0.36), 0 2px 8px rgba(0,0,0,0.24));
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  color: var(--dsw-alias-label-primary, #ffffff);
  font-family: var(--dsw-font-family, sans-serif);
  animation: dcu-menu-fade-in 100ms ease-out;
  outline: none;
  -webkit-app-region: no-drag;
}

@keyframes dcu-menu-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.${MENU_HOST_CLASS} .dcu-menu-separator {
  height: 1px;
  margin: 4px 6px;
  background: var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
}

.${MENU_HOST_CLASS} button.dcu-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 28px;
  padding: 5px 8px;
  text-align: left;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
  outline: none;
  transition: background-color 100ms ease;
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: no-drag;
}

.${MENU_HOST_CLASS} button.dcu-menu-item:hover,
.${MENU_HOST_CLASS} button.dcu-menu-item:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
}

.${MENU_HOST_CLASS} .dcu-menu-label {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = STYLES
  document.head.append(style)
}

let activePopover: HTMLElement | null = null
let activeAnchor: HTMLButtonElement | null = null

export function closeActiveMenu(): void {
  if (activePopover !== null) {
    activePopover.remove()
    activePopover = null
  }
  if (activeAnchor !== null) {
    activeAnchor.setAttribute('aria-expanded', 'false')
    activeAnchor = null
  }
}

export function openDropdown(
  anchor: HTMLButtonElement,
  items: readonly MenuItemDefinition[],
): void {
  if (activeAnchor === anchor && activePopover !== null) {
    closeActiveMenu()
    return
  }

  closeActiveMenu()
  ensureStyles()

  const rect = anchor.getBoundingClientRect()
  const popover = document.createElement('div')
  popover.className = MENU_HOST_CLASS
  popover.setAttribute('role', 'menu')
  popover.tabIndex = -1

  for (const item of items) {
    if (item.separatorBefore) {
      const sep = document.createElement('div')
      sep.className = 'dcu-menu-separator'
      sep.setAttribute('role', 'separator')
      popover.append(sep)
    }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'dcu-menu-item'
    btn.setAttribute('role', 'menuitem')

    const labelSpan = document.createElement('span')
    labelSpan.className = 'dcu-menu-label'
    labelSpan.textContent = item.label
    btn.append(labelSpan)

    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
    })
    btn.addEventListener('mousedown', (e) => {
      e.stopPropagation()
    })

    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      closeActiveMenu()
      setTimeout(() => {
        try {
          // 动作可能是异步的（例如重启要先问宿主能不能做）；统一兜住失败，避免未处理的 rejection。
          void Promise.resolve(item.action?.()).catch((err: unknown) => {
            console.error('Menu action error:', err)
          })
        } catch (err) {
          console.error('Menu action error:', err)
        }
      }, 10)
    })

    popover.append(btn)
  }

  document.body.append(popover)

  // 定位计算：避免超出视口
  const popoverRect = popover.getBoundingClientRect()
  let left = rect.left
  let top = rect.bottom + 2

  if (left + popoverRect.width > window.innerWidth - 8) {
    left = window.innerWidth - popoverRect.width - 8
  }
  if (left < 8) left = 8

  if (top + popoverRect.height > window.innerHeight - 8) {
    top = rect.top - popoverRect.height - 2
  }

  popover.style.left = `${Math.round(left)}px`
  popover.style.top = `${Math.round(top)}px`

  anchor.setAttribute('aria-expanded', 'true')
  activePopover = popover
  activeAnchor = anchor

  popover.focus()
}

/**
 * 监听全局事件以支持点击外部或按 Esc 关闭菜单
 */
let globalListenersInstalled = false
function ensureGlobalListeners(): void {
  if (globalListenersInstalled) return
  globalListenersInstalled = true

  document.addEventListener('pointerdown', (e) => {
    if (activePopover === null) return
    const path = e.composedPath ? e.composedPath() : []
    if (path.length > 0) {
      if (activePopover && path.includes(activePopover)) return
      if (activeAnchor && path.includes(activeAnchor)) return
    } else {
      const target = e.target as Node | null
      if (target && (activePopover.contains(target) || activeAnchor?.contains(target))) {
        return
      }
    }
    closeActiveMenu()
  }, true)

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activePopover !== null) {
      closeActiveMenu()
    }
  }, true)
}

/**
 * 检查桌面端窗口菜单子插件在 Host 侧是否启用
 */
export async function checkDesktopMenuEnabled(): Promise<boolean> {
  try {
    const base = typeof document !== 'undefined' && document.baseURI ? document.baseURI : 'http://localhost'
    const normalizedBase = base.endsWith('/') ? base : `${base}/`
    const path = CODEX_UI_API_ENDPOINTS.desktopMenu.startsWith('/')
      ? CODEX_UI_API_ENDPOINTS.desktopMenu.slice(1)
      : CODEX_UI_API_ENDPOINTS.desktopMenu
    const url = new URL(path, normalizedBase).href
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) return true
    const data = await res.json() as { enabled?: boolean }
    return data.enabled !== false
  } catch {
    return true
  }
}

/**
 * 观察并在 Windows 桌面端的 data-windows-menu 宿主上注入【帮助】菜单。
 * 只追加一个入口，官方【应用】【编辑】保持原样。
 */
export function observeDesktopTitlebarMenus(
  translate: (key: string, fallback?: string) => string = (_k, fallback) => fallback ?? '',
): () => void {
  ensureGlobalListeners()

  let cleanedUp = false
  let injectedHelpBtn: HTMLButtonElement | null = null

  const getHelpItems = (): MenuItemDefinition[] => {
    const zh = document.documentElement.lang?.toLowerCase().startsWith('zh') ?? true
    return [
      {
        id: 'reload-page',
        label: translate('desktopMenu.help.reloadPage', zh ? '刷新页面' : 'Reload Page'),
        action: () => {
          window.location.reload()
        },
      },
      {
        id: 'restart-host',
        label: translate('desktopMenu.help.restartAppHost', zh ? '重启应用与 Host' : 'Restart App and Host'),
        action: async () => {
          const copy = restartCopy(zh)
          const status = await fetchRestartStatus()
          if (status === null) {
            showRestartToast(copy).set(
              copy.failed,
              zh ? '连不上宿主，重启通道不可用。' : 'Cannot reach the Host; the restart channel is unavailable.',
              'error',
            )
            return
          }
          if (!status.canRestart) {
            showRestartToast(copy).set(
              copy.failed,
              status.reason ?? (zh ? '当前环境不支持重启应用。' : 'Restarting the app is not supported here.'),
              'error',
            )
            return
          }
          const confirmMsg = zh
            ? '将退出并重新打开 DeepSeek Harness，正在运行的任务会被中断。继续？'
            : 'DeepSeek Harness will close and reopen; running tasks will be interrupted. Continue?'
          if (!window.confirm(confirmMsg)) return

          const toast = showRestartToast(copy)
          toast.set(copy.quitting)
          const outcome = await requestRestart(status.token)
          if (!outcome.ok) {
            toast.set(
              copy.failed,
              outcome.reason ?? outcome.detail ?? outcome.error ?? 'unknown',
              'error',
            )
            return
          }
          watchRestart(toast, copy)
        },
      },
    ]
  }

  const mountMenus = (): void => {
    if (cleanedUp || typeof document === 'undefined') return
    const host = document.querySelector<HTMLElement>('[data-windows-menu]')
    if (!host || !host.shadowRoot) return

    const shadow = host.shadowRoot
    const bar = shadow.querySelector<HTMLElement>('[role="menubar"]')
    if (!bar) return

    // 获取官方现存按钮
    const officialButtons = Array.from(bar.querySelectorAll<HTMLButtonElement>('button'))
    if (officialButtons.length === 0) return

    // 注入【帮助 ▾】（追加在官方最后一个按钮【编辑】之后）
    if (!shadow.getElementById('dcu-desktop-menu-help')) {
      const helpBtn = document.createElement('button')
      helpBtn.type = 'button'
      helpBtn.id = 'dcu-desktop-menu-help'
      helpBtn.setAttribute('role', 'menuitem')
      helpBtn.setAttribute('aria-haspopup', 'menu')
      helpBtn.setAttribute('aria-expanded', 'false')
      helpBtn.tabIndex = -1
      helpBtn.textContent = translate('desktopMenu.help', '帮助')

      helpBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        openDropdown(helpBtn, getHelpItems())
      })

      bar.append(helpBtn)
      injectedHelpBtn = helpBtn
    }
  }

  // 初始尝试挂载
  mountMenus()

  // 针对 shadow DOM 异步挂载或宿主重绘做 DOM 变动监听
  const observer = new MutationObserver(() => {
    mountMenus()
  })

  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    cleanedUp = true
    observer.disconnect()
    closeActiveMenu()
    injectedHelpBtn?.remove()
    document.getElementById(STYLE_ID)?.remove()
  }
}
