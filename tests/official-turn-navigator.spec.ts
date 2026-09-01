import { afterEach, expect, test, vi } from 'vitest'
import { markOfficialTurnNavigators, observeOfficialTurnNavigators } from '../src/client/official-turn-navigator.ts'

afterEach(() => {
  document.body.replaceChildren()
  delete document.documentElement.dataset.dcuOfficialTurnNavigatorSupported
  vi.restoreAllMocks()
})

function officialNavigator(): HTMLElement {
  const nav = document.createElement('nav')
  nav.style.setProperty('--turn-natural-height', '72px')
  const marks = document.createElement('div')
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', '跳转到第 1 轮')
  marks.append(button)
  const tooltip = document.createElement('div')
  tooltip.role = 'tooltip'
  nav.append(marks, tooltip)
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
  expect(nav.querySelector('button')?.dataset.dcuOfficialTurnMark).toBe('true')
  expect(nav.querySelector('[role="tooltip"]')?.getAttribute('data-dcu-official-turn-tooltip')).toBe('true')
})

test('普通导航不会被误认为官方轮次导航', () => {
  const nav = document.createElement('nav')
  nav.append(document.createElement('button'))
  document.body.append(nav)

  expect(markOfficialTurnNavigators(document)).toBe(0)
  expect(nav.hasAttribute('data-dcu-official-turn-navigator')).toBe(false)
})

test('观察器会标记稍后挂载的官方导航并在停用时清理', async () => {
  const stop = observeOfficialTurnNavigators(document, async () => new Response(JSON.stringify({
    capabilities: { officialTurnNavigator: false },
  })))
  const nav = officialNavigator()
  document.body.append(nav)
  await new Promise(resolve => setTimeout(resolve, 20))

  expect(nav.dataset.dcuOfficialTurnNavigator).toBe('true')
  stop()
  expect(nav.hasAttribute('data-dcu-official-turn-navigator')).toBe(false)
})

test('运行时能力会独立关闭旧导航，避免私有 DOM 信号失效时双导航', async () => {
  const stop = observeOfficialTurnNavigators(document, async () => new Response(JSON.stringify({
    capabilities: { officialTurnNavigator: true },
  }), { status: 200 }))
  await new Promise(resolve => setTimeout(resolve, 0))

  expect(document.documentElement.dataset.dcuOfficialTurnNavigatorSupported).toBe('true')
  stop()
  expect(document.documentElement.hasAttribute('data-dcu-official-turn-navigator-supported')).toBe(false)
})

test('全局观察只对导航相关变更按帧调度', async () => {
  document.body.append(officialNavigator())
  let queuedFrame: FrameRequestCallback | undefined
  const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    queuedFrame = callback
    return 1
  })
  const stop = observeOfficialTurnNavigators(document, async () => new Response(JSON.stringify({
    capabilities: { officialTurnNavigator: false },
  })))
  expect(requestFrame).toHaveBeenCalledTimes(1)
  queuedFrame?.(0)

  document.body.append(document.createElement('p'))
  await Promise.resolve()
  expect(requestFrame).toHaveBeenCalledTimes(1)

  document.body.append(officialNavigator())
  await Promise.resolve()
  expect(requestFrame).toHaveBeenCalledTimes(2)
  stop()
})
