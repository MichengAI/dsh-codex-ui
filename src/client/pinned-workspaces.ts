/** 浏览器本地持久化键；用于工作区偏好的首帧恢复与 Host 故障兜底。 */
import { parseWorkspaceGroups, pruneWorkspaceGroups, type WorkspaceGroup } from '../workspace-groups.ts'

export const PINNED_WORKSPACES_STORAGE_KEY = 'dsh-codex-ui.pinned-workspace-ids'
export const WORKSPACE_GROUPS_STORAGE_KEY = 'dsh-codex-ui.workspace-groups.v1'
export const WORKSPACE_PREFERENCES_ENDPOINT = '/api/michengai/codex-ui/preferences'

export type HostPinnedWorkspacePreferences = {
  exists: boolean
  pinnedWorkspaceIds: string[]
}

export type HostWorkspacePreferences = HostPinnedWorkspacePreferences & {
  workspaceGroups: WorkspaceGroup[]
  workspaceGroupsSupported?: boolean
}

export type WorkspaceGroupsCache = {
  workspaceGroups: WorkspaceGroup[]
  pendingHostSync: boolean
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

export { pruneWorkspaceGroups }

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

/** Host 数据优先；旧 Host 或待同步分组使用本地缓存，读取期间的用户操作始终优先。 */
export function resolveWorkspacePreferencesHydration(
  local: Pick<HostWorkspacePreferences, 'pinnedWorkspaceIds' | 'workspaceGroups'>,
  host: HostWorkspacePreferences,
  dirty?: Pick<HostWorkspacePreferences, 'pinnedWorkspaceIds' | 'workspaceGroups'>,
  localWorkspaceGroupsPendingHostSync = false,
): { pinnedWorkspaceIds: string[]; workspaceGroups: WorkspaceGroup[]; writeHost: boolean } {
  if (dirty !== undefined) return { pinnedWorkspaceIds: normalizePinnedWorkspaceIds(dirty.pinnedWorkspaceIds), workspaceGroups: dirty.workspaceGroups, writeHost: true }
  if (host.exists) {
    const preserveLocalGroups = host.workspaceGroupsSupported === false || localWorkspaceGroupsPendingHostSync
    return {
      pinnedWorkspaceIds: normalizePinnedWorkspaceIds(host.pinnedWorkspaceIds),
      workspaceGroups: preserveLocalGroups ? local.workspaceGroups : host.workspaceGroups,
      writeHost: localWorkspaceGroupsPendingHostSync && host.workspaceGroupsSupported !== false,
    }
  }
  const pinnedWorkspaceIds = normalizePinnedWorkspaceIds(local.pinnedWorkspaceIds)
  return { pinnedWorkspaceIds, workspaceGroups: local.workspaceGroups, writeHost: pinnedWorkspaceIds.length > 0 || local.workspaceGroups.length > 0 }
}

export async function readHostWorkspacePreferences(fetcher: Fetcher = fetch): Promise<HostWorkspacePreferences> {
  const response = await fetcher(WORKSPACE_PREFERENCES_ENDPOINT, {
    method: 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`读取置顶偏好失败：HTTP ${response.status}`)
  const payload: unknown = await response.json()
  if (payload === null || typeof payload !== 'object') throw new Error('置顶偏好响应格式无效。')
  const record = payload as Record<string, unknown>
  const workspaceGroupsSupported = Object.prototype.hasOwnProperty.call(record, 'workspaceGroups')
  const workspaceGroups = workspaceGroupsSupported ? parseWorkspaceGroups(record.workspaceGroups) : []
  if (typeof record.exists !== 'boolean' || !Array.isArray(record.pinnedWorkspaceIds) || !record.pinnedWorkspaceIds.every(id => typeof id === 'string') || workspaceGroups === undefined) {
    throw new Error('置顶偏好响应格式无效。')
  }
  return { exists: record.exists, pinnedWorkspaceIds: normalizePinnedWorkspaceIds(record.pinnedWorkspaceIds as string[]), workspaceGroups, workspaceGroupsSupported }
}

export async function writeHostWorkspacePreferences(pinnedWorkspaceIds: readonly string[], workspaceGroups: readonly WorkspaceGroup[], fetcher: Fetcher = fetch): Promise<void> {
  const groups = parseWorkspaceGroups([...workspaceGroups])
  if (groups === undefined) throw new Error('工作区分组数据无效。')
  const response = await fetcher(WORKSPACE_PREFERENCES_ENDPOINT, {
    method: 'PUT',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pinnedWorkspaceIds: normalizePinnedWorkspaceIds(pinnedWorkspaceIds), workspaceGroups: groups }),
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`保存置顶偏好失败：HTTP ${response.status}`)
}

/** 兼容旧调用方；新代码应同时写入分组。 */
export async function readHostPinnedWorkspaceIds(fetcher: Fetcher = fetch): Promise<HostWorkspacePreferences> {
  return readHostWorkspacePreferences(fetcher)
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

/** 分组缓存用于首帧恢复和 Host 暂时不可用时兜底，并记录尚未完成的 Host 迁移。 */
export function readWorkspaceGroupsCache(storage: Storage | undefined): WorkspaceGroupsCache {
  if (storage === undefined) return { workspaceGroups: [], pendingHostSync: false }
  try {
    const value: unknown = JSON.parse(storage.getItem(WORKSPACE_GROUPS_STORAGE_KEY) ?? '{"version":1,"workspaceGroups":[],"pendingHostSync":false}')
    if (value === null || typeof value !== 'object') return { workspaceGroups: [], pendingHostSync: false }
    const record = value as Record<string, unknown>
    const workspaceGroups = record.version === 1 ? parseWorkspaceGroups(record.workspaceGroups) : undefined
    if (workspaceGroups === undefined || typeof record.pendingHostSync !== 'boolean') return { workspaceGroups: [], pendingHostSync: false }
    return { workspaceGroups, pendingHostSync: record.pendingHostSync }
  } catch {
    return { workspaceGroups: [], pendingHostSync: false }
  }
}

export function saveWorkspaceGroupsCache(storage: Storage | undefined, groups: readonly WorkspaceGroup[], pendingHostSync: boolean): void {
  if (storage === undefined) return
  const workspaceGroups = parseWorkspaceGroups([...groups])
  if (workspaceGroups === undefined) return
  try {
    storage.setItem(WORKSPACE_GROUPS_STORAGE_KEY, JSON.stringify({ version: 1, workspaceGroups, pendingHostSync }))
  } catch {
    // 隐私模式或配额不足时退化为本次页面内状态。
  }
}
