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
    /* 皮肤令牌改写的守卫（放在本轮其余检查之后：它会改写样式表，不再影响几何断言）。
       皮肤（动态壁纸等）会在令牌源头重写 --dsw-alias-label-primary 与
       --dsw-alias-bg-base：发送键的底色或前景一旦取自这两个令牌，就会变成
       「黑圆 + 看不见的箭头」——宿主箭头是 fill="currentColor"，前景透明等于没有箭头，
       深浅主题都会发生。
       先把宿主自身 .primary 的 background/color 改为 initial（按选择器扫样式表，只动那一条，
       不是追加一条同属性规则 —— 后者会把本插件规则一起压住，让断言永远为真）；
       本插件规则特异性更高，仍然生效，因此下面量到的就是它解析出来的颜色。
       宿主 .primary 带 transition:background-color .1s，必须禁用过渡，否则量到中间色。 */
    await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText?.endsWith('_primary') && rule.style.background) {
            rule.style.backgroundColor = 'initial'
            rule.style.color = 'initial'
          }
        }
      }
      const tag = document.createElement('style')
      tag.textContent = '*{transition:none!important;animation:none!important}'
      document.head.append(tag)
    })
    const buttonPaint = () => page.locator('button[aria-label="发送"]').evaluate(el => {
      const s = getComputedStyle(el)
      return { background: s.backgroundColor, color: s.color }
    })
    const paintHost = await buttonPaint()
    assert.equal(paintHost.background, dark ? 'rgb(255, 255, 255)' : 'rgb(15, 17, 21)', '发送键保持 Codex 深浅主题底色')
    assert.equal(paintHost.color, dark ? 'rgb(15, 17, 21)' : 'rgb(255, 255, 255)', '箭头保持 Codex 深浅主题前景色')
    assert.notEqual(paintHost.background, 'rgba(0, 0, 0, 0)', '发送键底色必须是不透明实色')
    assert.notEqual(paintHost.color, 'rgba(0, 0, 0, 0)', '发送键前景（箭头 currentColor）必须是不透明实色')
    await page.addStyleTag({ content: 'body{--dsw-alias-label-primary:rgb(0, 0, 0);--dsw-alias-bg-base:transparent}' })
    const paintSkin = await buttonPaint()
    assert.equal(paintSkin.background, paintHost.background, '皮肤改写别名令牌不得改变发送键底色')
    assert.equal(paintSkin.color, paintHost.color, '皮肤改写别名令牌不得改变发送键前景')
    assert.notEqual(paintSkin.background, 'rgba(0, 0, 0, 0)', '皮肤改写后底色仍须是不透明实色')
    assert.notEqual(paintSkin.color, 'rgba(0, 0, 0, 0)', '皮肤改写后前景仍须是不透明实色')
  }
  console.log('输入框：深浅主题 × 3 个视口，圆角、焦点稳定、按钮尺寸、多行与溢出检查通过。')
} finally { await browser.close() }
