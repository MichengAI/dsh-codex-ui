import { expect, test, vi } from 'vitest'
import { SESSION_TITLE_EMOJI } from '../src/session-title.ts'
import { registerSessionTitleProvider } from '../src/session-title-provider.ts'

type Provider = {
  id: string
  automatic: string
  generate: (request: {
    session: { id: string; origin?: string; header?: { createdAt?: number; parentSession?: string; origin?: string } }
    messages: readonly { seq: number; text: string }[]
    route?: { provider: string; model: string }
    signal: AbortSignal
  }) => Promise<{ title: string; messageSeqs: number[] }>
}

function host(options?: {
  sessionTitle?: { register: (provider: Provider) => () => void }
  llm?: { stream: (options: Record<string, unknown>) => AsyncIterable<unknown> }
  warn?: (message: string) => void
}) {
  return {
    get: (name: string) => name === 'sessionTitle' ? options?.sessionTitle : name === 'llm' ? options?.llm : undefined,
    logger: { warn: options?.warn ?? (() => {}) },
  }
}

function request(session: { id: string; origin?: string; header?: { createdAt?: number; parentSession?: string; origin?: string } }, text = '优化批次文字显示') {
  return {
    session,
    messages: [{ seq: 1, text }],
    route: { provider: 'deepseek', model: 'deepseek-chat' },
    signal: new AbortController().signal,
  }
}

async function* textStream(text: string): AsyncIterable<unknown> {
  yield { type: 'text-delta', index: 0, text }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

/** 真实宿主适配器：增量先到，收尾块在 [DONE] 时携带同一份完整文本。 */
async function* assembledStream(text: string): AsyncIterable<unknown> {
  yield { type: 'block-start', index: 0, blockType: 'text' }
  for (const piece of text.split('')) yield { type: 'text-delta', index: 0, text: piece }
  yield { type: 'block-end', index: 0, block: { type: 'text', text } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

async function* abortedStream(text: string, kind: 'max-tokens' | 'aborted' | 'error'): AsyncIterable<unknown> {
  yield { type: 'text-delta', index: 0, text }
  yield kind === 'max-tokens'
    ? { type: 'finish', reason: { kind } }
    : { type: 'finish', reason: { kind, failure: { message: 'interrupted', code: 'X' } } }
}

test('标题服务或模型服务缺失时不注册', () => {
  const register = vi.fn()
  expect(() => registerSessionTitleProvider(host())).not.toThrow()
  expect(() => registerSessionTitleProvider(host({ sessionTitle: { register } }))).not.toThrow()
  expect(register).not.toHaveBeenCalled()
})

test('注册 first-prompt 提供方，并在官方位已被占用时只记日志', () => {
  const providers: Provider[] = []
  const dispose = registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => textStream('优化｜批次文字显示') },
  }))
  expect(providers).toHaveLength(1)
  expect(providers[0]?.automatic).toBe('first-prompt')
  expect(typeof dispose).toBe('function')

  const warn = vi.fn()
  expect(() => registerSessionTitleProvider(host({
    sessionTitle: { register: () => { throw new Error('session-title provider "session-title-first-prompt-llm" is already registered') } },
    llm: { stream: () => textStream('优化｜批次文字显示') },
    warn,
  }))).not.toThrow()
  expect(warn).toHaveBeenCalled()
})

test('模型多写一段主题或自带日期时仍只拼表情和两段标题', async () => {
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => textStream('研究｜核对顶代码｜核对顶代码') },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }, '核对顶代码'))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.研究} 研究｜核对顶代码`)
})

test('模型把分类再写进主题时只保留表情和分类', async () => {
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => textStream('功能｜功能功能') },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }, '我想做一个功能'))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.功能} 功能`)
})

test('用模型给出的类型主题拼标题，不依赖创建时间', async () => {
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => textStream('优化｜批次文字显示') },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.优化} 优化｜批次文字显示`)
  expect(result.messageSeqs).toEqual([1])
})

test('特殊会话或模型输出无效时失败以保留回退标题', async () => {
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => textStream('随便写一个标题') },
  }))
  const generate = providers[0]!.generate
  await expect(generate(request({ id: 'dsh-automation-session-1' }))).rejects.toThrow()
  await expect(generate(request({ id: 'session-1' }))).rejects.toThrow()
})

test('模型用 ASCII 竖线分隔时仍能拼出规范标题', async () => {
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => textStream('优化|批次文字显示') },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.优化} 优化｜批次文字显示`)
})

test('增量与收尾块携带同一份文本时标题只拼一次', async () => {
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => assembledStream('优化｜批次文字显示') },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.优化} 优化｜批次文字显示`)
})

test('模型被截断或中断时放弃标题以保留回退', async () => {
  for (const kind of ['max-tokens', 'aborted', 'error'] as const) {
    const providers: Provider[] = []
    registerSessionTitleProvider(host({
      sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
      llm: { stream: () => abortedStream('优化｜批次文字显示', kind) },
    }))
    await expect(providers[0]!.generate(request({ id: 'session-1' }))).rejects.toThrow()
  }
})
