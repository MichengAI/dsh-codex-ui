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
  assert.ok(geometry.width <= 980 && geometry.width >= 500, `原生设置皮肤应为居中浮动卡片 (当前宽度: ${geometry.width})`)
  assert.ok(geometry.height <= 720 && geometry.height >= 400, `原生设置皮肤应为浮动高度 (当前高度: ${geometry.height})`)
  assert.equal(geometry.borderRadius, '12px', '原生设置皮肤圆角必须为 12px')
  if (geometry.contentChildWidth > 0) {
    assert.ok(geometry.contentChildWidth <= 680, `右侧设置区内容必须受限在 680px 内 (当前: ${geometry.contentChildWidth})`)
  }
  assert.ok(await panel.locator('nav').count() > 0, '原生设置面板必须保留官方导航')

  await page.keyboard.press('Escape')
  await panel.waitFor({ state: 'detached' })
  console.log('实际 DSH 原生设置检查通过：Control+, 打开官方面板、1:1 Codex 浮动卡片皮肤、官方导航及 Escape 关闭。')
} finally {
  await browser.close()
}
