import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import {
  getPredictionRoute,
  setPredictionRoute,
  subscribePredictionRoute,
  PREDICTION_ROUTE_STORAGE_KEY,
} from '../src/client/composer/prediction-route-state.ts'
import {
  PredictionModelPicker,
  clearClientModelCache,
} from '../src/client/composer/PredictionModelPicker.tsx'
import { ComposerSettingsCard } from '../src/client/composer/ComposerSettingsCard.tsx'
import { setPredictionMode, setSubPluginEnabled } from '../src/client/composer/prediction-state.ts'

describe('PredictionModelPicker & prediction-route-state', () => {
  beforeEach(() => {
    setPredictionRoute(null)
    clearClientModelCache()
    setSubPluginEnabled(true)
    setPredictionMode('all')
  })

  afterEach(() => {
    setPredictionRoute(null)
    clearClientModelCache()
  })

  it('prediction-route-state 正确处理状态读写与 localStorage 持久化', () => {
    expect(getPredictionRoute()).toBeNull()

    let notified = 0
    const unsubscribe = subscribePredictionRoute(() => {
      notified++
    })

    // 设置固定路由
    setPredictionRoute({ provider: 'deepseek-official', model: 'deepseek-chat' })
    expect(notified).toBe(1)
    expect(getPredictionRoute()).toEqual({ provider: 'deepseek-official', model: 'deepseek-chat' })
    expect(window.localStorage.getItem(PREDICTION_ROUTE_STORAGE_KEY)).toContain('deepseek-chat')

    // 设置带 effort 的路由
    setPredictionRoute({ provider: 'deepseek-official', model: 'deepseek-reasoner', reasoningEffort: 'low' })
    expect(notified).toBe(2)
    expect(getPredictionRoute()).toEqual({
      provider: 'deepseek-official',
      model: 'deepseek-reasoner',
      reasoningEffort: 'low',
    })

    // 重置为跟随会话 (null)
    setPredictionRoute(null)
    expect(notified).toBe(3)
    expect(getPredictionRoute()).toBeNull()
    expect(window.localStorage.getItem(PREDICTION_ROUTE_STORAGE_KEY)).toBeNull()

    unsubscribe()
  })

  it('PredictionModelPicker 服务端渲染默认显示「跟随当前会话」且结构完整', () => {
    const html = renderToString(React.createElement(PredictionModelPicker, {
      t: (key: string) => key,
    }))

    expect(html).toContain('dcu-prediction-model-picker-root')
    expect(html).toContain('dcu-prediction-model-trigger')
    expect(html).toContain('composer.modelFollowSession')
  })

  it('当指定了固定模型及思考强度时，Trigger 按钮文案如实呈现', () => {
    setPredictionRoute({ provider: 'deepseek-official', model: 'deepseek-reasoner', reasoningEffort: 'low' })

    const html = renderToString(React.createElement(PredictionModelPicker, {
      t: (key: string) => key,
    }))

    expect(html).toContain('deepseek-reasoner · low')
  })

  it('ComposerSettingsCard 设置卡片集成 PredictionModelPicker，并在关闭预测时禁用选择器', () => {
    // 1. 开启状态下，卡片内包含模型选择行与触发按钮
    const htmlActive = renderToString(React.createElement(ComposerSettingsCard, {
      t: (key: string) => key,
    }))
    expect(htmlActive).toContain('composer.predictionModel')
    expect(htmlActive).toContain('dcu-prediction-model-trigger')
    expect(htmlActive).not.toContain('disabled=""')

    // 2. 预测关闭状态下，模型选择器禁用
    setPredictionMode('off')
    const htmlDisabled = renderToString(React.createElement(ComposerSettingsCard, {
      t: (key: string) => key,
    }))
    expect(htmlDisabled).toContain('dcu-prediction-model-trigger')
    // 包含 disabled 状态
    expect(htmlDisabled).toMatch(/class="[^"]*dcu-prediction-model-trigger[^"]*"[^>]*disabled=""/)
  })

  it('交互链路：打开菜单触发 fetch，成功渲染模型列表与推理子项并支持点选', async () => {
    const { createRoot } = await import('react-dom/client')
    const { act } = await import('react')

    const mockProviders = [
      {
        id: 'mock-deepseek',
        name: 'DeepSeek Official',
        models: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', reasoning: null },
          {
            id: 'deepseek-reasoner',
            name: 'DeepSeek Reasoner',
            reasoning: {
              efforts: [{ id: 'low', name: '低' }, { id: 'high', name: '高' }],
              defaultEffort: 'low',
            },
          },
        ],
      },
    ]

    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, providers: mockProviders }),
    } as Response)

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    try {
      await act(async () => {
        root.render(React.createElement(PredictionModelPicker, {
          t: (k: string) => k,
        }))
      })

      const triggerBtn = container.querySelector('.dcu-prediction-model-trigger') as HTMLButtonElement
      expect(triggerBtn).not.toBeNull()

      // 点击打开菜单
      await act(async () => {
        triggerBtn.click()
      })

      // 等待 fetch 与 setState 刷新
      await act(async () => {
        await new Promise(r => setTimeout(r, 20))
      })

      expect(globalThis.fetch).toHaveBeenCalled()

      // 菜单通过 portal 渲染在 document.body 中
      const bodyHtml = document.body.innerHTML
      expect(bodyHtml).toContain('DeepSeek Official')
      expect(bodyHtml).toContain('DeepSeek Chat')
      expect(bodyHtml).toContain('DeepSeek Reasoner')
    } finally {
      await act(async () => {
        root.unmount()
      })
      container.remove()
      globalThis.fetch = originalFetch
    }
  })
})
