import type { Context } from '@deepseek-ai/cordis'

type HostTool = { name: string; description?: string }

type HttpRequest = {
  method?: string
  url?: string
  /** Node 原生请求头（小写键名），用于跨站请求判定。 */
  headers?: Record<string, string | string[] | undefined>
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>
}
type HttpResponse = {
  writeHead: (status: number, headers?: Record<string, string>) => void
  end: (body?: string) => void
}

type HostServices = {
  webServer: { register: (route: { kind: 'exact'; path: string; handler: (request: HttpRequest, response: HttpResponse) => Promise<void> }) => () => void }
  agents: { get: (sessionId: string) => unknown }
  tools: { schemas: (scope?: unknown) => readonly HostTool[] }
  workspaceRegistry: { list: () => readonly { path: string }[] }
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
    agents: requireService<HostServices['agents']>(ctx, 'agents', 'get'),
    tools: requireService<HostServices['tools']>(ctx, 'tools', 'schemas'),
    workspaceRegistry: requireService<HostServices['workspaceRegistry']>(ctx, 'workspaceRegistry', 'list'),
  }
}
