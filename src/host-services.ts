import type { Context } from '@deepseek-ai/cordis'

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

export type ConnectionServiceLike = {
  requestRejection?: (request: { headers?: HttpRequest['headers'] }) => 401 | 403 | undefined
  admit?: (request: { headers?: HttpRequest['headers'] }) => { rejection?: 401 | 403 | 503; peer?: unknown } | undefined
}

/** 新宿主的 admit 会访问关联认证服务；仅此子作用域依赖它，旧宿主不受启动门控。 */
export function captureScopedConnection(ctx: Context): () => ConnectionServiceLike | undefined {
  let connection: ConnectionServiceLike | undefined
  ctx.inject?.(['connection', 'connection.authentication'], (authCtx) => {
    authCtx.effect(() => {
      connection = authCtx.get('connection') as ConnectionServiceLike | undefined
      return () => { connection = undefined }
    })
  })
  return () => connection
}

type HostServices = {
  webServer: { register: (route: { kind: 'exact'; path: string; auth?: 'anonymous' | 'required' | 'deny'; handler: (request: HttpRequest, response: HttpResponse, peer?: unknown) => Promise<void> }) => () => void }
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
  }
}
