/** 验证新建页真实指针拖拽、宽度记忆、最小值与切换页面时的清理。 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import ts from 'typescript'
const source = readFileSync('src/client/composer-width.ts', 'utf8').replaceAll('export ', '')
const script = ts.transpileModule(source + '\nwindow.startHandles=observeHeroWidthHandles;', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.route('http://width.test/', route => route.fulfill({ contentType: 'text/html', body: `<style>body{margin:0}main{position:relative;width:100%;height:800px;--dsh-chat-user-width:640px;--dsh-chat-content-width:var(--dsh-chat-user-width)}#input{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);width:calc(var(--dsh-chat-content-width) + 32px);height:92px;background:#ddd}</style><main data-phase="hero"><div data-conversation-scroll><div id="input"></div></div></main>` }))
  await page.goto('http://width.test/')
  await page.addScriptTag({ content: script })
  await page.evaluate(() => { window.stopHandles = window.startHandles('调整宽度') })
  const width = () => page.locator('#input').evaluate(el => el.getBoundingClientRect().width)
  const saved = () => page.evaluate(() => localStorage.getItem('dsh.conversation.contentWidth'))
  const drag = async (side, dx) => {
    const box = await page.locator(`[data-dcu-width-handle=${side}]`).boundingBox()
    await page.mouse.move(box.x + box.width / 2, 400)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + dx, 400, { steps: 5 })
    await page.mouse.up()
  }
  assert.equal(await width(), 672)
  await drag('right', 60)
  assert.equal(await width(), 792)
  assert.equal(await saved(), '760')
  await drag('left', -40)
  assert.equal(await width(), 872)
  assert.equal(await saved(), '840')
  await drag('right', -300)
  assert.equal(await width(), 672)
  await page.locator('[data-dcu-width-handle=right]').focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await saved(), '660')
  await page.locator('main').evaluate(el => { el.dataset.phase = 'active' })
  await page.waitForFunction(() => !document.querySelector('[data-dcu-width-handle]'))
  await page.locator('main').evaluate(el => { el.dataset.phase = 'hero' })
  await page.waitForFunction(() => document.querySelectorAll('[data-dcu-width-handle]').length === 2)
  assert.equal(await width(), 692)
  await page.evaluate(() => window.stopHandles())
  assert.equal(await page.locator('[data-dcu-width-handle]').count(), 0)
  console.log('新建页调宽：左右拖拽、最小宽度、偏好保存、键盘操作及页面切换清理通过。')
} finally { await browser.close() }
