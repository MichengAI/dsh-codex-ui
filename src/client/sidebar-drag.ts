/** 左移超过开始宽度的一半时收起侧栏，避免轻微拖动误触。 */
export function shouldCollapseOnSidebarDrag(startWidth: number, startX: number, endX: number): boolean {
  return startX - endX > startWidth / 2
}

export function isSidebarDragHandle(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object' || !('closest' in target)) return false
  const el = target as { closest: (selector: string) => { className?: string } | null }
  const handle = el.closest('[data-side="sidebar"]')
  return handle !== null && String(handle.className).includes('handle')
}
