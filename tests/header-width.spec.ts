import { afterEach, describe, expect, it } from 'vitest'
import { startGlassHeaderWidthTracker } from '../src/client/theme/header-width.ts'

/** 搭一个云母浮动会话骨架：顶栏与正文互为兄弟，内容宽度只写在正文上（0.2.3 起的宿主形态）。 */
function mountConversation(width: string | null): { root: HTMLElement, body: HTMLElement, frame: HTMLElement } {
  document.body.innerHTML = `<div data-dsh-glass-frame><div data-phase="active"><header></header><div data-conversation-content></div></div></div>`
  const frame = document.querySelector<HTMLElement>('[data-dsh-glass-frame]')!
  const root = frame.querySelector<HTMLElement>('[data-phase]')!
  const body = frame.querySelector<HTMLElement>('[data-conversation-content]')!
  if (width !== null) body.style.setProperty('--dsh-chat-content-width', width)
  return { root, body, frame }
}

const disposers: Array<() => void> = []
afterEach(() => {
  while (disposers.length > 0) disposers.pop()!()
  document.documentElement.removeAttribute('data-dsh-glass-float')
})

describe('浮动顶栏宽度跟随', () => {
  it('把正文上已解析的内容宽度提升到会话根', () => {
    const { root } = mountConversation('1160px')
    disposers.push(startGlassHeaderWidthTracker())
    expect(root.style.getPropertyValue('--dcu-chat-content-width')).toBe('1160px')
  })

  it('宿主重算后跟着更新，不缓存旧值', async () => {
    const { root, body } = mountConversation('640px')
    disposers.push(startGlassHeaderWidthTracker())
    expect(root.style.getPropertyValue('--dcu-chat-content-width')).toBe('640px')
    body.style.setProperty('--dsh-chat-content-width', '1160px')
    // 追踪器靠 window.resize / MutationObserver 触发，这里用 resize 走同一条节流路径。
    window.dispatchEvent(new Event('resize'))
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(root.style.getPropertyValue('--dcu-chat-content-width')).toBe('1160px')
  })

  it('值还不是绝对长度时不写入，交回上游兜底', () => {
    const { root } = mountConversation('clamp(680px, 64%, 920px)')
    disposers.push(startGlassHeaderWidthTracker())
    expect(root.style.getPropertyValue('--dcu-chat-content-width')).toBe('')
  })

  it('正文消失或注销时清掉插件变量，绝不残留', async () => {
    const { root, body } = mountConversation('1160px')
    const stop = startGlassHeaderWidthTracker()
    expect(root.style.getPropertyValue('--dcu-chat-content-width')).toBe('1160px')
    body.remove()
    window.dispatchEvent(new Event('resize'))
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(root.style.getPropertyValue('--dcu-chat-content-width')).toBe('')
    body.style.setProperty('--dsh-chat-content-width', '1160px')
    expect(root.style.getPropertyValue('--dcu-chat-content-width')).toBe('')
    stop()
    expect(root.style.getPropertyValue('--dcu-chat-content-width')).toBe('')
  })

  it('只写插件私有变量，不碰宿主的内容宽度变量', () => {
    const { root, body } = mountConversation('1160px')
    disposers.push(startGlassHeaderWidthTracker())
    expect(root.style.getPropertyValue('--dsh-chat-content-width')).toBe('')
    expect(body.style.getPropertyValue('--dsh-chat-content-width')).toBe('1160px')
  })

  it('同一会话挂着多个正文节点时取真正有宽度的那个，不被隐藏分支的旧值钉住', () => {
    const { root } = mountConversation('824px')
    const hidden = root.querySelector<HTMLElement>('[data-conversation-content]')!
    hidden.style.setProperty('--dsh-chat-content-width', '824px')
    const visible = document.createElement('div')
    visible.setAttribute('data-conversation-content', '')
    visible.style.setProperty('--dsh-chat-content-width', '1380px')
    root.append(visible)
    Object.defineProperty(hidden, 'getBoundingClientRect', { value: () => ({ width: 0 }) })
    Object.defineProperty(visible, 'getBoundingClientRect', { value: () => ({ width: 1380 }) })
    disposers.push(startGlassHeaderWidthTracker())
    expect(root.style.getPropertyValue('--dcu-chat-content-width')).toBe('1380px')
  })
})
