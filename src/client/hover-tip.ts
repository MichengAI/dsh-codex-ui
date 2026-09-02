/** 把悬停卡片限制在视口内，避免贴边裁切。 */
export function clampHoverCardPosition(left: number, top: number, width: number, height: number, viewportWidth: number, viewportHeight: number): { left: number; top: number } {
  const pad = 8
  const nextLeft = Math.min(Math.max(left, pad), Math.max(pad, viewportWidth - width - pad))
  const nextTop = Math.min(Math.max(top, pad), Math.max(pad, viewportHeight - height - pad))
  return { left: nextLeft, top: nextTop }
}

/** 从行元素算出卡片出现在右侧的初始坐标。 */
export function hoverCardAnchor(rect: { right: number; top: number }): { left: number; top: number } {
  return { left: rect.right + 8, top: rect.top }
}

/** Codex 会话卡片右上角的紧凑相对时间。 */
export function formatHoverTime(updatedAt: number, t: (key: 'time.justNow' | 'time.minutes' | 'time.hours' | 'time.days', params?: { count: number }) => string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - updatedAt) / 1000))
  if (seconds < 60) return t('time.justNow')
  if (seconds < 3600) return t('time.minutes', { count: Math.floor(seconds / 60) })
  if (seconds < 86400) return t('time.hours', { count: Math.floor(seconds / 3600) })
  return t('time.days', { count: Math.floor(seconds / 86400) })
}
