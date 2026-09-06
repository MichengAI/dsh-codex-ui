import { afterEach, expect, test } from 'vitest'
import { bindHistoryKeys, findComposer } from '../src/client/input-history-keyboard.ts'

afterEach(() => document.body.replaceChildren())

test('空输入召回、恢复草稿，菜单、输入法、修饰键和卸载不拦截', () => {
  const editor = document.createElement('textarea')
  document.body.append(editor)
  let blocked = false
  const off = bindHistoryKeys(editor, {
    draft: () => editor.value, entries: () => ['第一条', '第二条'],
    blocked: () => blocked, setDraft: text => { editor.value = text },
  })
  const press = (key: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    editor.dispatchEvent(event)
    return event.defaultPrevented
  }
  expect(press('ArrowUp')).toBe(true)
  expect(editor.value).toBe('第二条')
  editor.setSelectionRange(1, 1)
  expect(press('ArrowUp')).toBe(false)
  expect(editor.value).toBe('第二条')
  editor.setSelectionRange(0, 2)
  expect(press('ArrowUp')).toBe(false)
  editor.setSelectionRange(editor.value.length, editor.value.length)
  press('ArrowUp')
  expect(editor.value).toBe('第一条')
  press('ArrowDown'); press('ArrowDown')
  expect(editor.value).toBe('')
  blocked = true
  expect(press('ArrowUp')).toBe(false)
  blocked = false
  editor.dispatchEvent(new CompositionEvent('compositionstart'))
  expect(press('ArrowUp')).toBe(false)
  editor.dispatchEvent(new CompositionEvent('compositionend'))
  expect(press('ArrowUp', { isComposing: true })).toBe(false)
  expect(press('ArrowUp', { shiftKey: true })).toBe(false)
  editor.value = '草稿'
  expect(press('ArrowUp')).toBe(false)
  editor.value = ''
  press('ArrowUp')
  editor.value = '编辑后的历史'
  editor.dispatchEvent(new Event('input'))
  expect(press('ArrowDown')).toBe(false)
  off()
  editor.value = ''
  expect(press('ArrowUp')).toBe(false)
})

test('只查找本插槽的唯一输入框，不绑定搜索框或多个编辑器', () => {
  document.body.innerHTML = '<textarea id="search"></textarea><section><span hidden></span><div data-lexical-editor="true" contenteditable="true"></div></section>'
  const anchor = document.querySelector('span')!
  expect(findComposer(anchor)).toBe(document.querySelector('[data-lexical-editor]'))
  anchor.parentElement!.append(document.createElement('textarea'))
  expect(findComposer(anchor)).toBeUndefined()
})

test('富文本编辑器召回多行后，光标在中间或选中文字时保留原生上下键', () => {
  const editor = document.createElement('div')
  editor.contentEditable = 'true'
  document.body.append(editor)
  let draft = ''
  const selection = document.getSelection()!
  const off = bindHistoryKeys(editor, {
    draft: () => draft, entries: () => ['旧输入', '第一行\n第二行'], blocked: () => false,
    setDraft: text => {
      draft = text
      editor.textContent = text
      selection.collapse(editor.firstChild, text.length)
    },
  })
  const press = () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true, bubbles: true })
    editor.dispatchEvent(event)
    return event.defaultPrevented
  }
  try {
    expect(press()).toBe(true)
    selection.collapse(editor.firstChild, 2)
    expect(press()).toBe(false)
    const range = document.createRange()
    range.selectNodeContents(editor)
    selection.removeAllRanges()
    selection.addRange(range)
    expect(press()).toBe(false)
    selection.collapse(editor.firstChild, draft.length)
    expect(press()).toBe(true)
    expect(draft).toBe('旧输入')
  } finally { off(); selection.removeAllRanges() }
})

test.each(['textarea', 'richtext'] as const)('%s 的 setDraft 同步派发 input 时仍可连续上下召回', kind => {
  const editor = document.createElement(kind === 'textarea' ? 'textarea' : 'div')
  if (kind === 'richtext') editor.contentEditable = 'true'
  document.body.append(editor)
  const selection = document.getSelection()!
  let draft = ''
  const off = bindHistoryKeys(editor, {
    draft: () => draft, entries: () => ['第一条', '第二条'], blocked: () => false,
    setDraft: text => {
      if (editor instanceof HTMLTextAreaElement) editor.value = text
      else {
        editor.textContent = text
        if (editor.firstChild) selection.collapse(editor.firstChild, text.length)
      }
      editor.dispatchEvent(new Event('input', { bubbles: true }))
      draft = text
    },
  })
  const press = (key: string) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    editor.dispatchEvent(event)
    return event.defaultPrevented
  }
  try {
    expect(press('ArrowUp')).toBe(true)
    expect(draft).toBe('第二条')
    expect(press('ArrowUp')).toBe(true)
    expect(draft).toBe('第一条')
    expect(press('ArrowDown')).toBe(true)
    expect(draft).toBe('第二条')
    expect(press('ArrowDown')).toBe(true)
    expect(draft).toBe('')
  } finally { off(); selection.removeAllRanges() }
})

test('自身召回之外的 input 仍退出历史，即使宿主草稿镜像尚未同步', () => {
  const editor = document.createElement('textarea')
  document.body.append(editor)
  let draft = ''
  const off = bindHistoryKeys(editor, {
    draft: () => draft, entries: () => ['第一条', '第二条'], blocked: () => false,
    setDraft: text => { editor.value = text; draft = text },
  })
  const press = () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })
    editor.dispatchEvent(event)
    return event.defaultPrevented
  }
  try {
    expect(press()).toBe(true)
    expect(draft).toBe('第二条')
    editor.value = '用户或其他插件编辑后的草稿'
    editor.dispatchEvent(new Event('input', { bubbles: true }))
    expect(draft).toBe('第二条')
    expect(press()).toBe(false)
    expect(editor.value).toBe('用户或其他插件编辑后的草稿')
  } finally { off() }
})
