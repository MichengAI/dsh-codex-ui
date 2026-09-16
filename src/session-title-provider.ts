import { assembleSessionTitle, parseTypeAndTheme, resolveSessionTitleLocale, sessionTitlePrompt, shouldSkipAutoTitle, type SessionTitleLocale, type SessionTitleTarget } from './session-title.ts'

export const SESSION_TITLE_PROVIDER_ID = 'michengai-codex-ui-session-title'
const MAX_INPUT_BYTES = 4096
const MAX_OUTPUT_TOKENS = 64
const TIMEOUT_MS = 60_000

export type SessionTitleHost = {
  get: (name: string) => unknown
  locale?: unknown
  logger?: { warn: (message: string, ...args: unknown[]) => void }
}

type TitleRoute = { provider: string; model: string }

type TitleRequest = {
  session?: SessionTitleTarget & { header?: SessionTitleTarget['header'] & { createdAt?: number } }
  messages?: readonly { seq?: number; text?: string }[]
  route?: TitleRoute
  signal?: AbortSignal
}

type TitleLlm = {
  stream: (options: Record<string, unknown>) => AsyncIterable<unknown>
}

type TitleService = {
  register: (provider: {
    id: string
    automatic: 'first-prompt'
    generate: (request: TitleRequest) => Promise<{ title: string; messageSeqs: number[]; model?: TitleRoute }>
  }) => unknown
}

function asTitleService(value: unknown): TitleService | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const register = (value as { register?: unknown }).register
  return typeof register === 'function' ? value as TitleService : undefined
}

function asLlm(value: unknown): TitleLlm | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const stream = (value as { stream?: unknown }).stream
  return typeof stream === 'function' ? value as TitleLlm : undefined
}

function abortableSignal(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  return signal === undefined ? timeout : AbortSignal.any([signal, timeout])
}

type StreamTextPart = { text: string; closed: boolean }

/**
 * Assemble the streamed text the way the host's `BlockAssembler` does: deltas
 * accumulate per block index and a closing `block-end` replaces them, so the
 * adapters that send both channels cannot duplicate the title text.
 */
function collectText(chunks: AsyncIterable<unknown>): Promise<string> {
  return (async () => {
    const parts = new Map<number, StreamTextPart>()
    let finish = 'stop'
    const part = (index: number): StreamTextPart => {
      let existing = parts.get(index)
      if (existing === undefined) {
        existing = { text: '', closed: false }
        parts.set(index, existing)
      }
      return existing
    }
    for await (const chunk of chunks) {
      if (chunk === null || typeof chunk !== 'object') continue
      const row = chunk as {
        type?: unknown
        index?: unknown
        text?: unknown
        reason?: { kind?: unknown }
        block?: { type?: unknown; text?: unknown }
      }
      if (row.type === 'tool-call-delta' || row.block?.type === 'tool-call') throw new Error('codex-ui session title output must be text')
      if (row.type === 'finish') {
        finish = typeof row.reason?.kind === 'string' ? row.reason.kind : 'unknown'
        continue
      }
      if (row.type !== 'text-delta' && row.type !== 'block-end') continue
      if (typeof row.index !== 'number' || !Number.isSafeInteger(row.index)) continue
      if (row.type === 'text-delta') {
        if (typeof row.text !== 'string') continue
        const target = part(row.index)
        if (!target.closed) target.text += row.text
        continue
      }
      if (row.block?.type !== 'text' || typeof row.block.text !== 'string') continue
      const target = part(row.index)
      if (target.closed) continue
      target.text = row.block.text
      target.closed = true
    }
    if (finish !== 'stop') throw new Error(`codex-ui session title output finished with "${finish}"`)
    const text = [...parts.values()].map(segment => segment.text).join('').trim()
    return text.split(/\r?\n/, 1)[0] ?? ''
  })()
}

function hostLocale(host: SessionTitleHost, message?: string): SessionTitleLocale {
  return resolveSessionTitleLocale(host.locale ?? host.get('locale'), message)
}

export async function generateCodexSessionTitle(llm: TitleLlm, request: TitleRequest, locale: SessionTitleLocale = 'zh'): Promise<{ title: string; messageSeqs: number[]; model?: TitleRoute }> {
  request.signal?.throwIfAborted()
  const session = request.session
  if (session === undefined || shouldSkipAutoTitle(session)) throw new Error('codex-ui session title skipped')
  const first = request.messages?.[0]
  const text = first?.text?.trim() ?? ''
  if (first === undefined || text === '') throw new Error('codex-ui session title missing message')
  const route = request.route
  if (route === undefined || route.provider === '' || route.model === '') throw new Error('codex-ui session title missing route')
  const prompt = sessionTitlePrompt(locale)
  const framed = `${prompt.userFrame}\n${JSON.stringify([{ seq: first.seq, text }])}`
  if (Buffer.byteLength(framed, 'utf8') > MAX_INPUT_BYTES) throw new Error('codex-ui session title input too large')
  const signal = abortableSignal(request.signal)
  const raw = await collectText(llm.stream({
    provider: route.provider,
    model: route.model,
    messages: [{
      id: crypto.randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: framed }],
      source: { kind: 'plugin', plugin: 'michengai-codex-ui' },
    }],
    system: prompt.system,
    maxTokens: MAX_OUTPUT_TOKENS,
    sessionId: session.id,
    purpose: 'session-title',
    signal,
  }))
  signal.throwIfAborted()
  const parsed = parseTypeAndTheme(raw)
  if (parsed === undefined) throw new Error('codex-ui session title invalid model output')
  const title = assembleSessionTitle(parsed.type, parsed.theme, locale)
  if (title === undefined) throw new Error('codex-ui session title rejected')
  return {
    title,
    messageSeqs: typeof first.seq === 'number' ? [first.seq] : [],
    model: route,
  }
}

export function registerSessionTitleProvider(ctx: SessionTitleHost): (() => void) | undefined {
  const sessionTitle = asTitleService(ctx.get('sessionTitle'))
  const llm = asLlm(ctx.get('llm'))
  if (sessionTitle === undefined || llm === undefined) return undefined
  try {
    const dispose = sessionTitle.register({
      id: SESSION_TITLE_PROVIDER_ID,
      automatic: 'first-prompt',
      generate: request => generateCodexSessionTitle(llm, request, hostLocale(ctx, request.messages?.[0]?.text)),
    })
    return typeof dispose === 'function' ? dispose as () => void : undefined
  } catch (error) {
    const reason = error instanceof Error ? error.message : typeof error
    ctx.logger?.warn(`Codex UI 未能注册会话标题提供方：${reason}`)
    return undefined
  }
}
