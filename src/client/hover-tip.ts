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

export type HoverTimeKey = 'time.justNow' | 'time.minutes' | 'time.hours' | 'time.days' | 'time.weeks' | 'time.months' | 'time.years'

const HOUR = 3600
const DAY = HOUR * 24
const WEEK = DAY * 7
const MONTH = DAY * 30
const YEAR = DAY * 365

/** Codex 会话卡片右上角的紧凑相对时间。分档与 ChatGPT `$wa` 一致。 */
export function formatHoverTime(updatedAt: number, t: (key: HoverTimeKey, params?: { count: number }) => string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000))
  if (seconds < 60) return t('time.justNow')
  if (seconds < HOUR) return t('time.minutes', { count: Math.floor(seconds / 60) })
  if (seconds < DAY) return t('time.hours', { count: Math.floor(seconds / HOUR) })
  if (seconds < WEEK) return t('time.days', { count: Math.floor(seconds / DAY) })
  if (seconds < MONTH) return t('time.weeks', { count: Math.floor(seconds / WEEK) })
  if (seconds < YEAR) return t('time.months', { count: Math.floor(seconds / MONTH) })
  return t('time.years', { count: Math.floor(seconds / YEAR) })
}
