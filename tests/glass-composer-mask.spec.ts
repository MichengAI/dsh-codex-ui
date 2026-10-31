import { afterEach, expect, test } from 'vitest'
import { applyGlassSettings, disposeGlassMode, GLASS_EXTRA_CSS } from '../src/client/theme/glass.ts'
import { GLASS_CSS_TEXT } from '../src/client/theme/glass-css.gen.ts'

afterEach(() => {
  disposeGlassMode()
})

/** 玻璃层注入的样式标签文本（生成 CSS + 追加 CSS） */
function injectedCss(): string {
  const tag = document.getElementById('dsh-codex-ui-glass-style')
  return tag?.textContent ?? ''
}

test('输入框座舱遮挡：必须声明 composerSeat 底板并覆盖内嵌会话（Issue #69）', () => {
  // 选择器必须锁定激活态座舱，且用加倍类名特异性压过生成 CSS 里的 `background: 0 0`
  expect(GLASS_EXTRA_CSS).toContain(
    '[data-dsh-glass] [data-phase=active] [class*="composerSeat"][class*="composerSeat"]',
  )
  // 内嵌会话走 data-content-phase，同样要覆盖
  expect(GLASS_EXTRA_CSS).toContain(
    '[data-dsh-glass] [data-content-phase=active] [class*="composerSeat"][class*="composerSeat"]',
  )
})

test('座舱底板必须复用全局底盘渐变并固定到视口，避免与渐变背景产生色差', () => {
  // 底盘是「两层径向光晕 + 一层 165deg 线性渐变」，必须与 body 那份逐字一致
  expect(GLASS_EXTRA_CSS).toContain('linear-gradient(165deg')
  expect(GLASS_EXTRA_CSS).toContain('var(--dsh-glass-ground)')
  expect(GLASS_EXTRA_CSS).toContain('var(--dsh-glass-wash-tint)')
  // 固定到视口才能与页面底色逐像素对齐（实测 RGB 通道差 0）
  expect(GLASS_EXTRA_CSS).toContain('background-attachment: fixed')
  // 不允许退回近似纯色底板：宿主 --dsw-alias-bg-base 与玻璃渐变底盘不同色，会重新出现横向色带
  expect(GLASS_EXTRA_CSS).not.toContain('var(--dsw-alias-bg-base)')
})

test('座舱上沿必须有 16px 渐隐带，且靠 mask 淡出同一块底盘', () => {
  expect(GLASS_EXTRA_CSS).toContain('[class*="composerSeat"][class*="composerSeat"]::before')
  expect(GLASS_EXTRA_CSS).toContain('bottom: 100%')
  expect(GLASS_EXTRA_CSS).toContain('height: 16px')
  // 渐隐必须用 mask：铺渐变底色会与渐变背景错色
  expect(GLASS_EXTRA_CSS).toContain('mask-image: linear-gradient(180deg, transparent 0, #000 100%)')
})

test('云母浮动顶栏：正文必须在顶栏区域内淡出，且不得改动顶栏自身外观', () => {
  // 用滚动容器的 mask 让内容在顶栏区域淡出
  expect(GLASS_EXTRA_CSS).toContain('[data-dsh-glass-float] [data-phase=active] [data-conversation-scroll]')
  // 常量推导（改值必须重算）：mask 原点 = 滚动容器 border box（容器顶 = 顶栏底边 97 − 95 = 2px）
  // 96px → 绝对 y=98，压在顶栏底边 97 之下；106px → y=108，早于内容最早起点 y=109
  expect(GLASS_EXTRA_CSS).toContain(
    'mask-image: linear-gradient(180deg, transparent 0, transparent 96px, #000 106px)',
  )
  // 不允许通过给顶栏铺不透明底色来遮挡：那会盖掉顶栏自己的边框、阴影与磨砂质感
  expect(GLASS_EXTRA_CSS).not.toMatch(
    /\[data-dsh-glass-float\] \[data-phase\][^{]*header[^{]*\{[^}]*background:/,
  )
  // 座舱与顶栏共用的底盘变量必须仍存在（座舱底板用）
  expect(GLASS_EXTRA_CSS).toContain('var(--dsh-glass-ground-layers)')
  expect(GLASS_EXTRA_CSS).toContain('[data-dsh-glass] body {')
})

test('输入框座舱遮挡：追加 CSS 必须排在生成 CSS 之后才能生效', () => {
  applyGlassSettings({ enabled: true, mode: 'mica', preset: 'standard' })
  const css = injectedCss()
  const transparentOverride = css.indexOf('[class*=composerSeat][class*=composerSeat]{background:0 0}')
  const maskRule = css.indexOf('[data-phase=active] [class*="composerSeat"][class*="composerSeat"]')
  expect(transparentOverride).toBeGreaterThan(-1)
  expect(maskRule).toBeGreaterThan(transparentOverride)
})

test('底部 dock 遮罩带保持移除，不得回退成参考插件的矩形色块', () => {
  // 参考插件原来的做法：dock::before 铺一条左右各溢出 16px 的矩形磨砂带，正是此前“底部脏色块”的来源
  expect(GLASS_CSS_TEXT).not.toContain('left:calc(-1 * var(--dsh-composer-side-clearance')
  expect(GLASS_EXTRA_CSS).not.toContain('left: calc(-1 * var(--dsh-composer-side-clearance')
  // dock 伪元素必须继续被关闭
  expect(GLASS_EXTRA_CSS).toContain('[data-dsh-glass] [data-composer-dock]:before')
  expect(GLASS_EXTRA_CSS).toMatch(
    /\[data-dsh-glass\] \[data-composer-dock\]:before\s*\{[^}]*display: none !important/,
  )
})

test('指令面板加浓与磨砂：必须声明 [data-trigger-menu] 提浓规则防止文字穿透（Issue #72）', () => {
  expect(GLASS_EXTRA_CSS).toContain('[data-trigger-menu]')
  expect(GLASS_EXTRA_CSS).toContain('--dsw-menu-surface-fill: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e2e) 88%, transparent) !important;')
  expect(GLASS_EXTRA_CSS).toContain('--dsw-menu-backdrop-filter: blur(24px) saturate(140%) !important;')
  expect(GLASS_EXTRA_CSS).toContain('[data-dsh-glass] [data-trigger-menu]')
})

