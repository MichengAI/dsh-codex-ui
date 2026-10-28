import React, { useSyncExternalStore } from 'react'
import { Button, SegmentedControl, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  changeGlass,
  changeTheme,
  getThemeSettingsState,
  subscribeThemeSettings,
  type GlassMode,
  type GlassPreset,
  type ThemeOption,
} from './index.ts'

export interface ThemeSettingsCardProps {
  t: (key: any) => string
}

const THEME_BUTTONS: readonly {
  id: ThemeOption
  labelKey: string
  accent: string
  colorScheme: 'light' | 'dark' | 'auto'
}[] = [
  { id: 'stock', labelKey: 'theme.paletteStock', accent: '#3b82f6', colorScheme: 'auto' },
  { id: 'codex-dark', labelKey: 'theme.paletteCodexDark', accent: '#10a37f', colorScheme: 'dark' },
  { id: 'codex-light', labelKey: 'theme.paletteCodexLight', accent: '#10a37f', colorScheme: 'light' },
  { id: 'catppuccin-mocha', labelKey: 'theme.paletteMocha', accent: '#cba6f7', colorScheme: 'dark' },
  { id: 'catppuccin-macchiato', labelKey: 'theme.paletteMacchiato', accent: '#c6a0f6', colorScheme: 'dark' },
  { id: 'catppuccin-frappe', labelKey: 'theme.paletteFrappe', accent: '#ca9ee6', colorScheme: 'dark' },
  { id: 'catppuccin-latte', labelKey: 'theme.paletteLatte', accent: '#8839ef', colorScheme: 'light' },
]

const stylesheet = `
.dcu-theme-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dcu-theme-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dcu-theme-palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
}
.dcu-theme-palette-grid button {
  width: 100% !important;
  justify-content: flex-start !important;
  padding: 0 10px !important;
}
.dcu-theme-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  flex: none;
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
  flex: 1;
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
.dcu-theme-sub-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.02));
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
  border-radius: 8px;
}
.dcu-theme-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.dcu-theme-sub-row [role="tablist"],
.dcu-theme-sub-row [data-slot="segmented-control"] {
  min-width: 240px;
}
`

export function ThemeSettingsCard({ t }: ThemeSettingsCardProps): React.JSX.Element {
  const state = useSyncExternalStore(subscribeThemeSettings, getThemeSettingsState)

  return (
    <div className="dcu-section-card dcu-theme-settings" aria-label={t('theme.title')}>
      <style>{stylesheet}</style>
      <div className="dcu-section-header">
        <div className="dcu-section-title-wrap">
          <h3 className="dcu-section-title">{t('theme.title')}</h3>
          <p className="dcu-section-desc">{t('theme.desc')}</p>
        </div>
      </div>

      {/* 主题配色切换：官方默认 + Codex 2套 + Catppuccin 4套 */}
      <div className="dcu-theme-section">
        <div className="dcu-theme-row-label">
          <span className="dcu-theme-row-title">{t('theme.palette')}</span>
          <span className="dcu-theme-row-hint">{t('theme.paletteHint')}</span>
        </div>
        <div className="dcu-theme-palette-grid" role="group" aria-label={t('theme.palette')}>
          {THEME_BUTTONS.map((item) => {
            const isActive = state.themeOption === item.id
            return (
              <Button
                key={item.id}
                size="sm"
                variant={isActive ? 'primary' : 'outline'}
                aria-pressed={isActive}
                onClick={() => {
                  changeTheme(item.id)
                }}
              >
                <span className="dcu-theme-dot" style={{ backgroundColor: item.accent }} aria-hidden="true" />
                {t(item.labelKey)}
              </Button>
            )
          })}
        </div>
      </div>

      {/* 玻璃质感主开关 */}
      <div className="dcu-theme-row">
        <div className="dcu-theme-row-label">
          <span className="dcu-theme-row-title">{t('theme.glassEnable')}</span>
          <span className="dcu-theme-row-hint">{t('theme.glassHint')}</span>
        </div>
        <Switch
          label={t('theme.glassEnable')}
          checked={state.glassEnabled}
          onChange={(checked) => {
            changeGlass({ enabled: checked })
          }}
        />
      </div>

      {/* 玻璃质感参数子组（当玻璃质感开启时展示） */}
      {state.glassEnabled && (
        <div className="dcu-theme-sub-group">
          {/* 排版模式 */}
          <div className="dcu-theme-sub-row">
            <div className="dcu-theme-row-label">
              <span className="dcu-theme-row-title">{t('theme.mode')}</span>
              <span className="dcu-theme-row-hint">{t('theme.modeHint')}</span>
            </div>
            <SegmentedControl<GlassMode>
              id="codex-ui-glass-mode"
              label={t('theme.mode')}
              value={state.glassMode}
              options={[
                { value: 'mica', label: t('theme.modeMica') },
                { value: 'compat', label: t('theme.modeCompat') },
              ]}
              onChange={(nextMode) => {
                changeGlass({ mode: nextMode })
              }}
            />
          </div>

          {/* 材质预设 */}
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
              onChange={(nextPreset) => {
                changeGlass({ preset: nextPreset })
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
