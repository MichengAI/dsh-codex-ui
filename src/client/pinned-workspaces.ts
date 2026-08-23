/** 浏览器本地持久化键；置顶只影响本插件中的工作区分区。 */
export const PINNED_WORKSPACES_STORAGE_KEY = 'dsh-codex-ui.pinned-workspace-ids'
export const WORKSPACE_PREFERENCES_ENDPOINT = '/api/michengai/codex-ui/preferences'

export type HostPinnedWorkspacePreferences = {
  exists: boolean
  pinnedWorkspaceIds: string[]
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** 清理无效或重复的工作区标识。 */
export function normalizePinnedWorkspaceIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(id => id.trim() !== ''))]
}

/** 仅在宿主完整基线就绪后清理已经不存在的工作区，避免加载中的临时列表抹掉持久化置顶。 */
export function prunePinnedWorkspaceIds(ids: readonly string[], validIds: readonly string[]): string[] {
  const valid = new Set(validIds)
  const next = ids.filter(id => valid.has(id))
  return next.length === ids.length ? [...ids] : next
}

/** Host 数据优先；首次升级没有 Host 文件时迁移旧 origin 的 localStorage；读取期间的用户操作永远优先。 */
export function resolvePinnedWorkspaceHydration(
  localIds: readonly string[],
  host: HostPinnedWorkspacePreferences,
  dirtyIds?: readonly string[],
): { ids: string[]; writeHost: boolean } {
  if (dirtyIds !== undefined) return { ids: normalizePinnedWorkspaceIds(dirtyIds), writeHost: true }
  if (host.exists) return { ids: normalizePinnedWorkspaceIds(host.pinnedWorkspaceIds), writeHost: false }
  const ids = normalizePinnedWorkspaceIds(localIds)
  return { ids, writeHost: ids.length > 0 }
}

export async function readHostPinnedWorkspaceIds(fetcher: Fetcher = fetch): Promise<HostPinnedWorkspacePreferences> {
  const response = await fetcher(WORKSPACE_PREFERENCES_ENDPOINT, {
    method: 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`读取置顶偏好失败：HTTP ${response.status}`)
  const payload: unknown = await response.json()
  if (payload === null || typeof payload !== 'object') throw new Error('置顶偏好响应格式无效。')
  const record = payload as Record<string, unknown>
  if (typeof record.exists !== 'boolean' || !Array.isArray(record.pinnedWorkspaceIds) || !record.pinnedWorkspaceIds.every(id => typeof id === 'string')) {
    throw new Error('置顶偏好响应格式无效。')
  }
  return { exists: record.exists, pinnedWorkspaceIds: normalizePinnedWorkspaceIds(record.pinnedWorkspaceIds as string[]) }
}

export async function writeHostPinnedWorkspaceIds(ids: readonly string[], fetcher: Fetcher = fetch): Promise<void> {
  const response = await fetcher(WORKSPACE_PREFERENCES_ENDPOINT, {
    method: 'PUT',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pinnedWorkspaceIds: normalizePinnedWorkspaceIds(ids) }),
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`保存置顶偏好失败：HTTP ${response.status}`)
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
