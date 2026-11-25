/** 验证新建页真实指针拖拽、宽度记忆、最小值与切换页面时的清理。 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import ts from 'typescript'
const source = readFileSync('src/client/composer/composer-width.ts', 'utf8').replaceAll('export ', '')
const script = ts.transpileModule(source + '\nwindow.startHandles=observeHeroWidthHandles;', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.route('http://width.test/', route => route.fulfill({ contentType: 'text/html', body: `<style>
    body{margin:0}
    main{position:relative;width:100%;height:800px}
    main[data-phase=hero] .wSkVaW_body{--dsh-chat-content-width:var(--dsh-chat-user-width,640px)}
    main[data-dcu-hero-width][data-phase=hero] .wSkVaW_body{--dsh-chat-user-width:var(--dcu-hero-chat-width)!important}
    #input{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);width:calc(var(--dsh-chat-content-width) + 32px);height:92px;background:#ddd}
  </style><main data-phase="hero"><div class="wSkVaW_body" style="--dsh-chat-user-width:640px"><div data-conversation-scroll><div id="input"></div></div></div></main>
  <script>
    // 宿主行为：相位切回新建页时按保存的偏好重新行内发布，插件不得依赖「宿主不发布」这个前提。
    const main = document.querySelector('main'); const body = document.querySelector('.wSkVaW_body')
    const publish = () => body.style.setProperty('--dsh-chat-user-width', Number(localStorage.getItem('dsh.conversation.contentWidth') ?? 640) + 'px')
    new MutationObserver(() => publish()).observe(main, { attributes: true, attributeFilter: ['data-phase'] })
  </script>` }))
  await page.goto('http://width.test/')
  await page.addScriptTag({ content: script })
  await page.evaluate(() => { window.stopHandles = window.startHandles('调整宽度') })
  const width = () => page.locator('#input').evaluate(el => el.getBoundingClientRect().width)
  const saved = () => page.evaluate(() => localStorage.getItem('dsh.conversation.contentWidth'))
  const bodyWidth = () => page.locator('.wSkVaW_body').evaluate(el => getComputedStyle(el).getPropertyValue('--dsh-chat-user-width').trim())
  /** 正文节点的宽度变量只属于宿主，插件不得改写行内声明。 */
  const hostInline = () => page.locator('.wSkVaW_body').evaluate(el => [el.style.getPropertyValue('--dsh-chat-user-width'), el.style.getPropertyValue('--dsh-chat-content-width')])
  const privateWidth = () => page.locator('main').evaluate(el => el.style.getPropertyValue('--dcu-hero-chat-width'))
  const drag = async (side, dx) => {
    const box = await page.locator(`[data-dcu-width-handle=${side}]`).boundingBox()
    await page.mouse.move(box.x + box.width / 2, 400)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + dx, 400, { steps: 5 })
    await page.mouse.up()
  }
  assert.equal(await width(), 672)
  assert.equal(await bodyWidth(), '640px')
  assert.equal(await privateWidth(), '640px')
  await drag('right', 60)
  // 宿主行内仍是 640px，但插件映射必须压过它 —— 这是 Issue #115 修复后的关键不变量。
  assert.deepEqual(await hostInline(), ['640px', ''])
  assert.equal(await privateWidth(), '760px')
  assert.equal(await bodyWidth(), '760px')
  assert.equal(await width(), 792)
  assert.equal(await saved(), '760')
  await drag('left', -40)
  assert.equal(await bodyWidth(), '840px')
  assert.equal(await width(), 872)
  assert.equal(await saved(), '840')
  await drag('right', -300)
  assert.equal(await bodyWidth(), '640px')
  assert.equal(await width(), 672)
  await page.locator('[data-dcu-width-handle=right]').focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await saved(), '660')
  assert.equal(await bodyWidth(), '660px')
  await page.locator('main').evaluate(el => { el.dataset.phase = 'active' })
  await page.waitForFunction(() => !document.querySelector('[data-dcu-width-handle]'))
  // 离开新建页：插件私有变量与标记必须消失，正文回到宿主自己的行内发布（Issue #115 的残留根因）。
  await page.waitForFunction(() => !document.querySelector('main').style.getPropertyValue('--dcu-hero-chat-width'))
  assert.equal(await page.locator('main').evaluate(el => el.hasAttribute('data-dcu-hero-width')), false)
  assert.deepEqual(await hostInline(), ['660px', ''])
  await page.locator('main').evaluate(el => { el.dataset.phase = 'hero' })
  await page.waitForFunction(() => document.querySelectorAll('[data-dcu-width-handle]').length === 2)
  assert.equal(await width(), 692)
  await page.evaluate(() => window.stopHandles())
  assert.equal(await page.locator('[data-dcu-width-handle]').count(), 0)
  console.log('新建页调宽：宿主行内发布下仍生效、左右拖拽、最小宽度、偏好保存、键盘操作及页面切换清理通过。')
} finally { await browser.close() }
