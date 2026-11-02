/**
 * 「重启应用与 Host」的客户端通道与进度卡片。
 *
 * 页面只做三件事：问 Host 能不能重启（status，拿到一次性令牌）→ 带着令牌 POST →
 * 轮询阶段把实情显示出来。真正的退出与重开由 Host 侧生成的助手脚本完成。
 *
 * 为什么不在这里直接 location.reload：重载只换页面，插件宿主进程还在，装了新插件
 * 也不生效；真重启必须让整个应用退出再起来。
 */
import { CODEX_UI_API_ENDPOINTS, CODEX_UI_RESTART_HEADER } from '../../business-api.ts'

/** Host 返回的状态文档。 */
export interface RestartStatus {
  readonly enabled?: boolean
  readonly canRestart: boolean
  readonly reason?: string
  readonly platform: string
  readonly kind: string
  readonly appPath?: string
  readonly token: string
  readonly phase?: string
  readonly detail?: string
}

/** POST 的结果。 */
export interface RestartOutcome {
  readonly ok: boolean
  readonly error?: string
  readonly detail?: string
  readonly reason?: string
}

/** 与 checkDesktopMenuEnabled 相同的方式拼出端点地址（兼容 dsh-app:// 协议）。 */
function endpointUrl(search: string): string {
  const base = typeof document !== 'undefined' && document.baseURI ? document.baseURI : 'http://localhost'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const path = CODEX_UI_API_ENDPOINTS.desktopMenu.startsWith('/')
    ? CODEX_UI_API_ENDPOINTS.desktopMenu.slice(1)
    : CODEX_UI_API_ENDPOINTS.desktopMenu
  return `${new URL(path, normalizedBase).href}${search}`
}

/** 读一次重启状态；网络/协议不可用时返回 null（调用方据此报「通道不可用」）。 */
export async function fetchRestartStatus(): Promise<RestartStatus | null> {
  try {
    const response = await fetch(endpointUrl('?action=status'), {
      method: 'GET',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return null
    const payload = await response.json() as RestartStatus
    if (typeof payload?.token !== 'string') return null
    return payload
  } catch {
    return null
  }
}

/** 带着令牌请求重启。 */
export async function requestRestart(token: string): Promise<RestartOutcome> {
  try {
    const response = await fetch(endpointUrl('?action=restart'), {
      method: 'POST',
      cache: 'no-store',
      headers: { accept: 'application/json', [CODEX_UI_RESTART_HEADER]: token },
    })
    const payload = await response.json().catch(() => ({})) as RestartOutcome
    if (response.ok && payload.ok === true) return { ok: true }
    return {
      ok: false,
      error: payload.error ?? `http-${response.status}`,
      detail: payload.detail,
      reason: payload.reason,
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** 进度卡片用到的文案。 */
export interface RestartCopy {
  readonly quitting: string
  readonly relaunched: string
  readonly cancelled: string
  readonly launchFailed: string
  readonly timeout: string
  readonly close: string
  readonly failed: string
  readonly busy: string
}

const STYLE_ID = 'dcu-desktop-restart-style'

const STYLES = `
.dcu-restart-toast {
  position: fixed;
  z-index: 10001;
  right: 20px;
  bottom: 20px;
  width: min(380px, calc(100vw - 40px));
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: var(--dsw-radius-md, 10px);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.1));
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-surface-overlay, #1e1e22));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  box-shadow: var(--dsw-elevation-prominent, 0 14px 34px rgba(0, 0, 0, 0.36));
  color: var(--dsw-alias-label-primary, #fff);
  font-family: var(--dsw-font-family, sans-serif);
  font-size: 13px;
  line-height: 19px;
  animation: dcu-restart-in 120ms ease-out;
}

@keyframes dcu-restart-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.dcu-restart-toast[data-tone="error"] {
  border-color: var(--dsw-alias-state-error-primary, #ff6b6b);
}

.dcu-restart-toast-title {
  font-weight: 600;
}

.dcu-restart-toast-body {
  color: var(--dsw-alias-label-secondary, #a1a1a6);
  overflow-wrap: anywhere;
}

.dcu-restart-toast-action {
  align-self: flex-end;
  height: 26px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-sm, 6px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.14));
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.dcu-restart-toast-action:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
}
`

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = STYLES
  document.head.append(style)
}

/** 一张可复用的重启提示卡；progress 状态会一直挂着等页面被重启带走。 */
export interface RestartToast {
  set: (title: string, body?: string, tone?: 'info' | 'error') => void
}

/**
 * 显示重启提示卡。
 * @param copy - 当前语言文案。
 */
export function showRestartToast(copy: RestartCopy): RestartToast {
  ensureStyles()
  const card = document.createElement('div')
  card.className = 'dcu-restart-toast'
  card.setAttribute('role', 'status')
  card.setAttribute('aria-live', 'polite')

  const title = document.createElement('div')
  title.className = 'dcu-restart-toast-title'
  const body = document.createElement('div')
  body.className = 'dcu-restart-toast-body'
  const action = document.createElement('button')
  action.type = 'button'
  action.className = 'dcu-restart-toast-action'
  action.textContent = copy.close
  action.hidden = true
  action.addEventListener('click', () => {
    card.remove()
  })

  card.append(title, body, action)
  document.body.append(card)

  return {
    set(nextTitle, nextBody, tone = 'info') {
      title.textContent = nextTitle
      body.textContent = nextBody ?? ''
      body.hidden = nextBody === undefined || nextBody === ''
      card.dataset.tone = tone
      action.hidden = tone !== 'error'
    },
  }
}

/**
 * 重启后盯住阶段：页面通常会在应用退出时被带走，所以这里只是尽量把结果说清楚。
 * @param toast - 提示卡。
 * @param copy - 文案。
 * @param pollMs - 轮询间隔。
 * @param limitMs - 最长观察时间。
 */
export function watchRestart(
  toast: RestartToast,
  copy: RestartCopy,
  pollMs = 700,
  limitMs = 90_000,
): () => void {
  const startedAt = Date.now()
  let timer: number | undefined
  let stopped = false

  const stop = (): void => {
    stopped = true
    if (timer !== undefined) window.clearInterval(timer)
  }

  const tick = async (): Promise<void> => {
    if (stopped) return
    if (Date.now() - startedAt > limitMs) {
      stop()
      toast.set(copy.timeout, undefined, 'error')
      return
    }
    const status = await fetchRestartStatus()
    if (stopped) return
    if (status === null) return
    const phase = status.phase
    if (phase === 'quitting' || phase === 'starting') {
      toast.set(copy.quitting)
      return
    }
    if (phase === 'relaunched') {
      stop()
      toast.set(copy.relaunched)
      return
    }
    if (phase === 'cancelled') {
      stop()
      toast.set(copy.cancelled, status.detail, 'error')
      return
    }
    if (phase === 'launch-failed') {
      stop()
      toast.set(copy.launchFailed, status.detail, 'error')
    }
  }

  timer = window.setInterval(() => { void tick() }, pollMs)
  return stop
}
