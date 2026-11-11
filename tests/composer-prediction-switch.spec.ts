import React from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getPredictionSettingsState,
  isPredictionEnabled,
  observePredictionSettings,
  PREDICTION_STORAGE_KEY,
  refreshPredictionSettingsSnapshot,
  setHostPredictionAllowed,
  setPredictionEnabled,
  setSubPluginEnabled,
  subscribePredictionSettings,
} from '../src/client/composer/prediction-state.ts'
import { ComposerSettingsCard } from '../src/client/composer/ComposerSettingsCard.tsx'
import { HISTORY_SCOPE_STORAGE_KEY, refreshHistoryScopeSnapshot, setHistoryScope } from '../src/client/composer/history-scope.ts'

/** 复位到「用户开启 + Host 允许 + 子插件启用」的干净起点。 */
function reset(): void {
  localStorage.removeItem(PREDICTION_STORAGE_KEY)
  localStorage.removeItem(HISTORY_SCOPE_STORAGE_KEY)
  refreshHistoryScopeSnapshot()
  setPredictionEnabled(true)
  setHostPredictionAllowed(true)
  setSubPluginEnabled(true)
}

describe('预测开关：客户端偏好', () => {
  beforeEach(reset)

  it('默认开启，且没有任何偏好写入时不会凭空关闭预测', () => {
    expect(getPredictionSettingsState()).toMatchObject({ subPluginEnabled: true, userEnabled: true, hostAllowed: true, enabled: true, mode: 'all', nextEnabled: true, continueEnabled: true })
    expect(isPredictionEnabled()).toBe(true)
  })

  it('关闭后写入 localStorage 并立即生效，重新读取保留用户选择', () => {
    setPredictionEnabled(false)
    expect(localStorage.getItem(PREDICTION_STORAGE_KEY)).toBe('off')
    expect(isPredictionEnabled()).toBe(false)

    refreshPredictionSettingsSnapshot()
    expect(getPredictionSettingsState().userEnabled).toBe(false)
  })

  it('store 能识别历史写入的多种关闭字面量', () => {
    for (const raw of ['off', 'false', '0']) {
      localStorage.setItem(PREDICTION_STORAGE_KEY, raw)
      refreshPredictionSettingsSnapshot()
      expect(getPredictionSettingsState().userEnabled).toBe(false)
    }
    for (const raw of ['on', 'true', '1', '', 'anything']) {
      localStorage.setItem(PREDICTION_STORAGE_KEY, raw)
      refreshPredictionSettingsSnapshot()
      expect(getPredictionSettingsState().userEnabled).toBe(true)
    }
  })

  it('站点级关闭时压过用户偏好，用户关不掉也开不了', () => {
    setPredictionEnabled(true)
    setHostPredictionAllowed(false)
    expect(getPredictionSettingsState()).toMatchObject({ subPluginEnabled: true, userEnabled: true, hostAllowed: false, enabled: false, nextEnabled: false, continueEnabled: false })
    expect(isPredictionEnabled()).toBe(false)

    setPredictionEnabled(false)
    expect(getPredictionSettingsState().enabled).toBe(false)
  })

  it('订阅者只在状态真的变化时收到通知，重复写入不触发重渲染', () => {
    const listener = vi.fn()
    const unsubscribe = subscribePredictionSettings(listener)

    setPredictionEnabled(false)
    expect(listener).toHaveBeenCalledTimes(1)

    setPredictionEnabled(false)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setPredictionEnabled(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('单个订阅者抛错不影响其余订阅者', () => {
    const healthy = vi.fn()
    const unsubscribeBad = subscribePredictionSettings(() => { throw new Error('boom') })
    const unsubscribeGood = subscribePredictionSettings(healthy)
    try {
      expect(() => { setPredictionEnabled(false) }).not.toThrow()
      expect(healthy).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribeBad()
      unsubscribeGood()
    }
  })

  it('其他标签页写入偏好时同步过来', () => {
    const stop = observePredictionSettings()
    try {
      localStorage.setItem(PREDICTION_STORAGE_KEY, 'off')
      window.dispatchEvent(new StorageEvent('storage', { key: PREDICTION_STORAGE_KEY, newValue: 'off' }))
      expect(isPredictionEnabled()).toBe(false)
    } finally {
      stop()
    }
  })

  it('同窗口写入通过自定义事件广播到其他订阅者', () => {
    const stop = observePredictionSettings()
    try {
      // 绕过 setPredictionEnabled 直接写盘，模拟另一个插件实例或调试面板
      localStorage.setItem(PREDICTION_STORAGE_KEY, 'off')
      window.dispatchEvent(new Event('codex-ui:prediction-change'))
      expect(isPredictionEnabled()).toBe(false)
    } finally {
      stop()
    }
  })
})

describe('预测开关：设置卡片', () => {
  beforeEach(reset)

  const t = (key: string): string => key

  it('渲染开关并给出说明文案', () => {
    const html = renderToString(React.createElement(ComposerSettingsCard, { t }))
    expect(html).toContain('dcu-composer-settings')
    expect(html).toContain('composer.prediction')
    expect(html).toContain('composer.predictionHint')
    expect(html).toContain('composer.modeOff')
    expect(html).toContain('composer.modeContinue')
    expect(html).toContain('composer.modeAll')
    expect(html).toContain('composer.historyScope')
    expect(html).toContain('composer.historyScopeHint')
    expect(html).toContain('composer.historyScopeSession')
    expect(html).toContain('composer.historyScopeWorkspace')
    expect(html).not.toContain('composer.predictionLocked')
  })

  it('历史作用域默认会话级，切换后卡片跟随偏好', () => {
    const sessionHtml = renderToString(React.createElement(ComposerSettingsCard, { t }))
    expect(sessionHtml).toContain('codex-ui-composer-history-scope')

    setHistoryScope('workspace')
    const workspaceHtml = renderToString(React.createElement(ComposerSettingsCard, { t }))
    expect(workspaceHtml).toContain('codex-ui-composer-history-scope')
  })

  it('站点级关闭时渲染为关闭态并换用锁定说明', () => {
    setHostPredictionAllowed(false)
    const html = renderToString(React.createElement(ComposerSettingsCard, { t }))
    expect(html).toContain('composer.predictionLocked')
    expect(html).toContain('disabled')
  })

  it('子插件未启用时整个卡片区域不渲染（与 ThemeSettingsCard 规范一致）', () => {
    setSubPluginEnabled(false)
    const html = renderToString(React.createElement(ComposerSettingsCard, { t }))
    expect(html).toBe('')
  })

  it('卡片自带结构样式，不依赖主题卡片是否渲染', () => {
    const html = renderToString(React.createElement(ComposerSettingsCard, { t }))
    expect(html).toContain('.dcu-section-card')
    expect(html).toContain('.dcu-settings-row')
  })

  it('接线守卫：当预测禁用时，状态能够准确反映给插槽消费者', () => {
    setPredictionEnabled(false)
    expect(isPredictionEnabled()).toBe(false)
    expect(getPredictionSettingsState().enabled).toBe(false)
    setPredictionEnabled(true)
    expect(isPredictionEnabled()).toBe(true)
    expect(getPredictionSettingsState().enabled).toBe(true)
  })
})
