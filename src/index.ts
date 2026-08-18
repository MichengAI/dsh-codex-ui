/** 浏览器客户端插件的 Host 入口；客户端逻辑由 dsh.client 加载。 */
import type { Context } from '@deepseek-ai/cordis'
import { dependencyStatuses, installDependency } from './dependency-manager.ts'
import { hostServices } from './host-services.ts'

const connectorsEndpoint = '/api/michengai/codex-ui/connectors'
const dependenciesEndpoint = '/api/michengai/codex-ui/dependencies'

type HostRequest = { method?: string; url?: string; headers?: Record<string, string | string[] | undefined> }

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
  return origin !== new URL(request.url ?? '/', `http://${host ?? 'localhost'}`).origin
}

export const inject = ['webServer', 'sessions', 'agents', 'tools']

/** 提供不泄露地址、命令和凭证的连接器目录。 */
export function apply(ctx: Context): void {
  const host = hostServices(ctx)
  ctx.effect(() => {
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
            const dependencies = await dependencyStatuses()
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
            const dependencies = await installDependency(url.searchParams.get('dependency'))
            response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            response.end(JSON.stringify({ dependencies, restartRequired: true }))
            return
          }
          response.writeHead(405)
          response.end()
        } catch (error) {
          // 详情只进服务端日志：readFile 等错误带 profile 绝对路径，不得原样回传浏览器
          ctx.logger.warn('dependencies endpoint failed: %s', error)
          response.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ error: '依赖管理暂不可用，请查看服务端日志。' }))
        }
      },
    })
    return () => {
      disposeConnectors()
      disposeDependencies()
    }
  }, 'michengai-codex-ui: catalogs')
}
