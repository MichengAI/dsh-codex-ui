/**
 * 输入框光标物理坐标测量算法：
 * 支持 contenteditable (Lexical) 与标准 textarea，用于将幽灵文本精确定位在光标后方。
 */

export interface CaretPosition {
  prefix: string
  left: number
  top: number
  height: number
}

export interface BoxPosition {
  left: number
  top: number
  height: number
  maxWidth: number
}

function collapse(text: string): string {
  return text.replace(/\s+/gu, ' ').trim()
}

/** 定位宿主当前唯一的 Composer Card 与对应的 Editor */
export function locateComposerNear(anchor: HTMLElement): { card: HTMLElement; editor: HTMLElement } | null {
  if (typeof document === 'undefined' || !anchor || !anchor.isConnected) return null
  const card = anchor.closest<HTMLElement>('[data-composer-card]') ?? document.querySelector<HTMLElement>('[data-composer-card]')
  if (!card) return null
  const editor = card.querySelector<HTMLElement>('[contenteditable="true"]') ?? card.querySelector<HTMLElement>('[role="textbox"]') ?? card.querySelector<HTMLElement>('textarea:not([disabled])')
  if (!editor) return null
  return { card, editor }
}

/** 测量光标折叠时的像素边界 */
function rectBeforeCaret(range: Range): { left: number; top: number; height: number } | null {
  const node = range.startContainer
  const offset = range.startOffset
  if (typeof Node === 'undefined' || node === null || node.nodeType !== Node.TEXT_NODE || offset <= 0) return null
  const doc = node.ownerDocument ?? document
  const probe = doc.createRange()
  probe.setStart(node, offset - 1)
  probe.setEnd(node, offset)
  const rect = probe.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  return { left: rect.right, top: rect.top, height: rect.height }
}

function caretRect(range: Range): { left: number; top: number; height: number } | null {
  let rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    const rects = range.getClientRects()
    if (rects.length > 0 && rects[0]) rect = rects[0]
  }
  if ((rect.width === 0 && rect.height === 0) || (rect.top === 0 && rect.left === 0)) {
    const fallback = rectBeforeCaret(range)
    if (fallback !== null) return fallback
  }
  if (rect.width === 0 && rect.height === 0) return null
  return { left: rect.left, top: rect.top, height: rect.height }
}

/** 读取当前光标的位置与光标前所有前缀文本 */
export function readCaret(editor: HTMLElement): CaretPosition | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  // 1. 标准 contenteditable (Lexical)
  if (editor.isContentEditable) {
    const selection = editor.ownerDocument.getSelection()
    if (!selection || !selection.rangeCount) return null
    const range = selection.getRangeAt(0)
    if (!range || !range.collapsed) return null
    if (!editor.contains(range.startContainer)) return null

    const prefixRange = editor.ownerDocument.createRange()
    prefixRange.selectNodeContents(editor)
    prefixRange.setEnd(range.startContainer, range.startOffset)
    const prefix = prefixRange.toString()

    const rect = caretRect(range)
    if (!rect) return null
    return { prefix, left: rect.left, top: rect.top, height: rect.height }
  }

  // 2. 原生 textarea
  if (editor instanceof HTMLTextAreaElement) {
    const prefix = editor.value.slice(0, editor.selectionStart)
    const rect = editor.getBoundingClientRect()
    return { prefix, left: rect.left, top: rect.top, height: 24 }
  }

  return null
}

/** 判断光标是否在当前草稿的末尾 */
export function caretAtEnd(editor: HTMLElement, draft: string): CaretPosition | null {
  const caret = readCaret(editor)
  if (!caret) return null
  const draftText = collapse(draft.trimEnd())
  const prefix = collapse(caret.prefix.trimEnd())
  if (prefix === '') return null
  return draftText === prefix ? caret : null
}

/** 计算幽灵文本相对于 card 容器的局部坐标与最大宽度 */
export function computeGhostBox(
  card: HTMLElement,
  editor: HTMLElement,
  mode: 'next' | 'continue',
  draft: string,
): BoxPosition | null {
  const cardRect = card.getBoundingClientRect()
  const editorRect = editor.getBoundingClientRect()
  const computed = window.getComputedStyle(editor)
  const paddingTop = parseFloat(computed.paddingTop) || 8
  const paddingLeft = parseFloat(computed.paddingLeft) || 14
  const lineHeight = parseFloat(computed.lineHeight) || 20

  if (mode === 'next') {
    const top = Math.max(0, Math.round(editorRect.top - cardRect.top + paddingTop))
    const left = Math.max(0, Math.round(editorRect.left - cardRect.left + paddingLeft))
    const maxWidth = Math.max(100, Math.round(cardRect.width - left - 16))
    return { top, left, height: lineHeight, maxWidth }
  }

  // continue 模式：跟随光标
  const caret = caretAtEnd(editor, draft)
  if (!caret) return null

  const top = Math.round(caret.top - cardRect.top)
  const left = Math.max(0, Math.round(caret.left - cardRect.left))
  const maxWidth = Math.max(80, Math.round(cardRect.right - (cardRect.left + left) - 16))

  return { top, left, height: caret.height || lineHeight, maxWidth }
}
