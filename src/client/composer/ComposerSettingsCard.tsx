import React, { useSyncExternalStore } from 'react'
import { SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives'
import { SECTION_CARD_CSS, SETTINGS_ROW_CSS } from '../section-card-styles.ts'
import {
  PredictionMode,
  getPredictionSettingsState,
  setPredictionMode,
  subscribePredictionSettings,
} from './prediction-state.ts'

export interface ComposerSettingsCardProps {
  t: (key: any) => string
}

/**
 * 输入框增强设置卡片。
 *
 * 只放预测开关：其他能力（↑/↓ 历史、宽度手柄、建议卡片）没有可调项，
 * 用不到就不渲染成灰项，遵循插件「不残留死配置」的既有约定。
 *
 * 站点级关闭（profile `cordis.patch.yml` 里 `config: { prediction: false }`）时，
 * 开关保持可见但置为关闭且禁用，并给出原因提示——比整卡消失更容易排查。
 */
export function ComposerSettingsCard({ t }: ComposerSettingsCardProps): React.JSX.Element | null {
  const state = useSyncExternalStore(subscribePredictionSettings, getPredictionSettingsState, getPredictionSettingsState)

  // 当输入增强子插件在 Host 侧被停用时，遵照规范：设置卡片直接全部隐藏，不渲染任何 DOM（与 ThemeSettingsCard 保持一致）
  if (!state.subPluginEnabled) {
    return null
  }

  const lockedByHost = !state.hostAllowed

  return (
    <div className="dcu-section-card dcu-composer-settings" aria-label={t('composer.title')}>
      <style>{SECTION_CARD_CSS + SETTINGS_ROW_CSS}</style>
      <div className="dcu-section-header">
        <div className="dcu-section-title-wrap">
          <h3 className="dcu-section-title">{t('composer.title')}</h3>
          <p className="dcu-section-desc">{t('composer.desc')}</p>
        </div>
      </div>
      <div className="dcu-settings-row">
        <div className="dcu-settings-row-label">
          <span className="dcu-settings-row-title">{t('composer.prediction')}</span>
          <span className="dcu-settings-row-hint">{lockedByHost ? t('composer.predictionLocked') : t('composer.predictionHint')}</span>
        </div>
        <SegmentedControl<PredictionMode>
          id="codex-ui-composer-prediction-mode"
          label={t('composer.prediction')}
          value={state.mode}
          disabled={lockedByHost}
          options={[
            { value: 'off', label: t('composer.modeOff') },
            { value: 'continue', label: t('composer.modeContinue') },
            { value: 'all', label: t('composer.modeAll') },
          ]}
          onChange={(nextMode) => {
            if (lockedByHost) return
            setPredictionMode(nextMode)
          }}
        />
      </div>
    </div>
  )
}
