import React, { useSyncExternalStore } from 'react'
import { SegmentedControl, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  changeGlass,
  changeTheme,
  getThemeSettingsState,
  isThemeSubPluginEnabled,
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
  subKey: string
  accent: string
  colorScheme: 'light' | 'dark' | 'auto'
}[] = [
  { id: 'stock', labelKey: 'theme.paletteStock', subKey: 'theme.subStock', accent: '#3b82f6', colorScheme: 'auto' },
  { id: 'codex-dark', labelKey: 'theme.paletteCodexDark', subKey: 'theme.subCodexDark', accent: '#339cff', colorScheme: 'dark' },
  { id: 'codex-light', labelKey: 'theme.paletteCodexLight', subKey: 'theme.subCodexLight', accent: '#0169cc', colorScheme: 'light' },
  { id: 'catppuccin-mocha', labelKey: 'theme.paletteMocha', subKey: 'theme.subMocha', accent: '#cba6f7', colorScheme: 'dark' },
  { id: 'catppuccin-macchiato', labelKey: 'theme.paletteMacchiato', subKey: 'theme.subMacchiato', accent: '#c6a0f6', colorScheme: 'dark' },
  { id: 'catppuccin-frappe', labelKey: 'theme.paletteFrappe', subKey: 'theme.subFrappe', accent: '#ca9ee6', colorScheme: 'dark' },
  { id: 'catppuccin-latte', labelKey: 'theme.paletteLatte', subKey: 'theme.subLatte', accent: '#8839ef', colorScheme: 'light' },
]

const stylesheet = `
.dcu-section-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
  background: var(--dsw-alias-bg-layer-2, #18181b);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  margin-bottom: 16px;
}
body:not([data-ds-dark-theme]) .dcu-section-card {
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  border-color: var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
}
html[data-dsh-glass] .dcu-section-card {
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
html[data-dsh-glass] body:not([data-ds-dark-theme]) .dcu-section-card {
  background: var(--dsw-alias-bg-layer-2, #ffffff) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
.dcu-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.dcu-section-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.dcu-section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: var(--dsw-alias-label-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.dcu-section-desc {
  margin: 0;
  font-size: 13px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
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
  grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
  gap: 8px;
}
.dcu-theme-cube {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.02));
  color: var(--dsw-alias-label-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
}
.dcu-theme-cube:hover:not(.selected) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06));
  border-color: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.16));
}
.dcu-theme-cube:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}
/* 选中态：深度融入主题专属强调色与同色发光边框 */
.dcu-theme-cube.selected {
  background: color-mix(in srgb, var(--cube-accent) 14%, var(--dsw-alias-bg-layer-2, #18181b)) !important;
  border-color: var(--cube-accent) !important;
  box-shadow: 0 0 0 1px var(--cube-accent), 0 2px 10px color-mix(in srgb, var(--cube-accent) 25%, transparent) !important;
}
.dcu-theme-cube-head {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: 100%;
}
.dcu-theme-swatch {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background-color: var(--cube-accent);
  box-shadow: 0 0 6px color-mix(in srgb, var(--cube-accent) 45%, transparent);
}
.dcu-theme-cube-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dcu-theme-cube.selected .dcu-theme-cube-title {
  font-weight: 600;
}
.dcu-theme-cube-sub {
  font-size: 11px;
  line-height: 15px;
  color: var(--dsw-alias-label-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.dcu-theme-cube.selected .dcu-theme-cube-sub {
  color: var(--dsw-alias-label-secondary);
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

export function ThemeSettingsCard({ t }: ThemeSettingsCardProps): React.JSX.Element | null {
  const state = useSyncExternalStore(subscribeThemeSettings, getThemeSettingsState, getThemeSettingsState)

  // 当主题子插件在 Host 侧被停用时，遵照规范：设置面板换肤内容直接全部隐藏，不渲染任何 DOM
  if (!state.subPluginEnabled) {
    return null
  }

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
              <button
                key={item.id}
                type="button"
                className={`dcu-theme-cube${isActive ? ' selected' : ''}`}
                style={{ '--cube-accent': item.accent } as React.CSSProperties}
                aria-pressed={isActive}
                onClick={() => {
                  changeTheme(item.id)
                }}
              >
                <div className="dcu-theme-cube-head">
                  <span className="dcu-theme-swatch" aria-hidden="true" />
                  <span className="dcu-theme-cube-title">{t(item.labelKey)}</span>
                </div>
                <span className="dcu-theme-cube-sub">{t(item.subKey)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 排版模式与材质预设：直接常驻展示，无需多余主开关 */}
      <div className="dcu-theme-sub-group">
        {/* 排版模式：原版排版在前，云母效果在后 */}
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
              { value: 'compat', label: t('theme.modeCompat') },
              { value: 'mica', label: t('theme.modeMica') },
            ]}
            onChange={(nextMode) => {
              changeGlass({ mode: nextMode, enabled: true })
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
              changeGlass({ preset: nextPreset, enabled: true })
            }}
          />
        </div>

        {/* 地面光斑（反射光晕）：在渐变地面上叠加柔光反射斑 */}
        <div className="dcu-theme-sub-row">
          <div className="dcu-theme-row-label">
            <span className="dcu-theme-row-title">{t('theme.glassGlow')}</span>
            <span className="dcu-theme-row-hint">{t('theme.glassGlowHint')}</span>
          </div>
          <Switch
            label={t('theme.glassGlow')}
            checked={state.glassGlow}
            onChange={(nextGlow) => {
              changeGlass({ glow: nextGlow, enabled: true })
            }}
          />
        </div>
      </div>
    </div>
  )
}
