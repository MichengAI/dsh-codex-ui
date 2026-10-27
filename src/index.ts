/** 浏览器客户端插件的 Host 入口；客户端逻辑由 dsh.client 加载。 */
import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import { canRequestParentReload, dependencyStatuses, disposeDependencyInstaller, installDependency, installProgressSnapshot, resolveDependencyRuntime, runtimeSupportsOfficialTurnNavigator, scheduleParentPluginReload, updateAllDependencies } from './dependency-manager.ts'
import { hostServices } from './host-services.ts'
import { parsePinnedWorkspaceIds, parseStoredWorkspaceGroups, readWorkspacePreferences, WORKSPACE_PREFERENCES_VERSION, writeWorkspacePreferences } from './workspace-preferences.ts'

const dependenciesEndpoint = CODEX_UI_API_ENDPOINTS.dependencies
const preferencesEndpoint = CODEX_UI_API_ENDPOINTS.preferences
const maxPreferencesBodyBytes = 32 * 1024

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
export async function readRequestBody(request: HostRequest, maxBytes = maxPreferencesBodyBytes): Promise<string> {
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
            if (url.searchParams.get('action') === 'capabilities') {
              const capabilities = {
                officialTurnNavigator: await runtimeSupportsOfficialTurnNavigator(resolveDependencyRuntime(ctx)),
              }
              response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
              response.end(JSON.stringify({ capabilities }))
              return
            }
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
    const disposePreferences = host.webServer.register({
      kind: 'exact',
      path: preferencesEndpoint,
      handler: async (request, response) => {
        if (!authenticateBusinessRequest(ctx, request, response)) return
        try {
          if (request.method === 'GET' || request.method === 'HEAD') {
            const preferences = await readWorkspacePreferences()
            response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(request.method === 'HEAD' ? undefined : JSON.stringify(preferences))
            return
          }
          if (request.method === 'PUT') {
            const body = JSON.parse(await readRequestBody(request)) as unknown
            const record = body !== null && typeof body === 'object' ? body as Record<string, unknown> : undefined
            const pinnedWorkspaceIds = record === undefined ? undefined : parsePinnedWorkspaceIds(record.pinnedWorkspaceIds)
            const existing = await readWorkspacePreferences()
            const workspaceGroups = record === undefined
              ? undefined
              : 'workspaceGroups' in record
                ? parseStoredWorkspaceGroups(record.workspaceGroups)
                : existing.workspaceGroups
            // 仅保留同一 ID 的既有名称冲突；新增或改名不能绕过固定大小写判重。
            const introducesTitleConflict = workspaceGroups?.some(group =>
              !existing.workspaceGroups.some(previous => previous.id === group.id && previous.title === group.title)
              && workspaceGroups.some(other => other.id !== group.id && other.title.toLowerCase() === group.title.toLowerCase())) === true
            if (pinnedWorkspaceIds === undefined || workspaceGroups === undefined || introducesTitleConflict) {
              response.writeHead(400, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
              response.end(JSON.stringify({ error: '工作区偏好格式无效。' }))
              return
            }
            await writeWorkspacePreferences(pinnedWorkspaceIds, workspaceGroups)
            response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ version: WORKSPACE_PREFERENCES_VERSION, pinnedWorkspaceIds, workspaceGroups, exists: true }))
            return
          }
          response.writeHead(405, { allow: 'GET, HEAD, PUT' })
          response.end()
        } catch (error) {
          if (error instanceof RequestBodyTooLargeError) {
            response.writeHead(413, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ error: '请求体过大。' }))
            return
          }
          if (error instanceof SyntaxError) {
            response.writeHead(400, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ error: '置顶偏好格式无效。' }))
            return
          }
          ctx.logger.warn('preferences endpoint failed: %s', error)
          response.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ error: '置顶偏好暂不可用。' }))
        }
      },
    })
    return () => {
      disposeDependencyInstaller()
      disposeDependencies()
      disposePreferences()
    }
  }, 'michengai-codex-ui: catalogs')
}
