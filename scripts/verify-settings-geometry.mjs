/**
 * 设置页（官方设置工作台皮肤）几何与材质的「计算样式」校验：在真实 Chromium 里注入
 * SETTINGS_SKIN_CSS，读回 DSH 0.2.2+ 扁平 Grid 宿主结构的实际计算值。
 *
 * 为什么需要它：`settings-skin` 里全是 `!important` 的布局覆盖，jsdom 没有布局引擎，
 * 现有用例只能断言类名 / 文案，证明不了「宽度真是 280」「间距真是 24/32/48」
 * 「底色真的是 layer-2 而不是变量名写错后的兜底暗色」。
 *
 * 0.2.2+ 扁平 Grid 结构：panel > navTitle + nav + header + options
 * → 命中 `...:has(> [class*="options"])` 的 grid 分支
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

/** 0.2.2+ 宿主扁平 Grid 结构（含 `[class*="…"]` 选择器依赖的类名片段） */
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
   * 按「明暗 / 玻璃形态」渲染一页并读回计算样式。
   * @param theme 'dark' 或 'light'
   * @param glass 'none' | 'float'（云母双岛）
   */
  const measure = (theme, glass = 'none') =>
    page.evaluate(({ theme, glass, body, tokens }) => {
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
      const header = panel.querySelector(':scope > [class*="header"]')
      const options = panel.querySelector(':scope > [class*="options"]')
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
    }, { theme, glass, body: GRID_BODY, tokens: TOKENS })

  const rows = []
  const check = (label, actual, predicate, expectation) => {
    rows.push({ label, actual: JSON.stringify(actual), ok: predicate(actual) })
    assert.ok(predicate(actual), `${label}：期望 ${expectation}，实际 ${JSON.stringify(actual)}`)
  }
  const eq = expected => actual => actual === expected
  const ARR = expected => actual =>
    Array.isArray(actual) && actual.length === expected.length && actual.every((x, i) => x === expected[i])

  // ── 1. 扁平 Grid（0.2.2+）──
  const gridDark = await measure('dark')
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

  // ── 2. 浅色模式：绝不回退暗色兜底 ──
  const gridLight = await measure('light')
  check('浅色 Grid·options 底色 = layer-1', gridLight.options.background, eq('rgb(255, 255, 255)'), 'rgb(255, 255, 255)')

  // ── 3. 云母双岛（Grid 形态）：左栏上圆角 + 内边距 ──
  const gridFloat = await measure('dark', 'float')
  check('云母·navTitle 上圆角 16px', gridFloat.navTitle.borderRadius, v => v.startsWith('16px 16px 0px 0px'), '16px 16px 0 0')
  check('云母·navTitle 内边距 16/8', gridFloat.navTitle.padding, ARR([16, 8]), '[16,8]')
  check('云母·nav 内边距 0/24', gridFloat.nav.padding, ARR([0, 12, 24, 12]), '[0,12,24,12]')
  check('云母·options 仍在第 2 列', gridFloat.options.gridColumn, eq('2'), '2')

  // ── 4. Issue #82 防护：第三方插件（如 our-free-model）在设置区放 <nav> 容器时，内部按钮完全不受整宽污染 ──
  const checkPluginTabs = async () => {
    const tabsHtml = `
      <section class="wo_section">
        <nav class="ofm_nav" style="width: 609px;">
          <div class="ofm_tabs" role="tablist" style="display: flex; flex-wrap: wrap; gap: 4px;">
            <button role="tab" style="box-sizing: border-box; width: 80px; height: 26px; padding: 2px 8px;">Tab 1</button>
            <button role="tab" style="box-sizing: border-box; width: 80px; height: 26px; padding: 2px 8px;">Tab 2</button>
          </div>
        </nav>
      </section>
    `
    const bodyWithTabs = GRID_BODY.replace(
      '<section class="wo_section"><div class="wo_card">卡片一</div></section>',
      tabsHtml,
    )
    const result = await page.evaluate(({ body, tokens }) => {
      document.body.innerHTML = body + `<style>${tokens}</style><style>${window.__skin.SETTINGS_SKIN_CSS}</style>`
      const btn = document.querySelector('.ofm_tabs button')
      const hostBtn = document.querySelector('.wo_navCell')
      return {
        tabBtnWidth: btn.getBoundingClientRect().width,
        tabBtnHeight: btn.getBoundingClientRect().height,
        hostBtnHeight: hostBtn.getBoundingClientRect().height,
      }
    }, { body: bodyWithTabs, tokens: TOKENS })
    check('grid·第三方插件Tab按钮宽度不受污染', result.tabBtnWidth, eq(80), '80px')
    check('grid·第三方插件Tab按钮高度不受污染', result.tabBtnHeight, eq(26), '26px')
    check('grid·宿主左侧导航按钮高度保持32px胶囊', result.hostBtnHeight, eq(32), '32px')
  }
  await checkPluginTabs()

  console.log('设置页几何校验：')
  for (const row of rows) console.log(`  ✓ ${row.label} = ${row.actual}`)
  console.log(`共 ${rows.length} 项断言通过`)
} finally {
  await browser.close()
}
