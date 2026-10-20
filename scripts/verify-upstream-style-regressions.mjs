/** 按 0.1.5 新增的附件与顶栏 DOM/CSS 合约验证覆盖后的计算布局。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import ts from 'typescript'

const skin = readFileSync('src/client/CodexSidebar.tsx', 'utf8').match(/const stylesheet = `([\s\S]*?)`/)[1]
const header = readFileSync('src/client/conversation-header.ts', 'utf8').match(/export const CONVERSATION_HEADER_STYLE = `([\s\S]*?)`/)[1]
const railPx = Number(readFileSync('src/client/sidebar-width.ts', 'utf8').match(/export const CODEX_SIDEBAR_RAIL_PX = (\d+)/)[1])
const bubbleScript = ts.transpileModule(readFileSync('src/client/conversation-bubbles.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const nativeNavigatorCss = readFileSync('scripts/fixtures/upstream-rc2/TurnNavigator.module.css', 'utf8')
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  // 官方预览默认向左展开；导航移到左侧后应朝内容区展开，动画仍由宿主提供。
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.setContent(`<style>
    ${nativeNavigatorCss}
    ${skin}
    </style><nav class="frame" data-dcu-official-turn-navigator style="--dsh-composer-side-clearance:-84px;--turn-natural-height:100px"><div class="preview" role="tooltip">预览</div></nav>`)
  const preview = await page.locator('[role=tooltip]').evaluate(node => ({
    left: parseFloat(getComputedStyle(node).left),
    animation: getComputedStyle(node).animationName,
    duration: getComputedStyle(node).animationDuration,
  }))
  assert.equal(preview.left, 38, '预览必须位于导航右侧并保留 10px 间距')
  assert.equal(preview.animation, 'dsh-turn-preview-enter', '保留官方预览动画')
  assert.equal(preview.duration, '0.12s', '保留官方动画时长')
  for (const width of [390, 900, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.setContent(`<style>
      .card{display:flex;flex-direction:column;gap:12px}.abc_rail{padding:2px 10px 0;margin-bottom:-6px}
      .inner_root{position:relative;min-width:0}.inner_rail{display:flex;overflow:auto hidden;gap:10px}.thumbnail{display:block;height:64px;width:64px}
      [data-message-attachments]{display:flex;flex-wrap:wrap;gap:8px}
      header,.titleRow,.titleCluster{display:flex}.headerCorner{margin-left:8px;margin-right:-16px}
      ${skin}${header}
      </style><section data-conversation-scroll><div class="card" data-composer-card><div data-slot="conversation.input.attachments" style="display:contents"><div class="abc_rail"><div class="inner_root"><div class="inner_rail"><div class="thumbnail">附件</div></div></div></div></div><div data-input-scroll style="height:44px">正文</div><div><button>发送</button></div></div></section>
      <header><div class="titleRow"><div class="titleCluster"><div class="crumbs">项目</div><div class="headerActions">操作</div></div><div class="headerUtilities">工具</div><div class="headerCorner" data-conversation-header-corner>右栏</div></div><div data-dcu-inline-tabs role="tablist"><button role="tab">对话</button></div></header>
      <div data-time-hover-root><div><div data-message-attachments data-dcu-expandable-user-bubble><span>文件一</span><span>文件二</span></div></div></div>
      <div data-time-hover-root><div><div data-message-attachments>附件</div><div class="host_bubble">正文</div><div class="referenceSummary">引用</div></div></div>`)
    await page.evaluate(code => {
      const exports = {}
      new Function('exports', code)(exports)
      exports.restoreOfficialUserBubbles(document)
    }, bubbleScript)
    const geometry = await page.evaluate(() => ({
      gap: document.querySelector('[data-input-scroll]').getBoundingClientRect().top - document.querySelector('.thumbnail').getBoundingClientRect().bottom,
      order: getComputedStyle(document.querySelector('[data-conversation-header-corner]')).order,
      trailingMargin: getComputedStyle(document.querySelector('[data-conversation-header-corner]')).marginRight,
      attachmentDisplays: [...document.querySelectorAll('[data-message-attachments]')].map(node => getComputedStyle(node).display),
      expanded: [...document.querySelectorAll('[data-dcu-expandable-user-bubble]')].map(node => node.textContent),
    }))
    assert.equal(geometry.gap, 6, `${width}px：附件与正文保留官方 6px 可见间距`)
    assert.equal(geometry.order, '5', '右栏展开入口位于页签及工具之后')
    assert.equal(geometry.trailingMargin, '0px', '摊平顶栏后不保留原嵌套布局的负外边距')
    assert.deepEqual(geometry.attachmentDisplays, ['flex', 'flex'], '纯附件和混排消息均保留官方排列')
    assert.deepEqual(geometry.expanded, [], '气泡与附件均不得残留展开覆盖标记')
  }
  // 紧凑顶栏必须单行：换行按 flex-basis 的内容宽度判定（收缩发生在换行之后），
  // 长标题会把 order 最大的右栏入口挤到第二行左侧，并把顶栏撑高。
  for (const width of [1440, 900, 720]) {
    await page.setViewportSize({ width, height: 900 })
    await page.setContent(`<style>
      .wSkVaW_titleRow,.wSkVaW_titleCluster,.wSkVaW_crumbs,.wSkVaW_crumbSeg,.wSkVaW_headerActions,.wSkVaW_headerUtilities,.wSkVaW_headerCorner,.wSkVaW_tabs{display:flex}
      .wSkVaW_titleCluster{flex:1;gap:10px;min-width:0}.wSkVaW_crumbs{white-space:nowrap;align-items:center;gap:4px;min-width:0;overflow:hidden}
      .wSkVaW_crumbSeg{align-items:center;gap:4px;min-width:0}.wSkVaW_crumb{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .wSkVaW_headerActions{flex:none;gap:8px}.wSkVaW_headerUtilities{flex:none;gap:8px;margin-left:20px}.wSkVaW_headerCorner{flex:none;margin-left:8px;margin-right:-16px}
      ${skin}${header}
      </style><header class="wSkVaW_header"><div class="wSkVaW_titleRow"><div class="host_headerLeading">侧</div><div class="wSkVaW_titleCluster">
      <nav class="wSkVaW_crumbs"><span class="wSkVaW_crumbSeg"><button type="button" class="wSkVaW_crumb">父会话标题很长很长很长</button></span><span class="wSkVaW_crumbSeg"><span>／</span><button type="button" data-dcu-title-folder></button><button type="button" class="wSkVaW_crumb wSkVaW_crumbCurrent" disabled>当前会话标题也很长很长很长</button><button type="button" data-dcu-title-more></button></span></nav>
      <div class="wSkVaW_headerActions"><button type="button">标准模式</button><button type="button">Agent Team</button></div></div>
      <div class="wSkVaW_headerUtilities"><button type="button">工具</button></div></div>
      <div class="wSkVaW_headerCorner" data-conversation-header-corner><button type="button">右栏</button></div>
      <div class="wSkVaW_tabs" role="tablist" data-dcu-inline-tabs><button role="tab" aria-selected="true">对话</button><button role="tab">轨迹</button><button role="tab">上下文</button></div></header>`)
    const bar = await page.evaluate(() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect()
      const boxes = ['.wSkVaW_crumbs', '.wSkVaW_headerActions', '[data-dcu-inline-tabs]', '.wSkVaW_headerUtilities', '[data-conversation-header-corner]'].map(box)
      return {
        height: box('header').height,
        rowSpread: Math.max(...boxes.map(node => node.top)) - Math.min(...boxes.map(node => node.top)),
        crumbsRight: boxes[0].right,
        actionsLeft: boxes[1].left,
        actionsRight: boxes[1].right,
        tabsLeft: boxes[2].left,
        utilitiesRight: boxes[3].right,
        cornerRight: boxes[4].right,
      }
    })
    assert.equal(bar.height, 34, `${width}px：紧凑顶栏不得被长标题撑成两行`)
    assert.ok(bar.rowSpread < 20, `${width}px：顶栏控件必须同处一行（垂直散布 ${bar.rowSpread.toFixed(1)}px）`)
    assert.ok(bar.actionsLeft - bar.crumbsRight <= 11, `${width}px：操作区必须紧贴标题，不得被顶到中间`)
    assert.ok(bar.cornerRight > bar.utilitiesRight && bar.utilitiesRight > bar.tabsLeft && bar.tabsLeft >= bar.actionsRight, `${width}px：页签、扩展区与右栏必须按序留在右侧`)
  }
  // macOS 折叠：窗口插槽的两颗 28px 按钮固定在 left:88/124。titleRow 被摊平后，
  // 宿主的 leading clearance 内边距会丢失，必须由 header 补回同一绝对位置。
  await page.setViewportSize({ width: 332, height: 521 })
  await page.setContent(`<style>
    .wSkVaW_header{box-sizing:border-box;display:grid;grid-template-columns:auto minmax(0,1fr);padding:10px 28px 0 20px}
    .wSkVaW_titleRow,.wSkVaW_titleCluster,.wSkVaW_crumbs,.wSkVaW_crumbSeg,.wSkVaW_headerActions,.wSkVaW_headerUtilities,.wSkVaW_headerCorner{display:flex}
    .wSkVaW_titleRow{min-height:30px;grid-column:2;align-items:center;padding-inline-start:max(0px,calc(var(--dsh-frame-leading-clearance,0px) - 20px))}
    .wSkVaW_titleCluster{flex:1;align-items:center;gap:10px;min-width:0}
    .wSkVaW_crumbs{white-space:nowrap;align-items:center;gap:4px;min-width:0;overflow:hidden}
    .wSkVaW_crumbSeg{align-items:center;gap:4px;min-width:0;display:inline-flex}
    .wSkVaW_crumb{border:none;background:0 0;font-size:14px;line-height:20px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px 8px;display:inline-block}
    .wSkVaW_headerActions{flex:none;align-items:center;gap:8px}
    .wSkVaW_headerUtilities{flex:none;margin-left:20px}
    .wSkVaW_headerCorner{flex:none;margin-left:8px;margin-right:-16px}
    ${skin}${header}
    </style><div class="frame" style="position:relative;display:grid;grid-template-columns:${railPx}px minmax(0,1fr);--dsh-frame-leading-clearance:160px;--dcu-sidebar-rail-width:${railPx}px">
      <div style="grid-column:2;min-width:0"><header class="wSkVaW_header"><div class="wSkVaW_headerLeading"></div><div class="wSkVaW_titleRow"><div class="wSkVaW_titleCluster">
        <nav class="wSkVaW_crumbs"><span class="wSkVaW_crumbSeg"><button type="button" data-dcu-title-folder></button><button type="button" class="wSkVaW_crumb wSkVaW_crumbCurrent" disabled>我在 codex 里面使用了 composable 指令</button><button type="button" data-dcu-title-more></button></span></nav>
        <div class="wSkVaW_headerActions"><button type="button">标准模式</button></div></div>
        <div class="wSkVaW_headerUtilities"></div><div class="wSkVaW_headerCorner" data-conversation-header-corner></div></div></header></div>
      <div style="position:absolute;left:88px;top:11px;display:flex;gap:8px"><button type="button" data-leading="toggle" style="width:28px;height:28px">侧</button><button type="button" data-leading="new" style="width:28px;height:28px">新</button></div>
    </div>`)
  const chrome = await page.evaluate(() => {
    const box = selector => document.querySelector(selector).getBoundingClientRect()
    return {
      folderLeft: box('[data-dcu-title-folder]').left,
      titleLeft: box('.wSkVaW_crumbCurrent').left,
      leadingRight: box('[data-leading=new]').right,
      height: box('header').height,
    }
  })
  assert.ok(chrome.folderLeft >= chrome.leadingRight, `macOS 折叠：文件夹按钮压住窗口插槽（${chrome.folderLeft} < ${chrome.leadingRight}）`)
  assert.ok(chrome.titleLeft >= chrome.leadingRight, `macOS 折叠：标题压住窗口插槽（${chrome.titleLeft} < ${chrome.leadingRight}）`)
  assert.equal(chrome.height, 34, 'macOS 折叠：补回安全区后顶栏仍必须保持 34px 单行')
  // 三档状态共用同一公式：折叠全量让位、全屏扣减后仍避开插槽、展开/无变量退回宿主原生 20px。
  const paddingFor = (clearance, rail) => page.evaluate(({ clearance, rail }) => {
    const frame = document.querySelector('.frame')
    if (clearance === null) frame.style.removeProperty('--dsh-frame-leading-clearance')
    else frame.style.setProperty('--dsh-frame-leading-clearance', `${clearance}px`)
    if (rail === null) frame.style.removeProperty('--dcu-sidebar-rail-width')
    else frame.style.setProperty('--dcu-sidebar-rail-width', `${rail}px`)
    return getComputedStyle(document.querySelector('header')).paddingLeft
  }, { clearance, rail })
  assert.equal(await paddingFor(160, railPx), `${160 - railPx}px`, `折叠需扣掉 ${railPx}px 窄轨`)
  assert.equal(await paddingFor(84, railPx), `${84 - railPx}px`, '全屏安全区 84px 同样要扣掉窄轨')
  assert.equal(await paddingFor(160, null), '160px', '没有窄轨时顶栏必须让满 160px，不能按 56px 扣')
  assert.equal(await paddingFor(null, 0), '20px', '展开态必须保持宿主原生的 20px 左内边距')
  assert.equal(await paddingFor(null, null), '20px', 'Windows/Web 没有安全区时必须保持 20px')

  // 380–490px 的折叠窗口同时有页签和模式按钮时，保住文件夹入口并让页签停在视口内。
  for (const width of [380, 420, 490]) {
    await page.setViewportSize({ width, height: 521 })
    await page.setContent(`<style>
      .host{display:grid;grid-template-columns:${railPx}px minmax(0,1fr);--dsh-frame-leading-clearance:160px;--dcu-sidebar-rail-width:${railPx}px}
      .wSkVaW_header{box-sizing:border-box;display:grid;grid-template-columns:auto minmax(0,1fr);padding:10px 28px 0 20px}
      .wSkVaW_titleRow,.wSkVaW_titleCluster,.wSkVaW_crumbs,.wSkVaW_crumbSeg,.wSkVaW_headerActions,.wSkVaW_headerUtilities,.wSkVaW_headerCorner{display:flex}
      .wSkVaW_titleRow{grid-column:2;min-height:30px;align-items:center;padding-inline-start:max(0px,calc(var(--dsh-frame-leading-clearance) - 20px))}
      .wSkVaW_titleCluster{flex:1;gap:10px;min-width:0}.wSkVaW_crumbs{align-items:center;gap:4px;min-width:0;overflow:hidden;white-space:nowrap}
      .wSkVaW_crumbSeg{display:inline-flex;align-items:center;gap:4px;min-width:0}.wSkVaW_crumb{max-width:220px;padding:4px 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .wSkVaW_headerActions{flex:none;gap:8px}.wSkVaW_headerUtilities{flex:none;margin-left:20px}.wSkVaW_headerCorner{flex:none;margin-left:8px}
      ${header}
    </style><div class="host"><div></div><header class="wSkVaW_header"><div class="wSkVaW_headerLeading"></div><div class="wSkVaW_titleRow"><div class="wSkVaW_titleCluster"><nav class="wSkVaW_crumbs"><span class="wSkVaW_crumbSeg"><button data-dcu-title-folder></button><button class="wSkVaW_crumb wSkVaW_crumbCurrent">A long conversation title</button><button data-dcu-title-more></button></span></nav><div class="wSkVaW_headerActions"><button>标准模式</button></div></div><div class="wSkVaW_headerUtilities"></div><div class="wSkVaW_headerCorner"></div></div><nav data-dcu-inline-tabs>${['对话','轨迹','上下文','文件'].map(label => `<button role="tab">${label}</button>`).join('')}</nav></header></div>`)
    const narrow = await page.evaluate(() => ({
      folder: document.querySelector('[data-dcu-title-folder]').getBoundingClientRect(),
      tabs: document.querySelector('[data-dcu-inline-tabs]').getBoundingClientRect(),
      header: document.querySelector('header').getBoundingClientRect(),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    }))
    assert.ok(narrow.folder.width >= 16, `${width}px：四个页签与模式按钮并存时文件夹入口仍可见`)
    assert.ok(narrow.tabs.right <= narrow.header.right + 0.5, `${width}px：页签不得溢出顶栏`)
    assert.ok(narrow.documentWidth <= narrow.viewportWidth, `${width}px：顶栏不得撑宽窗口`)
  }
  console.log('新版样式回归：附件间距、右栏按钮排序、负外边距、紧凑顶栏单行与 macOS 折叠窗口安全区通过检查。')
} finally { await browser.close() }
