/** 浏览器客户端插件的 Host 入口；客户端逻辑由 dsh.client 加载。 */
import type { Context } from '@deepseek-ai/cordis'
import { dependencyStatuses, disposeDependencyInstaller, installDependency, installProgressSnapshot, requestDesktopHotUpdate, resolveDependencyRuntime, runtimeSupportsOfficialTurnNavigator, updateAllDependencies } from './dependency-manager.ts'
import { authorizedExplorerWorkspacePath } from './explorer-path-policy.ts'
import { hostServices } from './host-services.ts'
import { ForegroundExplorer } from './native-explorer.ts'
import { moveSessionToWorkspace, SessionMoveError } from './session-migration.ts'
import { parsePinnedWorkspaceIds, parseWorkspaceGroups, readWorkspacePreferences, WORKSPACE_PREFERENCES_VERSION, writeWorkspacePreferences } from './workspace-preferences.ts'

const connectorsEndpoint = '/api/michengai/codex-ui/connectors'
const dependenciesEndpoint = '/api/michengai/codex-ui/dependencies'
const explorerEndpoint = '/api/michengai/codex-ui/open-in-explorer'
const preferencesEndpoint = '/api/michengai/codex-ui/preferences'
const sessionMoveEndpoint = '/api/michengai/codex-ui/session-move'
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

/**
 * 判断浏览器请求是否跨站。依赖安装会改写用户配置并拉起子进程，
 * 恶意网页只需一个表单就能跨站触发，必须先按 Sec-Fetch-Site（优先，
 * 且无法被页面伪造）再按 Origin 与 Host 的比对阻断；无这些头的
 * 非浏览器客户端（curl、CLI）仍然放行。
 */
export function crossSiteRequest(request: HostRequest): boolean {
  const headers = request.headers
  if (headers === undefined) return false
  const site = headerValue(headers, 'sec-fetch-site')
  if (site === 'same-origin' || site === 'none') return false
  if (site !== undefined) return true
  const origin = headerValue(headers, 'origin')
  if (origin === undefined) return false
  const host = headerValue(headers, 'host')
  if (host === undefined) return true
  try {
    return new URL(origin).host !== host
  } catch {
    return true
  }
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

/** 提供不泄露地址、命令和凭证的连接器目录。 */
export function apply(ctx: Context): void {
  const host = hostServices(ctx)
  ctx.effect(() => {
    const foregroundExplorer = new ForegroundExplorer()
    void foregroundExplorer.warmup().catch(error => ctx.logger.warn('foreground explorer warmup failed: %s', error))
    const disposeConnectors = host.webServer.register({
      kind: 'exact',
      path: connectorsEndpoint,
      handler: async (request, response) => {
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
            if (crossSiteRequest(request)) {
              response.writeHead(403, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
              response.end(JSON.stringify({ error: '已拒绝跨站请求。' }))
              return
            }
            if (url.searchParams.get('action') === 'update-all') {
              const autoReload = typeof process.send === 'function'
              let restartAfterResponse = false
              const { dependencies, updatedCount } = await updateAllDependencies(() => {
                restartAfterResponse = autoReload
                return restartAfterResponse
              }, resolveDependencyRuntime(ctx))
              response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
              response.end(JSON.stringify({ dependencies, restartRequired: updatedCount > 0, autoReload: typeof process.send === 'function' }))
              if (restartAfterResponse) setTimeout(() => { requestDesktopHotUpdate() }, 150).unref?.()
              return
            }
            const autoReload = typeof process.send === 'function'
            let restartAfterResponse = false
            const dependencies = await installDependency(url.searchParams.get('dependency'), () => {
              restartAfterResponse = autoReload
              return restartAfterResponse
            }, resolveDependencyRuntime(ctx))
            response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ dependencies, restartRequired: true, autoReload: typeof process.send === 'function' }))
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
        try {
          if (request.method === 'GET' || request.method === 'HEAD') {
            const preferences = await readWorkspacePreferences()
            response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(request.method === 'HEAD' ? undefined : JSON.stringify(preferences))
            return
          }
          if (request.method === 'PUT') {
            if (crossSiteRequest(request)) {
              response.writeHead(403, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
              response.end(JSON.stringify({ error: '已拒绝跨站请求。' }))
              return
            }
            const body = JSON.parse(await readRequestBody(request)) as unknown
            const record = body !== null && typeof body === 'object' ? body as Record<string, unknown> : undefined
            const pinnedWorkspaceIds = record === undefined ? undefined : parsePinnedWorkspaceIds(record.pinnedWorkspaceIds)
            const existing = await readWorkspacePreferences()
            const workspaceGroups = record === undefined
              ? undefined
              : 'workspaceGroups' in record
                ? parseWorkspaceGroups(record.workspaceGroups)
                : existing.workspaceGroups
            if (pinnedWorkspaceIds === undefined || workspaceGroups === undefined) {
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
        if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }); response.end(); return }
        if (crossSiteRequest(request)) {
          response.writeHead(403, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ ok: false, code: 'session-move/cross-site', error: '已拒绝跨站请求。' }))
          return
        }
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
        if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }); response.end(); return }
        if (crossSiteRequest(request)) {
          response.writeHead(403, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ error: '已拒绝跨站请求。' }))
          return
        }
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
