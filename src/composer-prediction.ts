/**
 * Host half of composer predictions (1:1 完整无损移植自 dsh-composer-predictions 1.2.8 原版源码)
 * 包含完整的 27 个处理函数、SSE 流式引擎、超时双重信号控制器与边界防护
 */
import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'

export const name = 'composer-predictions'

export const inject = ['webServer']

/** 使用自研专属命名空间端点，杜绝与社区插件全局路径冲突 */
const ENDPOINT = CODEX_UI_API_ENDPOINTS.composerPrediction
const STREAM_ENDPOINT = CODEX_UI_API_ENDPOINTS.composerPredictionStream

/** One request carries a session id, a mode, and a bounded draft. */
const MAX_BODY_BYTES = 64 * 1024

/** Upper bound for the draft the Client may send for continuation mode. */
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

/** Closing task line of each prompt; the model sometimes echoes it. */
const NEXT_CUE = "Predict the user's next message."
const CONTINUE_CUE = 'Write only the continuation text.'

/** Prompt labels that must never surface as suggestions. */
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

/**
 * Register both prediction endpoints.
 * @param ctx - context exposing llm, sessions, and the web server.
 * @param config - optional route, token, transcript, and candidate bounds.
 */
export function apply(ctx: Context, config?: any): void {
  const options = resolveOptions(config)
  const cache = new Map<string, any>()
  const inflight = new Set<AbortController>()

  const getWebServer = () => (ctx as any).webServer ?? (ctx as any).get?.('webServer')

  ctx.effect(() => () => {
    for (const controller of inflight) controller.abort()
    inflight.clear()
    cache.clear()
  })

  ctx.effect(() => {
    const ws = getWebServer()
    if (!ws || typeof ws.register !== 'function') return () => {}
    return ws.register({
      kind: 'exact',
      path: ENDPOINT,
      handler: (request: any, response: any) => serveJson(ctx, options, cache, inflight, request, response),
    })
  })

  ctx.effect(() => {
    const ws = getWebServer()
    if (!ws || typeof ws.register !== 'function') return () => {}
    return ws.register({
      kind: 'exact',
      path: STREAM_ENDPOINT,
      handler: (request: any, response: any) => serveStream(ctx, options, cache, inflight, request, response),
    })
  })
}

function resolveOptions(config: any) {
  const source = config !== null && typeof config === 'object' ? config : {}
  const option = (key: string, minimum: number, maximum: number) => {
    const value = source[key]
    return Number.isInteger(value) && value >= minimum && value <= maximum ? value : (DEFAULTS as any)[key]
  }
  const provider = textOption(source.provider, 200)
  const model = textOption(source.model, 200)
  return {
    maxOutputTokens: option('maxOutputTokens', 16, 4_096),
    timeoutMs: option('timeoutMs', 1_000, 120_000),
    maxMessages: option('maxMessages', 2, 40),
    maxChars: option('maxChars', 500, 40_000),
    maxSuggestions: option('maxSuggestions', 1, 5),
    maxToolNotes: option('maxToolNotes', 0, 20),
    // A route override is a pair; half a pair is ignored and the Session route wins.
    provider: provider !== '' && model !== '' ? provider : '',
    model: provider !== '' && model !== '' ? model : '',
    reasoningEffort:
      typeof source.reasoningEffort === 'string' && REASONING_EFFORTS.has(source.reasoningEffort)
        ? source.reasoningEffort
        : '',
  }
}

function textOption(value: any, maximum: number) {
  return typeof value === 'string' && value.length <= maximum ? value.trim() : ''
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
        candidates: result.items,
        reason: result.reason,
        cached: (result as any).cached === true,
      })
    } catch (error) {
      if (disconnect.signal.aborted) return
      respond(response, 200, { suggestion: null, suggestions: [], reason: describeError(error) })
    }
  } catch (error) {
    respond(response, 500, { suggestion: null, suggestions: [], reason: describeError(error) })
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
      const result = await runPrediction(ctx, options, cache, inflight, plan, [disconnect.signal], (text) => {
        if (!disconnect.signal.aborted) sendEvent(response, { type: 'delta', text })
      })
      if (disconnect.signal.aborted) return
      if (result.reason !== undefined && result.items.length === 0) {
        sendEvent(response, { type: 'error', reason: result.reason })
      } else {
        sendEvent(response, { type: 'done', items: result.items, cached: (result as any).cached === true })
      }
    } catch (error) {
      if (disconnect.signal.aborted) return
      sendEvent(response, { type: 'error', reason: describeError(error) })
    } finally {
      closeStream(response)
    }
  } catch (error) {
    if (response.headersSent === true) closeStream(response)
    else respond(response, 500, { suggestion: null, suggestions: [], reason: describeError(error) })
  }
}

function getService<T = any>(ctx: any, name: string): T | undefined {
  try {
    if (typeof ctx?.get === 'function') {
      const svc = ctx.get(name)
      if (svc !== undefined) return svc
    }
    return ctx?.[name]
  } catch {
    return undefined
  }
}

/** Short, safe reason text for a client that only displays nothing. */
function describeError(error: any) {
  const message = error instanceof Error ? error.message : String(error)
  return message.length > 120 ? `${message.slice(0, 120)}…` : message
}

/**
 * Read and validate one request body, resolving the live Session it names.
 * @returns `null` when the response was already written, a plan, or an error.
 */
async function planRequest(ctx: any, request: any, response: any) {
  const connection = getService(ctx, 'connection')
  const admission = connection?.admit ? connection.admit(request) : { peer: { principal: { kind: 'owner' } } }
  if (admission && 'rejection' in admission) {
    return { status: admission.rejection, error: admission.rejection === 401 ? 'unauthorized' : 'forbidden' }
  }
  // Predictions read the owner's sessions and spend the owner's model tokens.
  if ((admission?.peer?.principal?.kind ?? 'owner') !== 'owner') return { status: 403, error: 'forbidden' }

  if (request.method !== 'POST') {
    respond(response, 405, { suggestion: null, suggestions: [], reason: 'method-not-allowed' })
    return null
  }

  if (request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return { status: 415, error: 'unsupported-media-type' }
  }

  let body
  try {
    body = await readJsonBody(request)
  } catch {
    return { status: 400, error: 'invalid-body' }
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { status: 400, error: 'invalid-body' }
  if (body.mode !== undefined && body.mode !== 'next' && body.mode !== 'continue') return { status: 400, error: 'invalid-mode' }

  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
  if (sessionId === '') return { status: 400, error: 'missing-session' }

  const sessions = getService(ctx, 'sessions')
  if (!sessions || typeof sessions.get !== 'function') return { status: 503, error: 'no-sessions-service' }

  const session = sessions.get(sessionId)
  if (session === undefined) return { status: 200, error: 'session-not-live' }

  const mode = body?.mode === 'continue' ? 'continue' : 'next'
  const draft = mode === 'continue' && typeof body?.draft === 'string' ? body.draft.slice(-MAX_DRAFT_CHARS) : ''
  if (mode === 'continue' && draft.trim() === '') return { status: 200, error: 'no-draft' }

  const seq = Number(session.seq)
  const key = JSON.stringify([sessionId, seq, mode, draft])

  return { sessionId, session, mode, draft, seq, key }
}

/**
 * Run one prediction, serving from or filling the bounded result cache.
 * @returns `{ items, reason }`.
 */
async function runPrediction(ctx: any, options: any, cache: any, inflight: any, plan: any, signals: any[], onDelta?: (text: string) => void) {
  const remembered = cache.get(plan.key)
  if (remembered !== undefined) {
    return { items: remembered.items, reason: undefined, cached: true }
  }

  // Each view owns its cancellation; an identical request must not cancel it.
  const controller = new AbortController()
  inflight.add(controller)
  try {
    const result = await predict(ctx, options, plan.session, plan.sessionId, plan.mode, plan.draft, joinSignals([controller.signal, ...signals]), onDelta)
    if (result.items.length > 0 && !controller.signal.aborted && !signals.some(signal => signal.aborted)) {
      remember(cache, plan.key, { items: result.items })
    }
    return result
  } finally {
    inflight.delete(controller)
  }
}

/**
 * Run one auxiliary model call over the transcript tail and tool activity.
 * @returns `{ items }` on success or `{ items: [], reason }` when none is usable.
 */
async function predict(ctx: any, options: any, session: any, sessionId: string, mode: string, draft: string, signal: AbortSignal, onDelta?: (text: string) => void) {
  const prompt = buildPrompt(session, options, mode, draft)
  if (prompt === null) return { items: [], reason: 'no-conversation' }

  const route = resolveRoute(ctx, session, options)
  if (route === undefined) return { items: [], reason: 'no-route' }

  const system = (mode === 'continue' ? CONTINUE_SYSTEM_PROMPT : NEXT_SYSTEM_PROMPT).replace(
    '{max}',
    String(options.maxSuggestions),
  )
  const deadline = timedSignal(signal, options.timeoutMs)
  let text = ''
  let finish
  try {
    deadline.signal.throwIfAborted()
    const llm = getService(ctx, 'llm')
    if (!llm || typeof llm.prepareCall !== 'function') return { items: [], reason: 'no-llm' }

    let targetEffort: string | undefined = undefined
    if (typeof llm.resolveModelInfo === 'function') {
      const cacheKey = `${route.provider}:${route.model}`
      let effortIds: string[] | undefined = modelEffortsCache.get(cacheKey)
      if (effortIds === undefined) {
        try {
          const modelInfo = await llm.resolveModelInfo(route.provider, route.model, deadline.signal)
          const efforts = modelInfo?.reasoning?.efforts
          effortIds = Array.isArray(efforts) ? efforts.map((e: any) => e?.id).filter(Boolean) : []
          remember(modelEffortsCache, cacheKey, effortIds)
        } catch {
          effortIds = []
        }
      }
      if (effortIds && effortIds.length > 0) {
        const requested = options.reasoningEffort || 'off'
        if (effortIds.includes(requested)) {
          targetEffort = requested
        } else if (effortIds.includes('off')) {
          targetEffort = 'off'
        } else if (effortIds.includes('low')) {
          targetEffort = 'low'
        } else {
          targetEffort = effortIds[0]
        }
      }
    }

    const baseConfig: Record<string, any> = {
      provider: route.provider,
      model: route.model,
      maxTokens: options.maxOutputTokens,
    }
    const callConfig: Record<string, any> = { ...baseConfig }
    if (targetEffort !== undefined) {
      callConfig.reasoningEffort = targetEffort
    }

    let call: any
    try {
      call = await llm.prepareCall(callConfig, deadline.signal)
    } catch (error: any) {
      const msg = String(error?.message || error?.code || '')
      if (targetEffort !== undefined && (error?.code === 'UNSUPPORTED_REASONING_EFFORT' || msg.includes('does not support reasoning effort'))) {
        call = await llm.prepareCall(baseConfig, deadline.signal)
      } else {
        throw error
      }
    }
    const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
    // `sessionId` 必须随请求下发：OpenCode 兼容网关按 `x-opencode-session` 头路由，
    // 缺失该头的辅助请求会被 400 拒绝（MissingSessionID），预测永远不会出现。
    for await (const chunk of call.stream({ ...call.config, messages, system, sessionId, purpose: 'composer-prediction', signal: deadline.signal })) {
      deadline.signal.throwIfAborted()
      if (chunk.type === 'text-delta') {
        text += chunk.text
        onDelta?.(chunk.text)
      } else if (chunk.type === 'finish') {
        finish = chunk.reason
      }
    }
    deadline.signal.throwIfAborted()
  } finally {
    deadline.dispose()
  }

  // A truncated answer still carries usable whole lines; every other terminal
  // outcome reports its own failure instead of looking like a missing stream.
  const failure = finishFailure(finish)
  if (failure !== undefined) return { items: [], reason: failure }
  if (finish.kind === 'max-tokens') text = text.slice(0, text.lastIndexOf('\n') + 1)

  const cue = mode === 'continue' ? CONTINUE_CUE : NEXT_CUE
  const items = normalizeCandidates(text, options.maxSuggestions, mode === 'continue' ? draft : '', cue)
  return items.length === 0 ? { items: [], reason: 'empty' } : { items }
}

/**
 * The llm service ends a failed or cancelled stream with a `finish` chunk whose
 * reason carries the normalized failure; only a missing terminal chunk is
 * genuinely "unfinished".
 */
function finishFailure(finish: any) {
  if (finish === undefined) return 'unfinished'
  if (finish.kind === 'stop' || finish.kind === 'max-tokens') return undefined
  const failure = finish.failure
  if (typeof failure?.message === 'string' && failure.message !== '') return shortReason(failure.message)
  if (typeof failure?.code === 'string' && failure.code !== '') return failure.code
  return typeof finish.kind === 'string' ? finish.kind : 'unfinished'
}

function shortReason(text: string) {
  return text.length > 200 ? `${text.slice(0, 200)}…` : text
}

const modelEffortsCache = new Map<string, string[]>()

function remember(cache: Map<string, any>, key: string, entry: any) {
  cache.delete(key)
  cache.set(key, entry)
  if (cache.size <= 200) return
  const oldest = cache.keys().next()
  if (!oldest.done) cache.delete(oldest.value)
}

/** Prefer the route the Session already used, unless a fixed route is configured. */
function resolveRoute(ctx: any, session: any, options: any) {
  if (options.provider !== '' && options.model !== '') {
    return { provider: options.provider, model: options.model }
  }
  const route = session.requestHeader()?.config
  if (typeof route?.provider === 'string' && typeof route.model === 'string') return route
  const fallback = ctx.get('agentDefaultModel')?.currentSelection()
  if (typeof fallback?.provider === 'string' && typeof fallback.model === 'string') return fallback
  return undefined
}

function extractToolResultText(block: any): string {
  if (block === null || typeof block !== 'object') return ''
  if (Array.isArray(block.content)) {
    const text = block.content
      .map((item: any) => {
        if (!item || typeof item !== 'object') return ''
        if (typeof item.text === 'string') return item.text
        if (typeof item.result === 'string') return item.result
        return ''
      })
      .filter((t: string) => t !== '')
      .join('\n')
      .trim()
    if (text !== '') return text
  }
  if (typeof block.content === 'string' && block.content !== '') return block.content.trim()
  if (typeof block.result === 'string' && block.result !== '') return block.result.trim()
  if (typeof block.text === 'string' && block.text !== '') return block.text.trim()
  return ''
}

/**
 * Render the conversation tail, recent tool activity, and (in continuation
 * mode) the draft as one bounded prompt.
 * @returns `null` when `next` mode has no completed assistant reply to follow.
 */
function buildPrompt(session: any, options: any, mode: string, draft: string) {
  const picked = []
  const notes = []
  const callsById = new Map()

  for (const message of session.deriveMessages()) {
    if (message === null || typeof message !== 'object') continue
    const blocks = Array.isArray(message.content) ? message.content : []

    if (message.role === 'user' || message.role === 'assistant') {
      const text = plainText(blocks)
      if (text !== '') {
        picked.push({ role: message.role, text: clip(text, 1_500) })
      }
      if (message.role === 'assistant' && options.maxToolNotes > 0) {
        for (const block of blocks) {
          if (block === null || typeof block !== 'object' || block.type !== 'tool-call') continue
          const note = {
            name: typeof block.name === 'string' ? block.name : 'tool',
            input: clip(typeof block.arguments === 'string' ? block.arguments : '', 400),
            result: '',
            failed: false,
          }
          notes.push(note)
          if (typeof block.id === 'string' && block.id !== '') callsById.set(block.id, note)
        }
      }
      // DSH 工具结果以 tool-result block 形式存放在 message.content 中
      if (options.maxToolNotes > 0) {
        for (const block of blocks) {
          if (block === null || typeof block !== 'object' || block.type !== 'tool-result') continue
          const callId = typeof block.toolCallId === 'string' ? block.toolCallId : (typeof block.id === 'string' ? block.id : '')
          const resText = clip(extractToolResultText(block), 500)
          const note = callId !== '' ? callsById.get(callId) : undefined
          if (note !== undefined) {
            note.result = resText
            note.failed = block.isError === true
          } else {
            notes.push({ name: 'tool', input: '', result: resText, failed: block.isError === true })
          }
        }
      }
      continue
    }

    const isToolMessage = message.role === 'tool' || message.source?.kind === 'tool'
    if (isToolMessage && options.maxToolNotes > 0) {
      let text = ''
      for (const block of blocks) {
        if (block !== null && typeof block === 'object' && block.type === 'tool-result') {
          const callId = typeof block.toolCallId === 'string' ? block.toolCallId : ''
          const resText = clip(extractToolResultText(block), 500)
          const note = callId !== '' ? callsById.get(callId) : undefined
          if (note !== undefined) {
            note.result = resText
            note.failed = block.isError === true
          } else {
            notes.push({ name: 'tool', input: '', result: resText, failed: block.isError === true })
          }
          text = resText
        }
      }
      if (text === '') {
        text = clip(plainText(blocks) || extractToolResultText(message), 500)
        const callId = typeof message.toolCallId === 'string' ? message.toolCallId : ''
        const note = callId !== '' ? callsById.get(callId) : undefined
        if (note !== undefined) {
          note.result = text
          note.failed = message.isError === true
        } else {
          notes.push({ name: 'tool', input: '', result: text, failed: message.isError === true })
        }
      }
    }
  }

  // The next-message prediction follows the agent's latest reply; a trailing user
  // message (even when a tool-call-only assistant message follows it) means the
  // turn never produced a reply to follow up on.
  if (mode === 'next' && (picked.length === 0 || picked.at(-1)?.role !== 'assistant')) return null

  const tail = picked.slice(-options.maxMessages)
  const kept = []
  let budget = options.maxChars
  for (let index = tail.length - 1; index >= 0; index -= 1) {
    const message = tail[index]
    if (message.text.length > budget) {
      if (budget > 200) kept.unshift({ role: message.role, text: `…${message.text.slice(-budget)}` })
      break
    }
    budget -= message.text.length
    kept.unshift(message)
  }

  const lines = ['Conversation tail (oldest first):', JSON.stringify(kept)]
  const recent = options.maxToolNotes > 0 ? notes.slice(-options.maxToolNotes) : []
  if (recent.length > 0) {
    lines.push('', 'Recent tool activity (oldest first):')
    for (const note of recent) {
      const status = note.failed ? 'failed' : 'ok'
      const result = note.result === '' ? '' : ` result=${JSON.stringify(clip(note.result, 320))}`
      lines.push(`- ${note.name}(${clip(note.input, 320)}) -> ${status}${result}`)
    }
  }

  if (mode === 'continue') {
    lines.push('', 'Draft text ending at the caret:', JSON.stringify(draft), '', CONTINUE_CUE)
  } else {
    lines.push('', NEXT_CUE)
  }
  return lines.join('\n')
}

function plainText(blocks: any[]) {
  return blocks
    .filter((block) => block !== null && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim()
}

function clip(text: string, maximum: number) {
  return text.length > maximum ? `${text.slice(0, maximum)}…` : text
}

/** Split model output into clean, de-duplicated, bounded candidates. */
function normalizeCandidates(text: string, maximum: number, draft: string, cue = ''): string[] {
  const items = []
  const seen = new Set()
  const prefix = draft === '' ? '' : draft.trimEnd()
  const prefixLower = prefix.toLocaleLowerCase()
  const cueIdentity = identityOf(cue)

  for (const raw of text.split(/\r?\n/)) {
    // Keep whether the line began with whitespace: for a continuation the model
    // uses a leading space to say "the draft needs a separator here".
    const hadLeadingSpace = /^\s/u.test(raw)
    const line = raw
      .replace(/^(?:[-*•]|\d+[.)])\s+/u, '')
      .replace(/^user\s*:\s*/iu, '')
      .trim()
    if (line === '') continue

    let body = line
      .replace(/^["'`\u201c\u201d]+|["'`\u201c\u201d]+$/gu, '')
      .replace(/\s+/gu, ' ')
    if (body === '' || /^none$/iu.test(body)) continue

    if (prefixLower !== '' && body.toLocaleLowerCase().startsWith(prefixLower)) {
      // The model sometimes restates the draft before continuing it.
      body = body.slice(prefix.length).replace(/^\s+/u, ' ')
    } else if (draft !== '' && hadLeadingSpace && !/^\s/u.test(body)) {
      body = ` ${body}`
    }

    body = draft === '' ? body.trim() : body.replace(/\s+$/u, '')
    if (body.trim() === '') continue
    body = boundSuggestion(body)
    if (body === '') continue

    const identity = identityOf(body)
    if (isInstructionEcho(identity, cueIdentity)) continue
    if (seen.has(identity)) continue
    seen.add(identity)
    items.push(body)
    if (items.length >= maximum) break
  }
  return items
}

/** Normalize a line for echo comparison: lowercase, no trailing punctuation. */
function identityOf(text: string) {
  return text.replace(/[.:!?]+$/u, '').trim().toLocaleLowerCase()
}

/** Drop the prompt's own labels and task line when the model echoes them. */
function isInstructionEcho(identity: string, cueIdentity: string) {
  if (identity === '') return true
  if (cueIdentity !== '' && (identity === cueIdentity || identity.startsWith(`${cueIdentity} `))) return true
  return PROMPT_LABELS.some((label) => identity === label || identity.startsWith(`${label} `))
}

function boundSuggestion(line: string) {
  if (line.length <= 240) return line
  const cut = line.slice(0, 240)
  const space = cut.lastIndexOf(' ')
  return space > 120 ? cut.slice(0, space) : cut
}

async function readJsonBody(request: any): Promise<any> {
  if (typeof request.on === 'function') {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      let size = 0
      let settled = false
      const fail = (error: any) => {
        if (settled) return
        settled = true
        request.resume?.()
        reject(error)
      }
      request.on('data', (chunk: Buffer) => {
        if (settled) return
        size += chunk.length
        if (size > MAX_BODY_BYTES) {
          fail(new Error('body-too-large'))
          return
        }
        chunks.push(chunk)
      })
      request.on('end', () => {
        if (settled) return
        settled = true
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        } catch (error) {
          reject(error)
        }
      })
      request.on('error', fail)
      request.on('aborted', () => fail(new Error('request-aborted')))
      request.on('close', () => fail(new Error('request-closed')))
    })
  }

  if (request[Symbol.asyncIterator] !== undefined) {
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of request) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buf.length
      if (size > MAX_BODY_BYTES) throw new Error('body-too-large')
      chunks.push(buf)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  }

  throw new Error('unsupported-request-stream')
}

function openStream(response: any) {
  response.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store, no-transform',
    'x-accel-buffering': 'no',
  })
  response.flushHeaders?.()
}

function sendEvent(response: any, event: any) {
  if (response.writableEnded || response.destroyed) return
  response.write(`data: ${JSON.stringify(event)}\n\n`)
}

function closeStream(response: any) {
  if (response.writableEnded || response.destroyed) return
  response.end()
}

function watchDisconnect(response: any) {
  const controller = new AbortController()
  response.on('close', () => {
    if (!response.writableEnded) controller.abort()
  })
  return controller
}

function respond(response: any, status: number, payload: any) {
  if (response.writableEnded || response.headersSent === true) return
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

function joinSignals(signals: AbortSignal[]) {
  if (typeof (AbortSignal as any).any === 'function') return (AbortSignal as any).any(signals)
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort()
      break
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  return controller.signal
}

function timedSignal(signal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal.aborted) controller.abort()
  else signal.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, timeoutMs)
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
    },
  }
}

// --- 供契约测试与回归断言使用的生产函数导出 ---
export {
  normalizeCandidates,
  boundSuggestion,
  buildPrompt,
  extractToolResultText,
  resolveRoute,
}
