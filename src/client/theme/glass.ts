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

/** 玻璃层追加样式（拼在生成 CSS 之后，同特异性下后者胜出）；导出以便契约测试断言 */
export const GLASS_EXTRA_CSS = `
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

/* 轨迹视图保持 100% 满宽排版，严禁被云母浮动模式缩减为居中窄列与圆角卡片 */
[data-dsh-glass-float] [data-dsh-glass-trajectory],
[data-dsh-glass] [data-dsh-glass-trajectory],
[data-dsh-glass] [data-conversation-composer-overlay] {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

/* 彻底清除输入框底部 dock / stats 区域的半透明灰色脏色块与切线 */
[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar] > [class*="dock"]:before,
[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar] > [data-composer-dock]:before,
[data-dsh-glass] [class*="dock"]:before,
[data-dsh-glass] [data-composer-dock]:before {
  display: none !important;
  content: none !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 底盘渐变（与 body 上那份逐字一致）抽成变量挂在 body 上，供「座舱底板」和「云母浮动顶栏」共用：
   这两处都需要一块与页面底色完全一致的实底来遮挡滚过的正文，而 background-attachment: fixed
   能把渐变钉到视口上，画出来与页面底色逐像素一致（实测 RGB 通道差 0），不会产生横向色差。 */
[data-dsh-glass] body {
  --dsh-glass-ground-layers:
    radial-gradient(58% 46% at 18% 6%, color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) calc(12% * var(--dsh-glass-ambience) * var(--dsh-glass-glow,0)), transparent), transparent 68%),
    radial-gradient(48% 42% at 86% 14%, color-mix(in srgb, var(--dsw-alias-state-success-tertiary) calc(10% * var(--dsh-glass-ambience) * var(--dsh-glass-glow,0)), transparent), transparent 62%),
    linear-gradient(165deg, color-mix(in srgb, var(--dsh-glass-ground), var(--dsh-glass-wash-tint) calc(var(--dsh-glass-wash-mix) * var(--dsh-glass-ambience))) 0%, var(--dsh-glass-ground) 55%, color-mix(in srgb, var(--dsh-glass-ground), #000 calc(5% * var(--dsh-glass-ambience))) 100%);
}

/* 输入框座舱遮挡（Issue #69）：玻璃层把宿主 composerSeat 的原生 36px 渐变底板覆盖成了透明，
   向上回看历史时正文会直接穿过输入卡片与底部 dock 区域；参考插件那条 dock 遮罩带又因色差被移除，
   于是两层遮挡同时缺失。这里补回遮挡，拆成「座舱底板 + 上沿渐隐带」两段：
   底板铺与页面底色逐像素一致的底盘（见上），彻底挡住正文且无色带；
   渐隐带用 mask 淡出同一块底盘，高度 16px 是因为实测最后一条消息底部与座舱顶部正好留白 16px，
   只覆盖这段空白，滚到底时不会把最后一条消息一起淡掉。 */
[data-dsh-glass] [data-phase=active] [class*="composerSeat"][class*="composerSeat"],
[data-dsh-glass] [data-content-phase=active] [class*="composerSeat"][class*="composerSeat"] {
  background: var(--dsh-glass-ground-layers);
  background-attachment: fixed;
}

[data-dsh-glass] [data-phase=active] [class*="composerSeat"][class*="composerSeat"]::before,
[data-dsh-glass] [data-content-phase=active] [class*="composerSeat"][class*="composerSeat"]::before {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: 100%;
  height: 16px;
  z-index: -1;
  pointer-events: none;
  background: var(--dsh-glass-ground-layers);
  background-attachment: fixed;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 100%);
}

/* 云母浮动顶栏同一缺陷：顶栏底色只有 52% × frost（clear 预设仅 8.3%）、blur 为 0，
   而浮动排版又用 margin-top:-95px / padding-top:107px 故意让正文从顶栏下方穿过，
   于是正文与「加载更早」之类的胶囊会直接透过顶栏显示。这里沿用座舱同一手法补实底。 */
[data-dsh-glass-float] [data-phase] header:not([class*="headerBlank"]) {
  background: var(--dsh-glass-ground-layers);
  background-attachment: fixed;
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
