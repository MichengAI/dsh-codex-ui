import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import { isSubPluginDisabledOnDisk as checkDisabledOnDisk } from './profile-resolver.ts'
import {
  PredictionCache,
  buildPredictionPrompt,
  cleanPredictionCandidate,
  formatContinuation,
  type PredictionMessage,
} from './composer-prediction.ts'

export const name = 'codex-ui-composer'
export const inject = ['webServer', 'connection', 'llm', 'sessions']

export function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean {
  return checkDisabledOnDisk(id, homeDir, ctx)
}

type HttpRequest = {
  method?: string
  url?: string
  headers?: Record<string, string | string[] | undefined>
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>
}

type HttpResponse = {
  writeHead(status: number, headers?: Record<string, string>): void
  end(body?: string): void
}

async function readJsonBody(request: HttpRequest, maxBytes = 64 * 1024): Promise<Record<string, unknown> | null> {
  if (request[Symbol.asyncIterator] === undefined) return null
  const chunks: Buffer[] = []
  let length = 0
  for await (const chunk of request as AsyncIterable<Uint8Array | string>) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    length += buffer.length
    if (length > maxBytes) return null
    chunks.push(buffer)
  }
  try {
    const raw = Buffer.concat(chunks).toString('utf8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

/** 全局单例预测缓存 */
const predictionCache = new PredictionCache(120, 60_000)

/**
 * Composer 输入框增强子组件 (Host 侧)
 * 1. 暴露 /api/michengai/dsh-codex-ui/composer (启停状态)
 * 2. 暴露 /api/michengai/dsh-codex-ui/composer/prediction (输入预测与续写)
 */
export function apply(ctx: Context): void {
  const statusEndpoint = CODEX_UI_API_ENDPOINTS.composer
  const predictionEndpoint = CODEX_UI_API_ENDPOINTS.composerPrediction

  ctx.effect(() => {
    const webServer = ctx.get('webServer') as {
      register: (options: {
        kind: 'exact'
        path: string
        handler: (req: HttpRequest, res: HttpResponse) => void | Promise<void>
      }) => (() => void) | undefined
    } | undefined

    if (!webServer || typeof webServer.register !== 'function') return () => {}

    // 1. 状态端点
    const disposeStatus = webServer.register({
      kind: 'exact',
      path: statusEndpoint,
      handler: (_request, response) => {
        const disabled = isSubPluginDisabledOnDisk('codex-ui-composer', undefined, ctx)
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        })
        response.end(JSON.stringify({ enabled: !disabled }))
      },
    })

    // 2. 预测端点
    const disposePrediction = webServer.register({
      kind: 'exact',
      path: predictionEndpoint,
      handler: async (request, response) => {
        const disabled = isSubPluginDisabledOnDisk('codex-ui-composer', undefined, ctx)
        if (disabled) {
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ candidates: [], reason: 'disabled' }))
          return
        }

        // 安全与登录检查
        const connection = ctx.get('connection') as {
          requestRejection?: (req: { headers?: HttpRequest['headers'] }) => 401 | 403 | undefined
        } | undefined
        const rejection = connection?.requestRejection?.(request)
        if (rejection !== undefined) {
          response.writeHead(rejection, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ error: rejection === 401 ? 'Unauthorized' : 'Forbidden' }))
          return
        }

        if (request.method !== 'POST') {
          response.writeHead(405, { 'content-type': 'application/json; charset=utf-8' })
          response.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        const body = await readJsonBody(request)
        if (!body || typeof body !== 'object') {
          response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
          response.end(JSON.stringify({ error: 'Invalid Body' }))
          return
        }

        const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
        const mode = body.mode === 'continue' ? 'continue' : 'next'
        const draft = typeof body.draft === 'string' ? body.draft : ''

        if (!sessionId) {
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
          response.end(JSON.stringify({ candidates: [] }))
          return
        }

        // 尝试从 sessions 中提取会话消息与 revision
        let revision = 0
        const messages: PredictionMessage[] = []
        try {
          const sessions = ctx.get('sessions') as {
            binding?: (id: string) => {
              eventSource?: { getSnapshot: () => { revision: number } }
              session?: { transcript?: Array<{ role: string; content: unknown }> }
            }
            deriveMessages?: (session: unknown) => Array<{ role: string; content: unknown }>
          } | undefined

          const binding = sessions?.binding?.(sessionId)
          revision = binding?.eventSource?.getSnapshot?.()?.revision ?? 0

          if (binding?.session) {
            const derived = typeof sessions?.deriveMessages === 'function'
              ? sessions.deriveMessages(binding.session)
              : (binding.session.transcript ?? [])
            for (const item of derived) {
              if (item && (item.role === 'user' || item.role === 'assistant')) {
                messages.push({
                  role: item.role,
                  content: item.content as PredictionMessage['content'],
                })
              }
            }
          }
        } catch {
          // 容错降级
        }

        // 检查缓存
        const cached = predictionCache.get(sessionId, revision, mode, draft)
        if (cached !== undefined) {
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ candidates: cached, cached: true }))
          return
        }

        // 如果没有上下文消息且是 next 模式，不返回虚假预测
        if (messages.length === 0 && mode === 'next') {
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ candidates: [] }))
          return
        }

        // 调用大模型
        try {
          const llm = ctx.get('llm') as {
            chat?: (params: {
              system?: string
              messages: Array<{ role: string; content: string }>
              maxTokens?: number
              reasoningEffort?: string
            }) => Promise<{ text?: string; content?: string }>
          } | undefined

          if (!llm || typeof llm.chat !== 'function') {
            response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
            response.end(JSON.stringify({ candidates: [], reason: 'no-llm' }))
            return
          }

          const prompt = buildPredictionPrompt({
            mode,
            messages,
            draft,
            maxSuggestions: 3,
          })

          const llmRes = await Promise.race([
            llm.chat({
              system: prompt.system,
              messages: [{ role: 'user', content: prompt.user }],
              maxTokens: 120,
              reasoningEffort: 'off',
            }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
          ])

          const rawText = llmRes?.text ?? (typeof llmRes?.content === 'string' ? llmRes.content : '')
          const lines = rawText.split(/\r?\n/u)
          const candidates: string[] = []

          for (const line of lines) {
            const cleaned = cleanPredictionCandidate(line)
            if (!cleaned) continue
            const finalCandidate = mode === 'continue' ? formatContinuation(draft, cleaned) : cleaned
            if (finalCandidate && !candidates.includes(finalCandidate)) {
              candidates.push(finalCandidate)
            }
            if (candidates.length >= 3) break
          }

          predictionCache.set(sessionId, revision, mode, draft, candidates)

          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          response.end(JSON.stringify({ candidates }))
        } catch {
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
          response.end(JSON.stringify({ candidates: [], reason: 'llm-error' }))
        }
      },
    })

    return () => {
      disposeStatus?.()
      disposePrediction?.()
    }
  }, 'michengai-codex-ui: composer state & prediction')
}
