import { afterEach, expect, test, vi } from 'vitest'
import { applyGlassSettings, disposeGlassMode, GLASS_EXTRA_CSS } from '../src/client/theme/glass.ts'
import { GLASS_CSS_TEXT } from '../src/client/theme/glass-css.gen.ts'
import { changeTheme, ensureThemeSurfaceStyles, observeTheme, removeThemeSurfaceStyles, THEME_SURFACE_STYLE_ID } from '../src/client/theme/index.ts'

afterEach(() => {
  disposeGlassMode()
  removeThemeSurfaceStyles()
})

/** 玻璃层注入的样式标签文本（生成 CSS + 追加 CSS） */
function injectedCss(): string {
  const tag = document.getElementById('dsh-codex-ui-glass-style')
  return tag?.textContent ?? ''
}

test('对齐对标插件最新规范：座舱本体 composerSeat 必须保持透明无涂层（background: 0 0），防止视口两侧出现长条矩形大色块', () => {
  // 生成 CSS 中座舱必须声明 background: 0 0（对应对标插件 Issue #28/#29 基础规范）
  expect(GLASS_CSS_TEXT).toContain('[data-dsh-glass] [data-phase] [class*=composerSeat][class*=composerSeat]{background:0 0}')
  // 追加 CSS 中不得给座舱铺满宽实底渐变，否则 1500px 满宽视口两侧会画出深色矩形脏色块
  expect(GLASS_EXTRA_CSS).not.toContain('background: var(--dsh-glass-ground-layers)')
})

test('对齐对标插件最新规范（Issue #29）：dock 状态栏必须使用磨砂幕布遮挡（地面色 + 半透 + 模糊 + 18px 顶部渐变蒙版）', () => {
  // 1. 包含对标插件 Issue #29 核心规则：针对 [data-dsh-glass-inputbar] 下的 dock 伪元素
  expect(GLASS_CSS_TEXT).toContain('[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar]>[class*=dock]:before')
  expect(GLASS_CSS_TEXT).toContain('[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar]>[data-composer-dock]:before')

  // 2. 必须具备磨砂模糊与顶部蒙版坡度（向上 8px 伸入输入卡片阴影，18px 蒙版自然过渡，绝不留硬切线）
  expect(GLASS_CSS_TEXT).toContain('backdrop-filter:blur(var(--dsh-glass-blur,14px))')
  expect(GLASS_CSS_TEXT).toContain('mask-image:linear-gradient(#0000 0,#000 18px)')
  expect(GLASS_CSS_TEXT).toContain('var(--dsh-glass-ground)')
})

test('对齐对标插件最新规范：输入框卡片保留专属立体边框与阴影，内部使用云母磨砂', () => {
  // 卡片保留 24px 圆角、专属高对比描边 rim-strong 和专属双层柔光投影 input-shadow
  expect(GLASS_CSS_TEXT).toContain('border:1px solid var(--dsh-glass-rim-strong)')
  expect(GLASS_CSS_TEXT).toContain('box-shadow:var(--dsh-glass-input-shadow)')
  // 卡片伪元素基础规则使用 var(--dsh-glass-card) 云母磨砂层
  expect(GLASS_CSS_TEXT).toContain('background:var(--dsh-glass-card)')
  // 对齐平铺风格（Compat）：追加规则强化输入卡片为 card-raised 且锁定至少 12px 磨砂，杜绝文字穿透叠字
  expect(GLASS_EXTRA_CSS).toContain('var(--dsh-glass-card-raised) !important;')
  expect(GLASS_EXTRA_CSS).toContain('backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;')
})

test('滚动容器绝不允许挂 mask-image（会成为 backdrop root 让云母磨砂全部失效），顶栏改用模糊下限兜底', () => {
  // 1. 回归守卫：滚动容器上不得出现任何 mask-image，否则内部输入卡片与 dock 幕布的
  //    backdrop-filter 会被 Chromium 判为惰性，正文重新锐利穿透（真实宿主实测证据见 glass.ts 注释）
  expect(GLASS_EXTRA_CSS).not.toMatch(
    /\[data-conversation-scroll\][^{]*\{[^}]*mask-image/,
  )
  expect(GLASS_EXTRA_CSS).not.toContain('[data-dsh-glass-float] [data-phase=active] [data-conversation-scroll]')
  // 2. 顶栏自身保留磨砂下限，从顶栏背后穿过的正文才会被化开
  expect(GLASS_EXTRA_CSS).toContain(
    '[data-dsh-glass-float] [data-phase] header:not([class*="headerBlank"])',
  )
  expect(GLASS_EXTRA_CSS).toContain(
    'backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;',
  )
  // 3. 不允许通过给顶栏铺不透明底色来遮挡：那会盖掉顶栏自己的边框、阴影与磨砂质感
  expect(GLASS_EXTRA_CSS).not.toMatch(
    /\[data-dsh-glass-float\] \[data-phase\][^{]*header[^{]*\{[^}]*background:/,
  )
})

test('样式层级：生成 CSS 必须正确包含对标插件的座舱与输入卡片基础规则', () => {
  applyGlassSettings({ enabled: true, mode: 'mica', preset: 'standard' })
  const css = injectedCss()
  const transparentOverride = css.indexOf('[class*=composerSeat][class*=composerSeat]{background:0 0}')
  expect(transparentOverride).toBeGreaterThan(-1)
})

test('对标插件（Issue #29）磨砂幕布规则规范：dock 伪元素绝不得被设为 display: none', () => {
  // dock 伪元素必须保留以承载磨砂幕布，不得在追加 CSS 中粗暴隐藏
  expect(GLASS_EXTRA_CSS).not.toMatch(
    /\[data-dsh-glass\] \[data-composer-dock\]:before\s*\{[^}]*display:\s*none !important/,
  )
})

test('指令面板加浓与磨砂：必须声明 [data-trigger-menu] 提浓规则防止文字穿透（Issue #72）', async () => {
  // 1. glass.ts 玻璃追加样式守卫
  expect(GLASS_EXTRA_CSS).toContain('[data-trigger-menu]')
  expect(GLASS_EXTRA_CSS).toContain('--dsw-menu-surface-fill: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e2e) 88%, transparent) !important;')
  expect(GLASS_EXTRA_CSS).toContain('--dsw-menu-backdrop-filter: blur(24px) saturate(140%) !important;')
  expect(GLASS_EXTRA_CSS).toContain('[data-dsh-glass] [data-trigger-menu]')

  // 2. index.ts 全局主题表面样式守卫（双哨兵）
  ensureThemeSurfaceStyles()
  const surfaceTag = document.getElementById(THEME_SURFACE_STYLE_ID)
  expect(surfaceTag).not.toBeNull()
  expect(surfaceTag?.textContent).toContain('[data-trigger-menu]')
  expect(surfaceTag?.textContent).toContain('--dsw-menu-surface-fill: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e2e) 88%, transparent) !important;')
  expect(surfaceTag?.textContent).toContain('--dsw-menu-backdrop-filter: blur(24px) saturate(140%) !important;')

  // 3. 停用时通过真实生命周期 checkAndSync 必须彻底清除 DOM 上的 surface 标签（严格差分变异守卫）
  // 设置自选主题，将 hasAppliedCustomTheme 标志置为 true 且在 DOM 插入 surface 标签
  changeTheme('codex-dark')
  expect(document.getElementById(THEME_SURFACE_STYLE_ID)).not.toBeNull()

  let mockPluginEnabled = true
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: mockPluginEnabled,
        status: mockPluginEnabled ? 200 : 404,
        json: () => Promise.resolve({ enabled: mockPluginEnabled }),
      }),
    )

    const dummyCtx = {
      on: vi.fn(),
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      effect: vi.fn().mockReturnValue(() => {}),
    }

    const disposeObserve = observeTheme(dummyCtx as never)
    await new Promise((r) => setTimeout(r, 60))
    // 启用状态下 surface 标签依然存在
    expect(document.getElementById(THEME_SURFACE_STYLE_ID)).not.toBeNull()

    // 模拟子插件在宿主管理中被用户停用，触发窗口 focus 同步
    mockPluginEnabled = false
    window.dispatchEvent(new Event('focus'))
    await new Promise((r) => setTimeout(r, 60))

    // 此时 checkAndSync 必须彻底移除 surface 标签（若生产代码删去清理调用，此行必红）
    expect(document.getElementById(THEME_SURFACE_STYLE_ID)).toBeNull()
    disposeObserve()
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('右侧栏全屏与平铺玻璃：仅在侧边栏展开时（[data-sidebar-right-open]）挂载磨砂，关闭时不得残留磨砂', () => {
  // 1. 展开状态下支持磨砂
  expect(GLASS_CSS_TEXT).toContain('[data-sidebar-right-panel][data-sidebar-right-open]')
  // 2. 未展开或通配状态下不得无条件挂载磨砂
  expect(GLASS_CSS_TEXT).not.toMatch(/\[data-sidebar-right-panel\]\s*\{[^}]*backdrop-filter:/)
})

