/**
 * Host 侧输入预测核心算法与服务实现：
 * 1. 文本清洗与格式化：去除大模型可能返回的序号、引号、markdown，支持 CJK 空格避让；
 * 2. 预测 Prompt 组装：区分 next（下一句建议）与 continue（行内草稿续写）；
 * 3. 内存缓存机制：按 sessionId、会话 revision、模式与草稿缓存，防止重复请求消耗 Token。
 */

export interface PredictionMessage {
  role: string
  content: string | Array<{ type: string; text?: string }>
}

export interface PromptOptions {
  mode: 'next' | 'continue'
  messages: PredictionMessage[]
  draft: string
  maxSuggestions?: number
  maxContextChars?: number
}

const CJK_REGEX = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u

/** 判断单个字符是否为中日韩 CJK 字符 */
export function isCjkCharacter(char: string): boolean {
  if (!char || char.length === 0) return false
  return CJK_REGEX.test(char)
}

/** 清洗大模型输出的一行候选项 */
export function cleanPredictionCandidate(line: string): string {
  if (!line) return ''
  let text = line.trim()
  if (text.toLowerCase() === 'none') return ''

  // 剔除序号如 1. 、- 、* 、• 等
  text = text.replace(/^(?:[-*•]|\d+[.)])\s+/u, '')
  // 剔除首尾的引号、双引号、中文引号
  text = text.replace(/^["'`\u201c\u201d]+|["'`\u201c\u201d]+$/gu, '')
  // 压缩多余空格
  text = text.replace(/\s+/gu, ' ').trim()

  if (text.toLowerCase() === 'none') return ''
  return text
}

/** 格式化草稿与续写文本的连接：CJK 语言不加空格，英文在两词之间智能补空格 */
export function formatContinuation(draft: string, continuation: string): string {
  if (!draft || draft === '') return continuation
  if (!continuation || continuation === '') return ''

  // 如果草稿末尾已有空格，或续写开头已有空格，直接连接
  if (/\s$/u.test(draft) || /^\s/u.test(continuation)) {
    return continuation
  }

  const lastChar = draft.slice(-1)
  const firstChar = continuation.slice(0, 1)

  // CJK 字符之间不补充空格
  if (isCjkCharacter(lastChar) || isCjkCharacter(firstChar)) {
    return continuation
  }

  // 标点符号前不加空格
  if (/^[,.;:!?\]}%]/u.test(firstChar)) {
    return continuation
  }

  // 括号、引号、破折号或斜杠末尾不加空格
  const noSpaceTails = new Set(['(', '[', '{', '/', '\\', '"', "'", '`', '—', '-'])
  if (noSpaceTails.has(lastChar)) {
    return continuation
  }

  // 英文两词之间补空格
  return ` ${continuation}`
}

/** 提取消息中的纯文本内容 */
function extractTextFromMessage(message: PredictionMessage): string {
  if (typeof message.content === 'string') return message.content
  if (Array.isArray(message.content)) {
    return message.content
      .filter(item => item && (item.type === 'text' || typeof item.text === 'string'))
      .map(item => item.text ?? '')
      .join('\n')
  }
  return ''
}

const NEXT_SYSTEM_PROMPT = [
  'You are the follow-up suggestion engine inside an AI coding assistant chat UI.',
  'You receive the tail of a conversation between a USER and an AI coding agent.',
  'Predict the next messages the USER is most likely to send next.',
  'Rules:',
  '- Write as the user would type, in the language of the conversation (Chinese if user speaks Chinese).',
  '- Return up to {max} candidates, most likely first, one per line.',
  '- No numbering, bullets, quotes, markdown, or explanation.',
  '- At most 25 words per candidate; be concrete and specific.',
  '- If the assistant asked the user a question, answer it directly.',
  '- If no meaningful follow-up exists, reply with exactly: NONE',
].join('\n')

const CONTINUE_SYSTEM_PROMPT = [
  'You complete the message a USER is drafting in an AI coding assistant chat UI.',
  'You receive the tail of the conversation and the exact draft text the user is typing.',
  'Write what should come next, as the user would type it.',
  'Rules:',
  '- Return up to {max} alternative continuations, most likely first, one per line.',
  '- Continue strictly from the end of the draft; never repeat text the draft already contains.',
  '- No numbering, bullets, quotes, markdown, or explanation.',
  '- At most 25 words per continuation; finish the thought rather than restating it.',
  '- If the draft is already complete, reply with exactly: NONE',
].join('\n')

/** 构建送给模型的 Prompt */
export function buildPredictionPrompt(options: PromptOptions): { system: string; user: string } {
  const max = Math.min(Math.max(options.maxSuggestions ?? 3, 1), 5)
  const maxChars = options.maxContextChars ?? 6000

  const system = (options.mode === 'next' ? NEXT_SYSTEM_PROMPT : CONTINUE_SYSTEM_PROMPT).replace('{max}', String(max))

  // 截取最近几轮对话
  const picked: string[] = []
  let charsCount = 0

  for (let i = options.messages.length - 1; i >= 0 && charsCount < maxChars; i--) {
    const msg = options.messages[i]
    if (!msg) continue
    const role = msg.role === 'user' ? 'USER' : msg.role === 'assistant' ? 'ASSISTANT' : msg.role
    const text = extractTextFromMessage(msg).trim()
    if (!text) continue

    const budget = Math.min(2000, maxChars - charsCount)
    const trimmed = text.length > budget
      ? (msg.role === 'user' ? text.slice(0, budget) + '…' : '…' + text.slice(-budget))
      : text

    picked.unshift(`${role}: ${trimmed}`)
    charsCount += trimmed.length
  }

  const contextText = picked.join('\n\n')

  let user = `Conversation tail:\n${contextText}`
  if (options.mode === 'continue') {
    user += `\n\nUser current draft ending at caret:\n"${options.draft}"`
  }

  return { system, user }
}

/** 内存中的预测缓存 */
export class PredictionCache {
  private cache = new Map<string, { candidates: string[]; time: number }>()

  constructor(private maxEntries = 100, private ttlMs = 60_000) {}

  private makeKey(sessionId: string, revision: number, mode: string, draft: string): string {
    return `${sessionId}:${revision}:${mode}:${mode === 'continue' ? draft.trim() : ''}`
  }

  get(sessionId: string, revision: number, mode: string, draft: string): string[] | undefined {
    const key = this.makeKey(sessionId, revision, mode, draft)
    const hit = this.cache.get(key)
    if (!hit) return undefined
    if (Date.now() - hit.time > this.ttlMs) {
      this.cache.delete(key)
      return undefined
    }
    return hit.candidates
  }

  set(sessionId: string, revision: number, mode: string, draft: string, candidates: string[]): void {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
    const key = this.makeKey(sessionId, revision, mode, draft)
    this.cache.set(key, { candidates, time: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }
}
