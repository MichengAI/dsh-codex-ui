/** 浏览器本地持久化键；置顶只影响本插件中的工作区分区。 */
export const PINNED_WORKSPACES_STORAGE_KEY = 'dsh-codex-ui.pinned-workspace-ids'

/** 清理无效或重复的工作区标识。 */
export function normalizePinnedWorkspaceIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(id => id.trim() !== ''))]
}

/** 在置顶列表中切换一个工作区。 */

/** 把工作区插入置顶列表的指定位置；省略锚点时追加到末尾。 */
export function insertPinnedWorkspace(ids: readonly string[], id: string, beforeId?: string): string[] {
  const next = ids.filter(item => item !== id)
  if (beforeId === undefined) return [...next, id]
  if (beforeId === id) return ids.includes(id) ? [...ids] : [...next, id]
  const index = next.indexOf(beforeId)
  next.splice(index < 0 ? next.length : index, 0, id)
  return next
}

export function togglePinnedWorkspace(ids: readonly string[], workspaceId: string): string[] {
  return ids.includes(workspaceId)
    ? ids.filter(id => id !== workspaceId)
    : [...ids, workspaceId]
}

/** 从浏览器本地存储读取置顶工作区；损坏数据按空列表处理。 */
export function readPinnedWorkspaceIds(storage: Storage | undefined): string[] {
  if (storage === undefined) return []
  try {
    const value: unknown = JSON.parse(storage.getItem(PINNED_WORKSPACES_STORAGE_KEY) ?? '[]')
    return Array.isArray(value) && value.every(id => typeof id === 'string')
      ? normalizePinnedWorkspaceIds(value)
      : []
  } catch {
    return []
  }
}

/** 保存置顶工作区；存储不可用时不影响导航。 */
export function savePinnedWorkspaceIds(storage: Storage | undefined, ids: readonly string[]): void {
  if (storage === undefined) return
  try {
    storage.setItem(PINNED_WORKSPACES_STORAGE_KEY, JSON.stringify(normalizePinnedWorkspaceIds(ids)))
  } catch {
    // 隐私模式或配额不足时退化为本次页面内状态。
  }
}
