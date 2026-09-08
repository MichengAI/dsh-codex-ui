/** 验证独立承载页使用费用插件原组件；先运行 preview-billing.mjs。 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 960 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${process.env.DCU_BILLING_PREVIEW_PORT ?? 4319}/`)
  const frame = page.frameLocator('iframe')
  await frame.locator('[data-testid="billing-dashboard"]').waitFor()
  assert.equal(await page.locator('[data-testid="billing-dashboard"]').count(), 0, '面板只挂在 iframe 内')
  for (const id of ['overview', 'providers', 'token', 'trends', 'pricing', 'settings']) {
    await frame.locator(`[data-testid="billing-tab-${id}"]`).click()
    assert.equal(await frame.locator(`[data-testid="billing-tab-${id}"]`).getAttribute('aria-selected'), 'true')
  }
  await frame.locator('[data-testid="billing-currency-usd"]').click()
  assert.equal(await frame.locator('[data-testid="billing-currency-usd"]').getAttribute('aria-pressed'), 'true')
  await page.getByRole('button', { name: '切换深浅主题' }).click()
  await page.frames()[1].waitForFunction(() => !document.body.hasAttribute('data-ds-dark-theme'))
  await frame.locator('[data-testid="billing-close"]').click()
  await page.locator('#closed').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: '重新打开' }).click()
  await frame.locator('[data-testid="billing-dashboard"]').waitFor()
  await frame.locator('[data-testid="billing-tab-overview"]').click()
  await page.keyboard.press('Escape')
  await page.locator('#closed').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: '重新打开' }).click()
  await frame.locator('[data-testid="billing-dashboard"]').waitFor()
  await page.getByRole('button', { name: '切换深浅主题' }).click()
  await page.frames()[1].waitForFunction(() => document.body.hasAttribute('data-ds-dark-theme'))
  await page.screenshot({ path: 'docs/01-当前工作/I005-Codex独立设置页/17-费用iframe承载实验.png' })
  await page.setViewportSize({ width: 1100, height: 760 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.deepEqual(errors, [])
  console.log('iframe 独立挂载、六分区、币种、深浅主题、关闭重开及 Escape 通过；无页面异常。')
} finally { await browser.close() }
