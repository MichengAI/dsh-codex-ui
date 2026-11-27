/** 使用宿主发布的侧栏样式 + 真实 Chromium 验证 Issue #116 接管态、透传态、旧宿主降级态与折叠态计算样式。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { chromium } from 'playwright'
import { tsImport } from 'tsx/esm/api'

const require = createRequire(import.meta.url)
const hostSidebar = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-sidebar/client'), 'utf8')
const marker = 'SidebarRoot.module.css":{text:'
const idx = hostSidebar.indexOf(marker)
assert.notEqual(idx, -1, '未找到宿主 SidebarRoot.module.css')
const start = hostSidebar.indexOf('`', idx)
const end = hostSidebar.indexOf('`}', start)
assert.ok(start !== -1 && end !== -1, '宿主 SidebarRoot.module.css 提取失败')
const hostCss = hostSidebar.slice(start + 1, end)

const classesMatch = hostSidebar.match(/var SidebarRoot_module_css_default\s*=\s*(\{[\s\S]*?\});/)
assert.ok(classesMatch, '未找到宿主 SidebarRoot_module_css_default 类名表')
const hostClasses = runInNewContext(`(${classesMatch[1]})`)

const { SIDEBAR_CSS, SIDEBAR_ACTIVE_ATTR } = await tsImport('../src/client/sidebar/styles.ts', import.meta.url)

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.setContent(`
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        --dsw-radius-md: 8px;
        --dsw-radius-sm: 6px;
        --dsw-alias-label-primary: #18181b;
        --dsw-alias-label-secondary: #52525b;
        --dsw-alias-border-l3: rgba(0, 0, 0, 0.14);
        --dsw-alias-button-elevated-fill: #ffffff;
        --dsw-alias-interactive-bg-hover: rgba(0, 0, 0, 0.06);
        --dsw-specific-sidebar-fill: #f4f4f5;
      }
      .official_importBtn {
        height: 38px;
        width: 38px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      }
    </style>
    <style>${hostCss}</style>
    <style>${SIDEBAR_CSS}</style>
    <div id="root" class="${hostClasses.root}" ${SIDEBAR_ACTIVE_ATTR}="true" style="width: 260px;">
      <div class="${hostClasses.newSessionRow}">
        <div data-slot="sidebar.session.action" style="display: contents;">
          <button type="button" class="dcu-sb-row dcu-sb-new-session-row">新会话</button>
          <button type="button" class="official_importBtn" aria-label="导入 DeepSeek 会话">↑</button>
        </div>
      </div>
      <div class="dcu-sidebar-nav-root">
        <nav class="dcu-sb-root">
          <div class="dcu-sb-section"><button type="button" class="dcu-sb-row">插件</button></div>
        </nav>
      </div>
      <div class="${hostClasses.scrollRegion}">
        <nav class="${hostClasses.panelList}"></nav>
      </div>
    </div>
  `)

  // 1. 接管态：newSessionRow 保持可见，Codex 新会话与第三方导入按钮均扁平对齐为 36px 无框胶囊
  const takeover = await page.evaluate(classes => {
    const row = document.querySelector(`.${classes.newSessionRow}`)
    const codexBtn = document.querySelector('.dcu-sb-new-session-row')
    const importBtn = document.querySelector('.official_importBtn')
    const panelList = document.querySelector(`.${classes.panelList}`)
    const rowStyle = getComputedStyle(row)
    const codexStyle = getComputedStyle(codexBtn)
    const importStyle = getComputedStyle(importBtn)
    return {
      rowDisplay: rowStyle.display,
      rowGap: rowStyle.gap,
      rowMarginLeft: rowStyle.marginLeft,
      codexHeight: codexStyle.height,
      codexBorderTop: codexStyle.borderTopWidth,
      codexBg: codexStyle.backgroundColor,
      codexGrow: codexStyle.flexGrow,
      importHeight: importStyle.height,
      importBorderTop: importStyle.borderTopWidth,
      importBg: importStyle.backgroundColor,
      importRadius: importStyle.borderRadius,
      panelListDisplay: getComputedStyle(panelList).display,
    }
  }, hostClasses)

  assert.equal(takeover.rowDisplay, 'flex', '接管态 newSessionRow 必须保持 flex 可见')
  assert.equal(takeover.rowGap, '4px', '接管态 newSessionRow 间距应为 4px')
  assert.equal(takeover.rowMarginLeft, '2px', '接管态 newSessionRow 左外边距应对齐 2px')
  assert.equal(takeover.codexHeight, '36px', 'Codex 新会话按钮高度应为 36px')
  assert.equal(takeover.codexBorderTop, '0px', 'Codex 新会话按钮不应有边框')
  assert.equal(takeover.codexBg, 'rgba(0, 0, 0, 0)', 'Codex 新会话按钮默认底色应透明')
  assert.equal(takeover.codexGrow, '1', 'Codex 新会话按钮应 flex-grow: 1 占满左侧')
  assert.equal(takeover.importHeight, '36px', '同行扩展按钮高度应统一为 36px')
  assert.equal(takeover.importBorderTop, '0px', '同行扩展按钮不应保留外框')
  assert.equal(takeover.importBg, 'rgba(0, 0, 0, 0)', '同行扩展按钮默认底色应统一透明')
  assert.equal(takeover.importRadius, '8px', '同行扩展按钮圆角应为 8px')
  assert.equal(takeover.panelListDisplay, 'none', '展开态宿主 panelList 应保持隐藏')

  // 2. 透传态（如无 uiWorkspace.startSession 降级放行原生按钮，且 .dcu-sidebar-nav-root 内无降级行）
  await page.evaluate(classes => {
    const slot = document.querySelector('[data-slot="sidebar.session.action"]')
    const codexBtn = slot.querySelector('.dcu-sb-new-session-row')
    const nativeBtn = document.createElement('button')
    nativeBtn.type = 'button'
    nativeBtn.className = classes.newSession
    nativeBtn.textContent = '原生新会话'
    codexBtn.replaceWith(nativeBtn)
  }, hostClasses)

  const passthrough = await page.evaluate(classes => {
    const row = document.querySelector(`.${classes.newSessionRow}`)
    const nativeBtn = document.querySelector(`button.${classes.newSession}`)
    const importBtn = document.querySelector('.official_importBtn')
    return {
      rowDisplay: getComputedStyle(row).display,
      nativeDisplay: getComputedStyle(nativeBtn).display,
      importDisplay: getComputedStyle(importBtn).display,
    }
  }, hostClasses)

  assert.notEqual(passthrough.rowDisplay, 'none', '透传态 newSessionRow 绝不能被隐藏')
  assert.notEqual(passthrough.nativeDisplay, 'none', '透传态原生 newSession 按钮必须可见')
  assert.notEqual(passthrough.importDisplay, 'none', '透传态扩展按钮必须可见')

  // 3. 旧宿主降级态（.dcu-sidebar-nav-root 内渲染降级 .dcu-sb-new-session-row）
  await page.evaluate(() => {
    const navRoot = document.querySelector('.dcu-sb-root')
    const fallbackBtn = document.createElement('button')
    fallbackBtn.type = 'button'
    fallbackBtn.className = 'dcu-sb-row dcu-sb-new-session-row'
    fallbackBtn.textContent = '降级新会话'
    navRoot.prepend(fallbackBtn)
  })

  const legacy = await page.evaluate(classes => {
    const row = document.querySelector(`.${classes.newSessionRow}`)
    const nativeBtn = document.querySelector(`button.${classes.newSession}`)
    return {
      rowDisplay: getComputedStyle(row).display,
      nativeDisplay: getComputedStyle(nativeBtn).display,
    }
  }, hostClasses)

  assert.equal(legacy.rowDisplay, 'none', '旧宿主降级态下应隐藏宿主 newSessionRow')
  assert.equal(legacy.nativeDisplay, 'none', '旧宿主降级态下应隐藏宿主 newSession 按钮')

  // 4. 折叠态：隐藏自研导轨，恢复展示宿主原生行与按钮
  await page.evaluate(classes => {
    document.getElementById('root').classList.add(classes.collapsed)
  }, hostClasses)

  const collapsed = await page.evaluate(classes => {
    const customRoot = document.querySelector('.dcu-sb-root')
    const row = document.querySelector(`.${classes.newSessionRow}`)
    const nativeBtn = document.querySelector(`button.${classes.newSession}`)
    return {
      customDisplay: getComputedStyle(customRoot).display,
      rowDisplay: getComputedStyle(row).display,
      nativeDisplay: getComputedStyle(nativeBtn).display,
    }
  }, hostClasses)

  assert.equal(collapsed.customDisplay, 'none', '折叠态必须隐藏 .dcu-sb-root')
  assert.notEqual(collapsed.rowDisplay, 'none', '折叠态宿主 newSessionRow 必须恢复可见')
  assert.notEqual(collapsed.nativeDisplay, 'none', '折叠态宿主 newSession 按钮必须恢复可见')

  console.log('侧栏新会话行接管校验：接管态扁平对齐、透传态可见性、旧宿主降级隐藏与折叠态恢复全部通过')
} finally {
  await browser.close()
}
