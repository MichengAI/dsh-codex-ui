/** 真实浏览器回归：透明设置页下的会话分支不能自行恢复 visibility。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
const source = readFileSync(new URL('../src/client/settings-page-styles.ts', import.meta.url), 'utf8')
const styles = source.slice(source.indexOf('`') + 1, source.lastIndexOf('`'))
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent(`<html data-dsh-native-backdrop="mica"><body><style>${styles}</style><style>.dcu-wb-section-body{visibility:visible}</style><div class="dcu-root"><div id="sessions" inert><div class="dcu-wb-section-body"><button id="session">会话标题</button></div></div><div class="dcu-settings-page"><button id="back">返回应用</button></div></div></body></html>`)
  assert.equal(await page.locator('#session').evaluate(node => getComputedStyle(node).visibility), 'hidden')
  assert.equal(await page.locator('#back').isVisible(), true)
  await page.evaluate(() => { document.querySelector('.dcu-settings-page').remove(); document.querySelector('#sessions').inert = false })
  assert.equal(await page.locator('#session').isVisible(), true)
  await page.evaluate(() => { delete document.documentElement.dataset.dshNativeBackdrop })
  assert.equal(await page.locator('#session').isVisible(), true)
  console.log('设置透明背景隔离与退出恢复通过')
} finally { await browser.close() }
