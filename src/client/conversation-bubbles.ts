/** 撤回旧版 Codex 用户卡片，恢复 DSH 官方问题气泡。 */

export const USER_BUBBLE_STYLE_ID = 'dcu-user-bubble-style'
export const USER_BUBBLE_EXPAND_STYLE_ID = 'dcu-user-bubble-expand-style'

const USER_BUBBLE_EXPAND_STYLE = `
[data-time-hover-root]:not([data-turn-tail]),[data-time-hover-root]:not([data-turn-tail])>:first-child{overflow:visible!important}
[data-dcu-expandable-user-bubble]{max-height:none!important;overflow:visible!important;display:block!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;text-overflow:clip!important;-webkit-line-clamp:unset!important;-webkit-box-orient:initial!important}
`

function ensureExpandableStyle(doc: Document): void {
  if (doc.getElementById(USER_BUBBLE_EXPAND_STYLE_ID) !== null) return
  const style = doc.createElement('style')
  style.id = USER_BUBBLE_EXPAND_STYLE_ID
  style.textContent = USER_BUBBLE_EXPAND_STYLE
  doc.head.append(style)
}

function matchingElements(root: ParentNode, selector: string): HTMLElement[] {
  const items = [...root.querySelectorAll<HTMLElement>(selector)]
  if (root instanceof HTMLElement && root.matches(selector)) items.unshift(root)
  return items
}

function markExpandableUserBubbles(root: ParentNode): void {
  for (const row of matchingElements(root, '[data-time-hover-root]:not([data-turn-tail])')) {
    const stack = row.firstElementChild
    const bubble = stack?.lastElementChild
    if (!(bubble instanceof HTMLElement) || bubble.textContent?.trim() === '') continue
    bubble.dataset.dcuExpandableUserBubble = ''
  }
}

export function restoreOfficialUserBubbles(root: ParentNode): void {
  const doc = 'getElementById' in root ? root as Document : root.ownerDocument
  doc?.getElementById(USER_BUBBLE_STYLE_ID)?.remove()
  if (doc !== undefined && doc !== null && doc.head !== null) ensureExpandableStyle(doc)
  for (const card of root.querySelectorAll('[data-dcu-user-card]')) card.remove()
  for (const source of root.querySelectorAll<HTMLElement>('[data-dcu-user-source]')) delete source.dataset.dcuUserSource
  markExpandableUserBubbles(root)
}
