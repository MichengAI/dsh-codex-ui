/**
 * 玻璃材质「计算样式」校验：在真实 Chromium 里把样式注入 fixture 页面，
 * 读取 dock 伪元素 / 输入卡片伪元素 / 顶栏的实际 backdrop-filter。
 *
 * 为什么需要它：单测里对 GLASS_CSS_TEXT 的字符串包含断言只能证明「规则还在」，
 * 证明不了「规则命中了正确的模式」。曾经就出现过 12px 模糊下限的选择器写成
 * [data-dsh-glass]（两种模式都命中），把 compat + clear 预设本该是 0 的模糊
 * 悄悄抬到 12px —— 这套断言就是为这类「范围泄漏」兜底的。
 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import ts from 'typescript'

/** 把 TS 源码里的常量取出来（去掉 import，避免依赖其它模块），返回可在页面里 eval 的脚本 */
function moduleToScript(path, extraExports = '') {
  const source = readFileSync(path, 'utf8')
    .replace(/^import[\s\S]*?from .*$/gm, '')
    .replaceAll('export ', '')
  const script = ts.transpileModule(source + '\n' + extraExports, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
      removeComments: false,
    },
  }).outputText
  return script
}

const seamScript = moduleToScript('src/client/theme/glass-seams.ts')
const glassScript = moduleToScript(
  'src/client/theme/glass.ts',
  'window.__glass = { applyGlassSettings };',
)
const genScript = moduleToScript(
  'src/client/theme/glass-css.gen.ts',
  'window.__gen = { GLASS_CSS_TEXT };',
)

const FIXTURE = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; height: 100vh; }
  [data-phase] { position: relative; height: 100vh; }
  [data-dsh-glass-inputbar] { position: absolute; bottom: 0; left: 0; right: 0; height: 80px; }
  .dock { position: relative; height: 40px; }
  header { height: 85px; margin: 12px 46px 0; }
  [data-composer-card] { position: relative; height: 60px; margin: 0 46px; }
  .lc-pulse-card { margin: 0 46px; height: 40px; }
  header.lc-pulse-header { height: 32px; margin: 6px 0; }
  /* 两条伪元素：宿主顶栏的 ::after 由基线规则 display:none，dsh-context 用 .lc-pulse-header::after 画底线 */
  header::after { content: 'x'; display: block; height: 2px; }
  header.lc-pulse-header::after { content: ''; display: block; height: 2px; background: red; }
  [data-conversation-scroll] { position: relative; height: 120px; }
  .msg-bubble { height: 24px; }
</style></head><body>
<div data-phase="active">
  <header><span>标题</span></header>
  <div data-composer-card><span>输入</span></div>
  <div data-dsh-glass-inputbar><div class="dock"><span>统计</span></div></div>
  <div class="lc-pulse-card">
    <header class="lc-pulse-header"><span>编队</span></header>
  </div>
  <div data-conversation-scroll>
    <div class="msg-bubble"><span>正文气泡</span></div>
    <div class="msg-bubble" role="tooltip"><span>复制</span></div>
  </div>
</div>
</body></html>`

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.route('http://glass.test/', route =>
    route.fulfill({ contentType: 'text/html', body: FIXTURE }),
  )
  await page.goto('http://glass.test/')
  await page.addScriptTag({ content: genScript })
  await page.addScriptTag({ content: seamScript })
  await page.addScriptTag({ content: glassScript })

  /** 按模式 + 预设渲染，并读回三段计算样式 */
  const render = (mode, preset) =>
    page.evaluate(({ mode, preset }) => {
      const { applyGlassSettings } = window.__glass
      document.body.setAttribute('data-ds-dark-theme', '')
      applyGlassSettings({ enabled: true, mode, preset })
      const filterOf = (selector, pseudo) => {
        const el = document.querySelector(selector)
        if (el === null) return 'MISSING'
        return getComputedStyle(el, pseudo).backdropFilter
      }
      return {
        dock: filterOf('.dock', '::before'),
        card: filterOf('[data-dcu-glass-composer-surface]', null),
        header: filterOf('header', null),
        fadeCss: /\[data-dsh-glass-fade\]/.test(window.__gen.GLASS_CSS_TEXT),
      }
    }, { mode, preset })

  const rows = []
  const check = (label, actual, predicate, expectation) => {
    rows.push({ label, actual, ok: predicate(actual) })
    assert.ok(predicate(actual), `${label}：期望 ${expectation}，实际 ${actual}`)
  }

  // 1. 云母 + standard(14px)：三处都应等于预设值（12px 下限不改变 14px）
  const micaStandard = await render('mica', 'standard')
  check('云母·standard dock 模糊', micaStandard.dock, v => v === 'blur(14px)', 'blur(14px)')
  check('云母·standard 卡片模糊', micaStandard.card, v => v === 'blur(14px)', 'blur(14px)')
  check('云母·standard 顶栏模糊', micaStandard.header, v => v === 'blur(14px)', 'blur(14px)')

  // 2. 云母 + frosted(20px)：预设更高时不得被下限压回去
  const micaFrosted = await render('mica', 'frosted')
  check('云母·frosted dock 模糊', micaFrosted.dock, v => v === 'blur(20px)', 'blur(20px)')
  check('云母·frosted 顶栏模糊', micaFrosted.header, v => v === 'blur(20px)', 'blur(20px)')

  // 3. 云母 + clear(0px)：下限兜底生效（这正是「防漏字」的意图）
  const micaClear = await render('mica', 'clear')
  check('云母·clear dock 下限', micaClear.dock, v => v === 'blur(12px)', 'blur(12px)')
  check('云母·clear 卡片下限', micaClear.card, v => v === 'blur(12px)', 'blur(12px)')
  check('云母·clear 顶栏下限', micaClear.header, v => v === 'blur(12px)', 'blur(12px)')

  // 4. compat + clear(0px)：模糊必须交还上游，绝不能被下限抬到 12px（回归守卫）
  const compatClear = await render('compat', 'clear')
  check(
    'compat·clear dock 不得被下限抬高',
    compatClear.dock,
    v => v === 'none' || v === 'blur(0px)',
    'none 或 blur(0px)',
  )
  check('compat·clear 卡片沿用上游 12px', compatClear.card, v => v === 'blur(12px)', 'blur(12px)')
  check('compat·clear 顶栏不得加模糊下限', compatClear.header, v => v === 'none', 'none')

  // 5. compat + frosted(20px)：卡片仍是上游固定的 12px（不被预设带成 20px）
  const compatFrosted = await render('compat', 'frosted')
  check('compat·frosted 卡片固定 12px', compatFrosted.card, v => v === 'blur(12px)', 'blur(12px)')
  check(
    'compat·frosted dock 跟随上游预设',
    compatFrosted.dock,
    v => v === 'blur(20px)',
    'blur(20px)',
  )

  /**
   * Issue #113：编队卡片 header 与操作栏 Tooltip 的隔离必须限定在云母浮动模式。
   * 这里读的是**计算样式**：字符串哨兵只能证明规则存在，证明不了它命中了正确元素、
   * 也没有把宿主真正的浮动顶栏一起打掉。
   */
  const isolation = await page.evaluate(() => {
    const read = (mode) => {
      window.__glass.applyGlassSettings({ enabled: true, mode, preset: 'standard' })
      const lc = getComputedStyle(document.querySelector('header.lc-pulse-header'))
      const host = getComputedStyle(document.querySelector('[data-phase] header'))
      const tip = getComputedStyle(document.querySelector('[data-conversation-scroll] [role="tooltip"]'))
      return {
        lc: { position: lc.position, z: lc.zIndex, marginTop: lc.marginTop, maxWidth: lc.maxWidth, radius: lc.borderTopLeftRadius },
        host: { maxWidth: host.maxWidth, radius: host.borderTopLeftRadius, z: host.zIndex },
        tip: { background: tip.backgroundColor, color: tip.color, radius: tip.borderTopLeftRadius },
        after: {
          lc: getComputedStyle(document.querySelector('header.lc-pulse-header'), '::after').display,
          host: getComputedStyle(document.querySelector('[data-phase] header'), '::after').display,
        },
      }
    }
    return { float: read('mica'), compat: read('compat') }
  })

  // 浮动模式：第三方卡片退回自己的流式布局，宿主顶栏保持浮动卡片形态
  check('浮动·编队 header 定位', isolation.float.lc.position, v => v === 'relative', 'relative')
  check('浮动·编队 header 层级', isolation.float.lc.z, v => v === '1', '1')
  check('浮动·编队 header 边距归零', isolation.float.lc.marginTop, v => v === '0px', '0px')
  check('浮动·编队 header 不带最大宽度截断', isolation.float.lc.maxWidth, v => v === 'none', 'none')
  check('浮动·编队 header 不套 20px 圆角', isolation.float.lc.radius, v => v !== '20px', '≠ 20px')
  // dsh-context 用 .lc-pulse-header::after 画 2px 渐变底线；基线的「header:after{display:none}」必须被排除，
  // 否则这条线会凭空消失（这是「不篡改第三方伪元素」这条约束的可执行证据）。
  check('浮动·编队 header 的 ::after 底线未被隐藏', isolation.float.after.lc, v => v !== 'none', '≠ none')
  check('浮动·宿主顶栏 ::after 仍按基线隐藏', isolation.float.after.host, v => v === 'none', 'none')
  check('浮动·宿主顶栏仍带最大宽度', isolation.float.host.maxWidth, v => v !== 'none', '≠ none')
  check('浮动·宿主顶栏仍是 20px 圆角', isolation.float.host.radius, v => v === '20px', '20px')

  // 浮动模式：操作栏 Tooltip 恢复深色底板 + 纯白文字 + 8px 圆角
  const alphaOf = value => {
    const matched = /rgba?\(([^)]+)\)/.exec(value)
    if (matched === null) return 1
    const parts = matched[1].split(',').map(part => Number.parseFloat(part))
    return parts.length > 3 ? parts[3] : 1
  }
  check('浮动·Tooltip 底板不透明', alphaOf(isolation.float.tip.background), v => v === 1, '1')
  check('浮动·Tooltip 文字纯白', isolation.float.tip.color, v => v === 'rgb(255, 255, 255)', 'rgb(255, 255, 255)')
  check('浮动·Tooltip 圆角 8px', isolation.float.tip.radius, v => v === '8px', '8px')

  // 平铺（compat）模式：两条重置都不得触发，证明隔离没有越界
  check('compat·编队 header 层级不被重置', isolation.compat.lc.z, v => v === 'auto', 'auto')
  check('compat·编队 header 边距不被改写', isolation.compat.lc.marginTop, v => v === '6px', '6px')
  check('compat·Tooltip 底板不被强改', isolation.compat.tip.background, v => v === 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)')
  check('compat·宿主顶栏 ::after 不被隐藏', isolation.compat.after.host, v => v !== 'none', '≠ none')

  // 模拟任意外扩装饰，而不是针对某个皮肤写特判。
  await page.addStyleTag({ content: `
    body { --dsw-alias-bg-layer-1: #203050; }
    body[data-test-decoration] [data-composer-card]::before {
      content: ''; position: absolute; inset: -20px -14px -18px; z-index: 1;
      border: 3px solid red;
    }
    [data-composer-card]::after { content: ''; position: absolute; inset: 0; border: 1px dashed blue; }
  ` })
  await page.evaluate(() => document.body.setAttribute('data-test-decoration', ''))
  for (const mode of ['mica', 'compat']) {
    for (const preset of ['clear', 'standard', 'frosted']) {
      const state = await page.evaluate(({ mode, preset }) => {
        window.__glass.applyGlassSettings({ enabled: true, mode, preset })
        const card = document.querySelector('[data-composer-card]')
        const before = getComputedStyle(card, '::before')
        const after = getComputedStyle(card, '::after')
        const surface = card.querySelector('[data-dcu-glass-composer-surface]')
        const glass = getComputedStyle(surface)
        const bounds = card.getBoundingClientRect()
        const layer = surface.getBoundingClientRect()
        return {
          before: { background: before.backgroundColor, filter: before.backdropFilter, inset: before.inset, z: before.zIndex, border: before.borderTopStyle },
          after: after.borderTopStyle,
          surface: { filter: glass.backdropFilter, background: glass.backgroundColor, z: glass.zIndex, pointer: glass.pointerEvents, width: layer.width, height: layer.height },
          card: { width: bounds.width, height: bounds.height },
        }
      }, { mode, preset })
      assert.equal(state.before.background, 'rgba(0, 0, 0, 0)', `${mode}/${preset} 装饰不得被玻璃底色覆盖`)
      assert.equal(state.before.filter, 'none', `${mode}/${preset} 装饰不得被磨砂覆盖`)
      assert.equal(state.before.inset, '-20px -14px -18px')
      assert.equal(state.before.z, '1')
      assert.equal(state.before.border, 'solid')
      assert.equal(state.after, 'dashed')
      assert.equal(state.surface.filter, mode === 'compat' ? 'blur(12px)' : preset === 'frosted' ? 'blur(20px)' : preset === 'standard' ? 'blur(14px)' : 'blur(12px)')
      assert.notEqual(state.surface.background, 'rgba(0, 0, 0, 0)')
      assert.equal(state.surface.z, '-1')
      assert.equal(state.surface.pointer, 'none')
      assert.ok(Math.abs(state.surface.width - state.card.width) <= 2)
      assert.ok(Math.abs(state.surface.height - state.card.height) <= 2)
    }
  }

  // Issue #102 防御校验：亮色主题下设置卡片底色防变灰 + seam 防溢出至 body
  const lightSettingsCheck = await page.evaluate(() => {
    document.body.removeAttribute('data-ds-dark-theme')
    document.documentElement.style.setProperty('--dsw-static-neutral-bluish-850', '#2c2c2e')
    document.documentElement.style.setProperty('--dsw-static-neutral-bluish-00', '#ffffff')
    document.documentElement.style.setProperty('--dsw-static-neutral-bluish-60', '#f0f2f5')
    document.body.style.setProperty('--dsw-alias-bg-layer-2', '#ffffff')
    document.body.style.setProperty('--dsw-alias-settings-card-fill', 'var(--dsw-alias-bg-layer-2)')

    // 1. 测试直接子节点 dialog 不会导致 body 被盖戳
    const dummyDialog = document.createElement('div')
    dummyDialog.setAttribute('role', 'dialog')
    dummyDialog.setAttribute('aria-modal', 'true')
    document.body.appendChild(dummyDialog)
    window.__glass.applyGlassSettings({ enabled: true, mode: 'mica', preset: 'standard' })
    const bodyHasSettingsAttr = document.body.hasAttribute('data-dsh-glass-settings')
    dummyDialog.remove()

    // 2. 模拟设置卡片与极端 body 盖戳
    const card = document.createElement('div')
    card.setAttribute('data-test-settings-card', '')
    card.style.background = 'var(--dsw-alias-settings-card-fill)'
    card.style.width = '100px'
    card.style.height = '100px'
    document.body.appendChild(card)

    // 人为挂载属性模拟极端脏状态
    document.body.setAttribute('data-dsh-glass-settings', '')
    const cardBg = getComputedStyle(card).backgroundColor
    const layer2Var = getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-layer-2')
    card.remove()
    document.body.removeAttribute('data-dsh-glass-settings')

    return {
      bodyHasSettingsAttr,
      cardBg,
      layer2Var,
    }
  })
  assert.equal(lightSettingsCheck.bodyHasSettingsAttr, false, 'body 不得被赋上 data-dsh-glass-settings')
  assert.notEqual(lightSettingsCheck.cardBg, 'rgb(128, 128, 129)', '卡片不得呈现 #808081 暗灰色')
  assert.ok(
    lightSettingsCheck.cardBg === 'rgb(255, 255, 255)' ||
    lightSettingsCheck.cardBg.startsWith('color(srgb 1 1 1') ||
    lightSettingsCheck.cardBg.includes('rgba(255, 255, 255'),
    `卡片背景必须为白色或半透白，实际: ${lightSettingsCheck.cardBg}`
  )
  console.log('Issue #102 亮色设置卡片防御校验：通过（卡片底色保持纯白，未被暗色规则污染）')

  // Issue #104：同一浮层内部的类名前缀不能被当成独立材质表面；嵌套原生菜单仍走自己的通道。
  const popupPage = await browser.newPage()
  await popupPage.setContent(`<!doctype html><html><head><style>
    body { --dsw-alias-bg-layer-1: #242428; --dsw-alias-label-primary: #eeeeee;
      --dsw-alias-brand-primary-new-colorprimary-new-color: #388bff;
      --dsw-specific-menu: #303136; --dsw-menu-backdrop-filter: blur(40px) saturate(150%); }
    .sample-material, .sample-card { background: var(--dsw-specific-menu); backdrop-filter: var(--dsw-menu-backdrop-filter); }
    .sample-note { background: rgba(255,255,255,.08); }
    .sample-avatar { border: 2px solid var(--dsw-specific-menu); }
  </style></head><body>
    <div class="sample-popover" id="popover"><div class="sample-popover-title" id="title">标题</div>
      <button class="sample-popover-option" id="option"><span class="sample-popover-option-label" id="label">选项</span></button>
      <div class="sample-popover-note sample-note" id="note">提示</div>
      <div class="sample-dropdown" id="mixed-child">浮层内部组件</div>
      <div role="menu" id="legacy-submenu"><button role="menuitem">子菜单</button></div>
      <div data-menu-material="translucent" id="native-submenu"><div class="sample-material" id="native-material"></div></div>
    </div>
    <div class="sample-dropdown" id="dropdown"><span class="sample-dropdown-label" id="dropdown-label">下拉文字</span></div>
    <div data-menu-material="translucent"><span class="sample-popover-label" id="native-label">原生菜单内部文字</span></div>
    <div class="sample-card" id="card">非目标常驻卡片</div><img class="sample-avatar" id="avatar">
  </body></html>`)
  await popupPage.addScriptTag({ content: genScript })
  await popupPage.addScriptTag({ content: seamScript })
  await popupPage.addScriptTag({ content: glassScript })
  for (const dark of [false, true]) {
    for (const preset of ['clear', 'standard', 'frosted']) {
      const sample = await popupPage.evaluate(({ dark, preset }) => {
        window.__glass.applyGlassSettings({ enabled: false })
        document.body.toggleAttribute('data-ds-dark-theme', dark)
        const snapshot = () => Object.fromEntries(
          ['popover', 'title', 'option', 'label', 'note', 'mixed-child', 'legacy-submenu', 'native-material', 'dropdown', 'dropdown-label', 'native-label', 'card', 'avatar'].map(id => {
            const style = getComputedStyle(document.getElementById(id))
            return [id, { background: style.backgroundColor, filter: style.backdropFilter, outline: style.outlineStyle, border: style.borderTopColor }]
          }),
        )
        const before = snapshot()
        window.__glass.applyGlassSettings({ enabled: true, mode: 'compat', preset })
        const compat = snapshot()
        document.getElementById('option').focus()
        const focusVisible = document.getElementById('option').matches(':focus-visible')
        const focusOutline = getComputedStyle(document.getElementById('option')).outlineStyle
        window.__glass.applyGlassSettings({ enabled: false })
        document.getElementById('option').blur()
        const disabled = snapshot()
        window.__glass.applyGlassSettings({ enabled: true, mode: 'mica', preset })
        const mica = snapshot()
        window.__glass.applyGlassSettings({ enabled: false })
        return { before, compat, disabled, mica, focusVisible, focusOutline }
      }, { dark, preset })
      const name = `${dark ? '深色' : '浅色'}/${preset}`
      for (const id of ['title', 'option', 'label', 'note', 'mixed-child', 'dropdown-label', 'native-label', 'card', 'avatar']) {
        assert.deepEqual(sample.compat[id], sample.before[id], `${name}/${id} 不得被玻璃兜底规则污染`)
      }
      for (const id of ['popover', 'dropdown', 'legacy-submenu', 'native-material']) {
        assert.equal(sample.compat[id].filter, 'blur(12px)', `${name}/${id} 应保留独立磨砂`)
        assert.notEqual(sample.compat[id].background, 'rgba(0, 0, 0, 0)', `${name}/${id} 应保留材质背景`)
      }
      assert.equal(sample.compat.popover.outline, 'solid', `${name} 保留外壳描边`)
      assert.deepEqual(sample.disabled, sample.before, `${name} 关闭后应恢复原样`)
      assert.deepEqual(sample.mica.title, sample.before.title, `${name} 不影响云母模式的普通文字`)
      if (sample.focusVisible) assert.equal(sample.focusOutline, 'solid', `${name} 保留键盘焦点描边`)
    }
  }
  await popupPage.close()
  console.log('Issue #104：深浅主题 × 三档预设，浮层外壳、内部隔离、混合前缀、嵌套菜单、非目标样式及关闭恢复检查通过')

  console.log('通用外扩装饰与玻璃层共存：两种模式、三种预设均通过')
  console.log('玻璃材质计算样式校验：')
  for (const row of rows) {
    console.log(`  ${row.ok ? '✓' : '×'} ${row.label} = ${row.actual}`)
  }
  console.log(`共 ${rows.length} 项断言通过`)
} finally {
  await browser.close()
}
