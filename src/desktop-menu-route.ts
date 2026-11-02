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
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
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
  /** Host 的父进程（Electron 主进程）PID；Windows 上被结束的就是它。 */
  readonly mainPid?: number
  /** Host 自身 PID（主进程死后可能变孤儿，需要清理）。 */
  readonly hostPid?: number
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
  at?: number
  bootId?: string
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
  /** 本次 Host 启动的标识：只认自己这一轮写出的状态，丢掉上次运行留下的结果。 */
  const bootId = randomBytes(8).toString('hex')
  const paths = deps.paths ?? defaultPaths()
  const spawnPlan = deps.spawn ?? spawnHelper
  /** 已排程的重启；超时后允许重试，避免一次失败把入口永久锁死。 */
  let scheduledAt = 0
  const scheduleTimeoutMs = 120_000

  // 状态与日志要写进这个目录；不先建好，助手里的 try{}catch{} 会把 ENOENT 吞掉，
  // 界面永远读不到 cancelled / launch-failed 这些结局。
  try {
    mkdirSync(dirname(paths.statePath), { recursive: true })
    mkdirSync(dirname(paths.logPath), { recursive: true })
  } catch { /* 目录不可写时下面的写入会静默失败，界面退化为超时提示 */ }

  const target = () => detectApp({ platform: deps.platform, execPath: deps.execPath, env: deps.env })

  const readState = (): HelperState => {
    try {
      const state = JSON.parse(readFileSync(paths.statePath, 'utf8')) as HelperState
      // 上一轮运行留下的状态不算数：否则界面会把旧结果当成这次的结果。
      if (state.bootId !== undefined && state.bootId !== bootId) return {}
      return state
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
      if (scheduledAt !== 0 && Date.now() - scheduledAt < scheduleTimeoutMs) {
        sendJson(response, 409, { ok: false, error: 'busy' })
        return
      }
      scheduledAt = Date.now()
      const outcome = spawnPlan(buildPlan(app, {
        ...paths,
        mainPid: deps.mainPid ?? process.ppid,
        hostPid: deps.hostPid ?? process.pid,
        bootId,
      }))
      if (!outcome.ok) {
        scheduledAt = 0
        sendJson(response, 500, { ok: false, error: 'spawn-failed', detail: outcome.error })
        return
      }
      sendJson(response, 200, { ok: true, phase: 'starting' })
      return
    }

    sendJson(response, 404, { ok: false, error: 'not-found' })
  }
}

/**
 * 不可重启的原因代码。
 * 只回机器码，文案由客户端按当前语言翻——Host 不知道用户界面是哪种语言。
 */
export type UnsupportedReason = 'desktop-only' | 'missing-app'

/** @returns 不能重启时的原因代码；能重启时为 undefined。 */
export function unsupportedReason(platform: string, kind: RestartKind): UnsupportedReason | undefined {
  if (kind !== 'node') return undefined
  if (platform === 'win32' || platform === 'darwin' || platform === 'linux') return 'missing-app'
  return 'desktop-only'
}
