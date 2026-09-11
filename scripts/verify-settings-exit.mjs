/** 在实际 DSH 页面验证退出末帧；需通过 DCU_DSH_URL 指定已安装插件的宿主。 */
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
  const trigger = page.locator('[data-dcu-settings-trigger]')
  await trigger.waitFor({ timeout: 30000 })
  for (let i = 0; i < 3; i++) {
    for (const name of ['继续', '稍后配置']) {
      const button = page.getByRole('button', { name, exact: true })
      if (await button.isVisible()) await button.click()
    }
    await page.waitForTimeout(200)
  }
  await trigger.click()
  await page.locator('[data-dcu-settings-page]').waitFor()
  for (const mode of ['back', 'escape', 'early']) {
    if (mode !== 'back') await page.locator('[data-dcu-settings-trigger]').click()
    if (mode !== 'early') await page.waitForTimeout(300)
    const result = await page.evaluate(async mode => {
      const element = document.querySelector('[data-dcu-settings-page]')
      const initial = Number(getComputedStyle(element).opacity)
      if (mode === 'back') element.querySelector('.dcu-settings-back').click()
      else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      const animation = element.getAnimations().find(item => item.constructor.name === 'Animation')
      if (!animation) throw new Error('未创建退出动画')
      // 暂缓 React 卸载，模拟繁忙主线程下结束帧已经显示但状态尚未提交的窗口。
      const finish = animation.onfinish
      animation.onfinish = null
      animation.finish()
      const finalOpacity = Number(getComputedStyle(element).opacity)
      const startOpacity = Number(animation.effect.getKeyframes()[0].opacity)
      finish.call(animation, new Event('finish'))
      await new Promise(resolve => setTimeout(resolve, 60))
      return { initial, startOpacity, finalOpacity, removed: !element.isConnected, focused: document.activeElement.hasAttribute('data-dcu-settings-trigger') }
    }, mode)
    assert.equal(result.finalOpacity, 0, `${mode}: 淡出结束后、卸载前必须保持透明`)
    assert.ok(Math.abs(result.initial - result.startOpacity) < 0.02, `${mode}: 退出不能跳回完全不透明`)
    assert.equal(result.removed, true)
    assert.equal(result.focused, true)
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('[data-dcu-settings-trigger]').click()
  await page.keyboard.press('Escape')
  await page.locator('[data-dcu-settings-page]').waitFor({ state: 'detached' })
  console.log('实际 DSH 设置页：返回、Escape、进入中退出、减少动态效果四条交互检查通过。')
} finally { await browser.close() }
