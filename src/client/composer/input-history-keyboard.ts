import { HistoryCursor } from './input-history.ts'

type Editor = HTMLElement
export interface KeyboardAdapter {
  draft(): string
  entries(): readonly string[]
  blocked(): boolean
  setDraft(text: string): void
}

/** 只处理当前输入框的历史按键，保持 IME、菜单和富内容的原有行为。 */
export function bindHistoryKeys(editor: Editor, adapter: KeyboardAdapter): () => void {
  const cursor = new HistoryCursor()
  let composing = false
  let writingHistory = false
  const begin = () => { composing = true }
  const end = () => { composing = false }
  // 只忽略自身同步 setDraft 引发的 input，外部编辑即使草稿镜像滞后也必须退出历史。
  const changed = () => { if (!writingHistory) cursor.reset() }
  const keydown = (event: KeyboardEvent) => {
    if (event.target !== editor && !editor.contains(event.target as Node)) return
    if (event.defaultPrevented || composing || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || adapter.blocked()) return
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    const draft = adapter.draft()
    if (draft !== '' && !atHistoryBoundary(editor)) return
    const next = cursor.move(event.key === 'ArrowUp' ? -1 : 1, draft, adapter.entries())
    if (next === undefined) return
    event.preventDefault()
    event.stopImmediatePropagation()
    writingHistory = true
    try { adapter.setDraft(next) }
    finally { writingHistory = false }
  }
  editor.addEventListener('compositionstart', begin)
  editor.addEventListener('compositionend', end)
  editor.addEventListener('input', changed)
  editor.addEventListener('keydown', keydown, true)
  return () => {
    editor.removeEventListener('compositionstart', begin)
    editor.removeEventListener('compositionend', end)
    editor.removeEventListener('input', changed)
    editor.removeEventListener('keydown', keydown, true)
  }
}

/** 召回文本中间或存在选区时，保留宿主编辑器的垂直光标移动。 */
function atHistoryBoundary(editor: HTMLElement): boolean {
  if (editor instanceof HTMLTextAreaElement) {
    return editor.selectionStart === editor.selectionEnd
      && (editor.selectionStart === 0 || editor.selectionEnd === editor.value.length)
  }
  const selection = editor.ownerDocument.getSelection()
  if (!selection?.isCollapsed || !selection.rangeCount || !editor.contains(selection.anchorNode)) return false
  const caret = selection.getRangeAt(0)
  const before = editor.ownerDocument.createRange()
  before.selectNodeContents(editor)
  before.setEnd(caret.startContainer, caret.startOffset)
  const after = editor.ownerDocument.createRange()
  after.selectNodeContents(editor)
  after.setStart(caret.endContainer, caret.endOffset)
  return before.toString() === '' || after.toString() === ''
}

/** 从本 slot 向上寻找唯一输入框，避免绑定侧栏、搜索或其他会话。 */
export function findComposer(anchor: HTMLElement): Editor | undefined {
  let parent = anchor.parentElement
  while (parent && parent !== document.body) {
    const editors = parent.querySelectorAll<HTMLElement>('textarea:not([disabled]), [data-lexical-editor="true"][contenteditable="true"]')
    if (editors.length === 1) return editors[0]
    if (editors.length > 1) return undefined
    parent = parent.parentElement
  }
  return undefined
}
