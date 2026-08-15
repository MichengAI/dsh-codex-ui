import type { Context } from '@deepseek-ai/cordis'

type HostSkill = {
  name: string
  description: string
  whenToUse?: string
  source: string
  invocation: { modelInvocable: boolean; userInvocable: boolean }
}

type HostTool = { name: string; description?: string }

type HttpRequest = { method?: string; url?: string }
type HttpResponse = {
  writeHead: (status: number, headers?: Record<string, string>) => void
  end: (body?: string) => void
}

type HostServices = {
  webServer: { register: (route: { kind: 'exact'; path: string; handler: (request: HttpRequest, response: HttpResponse) => Promise<void> }) => () => void }
  skills: { list: (options?: { cwd?: string; scope?: unknown }) => Promise<readonly HostSkill[]> }
  sessions: { get: (sessionId: string) => { header: { cwd?: string } } | undefined }
  agents: { get: (sessionId: string) => unknown }
  tools: { schemas: (scope?: unknown) => readonly HostTool[] }
}

function requireService<T extends object>(ctx: Context, key: string, method: keyof T): T {
  const service = ctx.get(key) as unknown
  if (service === null || typeof service !== 'object' || typeof (service as Record<string, unknown>)[method as string] !== 'function') {
    throw new Error(`michengai-codex-ui 需要宿主服务 “${key}.${String(method)}”`)
  }
  return service as T
}

/** 在唯一的宿主边界校验服务能力；宿主 API 变更时立即失败，不会静默返回 503。 */
export function hostServices(ctx: Context): HostServices {
  return {
    webServer: requireService<HostServices['webServer']>(ctx, 'webServer', 'register'),
    skills: requireService<HostServices['skills']>(ctx, 'skills', 'list'),
    sessions: requireService<HostServices['sessions']>(ctx, 'sessions', 'get'),
    agents: requireService<HostServices['agents']>(ctx, 'agents', 'get'),
    tools: requireService<HostServices['tools']>(ctx, 'tools', 'schemas'),
  }
}

export type { HostSkill }
