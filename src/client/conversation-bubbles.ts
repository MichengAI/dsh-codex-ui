/** 撤回旧版 Codex 用户卡片，恢复 DSH 官方问题气泡。 */

export const USER_BUBBLE_STYLE_ID = 'dcu-user-bubble-style'

export function restoreOfficialUserBubbles(root: ParentNode): void {
  const doc = 'getElementById' in root ? root as Document : root.ownerDocument
  doc?.getElementById(USER_BUBBLE_STYLE_ID)?.remove()
  for (const card of root.querySelectorAll('[data-dcu-user-card]')) card.remove()
  for (const source of root.querySelectorAll<HTMLElement>('[data-dcu-user-source]')) delete source.dataset.dcuUserSource
}
