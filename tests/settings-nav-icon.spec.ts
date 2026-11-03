// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test } from 'vitest'
import { applyNavIcon, CODEX_UI_NAV_MARKER, observeSettingsNavIcon } from '../src/client/settings-nav-icon.ts'

beforeEach(() => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

test('为 Codex UI 设置项按钮打上 marker 并注入样式', () => {
  const button = document.createElement('button')
  button.textContent = 'Codex UI'
  document.body.appendChild(button)

  const changed = applyNavIcon(button, () => 'Codex UI')
  expect(changed).toBe(true)
  expect(button.getAttribute(CODEX_UI_NAV_MARKER)).toBe('codex-ui')
  expect(document.getElementById('dcu-settings-nav-icon-style')).not.toBeNull()
})

test('当宿主已使用原生插槽容器(如 navIcon)时，不添加 marker 避免双图标', () => {
  const button = document.createElement('button')
  const iconSpan = document.createElement('span')
  iconSpan.className = 'navIcon'
  iconSpan.setAttribute('aria-hidden', 'true')
  const labelSpan = document.createElement('span')
  labelSpan.textContent = 'Codex UI'
  button.appendChild(iconSpan)
  button.appendChild(labelSpan)
  document.body.appendChild(button)

  const changed = applyNavIcon(button, () => 'Codex UI')
  expect(changed).toBe(false)
  expect(button.hasAttribute(CODEX_UI_NAV_MARKER)).toBe(false)
})

test('老宿主回归：老宿主原生渲染的 svg.navIcon 不得被误判为新版插槽，必须正常打上 marker', () => {
  const button = document.createElement('button')
  const svg = document.createElement('svg')
  svg.setAttribute('class', 'VOzbGW_navIcon')
  const labelSpan = document.createElement('span')
  labelSpan.textContent = 'Codex UI'
  button.appendChild(svg)
  button.appendChild(labelSpan)
  document.body.appendChild(button)

  const changed = applyNavIcon(button, () => 'Codex UI')
  expect(changed).toBe(true)
  expect(button.getAttribute(CODEX_UI_NAV_MARKER)).toBe('codex-ui')
})

test('observeSettingsNavIcon 在 DOM 变更时自动补上图标并在卸载时清理', async () => {
  const stop = observeSettingsNavIcon(() => 'Codex UI', document)

  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  const nav = document.createElement('nav')
  const btn = document.createElement('button')
  btn.textContent = 'Codex UI'
  nav.appendChild(btn)
  dialog.appendChild(nav)
  document.body.appendChild(dialog)

  await new Promise(resolve => setTimeout(resolve, 10))

  expect(btn.getAttribute(CODEX_UI_NAV_MARKER)).toBe('codex-ui')

  stop()

  expect(btn.hasAttribute(CODEX_UI_NAV_MARKER)).toBe(false)
  expect(document.getElementById('dcu-settings-nav-icon-style')).toBeNull()
})
