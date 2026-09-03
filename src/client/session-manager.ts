export const SESSION_UNREAD_STORAGE_KEY = 'dsh.session-unread.v1'

export function normalizeSessionIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(id => id.trim() !== ''))]
}

export function toggleSessionId(ids: readonly string[], sessionId: string): string[] {
  return ids.includes(sessionId)
    ? ids.filter(id => id !== sessionId)
    : [sessionId, ...ids.filter(id => id !== sessionId)]
}

/** 返回本次刷新中结束、且不在当前会话中的后台会话。 */
export function completedBackgroundSessionIds(previous: Readonly<Record<string, boolean>>, current: Readonly<Record<string, boolean>>, currentSessionId?: string): string[] {
  return Object.entries(current).flatMap(([id, running]) => previous[id] === true && running !== true && id !== currentSessionId ? [id] : [])
}

export function readSessionIds(storage: Storage | undefined, key: string): string[] {
  if (storage === undefined) return []
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? '{"version":1,"ids":[]}')
    if (value === null || typeof value !== 'object') return []
    const ids = (value as { ids?: unknown }).ids
    return Array.isArray(ids) && ids.every(id => typeof id === 'string') ? normalizeSessionIds(ids) : []
  } catch {
    return []
  }
}

export function writeSessionIds(storage: Storage | undefined, key: string, ids: readonly string[]): void {
  if (storage === undefined) return
  try {
    storage.setItem(key, JSON.stringify({ version: 1, ids: normalizeSessionIds(ids) }))
  } catch {
    // 隐私模式或存储配额不足时保留当前页面内状态。
  }
}

export function sessionDeepLink(base: string, sessionId: string): string {
  const url = new URL(base)
  url.searchParams.set('session', sessionId)
  return url.toString()
}
