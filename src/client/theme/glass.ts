/**
 * 玻璃质感（Glassmorphism）与云母模式（Mica）生命周期管理
 * 复用 DSH 官方验证的完整 CSS 规则与 Seam Stamper 打桩机制。
 */
import { GLASS_CSS_TEXT } from './glass-css.gen.ts'
import { startGlassSeamStamper } from './glass-seams.ts'

export type GlassMode = 'mica' | 'compat'
export type GlassPreset = 'clear' | 'standard' | 'frosted'

export interface GlassPresetSpec {
  id: GlassPreset
  blur: number
  frost: number
}

export const GLASS_PRESETS: Record<GlassPreset, GlassPresetSpec> = {
  clear: { id: 'clear', blur: 0, frost: 8 },
  standard: { id: 'standard', blur: 14, frost: 25 },
  frosted: { id: 'frosted', blur: 20, frost: 45 },
}

export const GLASS_ATTRIBUTE = 'data-dsh-glass'
export const GLASS_FLOAT_ATTRIBUTE = 'data-dsh-glass-float'
export const GLASS_COMPAT_ATTRIBUTE = 'data-dsh-glass-compat'

const STYLE_TAG_ID = 'dsh-codex-ui-glass-style'

const GLASS_EXTRA_CSS = `
/* 插件页顶栏色差彻底消除：静止与滚动吸顶均保持底板透明，与全局背景底色与渐变自然融为一体；吸顶时呈现纯净磨砂与细线悬浮效果 */
[data-dsh-glass] [data-plugin-bar]:before,
[data-dsh-glass] [class*="pageBar"]:before {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  transition: background 0.15s ease !important;
}

[data-dsh-glass] [data-plugin-bar][data-scrolled]:before,
[data-dsh-glass] [data-plugin-bar][data-compact]:before,
[data-dsh-glass] [class*="pageBar"][data-scrolled]:before,
[data-dsh-glass] [class*="pageBar"][data-compact]:before {
  background: transparent !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
}

[data-dsh-glass] [data-plugin-bar][data-compact]:after,
[data-dsh-glass] [class*="pageBar"][data-compact]:after,
[data-dsh-glass] [data-plugin-bar][data-scrolled]:after,
[data-dsh-glass] [class*="pageBar"][data-scrolled]:after {
  content: "" !important;
  position: absolute !important;
  inset-inline: 0 !important;
  bottom: 0 !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  pointer-events: none !important;
}
`

let styleTag: HTMLStyleElement | null = null
let seamDisposer: (() => void) | undefined

/**
 * 应用玻璃质感、排版模式与材质预设
 */
export function applyGlassSettings(options: {
  enabled: boolean
  mode?: GlassMode
  preset?: GlassPreset
  glow?: boolean
}): void {
  if (typeof document === 'undefined') return

  const { enabled, mode = 'mica', preset = 'standard', glow = false } = options
  const root = document.documentElement

  if (!enabled) {
    disposeGlassMode()
    return
  }

  // 1. 确保注入完整编译过的 CSS 规则
  if (!styleTag) {
    styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = STYLE_TAG_ID
      styleTag.textContent = GLASS_CSS_TEXT + GLASS_EXTRA_CSS
    }
  }
  if (!styleTag.isConnected) {
    document.head.appendChild(styleTag)
  }

  // 2. 挂载主玻璃标记
  root.setAttribute(GLASS_ATTRIBUTE, '')

  // 3. 挂载排版模式标记（mica 为浮动卡片，compat 为原版排版兼容）
  const isCompat = mode === 'compat'
  root.toggleAttribute(GLASS_FLOAT_ATTRIBUTE, !isCompat)
  root.toggleAttribute(GLASS_COMPAT_ATTRIBUTE, isCompat)

  // 4. 计算并注入预设参数到 <html> 与 <body>
  const spec = GLASS_PRESETS[preset] ?? GLASS_PRESETS.standard
  const knobs: Record<string, string> = {
    '--dsh-glass-blur': `${spec.blur}px`,
    '--dsh-glass-frost': String(Math.min(spec.frost / 50, 1.4)),
    '--dsh-glass-brightness-black': '0',
    '--dsh-glass-brightness-white': '0',
    '--dsh-glass-glow': glow ? '1' : '0',
  }

  for (const [prop, val] of Object.entries(knobs)) {
    root.style.setProperty(prop, val)
  }
  if (document.body) {
    for (const [prop, val] of Object.entries(knobs)) {
      document.body.style.setProperty(prop, val)
    }
  }

  // 5. 启动或维持宿主 DOM 打桩器
  if (!seamDisposer) {
    seamDisposer = startGlassSeamStamper()
  }
}

/** 兼容旧接口 */
export function applyGlassMode(enabled: boolean, preset: GlassPreset = 'standard'): void {
  applyGlassSettings({ enabled, mode: 'mica', preset })
}

/**
 * 彻底释放玻璃质感、清理 DOM 属性与样式标签
 */
export function disposeGlassMode(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.removeAttribute(GLASS_ATTRIBUTE)
  root.removeAttribute(GLASS_FLOAT_ATTRIBUTE)
  root.removeAttribute(GLASS_COMPAT_ATTRIBUTE)

  const knobs = [
    '--dsh-glass-blur',
    '--dsh-glass-frost',
    '--dsh-glass-brightness-black',
    '--dsh-glass-brightness-white',
    '--dsh-glass-glow',
  ]
  for (const prop of knobs) {
    root.style.removeProperty(prop)
  }
  if (document.body) {
    for (const prop of knobs) {
      document.body.style.removeProperty(prop)
    }
  }

  if (seamDisposer) {
    seamDisposer()
    seamDisposer = undefined
  }

  if (styleTag && styleTag.parentNode) {
    styleTag.remove()
    styleTag = null
  }
}
