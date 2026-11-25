/** 浏览器客户端插件的 Host 入口；客户端逻辑由 dsh.client 加载。 */
import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import { dependencyStatuses, installDependency, installProgressSnapshot, noteHostInstallState, resolveDependencyRuntime, updateAllDependencies } from './dependency-manager.ts'
import { hostServices } from './host-services.ts'
import { isSubPluginDisabledOnDisk } from './profile-resolver.ts'
import {
  SectionsDocumentError,
  SECTIONS_STORE_MAX_BYTES,
  readSectionsDocument,
  validateSectionsDocument,
  writeSectionsDocument,
} from './sections-store.ts'

const dependenciesEndpoint = CODEX_UI_API_ENDPOINTS.dependencies

/**
 * composer 子插件被停用时，由主插件补一个只读状态兜底端点。
 *
 * 客户端以「探活 → 启停输入框增强」驱动 UI：子插件在 cordis.patch.yml 里被停用后，
 * 它自己注册的 `/composer` 端点随之消失，探活只能拿到 404，DevTools 里就会持续报错。
 * 这里在磁盘配置确认停用时接管同一路径，返回 `enabled: false`，客户端据此立即收敛。
 * 子插件启用时不注册，避免与 composer 子插件的同名路由冲突（同一时刻只应有一个注册者）。
 *
 * @returns 路由注销函数；未注册时返回 undefined。
 */
export function registerComposerStatusFallback(ctx: Context): (() => void) | undefined {
  if (!isSubPluginDisabledOnDisk('codex-ui-composer', undefined, ctx)) return undefined
  const host = hostServices(ctx)
  return host.webServer.register({
    kind: 'exact',
    path: CODEX_UI_API_ENDPOINTS.composer,
    auth: 'anonymous',
    handler: async (request: HostRequest, response: HostResponse) => {
      if (request.method && request.method !== 'GET') {
        response.writeHead(405, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        response.end(JSON.stringify({ error: 'Method Not Allowed' }))
        return
      }
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      response.end(JSON.stringify({ enabled: false, prediction: false }))
    },
  })
}

type HostRequest = {
  method?: string
  url?: string
  headers?: Record<string, string | string[] | undefined>
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>
}

function headerValue(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0]
  return undefined
}

/** 把安装错误收成可给浏览器看的文案：我们自己的中文说明保留，带本地路径的底层错误脱敏。 */
export function publicDependencyError(error: unknown): string {
  const message = error instanceof Error ? error.message : '依赖管理暂不可用。'
  if (/[A-Za-z]:[\\/]|\/(?:home|root|Users|var|tmp)\//.test(message)) return '依赖管理暂不可用，请查看服务端日志。'
  return message
}

export class RequestBodyTooLargeError extends Error {}

/** 有界读取 Node HTTP body；偏好接口只接受很小的 JSON。 */
export async function readRequestBody(request: HostRequest, maxBytes = 32 * 1024): Promise<string> {
  const declared = Number(headerValue(request.headers ?? {}, 'content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestBodyTooLargeError('请求体过大。')
  if (request[Symbol.asyncIterator] === undefined) return ''
  const chunks: Buffer[] = []
  let length = 0
  for await (const chunk of request as AsyncIterable<Uint8Array | string>) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    length += buffer.length
    if (length > maxBytes) throw new RequestBodyTooLargeError('请求体过大。')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

type HostResponse = {
  writeHead(status: number, headers?: Record<string, string>): void
  end(body?: string): void
}

type AuthenticationStatus = 401 | 403 | 503
type AuthenticationErrorBody = (status: AuthenticationStatus, message: string) => Record<string, unknown>

function resolveConnectionService(ctx: Context): {
  requestRejection?: (request: { headers?: HostRequest['headers'] }) => 401 | 403 | undefined
  admit?: (request: { headers?: HostRequest['headers'] }) => { rejection?: 401 | 403 | 503; peer?: unknown } | undefined
} | undefined {
  try {
    const conn = typeof ctx.get === 'function' ? ctx.get('connection') : undefined
    if (conn) return conn as any
  } catch {}

  try {
    const rootCtx = (ctx as any)[Symbol.for('cordis.root')] ?? (ctx as any).root
    if (rootCtx && typeof rootCtx.get === 'function') {
      const conn = rootCtx.get('connection')
      if (conn) return conn as any
    }
  } catch {}

  try {
    const store = (ctx as any).reflect?.store
    if (store && typeof store === 'object') {
      for (const sym of Object.getOwnPropertySymbols(store)) {
        const impl = store[sym]
        if (impl && impl.name === 'connection' && impl.value) {
          return impl.value as any
        }
      }
    }
  } catch {}

  try {
    const direct = (ctx as any).connection
    if (direct) return direct as any
  } catch {}

  return undefined
}

/**
 * 所有业务 REST 依赖 connection >=0.1.2-rc.1 的 Host/Origin/Fetch Metadata 与登录检查。
 * 必须在读取请求体及执行副作用前调用；不得将 undefined 以外的拒绝结果当作放行。
 * 发布包信任边界由 tests/business-rest-auth.assert.ts 的真实宿主契约用例验证。
 */
function authenticateBusinessRequest(
  ctx: Context,
  request: HostRequest,
  response: HostResponse,
  errorBody: AuthenticationErrorBody = (_status, message) => ({ error: message }),
  peer?: unknown,
): boolean {
  if (peer) return true
  const reject = (status: AuthenticationStatus, message: string): false => {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    response.end(JSON.stringify(errorBody(status, message)))
    return false
  }
  try {
    const connection = resolveConnectionService(ctx)
    if (!connection || (typeof connection.requestRejection !== 'function' && typeof connection.admit !== 'function')) {
      ctx.logger.warn('Codex UI 业务 REST 认证不可用：缺少 connection 认证接口。')
      return reject(503, '宿主认证服务暂不可用。')
    }
    let rejection: 401 | 403 | 503 | undefined
    if (typeof connection.admit === 'function') {
      const admission = connection.admit(request)
      if (admission && typeof admission === 'object') {
        if ('rejection' in admission && admission.rejection !== undefined) {
          rejection = admission.rejection
        } else if (!('peer' in admission) || !admission.peer) {
          rejection = 403
        }
      } else {
        rejection = 503
      }
    } else if (typeof connection.requestRejection === 'function') {
      rejection = connection.requestRejection(request)
    }
    if (rejection !== undefined) {
      const message = rejection === 401
        ? '请先登录 DSH。'
        : rejection === 503
          ? '宿主认证服务暂不可用。'
          : '已拒绝不可信或跨站请求。'
      return reject(rejection, message)
    }
    return true
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : typeof error
    ctx.logger.warn('Codex UI 业务 REST 认证调用失败：%s', reason)
    return reject(503, '宿主认证服务暂不可用。')
  }
}

export const inject = ['webServer', 'profileContext', 'pluginManager']

/** 提供不泄露地址、命令和凭证的连接器目录。 */
export function apply(ctx: Context): void {
  const host = hostServices(ctx)
  ctx.effect(() => {
    if (typeof ctx.on !== 'function') return () => {}
    return (ctx.on as (event: string, listener: (arg: unknown) => void) => () => void)('plugin-manager/install-state', (event: unknown) => {
      noteHostInstallState(event)
    })
  }, 'codex-ui: host plugin-manager install state')
  ctx.effect(() => {
    const disposeFallback = registerComposerStatusFallback(ctx)
    return () => { disposeFallback?.() }
  }, 'michengai-codex-ui: composer status fallback')
  ctx.effect(() => {
    const disposeDependencies = host.webServer.register({
      kind: 'exact',
      path: dependenciesEndpoint,
      auth: 'anonymous',
      handler: async (request, response, peer?: unknown) => {
        if (!authenticateBusinessRequest(ctx, request, response, undefined, peer)) return
        const url = new URL(request.url ?? '/', 'http://localhost')
        try {
          if (request.method === 'GET') {
            if (url.searchParams.get('action') === 'progress') {
              response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
              response.end(JSON.stringify({ progress: installProgressSnapshot() }))
              return
            }
            const dependencies = await dependencyStatuses(resolveDependencyRuntime(ctx))
            response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ dependencies }))
            return
          }
          if (request.method === 'POST') {
            const runtime = resolveDependencyRuntime(ctx)
            const result = url.searchParams.get('action') === 'update-all'
              ? await updateAllDependencies(runtime)
              : await installDependency(url.searchParams.get('dependency'), runtime)
            const failed = result.application === 'failed' || result.application === 'cancelled'
            let failureMessage: string | undefined
            if (failed) {
              if (result.application === 'cancelled') {
                failureMessage = '依赖安装已取消。'
              } else {
                const failedItem = result.results.find(item => item.application === 'failed' || item.application === 'cancelled')
                const errKind = failedItem?.error?.kind
                const errCode = failedItem?.error?.code
                const errMsg = failedItem?.error?.message ?? failedItem?.error?.diagnostic
                if (errKind === 'timeout' || errCode === 'timeout' || /timeout|timed out/i.test(errMsg ?? '')) {
                  failureMessage = '插件安装超时，请检查网络后重试。'
                } else if (errKind === 'build-blocked' || errCode === 'build-blocked' || /build-blocked|构建脚本/i.test(errMsg ?? '')) {
                  failureMessage = '插件依赖的 pnpm 构建脚本策略尚未确认，请更新 Profile 配置后重试。'
                } else {
                  failureMessage = '从 npm 安装或更新依赖失败。请检查网络或 npm registry 后重试。'
                }
              }
            }
            const sanitizedResults = result.results.map(item => ({
              ...item,
              ...(item.error !== undefined ? {
                error: {
                  ...item.error,
                  ...(item.error.message !== undefined ? { message: publicDependencyError(new Error(item.error.message)) } : {}),
                  ...(item.error.diagnostic !== undefined ? { diagnostic: publicDependencyError(new Error(item.error.diagnostic)) } : {}),
                },
              } : {}),
            }))
            response.writeHead(failed ? 503 : 200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({
              ...result,
              results: sanitizedResults,
              restartRequired: result.results.some(item => item.application === 'restart-required' || item.restore?.application === 'restart-required'),
              autoReload: false,
              ...(failed && failureMessage !== undefined ? { error: publicDependencyError(new Error(failureMessage)) } : {}),
            }))
            return
          }
          response.writeHead(405)
          response.end()
        } catch (error) {
          ctx.logger.warn('dependencies endpoint failed: %s', error)
          response.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ error: publicDependencyError(error) }))
        }
      },
    })
    /**
     * 工作区分区：结构与归属由宿主落盘（当前 profile 的 plugin-data 下），浏览器只留折叠这类视图偏好。
     * 对齐 Codex：`thread_sections` + `threads.thread_section_id` 在宿主，折叠状态在客户端。
     */
    const disposeSections = host.webServer.register({
      kind: 'exact',
      path: CODEX_UI_API_ENDPOINTS.sections,
      auth: 'anonymous',
      handler: async (request, response, peer?: unknown) => {
        if (!authenticateBusinessRequest(ctx, request, response, undefined, peer)) return
        const json = (status: number, body: unknown): void => {
          response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify(body))
        }
        try {
          if (request.method === 'GET') {
            const document = readSectionsDocument(ctx)
            json(200, document ?? { version: 1, sections: [] })
            return
          }
          if (request.method !== 'POST' && request.method !== 'PUT') {
            response.writeHead(405)
            response.end()
            return
          }
          const body = await readRequestBody(request, SECTIONS_STORE_MAX_BYTES)
          if (body.trim() === '') {
            json(400, { error: '缺少分区数据。' })
            return
          }
          let parsed: unknown
          try {
            parsed = JSON.parse(body)
          } catch {
            json(400, { error: '分区数据不是合法 JSON。' })
            return
          }
          const document = validateSectionsDocument(parsed)
          writeSectionsDocument(ctx, document)
          json(200, { ok: true, sections: document.sections.length })
        } catch (error) {
          if (error instanceof SectionsDocumentError) {
            json(400, { error: error.message })
            return
          }
          if (error instanceof RequestBodyTooLargeError) {
            json(413, { error: '分区数据过大。' })
            return
          }
          ctx.logger.warn('sections endpoint failed: %s', error)
          json(503, { error: '分区存储暂不可用。' })
        }
      },
    })

    return () => {
      disposeDependencies()
      disposeSections?.()
    }
  }, 'michengai-codex-ui: catalogs')
}
