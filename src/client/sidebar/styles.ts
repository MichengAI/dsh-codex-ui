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
/* 宿主原生 newSession 和 panelList 统一隐藏，由 Codex UI 在展开与折叠态下全权托管 */
[${SIDEBAR_ACTIVE_ATTR}] button[class*="newSession"],
[${SIDEBAR_ACTIVE_ATTR}] nav[class*="panelList"] {
  display: none !important;
}

/* 宿主侧栏折叠收起态时：.dcu-sb-root 自适应为 36px 居中紧凑纯图标列，显示所有图标！ */
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-root,
[data-sidebar-collapsed="true"] .dcu-sb-root {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 0 2px !important;
}

/* 折叠态每行按钮：收缩为 36px 居中正方形胶囊 */
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-row,
[data-sidebar-collapsed="true"] .dcu-sb-row {
  width: 36px !important;
  min-width: 36px !important;
  max-width: 36px !important;
  height: 36px !important;
  min-height: 36px !important;
  max-height: 36px !important;
  padding: 0 !important;
  margin: 2px auto !important;
  justify-content: center !important;
  border-radius: var(--dsw-radius-md, 8px) !important;
}

/* 折叠态下隐藏纯文本标题、快捷键标签、折叠手风琴触发按钮与次级文字链接 */
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-title,
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-shortcut,
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-chevron,
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-more-trigger,
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-footer-row,
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-divider,
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-empty-drop-hint,
[data-sidebar-collapsed="true"] .dcu-sb-title,
[data-sidebar-collapsed="true"] .dcu-sb-shortcut,
[data-sidebar-collapsed="true"] .dcu-sb-chevron,
[data-sidebar-collapsed="true"] .dcu-sb-more-trigger,
[data-sidebar-collapsed="true"] .dcu-sb-footer-row,
[data-sidebar-collapsed="true"] .dcu-sb-divider,
[data-sidebar-collapsed="true"] .dcu-sb-empty-drop-hint {
  display: none !important;
}

/* 折叠态下：手风琴内容完全平铺展现，所有图标（技能、IM、定时、归档、专家等）全部可见！ */
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-accordion,
[data-sidebar-collapsed="true"] .dcu-sb-accordion {
  display: flex !important;
  flex-direction: column !important;
  grid-template-rows: none !important;
  opacity: 1 !important;
  overflow: visible !important;
  pointer-events: auto !important;
  width: 100% !important;
}

[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-accordion-content,
[data-sidebar-collapsed="true"] .dcu-sb-accordion-content {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  overflow: visible !important;
  width: 100% !important;
}

/* 折叠态下的居中图标 */
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-glyph,
[data-sidebar-collapsed="true"] .dcu-sb-glyph {
  margin: 0 !important;
  width: 18px !important;
  height: 18px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 折叠态下的新会话按钮：常驻高对比度，再也不需要鼠标放上去才显示！ */
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-new-session-row,
[data-sidebar-collapsed="true"] .dcu-sb-new-session-row {
  color: var(--dsw-alias-label-primary) !important;
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08)) !important;
}

[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-new-session-row:hover,
[data-sidebar-collapsed="true"] .dcu-sb-new-session-row:hover {
  background: var(--dsw-alias-interactive-bg-selected, rgba(255, 255, 255, 0.16)) !important;
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
