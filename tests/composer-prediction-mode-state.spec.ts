import { beforeEach, describe, expect, it } from 'vitest'
import { PREDICTION_PLACEHOLDER_HIDE_CSS } from '../src/client/composer/ComposerPredictionOverlay.tsx'
import {
  PREDICTION_STORAGE_KEY,
  getPredictionSettingsState,
  parseStoredMode,
  refreshPredictionSettingsSnapshot,
  setHostPredictionAllowed,
  setPredictionEnabled,
  setPredictionMode,
  setSubPluginEnabled,
} from '../src/client/composer/prediction-state.ts'

describe('composer prediction-state: 三态滑动开关模式管理', () => {
  beforeEach(() => {
    localStorage.clear()
    setSubPluginEnabled(true)
    setHostPredictionAllowed(true)
    refreshPredictionSettingsSnapshot()
  })

  it('存储值解析与平滑向下兼容', () => {
    // 关闭态兼容
    expect(parseStoredMode('off')).toBe('off')
    expect(parseStoredMode('false')).toBe('off')
    expect(parseStoredMode('0')).toBe('off')

    // 仅续写
    expect(parseStoredMode('continue')).toBe('continue')

    // 推测+续写及历史开启兼容
    expect(parseStoredMode('all')).toBe('all')
    expect(parseStoredMode('on')).toBe('all')
    expect(parseStoredMode('true')).toBe('all')
    expect(parseStoredMode('1')).toBe('all')
    expect(parseStoredMode(null)).toBe('all')
    expect(parseStoredMode(undefined as any)).toBe('all')
  })

  it('切换到 continue 模式时：enabled 为 true，continueEnabled 为 true，nextEnabled 为 false', () => {
    setPredictionMode('continue')
    const state = getPredictionSettingsState()
    expect(state.mode).toBe('continue')
    expect(state.userEnabled).toBe(true)
    expect(state.enabled).toBe(true)
    expect(state.continueEnabled).toBe(true)
    expect(state.nextEnabled).toBe(false)
    expect(localStorage.getItem(PREDICTION_STORAGE_KEY)).toBe('continue')
  })

  it('切换到 off 模式时：enabled/continueEnabled/nextEnabled 全为 false', () => {
    setPredictionMode('off')
    const state = getPredictionSettingsState()
    expect(state.mode).toBe('off')
    expect(state.userEnabled).toBe(false)
    expect(state.enabled).toBe(false)
    expect(state.continueEnabled).toBe(false)
    expect(state.nextEnabled).toBe(false)
    expect(localStorage.getItem(PREDICTION_STORAGE_KEY)).toBe('off')
  })

  it('切换到 all 模式时：continueEnabled 与 nextEnabled 均为 true', () => {
    setPredictionMode('all')
    const state = getPredictionSettingsState()
    expect(state.mode).toBe('all')
    expect(state.userEnabled).toBe(true)
    expect(state.enabled).toBe(true)
    expect(state.continueEnabled).toBe(true)
    expect(state.nextEnabled).toBe(true)
    expect(localStorage.getItem(PREDICTION_STORAGE_KEY)).toBe('all')
  })

  it('兼容已有的 setPredictionEnabled 调用', () => {
    setPredictionEnabled(false)
    expect(getPredictionSettingsState().mode).toBe('off')
    setPredictionEnabled(true)
    expect(getPredictionSettingsState().mode).toBe('all')
  })

  it('Host 禁用或子插件未启用时，派生生效值全部置为 false', () => {
    setPredictionMode('all')
    setHostPredictionAllowed(false)
    let state = getPredictionSettingsState()
    expect(state.mode).toBe('all') // 用户偏好保留
    expect(state.enabled).toBe(false)
    expect(state.continueEnabled).toBe(false)
    expect(state.nextEnabled).toBe(false)

    setHostPredictionAllowed(true)
    setSubPluginEnabled(false)
    state = getPredictionSettingsState()
    expect(state.enabled).toBe(false)
    expect(state.continueEnabled).toBe(false)
    expect(state.nextEnabled).toBe(false)
  })

  it('Issue #87: 幽灵预测激活时，隐藏原生占位符的 CSS 规则精准契合 DOM 契约且包含完整选择器', () => {
    expect(PREDICTION_PLACEHOLDER_HIDE_CSS).toContain('[data-composer-card]:has([data-composer-prediction])')
    expect(PREDICTION_PLACEHOLDER_HIDE_CSS).toContain('[data-composer-placeholder]')
    expect(PREDICTION_PLACEHOLDER_HIDE_CSS).toContain('visibility:hidden !important')
  })
})
