/** 使用宿主发布样式验证新建页，并比较已开始会话的信息区在覆盖前后的几何尺寸。 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { tsImport } from 'tsx/esm/api'

const require = createRequire(import.meta.url)
const { createElement } = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { SuggestionCards } = await tsImport('../src/client/NewConversationSuggestions.tsx', import.meta.url)
const { zh } = await tsImport('../src/client/locales.ts', import.meta.url)
const cards = renderToStaticMarkup(createElement(SuggestionCards, { t: key => zh[key] }))
const host = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-conversation/client'), 'utf8')
function moduleStyle(name) {
  const css = host.match(new RegExp(`const css\\$?\\d* = ("(?:[^"\\\\]|\\\\.)*");\\s*const tagId\\$?\\d* = "@deepseek-ai/dsh-client-ui-conversation/${name}.module.css"`))?.[1]
  const classes = host.match(new RegExp(`var ${name}_module_css_default = (\\{[\\s\\S]*?\\});`))?.[1]
  assert.ok(css && classes, `${name} 宿主结构发生变化，需重新核对`)
  return { css: JSON.parse(css), classes: JSON.parse(classes) }
}
const modules = ['ConversationRoot', 'HeroShell', 'InputBar'].map(moduleStyle)
const [r, h, i] = modules.map(m => m.classes)
const skin = readFileSync('src/client/CodexSidebar.tsx', 'utf8').match(/const stylesheet = `([\s\S]*?)`/)[1]
const heroSkin = readFileSync('src/client/new-conversation-style.ts', 'utf8').match(/NEW_CONVERSATION_STYLE = `([\s\S]*?)`/)[1]
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  for (const dark of [false, true]) for (const [width, height] of [[1280, 800], [2272, 1400], [800, 600], [390, 844], [640, 320]]) {
    await page.setViewportSize({ width, height })
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;--dsw-alias-bg-base:${dark ? '#181818' : '#fff'};--dsw-specific-input-major:${dark ? '#242424' : '#fff'};--dsw-alias-bg-layer-2:#242424;--dsw-alias-label-primary:${dark ? '#ddd' : '#262626'};--dsw-alias-label-secondary:#888;color:var(--dsw-alias-label-primary)}#app{height:100svh}#metrics{text-align:center;line-height:24px;padding-bottom:16px}button{font:inherit}</style>
      <div id="app"><div class="${r.root}" data-phase="hero"><div class="${r.body}"><div data-conversation-scroll class="${r.scrollBody}"><div data-composer-seat class="${r.composerSeat}"><div class="${r.composerStack} ${r.composerHero}">
      <div class="${h.root}"><div class="${h.stack}"><div class="${h.headline}"><span class="${h.fishHitbox}">🐋</span><span class="${h.headlineText}">探索未知之境</span><span class="${h.previewBadge}">预览版</span></div>${cards}</div></div>
      <div class="${r.heroWorkspaceRow}"><button class="${h.workspace}"><span class="${h.workspaceLabel}">我的工作区</span></button><button>专家预设</button></div>
      <div class="${i.root} ${i.hero}"><div data-composer-card class="${i.card}"><div data-input-scroll class="${i.scroll}"><div class="${i.grow}"><div data-lexical-editor="true" contenteditable="true" class="${i.input}"><p><br></p></div></div></div><div class="${i.row}"><div class="${i.tools}"><button class="${i.add}">+</button></div><div class="${i.trailing}"><button class="${i.primary}">↑</button></div></div></div></div>
      </div><div id="metrics">耗时 2.4秒 · 费用 ¥0.030<br>输入 19.7K tok · 输出 161 tok</div></div></div></div></div></div>`)
    for (const m of modules) await page.addStyleTag({ content: m.css })
    await page.addStyleTag({ content: skin })
    await page.evaluate(dark => document.body.toggleAttribute('data-ds-dark-theme', dark), dark)
    const style = await page.addStyleTag({ content: heroSkin })
    const geometry = () => page.evaluate(() => {
      const box = selector => { const b = document.querySelector(selector).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, bottom: b.bottom } }
      return { hero: box('[class*="_composerHero"]>:first-child'), guide: box('[class*="_composerHero"]>:first-child>[class$="_stack"]'), card: box('[data-composer-card]'), title: box('[class$="_headline"]'), workspace: box('[class*="_heroWorkspaceRow"]'), metrics: box('#metrics'), overflow: document.documentElement.scrollWidth > innerWidth }
    })
    if (width >= 1280) {
      const guideBeforeResize = (await geometry()).guide
      for (const savedWidth of [560, 960]) {
        await page.locator('[data-phase]').evaluate((el, value) => el.style.setProperty('--dsh-chat-user-width', `${value}px`), savedWidth)
        assert.equal(Math.round((await geometry()).card.width), savedWidth + 32, '新建输入框必须继承宿主保存的拖拽宽度')
        assert.deepEqual((await geometry()).guide, guideBeforeResize, '拖拽输入区不能改变中间引导区的宽度或位置')
      }
      await page.locator('[data-phase]').evaluate(el => el.style.removeProperty('--dsh-chat-user-width'))
    }
    const before = await geometry()
    assert.equal(await page.locator('[data-conversation-scroll]').evaluate(el => getComputedStyle(el).justifyContent), 'flex-start', '不能被宿主整组居中规则覆盖')
    assert.ok(Math.abs((before.guide.y + before.guide.height / 2) - (before.hero.y + before.hero.height / 2)) < 1, '引导区必须在输入框上方的可用空间垂直居中')
    assert.ok(before.card.width <= width - 32 && before.card.width > 0)
    assert.ok(before.card.x >= 16)
    assert.ok(before.title.bottom <= before.workspace.y && before.workspace.bottom <= before.card.y + 10, '标题、工作区与输入框不能重叠')
    assert.equal(before.overflow, false)
    if (height >= 600) assert.ok(before.card.y > height * .65, '输入框必须位于底部区域，不能回到标题下方居中')
    assert.equal(await page.locator('[class*="_heroWorkspaceRow"]').evaluate(el => getComputedStyle(el).justifyContent), 'flex-start')
    assert.ok(before.metrics.y >= before.card.bottom + 32, '保留底部信息区空间')
    await page.locator('.dcu-home-suggestions').evaluate(el => el.setAttribute('data-has-draft', 'true'))
    assert.equal(await page.locator('.dcu-home-card').first().isVisible(), false, '有草稿时任务卡片不可见')
    assert.deepEqual(await geometry(), before, '隐藏卡片不应改变布局')
    await page.locator('.dcu-home-suggestions').evaluate(el => el.setAttribute('data-has-draft', 'false'))
    // 逐类展开、显示提示再收起，标题/卡片/输入区不能因新增行发生位移。
    for (const selected of [0, 1, 2, 3, -1]) {
      await page.locator('.dcu-home-suggestions').evaluate((el, selected) => {
        el.querySelectorAll('.dcu-home-tasks').forEach((panel, index) => panel.setAttribute('data-active', String(index === selected)))
        el.querySelectorAll('.dcu-home-hint').forEach((hint, index) => hint.setAttribute('data-active', String(index === selected % 3)))
      }, selected)
      assert.deepEqual(await geometry(), before, '展开、切换、提示和收起必须保持原几何位置')
    }
    await page.locator('[contenteditable]').fill('草稿内容\n第二行\n第三行\n第四行')
    const draft = await page.locator('[contenteditable]').innerText()
    await page.evaluate(() => { window.savedEditor = document.querySelector('[contenteditable]') })
    await page.locator('[class$="_workspaceLabel"]').evaluate(el => { el.textContent = '非常长的工作区名称'.repeat(10) })
    assert.equal((await geometry()).overflow, false)
    await page.locator('#metrics').scrollIntoViewIfNeeded()
    assert.ok((await geometry()).metrics.bottom <= height + 1, `低高度窗口可滚动到统计内容 ${width}×${height}: ${JSON.stringify(await geometry())}`)
    // phase 切换不重挂载编辑器；已开始会话不受新建页 CSS 的影响。
    await page.locator('.dcu-home-suggestions').evaluate(el => el.remove())
    await page.locator('[data-phase]').evaluate(el => { el.dataset.phase = 'active' })
    const activeWithStyle = await geometry()
    await style.evaluate(el => el.remove())
    assert.deepEqual(await geometry(), activeWithStyle)
    assert.equal(await page.evaluate(() => window.savedEditor === document.querySelector('[contenteditable]')), true)
    assert.equal(await page.locator('[contenteditable]').innerText(), draft)
    if (width === 2272 && dark && process.argv.includes('--screenshot')) {
      await page.locator('[data-phase]').evaluate(el => { el.dataset.phase = 'hero' })
      await page.locator('[class$="_stack"]').evaluate((el, html) => el.insertAdjacentHTML('beforeend', html), cards)
      await page.addStyleTag({ content: heroSkin })
      await page.locator('[class$="_workspaceLabel"]').evaluate(el => { el.textContent = '我的工作区' })
      await page.locator('[contenteditable]').fill('')
      await page.screenshot({ path: join(tmpdir(), 'dcu-new-conversation-check.png') })
    }
  }
  console.log('新建页：深浅主题 × 5 个视口，布局、长工作区、底部统计可达性、草稿节点保留和 active 样式隔离检查通过。')
} finally { await browser.close() }
