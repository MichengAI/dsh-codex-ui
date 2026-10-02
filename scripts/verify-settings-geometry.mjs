/** 真实浏览器回归：桌面标题栏安全区与模型 Pro 设置页宽度。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const source = readFileSync(new URL('../src/client/settings-page-styles.ts', import.meta.url), 'utf8')
const styles = source.slice(source.indexOf('`') + 1, source.lastIndexOf('`'))
const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' })
  await page.setContent(`<html data-platform="darwin" style="--dsh-frame-top-clearance:48px"><head><style>${styles}</style></head><body>
    <div class="dcu-settings-page"><nav class="dcu-settings-nav"><button class="dcu-settings-back">返回应用</button>
    <label class="dcu-settings-search"><input type="search" placeholder="搜索设置"></label></nav>
    <main class="dcu-settings-main"><div class="dcu-settings-inner" data-settings-section="general"></div></main></div>
  </body></html>`)

  const top = () => page.locator('.dcu-settings-back').evaluate(element => element.getBoundingClientRect().top)
  assert.equal(await top(), 56, 'macOS 普通窗口的返回按钮必须低于原生标题栏')
  await page.locator('html').evaluate(element => { element.setAttribute('data-fullscreen', '') })
  assert.equal(await top(), 18, 'macOS 全屏时不得额外留标题栏空白')
  await page.locator('html').evaluate(element => { element.removeAttribute('data-fullscreen'); element.setAttribute('data-platform', 'win32') })
  assert.equal(await top(), 18, '其他桌面平台不得受 macOS 安全区影响')
  await page.locator('html').evaluate(element => { element.removeAttribute('data-platform') })
  assert.equal(await top(), 18, '普通浏览器不得受 macOS 安全区影响')

  const inner = page.locator('.dcu-settings-inner')
  const main = page.locator('.dcu-settings-main')
  assert.equal(await inner.evaluate(element => element.getBoundingClientRect().width), 864, '常规设置页继续保持易读宽度')
  await inner.evaluate(element => { element.dataset.settingsSection = 'dsh-model-pro' })
  assert.equal(await inner.evaluate(element => element.getBoundingClientRect().width), await main.evaluate(element => element.getBoundingClientRect().width), '模型 Pro 设置页需随主栏伸展')
  await page.setViewportSize({ width: 800, height: 900 })
  const innerRect = await inner.evaluate(element => ({ left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right }))
  const mainRect = await main.evaluate(element => ({ left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right }))
  assert.ok(innerRect.left >= mainRect.left && innerRect.right <= mainRect.right, '窄窗口时模型 Pro 内容不得越过主栏')
  await page.locator('html').evaluate(element => { element.setAttribute('data-platform', 'darwin') })
  await page.setViewportSize({ width: 520, height: 700 })
  const navBottom = await page.locator('.dcu-settings-nav').evaluate(element => element.getBoundingClientRect().bottom)
  const backBottom = await page.locator('.dcu-settings-back').evaluate(element => element.getBoundingClientRect().bottom)
  const searchBottom = await page.locator('.dcu-settings-search').evaluate(element => element.getBoundingClientRect().bottom)
  assert.ok(await top() >= 48 && backBottom <= navBottom && searchBottom <= navBottom, '宿主最小宽度下返回与搜索都必须留在导航区内')
  await page.locator('.dcu-settings-back').click()
  assert.equal(await page.evaluate(() => document.activeElement?.className), 'dcu-settings-back', '宿主最小宽度下返回按钮必须可点击')
  await page.locator('.dcu-settings-search input').click()
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'INPUT', '宿主最小宽度下搜索框必须可点击')

  console.log('设置页标题栏避让和模型 Pro 响应式宽度通过')
} finally {
  await browser.close()
}
