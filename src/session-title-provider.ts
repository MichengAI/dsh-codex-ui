import { assembleSessionTitle, parseTypeAndTheme, shouldSkipAutoTitle, type SessionTitleTarget } from './session-title.ts'

export const SESSION_TITLE_PROVIDER_ID = 'michengai-codex-ui-session-title'
const MAX_INPUT_BYTES = 4096
const MAX_OUTPUT_TOKENS = 64
const TIMEOUT_MS = 60_000

const SYSTEM_PROMPT = [
  '为编程助手会话生成标题。',
  '只输出一行，恰好两段：类型｜主题',
  '类型必须是其中一个：功能、设计、修复、优化、发布、探索、文档、研究',
  '主题必须是具体事项，不能重复类型，不要写“功能”“功能类型”这类空主题。不要写日期或表情，不要引号、前缀、解释或 Markdown。',
  '使用用户消息的语言。',
].join('\n')

export type SessionTitleHost = {
  get: (name: string) => unknown
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

function collectText(chunks: AsyncIterable<unknown>): Promise<string> {
  return (async () => {
    const parts: string[] = []
    for await (const chunk of chunks) {
      if (chunk === null || typeof chunk !== 'object') continue
      const row = chunk as { type?: unknown; text?: unknown; block?: { type?: unknown; text?: unknown } }
      if (row.type === 'tool-call-delta' || row.block?.type === 'tool-call') throw new Error('codex-ui session title output must be text')
      if (row.type === 'text-delta' && typeof row.text === 'string') parts.push(row.text)
      if (row.type === 'block-end' && row.block?.type === 'text' && typeof row.block.text === 'string') parts.push(row.block.text)
    }
    return parts.join('').trim().split(/\r?\n/, 1)[0] ?? ''
  })()
}

export async function generateCodexSessionTitle(llm: TitleLlm, request: TitleRequest): Promise<{ title: string; messageSeqs: number[]; model?: TitleRoute }> {
  request.signal?.throwIfAborted()
  const session = request.session
  if (session === undefined || shouldSkipAutoTitle(session)) throw new Error('codex-ui session title skipped')
  const first = request.messages?.[0]
  const text = first?.text?.trim() ?? ''
  if (first === undefined || text === '') throw new Error('codex-ui session title missing message')
  const route = request.route
  if (route === undefined || route.provider === '' || route.model === '') throw new Error('codex-ui session title missing route')
  const framed = `根据这条用户消息生成会话标题。只返回“类型｜主题”一行，不要第三段，不要重复主题。\n${JSON.stringify([{ seq: first.seq, text }])}`
  if (Buffer.byteLength(framed, 'utf8') > MAX_INPUT_BYTES) throw new Error('codex-ui session title input too large')
  const raw = await collectText(llm.stream({
    provider: route.provider,
    model: route.model,
    messages: [{
      id: crypto.randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: framed }],
      source: { kind: 'plugin', plugin: 'michengai-codex-ui' },
    }],
    system: SYSTEM_PROMPT,
    maxTokens: MAX_OUTPUT_TOKENS,
    sessionId: session.id,
    purpose: 'session-title',
    signal: abortableSignal(request.signal),
  }))
  const parsed = parseTypeAndTheme(raw)
  if (parsed === undefined) throw new Error('codex-ui session title invalid model output')
  const title = assembleSessionTitle(parsed.type, parsed.theme)
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
      generate: request => generateCodexSessionTitle(llm, request),
    })
    return typeof dispose === 'function' ? dispose as () => void : undefined
  } catch (error) {
    const reason = error instanceof Error ? error.message : typeof error
    ctx.logger?.warn(`Codex UI 未能注册会话标题提供方：${reason}`)
    return undefined
  }
}
