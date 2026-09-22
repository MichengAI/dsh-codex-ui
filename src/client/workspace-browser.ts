import { isChannelSession } from './channel-api.ts'
import { isScheduleSession } from './schedule-sessions.ts'

type SessionSummary = {
  id: string
  origin?: string | undefined
  blank?: boolean | undefined
  title?: string | undefined
  displayTitle?: string | undefined
}

/** 任务树只保留普通会话，频道和定时会话各走自己的页签。 */
export function isTaskSession(session: SessionSummary): boolean {
  if (session.origin === 'subagent' || session.origin === 'im' || session.blank === true) return false
  if (isChannelSession(session.id)) return false
  return !isScheduleSession(session.id, session.displayTitle ?? session.title ?? '')
}

/** 安装包里项目会话列表的 maxItems，常量 rNc。 */
export const PROJECT_SESSION_PREVIEW_LIMIT = 5
/** 安装包里展开后每次追加的条数：maxItems + 10 * page。 */
export const PROJECT_SESSION_PAGE_SIZE = 10

export type ProjectSessionWindowState = {
  expanded: boolean
  page: number
}

export type ProjectSessionWindow = {
  ids: readonly string[]
  showMore: boolean
}

/**
 * 对齐本机 Codex 26.915.4065.0 的项目会话列表。
 * 未展开时显示 5 条；展开后每次再加 10 条。按钮文案保持「展开显示」，全部露出后消失。
 * 当前会话落在窗口外时追加到末尾。
 */
export function projectSessionWindow(
  ids: readonly string[],
  state: ProjectSessionWindowState,
  forcedId?: string,
): ProjectSessionWindow {
  const page = state.page < 1 ? 1 : state.page
  const limit = state.expanded
    ? PROJECT_SESSION_PREVIEW_LIMIT + PROJECT_SESSION_PAGE_SIZE * page
    : PROJECT_SESSION_PREVIEW_LIMIT
  const head = ids.slice(0, limit)
  const visible = forcedId !== undefined && ids.includes(forcedId) && !head.includes(forcedId)
    ? [...head, forcedId]
    : head
  return {
    ids: visible,
    showMore: visible.length < ids.length,
  }
}

/**
 * 折叠项目文件夹时清掉「展开显示」。
 * 安装包 i$n：文件夹从展开变为折叠时，对 `project:${id}` 调用 sE(..., false)。
 */
export function collapseProjectSessionWindow(): ProjectSessionWindowState {
  return { expanded: false, page: 1 }
}

/** 第一次展开把页码设为 1（可见 15 条），之后每点一次页码加 1。 */
export function nextProjectSessionWindow(state: ProjectSessionWindowState | undefined): ProjectSessionWindowState {
  const current = state ?? { expanded: false, page: 1 }
  if (!current.expanded) return { expanded: true, page: 1 }
  return { expanded: true, page: current.page + 1 }
}

/**
 * 会话行蓝线的落点：只在被悬停的那一行下方，且仅当它后面那条会话被折起或不存在。
 * 下一行仍可见时交给它自己的 before 线，避免两条平行蓝线。
 */
export function sessionDropAfterRowId(
  drop: { hoveredId?: string | undefined; beforeId?: string | undefined } | undefined,
  renderedIds: readonly string[],
): string | undefined {
  const hoveredId = drop?.hoveredId
  if (hoveredId === undefined || !renderedIds.includes(hoveredId)) return undefined
  const beforeId = drop?.beforeId
  if (beforeId !== undefined && renderedIds.includes(beforeId)) return undefined
  return hoveredId
}

/** 过滤不应出现在工作区树中的会话。 */
export function visibleSessionIds<T extends SessionSummary>(
  ids: readonly string[],
  byId: Readonly<Record<string, T | undefined>>,
  archivedIds: readonly string[],
): string[] {
  const archived = new Set(archivedIds)
  return ids.filter((id) => {
    const session = byId[id]
    return session !== undefined && !archived.has(id) && isTaskSession({ ...session, id: session.id || id })
  })
}

/** 没有归属任何项目的普通会话，放到「最近」。 */
export function ungroupedSessionIds<T extends SessionSummary>(
  ids: readonly string[],
  byId: Readonly<Record<string, T | undefined>>,
  assignedIds: readonly string[],
  archivedIds: readonly string[],
): string[] {
  const assigned = new Set(assignedIds)
  return visibleSessionIds(ids, byId, archivedIds).filter(id => !assigned.has(id))
}

/** 将一个项目或会话移到指定项之前；省略锚点时追加到末尾。 */
export function moveBefore(ids: readonly string[], id: string, beforeId?: string): string[] {
  if (!ids.includes(id) || beforeId === id) return [...ids]
  const next = ids.filter(item => item !== id)
  const index = beforeId === undefined ? next.length : next.indexOf(beforeId)
  next.splice(index < 0 ? next.length : index, 0, id)
  return next
}

/**
 * 复刻 Codex 的排序落点：先从当前列表移除被拖项，再把落点表示成“插到谁之前”。
 * null 表示悬停自身或最终顺序不变，此时不显示蓝线，也不执行排序。
 */
export function reorderDropBeforeId(
  ids: readonly string[],
  draggedId: string,
  hoveredId: string,
  after: boolean,
): string | undefined | null {
  if (draggedId === hoveredId || !ids.includes(hoveredId)) return null
  const remaining = ids.filter(id => id !== draggedId)
  const hoveredIndex = remaining.indexOf(hoveredId)
  if (hoveredIndex < 0) return null
  const beforeId = after ? remaining[hoveredIndex + 1] : hoveredId
  if (!ids.includes(draggedId)) return beforeId
  const reordered = moveBefore(ids, draggedId, beforeId)
  return reordered.every((id, index) => id === ids[index]) ? null : beforeId
}

export type PinnedHeaderDropIndicator =
  | { kind: 'workspace', workspaceId: string }
  | { kind: 'empty' }

/**
 * 置顶标题区与首项目的上半区都表示“插到第一项之前”，因此必须共用同一条指示线。
 * 非空列表把指示线贴到首项目顶部；空列表才使用独立的起始占位线。
 */
export function pinnedHeaderDropIndicator(ids: readonly string[]): PinnedHeaderDropIndicator {
  const workspaceId = ids[0]
  return workspaceId === undefined ? { kind: 'empty' } : { kind: 'workspace', workspaceId }
}

/**
 * 空置顶没有项目行可自行计算落点，松手时 dragleave 又常把 relatedTarget 置空并清掉蓝线。
 * 只要这次 drop 发生在置顶区，空列表也必须把项目置顶。
 */
export function resolvePinnedSectionDrop(
  draggedWorkspace: string | undefined,
  target: { zone: string; beforeId?: string } | undefined,
  pinnedEmpty: boolean,
): { id: string; beforeId?: string } | undefined {
  if (draggedWorkspace === undefined) return undefined
  if (target?.zone === 'pinned') return { id: draggedWorkspace, beforeId: target.beforeId }
  return pinnedEmpty ? { id: draggedWorkspace } : undefined
}

/** 按指定 id 顺序取出对应项；未出现在 ids 中的项丢弃。 */
export function orderByIds<T>(items: readonly T[], ids: readonly string[], idOf: (item: T) => string): T[] {
  const byId = new Map(items.map(item => [idOf(item), item]))
  return ids.flatMap(id => {
    const item = byId.get(id)
    return item === undefined ? [] : [item]
  })
}

type SessionMoveExpansionTarget = {
  workspaceId: string
  pinned: boolean
  groupId?: string
  hasGroups: boolean
}

/** 展开移动目标的全部父级，保证页面重载并选中会话后该行仍然可见。 */
export function expandedForSessionMove(
  current: Readonly<Record<string, boolean>>,
  target: SessionMoveExpansionTarget,
): Record<string, boolean> {
  const next = { ...current }
  if (target.pinned) {
    next['section:pinned'] = true
    next[`pin:${target.workspaceId}`] = true
    return next
  }
  next['section:projects'] = true
  next[target.workspaceId] = true
  if (target.groupId !== undefined) next[`workspace-group:${target.groupId}`] = true
  else if (target.hasGroups) next['workspace-group:ungrouped'] = true
  return next
}

export type CurrentSessionExpansionTree = {
  workspaces: readonly { workspaceId: string; sessionIds: readonly string[] }[]
  pinnedWorkspaceIds: readonly string[]
  groups: readonly { id: string; workspaceIds: readonly string[] }[]
  recentIds: readonly string[]
}

function workspaceIdForSession(
  workspaces: CurrentSessionExpansionTree['workspaces'],
  sessionId: string,
): string | undefined {
  return workspaces.find(workspace => workspace.sessionIds.some(id => String(id) === sessionId))?.workspaceId
}

/** 打开或闭合只跟展开状态走；当前会话所在项目额外使用当前色。 */
export function projectFolderPresentation(isExpanded: boolean, containsCurrent: boolean): { open: boolean; current: boolean } {
  return { open: isExpanded, current: containsCurrent }
}

/** 当前会话变化时展开所属项目或「最近」；会话尚未进入树则保持原展开状态。 */
export function expandedForCurrentSession(
  current: Readonly<Record<string, boolean>>,
  sessionId: string | undefined,
  tree: CurrentSessionExpansionTree,
): Record<string, boolean> {
  if (sessionId === undefined || sessionId === '') return { ...current }
  const workspaceId = workspaceIdForSession(tree.workspaces, sessionId)
  if (workspaceId !== undefined) {
    return expandedForSessionMove(current, {
      workspaceId: String(workspaceId),
      pinned: tree.pinnedWorkspaceIds.includes(String(workspaceId)),
      groupId: tree.groups.find(group => group.workspaceIds.includes(String(workspaceId)))?.id,
      hasGroups: tree.groups.length > 0,
    })
  }
  if (tree.recentIds.includes(sessionId)) return { ...current, 'section:recent': true }
  return { ...current }
}

type WorkspaceGroupSummary = {
  id: string
  title: string
  workspaceIds: readonly string[]
}

export type WorkspaceGroupMoveTarget = {
  groupId: string | undefined
  title: string | undefined
}

/** 仅提供真正改变归属的目标；未分组目标固定排在自定义分组之后。 */
export function workspaceGroupMoveTargets(
  groups: readonly WorkspaceGroupSummary[],
  workspaceId: string,
): WorkspaceGroupMoveTarget[] {
  const currentGroupId = groups.find(group => group.workspaceIds.includes(workspaceId))?.id
  const targets: WorkspaceGroupMoveTarget[] = groups
    .filter(group => group.id !== currentGroupId)
    .map(group => ({ groupId: group.id, title: group.title }))
  if (currentGroupId !== undefined) targets.push({ groupId: undefined, title: undefined })
  return targets
}

export const SESSION_DRAG_TYPE = 'application/x-dcu-session'
export const WORKSPACE_DRAG_TYPE = 'application/x-dcu-workspace'
export const WORKSPACE_GROUP_DRAG_TYPE = 'application/x-dcu-workspace-group'
const SESSION_DRAG_PREFIX = 'dcu-session:'
const WORKSPACE_DRAG_PREFIX = 'dcu-workspace:'
const WORKSPACE_GROUP_DRAG_PREFIX = 'dcu-workspace-group:'

function textPayload(data: DataTransfer | undefined): string {
  try { return data?.getData('text/plain') ?? '' } catch { return '' }
}

/** 写入会话拖拽载荷；drop 时以这个为准，不依赖尚未刷新的 React 状态。 */
export function writeSessionDrag(data: DataTransfer, sessionId: string, title: string): void {
  data.effectAllowed = 'move'
  data.setData('text/plain', `${SESSION_DRAG_PREFIX}${sessionId}`)
  data.setData(SESSION_DRAG_TYPE, sessionId)
  void title
}

export function writeWorkspaceDrag(data: DataTransfer, workspaceId: string, title: string): void {
  data.effectAllowed = 'move'
  data.setData('text/plain', `${WORKSPACE_DRAG_PREFIX}${workspaceId}`)
  data.setData(WORKSPACE_DRAG_TYPE, workspaceId)
  void title
}

export function writeWorkspaceGroupDrag(data: DataTransfer, groupId: string, title: string): void {
  data.effectAllowed = 'move'
  data.setData('text/plain', `${WORKSPACE_GROUP_DRAG_PREFIX}${groupId}`)
  data.setData(WORKSPACE_GROUP_DRAG_TYPE, groupId)
  void title
}

export function readSessionDrag(data: DataTransfer | undefined, fallback?: string): string | undefined {
  try {
    const typed = data?.getData(SESSION_DRAG_TYPE)
    if (typed !== undefined && typed.trim() !== '') return typed
  } catch { /* Chrome 在 dragover 阶段不允许 getData */ }
  const text = textPayload(data)
  if (text.startsWith(SESSION_DRAG_PREFIX)) return text.slice(SESSION_DRAG_PREFIX.length)
  return fallback !== undefined && fallback.trim() !== '' ? fallback : undefined
}

export function sessionDropAction(sourceWorkspaceId: string | undefined, targetWorkspaceId: string): 'reorder' | 'move' {
  return sourceWorkspaceId !== undefined && sourceWorkspaceId === targetWorkspaceId ? 'reorder' : 'move'
}

export function readWorkspaceGroupDrag(data: DataTransfer | undefined, fallback?: string): string | undefined {
  if (readSessionDrag(data) !== undefined) return undefined
  try {
    const typed = data?.getData(WORKSPACE_GROUP_DRAG_TYPE)
    if (typed !== undefined && typed.trim() !== '') return typed
  } catch { /* Chrome 在 dragover 阶段不允许 getData */ }
  const text = textPayload(data)
  if (text.startsWith(WORKSPACE_GROUP_DRAG_PREFIX)) return text.slice(WORKSPACE_GROUP_DRAG_PREFIX.length)
  return fallback !== undefined && fallback.trim() !== '' ? fallback : undefined
}

/** 会话拖拽优先；有会话载荷时不得再把父项目置顶。 */
export function readWorkspaceDrag(data: DataTransfer | undefined, fallback?: string): string | undefined {
  if (readSessionDrag(data) !== undefined) return undefined
  if (readWorkspaceGroupDrag(data) !== undefined) return undefined
  try {
    const typed = data?.getData(WORKSPACE_DRAG_TYPE)
    if (typed !== undefined && typed.trim() !== '') return typed
  } catch { /* Chrome 在 dragover 阶段不允许 getData */ }
  const text = textPayload(data)
  if (text.startsWith(WORKSPACE_DRAG_PREFIX)) return text.slice(WORKSPACE_DRAG_PREFIX.length)
  return fallback !== undefined && fallback.trim() !== '' ? fallback : undefined
}
