import { afterEach, expect, test, vi } from 'vitest'
import {
  checkSettingsSkinEnabled,
  refreshSettingsSkinCache,
  installSettingsSkin,
  uninstallSettingsSkin,
  observeSettingsSkin,
  decorateSettingsNav,
  getHostSidebarExpandedWidth,
  DEFAULT_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  SETTINGS_SKIN_CSS,
  SETTINGS_SKIN_STYLE_ID,
} from '../src/client/settings-skin/index.ts'
import { classifySettingsButton } from '../src/client/settings-skin/model.ts'
import { setNavSearchQuery } from '../src/client/settings-skin/SettingsNavHeader.tsx'
import { readFileSync, existsSync } from 'node:fs'

const removeSkin: Array<() => void> = []
afterEach(() => { removeSkin.splice(0).forEach(remove => remove()) })

test('主侧栏宽度探测与安全回退机制', () => {
  // 1. 无 AppFrame 时安全回退至官方标准 280px
  expect(getHostSidebarExpandedWidth(document)).toBe(DEFAULT_SIDEBAR_WIDTH)

  // 2. 存在 AppFrame gridTemplateColumns 时精确解析展开宽度
  const frame = document.createElement('div')
  frame.style.gridTemplateColumns = '320px minmax(400px, 1fr) 0px'
  document.body.append(frame)
  try {
    expect(getHostSidebarExpandedWidth(document)).toBe(320)

    // 3. 当侧栏折叠为 56px 窄轨时，不使用 56px，安全回退至 280px 展开基准
    frame.style.gridTemplateColumns = '56px minmax(400px, 1fr) 0px'
    expect(getHostSidebarExpandedWidth(document)).toBe(DEFAULT_SIDEBAR_WIDTH)
  } finally {
    frame.remove()
  }
})

test('设置侧栏装饰器动态将宿主侧栏宽度注入到 CSS 变量', () => {
  const frame = document.createElement('div')
  frame.style.gridTemplateColumns = '310px minmax(400px, 1fr) 0px'
  document.body.append(frame)

  const panel = document.createElement('div')
  panel.setAttribute('data-shortcut-modal', 'settings')
  const nav = document.createElement('nav')
  const header = document.createElement('div')
  const navList = document.createElement('div')
  nav.append(header, navList)
  panel.append(nav)
  document.body.append(panel)

  try {
    const cleanup = decorateSettingsNav(panel)
    expect(panel.style.getPropertyValue('--dcu-settings-nav-width')).toBe('310px')
    cleanup()
  } finally {
    frame.remove()
    panel.remove()
  }
})

test('设置皮肤只创建一个可清理的样式节点，且支持 uninstallSettingsSkin 彻底卸载', () => {
  const first = installSettingsSkin(document)
  removeSkin.push(first)
  const style = document.getElementById(SETTINGS_SKIN_STYLE_ID)
  expect(style?.textContent).toContain('[data-shortcut-modal="settings"]')
  expect(document.querySelectorAll(`#${SETTINGS_SKIN_STYLE_ID}`)).toHaveLength(1)
  const second = installSettingsSkin(document)
  removeSkin.push(second)
  expect(document.querySelectorAll(`#${SETTINGS_SKIN_STYLE_ID}`)).toHaveLength(1)
  uninstallSettingsSkin(document)
  expect(document.getElementById(SETTINGS_SKIN_STYLE_ID)).toBeNull()
})

test('设置皮肤样式遵循 1:1 Codex 全屏工作台与定宽居中规范', () => {
  expect(SETTINGS_SKIN_CSS).toContain('width: 100vw !important')
  expect(SETTINGS_SKIN_CSS).toContain('height: 100vh !important')
  expect(SETTINGS_SKIN_CSS).toContain('border-radius: 0 !important')
  expect(SETTINGS_SKIN_CSS).toContain('max-width: 800px !important')
  expect(SETTINGS_SKIN_CSS).toContain('margin-inline: auto !important')
  expect(SETTINGS_SKIN_CSS).toContain('#18181b')
  expect(SETTINGS_SKIN_CSS).toContain('var(--dcu-settings-nav-width, 280px)')
  expect(SETTINGS_SKIN_CSS).toContain('var(--dsw-specific-sidebar-fill')
})

test('设置菜单无侵入已知项分组模型：仅置顶个人与记录，其余不指定全部自动归入集成组', () => {
  expect(classifySettingsButton('账号与余额')).toBe('personal')
  expect(classifySettingsButton('通用设置')).toBe('personal')
  expect(classifySettingsButton('侧边卡片')).toBe('integrations')
  expect(classifySettingsButton('模型')).toBe('integrations')
  expect(classifySettingsButton('智能体预设')).toBe('integrations')
  expect(classifySettingsButton('插件管理')).toBe('integrations')
  expect(classifySettingsButton('内置插件')).toBe('integrations')
  expect(classifySettingsButton('任意新安装的第三方生态工具')).toBe('integrations')
  expect(classifySettingsButton('归档会话')).toBe('records')
  expect(classifySettingsButton('关于 Codex UI')).toBe('records')
})

test('动态导航装饰器：宿主原生生成按钮自动添加 order 分组，且搜索过滤联动', () => {
  const panel = document.createElement('div')
  panel.setAttribute('data-shortcut-modal', 'settings')
  const nav = document.createElement('nav')
  const header = document.createElement('div')
  const navList = document.createElement('div')

  // 宿主原生生成 3 个按钮（不写死，纯由宿主追加）
  const btn1 = document.createElement('button')
  btn1.innerHTML = '<span>通用</span>'
  const btn2 = document.createElement('button')
  btn2.innerHTML = '<span>模型服务</span>'
  const btn3 = document.createElement('button')
  btn3.innerHTML = '<span>归档记录</span>'
  navList.append(btn1, btn2, btn3)
  nav.append(header, navList)
  panel.append(nav)
  document.body.append(panel)

  const cleanup = decorateSettingsNav(panel)
  try {
    // 检查是否自动注入了 3 个分组标题
    const headers = navList.querySelectorAll('.dcu-settings-nav-group-header')
    expect(headers).toHaveLength(3)

    // 检查宿主按钮是否被分类且赋予 CSS order
    expect(btn1.getAttribute('data-dcu-group')).toBe('personal')
    expect(btn2.getAttribute('data-dcu-group')).toBe('integrations')
    expect(btn3.getAttribute('data-dcu-group')).toBe('records')
    expect(Number(btn1.style.order)).toBeLessThan(Number(btn2.style.order))
    expect(Number(btn2.style.order)).toBeLessThan(Number(btn3.style.order))

    // 搜索过滤：输入 "模型"
    setNavSearchQuery('模型')
    expect(btn1.style.display).toBe('none')
    expect(btn2.style.display).not.toBe('none')
    expect(btn3.style.display).toBe('none')

    // 检查分组标题：仅集成组可见
    const personalHeader = navList.querySelector('[data-dcu-group-header="personal"]') as HTMLElement
    const integrationsHeader = navList.querySelector('[data-dcu-group-header="integrations"]') as HTMLElement
    expect(personalHeader.style.display).toBe('none')
    expect(integrationsHeader.style.display).toBe('')

    // 清空搜索
    setNavSearchQuery('')
    expect(btn1.style.display).toBe('')
    expect(btn2.style.display).toBe('')
    expect(personalHeader.style.display).toBe('')
  } finally {
    cleanup()
    panel.remove()
  }
})

test('桌面端顶栏避让：声明顶栏位移且不得存在遮挡顶部操作栏的 ::after 伪元素', () => {
  expect(SETTINGS_SKIN_CSS).toContain('html[data-windows-titlebar]:not([data-fullscreen])')
  expect(SETTINGS_SKIN_CSS).toContain('var(--dsh-windows-titlebar-height')
  expect(SETTINGS_SKIN_CSS).not.toContain('[data-shortcut-modal="settings"]::after')
})

test('全屏工作台遮罩选择器只命中有设置面板的那一层，不得污染其它模态窗', () => {
  // 宿主所有 Modal（确认框、插件弹窗等）的 root 都是 body 直属的 role="presentation"；
  // 旧写法 body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"]
  // 会把同时打开的其它模态窗也改成 align-items: stretch，卡片被拉到左上角。
  expect(SETTINGS_SKIN_CSS).not.toContain('body:has(> [role="presentation"]')
  expect(SETTINGS_SKIN_CSS).toContain('body > [role="presentation"]:has(> [data-shortcut-modal="settings"])')
  expect(SETTINGS_SKIN_CSS).toContain(
    'html[data-dsh-glass-float] body > [role="presentation"]:has(> [data-shortcut-modal="settings"])',
  )
})

test('移动端布局声明 iOS 安全区并强制收缩为单列，防止刘海/灵动岛遮挡 (#61)', () => {
  expect(SETTINGS_SKIN_CSS).toContain('@media (max-width: 640px)')
  expect(SETTINGS_SKIN_CSS).toContain('padding-top: env(safe-area-inset-top, 0px) !important')
  expect(SETTINGS_SKIN_CSS).toContain('padding-bottom: env(safe-area-inset-bottom, 0px) !important')
  expect(SETTINGS_SKIN_CSS).toContain('flex-direction: column !important')
  expect(SETTINGS_SKIN_CSS).toContain('width: 100% !important')
})

test('设置顶部搜索框对齐宿主原生 Input 规范与拉平布局', () => {
  // 不得手绘清除按钮
  expect(SETTINGS_SKIN_CSS).not.toContain('.dcu-settings-search-clear')
  // 标题栏不得内缩 2px，必须拉平基线
  expect(SETTINGS_SKIN_CSS).toContain('.dcu-settings-nav-header-top {\n  display: flex !important;\n  align-items: center !important;\n  gap: 10px !important;\n  height: 28px !important;\n  padding: 0 !important;\n  width: 100% !important;\n}')
  // 必须使用宿主原生 Input 的圆角 token
  expect(SETTINGS_SKIN_CSS).toContain('var(--dsw-radius-md')
})

test('同包独立子组件契约：cordis.patch.yml 与 package.json 声明 settings-skin', () => {
  const patch = readFileSync('cordis.patch.yml', 'utf8')
  expect(patch).toMatch(/id:\s*codex-ui-settings-skin\s+name:\s*'@michengai\/dsh-codex-ui\/settings-skin'/)
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  expect(pkg.exports['./settings-skin']).toBeDefined()
  expect(pkg.exports['./settings-skin/locale/*.json']).toBeDefined()
  expect(existsSync('locale/settings-skin/zh.json')).toBe(true)
  expect(existsSync('locale/settings-skin/en.json')).toBe(true)
  expect(existsSync('src/settings-skin-plugin.ts')).toBe(true)
})

test('子组件启用状态检测 checkSettingsSkinEnabled 支持服务端探测与停用响应', async () => {
  const originalFetch = globalThis.fetch
  try {
    refreshSettingsSkinCache()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    }) as unknown as typeof fetch
    expect(await checkSettingsSkinEnabled()).toBe(true)

    refreshSettingsSkinCache()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch
    expect(await checkSettingsSkinEnabled()).toBe(false)

    refreshSettingsSkinCache()
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline or disabled'))
    expect(await checkSettingsSkinEnabled()).toBe(false)
  } finally {
    refreshSettingsSkinCache()
    globalThis.fetch = originalFetch
  }
})

test('设置皮肤立即预装：observeSettingsSkin 启动时即刻注入样式，无需等待弹窗打开或网络往返', async () => {
  uninstallSettingsSkin(document)
  expect(document.getElementById(SETTINGS_SKIN_STYLE_ID)).toBeNull()

  const dispose = observeSettingsSkin()
  try {
    // 启动即预装，零延迟消除打开弹窗变大的闪烁
    expect(document.getElementById(SETTINGS_SKIN_STYLE_ID)).not.toBeNull()
  } finally {
    dispose()
    uninstallSettingsSkin(document)
  }
})

test('浅色模式下设置工作台背景与按钮高对比度规则兜底', () => {
  expect(SETTINGS_SKIN_CSS).toContain('body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]')
  expect(SETTINGS_SKIN_CSS).toContain('body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav)')
})

test('decorateSettingsNav 兼容新版宿主平铺 4 块结构（navTitle 与 nav 为同级直属子节点）', () => {
  const panel = document.createElement('div')
  panel.setAttribute('data-shortcut-modal', 'settings')

  // 新版宿主结构：navTitle 是 panel 直属子元素，nav 内部只有 navList
  const navTitle = document.createElement('div')
  navTitle.className = 'VOzbGW_navTitle'
  navTitle.innerHTML = '<span>设置</span>'

  const nav = document.createElement('nav')
  nav.className = 'VOzbGW_nav'
  const navList = document.createElement('div')
  navList.className = 'VOzbGW_navList'

  const btn1 = document.createElement('button')
  btn1.innerHTML = '<span>账号与余额</span>'
  const btn2 = document.createElement('button')
  btn2.innerHTML = '<span>模型</span>'
  navList.append(btn1, btn2)
  nav.append(navList)

  const header = document.createElement('div')
  header.className = 'VOzbGW_header'

  const options = document.createElement('div')
  options.className = 'VOzbGW_options'

  panel.append(navTitle, nav, header, options)
  document.body.append(panel)

  try {
    const cleanup = decorateSettingsNav(panel)

    // 验证新版结构下成功挂载了搜索 Header 到 navTitle
    expect(navTitle.querySelector('.dcu-settings-nav-header-root')).not.toBeNull()

    // 验证成功注入了分组 Header 到 navList
    expect(navList.querySelectorAll('.dcu-settings-nav-group-header').length).toBeGreaterThan(0)

    // 验证按钮已被分类
    expect(btn1.getAttribute('data-dcu-group')).toBe('personal')
    expect(btn2.getAttribute('data-dcu-group')).toBe('integrations')

    cleanup()
  } finally {
    panel.remove()
  }
})

test('SETTINGS_SKIN_CSS 包含新版平铺 Grid 4 块布局映射规则，杜绝 4 列横向撕裂', () => {
  expect(SETTINGS_SKIN_CSS).toContain('[data-shortcut-modal=\"settings\"]:has(> [class*=\"options\"])')
  expect(SETTINGS_SKIN_CSS).toContain('grid-template-columns')
  expect(SETTINGS_SKIN_CSS).toContain('> [class*=\"navTitle\"]')
  expect(SETTINGS_SKIN_CSS).toContain('> [class*=\"header\"]')
  expect(SETTINGS_SKIN_CSS).toContain('> [class*=\"options\"]')
})
