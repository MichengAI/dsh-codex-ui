/**
 * 桌面端窗口菜单的 Host 路由。
 *
 * 三条通道，同一个端点：
 *   GET  ?action=status   → 状态文档（含一次性重启令牌与当前重启阶段）
 *   POST ?action=restart  → 请求重启（必须带 status 文档里的令牌）
 *   GET  （无 action）     → 兼容旧调用方，仅返回 { enabled }
 *
 * 安全：只接受环回调用（Host 头必须是本机），POST 还必须带令牌。
 * 只校验环回没有意义——本机任何进程都能伪造 Host 头，令牌才能证明调用方是读过
 * 我们状态文档的那个页面（同一套思路见社区 dsh-refresh-restart）。
 */
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { CODEX_UI_RESTART_HEADER } from './business-api.ts'
import { detectApp, buildPlan, defaultPaths, spawnHelper, type RestartKind } from './restart.ts'

/** 路由依赖；全部可注入，便于单测绕开真实进程。 */
export interface DesktopMenuRouteDeps {
  /** 子插件在 profile 里是否被显式停用。 */
  readonly isDisabled: () => boolean
  /** 覆盖令牌（测试用）；缺省每次 Host 启动随机生成。 */
  readonly token?: string
  readonly platform?: string
  readonly execPath?: string
  readonly env?: Record<string, string | undefined>
  readonly paths?: { logPath: string; statePath: string }
  readonly spawn?: (plan: ReturnType<typeof buildPlan>) => { ok: boolean; error?: string }
}

/** 请求/响应的最小形状，避免把 node:http 的具体类型绑到测试里。 */
export interface RouteRequest {
  readonly method?: string
  readonly url?: string
  readonly headers: Record<string, string | string[] | undefined>
}
export interface RouteResponse {
  writeHead: (status: number, headers?: Record<string, string>) => unknown
  end: (body?: string) => unknown
}

/** 读到的一次重启阶段（由助手写、界面轮询）。 */
interface HelperState {
  phase?: string
  detail?: string
}

function headerValue(headers: RouteRequest['headers'], key: string): string | undefined {
  const value = headers[key]
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

/** `Host` 头是否指向本机。 */
export function hostIsLoopback(host: string | undefined): boolean {
  if (typeof host !== 'string' || host.trim() === '') return false
  const value = host.trim().toLowerCase()
  const name = value.startsWith('[') ? value.slice(1, value.indexOf(']')) : value.split(':')[0]
  return name === '127.0.0.1' || name === 'localhost' || name === '::1' || name === '[::1]'
}

/** 常数时间比较两个令牌。 */
export function tokenMatches(expected: string, provided: string | undefined): boolean {
  if (typeof provided !== 'string' || provided === '') return false
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function sendJson(response: RouteResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(body)),
    'cache-control': 'no-store',
  })
  response.end(body)
}

/**
 * 创建路由处理器。
 * @param deps - 子插件状态、平台信息与可注入的副作用。
 */
export function createDesktopMenuHandler(deps: DesktopMenuRouteDeps): (request: RouteRequest, response: RouteResponse) => Promise<void> {
  const token = deps.token ?? randomBytes(16).toString('hex')
  const paths = deps.paths ?? defaultPaths()
  const spawnPlan = deps.spawn ?? spawnHelper
  let scheduled = false

  const target = () => detectApp({ platform: deps.platform, execPath: deps.execPath, env: deps.env })

  const readState = (): HelperState => {
    try {
      return JSON.parse(readFileSync(paths.statePath, 'utf8')) as HelperState
    } catch {
      return {}
    }
  }

  const statusView = () => {
    const app = target()
    const state = readState()
    return {
      enabled: !deps.isDisabled(),
      canRestart: app.canRestart,
      reason: app.canRestart ? undefined : unsupportedReason(app.platform, app.kind),
      platform: app.platform,
      kind: app.kind as RestartKind,
      appPath: app.appPath,
      token,
      phase: state.phase,
      detail: state.detail,
    }
  }

  return async (request, response) => {
    const rawUrl = typeof request.url === 'string' ? request.url : '/'
    let url: URL
    try {
      url = new URL(rawUrl, 'http://dsh.internal')
    } catch {
      sendJson(response, 400, { ok: false, error: 'bad-url' })
      return
    }

    if (!hostIsLoopback(headerValue(request.headers, 'host'))) {
      sendJson(response, 403, { ok: false, error: 'forbidden' })
      return
    }

    const action = url.searchParams.get('action')

    if (action === null) {
      // 兼容旧调用方：只回答子插件是否启用。
      sendJson(response, 200, { enabled: !deps.isDisabled() })
      return
    }

    if (action === 'status') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendJson(response, 405, { ok: false, error: 'method' })
        return
      }
      sendJson(response, 200, statusView())
      return
    }

    if (action === 'restart') {
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: 'method' })
        return
      }
      if (!tokenMatches(token, headerValue(request.headers, CODEX_UI_RESTART_HEADER))) {
        sendJson(response, 403, { ok: false, error: 'bad-token' })
        return
      }
      const app = target()
      if (!app.canRestart) {
        sendJson(response, 409, {
          ok: false,
          error: 'unsupported',
          reason: unsupportedReason(app.platform, app.kind),
        })
        return
      }
      if (scheduled) {
        sendJson(response, 409, { ok: false, error: 'busy' })
        return
      }
      scheduled = true
      const outcome = spawnPlan(buildPlan(app, paths))
      if (!outcome.ok) {
        scheduled = false
        sendJson(response, 500, { ok: false, error: 'spawn-failed', detail: outcome.error })
        return
      }
      sendJson(response, 200, { ok: true, phase: 'starting' })
      return
    }

    sendJson(response, 404, { ok: false, error: 'not-found' })
  }
}

/** 平台不支持时给页面看的原因。 */
export function unsupportedReason(platform: string, kind: RestartKind): string {
  if (kind !== 'node') return ''
  if (platform === 'win32') return '找不到 DeepSeek Harness 的可执行文件，无法重启'
  if (platform === 'darwin') return '找不到 DeepSeek Harness 的 .app 位置，无法重启'
  if (platform === 'linux') return '找不到 DeepSeek Harness 的程序路径，无法重启'
  return '当前不是桌面版，无法重启应用'
}
