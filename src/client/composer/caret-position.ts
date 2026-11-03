/**
 * 输入框光标物理坐标测量算法：
 * 支持 contenteditable (Lexical) 与标准 textarea，用于将幽灵文本精确定位在光标后方。
 */

export interface CaretRect {
  left: number
  top: number
  height: number
}

/** 测量当前选区或光标在视口中的边界矩形 */
export function measureCaretRect(editor: HTMLElement): CaretRect | null {
  if (!editor || typeof window === 'undefined') return null

  // 1. 标准 contenteditable (Lexical / 富文本)
  if (editor.isContentEditable) {
    const selection = editor.ownerDocument.getSelection()
    if (!selection || !selection.rangeCount) return null
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.startContainer)) return null

    let rect = range.getBoundingClientRect()
    // 若光标折叠且宽高为 0，通过测量光标前一个字符的右边界获取真实坐标
    if (rect.width === 0 && rect.height === 0) {
      const node = range.startContainer
      const offset = range.startOffset
      if (node.nodeType === Node.TEXT_NODE && offset > 0) {
        const probe = editor.ownerDocument.createRange()
        probe.setStart(node, offset - 1)
        probe.setEnd(node, offset)
        const probeRect = probe.getBoundingClientRect()
        if (probeRect.width > 0 || probeRect.height > 0) {
          rect = new DOMRect(probeRect.right, probeRect.top, 0, probeRect.height)
        }
      }
    }

    if (rect.height > 0) {
      return {
        left: rect.left,
        top: rect.top,
        height: rect.height,
      }
    }
  }

  // 2. 原生 textarea 降级：通过镜像元素测量或计算行高
  if (editor instanceof HTMLTextAreaElement) {
    const editorRect = editor.getBoundingClientRect()
    const computed = window.getComputedStyle(editor)
    const lineHeight = parseFloat(computed.lineHeight) || 24
    const paddingTop = parseFloat(computed.paddingTop) || 8
    const paddingLeft = parseFloat(computed.paddingLeft) || 12

    // 简单行内单行估算
    return {
      left: editorRect.left + paddingLeft,
      top: editorRect.top + paddingTop,
      height: lineHeight,
    }
  }

  return null
}

/** 判断光标是否在文本的末尾 */
export function isCaretAtDraftEnd(editor: HTMLElement, draft: string): boolean {
  if (!editor || !draft) return true
  if (editor instanceof HTMLTextAreaElement) {
    return editor.selectionEnd >= draft.length
  }
  const selection = editor.ownerDocument.getSelection()
  if (!selection || !selection.isCollapsed || !selection.rangeCount) return false
  if (!editor.contains(selection.anchorNode)) return false

  const range = selection.getRangeAt(0)
  const afterRange = editor.ownerDocument.createRange()
  afterRange.selectNodeContents(editor)
  afterRange.setStart(range.endContainer, range.endOffset)
  return afterRange.toString().trim() === ''
}
