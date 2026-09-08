/** 用宿主实际发布 CSS 验证输入框覆盖；不连接会话或发送消息。 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const host = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-conversation/client'), 'utf8')
const css = host.match(/const css\$1 = ("(?:[^"\\]|\\.)*");\s*const tagId\$1 = "@deepseek-ai\/dsh-client-ui-conversation\/InputBar.module.css"/)?.[1]
const classes = host.match(/var InputBar_module_css_default = (\{[\s\S]*?\});/)?.[1]
const skin = readFileSync('src/client/CodexSidebar.tsx', 'utf8').match(/const stylesheet = `([\s\S]*?)`/)?.[1]
assert.ok(css && classes && skin, '宿主输入框锚点变化，需要重新核对适配')
const c = JSON.parse(classes)
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  for (const dark of [false, true]) for (const width of [390, 800, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;--dsh-chat-content-width:720px;--dsh-composer-text-max-height:240px;--dsw-specific-input-major:#fff;--dsw-alias-bg-base:${dark ? '#181818' : '#fff'};--dsw-alias-bg-layer-2:#242424;--dsw-alias-label-primary:${dark ? '#ddd' : '#262626'};--dsw-alias-label-secondary:#777}</style><main data-conversation-scroll><div class="${c.root}"><div data-composer-card class="${c.card}"><div data-input-scroll class="${c.scroll}"><div class="${c.grow}"><div data-lexical-editor="true" contenteditable="true" class="${c.input}" aria-label="消息"><p><br></p></div><div data-composer-placeholder class="${c.placeholder}">输入消息</div></div></div><div class="${c.row}"><div class="${c.tools}"><button class="${c.add}">+</button><div class="${c.modes}"><button>权限</button></div></div><div class="${c.trailing}"><button class="${c.primary}" aria-label="发送">↑</button></div></div></div></div></main>`)
    await page.addStyleTag({ content: JSON.parse(css) })
    await page.addStyleTag({ content: skin })
    await page.evaluate(dark => document.body.toggleAttribute('data-ds-dark-theme', dark), dark)
    const measure = () => page.locator('[data-composer-card]').evaluate(el => {
      const s = getComputedStyle(el), b = el.getBoundingClientRect()
      const button = el.querySelector('button[aria-label="发送"]'), bs = getComputedStyle(button)
      return { height: b.height, radius: s.borderRadius, shadow: s.boxShadow, background: s.backgroundColor, overflow: document.documentElement.scrollWidth > innerWidth, button: button.getBoundingClientRect().height, transform: bs.transform }
    })
    const before = await measure()
    assert.equal(before.height, 92, '空态由 8px 顶部、44px 编辑区、4px 间距、28px 工具栏和 8px 底部自然撑高')
    assert.equal(before.radius, await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(1.5)')) ? '25px' : '20px')
    assert.equal(before.button, 28)
    assert.equal(before.transform, 'none')
    assert.equal(before.overflow, false)
    assert.equal(before.shadow.includes('inset'), dark)
    await page.locator('[contenteditable]').focus()
    assert.deepEqual(await measure(), before, '聚焦不改变整框表面或几何尺寸')
    await page.locator('[contenteditable]').fill('多行内容\n第二行\n第三行\n第四行')
    assert.ok((await measure()).height > before.height, '多行输入必须自然撑高')
    await page.keyboard.press('Tab')
    assert.equal(await page.locator('button').first().evaluate(el => getComputedStyle(el).outlineWidth), '2px')
  }
  console.log('输入框：深浅主题 × 3 个视口，圆角、焦点稳定、按钮尺寸、多行与溢出检查通过。')
} finally { await browser.close() }
