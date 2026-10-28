/**
 * Codex UI 侧栏导航专属样式：
 * - 对齐宿主 panelRow 指标：36px 高度、0px 圆角、7px 8px 内边距、8px 间距；
 * - 使用 grid-template-rows 实现原位折叠动画；
 * - 原生减弱动画感知支持；
 * - 拖拽放置指示线样式；
 * - 宿主原生 newSession 与 panelList 靶向隐藏。
 */

export const SIDEBAR_STYLES_ID = 'michengai-codex-ui-sidebar-styles'

export const SIDEBAR_ACTIVE_ATTR = 'data-dcu-sidebar-active'

export const SIDEBAR_CSS = `
/* 仅在展开态隐藏宿主原生 newSession 和 panelList；折叠收缩态 100% 对齐宿主官方 56px 原生导轨 */
[${SIDEBAR_ACTIVE_ATTR}]:not([class*="collapsed"]) button[class*="newSession"],
[${SIDEBAR_ACTIVE_ATTR}]:not([class*="collapsed"]) nav[class*="panelList"] {
  display: none !important;
}

/* 折叠收缩态下隐藏自研导航，完全回退展示宿主原生折叠导轨（自带全部图标与完整生态） */
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-root,
[data-sidebar-collapsed="true"] .dcu-sb-root {
  display: none !important;
}

/* 确保宿主原生 newSession 按钮在折叠态下常驻可见、图标对比度清晰，不依赖 hover */
[data-sidebar-collapsed="true"] button[class*="newSession"],
[class*="collapsed"] button[class*="newSession"] {
  color: var(--dsw-alias-label-primary, inherit) !important;
  opacity: 1 !important;
}

.dcu-sb-root {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 6px;
  font-size: 14px;
  font-family: inherit;
  line-height: inherit;
  color: var(--dsw-alias-label-primary, inherit);
  -webkit-app-region: no-drag !important;
}

.dcu-sb-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  -webkit-app-region: no-drag !important;
}

.dcu-sb-row {
  appearance: none;
  -webkit-appearance: none;
  height: 36px;
  min-height: 36px;
  max-height: 36px;
  padding: 0 10px;
  margin: 1px 2px;
  width: calc(100% - 4px);
  box-sizing: border-box;
  border-radius: var(--dsw-radius-md, 8px);
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--dsw-alias-label-primary, inherit);
  text-align: left;
  font-size: inherit;
  font-family: inherit;
  font-weight: 400;
  text-decoration: none;
  user-select: none;
  -webkit-user-select: none;
  transition: background 150ms ease, color 150ms ease;
  position: relative;
  outline: none;
  -webkit-app-region: no-drag !important;
}

.dcu-sb-row[draggable="true"] {
  cursor: grab;
}

.dcu-sb-row[draggable="true"]:active {
  cursor: grabbing;
}

/* 鼠标悬停胶囊态：对齐宿主交互 hover 底色 */
.dcu-sb-row:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--dsw-alias-label-primary, inherit);
}

.dcu-sb-row:focus-visible {
  outline: 1.5px solid var(--dsw-alias-brand-primary, #4176e6);
  outline-offset: -1px;
}

/* 选中项胶囊高亮态 */
.dcu-sb-row.dcu-sb-row-active {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.12));
  color: var(--dsw-alias-label-primary, inherit);
  font-weight: 500;
}

.dcu-sb-row[data-dragging="true"] {
  opacity: 0.35;
  cursor: grabbing !important;
}

/* 拖拽放置指示线 */
.dcu-sb-row[data-drag-over="before"]::before {
  content: "";
  position: absolute;
  top: -1px;
  left: 6px;
  right: 6px;
  height: 2px;
  border-radius: 1px;
  background: var(--dsw-alias-brand-primary, #4176e6);
  pointer-events: none;
  z-index: 10;
}

.dcu-sb-row[data-drag-over="after"]::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 6px;
  right: 6px;
  height: 2px;
  border-radius: 1px;
  background: var(--dsw-alias-brand-primary, #4176e6);
  pointer-events: none;
  z-index: 10;
}

.dcu-sb-row[data-drag-over="onto"] {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4176e6) 16%, transparent) !important;
  outline: 1.5px dashed var(--dsw-alias-brand-primary, #4176e6) !important;
  outline-offset: -1px;
}

.dcu-sb-drag-ghost {
  position: fixed;
  top: 8px;
  left: -9999px;
  z-index: 10040;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 220px;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-interactive-bg-hover, #2a2a2a);
  color: var(--dsw-alias-label-primary, #fff);
  font-size: 13px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.24);
  white-space: nowrap;
  pointer-events: none;
}

.dcu-sb-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: inherit;
  pointer-events: none;
}

.dcu-sb-glyph svg {
  width: 16px;
  height: 16px;
  display: block;
  pointer-events: none;
}

.dcu-sb-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}

.dcu-sb-shortcut {
  margin-left: auto;
  opacity: 0.65;
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  pointer-events: none;
}

.dcu-sb-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-left: auto;
  color: var(--dsw-alias-label-tertiary, #888);
  transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
  pointer-events: none;
}

.dcu-sb-chevron-open {
  transform: rotate(180deg);
}

.dcu-sb-accordion {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 220ms cubic-bezier(0.2, 0, 0, 1), opacity 160ms ease;
  overflow: hidden;
  -webkit-app-region: no-drag !important;
}

.dcu-sb-accordion.dcu-sb-accordion-open {
  grid-template-rows: 1fr;
  opacity: 1;
  overflow: visible;
}

.dcu-sb-accordion[aria-hidden="true"] {
  pointer-events: none;
}

.dcu-sb-accordion-content {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  -webkit-app-region: no-drag !important;
}

.dcu-sb-accordion.dcu-sb-accordion-open .dcu-sb-accordion-content {
  overflow: visible;
}

.dcu-sb-empty-drop-hint {
  height: 34px;
  border: 1.5px dashed var(--dsw-alias-brand-primary, #4176e6);
  border-radius: var(--dsw-radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--dsw-alias-brand-primary, #4176e6);
  margin: 2px 2px;
  width: calc(100% - 4px);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4176e6) 10%, transparent);
  user-select: none;
  box-sizing: border-box;
}

.dcu-sb-divider {
  height: 0.5px;
  background: var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  margin: 4px 6px;
  box-sizing: border-box;
}

.dcu-sb-footer-row {
  color: var(--dsw-alias-label-secondary, #a1a1aa);
}

.dcu-sb-footer-row:hover {
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
}

@media (prefers-reduced-motion: reduce) {
  .dcu-sb-accordion,
  .dcu-sb-chevron,
  .dcu-sb-row {
    transition: none !important;
  }
}
`

export function injectSidebarStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const existing = document.getElementById(SIDEBAR_STYLES_ID)
  if (existing) return () => {}

  const style = document.createElement('style')
  style.id = SIDEBAR_STYLES_ID
  style.textContent = SIDEBAR_CSS
  document.head.appendChild(style)

  return () => {
    style.remove()
  }
}
