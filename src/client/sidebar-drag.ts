import { CODEX_SIDEBAR_MIN_PX } from './sidebar-width.ts'

const SIDEBAR_MAX_PX = 420

/** 左移超过开始宽度的一半时收起侧栏，避免轻微拖动误触。 */
export function shouldCollapseOnSidebarDrag(startWidth: number, startX: number, endX: number): boolean {
  return startX - endX > startWidth / 2
}

/** 直接按可见宽度计算拖拽结果，绕开宿主与 Codex 不一致的最小宽度。 */
export function sidebarWidthDuringDrag(startWidth: number, startX: number, currentX: number): number {
  return Math.min(SIDEBAR_MAX_PX, Math.max(CODEX_SIDEBAR_MIN_PX, startWidth + currentX - startX))
}

export function isSidebarDragHandle(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object' || !('closest' in target)) return false
  const el = target as { closest: (selector: string) => { className?: string } | null }
  const handle = el.closest('[data-side="sidebar"]')
  return handle !== null && String(handle.className).includes('handle')
}
