import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const source = readFileSync('src/client/SidebarExpandControl.tsx', 'utf8')
const stylesheet = source.match(/SIDEBAR_EXPAND_STYLE = `([\s\S]*?)`/)?.[1]
assert.ok(stylesheet)
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  for (const panel of ['conversation', 'settings']) {
    await page.setContent(`<style>
      html{--dsh-windows-titlebar-height:40px}body{margin:0}
      #frame{display:grid;grid-template-columns:0px 1fr;height:600px;position:relative;overflow:hidden;padding-top:40px}
      #sidebar{min-width:0;overflow:hidden}#overlay{position:absolute;inset:0;pointer-events:none}#overlay>*{pointer-events:auto}
    </style><div id="frame" data-sidebar-collapsed="true"><aside id="sidebar">clipped sidebar</aside>
      <main><header style="display:flex"><span id="title">${panel}</span><nav data-dcu-inline-tabs></nav></header></main><div id="overlay" data-shell-overlay><button type="button" class="dcu-shell-expand dcu-shell-expand-windows" aria-label="展开侧边栏">☰</button></div></div>`)
    await page.addStyleTag({ content: stylesheet })
    const button = page.getByRole('button', { name: '展开侧边栏' })
    assert.equal(await button.isVisible(), false, 'Web must keep its rail without a duplicate window button')
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-windows-titlebar', '')
      document.querySelector('button').onclick = () => {
        const frame = document.querySelector('#frame')
        frame.removeAttribute('data-sidebar-collapsed')
        frame.style.gridTemplateColumns = '280px 1fr'
      }
    })
    assert.equal(await button.isVisible(), true, `${panel}: zero-width sidebar must retain expand entry`)
    assert.deepEqual(await button.boundingBox(), { x: 12, y: 6, width: 28, height: 28 })
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--dsh-windows-menu-start').trim()), '48px', 'Titlebar menu must reserve the expand button space')
    await button.click()
    assert.equal(await button.isVisible(), false, 'Expanded sidebar must hide extra button')
    await page.evaluate(() => {
      const frame = document.querySelector('#frame')
      frame.setAttribute('data-sidebar-collapsed', 'true')
      frame.style.gridTemplateColumns = '0px 1fr'
      document.documentElement.setAttribute('data-fullscreen', '')
      frame.style.paddingTop = '0px'
    })
    assert.equal((await button.boundingBox()).y, 3, 'Fullscreen must keep entry within visible viewport')
    assert.ok((await page.locator('#title').boundingBox()).x >= 60, 'Fullscreen expand entry must not cover conversation title')
    await button.focus()
    await page.keyboard.press('Enter')
    assert.equal(await button.isVisible(), false, 'Keyboard must expand sidebar')
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-windows-titlebar')
      document.documentElement.removeAttribute('data-fullscreen')
      document.documentElement.setAttribute('data-platform', 'darwin')
      const frame = document.querySelector('#frame')
      frame.setAttribute('data-sidebar-collapsed', 'true')
      frame.style.gridTemplateColumns = '0px 1fr'
      const leading = document.createElement('div')
      leading.dataset.shellLeading = ''
      leading.style.cssText = 'position:absolute;left:88px;top:11px'
      leading.innerHTML = '<button class="dcu-shell-expand" aria-label="macOS 展开侧边栏">☰</button>'
      leading.querySelector('button').onclick = () => {
        frame.removeAttribute('data-sidebar-collapsed')
        frame.style.gridTemplateColumns = '280px 1fr'
        leading.remove()
      }
      frame.append(leading)
    })
    const macButton = page.getByRole('button', { name: 'macOS 展开侧边栏' })
    assert.equal(await macButton.isVisible(), true)
    assert.deepEqual(await macButton.boundingBox(), { x: 88, y: 11, width: 28, height: 28 })
    await macButton.click()
    assert.equal(await macButton.count(), 0, 'Host must unmount macOS leading seat after expansion')
    await page.evaluate(() => { document.documentElement.removeAttribute('data-platform') })
  }
  console.log('✓ desktop sidebar expand controls: zero track, settings, fullscreen, keyboard, web and macOS seat')
} finally {
  await browser.close()
}
