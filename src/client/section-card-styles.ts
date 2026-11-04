/**
 * 设置页卡片的共享结构样式。
 *
 * `AboutSection` 下的每张卡片（如 `ThemeSettingsCard`、`ComposerSettingsCard`）均统一引用本模块，
 * 保证单一事实源，避免重复定义与样式漂移。
 */
export const SECTION_CARD_CSS = `
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
`

/** 设置行（左文案 + 右侧控件）。与 `.dcu-theme-row` 同构，命名独立以免互相依赖。 */
export const SETTINGS_ROW_CSS = `
.dcu-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.dcu-settings-row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.dcu-settings-row-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
}
.dcu-settings-row-hint {
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-label-tertiary);
}
`
