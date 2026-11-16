import { afterEach, beforeEach, expect, test } from 'vitest'
import { applyGlassSettings, disposeGlassMode } from '../src/client/theme/glass.ts'
import { startGlassSeamStamper } from '../src/client/theme/glass-seams.ts'

let stopStamper: (() => void) | undefined

beforeEach(() => {
  document.documentElement.removeAttribute('data-dsh-glass')
  document.documentElement.removeAttribute('data-dsh-glass-float')
  document.documentElement.removeAttribute('data-dsh-glass-compat')
  document.body.removeAttribute('data-dsh-glass-settings')
  document.body.removeAttribute('data-ds-dark-theme')
  document.body.innerHTML = ''
})

afterEach(() => {
  if (stopStamper) {
    stopStamper()
    stopStamper = undefined
  }
  disposeGlassMode()
  document.body.innerHTML = ''
})

test('防御 1（Issue #102）：即使页面存在直接挂在 body 下的 dialog，seam stamper 也绝不得把 data-dsh-glass-settings 打在 body 上', () => {
  // 模拟第三方插件或特定模态框直接 portalled 到 document.body
  const directDialog = document.createElement('div')
  directDialog.setAttribute('role', 'dialog')
  directDialog.setAttribute('aria-modal', 'true')
  directDialog.textContent = 'Portal Dialog'
  document.body.appendChild(directDialog)

  stopStamper = startGlassSeamStamper()

  // body 绝对不能被打上 data-dsh-glass-settings
  expect(document.body.hasAttribute('data-dsh-glass-settings')).toBe(false)
})

test('防御 2（Issue #102）：在浅色模式下，即使 body 意外携带 data-dsh-glass-settings，--dsw-alias-bg-layer-2 也必须使用亮色 token，绝不得回退至暗色 bluish-850', () => {
  // 浅色模式（body 无 data-ds-dark-theme）
  applyGlassSettings({ enabled: true, mode: 'mica', preset: 'standard' })

  // 极端场景：人为给 body 打上属性
  document.body.setAttribute('data-dsh-glass-settings', '')

  const bgVar = getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-layer-2')

  // 修复前：包含暗色 neutral-bluish-850
  // 修复后：必须匹配亮色 neutral-bluish-00
  expect(bgVar).toContain('var(--dsw-static-neutral-bluish-00)')
  expect(bgVar).not.toContain('var(--dsw-static-neutral-bluish-850)')
})
