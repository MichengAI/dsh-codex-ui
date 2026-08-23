/** Codex 展开侧栏目标宽度。宿主默认 280、最小 264，这里压到更接近 Codex。 */
export const SLIM_SIDEBAR_PX = 240
export const HOST_DEFAULT_SIDEBAR_PX = 280

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

/** 折叠列保持原值；默认展开列收到 Codex 宽度，用户再拉宽时只减去默认多出来的部分。 */
export function slimedSidebarWidth(hostWidth: number, collapsed: boolean): number {
  if (collapsed || hostWidth <= 80) return hostWidth
  if (hostWidth <= HOST_DEFAULT_SIDEBAR_PX) return SLIM_SIDEBAR_PX
  return hostWidth - (HOST_DEFAULT_SIDEBAR_PX - SLIM_SIDEBAR_PX)
}

export function slimedGridTemplate(tracks: SidebarGridTracks, collapsed: boolean): string {
  const sidebar = slimedSidebarWidth(tracks.sidebar, collapsed)
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
  if (frame.hasAttribute('data-dragging')) return false
  const tracks = parseSidebarGrid(frame.style.gridTemplateColumns)
  if (tracks === undefined) return false
  const collapsed = frame.hasAttribute('data-sidebar-collapsed')
  const next = slimedGridTemplate(tracks, collapsed)
  if (frame.style.gridTemplateColumns === next) return false
  frame.style.gridTemplateColumns = next
  const handle = frame.querySelector<HTMLElement>('[data-side="sidebar"]')
  if (handle !== null && !collapsed) handle.style.left = `${slimedSidebarWidth(tracks.sidebar, collapsed)}px`
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
