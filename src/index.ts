/** 浏览器客户端插件的 Host 入口；客户端逻辑由 dsh.client 加载。 */
import type { Context } from '@deepseek-ai/cordis'
import { hostServices } from './host-services.ts'
import { skillGroupOf } from './skills.ts'

const skillsEndpoint = '/api/michengai/codex-ui/skills'
const connectorsEndpoint = '/api/michengai/codex-ui/connectors'

export const inject = ['webServer', 'skills', 'sessions', 'agents', 'tools']

/** 提供只读技能目录；来源仅输出为分组，不向浏览器泄露本地路径。 */
export function apply(ctx: Context): void {
  const host = hostServices(ctx)
  ctx.effect(() => {
    const disposeSkills = host.webServer.register({
    kind: 'exact',
    path: skillsEndpoint,
    handler: async (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405)
        response.end()
        return
      }
      try {
        const sessionId = new URL(request.url ?? '/', 'http://localhost').searchParams.get('sessionId')
        const cwd = sessionId === null ? undefined : host.sessions.get(sessionId)?.header.cwd
        const scope = sessionId === null ? undefined : host.agents.get(sessionId)
        const skills = await host.skills.list({
          ...(cwd === undefined ? {} : { cwd }),
          ...(scope === undefined ? {} : { scope }),
        })
        const payload = skills.filter(skill => skill.invocation.userInvocable).map(skill => ({
          name: skill.name,
          description: skill.description,
          ...(skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse }),
          modelInvocable: skill.invocation.modelInvocable,
          group: skillGroupOf(skill.source),
        }))
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ skills: payload }))
      } catch {
        response.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        response.end(JSON.stringify({ error: '技能目录暂不可用。' }))
      }
    },
    })
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
    return () => { disposeSkills(); disposeConnectors() }
  }, 'michengai-codex-ui: catalogs')
}
