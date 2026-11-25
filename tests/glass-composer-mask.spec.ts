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

test('玻璃底层随卡片创建、重建和关闭而维护，不占用宿主伪元素', async () => {
  document.body.innerHTML = '<div data-composer-card><button>输入</button></div>'
  applyGlassSettings({ enabled: true, mode: 'mica' })
  const card = document.querySelector('[data-composer-card]')!
  expect(card.querySelectorAll(':scope > [data-dcu-glass-composer-surface]')).toHaveLength(1)
  expect(card.querySelector('[data-dcu-glass-composer-surface]')?.getAttribute('aria-hidden')).toBe('true')
  applyGlassSettings({ enabled: true, mode: 'compat' })
  expect(card.querySelectorAll(':scope > [data-dcu-glass-composer-surface]')).toHaveLength(1)
  const replacement = document.createElement('div')
  replacement.setAttribute('data-composer-card', '')
  card.replaceWith(replacement)
  await vi.waitFor(() => expect(replacement.querySelectorAll(':scope > [data-dcu-glass-composer-surface]')).toHaveLength(1))
  applyGlassSettings({ enabled: false })
  expect(document.querySelector('[data-dcu-glass-composer-surface]')).toBeNull()
  replacement.remove()
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

test('平铺玻璃模式绝不出现右侧栏外壳的 backdrop-filter（df5eb68 修复的透出/白屏回归，禁止随上游基线同步带回）', () => {
  // 生成基线里不得再出现右侧栏 panel 的模糊规则
  expect(GLASS_CSS_TEXT).not.toContain('[data-sidebar-right-panel][data-sidebar-right-open]')
  expect(GLASS_CSS_TEXT).not.toContain('sidebar-right-panel')
})


test('云母模式挂载顶部渐隐条（[data-dsh-glass-fade=top]），平铺与关闭时移除', () => {
  applyGlassSettings({ enabled: true, mode: 'mica', preset: 'standard' })
  expect(document.querySelectorAll('[data-dsh-glass-fade="top"]').length).toBe(1)

  // 重复应用不得叠加
  applyGlassSettings({ enabled: true, mode: 'mica', preset: 'frosted' })
  expect(document.querySelectorAll('[data-dsh-glass-fade="top"]').length).toBe(1)

  // 平铺模式不需要这条（宿主的位移不成立）
  applyGlassSettings({ enabled: true, mode: 'compat', preset: 'standard' })
  expect(document.querySelector('[data-dsh-glass-fade="top"]')).toBeNull()

  // 重新开云母再彻底关闭：节点必须清干净，不留孤儿
  applyGlassSettings({ enabled: true, mode: 'mica', preset: 'standard' })
  disposeGlassMode()
  expect(document.querySelector('[data-dsh-glass-fade="top"]')).toBeNull()
})

test('dock 模糊下限只作用于云母浮动模式，绝不泄漏到 compat（否则 clear 预设 blur:0 会被抬到 12px）', () => {
  // 追加 CSS 里不得存在「只用 [data-dsh-glass] 限定」的 dock 伪元素规则
  expect(GLASS_EXTRA_CSS).not.toMatch(/\[data-dsh-glass\]\s+\[data-dsh-glass-inputbar\][^{]*dock[^{]*\{/)
  // 云母浮动模式仍保留下限
  expect(GLASS_EXTRA_CSS).toContain('[data-dsh-glass-float] [data-dsh-glass-inputbar] > [class*="dock"]::before')
})

test('编队卡片样式隔离（Issue #113）：header 浮动卡片规则不得污染 dsh-context 的 lc-pulse-header', () => {
  applyGlassSettings({ enabled: true, mode: 'mica', preset: 'standard' })
  const css = injectedCss()

  // 1. 浮动顶栏规则必须显式排除 lc-pulse-header 与 lc- 命名空间卡片（包含折叠侧栏规则）
  expect(css).toContain('[data-dsh-glass-float] [data-phase=active] header:not(.lc-pulse-header):not([class*="lc-"])')
  expect(css).toContain('[data-dsh-glass-float] [data-phase] header:not([class*=headerBlank]):not(.lc-pulse-header):not([class*="lc-"])')
  expect(css).toContain('[data-dsh-glass-frame][data-sidebar-collapsed] [data-phase] header:not([class*=headerBlank]):not(.lc-pulse-header):not([class*="lc-"])')

  // 2. 必须包含 lc-pulse-header 的防御性重置与层级控制，防止滚动遮挡真正的宿主顶栏；且严格限制在 float 模式，不越界污染 compat
  expect(GLASS_EXTRA_CSS).toContain('[data-dsh-glass-float] header.lc-pulse-header')
  expect(GLASS_EXTRA_CSS).toContain('z-index: 1 !important;')
  expect(GLASS_EXTRA_CSS).not.toContain('[data-dsh-glass] header.lc-pulse-header')
})

test('会话操作栏 Tooltip 气泡样式隔离（Issue #113）：bubble 样式不得污染复制、分支等操作气泡', () => {
  applyGlassSettings({ enabled: true, mode: 'mica', preset: 'standard' })
  const css = injectedCss()

  // 1. 生成 CSS 中的 bubble 规则必须排除 role="tooltip" 和 tooltip 类
  expect(css).toContain('[data-dsh-glass-float] [data-conversation-scroll] [class*=bubble]:not([role=tooltip]):not([class*=tooltip])')

  // 2. 追加样式中必须包含专用的 tooltip 防御规则，锁定深色底板、纯白文字与统一 8px 圆角，且严格限制在 float 模式
  expect(GLASS_EXTRA_CSS).toContain('[data-dsh-glass-float] [role="tooltip"]')
  expect(GLASS_EXTRA_CSS).toContain('color: var(--dsw-alias-tooltip-label, #ffffff) !important;')
  expect(GLASS_EXTRA_CSS).toContain('background: var(--dsw-alias-tooltip-bg, #1e1e24) !important;')
  expect(GLASS_EXTRA_CSS).toContain('border-radius: var(--dsw-radius-md, 8px) !important;')
  expect(GLASS_EXTRA_CSS).not.toContain('[data-dsh-glass] [role="tooltip"]')
})

test('样式隔离不退化（Issue #113）：注入样式里每条 header / bubble 规则都必须带排除条件', () => {
  applyGlassSettings({ enabled: true, mode: 'mica', preset: 'standard' })
  const css = injectedCss()

  // 为什么不用「包含某段字符串」的哨兵：GLASS_COMPOSER_CSS 由 replaceAll 生成，
  // 上游基线 glass-css.gen.ts 改版（空格 / 引号 / 前缀任一变化）会让替换静默落空，
  // 而追加样式里本来就有同形规则，字符串断言可能仍然为真，红不起来。
  // 这里改成结构不变量：按选择器逐条检查整份注入样式，缺一条排除就红。
  // 先剥掉 /* */ 注释：注释里本身就写着 [class*=bubble] 这类字样，不剥会把注释当成选择器误判。
  const cssBody = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors = Array.from(cssBody.matchAll(/([^{}]+)\{/g)).map(match => match[1]!.trim())

  const headerRules = selectors.filter(rule => /\[data-phase[^\]]*\]\s+header/.test(rule))
  expect(headerRules.length).toBeGreaterThanOrEqual(3)
  expect(headerRules.filter(rule => !rule.includes(':not(.lc-pulse-header)'))).toEqual([])

  // 折叠侧栏变体的 `[data-phase]` 前多了一段前缀，主卡片那条替换覆盖不到它，
  // 必须由独立的一条 replaceAll 负责：删掉它这条断言立刻变红（已实测）。
  expect(headerRules.some(rule => rule.includes('[data-sidebar-collapsed]'))).toBe(true)

  // bubble 规则必须排除 tooltip 结构（role 或 tooltip 类）。宿主 Tooltip 有「portal 到 body」和
  // 「就地渲染」两种形态（primitives 里 `portal ? createPortal(content, body) : content`），
  // 就地渲染时提示气泡就落在会话滚动流里，所以这条排除是双向防御；
  // 视觉修复本体是追加样式里那条深色底板规则，两边各守一层。
  const bubbleRules = selectors.filter(rule => rule.includes('[class*=bubble]'))
  expect(bubbleRules.length).toBeGreaterThanOrEqual(1)
  expect(bubbleRules.filter(rule => !rule.includes(':not([role=tooltip])'))).toEqual([])
})
