const OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE = 'data-dcu-official-turn-navigator'
const OFFICIAL_TURN_MARK_ATTRIBUTE = 'data-dcu-official-turn-mark'
const OFFICIAL_TURN_TOOLTIP_ATTRIBUTE = 'data-dcu-official-turn-tooltip'
const OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE = 'data-dcu-official-turn-navigator-supported'
const CAPABILITIES_ENDPOINT = '/api/michengai/codex-ui/dependencies?action=capabilities'

function isOfficialTurnNavigator(element: Element): element is HTMLElement {
  return element instanceof HTMLElement
    && element.tagName === 'NAV'
    && element.style.getPropertyValue('--turn-natural-height') !== ''
    && element.querySelector('button[type="button"][aria-label]') !== null
}

function markOfficialTurnNavigatorParts(navigator: HTMLElement): void {
  for (const button of navigator.querySelectorAll('button[type="button"][aria-label]')) {
    button.setAttribute(OFFICIAL_TURN_MARK_ATTRIBUTE, 'true')
  }
  for (const tooltip of navigator.querySelectorAll('[role="tooltip"]')) {
    tooltip.setAttribute(OFFICIAL_TURN_TOOLTIP_ATTRIBUTE, 'true')
  }
}

/** 标记实际挂载的官方轮次导航，避免依赖宿主样式文件名或会话 DOM 层级。 */
export function markOfficialTurnNavigators(root: ParentNode = document): number {
  for (const element of root.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`)) {
    if (isOfficialTurnNavigator(element)) continue
    element.removeAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE)
    for (const part of element.querySelectorAll(`[${OFFICIAL_TURN_MARK_ATTRIBUTE}],[${OFFICIAL_TURN_TOOLTIP_ATTRIBUTE}]`)) {
      part.removeAttribute(OFFICIAL_TURN_MARK_ATTRIBUTE)
      part.removeAttribute(OFFICIAL_TURN_TOOLTIP_ATTRIBUTE)
    }
  }
  for (const element of root.querySelectorAll('nav')) {
    if (!isOfficialTurnNavigator(element)) continue
    element.setAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE, 'true')
    markOfficialTurnNavigatorParts(element)
  }
  return root.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`).length
}

function nodeTouchesTurnNavigator(node: Node): boolean {
  return node instanceof Element && (
    node.matches(`nav,[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`)
    || node.closest(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) !== null
    || node.querySelector(`nav,[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) !== null
  )
}

function nodeInsideTurnNavigator(node: Node): boolean {
  return node instanceof Element && (
    node.matches(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`)
    || node.closest(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) !== null
  )
}

function turnNavigatorMutationRelevant(records: readonly MutationRecord[]): boolean {
  return records.some(record => record.type === 'attributes'
    ? record.target instanceof Element && record.target.matches('nav')
    : nodeInsideTurnNavigator(record.target)
      || [...record.addedNodes].some(nodeTouchesTurnNavigator)
      || [...record.removedNodes].some(nodeTouchesTurnNavigator))
}

async function runtimeSupportsOfficialTurnNavigator(fetchImpl: typeof fetch): Promise<boolean> {
  try {
    const response = await fetchImpl(CAPABILITIES_ENDPOINT, { cache: 'no-store' })
    if (!response.ok) return false
    const payload = await response.json() as unknown
    if (payload === null || typeof payload !== 'object') return false
    const capabilities = (payload as Record<string, unknown>).capabilities
    return capabilities !== null && typeof capabilities === 'object'
      && (capabilities as Record<string, unknown>).officialTurnNavigator === true
  } catch {
    return false
  }
}

/** 官方导航可能在会话切换后异步挂载；仅对相关变更按帧检测，并在停用时清理标记。 */
export function observeOfficialTurnNavigators(doc: Document = document, fetchImpl: typeof fetch = fetch): () => void {
  if (doc.body === null || doc.documentElement === null) return () => {}
  let active = true
  let frame: number | undefined
  const run = (): void => {
    frame = undefined
    markOfficialTurnNavigators(doc)
  }
  const schedule = (): void => {
    if (frame !== undefined) return
    frame = window.requestAnimationFrame(run)
  }
  const observer = new MutationObserver(records => {
    if (turnNavigatorMutationRelevant(records)) schedule()
  })
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] })
  schedule()
  void runtimeSupportsOfficialTurnNavigator(fetchImpl).then(supported => {
    if (!active) return
    if (supported) doc.documentElement.setAttribute(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE, 'true')
    else doc.documentElement.removeAttribute(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE)
  })
  return () => {
    active = false
    observer.disconnect()
    if (frame !== undefined) window.cancelAnimationFrame(frame)
    doc.documentElement.removeAttribute(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE)
    for (const element of doc.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}],[${OFFICIAL_TURN_MARK_ATTRIBUTE}],[${OFFICIAL_TURN_TOOLTIP_ATTRIBUTE}]`)) {
      element.removeAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE)
      element.removeAttribute(OFFICIAL_TURN_MARK_ATTRIBUTE)
      element.removeAttribute(OFFICIAL_TURN_TOOLTIP_ATTRIBUTE)
    }
  }
}
