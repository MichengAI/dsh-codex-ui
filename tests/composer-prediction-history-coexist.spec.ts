import { describe, expect, it, vi } from 'vitest'
import { bindHistoryKeys } from '../src/client/composer/input-history-keyboard.ts'

describe('composer: 历史召回与预测候选按键互斥回归', () => {
  it('单纯按 ArrowUp / ArrowDown 时，历史召回正常触发', () => {
    const editor = document.createElement('textarea')
    document.body.appendChild(editor)
    editor.value = ''

    let draftValue = ''
    const setDraftMock = vi.fn((text) => {
      draftValue = text
      editor.value = text
    })

    const off = bindHistoryKeys(editor, {
      draft: () => draftValue,
      entries: () => ['first command', 'second command'],
      blocked: () => false,
      setDraft: setDraftMock,
    })

    // 触发 ArrowUp（纯按键，无 Alt）
    const upEvent = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    })
    editor.dispatchEvent(upEvent)

    expect(setDraftMock).toHaveBeenCalledWith('second command')
    expect(upEvent.defaultPrevented).toBe(true)

    off()
    editor.remove()
  })

  it('按住 Alt + ArrowDown / ArrowUp 时，历史召回绝对不触发，保证预测候选专属', () => {
    const editor = document.createElement('textarea')
    document.body.appendChild(editor)
    editor.value = ''

    let draftValue = ''
    const setDraftMock = vi.fn()

    const off = bindHistoryKeys(editor, {
      draft: () => draftValue,
      entries: () => ['first command', 'second command'],
      blocked: () => false,
      setDraft: setDraftMock,
    })

    // 模拟预测候选切换按键 Alt+ArrowDown
    const altDownEvent = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      altKey: true,
      bubbles: true,
      cancelable: true,
    })
    editor.dispatchEvent(altDownEvent)

    // 历史召回应当完全忽略该事件，不调用 setDraft，也不阻止事件冒泡
    expect(setDraftMock).not.toHaveBeenCalled()
    expect(altDownEvent.defaultPrevented).toBe(false)

    // 模拟 Alt+ArrowUp
    const altUpEvent = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      altKey: true,
      bubbles: true,
      cancelable: true,
    })
    editor.dispatchEvent(altUpEvent)

    expect(setDraftMock).not.toHaveBeenCalled()
    expect(altUpEvent.defaultPrevented).toBe(false)

    off()
    editor.remove()
  })

  it('按 Tab 键时，历史召回绝对不处理，留给预测采纳与宿主焦点', () => {
    const editor = document.createElement('textarea')
    document.body.appendChild(editor)
    const setDraftMock = vi.fn()

    const off = bindHistoryKeys(editor, {
      draft: () => '',
      entries: () => ['history prompt'],
      blocked: () => false,
      setDraft: setDraftMock,
    })

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    editor.dispatchEvent(tabEvent)

    expect(setDraftMock).not.toHaveBeenCalled()
    expect(tabEvent.defaultPrevented).toBe(false)

    off()
    editor.remove()
  })
})
