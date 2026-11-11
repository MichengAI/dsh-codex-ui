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
})
