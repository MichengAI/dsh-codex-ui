import { CODEX_SIDEBAR_MIN_PX } from './sidebar-width.ts'

/** Codex collapses the sidebar when a resize drag would make it narrower than 240px. */
export function shouldCollapseOnSidebarDrag(startWidth: number, startX: number, endX: number): boolean {
  return startWidth + endX - startX < CODEX_SIDEBAR_MIN_PX
}

export function isSidebarDragHandle(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object' || !('closest' in target)) return false
  const el = target as { closest: (selector: string) => { className?: string } | null }
  const handle = el.closest('[data-side="sidebar"]')
  return handle !== null && String(handle.className).includes('handle')
}
