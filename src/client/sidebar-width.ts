/** OpenAI Codex desktop sidebar geometry, measured from the installed client bundle. */
export const CODEX_SIDEBAR_MIN_PX = 240
export const CODEX_SIDEBAR_DEFAULT_PX = 275
export const CODEX_SIDEBAR_MAX_PX = 520

/** DSH 0.1.1-rc.2 clamps its layout-owned sidebar store to this narrower range. */
export const HOST_SIDEBAR_MIN_PX = 264
export const HOST_SIDEBAR_DEFAULT_PX = 280
export const HOST_SIDEBAR_MAX_PX = 420

/** Backward-compatible name for the width used while a collapsed rail expands. */
export const SLIM_SIDEBAR_PX = CODEX_SIDEBAR_DEFAULT_PX

export type SidebarGridTracks = {
  sidebar: number
  middle: string
  details: number
}

/** 解析宿主 AppFrame 的 grid-template-columns。 */
export function parseSidebarGrid(value: string): SidebarGridTracks | undefined {
  const match = /^(\d+(?:\.\d+)?)px\s+(minmax\(0,\s*1fr\))\s+(\d+(?:\.\d+)?)px$/.exec(value.trim())
  if (match === null) return undefined
  return { sidebar: Number(match[1]), middle: match[2], details: Number(match[3]) }
}

/**
 * Translate the DSH host's 264–420px drag range to Codex's measured
 * 240–520px range, preserving the 280px-host / 275px-Codex default anchor.
 */
export function slimedSidebarWidth(hostWidth: number, collapsed: boolean, viewportWidth = Number.POSITIVE_INFINITY): number {
  if (collapsed || hostWidth <= 80) return hostWidth
  const maximum = Math.max(CODEX_SIDEBAR_MIN_PX, Math.min(CODEX_SIDEBAR_MAX_PX, viewportWidth - CODEX_SIDEBAR_MIN_PX))
  const source = Math.max(HOST_SIDEBAR_MIN_PX, Math.min(HOST_SIDEBAR_MAX_PX, hostWidth))
  if (source <= HOST_SIDEBAR_DEFAULT_PX) {
    return CODEX_SIDEBAR_MIN_PX + (source - HOST_SIDEBAR_MIN_PX)
      * (CODEX_SIDEBAR_DEFAULT_PX - CODEX_SIDEBAR_MIN_PX) / (HOST_SIDEBAR_DEFAULT_PX - HOST_SIDEBAR_MIN_PX)
  }
  return CODEX_SIDEBAR_DEFAULT_PX + (source - HOST_SIDEBAR_DEFAULT_PX)
    * (maximum - CODEX_SIDEBAR_DEFAULT_PX) / (HOST_SIDEBAR_MAX_PX - HOST_SIDEBAR_DEFAULT_PX)
}

export function slimedGridTemplate(tracks: SidebarGridTracks, collapsed: boolean, viewportWidth = Number.POSITIVE_INFINITY): string {
  const sidebar = slimedSidebarWidth(tracks.sidebar, collapsed, viewportWidth)
  return `${sidebar}px ${tracks.middle} ${tracks.details}px`
}

export function findSidebarFrame(root: ParentNode): HTMLElement | undefined {
  const marked = root.querySelector<HTMLElement>('[data-sidebar-collapsed]')
  if (marked !== null) return marked
  for (const node of root.querySelectorAll<HTMLElement>('div')) {
    if (parseSidebarGrid(node.style.gridTemplateColumns) !== undefined) return node
  }
  return undefined
}

export function applySlimSidebar(frame: HTMLElement): boolean {
  if (frame.hasAttribute('data-dragging')) {
    frame.removeAttribute('data-dcu-codex-sidebar-grid')
    return false
  }
  const tracks = parseSidebarGrid(frame.style.gridTemplateColumns)
  if (tracks === undefined) return false
  const collapsed = frame.hasAttribute('data-sidebar-collapsed')
  const next = slimedGridTemplate(tracks, collapsed, frame.getBoundingClientRect().width)
  if (frame.getAttribute('data-dcu-codex-sidebar-grid') === frame.style.gridTemplateColumns) return false
  if (frame.style.gridTemplateColumns === next) return false
  frame.style.gridTemplateColumns = next
  frame.setAttribute('data-dcu-codex-sidebar-grid', next)
  const handle = frame.querySelector<HTMLElement>('[data-side="sidebar"]')
  if (handle !== null && !collapsed) handle.style.left = `${slimedSidebarWidth(tracks.sidebar, collapsed, frame.getBoundingClientRect().width)}px`
  return true
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
    frameObserver.observe(frame, { attributes: true, attributeFilter: ['style', 'data-sidebar-collapsed', 'data-dragging'] })
  }
  const apply = (): void => {
    if (applying) return
    applying = true
    try {
      if (frame === undefined || !frame.isConnected) watchFrame(findSidebarFrame(document))
      if (frame !== undefined) applySlimSidebar(frame)
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
