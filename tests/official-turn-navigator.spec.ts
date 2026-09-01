import { afterEach, expect, test } from 'vitest'
import { markOfficialTurnNavigators, observeOfficialTurnNavigators } from '../src/client/official-turn-navigator.ts'

afterEach(() => {
  document.body.replaceChildren()
})

function officialNavigator(): HTMLElement {
  const nav = document.createElement('nav')
  nav.style.setProperty('--turn-natural-height', '72px')
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', '跳转到第 1 轮')
  nav.append(button)
  return nav
}

test('实际官方导航不依赖宿主层级也能获得稳定标记', () => {
  const wrapper = document.createElement('section')
  const nested = document.createElement('aside')
  const nav = officialNavigator()
  nested.append(nav)
  wrapper.append(nested)
  document.body.append(wrapper)

  expect(markOfficialTurnNavigators(document)).toBe(1)
  expect(nav.dataset.dcuOfficialTurnNavigator).toBe('true')
})

test('普通导航不会被误认为官方轮次导航', () => {
  const nav = document.createElement('nav')
  nav.append(document.createElement('button'))
  document.body.append(nav)

  expect(markOfficialTurnNavigators(document)).toBe(0)
  expect(nav.hasAttribute('data-dcu-official-turn-navigator')).toBe(false)
})

test('观察器会标记稍后挂载的官方导航并在停用时清理', async () => {
  const stop = observeOfficialTurnNavigators(document.body)
  const nav = officialNavigator()
  document.body.append(nav)
  await new Promise(resolve => setTimeout(resolve, 0))

  expect(nav.dataset.dcuOfficialTurnNavigator).toBe('true')
  stop()
  expect(nav.hasAttribute('data-dcu-official-turn-navigator')).toBe(false)
})
