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

// 上游压缩样式仍作为基线保存；仅将输入卡片的玻璃面迁移到自有节点。
const GLASS_COMPOSER_CSS = GLASS_CSS_TEXT
  .replaceAll('[data-dsh-glass-float] [data-composer-card]:before', '[data-dsh-glass-float] [data-composer-card] > [data-dcu-glass-composer-surface]')
  .replaceAll('[data-dsh-glass-compat] [data-composer-card]:before', '[data-dsh-glass-compat] [data-composer-card] > [data-dcu-glass-composer-surface]')

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

/* 云母浮动顶栏：浮动排版把滚动内容上提 95px，让它从顶栏下方穿过。
   ⚠ 绝对禁止在滚动容器 [data-conversation-scroll] 上使用 mask-image / clip-path 做顶部淡出：
   Chromium 会让被遮罩的元素成为 backdrop root，导致其内部所有 backdrop-filter（输入卡片、
   底部 dock 磨砂幕布）全部失效 —— 实测在真实宿主里把它设成 blur(24px) 后画面几乎没有任何
   变化（拉普拉斯方差仅降 17%），去掉 mask 后同一处方差降 86%，云母输入框恢复正常磨砂。
   这正是「还是透」的真因：兜底模糊一直在，只是被 mask 变成惰性。
   因此顶部遮挡改为与对标插件一致的做法：不给滚动容器加遮罩，只把顶栏自己的磨砂设为下限值，
   让从顶栏背后穿过的正文被磨砂化开。 */
[data-dsh-glass-float] [data-phase] header:not([class*="headerBlank"]) {
  backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
  -webkit-backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
}

/* 对齐平铺风格（Compat）防漏字规范：将云母输入框卡片底色提升为高遮蔽度的 card-raised，
   并锁定至少 12px 高斯磨砂，将底层滚动的历史文字彻底化开为淡淡的柔和色块，杜绝锐利笔画穿透叠字 */
[data-dsh-glass-float] [data-composer-card] > [data-dcu-glass-composer-surface] {
  background: var(--dsh-glass-card-raised) !important;
  backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
  -webkit-backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
}

/* 平铺（compat）模式的卡片材质由上游固定为 12px，这里不再覆盖，避免浓厚预设把 compat 也带成 20px */

/* dock 磨砂幕布同样只给云母浮动模式加 12px 下限：compat 的 blur 完全交给上游，
   否则 clear 预设（blur:0）会被这条下限悄悄抬到 12px，与「平铺保持原版材质」的约定冲突 */
[data-dsh-glass-float] [data-dsh-glass-inputbar] > [class*="dock"]::before,
[data-dsh-glass-float] [data-dsh-glass-inputbar] > [data-composer-dock]::before {
  backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
  -webkit-backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
}

/* 斜杠指令/快捷指令候选面板（[data-trigger-menu] / Issue #72）：
   该菜单悬浮在输入卡片上方、直接压在滚动消息正文与代码块上。
   通用菜单 raised 填充（约 45%~58%）在密集文字流上无法有效阻断文字穿透（幽灵字叠字）。
   对齐参考插件模型菜单加浓规范，将表面材质提浓至 layer-2 @ 88% 并强化磨砂与边缘描边，同时同步渐隐阴影。 */
[data-trigger-menu] {
  --dsw-menu-surface-fill: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e2e) 88%, transparent) !important;
  --dsw-specific-menu: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e2e) 88%, transparent) !important;
  --dsw-menu-backdrop-filter: blur(24px) saturate(140%) !important;
}
[data-dsh-glass] [data-trigger-menu] {
  outline: 1px solid var(--dsh-glass-rim-soft, rgba(255, 255, 255, 0.12));
  outline-offset: -1px;
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
      styleTag.textContent = GLASS_COMPOSER_CSS + GLASS_EXTRA_CSS
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

  // 6. 顶部渐隐条：宿主基线里已有 [data-dsh-glass-fade] 的样式（13px、blur 5px、
  //    上实下虚的 mask），但上游的 DOM 创建点不在我们这份构建里。云母浮动模式下滚动内容
  //    被上提 95px，顶栏上方 12px 留白与 20px 圆角切角都没有遮挡，正文会从这两处锐利露出；
  //    这条固定 13px 的渐隐条正好盖住留白带。它自身用 backdrop-filter 而非给滚动容器加 mask，
  //    不会把输入卡片/dock 的磨砂打死（滚动容器 mask 的坑见下方注释）。
  ensureGlassFade(!isCompat)
}

const FADE_ATTRIBUTE = 'data-dsh-glass-fade'

/** 云母模式挂载顶部渐隐条；平铺模式或关闭玻璃时移除 */
function ensureGlassFade(enabled: boolean): void {
  if (typeof document === 'undefined') return
  const existing = document.querySelector<HTMLElement>(`[${FADE_ATTRIBUTE}="top"]`)
  if (!enabled) {
    existing?.remove()
    return
  }
  if (existing !== null) return
  const body = document.body
  if (body === null) return
  const fade = document.createElement('div')
  fade.setAttribute(FADE_ATTRIBUTE, 'top')
  fade.setAttribute('aria-hidden', 'true')
  body.appendChild(fade)
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
  ensureGlassFade(false)

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
