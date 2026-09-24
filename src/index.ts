/** 浏览器客户端插件的 Host 入口；客户端逻辑由 dsh.client 加载。 */
import type { Context } from '@deepseek-ai/cordis'
import { apply as registerSettingsSchema } from '@deepseek-ai/dsh-client-ui-settings-general'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import { canRequestParentReload, dependencyStatuses, disposeDependencyInstaller, installDependency, installProgressSnapshot, requestDesktopHotUpdate, resolveDependencyRuntime, runtimeSupportsOfficialTurnNavigator, updateAllDependencies } from './dependency-manager.ts'
import { authorizedExplorerWorkspacePath } from './explorer-path-policy.ts'
import { hostServices } from './host-services.ts'
import { ForegroundExplorer } from './native-explorer.ts'
import { moveSessionToWorkspace, SessionMoveError } from './session-migration.ts'
import { parsePinnedWorkspaceIds, parseStoredWorkspaceGroups, readWorkspacePreferences, WORKSPACE_PREFERENCES_VERSION, writeWorkspacePreferences } from './workspace-preferences.ts'

const connectorsEndpoint = CODEX_UI_API_ENDPOINTS.connectors
const dependenciesEndpoint = CODEX_UI_API_ENDPOINTS.dependencies
const explorerEndpoint = CODEX_UI_API_ENDPOINTS.openInExplorer
const preferencesEndpoint = CODEX_UI_API_ENDPOINTS.preferences
const sessionMoveEndpoint = CODEX_UI_API_ENDPOINTS.sessionMove
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

export const inject = ['webServer', 'agents', 'tools', 'workspaceRegistry', 'sessions', 'sessionPersistence']

function sessionMoveStatus(error: unknown): number {
  if (!(error instanceof SessionMoveError)) return 500
  if (error.code === 'session-move/invalid-request') return 400
  if (error.code === 'session-move/session-not-found' || error.code === 'session-move/workspace-not-found') return 404
  if (error.code === 'session-move/service-unavailable') return 503
  if (error.code === 'session-move/zstd-unavailable') return 501
  if (error.code === 'session-move/busy' || error.code === 'session-move/subagent-unsupported' || error.code === 'session-move/accounting-invalid' || error.code === 'session-move/destination-occupied') return 409
  return 500
}

function publicSessionMoveError(error: unknown): { code: string; error: string } {
  const code = error instanceof SessionMoveError ? error.code : 'session-move/failed'
  const messages: Record<string, string> = {
    'session-move/invalid-request': '会话或目标项目标识无效。',
    'session-move/session-not-found': '该会话没有可迁移的持久化记录。',
    'session-move/workspace-not-found': '目标项目不存在。',
    'session-move/service-unavailable': '宿主暂时无法安全移动活跃会话。',
    'session-move/subagent-unsupported': '子代理会话不能移动到其他项目。',
    'session-move/busy': '该会话正在移动，请稍后重试。',
    'session-move/accounting-invalid': '会话当前的项目归属不一致，无法安全移动。',
    'session-move/destination-occupied': '目标项目已经存在同名会话工件。',
    'session-move/zstd-unavailable': '当前运行环境不支持该会话的存储格式。',
    'session-move/rollback-failed': '移动失败，自动恢复未完整完成，请查看服务端日志。',
  }
  return { code, error: messages[code] ?? '暂时无法移动该会话，请稍后重试。' }
}

function sessionMoveAuthenticationError(status: AuthenticationStatus, error: string): Record<string, unknown> {
  const code = status === 401
    ? 'session-move/unauthorized'
    : status === 403 ? 'session-move/forbidden' : 'session-move/service-unavailable'
  return { ok: false, code, error }
}

/** 提供不泄露地址、命令和凭证的连接器目录。 */
export function apply(ctx: Context): void {
  // 原设置壳停用后，继续注册其公开的持久化引导 schema。
  registerSettingsSchema(ctx)
  const host = hostServices(ctx)
  ctx.effect(() => {
    const foregroundExplorer = new ForegroundExplorer()
    void foregroundExplorer.warmup().catch(error => ctx.logger.warn('foreground explorer warmup failed: %s', error))
    const disposeConnectors = host.webServer.register({
      kind: 'exact',
      path: connectorsEndpoint,
      handler: async (request, response) => {
        if (!authenticateBusinessRequest(ctx, request, response)) return
        if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return }
        try {
          const sessionId = new URL(request.url ?? '/', 'http://localhost').searchParams.get('sessionId')
          const scope = sessionId === null ? undefined : host.agents.get(sessionId)
          const connectors = new Map<string, { name: string; description: string }[]>()
          for (const tool of host.tools.schemas(scope)) {
            const match = /^mcp__([A-Za-z0-9_-]+?)__(.+)$/.exec(tool.name)
            if (match === null) continue
            const [, serverName, toolName] = match
            const tools = connectors.get(serverName) ?? []
            tools.push({ name: toolName, description: tool.description ?? '' })
            connectors.set(serverName, tools)
          }
          const payload = [...connectors].sort(([a], [b]) => a.localeCompare(b)).map(([name, tools]) => ({ name, tools }))
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ connectors: payload }))
        } catch {
          response.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ error: '连接器目录暂不可用。' }))
        }
      },
    })
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
              if (restartAfterResponse) setTimeout(() => { requestDesktopHotUpdate() }, 150).unref?.()
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
            if (restartAfterResponse) setTimeout(() => { requestDesktopHotUpdate() }, 150).unref?.()
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
    const disposeSessionMove = host.webServer.register({
      kind: 'exact',
      path: sessionMoveEndpoint,
      handler: async (request, response) => {
        if (!authenticateBusinessRequest(ctx, request, response, sessionMoveAuthenticationError)) return
        if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }); response.end(); return }
        try {
          const body = JSON.parse(await readRequestBody(request)) as unknown
          const record = body !== null && typeof body === 'object' ? body as Record<string, unknown> : undefined
          const sessionId = typeof record?.sessionId === 'string' ? record.sessionId.trim() : ''
          const targetWorkspaceId = typeof record?.targetWorkspaceId === 'string' ? record.targetWorkspaceId.trim() : ''
          const result = await moveSessionToWorkspace(host, sessionId, targetWorkspaceId)
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ ok: true, result }))
        } catch (error) {
          if (error instanceof RequestBodyTooLargeError) {
            response.writeHead(413, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ ok: false, code: 'session-move/invalid-request', error: '请求体过大。' }))
            return
          }
          if (error instanceof SyntaxError) {
            response.writeHead(400, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ ok: false, code: 'session-move/invalid-request', error: '请求格式无效。' }))
            return
          }
          ctx.logger.warn('session move failed: %s', error)
          const payload = publicSessionMoveError(error)
          response.writeHead(sessionMoveStatus(error), { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ ok: false, ...payload }))
        }
      },
    })
    const disposeExplorer = host.webServer.register({
      kind: 'exact',
      path: explorerEndpoint,
      handler: async (request, response) => {
        if (!authenticateBusinessRequest(ctx, request, response)) return
        if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }); response.end(); return }
        if (process.platform !== 'win32') {
          response.writeHead(501, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ error: '当前平台使用系统默认打开方式。' }))
          return
        }
        try {
          const body = JSON.parse(await readRequestBody(request)) as { path?: unknown }
          if (typeof body.path !== 'string' || body.path.trim() === '') {
            response.writeHead(400, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ error: '目录路径无效。' }))
            return
          }
          const authorizedPath = authorizedExplorerWorkspacePath(body.path, host.workspaceRegistry.list().map(workspace => workspace.path))
          if (authorizedPath === undefined) {
            response.writeHead(403, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ error: '仅允许打开已注册的工作区目录。' }))
            return
          }
          await foregroundExplorer.open(authorizedPath)
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ opened: true, foreground: true }))
        } catch (error) {
          ctx.logger.warn('foreground explorer open failed: %s', error)
          response.writeHead(error instanceof SyntaxError ? 400 : 503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ error: error instanceof SyntaxError ? '目录路径格式无效。' : '无法在前台打开资源管理器。' }))
        }
      },
    })
    return () => {
      disposeDependencyInstaller()
      foregroundExplorer.dispose()
      disposeConnectors()
      disposeDependencies()
      disposeExplorer()
      disposePreferences()
      disposeSessionMove()
    }
  }, 'michengai-codex-ui: catalogs')
}
