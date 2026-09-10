/** 按 0.1.5 新增的附件与顶栏 DOM/CSS 合约验证覆盖后的计算布局。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import ts from 'typescript'

const skin = readFileSync('src/client/CodexSidebar.tsx', 'utf8').match(/const stylesheet = `([\s\S]*?)`/)[1]
const header = readFileSync('src/client/conversation-header.ts', 'utf8').match(/export const CONVERSATION_HEADER_STYLE = `([\s\S]*?)`/)[1]
const bubbleScript = ts.transpileModule(readFileSync('src/client/conversation-bubbles.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  // 官方预览默认向左展开；导航移到左侧后应朝内容区展开，动画仍由宿主提供。
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.setContent(`<style>
    .rail{position:absolute;left:80px;top:200px;width:28px;height:100px}
    .preview{position:absolute;right:calc(100% + 10px);width:240px;height:100px;animation:dsh-turn-preview-enter 120ms ease-out}
    @keyframes dsh-turn-preview-enter{from{opacity:0;transform:translateX(4px)}to{opacity:1;transform:translateX(0)}}
    ${skin}
    </style><nav class="rail" data-dcu-official-turn-navigator style="--dsh-composer-side-clearance:-84px"><div class="preview" role="tooltip">预览</div></nav>`)
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
      [data-message-attachments]{display:flex;flex-wrap:wrap;gap:8px}
      header,.titleRow,.titleCluster{display:flex}.headerCorner{margin-left:8px;margin-right:-16px}
      ${skin}${header}
      </style><section data-conversation-scroll><div class="card" data-composer-card><div class="abc_rail"><div style="height:64px">附件</div></div><div data-input-scroll style="height:44px">正文</div><div><button>发送</button></div></div></section>
      <header><div class="titleRow"><div class="titleCluster"><div class="crumbs">项目</div><div class="headerActions">操作</div></div><div class="headerUtilities">工具</div><div class="headerCorner" data-conversation-header-corner>右栏</div></div><div data-dcu-inline-tabs role="tablist"><button role="tab">对话</button></div></header>
      <div data-time-hover-root><div><div data-message-attachments data-dcu-expandable-user-bubble><span>文件一</span><span>文件二</span></div></div></div>
      <div data-time-hover-root><div><div data-message-attachments>附件</div><div class="host_bubble">正文</div><div class="referenceSummary">引用</div></div></div>`)
    await page.evaluate(code => {
      const exports = {}
      new Function('exports', code)(exports)
      exports.restoreOfficialUserBubbles(document)
    }, bubbleScript)
    const geometry = await page.evaluate(() => ({
      gap: document.querySelector('[data-input-scroll]').getBoundingClientRect().top - document.querySelector('.abc_rail').getBoundingClientRect().bottom,
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
  console.log('新版样式回归：附件间距、右栏按钮排序及负外边距通过三个视口检查。')
} finally { await browser.close() }
