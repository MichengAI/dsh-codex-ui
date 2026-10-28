/**
 * Codex UI 云母质感（Mica Mode）与玻璃材质预设管理
 * 提供清透（Clear）、标准（Standard）、磨砂（Frosted）三档固定预设。
 */

export type GlassPreset = 'clear' | 'standard' | 'frosted'

export interface GlassPresetSpec {
  id: GlassPreset
  blur: number
  frost: number
}

export const GLASS_PRESETS: Record<GlassPreset, GlassPresetSpec> = {
  clear: { id: 'clear', blur: 0, frost: 0.1 },
  standard: { id: 'standard', blur: 14, frost: 0.28 },
  frosted: { id: 'frosted', blur: 20, frost: 0.5 },
}

const STYLE_TAG_ID = 'dsh-codex-ui-glass-style'

const GLASS_CSS = `
/* Codex UI 云母模式核心规则 */
html[data-codex-glass="true"] {
  --codex-glass-edge: inset 0 1px 0 rgba(255, 255, 255, 0.15);
  --codex-glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

html[data-codex-glass="true"] body {
  background-attachment: fixed;
}

/* 顶栏 Header 玻璃化 */
html[data-codex-glass="true"] header,
html[data-codex-glass="true"] [class*="header"] {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(var(--codex-glass-frost, 0.28) * 100%), transparent) !important;
  backdrop-filter: blur(var(--codex-glass-blur, 14px)) !important;
  -webkit-backdrop-filter: blur(var(--codex-glass-blur, 14px)) !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1) !important;
}

/* 侧边栏 Sidebar 玻璃化 */
html[data-codex-glass="true"] aside,
html[data-codex-glass="true"] [class*="sidebar"],
html[data-codex-glass="true"] [data-sidebar-nav] {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(var(--codex-glass-frost, 0.28) * 100%), transparent) !important;
  backdrop-filter: blur(var(--codex-glass-blur, 14px)) !important;
  -webkit-backdrop-filter: blur(var(--codex-glass-blur, 14px)) !important;
  border-right: 1px solid var(--dsw-alias-border-l1) !important;
}

/* 输入框 Composer 悬浮卡片玻璃化 */
html[data-codex-glass="true"] [class*="composerSeat"] {
  background: transparent !important;
}

html[data-codex-glass="true"] [class*="composer-card"],
html[data-codex-glass="true"] form[class*="composer"] {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(var(--codex-glass-frost, 0.28) * 100%), transparent) !important;
  backdrop-filter: blur(var(--codex-glass-blur, 14px)) !important;
  -webkit-backdrop-filter: blur(var(--codex-glass-blur, 14px)) !important;
  box-shadow: var(--codex-glass-shadow) !important;
  border: 1px solid var(--dsw-alias-border-l2) !important;
}

/* 浮层、弹出菜单与对话框 */
html[data-codex-glass="true"] [role="dialog"],
html[data-codex-glass="true"] [class*="popover"],
html[data-codex-glass="true"] [class*="menu"][role="menu"] {
  backdrop-filter: blur(var(--codex-glass-blur, 14px)) !important;
  -webkit-backdrop-filter: blur(var(--codex-glass-blur, 14px)) !important;
}
`

/**
 * 应用或取消云母模式
 */
export function applyGlassMode(enabled: boolean, preset: GlassPreset = 'standard'): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  if (!enabled) {
    root.removeAttribute('data-codex-glass')
    root.removeAttribute('data-codex-glass-preset')
    root.style.removeProperty('--codex-glass-blur')
    root.style.removeProperty('--codex-glass-frost')
    const tag = document.getElementById(STYLE_TAG_ID)
    if (tag) tag.remove()
    return
  }

  const spec = GLASS_PRESETS[preset] ?? GLASS_PRESETS.standard
  root.setAttribute('data-codex-glass', 'true')
  root.setAttribute('data-codex-glass-preset', spec.id)
  root.style.setProperty('--codex-glass-blur', `${spec.blur}px`)
  root.style.setProperty('--codex-glass-frost', `${spec.frost}`)

  let styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
  if (!styleTag) {
    styleTag = document.createElement('style')
    styleTag.id = STYLE_TAG_ID
    styleTag.textContent = GLASS_CSS
    document.head.appendChild(styleTag)
  }
}

/**
 * 彻底释放云母模式与清理 DOM 遗留
 */
export function disposeGlassMode(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.removeAttribute('data-codex-glass')
  root.removeAttribute('data-codex-glass-preset')
  root.style.removeProperty('--codex-glass-blur')
  root.style.removeProperty('--codex-glass-frost')
  const tag = document.getElementById(STYLE_TAG_ID)
  if (tag) tag.remove()
}
