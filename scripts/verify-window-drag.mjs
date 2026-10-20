/** #46 回归：核对 macOS 拖动区域声明；浏览器不能替代 Electron 原生窗口移动验收。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const sidebar = readFileSync('src/client/CodexSidebar.tsx', 'utf8')
const settings = readFileSync('src/client/settings-page-styles.ts', 'utf8')
const sidebarStyles = sidebar.match(/const stylesheet = `([\s\S]*?)`/)[1]
const settingsStyles = settings.slice(settings.indexOf('`') + 1, settings.lastIndexOf('`'))
// 来自反馈指定的 dsh-web-frontend@0.2.0-rc.2，保留相减区域的宿主约束。
const hostStyles = `html[data-platform=darwin] [data-window-drag]{-webkit-app-region:drag}
html[data-platform=darwin] body>:not(#root){-webkit-app-region:no-drag}
html[data-platform=darwin] :is(button,input){-webkit-app-region:no-drag}`
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.setContent(`<style>${hostStyles}${sidebarStyles}${settingsStyles}</style>
    <div id="root"><aside class="dcu-root" style="width:240px;height:700px"><header class="dcu-head"><button>侧栏按钮</button></header></aside></div>
    <div class="dcu-settings-page"><nav class="dcu-settings-nav"><button class="dcu-settings-back">返回</button><input aria-label="搜索"></nav></div>`)
  for (const platform of ['darwin', 'win32', 'web']) {
    for (const fullscreen of [false, true]) {
      await page.evaluate(({ platform, fullscreen }) => {
        document.documentElement.dataset.platform = platform
        document.documentElement.toggleAttribute('data-fullscreen', fullscreen)
      }, { platform, fullscreen })
      for (const selector of ['.dcu-root', '.dcu-settings-page']) {
        const state = await page.locator(selector).evaluate(element => ({
          region: getComputedStyle(element).getPropertyValue('app-region'),
          strip: getComputedStyle(element, '::after').getPropertyValue('app-region'),
          height: getComputedStyle(element, '::after').height,
          button: getComputedStyle(element.querySelector('button')).getPropertyValue('app-region'),
        }))
        if (platform === 'darwin') {
          assert.notEqual(state.region, 'no-drag', `${selector} 不得形成整层不可拖动区域`)
          if (!fullscreen) {
            assert.equal(state.strip, 'drag', `${selector} 顶部安全区必须允许窗口拖动`)
            assert.equal(state.height, '48px')
          } else assert.notEqual(state.strip, 'drag', '全屏不得留下额外拖动条')
          assert.equal(state.button, 'no-drag', '按钮必须继续可交互')
        } else assert.notEqual(state.strip, 'drag', 'Web/Windows 不应引入 macOS 拖动条')
      }
    }
  }
  assert.match(sidebar, /<header className="dcu-head" data-window-drag/, '侧栏标题行应保留官方拖动标记')
  await page.evaluate(() => {
    document.documentElement.dataset.platform = 'darwin'
    document.documentElement.removeAttribute('data-fullscreen')
    document.documentElement.style.setProperty('--dsh-frame-top-clearance', '64px')
  })
  assert.equal(await page.locator('.dcu-root').evaluate(el => getComputedStyle(el, '::after').height), '64px')
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await page.getByRole('textbox', { name: '搜索' }).fill('仍可输入')
  assert.equal(await page.getByRole('textbox', { name: '搜索' }).inputValue(), '仍可输入')
  console.log('窗口拖动 CSS 回归通过：macOS 顶部安全区、设置浮层、按钮输入、全屏及其他平台。')
} finally {
  await browser.close()
}
