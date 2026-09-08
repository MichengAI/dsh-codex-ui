/** 使用生产设置组件验证退出末帧，避免淡出后在卸载前恢复不透明。 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'
const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
const output = await build({ entryPoints: ['scripts/settings-preview.tsx'], bundle: true, write: false, outdir: 'preview', format: 'iife', platform: 'browser', jsx: 'automatic', loader: { '.css': 'local-css', '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl' }, define: { 'process.env.NODE_ENV': '"development"' } })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent('<body data-ds-dark-theme><div id="root"></div></body>')
  for (const file of output.outputFiles) {
    if (file.path.endsWith('.css')) await page.addStyleTag({ content: file.text })
    if (file.path.endsWith('.js')) await page.addScriptTag({ content: file.text })
  }
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
  console.log('设置退出：返回按钮、Escape、入场中退出、减少动态效果均通过。')
} finally { await browser.close() }
