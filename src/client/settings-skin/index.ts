import type { Context } from '@deepseek-ai/cordis'
import React from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { classifySettingsButton, SETTINGS_NAV_GROUPS } from './model.ts'
import { getNavSearchQuery, setNavSearchQuery, subscribeNavSearch, setSkinEnabledState, SettingsNavHeader } from './SettingsNavHeader.tsx'
import { en, zh, NS } from '../locales.ts'

export const SETTINGS_SKIN_STYLE_ID = 'dcu-official-settings-skin'

export const SETTINGS_SKIN_CSS = `
/* 全屏工作台 Presentation 遮罩层铺满 */
body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"] {
  position: fixed !important;
  inset: 0 !important;
  z-index: 1000 !important;
  display: flex !important;
  align-items: stretch !important;
  justify-content: stretch !important;
  padding: 0 !important;
  background-color: transparent !important;
}

/* 模态框外壳：全屏 100vw x 100vh 工作台形态 */
[data-shortcut-modal="settings"] {
  box-sizing: border-box !important;
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 0 !important;
  border: none !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  box-shadow: none !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: row !important;
}

/* 桌面平台窗口标题栏避让：在具有 Windows/macOS 顶栏的环境下平滑下移，绝不遮盖或截断内容与操作区 */
html[data-platform="darwin"] body > [role="presentation"]:not(#root) {
  -webkit-app-region: initial;
}

/* 桌面平台窗口标题栏避让：单点锁定在 [data-shortcut-modal="settings"]，绝无重复，也绝不冲顶 */
html[data-windows-titlebar]:not([data-fullscreen]) [data-shortcut-modal="settings"] {
  top: var(--dsh-windows-titlebar-height, var(--dsh-frame-chrome-top, 40px)) !important;
  height: calc(100vh - var(--dsh-windows-titlebar-height, var(--dsh-frame-chrome-top, 40px))) !important;
}

html[data-platform="darwin"]:not([data-fullscreen]) [data-shortcut-modal="settings"] {
  top: var(--dsh-frame-top-clearance, 38px) !important;
  height: calc(100vh - var(--dsh-frame-top-clearance, 38px)) !important;
}

/* 左侧整列侧栏：与首页侧栏严格等宽，底色对齐 --dsw-specific-sidebar-fill */
[data-shortcut-modal="settings"] > nav {
  box-sizing: border-box !important;
  width: var(--dcu-settings-nav-width, 280px) !important;
  min-width: var(--dcu-settings-nav-width, 280px) !important;
  max-width: var(--dcu-settings-nav-width, 280px) !important;
  flex-shrink: 0 !important;
  gap: 12px !important;
  padding: 16px 12px 24px !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #121214)) !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

/* 设置工作台必须使用实色不透明底板，严禁半透明导致底层文本透出重影 */
[data-shortcut-modal="settings"] {
  background: var(--dsw-alias-bg-base, #151517) !important;
}

[data-shortcut-modal="settings"] > div:not(nav) {
  background: var(--dsw-alias-bg-base, #151517) !important;
}

/* 玻璃质感/原版兼容排版模式（Compat） */
html[data-dsh-glass]:not([data-dsh-glass-float]) [data-shortcut-modal="settings"] {
  background: var(--dsw-alias-bg-base, #151517) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

html[data-dsh-glass]:not([data-dsh-glass-float]) [data-shortcut-modal="settings"] > nav {
  background: color-mix(
    in srgb,
    var(--dsw-specific-sidebar-fill, #181825) 85%,
    var(--dsw-alias-bg-base, #09090b)
  ) !important;
  backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.05) !important;
}

html[data-dsh-glass]:not([data-dsh-glass-float]) [data-shortcut-modal="settings"] > div:not(nav) {
  background: var(--dsw-alias-bg-base, #151517) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 云母悬浮模式（Mica Mode）：设置面板全面升华为与首页一致的悬浮双岛体系 */
html[data-dsh-glass-float] body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"] {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 卡片背后的全局画布：完全对齐首页的漫反射温润云母底板（Glow 1 + Glow 2 + Wash 深度渐变） */
html[data-dsh-glass-float] [data-shortcut-modal="settings"] {
  background:
    radial-gradient(58% 46% at 18% 6%,
      color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color, #0169cc)
        calc(12% * var(--dsh-glass-ambience, 1) * var(--dsh-glass-glow, 1)), transparent), transparent 68%),
    radial-gradient(48% 42% at 86% 14%,
      color-mix(in srgb, var(--dsw-alias-brand-primary, #339cff)
        calc(10% * var(--dsh-glass-ambience, 1) * var(--dsh-glass-glow, 1)), transparent), transparent 62%),
    linear-gradient(165deg,
      color-mix(in srgb, var(--dsh-glass-ground, var(--dsw-alias-bg-base)), var(--dsh-glass-wash-tint, #ffffff)
        calc(var(--dsh-glass-wash-mix, 22%) * var(--dsh-glass-ambience, 1))) 0%,
      var(--dsh-glass-ground, var(--dsw-alias-bg-base)) 55%,
      color-mix(in srgb, var(--dsh-glass-ground, var(--dsw-alias-bg-base)), #000000 calc(5% * var(--dsh-glass-ambience, 1))) 100%) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 左侧导航悬浮岛：与首页侧边栏严格对齐几何形态、12px外边距、16px圆角与微高光 */
html[data-dsh-glass-float] [data-shortcut-modal="settings"] > nav {
  box-sizing: border-box !important;
  width: calc(var(--dcu-settings-nav-width, 280px) - 24px) !important;
  min-width: calc(var(--dcu-settings-nav-width, 280px) - 24px) !important;
  max-width: calc(var(--dcu-settings-nav-width, 280px) - 24px) !important;
  margin: 8px 12px 12px 12px !important;
  height: calc(100% - 20px) !important;
  max-height: calc(100% - 20px) !important;
  border-radius: 16px !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  background: var(--dsh-glass-card, var(--dsw-alias-bg-layer-1)) !important;
  backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  overflow: hidden !important;
}

/* 右侧工作台悬浮岛：独立大圆角卡片，浅色为纯净微光白，深色为深邃灰，与首页悬浮实体完全一致 */
html[data-dsh-glass-float] [data-shortcut-modal="settings"] > div:not(nav) {
  margin: 8px 12px 12px 0 !important;
  height: calc(100% - 20px) !important;
  max-height: calc(100% - 20px) !important;
  border-radius: 16px !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  background: var(--dsw-alias-bg-layer-1) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  overflow: hidden !important;
}

/* 云母模式下收敛顶部工具栏与内容区 padding，消除脱节大空隙 */
html[data-dsh-glass-float] [data-shortcut-modal="settings"] > div:not(nav) > :first-child {
  height: 48px !important;
  min-height: 48px !important;
  padding: 0 24px !important;
  background: var(--dsw-alias-bg-layer-1) !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) {
  padding: 16px 36px 48px !important;
  background: var(--dsw-alias-bg-layer-1) !important;
}

html[data-platform="darwin"] [data-shortcut-modal="settings"] > nav {
  background: var(--dsw-specific-sidebar-fill, transparent) !important;
}

/* 顶部标题与搜索区插槽容器 */
[data-shortcut-modal="settings"] > nav > :first-child {
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
  flex: none !important;
}

.dcu-settings-nav-header-root {
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
  width: 100% !important;
}

/* 顶部标题与返回栏：拉平左对齐基线，垂直水平对齐 */
.dcu-settings-nav-header-top {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  height: 28px !important;
  padding: 0 !important;
}

.dcu-settings-back-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: var(--dsw-radius-sm, 6px) !important;
  background: transparent !important;
  border: none !important;
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  cursor: pointer !important;
  padding: 0 !important;
  transition: color 0.12s ease, background 0.12s ease !important;
}

.dcu-settings-back-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06)) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

.dcu-settings-nav-header-title {
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 28px !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  letter-spacing: -0.01em !important;
  user-select: none !important;
}

/* 搜索框容器与宿主原生 Input 规范对齐 */
.dcu-settings-search-wrapper {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
}

.dcu-settings-search-icon {
  width: 14px !important;
  height: 14px !important;
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  pointer-events: none !important;
}

/* 宿主原生 Input 组件全宽容器与 Token 规范 */
.dcu-settings-search-input {
  box-sizing: border-box !important;
  display: inline-flex !important;
  width: 100% !important;
  height: 32px !important;
  border-radius: var(--dsw-radius-md, 8px) !important;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.05)) !important;
  border: 0.5px solid var(--dsw-alias-border-l4, rgba(255, 255, 255, 0.08)) !important;
  transition: border-color 0.12s ease, background-color 0.12s ease !important;
}

.dcu-settings-search-input:focus-within {
  border-color: var(--dsw-alias-state-business-primary, var(--dsw-static-deepseek-500, #4176e6)) !important;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.08)) !important;
}

.dcu-settings-search-input input {
  font-size: 13px !important;
  line-height: 20px !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

.dcu-settings-search-input input::placeholder {
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  font-size: 13px !important;
}

/* 导航项列表容器 */
[data-shortcut-modal="settings"] > nav > :nth-child(2) {
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding: 4px 0 32px !important;
}

/* 分组小标题：字号12px、中灰、标准大小写、呼吸留白 */
.dcu-settings-nav-group-header {
  box-sizing: border-box !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  letter-spacing: normal !important;
  text-transform: none !important;
  padding: 16px 10px 6px !important;
  user-select: none !important;
}

.dcu-settings-nav-group-header:first-of-type {
  padding-top: 6px !important;
}

/* 空搜索提示 */
.dcu-settings-nav-empty {
  padding: 24px 10px;
  font-size: 13px;
  color: var(--dsw-alias-label-tertiary, #71717a);
  text-align: center;
  user-select: none;
}

/* 导航项按钮：Codex 原生胶囊形态（Capsule） */
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button {
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  height: 32px !important;
  min-height: 32px !important;
  padding-inline: 10px !important;
  border-radius: var(--dsw-radius-sm, 6px) !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  color: var(--dsw-alias-label-secondary, #d4d4d8) !important;
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  transition: background 0.12s ease, color 0.12s ease !important;
  text-align: left !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button svg {
  width: 16px !important;
  height: 16px !important;
  flex-shrink: 0 !important;
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  stroke-width: 1.5 !important;
  transition: color 0.12s ease !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:hover {
  background: var(--dsw-specific-sidebar-nav-item-hover, var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.05))) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:hover svg {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

/* 选中菜单项：纯正 Codex 胶囊激活态（Capsule Pill） */
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[aria-current="true"],
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[class*="active"] {
  background: var(--dsw-specific-sidebar-nav-item-active, var(--dsw-alias-interactive-bg-selected, rgba(255, 255, 255, 0.10))) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  font-weight: 500 !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[aria-current="true"] svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[class*="active"] svg {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:focus-visible {
  outline: 2px solid var(--dsw-alias-state-focus-ring, var(--dsw-static-deepseek-500, #4176e6)) !important;
  outline-offset: 1px !important;
}

/* 右侧内容工作区 */
[data-shortcut-modal="settings"] > div:not(nav) {
  display: flex !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  height: 100% !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child {
  box-sizing: border-box !important;
  height: 56px !important;
  min-height: 56px !important;
  padding: 0 32px !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.07)) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child h2,
[data-shortcut-modal="settings"] > div:not(nav) > :first-child span {
  font-size: 16px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
  letter-spacing: -0.01em;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child button,
[data-shortcut-modal="settings"] > div:not(nav) > :first-child a {
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  transition: color 0.15s ease;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child button:hover,
[data-shortcut-modal="settings"] > div:not(nav) > :first-child a:hover {
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) {
  box-sizing: border-box !important;
  min-height: 0 !important;
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  padding: 32px 48px 64px !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

/* 右侧设置区固定宽度规范：居中排版，避免宽屏下拉伸 */
[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) > * {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
  box-sizing: border-box !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) > * > * {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
  box-sizing: border-box !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) [class*="section"] {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
}

@media (max-width: 640px) {
  body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"] {
    padding: 0;
  }

  [data-shortcut-modal="settings"] {
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    border-radius: 0;
    border: none;
    flex-direction: column;
  }

  [data-shortcut-modal="settings"] > nav {
    width: 100%;
    min-width: 0;
    gap: 10px;
    padding: 12px 16px 8px;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  [data-shortcut-modal="settings"] > nav > :first-child { padding-inline: 4px; }

  [data-shortcut-modal="settings"] > nav > :nth-child(2) {
    flex-direction: row;
    overflow-x: auto;
  }

  [data-shortcut-modal="settings"] > nav > :nth-child(2) > button { flex: 0 0 auto; }

  [data-shortcut-modal="settings"] > div > :first-child { height: 48px; min-height: 48px; padding: 0 16px; }

  [data-shortcut-modal="settings"] > div > :nth-child(2) { padding: 16px; }
}
`

/** 探测宿主 settings-skin 子组件是否处于激活状态 */
export async function checkSettingsSkinEnabled(): Promise<boolean> {
  try {
    const response = await fetch('/api/michengai/dsh-codex-ui/settings-skin', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return false
    const data = await response.json()
    return data?.enabled === true
  } catch {
    // 无法连通 /api/michengai/dsh-codex-ui/settings-skin（例如子组件被停用导致端点不存在、或网络断开），坚决返回 false！
    return false
  }
}

/** 注入 Codex 1:1 设置皮肤样式 */
export function installSettingsSkin(doc: Document = document): () => void {
  const existing = doc.getElementById(SETTINGS_SKIN_STYLE_ID)
  if (existing !== null) return () => { existing.remove() }
  const style = doc.createElement('style')
  style.id = SETTINGS_SKIN_STYLE_ID
  style.textContent = SETTINGS_SKIN_CSS
  ;(doc.head ?? doc.documentElement).appendChild(style)
  return () => { if (style.parentNode !== null) style.remove() }
}

/** 彻底卸载 Codex 设置皮肤并清理 DOM 样式节点 */
export function uninstallSettingsSkin(doc: Document = document): void {
  const existing = doc.getElementById(SETTINGS_SKIN_STYLE_ID)
  if (existing !== null) {
    existing.remove()
  }
}

/** 宿主官方侧栏标准默认展开宽度为 280px，可拖拽下限为 264px */
export const DEFAULT_SIDEBAR_WIDTH = 280
export const MIN_SIDEBAR_WIDTH = 264

/**
 * 探测宿主首页主侧栏的展开宽度（默认 280px，最小 264px）
 * 1. 优先解析 AppFrame 上的 gridTemplateColumns（如 280px minmax(...) ...）；
 * 2. 其次读取宿主 Windows 标题栏或侧栏 CSS 变量；
 * 3. 再次直接测量宿主侧栏 DOM 容器元素的实际宽度；
 * 4. 若侧栏处于折叠状态（56px / 0px）或未找到，则安全回退至宿主官方标准默认宽度 280px。
 */
export function getHostSidebarExpandedWidth(doc: Document = document): number {
  if (!doc) return DEFAULT_SIDEBAR_WIDTH

  // 1. 尝试从 AppFrame 元素行内 gridTemplateColumns 解析
  try {
    for (const node of doc.querySelectorAll<HTMLElement>('div')) {
      const grid = node.style?.gridTemplateColumns
      if (grid && grid.includes('minmax')) {
        const match = /^(\d+(?:\.\d+)?)px\s+/.exec(grid.trim())
        if (match) {
          const parsed = Number(match[1])
          if (Number.isFinite(parsed) && parsed >= MIN_SIDEBAR_WIDTH) {
            return parsed
          }
        }
      }
    }
  } catch {
    // 忽略异常
  }

  // 2. 尝试从宿主 CSS 变量读取
  try {
    const rootStyle = doc.documentElement ? getComputedStyle(doc.documentElement) : null
    if (rootStyle) {
      const winWidth = Number.parseFloat(rootStyle.getPropertyValue('--dsh-windows-sidebar-width'))
      if (Number.isFinite(winWidth) && winWidth >= MIN_SIDEBAR_WIDTH) return winWidth
      const hostWidth = Number.parseFloat(rootStyle.getPropertyValue('--dsh-sidebar-width'))
      if (Number.isFinite(hostWidth) && hostWidth >= MIN_SIDEBAR_WIDTH) return hostWidth
    }
  } catch {
    // 忽略异常
  }

  // 3. 尝试直接测量 DOM 侧栏容器
  try {
    const sidebarEl = doc.querySelector<HTMLElement>('[data-slot="sidebar"]')
      ?? doc.querySelector<HTMLElement>('div[class*="sidebarCol"]')
      ?? doc.querySelector<HTMLElement>('div[class*="hHd-Xa_root"]')
    if (sidebarEl) {
      const measured = sidebarEl.getBoundingClientRect?.().width
      if (typeof measured === 'number' && Number.isFinite(measured) && measured >= MIN_SIDEBAR_WIDTH) {
        return measured
      }
    }
  } catch {
    // 忽略异常
  }

  return DEFAULT_SIDEBAR_WIDTH
}

/**
 * 对宿主动态生成的菜单按钮执行无侵入的已知项分组与搜索过滤
 */
export function decorateSettingsNav(panelEl: HTMLElement): () => void {
  // 同步主侧栏展开宽度至模态框，确保侧栏无位移晃动
  const sidebarWidth = getHostSidebarExpandedWidth(panelEl.ownerDocument || document)
  panelEl.style.setProperty('--dcu-settings-nav-width', `${sidebarWidth}px`)

  const navHeader = panelEl.querySelector<HTMLElement>('nav > :first-child')
  const navList = panelEl.querySelector<HTMLElement>('nav > :nth-child(2)')
  if (!navList) return () => {}

  const isZh = (document.documentElement.lang || 'zh').startsWith('zh')

  // 1. 装饰顶部 Header（返回箭头 + 搜索框，挂载 React 宿主原生 Input 原语）
  let cleanHeader = () => {}
  if (navHeader && !navHeader.querySelector('.dcu-settings-nav-header-root')) {
    const originalChildren = Array.from(navHeader.childNodes)
    originalChildren.forEach(child => {
      if (child instanceof HTMLElement) child.style.display = 'none'
    })

    const headerRoot = document.createElement('div')
    headerRoot.className = 'dcu-settings-nav-header-root'

    render(React.createElement(SettingsNavHeader), headerRoot)
    navHeader.appendChild(headerRoot)

    cleanHeader = () => {
      unmountComponentAtNode(headerRoot)
      headerRoot.remove()
      originalChildren.forEach(child => {
        if (child instanceof HTMLElement) child.style.removeProperty('display')
      })
    }
  }

  // 2. 注入三组分组小标题（若不存在）
  for (const group of SETTINGS_NAV_GROUPS) {
    if (!navList.querySelector(`[data-dcu-group-header="${group.id}"]`)) {
      const header = document.createElement('div')
      header.className = 'dcu-settings-nav-group-header'
      header.setAttribute('data-dcu-group-header', group.id)
      header.style.setProperty('order', String(group.order))
      header.textContent = isZh ? group.defaultZh : group.defaultEn
      navList.appendChild(header)
    }
  }

  // 3. 注入空状态提示（若不存在）
  let emptyTip = navList.querySelector<HTMLElement>('[data-dcu-group-empty]')
  if (!emptyTip) {
    emptyTip = document.createElement('div')
    emptyTip.className = 'dcu-settings-nav-empty'
    emptyTip.setAttribute('data-dcu-group-empty', '')
    emptyTip.style.setProperty('order', '999')
    emptyTip.style.display = 'none'
    emptyTip.textContent = isZh ? zh['settings.noResults'] : en['settings.noResults']
    navList.appendChild(emptyTip)
  }

  // 4. 归类并赋 order 给宿主生成的每个 button
  const classifyButtons = () => {
    const buttons = navList.querySelectorAll<HTMLButtonElement>(':scope > button')
    buttons.forEach((btn, index) => {
      const label = btn.querySelector('span')?.textContent?.trim() ?? btn.textContent?.trim() ?? ''
      const group = classifySettingsButton(label)
      const baseOrder = group === 'personal' ? 100 : group === 'records' ? 300 : 200
      btn.style.setProperty('order', String(baseOrder + 1 + index))
      btn.setAttribute('data-dcu-group', group)
    })
  }
  classifyButtons()

  // 5. 搜索过滤联动
  const applyFilter = (query: string) => {
    const trimmed = query.trim().toLowerCase()
    const buttons = navList.querySelectorAll<HTMLButtonElement>(':scope > button')
    let totalVisible = 0

    for (const btn of buttons) {
      const label = (btn.querySelector('span')?.textContent ?? btn.textContent ?? '').toLowerCase()
      if (trimmed === '') {
        btn.style.removeProperty('display')
        totalVisible += 1
      } else {
        const matches = label.includes(trimmed)
        if (matches) {
          btn.style.removeProperty('display')
          totalVisible += 1
        } else {
          btn.style.setProperty('display', 'none', 'important')
        }
      }
    }

    for (const group of SETTINGS_NAV_GROUPS) {
      const header = navList.querySelector<HTMLElement>(`[data-dcu-group-header="${group.id}"]`)
      if (header) {
        if (trimmed === '') {
          header.style.removeProperty('display')
        } else {
          const visibleCount = [...navList.querySelectorAll<HTMLButtonElement>(`button[data-dcu-group="${group.id}"]`)]
            .filter(b => b.style.display !== 'none').length
          if (visibleCount > 0) {
            header.style.removeProperty('display')
          } else {
            header.style.setProperty('display', 'none', 'important')
          }
        }
      }
    }

    if (emptyTip) {
      emptyTip.style.setProperty('display', totalVisible === 0 ? 'block' : 'none', 'important')
    }
  }

  applyFilter(getNavSearchQuery())
  const unsubSearch = subscribeNavSearch(applyFilter)

  // 6. 监听宿主后续异步动态追加的 button
  const navObserver = new MutationObserver(() => {
    classifyButtons()
    applyFilter(getNavSearchQuery())
  })
  navObserver.observe(navList, { childList: true })

  return () => {
    cleanHeader()
    unsubSearch()
    navObserver.disconnect()
    navList.querySelectorAll('[data-dcu-group-header], [data-dcu-group-empty]').forEach(el => el.remove())
    navList.querySelectorAll<HTMLButtonElement>(':scope > button').forEach(btn => {
      btn.style.removeProperty('order')
      btn.style.display = ''
      btn.removeAttribute('data-dcu-group')
    })
  }
}

/**
 * 观察设置弹层的挂载并与子组件生命周期同步
 * 返回 Disposer，卸载时彻底移除 Observer、装饰器与注入样式
 */
export function observeSettingsSkin(_ctx?: Context): () => void {
  let disposed = false
  let cleanDecorator: (() => void) | undefined

  const sync = async (): Promise<void> => {
    if (disposed) return
    const enabled = await checkSettingsSkinEnabled()
    if (disposed) return
    setSkinEnabledState(enabled)
    if (enabled) {
      installSettingsSkin(document)
      const modal = document.querySelector<HTMLElement>('[data-shortcut-modal="settings"]')
      if (modal) {
        cleanDecorator?.()
        cleanDecorator = decorateSettingsNav(modal)
      }
    } else {
      cleanDecorator?.()
      cleanDecorator = undefined
      uninstallSettingsSkin(document)
    }
  }

  // 仅当 DOM 中已存在设置弹层时才触发同步，避免应用启动时在后台触发多余的网络探测与样式加载
  if (typeof document !== 'undefined' && document.querySelector('[data-shortcut-modal="settings"]')) {
    void sync()
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.getAttribute('data-shortcut-modal') === 'settings' || node.querySelector('[data-shortcut-modal="settings"]')) {
            void sync()
            return
          }
        }
      }
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    disposed = true
    observer.disconnect()
    cleanDecorator?.()
    setSkinEnabledState(false)
    uninstallSettingsSkin(document)
  }
}
