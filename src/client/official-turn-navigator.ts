const OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE = 'data-dcu-official-turn-navigator'

function isOfficialTurnNavigator(element: Element): element is HTMLElement {
  return element instanceof HTMLElement
    && element.tagName === 'NAV'
    && element.style.getPropertyValue('--turn-natural-height') !== ''
    && element.querySelector('button[type="button"][aria-label]') !== null
}

/** 标记实际挂载的官方轮次导航，避免依赖宿主样式文件名或会话 DOM 层级。 */
export function markOfficialTurnNavigators(root: ParentNode = document): number {
  for (const element of root.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`)) {
    if (!isOfficialTurnNavigator(element)) element.removeAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE)
  }
  for (const element of root.querySelectorAll('nav')) {
    if (isOfficialTurnNavigator(element)) element.setAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE, 'true')
  }
  return root.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`).length
}

/** 官方导航可能在会话切换后异步挂载；持续做能力检测并在插件停用时清理标记。 */
export function observeOfficialTurnNavigators(root: Node & ParentNode = document.body): () => void {
  const sync = (): void => { markOfficialTurnNavigators(root) }
  const observer = new MutationObserver(sync)
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] })
  sync()
  return () => {
    observer.disconnect()
    for (const element of root.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`)) {
      element.removeAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE)
    }
  }
}
