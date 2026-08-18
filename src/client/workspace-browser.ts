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
