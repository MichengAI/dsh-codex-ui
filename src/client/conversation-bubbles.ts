/** 撤回旧版用户卡片和长文本展开覆盖，恢复 DSH 官方气泡。 */
export const USER_BUBBLE_STYLE_ID = 'dcu-user-bubble-style'
export const USER_BUBBLE_EXPAND_STYLE_ID = 'dcu-user-bubble-expand-style'

export function restoreOfficialUserBubbles(root: ParentNode): void {
  const doc = 'getElementById' in root ? root as Document : root.ownerDocument
  doc?.getElementById(USER_BUBBLE_STYLE_ID)?.remove()
  doc?.getElementById(USER_BUBBLE_EXPAND_STYLE_ID)?.remove()
  for (const card of root.querySelectorAll('[data-dcu-user-card]')) card.remove()
  const selector = '[data-dcu-user-source],[data-dcu-expandable-user-bubble]'
  const sources = [...root.querySelectorAll(selector)]
  if (root instanceof HTMLElement && root.matches(selector)) sources.unshift(root)
  for (const source of sources) {
    source.removeAttribute('data-dcu-user-source')
    source.removeAttribute('data-dcu-expandable-user-bubble')
  }
}
