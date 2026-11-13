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
})
