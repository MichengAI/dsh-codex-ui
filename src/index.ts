/** 浏览器客户端插件的 Host 入口；客户端逻辑由 dsh.client 加载。 */
import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import { canRequestParentReload, dependencyStatuses, disposeDependencyInstaller, installDependency, installProgressSnapshot, resolveDependencyRuntime, scheduleParentPluginReload, updateAllDependencies } from './dependency-manager.ts'
import { hostServices } from './host-services.ts'
import {
  SectionsDocumentError,
  SECTIONS_STORE_MAX_BYTES,
  readSectionsDocument,
  validateSectionsDocument,
  writeSectionsDocument,
} from './sections-store.ts'

const dependenciesEndpoint = CODEX_UI_API_ENDPOINTS.dependencies

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
): boolean {
  const reject = (status: AuthenticationStatus, message: string): false => {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    response.end(JSON.stringify(errorBody(status, message)))
    return false
  }
  try {
    const connection = ctx.get('connection') as {
      requestRejection?: (request: { headers?: HostRequest['headers'] }) => 401 | 403 | undefined
    } | undefined
    if (typeof connection?.requestRejection !== 'function') {
      ctx.logger.warn('Codex UI 业务 REST 认证不可用：缺少 connection.requestRejection。')
      return reject(503, '宿主认证服务暂不可用。')
    }
    const rejection = connection.requestRejection(request)
    if (rejection !== undefined) {
      return reject(rejection, rejection === 401 ? '请先登录 DSH。' : '已拒绝不可信或跨站请求。')
    }
    return true
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : typeof error
    ctx.logger.warn('Codex UI 业务 REST 认证调用失败：%s', reason)
    return reject(503, '宿主认证服务暂不可用。')
  }
}

export const inject = ['webServer']

/** 提供不泄露地址、命令和凭证的连接器目录。 */
export function apply(ctx: Context): void {
  const host = hostServices(ctx)
  ctx.effect(() => {
    const disposeDependencies = host.webServer.register({
      kind: 'exact',
      path: dependenciesEndpoint,
      handler: async (request, response) => {
        if (!authenticateBusinessRequest(ctx, request, response)) return
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
            if (url.searchParams.get('action') === 'update-all') {
              const runtime = resolveDependencyRuntime(ctx)
              const notifyParent = canRequestParentReload(runtime)
              const autoReload = runtime.environmentKind === 'desktop' || notifyParent
              let restartAfterResponse = false
              const { dependencies, updatedCount } = await updateAllDependencies(() => {
                restartAfterResponse = notifyParent
                return restartAfterResponse
              }, runtime)
              response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
              response.end(JSON.stringify({ dependencies, restartRequired: updatedCount > 0, autoReload }))
              if (restartAfterResponse) scheduleParentPluginReload()
              return
            }
            const runtime = resolveDependencyRuntime(ctx)
            const notifyParent = canRequestParentReload(runtime)
            const autoReload = runtime.environmentKind === 'desktop' || notifyParent
            let restartAfterResponse = false
            const dependencies = await installDependency(url.searchParams.get('dependency'), () => {
              restartAfterResponse = notifyParent
              return restartAfterResponse
            }, runtime)
            response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ dependencies, restartRequired: true, autoReload }))
            if (restartAfterResponse) scheduleParentPluginReload()
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
      handler: async (request, response) => {
        if (!authenticateBusinessRequest(ctx, request, response)) return
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
      disposeDependencyInstaller()
      disposeDependencies()
      disposeSections?.()
    }
  }, 'michengai-codex-ui: catalogs')
}
