/** OpenAI Codex desktop sidebar geometry, measured from the installed client bundle. */
export const CODEX_SIDEBAR_MIN_PX = 240

/** Backward-compatible name for the width used while a collapsed rail expands. */
export const SLIM_SIDEBAR_PX = CODEX_SIDEBAR_MIN_PX

export type SidebarGridTracks = {
  sidebar: number
  middle: string
  details: number
}

const visibleSidebarWidths = new WeakMap<HTMLElement, number>()

/** 解析宿主 AppFrame 的 grid-template-columns。 */
export function parseSidebarGrid(value: string): SidebarGridTracks | undefined {
  const match = /^(\d+(?:\.\d+)?)px\s+(minmax\(0(?:px)?,\s*1fr\))\s+(\d+(?:\.\d+)?)px$/.exec(value.trim())
  if (match === null) return undefined
  return { sidebar: Number(match[1]), middle: match[2], details: Number(match[3]) }
}

export function findSidebarFrame(root: ParentNode): HTMLElement | undefined {
  const marked = root.querySelector<HTMLElement>('[data-sidebar-collapsed]')
  if (marked !== null) return marked
  for (const node of root.querySelectorAll<HTMLElement>('div')) {
    if (parseSidebarGrid(node.style.gridTemplateColumns) !== undefined) return node
  }
  return undefined
}

/** 同步侧栏网格和拖拽柄，保证两者始终使用同一个可见宽度。 */
export function applySidebarWidth(frame: HTMLElement, width: number): boolean {
  const tracks = parseSidebarGrid(frame.style.gridTemplateColumns)
  if (tracks === undefined || frame.hasAttribute('data-sidebar-collapsed')) return false
  visibleSidebarWidths.set(frame, width)
  const next = `${width}px ${tracks.middle} ${tracks.details}px`
  const changed = frame.style.gridTemplateColumns !== next
  if (changed) frame.style.gridTemplateColumns = next
  const handle = frame.querySelector<HTMLElement>('[data-side="sidebar"]')
  if (handle !== null) handle.style.left = `${width}px`
  return changed
}

export function applySlimSidebar(frame: HTMLElement): boolean {
  if (frame.hasAttribute('data-dragging')) return false
  if (parseSidebarGrid(frame.style.gridTemplateColumns) === undefined || frame.hasAttribute('data-sidebar-collapsed')) return false
  const initialized = frame.hasAttribute('data-dcu-codex-sidebar-initialized')
  const width = initialized ? visibleSidebarWidths.get(frame) ?? CODEX_SIDEBAR_MIN_PX : CODEX_SIDEBAR_MIN_PX
  const changed = applySidebarWidth(frame, width)
  frame.setAttribute('data-dcu-codex-sidebar-initialized', '')
  return changed
}

/** 仅在首帧覆盖宿主默认宽度时关闭过渡，避免刷新出现收缩动画。 */
function pauseInitialSidebarTransition(frame: HTMLElement): () => void {
  const handle = frame.querySelector<HTMLElement>('[data-side="sidebar"]')
  const frameTransition = frame.style.transition
  const handleTransition = handle?.style.transition
  frame.style.transition = 'none'
  if (handle !== null) handle.style.transition = 'none'
  return () => {
    frame.style.transition = frameTransition
    if (handle !== null && handleTransition !== undefined) handle.style.transition = handleTransition
  }
}

export function observeSlimSidebar(): () => void {
  if (typeof document === 'undefined' || document.body === null) return () => {}
  let applying = false
  let frame: HTMLElement | undefined
  let pending: number | undefined
  let frameObserver: MutationObserver | undefined
  const watchFrame = (next: HTMLElement | undefined): void => {
    if (frame === next) return
    frameObserver?.disconnect()
    frame = next
    if (frame === undefined) return
    frameObserver = new MutationObserver(schedule)
    frameObserver.observe(frame, { attributes: true, attributeFilter: ['style', 'data-sidebar-collapsed', 'data-dragging', 'data-dcu-codex-sidebar-initialized'] })
  }
  const apply = (): void => {
    if (applying) return
    applying = true
    try {
      if (frame === undefined || !frame.isConnected) watchFrame(findSidebarFrame(document))
      if (frame !== undefined) {
        const restoreTransition = frame.hasAttribute('data-dcu-codex-sidebar-initialized')
          ? undefined
          : pauseInitialSidebarTransition(frame)
        const changed = applySlimSidebar(frame)
        if (restoreTransition !== undefined) {
          if (!changed) restoreTransition()
          else window.requestAnimationFrame(() => window.requestAnimationFrame(restoreTransition))
        }
      }
    } finally {
      applying = false
    }
  }
  const schedule = (): void => {
    if (pending !== undefined) return
    pending = window.requestAnimationFrame(() => { pending = undefined; apply() })
  }
  apply()
  const observer = new MutationObserver(() => {
    if (frame === undefined || !frame.isConnected) schedule()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  return () => {
    observer.disconnect()
    frameObserver?.disconnect()
    if (pending !== undefined) window.cancelAnimationFrame(pending)
  }
}
