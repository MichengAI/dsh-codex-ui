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
 * 按指针落在目标项上/下半区，算出应插入到哪一项之前。
 * 落在最后一项下半区时返回 undefined，表示追加到末尾。
 */
export function dropBeforeId(ids: readonly string[], hoveredId: string, after: boolean): string | undefined {
  const index = ids.indexOf(hoveredId)
  if (index < 0) return hoveredId
  if (!after) return hoveredId
  return index >= ids.length - 1 ? undefined : ids[index + 1]
}

/** 按指定 id 顺序取出对应项；未出现在 ids 中的项丢弃。 */
export function orderByIds<T>(items: readonly T[], ids: readonly string[], idOf: (item: T) => string): T[] {
  const byId = new Map(items.map(item => [idOf(item), item]))
  return ids.flatMap(id => {
    const item = byId.get(id)
    return item === undefined ? [] : [item]
  })
}

/** 置顶区的会话按拖入顺序展示；不因父项目已置顶而隐藏。 */
export function standalonePinnedSessionIds(pinnedSessionIds: readonly string[]): string[] {
  return [...pinnedSessionIds]
}

/** 置顶区已有会话时，不再同时展示任何项目文件夹，避免旧置顶项目叠成两条。 */
export function workspaceIdsHiddenByPinnedSessions(
  workspaces: readonly { workspaceId: string; sessionIds: readonly string[] }[],
  pinnedSessionIds: readonly string[],
): string[] {
  if (pinnedSessionIds.length === 0) return []
  return workspaces.map(workspace => String(workspace.workspaceId))
}
export const SESSION_DRAG_TYPE = 'application/x-dcu-session'
export const WORKSPACE_DRAG_TYPE = 'application/x-dcu-workspace'
const SESSION_DRAG_PREFIX = 'dcu-session:'
const WORKSPACE_DRAG_PREFIX = 'dcu-workspace:'

function dragTypes(data: DataTransfer | undefined): string[] {
  return data === undefined ? [] : Array.from(data.types)
}

function textPayload(data: DataTransfer | undefined): string {
  try { return data?.getData('text/plain') ?? '' } catch { return '' }
}

/** 拖过置顶区时用来决定是否 preventDefault；只看 types，不读数据。 */
export function isSidebarItemDrag(data: DataTransfer | undefined): boolean {
  const types = dragTypes(data)
  return types.includes(SESSION_DRAG_TYPE) || types.includes(WORKSPACE_DRAG_TYPE) || types.includes('text/plain')
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

export function readSessionDrag(data: DataTransfer | undefined, fallback?: string): string | undefined {
  try {
    const typed = data?.getData(SESSION_DRAG_TYPE)
    if (typed !== undefined && typed.trim() !== '') return typed
  } catch { /* Chrome 在 dragover 阶段不允许 getData */ }
  const text = textPayload(data)
  if (text.startsWith(SESSION_DRAG_PREFIX)) return text.slice(SESSION_DRAG_PREFIX.length)
  return fallback !== undefined && fallback.trim() !== '' ? fallback : undefined
}

/** 会话拖拽优先；有会话载荷时不得再把父项目置顶。 */
export function readWorkspaceDrag(data: DataTransfer | undefined, fallback?: string): string | undefined {
  if (readSessionDrag(data) !== undefined) return undefined
  try {
    const typed = data?.getData(WORKSPACE_DRAG_TYPE)
    if (typed !== undefined && typed.trim() !== '') return typed
  } catch { /* Chrome 在 dragover 阶段不允许 getData */ }
  const text = textPayload(data)
  if (text.startsWith(WORKSPACE_DRAG_PREFIX)) return text.slice(WORKSPACE_DRAG_PREFIX.length)
  return fallback !== undefined && fallback.trim() !== '' ? fallback : undefined
}
