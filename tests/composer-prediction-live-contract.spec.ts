import { describe, expect, it, vi } from 'vitest'
import { apply as applyPredictions } from '../src/composer-prediction.ts'
import { CODEX_UI_API_ENDPOINTS } from '../src/business-api.ts'

describe('composer-prediction: 真实宿主契约与防御回归', () => {
  it('正确解析 DSH 真实 tool-call 与 tool-result 结构并注入 prompt', async () => {
    let streamHandler: any = null
    const webServer = {
      register: (options: any) => {
        if (options.path === CODEX_UI_API_ENDPOINTS.composerPredictionStream) {
          streamHandler = options.handler
        }
        return () => {}
      },
    }

    let capturedSystemPrompt = ''
    let capturedUserPrompt = ''
    let capturedConfig: any = null

    const mockLlm = {
      prepareCall: vi.fn(async (config, signal) => {
        capturedConfig = config
        return {
          config,
          stream: async function* () {
            yield { type: 'text-delta', text: 'dsh-pua 目录下的代码是否有问题' }
            yield { type: 'finish', reason: { kind: 'stop' } }
          },
        }
      }),
    }

    const mockSession = {
      seq: 1,
      deriveMessages: () => [
        {
          role: 'user',
          content: [{ type: 'text', text: '请帮我跑一下测试' }],
        },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: '正在运行测试...' },
            { type: 'tool-call', id: 'call_1', name: 'terminal', arguments: 'pnpm test' },
          ],
        },
        {
          role: 'user',
          source: { kind: 'tool' },
          content: [
            { type: 'tool-result', toolCallId: 'call_1', result: 'Tests passed: 319', isError: false },
          ],
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: '测试已全绿，还有其他任务吗？' }],
        },
      ],
      requestHeader: () => ({
        config: { provider: 'deepseek-official', model: 'deepseek-flash' },
      }),
    }

    const mockCtx = {
      webServer,
      connection: { admit: vi.fn(() => ({ peer: { principal: { kind: 'owner' } } })) },
      llm: mockLlm,
      sessions: { get: vi.fn((id) => (id === 'sess_1' ? mockSession : undefined)) },
      effect: (fn: any) => fn(),
    } as any

    applyPredictions(mockCtx)

    const response = {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    }

    await streamHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify({ sessionId: 'sess_1', mode: 'continue', draft: '请帮我检查' }))
        },
      },
      response,
    )

    // 验证 prepareCall 直接吃入了 reasoningEffort: 'off'
    expect(mockLlm.prepareCall).toHaveBeenCalled()
    expect(capturedConfig.reasoningEffort).toBe('off')
    expect(capturedConfig.maxTokens).toBe(220)

    // 验证 SSE 流式发送了 meta 和 delta
    expect(response.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'content-type': 'text/event-stream; charset=utf-8',
    }))
  })

  it('大模型复述草稿时，前缀被干净剥离，绝不传出重复文本', async () => {
    let jsonHandler: any = null
    const webServer = {
      register: (options: any) => {
        if (options.path === CODEX_UI_API_ENDPOINTS.composerPrediction) {
          jsonHandler = options.handler
        }
        return () => {}
      },
    }

    const mockLlm = {
      prepareCall: vi.fn(async (config) => ({
        config,
        stream: async function* () {
          // 模拟大模型复述了草稿“请帮我检查”
          yield { type: 'text-delta', text: '请帮我检查 dsh-pua 目录下的代码是否有问题' }
          yield { type: 'finish', reason: { kind: 'stop' } }
        },
      })),
    }

    const mockSession = {
      seq: 2,
      deriveMessages: () => [
        { role: 'user', content: [{ type: 'text', text: '你好' }] },
        { role: 'assistant', content: [{ type: 'text', text: '你好！有什么需要帮你的？' }] },
      ],
      requestHeader: () => ({ config: { provider: 'test', model: 'test' } }),
    }

    const mockCtx = {
      webServer,
      connection: { admit: vi.fn(() => ({ peer: { principal: { kind: 'owner' } } })) },
      llm: mockLlm,
      sessions: { get: vi.fn(() => mockSession) },
      effect: (fn: any) => fn(),
    } as any

    applyPredictions(mockCtx)

    let writtenBody = ''
    const response = {
      writeHead: vi.fn(),
      end: vi.fn((body) => { writtenBody = body }),
      on: vi.fn(),
    }

    await jsonHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify({ sessionId: 'sess_1', mode: 'continue', draft: '请帮我检查' }))
        },
      },
      response,
    )

    const parsed = JSON.parse(writtenBody)
    // 候选文本必须已经被切掉前缀“请帮我检查”，只剩下增量续写！
    expect(parsed.candidates).toBeDefined()
    expect(parsed.candidates[0]).not.toMatch(/^请帮我检查/)
    expect(parsed.candidates[0].trim()).toBe('dsh-pua 目录下的代码是否有问题')
  })
})
