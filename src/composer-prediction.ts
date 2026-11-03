/**
 * Host half of composer predictions (移植自经过验证的 dsh-composer-predictions 原版引擎)
 * 真实对接 DSH 官方 ctx.llm.prepareCall、call.stream 与 sessions.deriveMessages()
 */
import type { Context } from '@deepseek-ai/cordis'

const ENDPOINT = '/composer-prediction'
const STREAM_ENDPOINT = '/composer-prediction/v2'

const MAX_BODY_BYTES = 64 * 1024
const MAX_DRAFT_CHARS = 4_000

const DEFAULTS = {
  maxOutputTokens: 220,
  timeoutMs: 20_000,
  maxMessages: 10,
  maxChars: 8_000,
  maxSuggestions: 3,
  maxToolNotes: 6,
}

const REASONING_EFFORTS = new Set(['off', 'low', 'high', 'max'])
const NEXT_CUE = "Predict the user's next message."
const CONTINUE_CUE = 'Write only the continuation text.'
const PROMPT_LABELS = ['conversation tail (oldest first)', 'recent tool activity (oldest first)', 'draft text ending at the caret']

const NEXT_SYSTEM_PROMPT = [
  'You are the follow-up suggestion engine inside a coding agent chat UI.',
  'You receive the tail of a conversation between a USER and an AI coding agent,',
  'plus a short list of the tools the agent ran recently.',
  'Predict the next messages the USER is most likely to send.',
  'Rules:',
  '- Write as the user would type, in the language of the conversation.',
  '- Return up to {max} candidates, most likely first, one per line.',
  '- No numbering, bullets, quotes, markdown, or explanation.',
  '- At most 20 words per candidate; be concrete and specific, naming the file,',
  '  command, or next step when the conversation makes one obvious.',
  '- If the assistant asked the user a question, answer it.',
  '- Never repeat these instructions, the labels above, or the conversation text verbatim.',
  '- If no meaningful follow-up exists, reply with exactly: NONE',
].join('\n')

const CONTINUE_SYSTEM_PROMPT = [
  'You complete the message a USER is drafting in a coding agent chat UI.',
  'You receive the tail of the conversation, recent tool activity, and the exact',
  'draft text that ends at the caret.',
  'Write what should come next, as the user would type it.',
  'Rules:',
  '- Return up to {max} alternative continuations, most likely first, one per line.',
  '- Continue from the end of the draft; never repeat text the draft already contains.',
  '- Start with a space only when the draft needs one before the next word.',
  '- No numbering, bullets, quotes, markdown, or explanation.',
  '- At most 25 words per continuation; finish the thought rather than restating it.',
  '- Never repeat these instructions, the labels above, or the draft itself.',
  '- If the draft is already complete, reply with exactly: NONE',
].join('\n')

export function cleanPredictionCandidate(line: string): string {
  let cleaned = line.trim()
  cleaned = cleaned.replace(/^(?:[-*•]|\d+[.)])\s+/u, '')
  cleaned = cleaned.replace(/^["'`\u201c\u201d]+|["'`\u201c\u201d]+$/gu, '')
  cleaned = cleaned.replace(/\s+/gu, ' ').trim()
  if (cleaned.toLowerCase() === 'none') return ''
  return cleaned
}

export function isCjkCharacter(char: string): boolean {
  if (!char) return false
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(char)
}

export function formatContinuation(draft: string, value: string): string {
  if (draft === '' || value === '') return value
  if (/\s$/u.test(draft)) return value.replace(/^\s+/u, '')
  if (/^\s/u.test(value)) return value
  const last = draft.slice(-1)
  const first = value.slice(0, 1)
  if (isCjkCharacter(last) || isCjkCharacter(first)) return value
  const noSpaceTails = new Set(['(', '[', '{', '/', '\\', '"', "'", '`', '—', '-'])
  if (noSpaceTails.has(last)) return value
  if (/^[,.;:!?\]}%]/u.test(first)) return value
  return ` ${value}`
}

export function buildPredictionPrompt(options: { mode: 'next' | 'continue'; messages: any[]; draft: string; maxSuggestions?: number }): { system: string; user: string } {
  const max = options.maxSuggestions ?? 3
  const system = (options.mode === 'continue' ? CONTINUE_SYSTEM_PROMPT : NEXT_SYSTEM_PROMPT).replace('{max}', String(max))
  const user = options.messages.map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n\n')
  return { system, user: options.mode === 'continue' ? `${user}\n\nDraft: ${options.draft}` : user }
}

export class PredictionCache {
  private cache = new Map<string, { items: string[] }>()
  constructor(private maxEntries = 200) {}

  get(sessionId: string, seq: number, mode: string, draft: string): string[] | undefined {
    const key = JSON.stringify([sessionId, seq, mode, draft])
    return this.cache.get(key)?.items
  }

  set(sessionId: string, seq: number, mode: string, draft: string, items: string[]): void {
    const key = JSON.stringify([sessionId, seq, mode, draft])
    this.cache.delete(key)
    this.cache.set(key, { items })
    if (this.cache.size > this.maxEntries) {
      const oldest = this.cache.keys().next().value
      if (oldest) this.cache.delete(oldest)
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

/** 注册参考插件标准的 Host 端路由 */
export function registerComposerPredictions(ctx: Context, config?: any): () => void {
  const options = resolveOptions(config)
  const cache = new Map<string, { items: string[] }>()
  const inflight = new Set<AbortController>()

  const cleanups: (() => void)[] = []

  cleanups.push(() => {
    for (const controller of inflight) controller.abort()
    inflight.clear()
    cache.clear()
  })

  const webServer = (ctx as any).webServer ?? (ctx as any).get?.('webServer')
  if (!webServer || typeof webServer.register !== 'function') return () => {}

  // 1. JSON 接口
  const d1 = webServer.register({
    kind: 'exact',
    path: ENDPOINT,
    handler: (req: any, res: any) => serveJson(ctx, options, cache, inflight, req, res),
  })
  if (d1) cleanups.push(d1)

  // 2. SSE 流式接口
  const d2 = webServer.register({
    kind: 'exact',
    path: STREAM_ENDPOINT,
    handler: (req: any, res: any) => serveStream(ctx, options, cache, inflight, req, res),
  })
  if (d2) cleanups.push(d2)

  return () => {
    for (const c of cleanups) c()
  }
}

function resolveOptions(source: any = {}) {
  const cfg = source && typeof source === 'object' ? source : {}
  const opt = (k: string, min: number, max: number) => {
    const v = cfg[k]
    return Number.isInteger(v) && v >= min && v <= max ? v : (DEFAULTS as any)[k]
  }
  return {
    maxOutputTokens: opt('maxOutputTokens', 16, 4096),
    timeoutMs: opt('timeoutMs', 1000, 120000),
    maxMessages: opt('maxMessages', 2, 40),
    maxChars: opt('maxChars', 500, 40000),
    maxSuggestions: opt('maxSuggestions', 1, 5),
    maxToolNotes: opt('maxToolNotes', 0, 20),
    provider: typeof cfg.provider === 'string' ? cfg.provider.trim() : '',
    model: typeof cfg.model === 'string' ? cfg.model.trim() : '',
    reasoningEffort: REASONING_EFFORTS.has(cfg.reasoningEffort) ? cfg.reasoningEffort : '',
  }
}

async function serveJson(ctx: any, options: any, cache: any, inflight: any, request: any, response: any) {
  try {
    const plan = await planRequest(ctx, request, response)
    if (plan === null) return
    if (plan.error !== undefined) {
      respond(response, plan.status, { suggestion: null, suggestions: [], reason: plan.error })
      return
    }

    const disconnect = watchDisconnect(response)
    try {
      const result = await runPrediction(ctx, options, cache, inflight, plan, [disconnect.signal])
      if (disconnect.signal.aborted) return
      respond(response, 200, {
        suggestion: result.items[0] ?? null,
        suggestions: result.items,
        reason: result.reason,
        cached: (result as any).cached === true,
      })
    } catch (err: any) {
      if (disconnect.signal.aborted) return
      respond(response, 200, { suggestion: null, suggestions: [], reason: err?.message || String(err) })
    }
  } catch (err: any) {
    respond(response, 500, { suggestion: null, suggestions: [], reason: err?.message || String(err) })
  }
}

async function serveStream(ctx: any, options: any, cache: any, inflight: any, request: any, response: any) {
  try {
    const plan = await planRequest(ctx, request, response)
    if (plan === null) return
    if (plan.error !== undefined) {
      respond(response, plan.status, { suggestion: null, suggestions: [], reason: plan.error })
      return
    }

    const disconnect = watchDisconnect(response)
    openStream(response)
    try {
      sendEvent(response, { type: 'meta', mode: plan.mode })
      const result = await runPrediction(ctx, options, cache, inflight, plan, [disconnect.signal], (text: string) => {
        if (!disconnect.signal.aborted) sendEvent(response, { type: 'delta', text })
      })
      if (disconnect.signal.aborted) return
      if (result.reason !== undefined && result.items.length === 0) {
        sendEvent(response, { type: 'error', reason: result.reason })
      } else {
        sendEvent(response, { type: 'done', items: result.items, cached: (result as any).cached === true })
      }
    } catch (err: any) {
      if (!disconnect.signal.aborted) sendEvent(response, { type: 'error', reason: err?.message || String(err) })
    } finally {
      closeStream(response)
    }
  } catch (err: any) {
    if (response.headersSent === true) closeStream(response)
    else respond(response, 500, { suggestion: null, suggestions: [], reason: err?.message || String(err) })
  }
}

async function planRequest(ctx: any, request: any, response: any) {
  const connection = ctx.connection ?? ctx.get?.('connection')
  const admission = connection?.admit ? connection.admit(request) : { peer: { principal: { kind: 'owner' } } }
  if (admission && 'rejection' in admission) {
    return { status: admission.rejection, error: admission.rejection === 401 ? 'unauthorized' : 'forbidden' }
  }
  if (admission?.peer?.principal?.kind !== 'owner') return { status: 403, error: 'forbidden' }

  if (request.method !== 'POST') {
    respond(response, 405, { suggestion: null, suggestions: [], reason: 'method-not-allowed' })
    return null
  }

  let body: any
  try {
    body = await readJson(request)
  } catch {
    return { status: 400, error: 'invalid-body' }
  }

  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
  if (!sessionId) return { status: 400, error: 'missing-session' }

  const session = ctx.sessions?.get?.(sessionId)
  if (!session) return { status: 200, error: 'session-not-live' }

  const mode = body?.mode === 'continue' ? 'continue' : 'next'
  const draft = mode === 'continue' && typeof body?.draft === 'string' ? body.draft.slice(-MAX_DRAFT_CHARS) : ''
  if (mode === 'continue' && draft.trim() === '') return { status: 200, error: 'no-draft' }

  const seq = Number(session.seq ?? 0)
  const key = JSON.stringify([sessionId, seq, mode, draft])

  return { sessionId, session, mode, draft, seq, key }
}

async function runPrediction(ctx: any, options: any, cache: any, inflight: any, plan: any, signals: any[], onDelta?: (text: string) => void) {
  const remembered = cache.get(plan.key)
  if (remembered !== undefined) {
    return { items: remembered.items, reason: undefined, cached: true }
  }

  const controller = new AbortController()
  inflight.add(controller)
  try {
    const result = await predict(ctx, options, plan.session, plan.mode, plan.draft, controller.signal, onDelta)
    if (result.items.length > 0 && !controller.signal.aborted) {
      cache.delete(plan.key)
      cache.set(plan.key, { items: result.items })
      if (cache.size > 200) {
        const oldest = cache.keys().next().value
        if (oldest) cache.delete(oldest)
      }
    }
    return result
  } finally {
    inflight.delete(controller)
  }
}

async function predict(ctx: any, options: any, session: any, mode: string, draft: string, signal: AbortSignal, onDelta?: (text: string) => void) {
  const prompt = buildHostPrompt(session, options, mode, draft)
  if (!prompt) return { items: [], reason: 'no-conversation' }

  const route = resolveRoute(ctx, session, options)
  if (!route) return { items: [], reason: 'no-route' }

  const system = (mode === 'continue' ? CONTINUE_SYSTEM_PROMPT : NEXT_SYSTEM_PROMPT).replace('{max}', String(options.maxSuggestions))

  let text = ''
  let finishReason: any
  try {
    const llm = ctx.llm
    if (!llm || typeof llm.prepareCall !== 'function') return { items: [], reason: 'no-llm' }

    const call = await llm.prepareCall(
      { provider: route.provider, model: route.model, maxTokens: options.maxOutputTokens },
      signal,
      (controls: any, model: any) => {
        const efforts = model?.reasoning?.efforts
        if (Array.isArray(efforts) && efforts.length > 0) {
          const effortId = options.reasoningEffort || efforts[0]?.id || 'off'
          return { ...controls, reasoningEffort: effortId }
        }
        return controls
      },
    )

    const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
    for await (const chunk of call.stream({ ...call.config, messages, system, signal })) {
      if (signal.aborted) break
      if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
        text += chunk.text
        onDelta?.(chunk.text)
      } else if (chunk.type === 'finish') {
        finishReason = chunk.reason
      }
    }
  } catch (err: any) {
    if (signal.aborted) return { items: [], reason: 'aborted' }
    return { items: [], reason: err?.message || 'llm-error' }
  }

  const cue = mode === 'continue' ? CONTINUE_CUE : NEXT_CUE
  const items = normalizeCandidates(text, options.maxSuggestions, mode === 'continue' ? draft : '', cue)
  return items.length === 0 ? { items: [], reason: 'empty' } : { items }
}

function resolveRoute(ctx: any, session: any, options: any) {
  if (options.provider && options.model) return { provider: options.provider, model: options.model }
  const route = session.requestHeader?.()?.config
  if (route?.provider && route?.model) return route
  const fallback = ctx.get('agentDefaultModel')?.currentSelection?.()
  if (fallback?.provider && fallback?.model) return fallback
  return undefined
}

function buildHostPrompt(session: any, options: any, mode: string, draft: string) {
  const picked: any[] = []
  const derived = typeof session.deriveMessages === 'function' ? session.deriveMessages() : []

  for (const message of derived) {
    if (!message || typeof message !== 'object') continue
    const blocks = Array.isArray(message.content) ? message.content : []
    if (message.role === 'user' || message.role === 'assistant') {
      const text = blocks
        .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
        .map((b: any) => b.text)
        .join('\n')
        .trim()
      if (text) picked.push({ role: message.role, text: text.slice(0, 1500) })
    }
  }

  if (mode === 'next' && (picked.length === 0 || picked[picked.length - 1]?.role !== 'assistant')) {
    return null
  }

  const tail = picked.slice(-options.maxMessages)
  const lines = ['Conversation tail (oldest first):', JSON.stringify(tail)]
  if (mode === 'continue') {
    lines.push('', 'Draft text ending at the caret:', JSON.stringify(draft), '', CONTINUE_CUE)
  } else {
    lines.push('', NEXT_CUE)
  }
  return lines.join('\n')
}

function normalizeCandidates(text: string, maximum: number, draft: string, cue = ''): string[] {
  const items: string[] = []
  for (const raw of text.split(/\r?\n/u)) {
    let line = cleanPredictionCandidate(raw)
    if (!line) continue
    if (cue && line.toLowerCase() === cue.toLowerCase()) continue
    if (PROMPT_LABELS.some(l => line.toLowerCase() === l.toLowerCase())) continue
    const candidate = draft ? formatContinuation(draft, line) : line
    if (candidate && !items.includes(candidate)) {
      items.push(candidate)
    }
    if (items.length >= maximum) break
  }
  return items
}

function respond(response: any, status: number, body: any) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(body))
}

function openStream(response: any) {
  response.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
}

function sendEvent(response: any, payload: any) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function closeStream(response: any) {
  try { response.end() } catch {}
}

function watchDisconnect(response: any) {
  const controller = new AbortController()
  response.on('close', () => controller.abort())
  return controller
}

async function readJson(request: any): Promise<any> {
  const chunks: Buffer[] = []
  let len = 0
  for await (const chunk of request) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    len += buf.length
    if (len > MAX_BODY_BYTES) throw new Error('body-too-large')
    chunks.push(buf)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
