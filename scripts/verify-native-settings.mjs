/** 在实际 DSH 页面验证官方快捷键、原生设置布局与 Escape 关闭。 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const target = process.env.DCU_DSH_URL
if (!target) throw new Error('请设置 DCU_DSH_URL 为实际 DSH 页面地址；本检查不使用预览或模拟页面。')
const url = new URL(target)
if (!['http:', 'https:'].includes(url.protocol)) throw new Error('DCU_DSH_URL 必须是 HTTP(S) 地址')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ locale: 'zh-CN' })
  await page.goto(url.href)
  for (let i = 0; i < 3; i++) {
    for (const name of ['继续', '稍后配置']) {
      const button = page.getByRole('button', { name, exact: true })
      if (await button.isVisible()) await button.click()
    }
    await page.waitForTimeout(200)
  }

  await page.keyboard.press('Control+,')
  const panel = page.locator('[data-shortcut-modal="settings"]')
  await panel.waitFor({ timeout: 30000 })
  const geometry = await panel.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const contentChild = element.querySelector('div > :nth-child(2) > *')
    const contentChildWidth = contentChild ? contentChild.getBoundingClientRect().width : 0
    return {
      width: rect.width,
      height: rect.height,
      borderRadius: style.borderRadius,
      contentChildWidth,
    }
  })
  const viewport = page.viewportSize()
  assert.ok(viewport)
  assert.equal(geometry.width, viewport.width, `设置皮肤应铺满视口全宽 (当前宽度: ${geometry.width}, 视口: ${viewport.width})`)
  assert.equal(geometry.height, viewport.height, `设置皮肤应铺满视口全高 (当前高度: ${geometry.height}, 视口: ${viewport.height})`)
  assert.equal(geometry.borderRadius, '0px', '全屏设置工作台外壳圆角必须为 0px')
  assert.ok(await panel.locator('nav').count() > 0, '原生设置面板必须保留官方导航')

  await page.keyboard.press('Escape')
  await panel.waitFor({ state: 'detached' })
  console.log('实际 DSH 原生设置检查通过：Control+, 打开官方面板、1:1 Codex 全屏设置工作台、官方导航及 Escape 关闭。')
} finally {
  await browser.close()
}
