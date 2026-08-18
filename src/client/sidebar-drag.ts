/** 必须明显拖过宿主最小宽度，才自动收缩；拖到 264 最小值不应触发。 */
export const SIDEBAR_COLLAPSE_EDGE = 180
export const SIDEBAR_COLLAPSE_PULL = 100

/** 侧栏拖动手柄持续向左拉过阈值后，松手才收缩。 */
export function shouldCollapseOnSidebarDrag(startX: number, endX: number): boolean {
  return startX - endX >= SIDEBAR_COLLAPSE_PULL && endX <= SIDEBAR_COLLAPSE_EDGE
}

export function isSidebarDragHandle(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object' || !('closest' in target)) return false
  const el = target as { closest: (selector: string) => { className?: string } | null }
  const handle = el.closest('[data-side="sidebar"]')
  return handle !== null && String(handle.className).includes('handle')
}
