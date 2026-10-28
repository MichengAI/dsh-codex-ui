import React, { useSyncExternalStore } from 'react'
import { SegmentedControl, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { GlassPreset } from './glass.ts'
import {
  getThemeSettingsState,
  setGlassEnabled,
  setGlassPreset,
  setThemeOption,
  subscribeThemeSettings,
  type ThemeOption,
} from './state.ts'

export interface ThemeSettingsCardProps {
  t: (key: any) => string
}

const stylesheet = `
.dcu-theme-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  margin-bottom: 20px;
}
.dcu-theme-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: var(--dsw-alias-label-primary);
}
.dcu-theme-desc {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.dcu-theme-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.dcu-theme-row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 140px;
}
.dcu-theme-row-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
.dcu-theme-row-hint {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}
.dcu-theme-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-left: 12px;
  border-left: 2px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  flex-wrap: wrap;
}
`

export function ThemeSettingsCard({ t }: ThemeSettingsCardProps): React.JSX.Element {
  const state = useSyncExternalStore(subscribeThemeSettings, getThemeSettingsState)

  return (
    <div className="dcu-theme-settings" aria-label={t('theme.title')}>
      <style>{stylesheet}</style>
      <div>
        <h4 className="dcu-theme-title">{t('theme.title')}</h4>
        <p className="dcu-theme-desc">{t('theme.desc')}</p>
      </div>

      {/* 主题配色切换 */}
      <div className="dcu-theme-row">
        <div className="dcu-theme-row-label">
          <span className="dcu-theme-row-title">{t('theme.palette')}</span>
          <span className="dcu-theme-row-hint">{t('theme.paletteHint')}</span>
        </div>
        <SegmentedControl<ThemeOption>
          id="codex-ui-theme-option"
          label={t('theme.palette')}
          value={state.themeOption}
          options={[
            { value: 'stock', label: t('theme.paletteStock') },
            { value: 'codex-dark', label: t('theme.paletteCodexDark') },
            { value: 'codex-light', label: t('theme.paletteCodexLight') },
          ]}
          onChange={(next) => {
            setThemeOption(next)
          }}
        />
      </div>

      {/* 云母质感开关 */}
      <div className="dcu-theme-row">
        <div className="dcu-theme-row-label">
          <span className="dcu-theme-row-title">{t('theme.glassEnable')}</span>
          <span className="dcu-theme-row-hint">{t('theme.glassHint')}</span>
        </div>
        <Switch
          label={t('theme.glassEnable')}
          checked={state.glassEnabled}
          onChange={(checked) => {
            setGlassEnabled(checked)
          }}
        />
      </div>

      {/* 材质预设（云母模式开启时展示） */}
      {state.glassEnabled && (
        <div className="dcu-theme-sub-row">
          <div className="dcu-theme-row-label">
            <span className="dcu-theme-row-title">{t('theme.glassPreset')}</span>
            <span className="dcu-theme-row-hint">{t('theme.glassPresetHint')}</span>
          </div>
          <SegmentedControl<GlassPreset>
            id="codex-ui-glass-preset"
            label={t('theme.glassPreset')}
            value={state.glassPreset}
            options={[
              { value: 'clear', label: t('theme.presetClear') },
              { value: 'standard', label: t('theme.presetStandard') },
              { value: 'frosted', label: t('theme.presetFrosted') },
            ]}
            onChange={(next) => {
              setGlassPreset(next)
            }}
          />
        </div>
      )}
    </div>
  )
}
