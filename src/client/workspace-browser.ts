type SessionSummary = {
  id: string
  origin?: string | undefined
  blank?: boolean | undefined
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
    return session !== undefined && session.origin !== 'subagent' && session.origin !== 'im' && !session.blank && !archived.has(id)
  })
}

/** 将一个项目或会话移到指定项之前；省略锚点时追加到末尾。 */
export function moveBefore(ids: readonly string[], id: string, beforeId?: string): string[] {
  if (!ids.includes(id) || beforeId === id) return [...ids]
  const next = ids.filter(item => item !== id)
  const index = beforeId === undefined ? next.length : next.indexOf(beforeId)
  next.splice(index < 0 ? next.length : index, 0, id)
  return next
}

