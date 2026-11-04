/**
 * 设置页（官方设置工作台皮肤）几何与材质的「计算样式」校验：在真实 Chromium 里注入
 * SETTINGS_SKIN_CSS，按两代宿主结构各搭一页，读回实际计算值。
 *
 * 为什么需要它：`settings-skin` 里全是 `!important` 的布局覆盖，jsdom 没有布局引擎，
 * 现有用例只能断言类名 / 文案，证明不了「宽度真是 280」「间距真是 24/32/48」
 * 「底色真的是 layer-2 而不是变量名写错后的兜底暗色」。上一轮改动（gap 12→0、
 * 底色 --dsw-specific-sidebar-fill → --dsw-alias-bg-layer-2、内边距 48→32、
 * align-items center→stretch）就属于这类「看着改了、实际算出来是多少没人量」的改动。
 *
 * 两代结构（都在真实宿主里出现过，必须分别量）：
 * - 嵌套（0.2.1-rc.x）：panel > nav + div.content(header, options)
 *   → 命中 `...:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2)`
 * - 扁平 Grid（0.2.2-alpha.x）：panel > navTitle + nav + header + options
 *   → 命中 `...:has(> [class*="options"])` 的 grid 分支
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import ts from 'typescript'

/** 把 TS 源码里的常量取出来（去掉 import / export），返回可在页面里 eval 的脚本 */
function moduleToScript(path, extraExports = '') {
  const source = readFileSync(path, 'utf8')
    .replace(/^import[\s\S]*?from .*$/gm, '')
    .replaceAll('export ', '')
  return ts.transpileModule(source + '\n' + extraExports, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
      removeComments: false,
    },
  }).outputText
}

const skinScript = moduleToScript(
  'src/client/settings-skin/index.ts',
  'window.__skin = { SETTINGS_SKIN_CSS };',
)

/** 两代宿主的结构都照抄真实标记（含 `[class*="…"]` 选择器依赖的类名片段） */
const NESTED_BODY = `
<div class="wo_overlay" role="presentation">
  <div class="wo_panel" data-shortcut-modal="settings" role="dialog" aria-modal="true">
    <nav class="wo_nav">
      <div class="wo_navTitle" id="settings-title">设置</div>
      <div class="wo_navList">
        <button type="button" class="wo_navCell"><svg class="wo_navIcon"></svg><span class="wo_navLabel">通用</span></button>
        <button type="button" class="wo_navCell wo_active" aria-current="true"><svg class="wo_navIcon"></svg><span class="wo_navLabel">Codex UI</span></button>
      </div>
    </nav>
    <div class="wo_content">
      <div class="wo_header"><div class="wo_actions"></div><button type="button" class="wo_close">x</button></div>
      <div class="wo_options">
        <section class="wo_section"><div class="wo_card">卡片一</div></section>
        <section class="wo_section"><div class="wo_card">卡片二</div></section>
      </div>
    </div>
  </div>
</div>`

const GRID_BODY = `
<div class="wo_overlay" role="presentation">
  <div class="wo_panel" data-shortcut-modal="settings" role="dialog" aria-modal="true">
    <div class="wo_navTitle" id="settings-title">设置</div>
    <nav class="wo_nav">
      <div class="wo_navList">
        <button type="button" class="wo_navCell"><svg class="wo_navIcon"></svg><span class="wo_navLabel">通用</span></button>
      </div>
    </nav>
    <div class="wo_header"><div class="wo_actions"></div></div>
    <div class="wo_options">
      <section class="wo_section"><div class="wo_card">卡片一</div></section>
    </div>
  </div>
</div>`

/** 宿主 token：云母深色下的一组真实取值；浅色另给一套，见 render() */
const TOKENS = `
:root {
  --dsw-alias-bg-layer-2: #18181b;
  --dsw-alias-bg-layer-1: #232329;
  --dsw-alias-bg-base: #0e0e11;
  --dsw-alias-border-l1: rgba(255, 255, 255, 0.08);
  --dsw-alias-label-primary: #f4f4f5;
  --dsw-alias-label-secondary: #a1a1aa;
  --dsw-specific-sidebar-fill: #141419;
  --dsw-static-neutral-bluish-00: #ffffff;
  --dsw-static-neutral-bluish-60: #eef0f4;
  --dsh-glass-rim-soft: rgba(0, 0, 0, 0.08);
  --dsh-glass-drop: 0 8px 24px rgba(0, 0, 0, 0.08);
}
body { margin: 0; }
.wo_overlay { position: fixed; inset: 0; display: flex; }
.wo_panel { display: flex; width: 1400px; height: 900px; }
.wo_nav, .wo_content, .wo_options { display: flex; flex-direction: column; }
.wo_content { flex: 1 1 auto; min-width: 0; }
.wo_header { height: 48px; display: flex; }
.wo_section { margin: 0 0 12px; }
.wo_card { height: 40px; }
`

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  await page.route('http://settings.test/', route =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>' }),
  )
  await page.goto('http://settings.test/')
  await page.addScriptTag({ content: skinScript })

  /**
   * 按「结构 / 明暗 / 玻璃形态」渲染一页并读回计算样式。
   * @param shape 'nested'（0.2.1-rc.x）或 'grid'（0.2.2-alpha.x）
   * @param theme 'dark' 或 'light'
   * @param glass 'none' | 'float'（云母双岛）
   */
  const measure = (shape, theme, glass = 'none') =>
    page.evaluate(({ shape, theme, glass, body, tokens }) => {
      const { SETTINGS_SKIN_CSS } = window.__skin
      document.documentElement.innerHTML = '<head><meta charset="utf-8"></head><body></body></html>'
      const style = document.createElement('style')
      style.textContent = tokens
      document.head.appendChild(style)
      const skin = document.createElement('style')
      skin.id = 'skin-under-test'
      skin.textContent = SETTINGS_SKIN_CSS
      document.head.appendChild(skin)
      document.body.innerHTML = body

      const html = document.documentElement
      if (theme === 'light') {
        html.setAttribute('data-ds-theme-source', 'light')
        document.body.removeAttribute('data-ds-dark-theme')
        html.style.setProperty('--dsw-alias-bg-base', '#f7f7f9')
        html.style.setProperty('--dsw-alias-bg-layer-1', '#ffffff')
        html.style.setProperty('--dsw-alias-bg-layer-2', '#f1f1f4')
        html.style.setProperty('--dsw-specific-sidebar-fill', '#f4f4f6')
      } else {
        document.body.setAttribute('data-ds-dark-theme', '')
      }
      if (glass === 'float') {
        html.setAttribute('data-dsh-glass', '')
        html.setAttribute('data-dsh-glass-float', '')
      }

      const panel = document.querySelector('[data-shortcut-modal="settings"]')
      const nav = panel.querySelector(':scope > nav')
      const navTitle = panel.querySelector(':scope > [class*="navTitle"]')
      const content = shape === 'nested' ? panel.querySelector(':scope > div:not(nav)') : null
      const header = shape === 'nested' ? content.children[0] : panel.querySelector(':scope > [class*="header"]')
      const options = shape === 'nested' ? content.children[1] : panel.querySelector(':scope > [class*="options"]')
      const card = options.querySelector('.wo_card')

      const cs = el => getComputedStyle(el)
      const rect = el => {
        const r = el.getBoundingClientRect()
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
      }
      const px = value => Math.round(Number.parseFloat(value) * 100) / 100
      const gapOf = el => {
        const s = cs(el)
        const row = s.rowGap === 'normal' ? 0 : px(s.rowGap)
        const column = s.columnGap === 'normal' ? 0 : px(s.columnGap)
        return { row, column }
      }

      return {
        shape,
        theme,
        glass,
        panel: {
          width: px(rect(panel).width),
          display: cs(panel).display,
          gridTemplateColumns: cs(panel).gridTemplateColumns,
          background: cs(panel).backgroundColor,
        },
        nav: {
          width: px(rect(nav).width),
          minWidth: px(cs(nav).minWidth),
          maxWidth: px(cs(nav).maxWidth),
          gap: gapOf(nav),
          padding: [cs(nav).paddingTop, cs(nav).paddingRight, cs(nav).paddingBottom, cs(nav).paddingLeft].map(px),
          background: cs(nav).backgroundColor,
          borderRightWidth: px(cs(nav).borderRightWidth),
        },
        navTitle: navTitle === null ? null : {
          width: px(rect(navTitle).width),
          padding: [cs(navTitle).paddingTop, cs(navTitle).paddingBottom].map(px),
          background: cs(navTitle).backgroundColor,
          borderRadius: cs(navTitle).borderRadius,
          gridColumn: cs(navTitle).gridColumn,
          gridRow: cs(navTitle).gridRow,
        },
        content: content === null ? null : { background: cs(content).backgroundColor },
        header: {
          height: px(rect(header).height),
          paddingInline: [cs(header).paddingLeft, cs(header).paddingRight].map(px),
        },
        options: {
          padding: [cs(options).paddingTop, cs(options).paddingRight, cs(options).paddingBottom, cs(options).paddingLeft].map(px),
          alignItems: cs(options).alignItems,
          flexDirection: cs(options).flexDirection,
          background: cs(options).backgroundColor,
          gridColumn: cs(options).gridColumn,
        },
        card: {
          maxWidth: px(cs(card).maxWidth),
          width: px(rect(card).width),
          leftGap: px(rect(card).left - rect(options).left),
          rightGap: px(rect(options).right - rect(card).right),
        },
      }
    }, { shape, theme, glass, body: shape === 'nested' ? NESTED_BODY : GRID_BODY, tokens: TOKENS })

  const rows = []
  const check = (label, actual, predicate, expectation) => {
    rows.push({ label, actual: JSON.stringify(actual), ok: predicate(actual) })
    assert.ok(predicate(actual), `${label}：期望 ${expectation}，实际 ${JSON.stringify(actual)}`)
  }
  const eq = expected => actual => actual === expected
  const ARR = expected => actual =>
    Array.isArray(actual) && actual.length === expected.length && actual.every((x, i) => x === expected[i])

  // ── 1. 嵌套（0.2.1-rc.x）：左栏宽度 / 间距 / 底色 / 内边距 ──
  const nestedDark = await measure('nested', 'dark')
  check('嵌套·左栏宽度', nestedDark.nav.width, eq(280), '280px')
  check('嵌套·左栏 min/max 宽度', [nestedDark.nav.minWidth, nestedDark.nav.maxWidth], ARR([280, 280]), '[280, 280]')
  check('嵌套·左栏 gap 归零', nestedDark.nav.gap, v => v.row === 0 && v.column === 0, 'row/column 均为 0')
  check('嵌套·左栏内边距', nestedDark.nav.padding, ARR([16, 12, 24, 12]), '[16,12,24,12]')
  check('嵌套·左栏底色 = layer-2 且不透明', nestedDark.nav.background, eq('rgb(24, 24, 27)'), 'rgb(24, 24, 27)')
  check('嵌套·面板底色 = layer-2', nestedDark.panel.background, eq('rgb(24, 24, 27)'), 'rgb(24, 24, 27)')
  check('嵌套·内容列底色 = layer-2', nestedDark.content.background, eq('rgb(24, 24, 27)'), 'rgb(24, 24, 27)')
  check('嵌套·滚动区内边距', nestedDark.options.padding, ARR([24, 32, 48, 32]), '[24,32,48,32]')
  check('嵌套·滚动区对齐 = stretch', nestedDark.options.alignItems, eq('stretch'), 'stretch')
  check('嵌套·顶栏高度', nestedDark.header.height, eq(56), '56px')
  check('嵌套·顶栏左右内边距', nestedDark.header.paddingInline, ARR([32, 32]), '[32,32]')
  check('嵌套·卡片最大宽度', nestedDark.card.maxWidth, eq(800), '800px')

  // ── 2. 扁平 Grid（0.2.2-alpha.x）──
  const gridDark = await measure('grid', 'dark')
  check('Grid·面板布局为 grid', gridDark.panel.display, eq('grid'), 'grid')
  check(
    'Grid·两列 280px + 1fr',
    gridDark.panel.gridTemplateColumns,
    v => v === `280px ${gridDark.panel.width - 280}px`,
    `280px ${gridDark.panel.width - 280}px`,
  )
  check('Grid·面板铺满视口宽度（position:fixed）', gridDark.panel.width, eq(1600), '1600px')
  check('Grid·navTitle 行 1 列 1', [gridDark.navTitle.gridRow, gridDark.navTitle.gridColumn], ARR(['1', '1']), "['1','1']")
  check('Grid·navTitle 宽度 280', gridDark.navTitle.width, eq(280), '280px')
  check('Grid·navTitle 内边距 16/8', gridDark.navTitle.padding, ARR([16, 8]), '[16,8]')
  check('Grid·navTitle 底色 = layer-2', gridDark.navTitle.background, eq('rgb(24, 24, 27)'), 'rgb(24, 24, 27)')
  check('Grid·nav 内边距 0/24', gridDark.nav.padding, ARR([0, 12, 24, 12]), '[0,12,24,12]')
  check('Grid·options 内边距 76/32/48', [gridDark.options.padding[0], gridDark.options.padding[1], gridDark.options.padding[2]], ARR([76, 32, 48]), '[76,32,48]')
  check('Grid·options 对齐 = stretch', gridDark.options.alignItems, eq('stretch'), 'stretch')
  check('Grid·卡片最大宽度', gridDark.card.maxWidth, eq(800), '800px')

  // ── 3. 浅色模式：绝不回退暗色兜底 ──
  const nestedLight = await measure('nested', 'light')
  check('浅色·面板底色 = bg-base', nestedLight.panel.background, eq('rgb(247, 247, 249)'), 'rgb(247, 247, 249)')
  check('浅色·内容列底色 = layer-1', nestedLight.content.background, eq('rgb(255, 255, 255)'), 'rgb(255, 255, 255)')
  check('浅色·左栏底色 = layer-2(浅)', nestedLight.nav.background, eq('rgb(241, 241, 244)'), 'rgb(241, 241, 244)')
  const gridLight = await measure('grid', 'light')
  check('浅色 Grid·options 底色 = layer-1', gridLight.options.background, eq('rgb(255, 255, 255)'), 'rgb(255, 255, 255)')

  // ── 4. 云母双岛（Grid 形态）：左栏上圆角 + 内边距 ──
  const gridFloat = await measure('grid', 'dark', 'float')
  check('云母·navTitle 上圆角 16px', gridFloat.navTitle.borderRadius, v => v.startsWith('16px 16px 0px 0px'), '16px 16px 0 0')
  check('云母·navTitle 内边距 16/8', gridFloat.navTitle.padding, ARR([16, 8]), '[16,8]')
  check('云母·nav 内边距 0/24', gridFloat.nav.padding, ARR([0, 12, 24, 12]), '[0,12,24,12]')
  check('云母·options 仍在第 2 列', gridFloat.options.gridColumn, eq('2'), '2')

  console.log('设置页几何校验：')
  for (const row of rows) console.log(`  ✓ ${row.label} = ${row.actual}`)
  console.log(`共 ${rows.length} 项断言通过`)
  console.log(
    `参考：嵌套态卡片宽 ${nestedDark.card.width}px，左右留白 ${nestedDark.card.leftGap}/${nestedDark.card.rightGap}px（列宽 ${JSON.stringify(nestedDark.options.padding)} 内边距下的对齐方式）`,
  )
} finally {
  await browser.close()
}
