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
.dcu-theme-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dcu-theme-palette-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

      {/* 排版模式（当玻璃质感开启时展示） */}
      {state.glassEnabled && (
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
      )}

      {/* 材质预设（当玻璃质感开启时展示，云母与原版排版模式下均可切换） */}
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
            onChange={(nextPreset) => {
              changeGlass({ preset: nextPreset })
            }}
          />
        </div>
      )}
    </div>
  )
}
