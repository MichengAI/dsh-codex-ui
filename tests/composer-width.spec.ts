import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { initializeComposerWidth, observeHeroWidthHandles, COMPOSER_MIN_WIDTH, COMPOSER_EDGE_BUDGET } from '../src/client/composer/composer-width.ts'

/** 搭一个新建页骨架：新建页拖柄只认 `[data-phase=hero]` 且含会话滚动区。 */
function mountHero(): HTMLElement {
  document.body.innerHTML = '<main data-phase="hero"><div class="_body"><div data-conversation-scroll></div></div></main>'
  return document.querySelector<HTMLElement>('main')!
}

/** 宿主宽度变量归宿主所有；插件只能写自己的私有变量，离开新建页后不得留存。 */
describe('新建页拖柄与宿主宽度变量的边界', () => {
  it('只写插件私有变量，绝不覆盖宿主宽度变量', () => {
    const root = mountHero()
    const body = root.querySelector<HTMLElement>('._body')!
    localStorage.setItem('dsh.conversation.contentWidth', '900')
    const stop = observeHeroWidthHandles('调整宽度')
    try {
      expect(root.querySelectorAll('[data-dcu-width-handle]')).toHaveLength(2)
      expect(root.hasAttribute('data-dcu-hero-width')).toBe(true)
      expect(root.style.getPropertyValue('--dcu-hero-chat-width')).toMatch(/^\d+px$/)
      for (const el of [root, body]) {
        expect(el.style.getPropertyValue('--dsh-chat-user-width')).toBe('')
        expect(el.style.getPropertyValue('--dsh-chat-content-width')).toBe('')
      }
    } finally { stop() }
  })
  it('注销时清掉插件私有变量，宿主变量始终保持未被占用', () => {
    const root = mountHero()
    const body = root.querySelector<HTMLElement>('._body')!
    const stop = observeHeroWidthHandles('调整宽度')
    stop()
    expect(root.querySelectorAll('[data-dcu-width-handle]')).toHaveLength(0)
    expect(root.hasAttribute('data-dcu-hero-width')).toBe(false)
    expect(root.style.getPropertyValue('--dcu-hero-chat-width')).toBe('')
    expect(root.style.getPropertyValue('--dsh-chat-user-width')).toBe('')
    expect(body.style.getPropertyValue('--dsh-chat-user-width')).toBe('')
  })
  it('宿主已发布宽度时以其为准，不被过期的私有值覆盖', () => {
    const root = mountHero()
    const body = root.querySelector<HTMLElement>('._body')!
    Object.defineProperty(root, 'clientWidth', { value: 1400, configurable: true })
    root.style.setProperty('--dsh-chat-user-width', '1100px')
    const stop = observeHeroWidthHandles('调整宽度')
    try {
      expect(root.style.getPropertyValue('--dcu-hero-chat-width')).toBe('1100px')
      expect(body.style.getPropertyValue('--dsh-chat-user-width')).toBe('')
    } finally { stop() }
  })
  it('指针捕获被系统拒绝时仍能靠 window 监听完成拖拽', () => {
    const root = mountHero()
    Object.defineProperty(root, 'clientWidth', { value: 1400, configurable: true })
    localStorage.setItem('dsh.conversation.contentWidth', '640')
    const stop = observeHeroWidthHandles('调整宽度')
    try {
      const handle = root.querySelector<HTMLElement>('[data-dcu-width-handle="right"]')!
      handle.setPointerCapture = () => { throw new Error('capture 不可用') }
      handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 500 }))
      window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 560, buttons: 1 }))
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 560, buttons: 0 }))
      // 右侧拖柄 1px 位移对应 2px 宽度：640 + (560 - 500) * 2
      expect(root.style.getPropertyValue('--dcu-hero-chat-width')).toBe('760px')
      expect(localStorage.getItem('dsh.conversation.contentWidth')).toBe('760')
    } finally { stop() }
  })
  /** jsdom 的 MouseEvent 不带 pointerId，用同名只读属性补上。 */
  const pointer = (type: string, init: { x: number, buttons: number, id?: number }) => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: init.x, buttons: init.buttons })
    Object.defineProperty(event, 'pointerId', { value: init.id ?? 1 })
    return event
  }
  it('在窗口外松开（只收到 buttons=0 的 move）时按最后拖到的宽度落盘，不跟随重新进窗的位置', () => {
    const root = mountHero()
    Object.defineProperty(root, 'clientWidth', { value: 1400, configurable: true })
    localStorage.setItem('dsh.conversation.contentWidth', '640')
    const stop = observeHeroWidthHandles('调整宽度')
    try {
      const handle = root.querySelector<HTMLElement>('[data-dcu-width-handle="right"]')!
      handle.dispatchEvent(pointer('pointerdown', { x: 500, buttons: 1 }))
      window.dispatchEvent(pointer('pointermove', { x: 560, buttons: 1 }))
      // 窗口外松开：pointerup 丢失，只来一个 buttons=0 的 move（坐标已经跑到 600）
      window.dispatchEvent(pointer('pointermove', { x: 600, buttons: 0 }))
      // 结算最后拖到的位置（x=560 → 760），不采用重新进窗的 x=600（840）
      expect(root.style.getPropertyValue('--dcu-hero-chat-width')).toBe('760px')
      expect(localStorage.getItem('dsh.conversation.contentWidth')).toBe('760')
      // 拖拽已结束：后续无按键的移动不得继续改宽
      window.dispatchEvent(pointer('pointermove', { x: 900, buttons: 0 }))
      expect(root.style.getPropertyValue('--dcu-hero-chat-width')).toBe('760px')
    } finally { stop() }
  })
  it('捕获被收回时按最后拖到的宽度落定，不采用收回事件的坐标', () => {
    const root = mountHero()
    Object.defineProperty(root, 'clientWidth', { value: 1400, configurable: true })
    localStorage.setItem('dsh.conversation.contentWidth', '640')
    const stop = observeHeroWidthHandles('调整宽度')
    try {
      const handle = root.querySelector<HTMLElement>('[data-dcu-width-handle="right"]')!
      handle.dispatchEvent(pointer('pointerdown', { x: 500, buttons: 1 }))
      window.dispatchEvent(pointer('pointermove', { x: 560, buttons: 1 }))
      handle.dispatchEvent(pointer('lostpointercapture', { x: 900, buttons: 0 }))
      expect(root.style.getPropertyValue('--dcu-hero-chat-width')).toBe('760px')
      expect(localStorage.getItem('dsh.conversation.contentWidth')).toBe('760')
    } finally { stop() }
  })
  it('第二个指针设备的 pointerup 不会提前结束拖拽', () => {
    const root = mountHero()
    Object.defineProperty(root, 'clientWidth', { value: 1400, configurable: true })
    localStorage.setItem('dsh.conversation.contentWidth', '640')
    const stop = observeHeroWidthHandles('调整宽度')
    try {
      const handle = root.querySelector<HTMLElement>('[data-dcu-width-handle="right"]')!
      handle.dispatchEvent(pointer('pointerdown', { x: 500, buttons: 1, id: 1 }))
      window.dispatchEvent(pointer('pointerup', { x: 560, buttons: 0, id: 2 }))
      expect(localStorage.getItem('dsh.conversation.contentWidth')).toBe('640')
      window.dispatchEvent(pointer('pointermove', { x: 560, buttons: 1, id: 1 }))
      window.dispatchEvent(pointer('pointerup', { x: 560, buttons: 0, id: 1 }))
      expect(root.style.getPropertyValue('--dcu-hero-chat-width')).toBe('760px')
      expect(localStorage.getItem('dsh.conversation.contentWidth')).toBe('760')
    } finally { stop() }
  })
})

describe('输入区初始宽度', () => {
  for (const initial of [null, '', 'invalid', '-1']) {
    it(`为未设置或无效偏好 ${initial} 初始化最窄宽度`, () => {
      let saved = initial
      initializeComposerWidth({ getItem: () => saved, setItem: (_, value) => { saved = value } })
      expect(saved).toBe('640')
    })
  }
  it('保留用户拖拽后的宽度，重复启动也不重置', () => {
    let saved = '860'
    const storage = { getItem: () => saved, setItem: (_: string, value: string) => { saved = value } }
    initializeComposerWidth(storage)
    initializeComposerWidth(storage)
    expect(saved).toBe('860')
  })
})

it('宿主拖拽边界变更时明确失败，避免两套宽度规则漂移', () => {
  const host = readFileSync(createRequire(import.meta.url).resolve('@deepseek-ai/dsh-client-ui-conversation/client'), 'utf8')
  expect(Number(host.match(/const CONTENT_MIN\s*=\s*(\d+);/)?.[1])).toBe(COMPOSER_MIN_WIDTH)
  expect(Number(host.match(/const CONTENT_EDGE_BUDGET\s*=\s*(\d+);/)?.[1])).toBe(COMPOSER_EDGE_BUDGET)
})
