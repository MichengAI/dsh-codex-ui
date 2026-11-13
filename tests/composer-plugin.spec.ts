import { describe, expect, it, vi, afterEach } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { Context } from '@deepseek-ai/cordis'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { name, apply, isSubPluginDisabledOnDisk, resolvePredictionAllowed } from '../src/composer-plugin.ts'
import { checkComposerEnabled, COMPOSER_ENHANCEMENT_STYLE_ID, observeComposerEnhancements } from '../src/client/composer/index.tsx'
import { ComposerSettingsCard } from '../src/client/composer/ComposerSettingsCard.tsx'
import { setPredictionEnabled, setPredictionMode, setSubPluginEnabled } from '../src/client/composer/prediction-state.ts'
import { CODEX_UI_API_ENDPOINTS } from '../src/business-api.ts'

describe('codex-ui-composer sub-plugin', () => {
  it('子插件元数据命名必须是 codex-ui-composer', () => {
    expect(name).toBe('codex-ui-composer')
  })

  it('宿主插件正确向 webServer 注册 /api/michengai/dsh-codex-ui/composer 端点', () => {
    const ctx = new Context()
    const handlers = new Map<string, (req: unknown, res: { writeHead: (status: number, headers?: Record<string, string>) => void; end: (body?: string) => void }) => void>()

    ctx.provide('webServer', {
      register: (options: { kind: 'exact'; path: string; handler: any }) => {
        handlers.set(options.path, options.handler)
        return () => {
          handlers.delete(options.path)
        }
      },
    } as never)

    apply(ctx)

    expect(handlers.has(CODEX_UI_API_ENDPOINTS.composer)).toBe(true)
    expect(handlers.has(CODEX_UI_API_ENDPOINTS.composerPrediction)).toBe(true)
    expect(handlers.has(CODEX_UI_API_ENDPOINTS.composerPredictionStream)).toBe(true)

    const statusHandler = handlers.get(CODEX_UI_API_ENDPOINTS.composer)
    expect(statusHandler).toBeDefined()

    let responseStatus = 0
    let responseBody = ''
    statusHandler!({}, {
      writeHead: (status) => { responseStatus = status },
      end: (body) => { responseBody = body ?? '' },
    })

    expect(responseStatus).toBe(200)
    expect(typeof JSON.parse(responseBody).enabled).toBe('boolean')
  })

  it('isSubPluginDisabledOnDisk 能准确识别 cordis.patch.yml 中的 disabled 配置', () => {
    const testDir = join(tmpdir(), `dcu-test-${Date.now()}`)
    const desktopProfile = join(testDir, 'profiles', 'desktop')
    mkdirSync(desktopProfile, { recursive: true })
    const ctx = {
      get: (k: string) => (k === 'profileContext' ? { name: 'desktop', dir: desktopProfile } : undefined),
    } as never

    try {
      // 1. 无 disabled 配置
      writeFileSync(join(desktopProfile, 'cordis.patch.yml'), '- id: other\n  config: {}\n', 'utf8')
      expect(isSubPluginDisabledOnDisk('codex-ui-composer', testDir, ctx)).toBe(false)

      // 2. 显式配置 disabled: true
      writeFileSync(join(desktopProfile, 'cordis.patch.yml'), '- id: codex-ui-composer\n  disabled: true\n', 'utf8')
      expect(isSubPluginDisabledOnDisk('codex-ui-composer', testDir, ctx)).toBe(true)

      // 3. 显式配置 disabled: false
      writeFileSync(join(desktopProfile, 'cordis.patch.yml'), '- id: codex-ui-composer\n  disabled: false\n', 'utf8')
      expect(isSubPluginDisabledOnDisk('codex-ui-composer', testDir, ctx)).toBe(false)
    } finally {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('客户端探测与生命周期', () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
      globalThis.fetch = originalFetch
      document.getElementById(COMPOSER_ENHANCEMENT_STYLE_ID)?.remove()
      document.getElementById('dcu-composer-suggestions-mount')?.remove()
    })

    it('当端点返回 200 { enabled: true } 时，探测成功', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: true }),
      } as Response)

      const enabled = await checkComposerEnabled()
      expect(enabled).toBe(true)
    })

    it('当端点返回 200 { enabled: false } 时，探测停用返回 false', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: false }),
      } as Response)

      const enabled = await checkComposerEnabled()
      expect(enabled).toBe(false)
    })

    it('当端点返回 404 或网络不可达时，遵循统一 fail-closed 契约回退原生', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as Response)
      expect(await checkComposerEnabled()).toBe(false)

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      expect(await checkComposerEnabled()).toBe(false)
    })

    it('清理函数不得原生 remove() React portal 节点 .dcu-home-suggestions (Issue #74)', () => {
      // 验证清理逻辑：模拟挂载自建原生手柄与模拟建议卡片节点
      const container = document.createElement('div')
      document.body.appendChild(container)

      const suggestionEl = document.createElement('section')
      suggestionEl.className = 'dcu-home-suggestions'
      container.appendChild(suggestionEl)

      const handleEl = document.createElement('div')
      handleEl.setAttribute('data-dcu-width-handle', '')
      container.appendChild(handleEl)

      // 模拟 observeComposerEnhancements activate 返回的清理逻辑
      // 原生手柄应被原生清理移除
      document.querySelectorAll('[data-dcu-width-handle]').forEach(el => el.remove())
      expect(document.querySelector('[data-dcu-width-handle]')).toBeNull()

      // 而 .dcu-home-suggestions 由 React 完全托管，清理函数中严禁调用 el.remove()
      // 节点必须保持在 container 中由 React 生命周期完成 unmount，parentNode 不得提前变 null
      expect(suggestionEl.parentNode).toBe(container)

      container.remove()
    })

    it('插槽接线防护：PredictionSlot 必须把 prediction 状态（enabled/mode/next/continue）真实透传给 ComposerPredictionOverlay', () => {
      let registeredSlotComponent: any = null
      const fakeCtx = {
        locale: { bind: () => (k: string) => k },
        slots: {
          inject: (_name: string, callback: () => void) => {
            callback()
            return () => {}
          },
          register: (_meta: any, component: any) => {
            if (_meta.name === 'conversation.input.overlay') {
              registeredSlotComponent = component
            }
            return () => {}
          },
        },
      } as any

      const dispose = observeComposerEnhancements(fakeCtx)
      try {
        expect(registeredSlotComponent).toBeDefined()

        let capturedProps: any = null
        function TestWrapper() {
          const el = registeredSlotComponent({ sessionId: 'test-session' })
          capturedProps = el.props
          return null
        }

        // 1. 默认 all 模式下，透传给底层组件的 enabled/next/continue 全部为 true
        setPredictionMode('all')
        renderToString(React.createElement(TestWrapper))
        expect(capturedProps.enabled).toBe(true)
        expect(capturedProps.mode).toBe('all')
        expect(capturedProps.nextEnabled).toBe(true)
        expect(capturedProps.continueEnabled).toBe(true)

        // 2. continue（仅续写）模式下，next 为 false，continue 为 true
        setPredictionMode('continue')
        renderToString(React.createElement(TestWrapper))
        expect(capturedProps.enabled).toBe(true)
        expect(capturedProps.mode).toBe('continue')
        expect(capturedProps.nextEnabled).toBe(false)
        expect(capturedProps.continueEnabled).toBe(true)

        // 3. 当用户关闭预测时，透传给底层组件的 enabled/next/continue 均关闭
        setPredictionMode('off')
        renderToString(React.createElement(TestWrapper))
        expect(capturedProps.enabled).toBe(false)
        expect(capturedProps.mode).toBe('off')
        expect(capturedProps.nextEnabled).toBe(false)
        expect(capturedProps.continueEnabled).toBe(false)
      } finally {
        setPredictionMode('all')
        dispose()
      }
    })

    it('端到端状态驱动：子插件停用时必须通过 sync() 将 subPluginEnabled 置为 false 并整卡隐藏', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: false, prediction: true }),
      } as Response)

      const fakeCtx = {
        locale: { bind: () => (k: string) => k },
        slots: {
          inject: () => () => {},
          register: () => () => {},
        },
      } as any

      setSubPluginEnabled(true)
      const dispose = observeComposerEnhancements(fakeCtx)
      try {
        // 等待 observeComposerEnhancements 内部的 void sync() 异步落定
        await new Promise(resolve => setTimeout(resolve, 80))
        const html = renderToString(React.createElement(ComposerSettingsCard, { t: (k: string) => k }))
        // 若 index.tsx 漏调用 setSubPluginEnabled(status.enabled)，html 不会为空，此断言必红
        expect(html).toBe('')
      } finally {
        dispose()
        setSubPluginEnabled(true)
        globalThis.fetch = originalFetch
      }
    })
  })
})

describe('预测开关：站点级配置 (cordis.patch.yml → codex-ui-composer)', () => {
  function mountPlugin(config?: { prediction?: boolean }) {
    const ctx = new Context()
    const handlers = new Map<string, (req: unknown, res: { writeHead: (status: number, headers?: Record<string, string>) => void; end: (body?: string) => void }) => void>()
    ctx.provide('webServer', {
      register: (options: { kind: 'exact'; path: string; handler: any }) => {
        handlers.set(options.path, options.handler)
        return () => { handlers.delete(options.path) }
      },
    } as never)
    apply(ctx, config)
    return handlers
  }

  function readStatus(handlers: ReturnType<typeof mountPlugin>): { enabled: boolean; prediction: boolean } {
    let body = ''
    handlers.get(CODEX_UI_API_ENDPOINTS.composer)!({}, {
      writeHead: () => {},
      end: (value?: string) => { body = value ?? '' },
    })
    return JSON.parse(body)
  }

  it('未声明配置时默认允许预测，且预测路由照常注册', () => {
    const handlers = mountPlugin()
    expect(handlers.has(CODEX_UI_API_ENDPOINTS.composerPrediction)).toBe(true)
    expect(handlers.has(CODEX_UI_API_ENDPOINTS.composerPredictionStream)).toBe(true)
    expect(readStatus(handlers)).toEqual({ enabled: true, prediction: true })
  })

  it('prediction: false 时状态如实回报，且完全不注册预测路由', () => {
    const handlers = mountPlugin({ prediction: false })
    expect(handlers.has(CODEX_UI_API_ENDPOINTS.composerPrediction)).toBe(false)
    expect(handlers.has(CODEX_UI_API_ENDPOINTS.composerPredictionStream)).toBe(false)
    expect(readStatus(handlers)).toEqual({ enabled: true, prediction: false })
  })

  it('只有显式 false 才关闭，其他取值一律按开启处理', () => {
    expect(resolvePredictionAllowed(undefined)).toBe(true)
    expect(resolvePredictionAllowed({})).toBe(true)
    expect(resolvePredictionAllowed({ prediction: true })).toBe(true)
    expect(resolvePredictionAllowed({ prediction: false })).toBe(false)
    // 配置被写坏时不能误关整条能力
    expect(resolvePredictionAllowed({ prediction: 'false' } as never)).toBe(true)
    expect(resolvePredictionAllowed(null as never)).toBe(true)
  })

  it('透传预测配置至底层引擎：provider/model/reasoningEffort/maxOutputTokens 均生效', async () => {
    const ctx = new Context()
    const handlers = new Map<string, (req: unknown, res: unknown) => void>()
    ctx.provide('webServer', {
      register: (options: { kind: 'exact'; path: string; handler: any }) => {
        handlers.set(options.path, options.handler)
        return () => { handlers.delete(options.path) }
      },
    } as never)

    let capturedCallConfig: any = null
    ctx.provide('llm', {
      resolveModelInfo: vi.fn(async () => ({
        id: 'fast-chat',
        reasoning: { efforts: [{ id: 'low' }, { id: 'high' }] },
      })),
      prepareCall: vi.fn(async (config: any) => {
        capturedCallConfig = config
        return {
          config,
          stream: async function* () {
            yield { type: 'text-delta', text: '建议继续' }
            yield { type: 'finish', reason: { kind: 'stop' } }
          },
        }
      }),
    } as never)

    const mockSession = {
      seq: 1,
      deriveMessages: () => [
        { role: 'user', content: [{ type: 'text', text: 'hello' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'world' }] },
      ],
      requestHeader: () => ({
        // 当前会话使用的是 default-ai / default-model
        config: { provider: 'default-ai', model: 'default-model' },
      }),
    }
    ctx.provide('sessions', {
      get: vi.fn((id: string) => (id === 'sess_override' ? mockSession : undefined)),
    } as never)
    ctx.provide('connection', {
      admit: vi.fn(() => ({ peer: { principal: { kind: 'owner' } } })),
    } as never)

    // 在 cordis.patch.yml 传入固定路由与高级配置
    apply(ctx, {
      prediction: true,
      provider: 'custom-ai',
      model: 'fast-chat',
      reasoningEffort: 'low',
      maxOutputTokens: 64,
    } as any)

    const streamHandler = handlers.get(CODEX_UI_API_ENDPOINTS.composerPredictionStream)
    expect(streamHandler).toBeDefined()

    const response = {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    }

    await streamHandler!(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify({ sessionId: 'sess_override', mode: 'continue', draft: '测试' }))
        },
      },
      response,
    )

    expect(capturedCallConfig).not.toBeNull()
    // 关键验证：必须覆盖当前会话模型，走配置好的固定路由
    expect(capturedCallConfig.provider).toBe('custom-ai')
    expect(capturedCallConfig.model).toBe('fast-chat')
    expect(capturedCallConfig.maxTokens).toBe(64)
    expect(capturedCallConfig.reasoningEffort).toBe('low')
  })

  it('当模型不支持 off 档且未指定 reasoningEffort 时，自动降级至最低档位而非 undefined', async () => {
    const ctx = new Context()
    const handlers = new Map<string, (req: unknown, res: unknown) => void>()
    ctx.provide('webServer', {
      register: (options: { kind: 'exact'; path: string; handler: any }) => {
        handlers.set(options.path, options.handler)
        return () => { handlers.delete(options.path) }
      },
    } as never)

    let capturedCallConfig: any = null
    ctx.provide('llm', {
      resolveModelInfo: vi.fn(async () => ({
        id: 'no-off-model',
        // 只有 low/high/max，没有 off
        reasoning: { efforts: [{ id: 'low' }, { id: 'high' }, { id: 'max' }] },
      })),
      prepareCall: vi.fn(async (config: any) => {
        capturedCallConfig = config
        return {
          config,
          stream: async function* () {
            yield { type: 'text-delta', text: '建议继续' }
            yield { type: 'finish', reason: { kind: 'stop' } }
          },
        }
      }),
    } as never)

    const mockSession = {
      seq: 1,
      deriveMessages: () => [
        { role: 'user', content: [{ type: 'text', text: 'hello' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'world' }] },
      ],
      requestHeader: () => ({
        config: { provider: 'test-ai', model: 'no-off-model' },
      }),
    }
    ctx.provide('sessions', {
      get: vi.fn((id: string) => (id === 'sess_no_off' ? mockSession : undefined)),
    } as never)
    ctx.provide('connection', {
      admit: vi.fn(() => ({ peer: { principal: { kind: 'owner' } } })),
    } as never)

    // 不传 reasoningEffort，使用默认
    apply(ctx)

    const streamHandler = handlers.get(CODEX_UI_API_ENDPOINTS.composerPredictionStream)
    const response = {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    }

    await streamHandler!(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify({ sessionId: 'sess_no_off', mode: 'continue', draft: '测试' }))
        },
      },
      response,
    )

    expect(capturedCallConfig).not.toBeNull()
    // 当模型没有 off 时，必须降级到最低支持档位 'low'，不能留空导致跑高推理
    expect(capturedCallConfig.reasoningEffort).toBe('low')
  })

  it('向 webServer 注册 /api/michengai/dsh-codex-ui/composer/models 端点并返回可用模型目录', async () => {
    const ctx = new Context()
    const handlers = new Map<string, (req: unknown, res: { writeHead: Function; end: Function }) => void>()
    ctx.provide('webServer', {
      register: (options: { kind: 'exact'; path: string; handler: any }) => {
        handlers.set(options.path, options.handler)
        return () => { handlers.delete(options.path) }
      },
    } as never)

    ctx.provide('llm', {
      listProviders: vi.fn(() => [{ id: 'mock-provider', name: 'Mock Provider' }]),
      listModels: vi.fn(async () => [{ id: 'mock-chat', name: 'Mock Chat' }]),
      resolveModelInfo: vi.fn(async () => ({ reasoning: { efforts: [{ id: 'low', name: 'Low' }] } })),
    } as never)

    apply(ctx)

    const modelsHandler = handlers.get(CODEX_UI_API_ENDPOINTS.composerModels)
    expect(modelsHandler).toBeDefined()

    let statusCode = 0
    let body = ''
    await modelsHandler!({}, {
      writeHead: (status: number) => { statusCode = status },
      end: (content: string) => { body = content },
    })

    expect(statusCode).toBe(200)
    const json = JSON.parse(body)
    expect(json.ok).toBe(true)
    expect(json.providers).toHaveLength(1)
    expect(json.providers[0].id).toBe('mock-provider')
    expect(json.providers[0].models[0].id).toBe('mock-chat')
  })

  it('当客户端请求显式指定 route 时，优先采用客户端指定的模型与推理强度', async () => {
    const ctx = new Context()
    const handlers = new Map<string, (req: unknown, res: unknown) => void>()
    ctx.provide('webServer', {
      register: (options: { kind: 'exact'; path: string; handler: any }) => {
        handlers.set(options.path, options.handler)
        return () => { handlers.delete(options.path) }
      },
    } as never)

    let capturedCallConfig: any = null
    ctx.provide('llm', {
      resolveModelInfo: vi.fn(async () => ({
        id: 'client-model',
        reasoning: { efforts: [{ id: 'low' }, { id: 'high' }] },
      })),
      prepareCall: vi.fn(async (config: any) => {
        capturedCallConfig = config
        return {
          config,
          stream: async function* () {
            yield { type: 'text-delta', text: '建议继续' }
            yield { type: 'finish', reason: { kind: 'stop' } }
          },
        }
      }),
    } as never)

    const mockSession = {
      seq: 1,
      deriveMessages: () => [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      requestHeader: () => ({ config: { provider: 'session-provider', model: 'session-model' } }),
    }
    ctx.provide('sessions', {
      get: vi.fn(() => mockSession),
    } as never)
    ctx.provide('connection', {
      admit: vi.fn(() => ({ peer: { principal: { kind: 'owner' } } })),
    } as never)

    // 服务端配置了 host-provider/host-model，但客户端在前端选了 client-ai/client-model
    apply(ctx, {
      prediction: true,
      provider: 'host-provider',
      model: 'host-model',
    } as any)

    const streamHandler = handlers.get(CODEX_UI_API_ENDPOINTS.composerPredictionStream)
    const response = { writeHead: vi.fn(), write: vi.fn(), end: vi.fn(), on: vi.fn() }

    await streamHandler!(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify({
            sessionId: 'sess_1',
            mode: 'continue',
            draft: '测试',
            route: {
              provider: 'client-ai',
              model: 'client-model',
              reasoningEffort: 'high',
            },
          }))
        },
      },
      response,
    )

    expect(capturedCallConfig).not.toBeNull()
    expect(capturedCallConfig.provider).toBe('client-ai')
    expect(capturedCallConfig.model).toBe('client-model')
    expect(capturedCallConfig.reasoningEffort).toBe('high')
  })
})
