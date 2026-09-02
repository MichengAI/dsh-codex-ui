export const MAX_WORKSPACE_GROUPS = 100
export const MAX_WORKSPACE_GROUP_TITLE_LENGTH = 80
export const MAX_GROUPED_WORKSPACE_IDS = 1_000
export const MAX_WORKSPACE_GROUP_ID_LENGTH = 128
export const MAX_WORKSPACE_ID_LENGTH = 256

export type WorkspaceGroup = {
  id: string
  title: string
  workspaceIds: string[]
}

/** 对持久化分组做严格校验，避免一个项目同时出现在多个分组。 */
export function parseWorkspaceGroups(value: unknown): WorkspaceGroup[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_WORKSPACE_GROUPS) return undefined
  const groupIds = new Set<string>()
  const groupTitles = new Set<string>()
  const workspaceIds = new Set<string>()
  const groups: WorkspaceGroup[] = []
  for (const valueGroup of value) {
    if (valueGroup === null || typeof valueGroup !== 'object') return undefined
    const group = valueGroup as Record<string, unknown>
    const id = typeof group.id === 'string' ? group.id.trim() : ''
    const title = typeof group.title === 'string' ? group.title.trim() : ''
    if (id === '' || id.length > MAX_WORKSPACE_GROUP_ID_LENGTH || title === '' || title.length > MAX_WORKSPACE_GROUP_TITLE_LENGTH) return undefined
    if (groupIds.has(id) || groupTitles.has(title.toLocaleLowerCase())) return undefined
    if (!Array.isArray(group.workspaceIds) || group.workspaceIds.length > MAX_GROUPED_WORKSPACE_IDS) return undefined
    const normalizedIds = [...new Set(group.workspaceIds)]
    if (!normalizedIds.every(workspaceId => typeof workspaceId === 'string' && workspaceId.trim() !== '' && workspaceId.length <= MAX_WORKSPACE_ID_LENGTH)) return undefined
    if (normalizedIds.some(workspaceId => workspaceIds.has(workspaceId))) return undefined
    groupIds.add(id)
    groupTitles.add(title.toLocaleLowerCase())
    normalizedIds.forEach(workspaceId => workspaceIds.add(workspaceId))
    groups.push({ id, title, workspaceIds: normalizedIds })
  }
  return groups
}

/** 新建空分组；项目只有被显式移动后才会进入其中。 */
export function createWorkspaceGroup(groups: readonly WorkspaceGroup[], group: Pick<WorkspaceGroup, 'id' | 'title'>): WorkspaceGroup[] {
  const next = parseWorkspaceGroups([...groups, { ...group, workspaceIds: [] }])
  if (next === undefined) throw new Error('分组信息无效。')
  return next
}

/** 将项目放入指定分组；未传分组时退回未分组区。 */
export function assignWorkspaceToGroup(groups: readonly WorkspaceGroup[], workspaceId: string, groupId?: string): WorkspaceGroup[] {
  if (workspaceId.trim() === '' || workspaceId.length > MAX_WORKSPACE_ID_LENGTH) throw new Error('项目标识无效。')
  if (groupId !== undefined && !groups.some(group => group.id === groupId)) throw new Error('目标分组不存在。')
  return groups.map(group => ({
    ...group,
    workspaceIds: group.id === groupId
      ? [...group.workspaceIds.filter(id => id !== workspaceId), workspaceId]
      : group.workspaceIds.filter(id => id !== workspaceId),
  }))
}

/** 将项目插入目标分组的指定位置，同时从原分组移除。 */
export function placeWorkspaceInGroup(groups: readonly WorkspaceGroup[], workspaceId: string, groupId: string, beforeId?: string): WorkspaceGroup[] {
  if (workspaceId.trim() === '' || workspaceId.length > MAX_WORKSPACE_ID_LENGTH) throw new Error('项目标识无效。')
  const target = groups.find(group => group.id === groupId)
  if (target === undefined) throw new Error('目标分组不存在。')
  const targetIds = target.workspaceIds.filter(id => id !== workspaceId)
  const index = beforeId === undefined ? targetIds.length : targetIds.indexOf(beforeId)
  if (index < 0) throw new Error('排序锚点不存在。')
  targetIds.splice(index, 0, workspaceId)
  return groups.map(group => ({
    ...group,
    workspaceIds: group.id === groupId ? targetIds : group.workspaceIds.filter(id => id !== workspaceId),
  }))
}

/** 在同一分组内移动项目；省略锚点时放到分组末尾。 */
export function moveWorkspaceGroupMember(groups: readonly WorkspaceGroup[], workspaceId: string, groupId: string, beforeId?: string): WorkspaceGroup[] {
  const target = groups.find(group => group.id === groupId)
  if (target === undefined) throw new Error('目标分组不存在。')
  if (!target.workspaceIds.includes(workspaceId)) return groups.map(group => ({ ...group, workspaceIds: [...group.workspaceIds] }))
  const remaining = target.workspaceIds.filter(id => id !== workspaceId)
  const index = beforeId === undefined ? remaining.length : remaining.indexOf(beforeId)
  if (index < 0) throw new Error('排序锚点不存在。')
  const workspaceIds = [...remaining]
  workspaceIds.splice(index, 0, workspaceId)
  return groups.map(group => group.id === groupId ? { ...group, workspaceIds } : { ...group, workspaceIds: [...group.workspaceIds] })
}

/** 调整自定义分组顺序；省略锚点时移动到所有自定义分组末尾。 */
export function moveWorkspaceGroup(groups: readonly WorkspaceGroup[], groupId: string, beforeGroupId?: string): WorkspaceGroup[] {
  const moved = groups.find(group => group.id === groupId)
  if (moved === undefined) throw new Error('分组不存在。')
  if (beforeGroupId === groupId) return groups.map(group => ({ ...group, workspaceIds: [...group.workspaceIds] }))
  const remaining = groups.filter(group => group.id !== groupId)
  const index = beforeGroupId === undefined ? remaining.length : remaining.findIndex(group => group.id === beforeGroupId)
  if (index < 0) throw new Error('排序锚点不存在。')
  remaining.splice(index, 0, moved)
  return remaining.map(group => ({ ...group, workspaceIds: [...group.workspaceIds] }))
}

/** 删除分组时仅解除归属，不影响工作区本身。 */
export function deleteWorkspaceGroup(groups: readonly WorkspaceGroup[], groupId: string): WorkspaceGroup[] {
  return groups.filter(group => group.id !== groupId).map(group => ({ ...group, workspaceIds: [...group.workspaceIds] }))
}

/** 工作区清单变化后清理失效归属，但保留空分组供用户继续使用。 */
export function pruneWorkspaceGroups(groups: readonly WorkspaceGroup[], validIds: readonly string[]): WorkspaceGroup[] {
  const valid = new Set(validIds)
  return groups.map(group => ({ ...group, workspaceIds: group.workspaceIds.filter(id => valid.has(id)) }))
}

export function groupedWorkspaceIds(groups: readonly WorkspaceGroup[]): string[] {
  return groups.flatMap(group => group.workspaceIds)
}
