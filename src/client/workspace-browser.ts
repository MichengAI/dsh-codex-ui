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

/** 按指定 id 顺序取出对应项；未出现在 ids 中的项丢弃。 */
export function orderByIds<T>(items: readonly T[], ids: readonly string[], idOf: (item: T) => string): T[] {
  const byId = new Map(items.map(item => [idOf(item), item]))
  return ids.flatMap(id => {
    const item = byId.get(id)
    return item === undefined ? [] : [item]
  })
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
