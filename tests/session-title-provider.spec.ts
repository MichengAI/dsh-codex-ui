import { Context, Service } from '@deepseek-ai/cordis'
import { expect, test, vi } from 'vitest'
import { apply, inject, name } from '../src/session-title-plugin.ts'
import { SESSION_TITLE_EMOJI } from '../src/session-title.ts'
import { registerSessionTitleProvider, SESSION_TITLE_PROVIDER_ID } from '../src/session-title-provider.ts'

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
  locale?: unknown
  settings?: { get: (ns: string) => unknown }
  warn?: (message: string) => void
}) {
  return {
    get: (name: string) => name === 'sessionTitle' ? options?.sessionTitle : name === 'llm' ? options?.llm : name === 'locale' ? options?.locale : name === 'settings' ? options?.settings : undefined,
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

test('标题服务或模型服务缺失时不注册，并记日志', () => {
  const register = vi.fn()
  const warn = vi.fn()
  expect(() => registerSessionTitleProvider(host({ warn }))).not.toThrow()
  expect(() => registerSessionTitleProvider(host({ sessionTitle: { register }, warn }))).not.toThrow()
  expect(register).not.toHaveBeenCalled()
  expect(warn).toHaveBeenCalled()
})

test('独立插件在 sessionTitle 与 llm 就绪后注册 first-prompt', async () => {
  const providers: Provider[] = []
  class SessionTitle extends Service {
    constructor(ctx: Context) {
      super(ctx, 'sessionTitle')
    }
    register(provider: Provider) {
      providers.push(provider)
      return () => {}
    }
  }
  class Llm extends Service {
    constructor(ctx: Context) {
      super(ctx, 'llm')
    }
    async *stream() {
      yield { type: 'text-delta', index: 0, text: '探索｜项目评估' }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
  }
  const ctx = new Context()
  ctx.plugin(SessionTitle)
  ctx.plugin(Llm)
  await ctx.plugin({ name, inject, apply })
  expect(name).toBe('michengai-codex-ui-session-title')
  expect(inject).toEqual(['sessionTitle', 'llm'])
  expect(providers).toHaveLength(1)
  expect(providers[0]?.automatic).toBe('first-prompt')
  const result = await providers[0]!.generate(request({ id: 'session-1' }, '评估一下项目'))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.explore} 探索｜项目评估`)
})

test('独立插件先挂上时等到 sessionTitle 与 llm 都就绪才注册', async () => {
  const providers: Provider[] = []
  class SessionTitle extends Service {
    constructor(ctx: Context) {
      super(ctx, 'sessionTitle')
    }
    register(provider: Provider) {
      providers.push(provider)
      return () => {}
    }
  }
  class Llm extends Service {
    constructor(ctx: Context) {
      super(ctx, 'llm')
    }
    async *stream() {}
  }
  const ctx = new Context()
  const fiber = ctx.plugin({ name, inject, apply })
  expect(providers).toHaveLength(0)
  await ctx.plugin(SessionTitle)
  expect(providers).toHaveLength(0)
  await ctx.plugin(Llm)
  await fiber
  expect(providers).toHaveLength(1)
  expect(providers[0]?.id).toBe(SESSION_TITLE_PROVIDER_ID)
})

test('卸载插件时回收 first-prompt 提供方，重挂可再注册', async () => {
  const providers = new Map<string, Provider>()
  class SessionTitle extends Service {
    constructor(ctx: Context) {
      super(ctx, 'sessionTitle')
    }
    register(provider: Provider) {
      if (providers.has(provider.id)) throw new Error(`session-title provider "${provider.id}" is already registered`)
      providers.set(provider.id, provider)
      return () => { providers.delete(provider.id) }
    }
  }
  class Llm extends Service {
    constructor(ctx: Context) {
      super(ctx, 'llm')
    }
    async *stream() {}
  }
  const ctx = new Context()
  await ctx.plugin(SessionTitle)
  await ctx.plugin(Llm)
  const plugin = { name, inject, apply }
  const fiber = await ctx.plugin(plugin)
  expect(providers.size).toBe(1)
  await fiber.dispose()
  expect(providers.size).toBe(0)
  await ctx.plugin(plugin)
  expect(providers.size).toBe(1)
})

test('可调用的 service 包装仍能注册', () => {
  const providers: Provider[] = []
  const sessionTitle = Object.assign(function sessionTitle() {}, {
    register: (provider: Provider) => { providers.push(provider); return () => {} },
  })
  const llm = Object.assign(function llm() {}, {
    stream: () => textStream('探索｜项目评估'),
  })
  const dispose = registerSessionTitleProvider(host({ sessionTitle, llm }))
  expect(providers).toHaveLength(1)
  expect(typeof dispose).toBe('function')
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
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.research} 研究｜核对顶代码`)
})

test('模型把分类再写进主题时只保留表情和分类', async () => {
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => textStream('功能｜功能功能') },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }, '我想做一个功能'))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.feature} 功能`)
})

test('用模型给出的类型主题拼标题，不依赖创建时间', async () => {
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => textStream('优化｜批次文字显示') },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.optimize} 优化｜批次文字显示`)
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
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.optimize} 优化｜批次文字显示`)
})

test('增量与收尾块携带同一份文本时标题只拼一次', async () => {
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => assembledStream('优化｜批次文字显示') },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.optimize} 优化｜批次文字显示`)
})

test('没有宿主 locale 时按英文用户消息使用英文提示词', async () => {
  const streams: Record<string, unknown>[] = []
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: (options) => { streams.push(options); return textStream('Fix｜login timeout') } },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }, 'the login request timed out'))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.fix} Fix｜login timeout`)
  expect(String(streams[0]?.system)).toContain('Feature, Design, Fix')
})

test('宿主英文 locale 时用英文类型标签拼标题，并使用英文提示词', async () => {
  const streams: Record<string, unknown>[] = []
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: (options) => { streams.push(options); return textStream('Optimize｜batch text') } },
    locale: { getSnapshot: () => ({ locale: 'en-US' }) },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }, 'fix batch text'))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.optimize} Optimize｜batch text`)
  expect(String(streams[0]?.system)).toContain('Feature, Design, Fix')
  expect(String(streams[0]?.system)).not.toMatch(/功能/)
})

test('英文首句时丢掉模型写的中文主题', async () => {
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: () => textStream('Fix｜Bug修复') },
    settings: { get: ns => ns === 'locale' ? { preference: 'en' } : undefined },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }, 'fix bug'))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.fix} Fix｜fix bug`)
})

test('宿主 settings 选英文时中文首句也用英文类型词', async () => {
  const streams: Record<string, unknown>[] = []
  const providers: Provider[] = []
  registerSessionTitleProvider(host({
    sessionTitle: { register: provider => { providers.push(provider); return () => {} } },
    llm: { stream: (options) => { streams.push(options); return textStream('Explore｜project review') } },
    settings: { get: ns => ns === 'locale' ? { preference: 'en' } : undefined },
  }))
  const result = await providers[0]!.generate(request({ id: 'session-1' }, '评估一下项目'))
  expect(result.title).toBe(`${SESSION_TITLE_EMOJI.explore} Explore｜评估一下项目`)
  expect(String(streams[0]?.system)).toContain('Feature, Design, Fix')
  expect(String(streams[0]?.system)).not.toMatch(/功能/)
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
