export type ArchiveScheduleGroupResult = {
  archivedIds: string[]
  failedIds: string[]
}

/** 尝试归档整组并保留逐项结果，避免首个失败让后续会话永远不执行。 */
export async function archiveScheduleGroup(
  sessionIds: readonly string[],
  archiveSession: (sessionId: string) => Promise<void>,
): Promise<ArchiveScheduleGroupResult> {
  const archivedIds: string[] = []
  const failedIds: string[] = []
  for (const sessionId of sessionIds) {
    try {
      await archiveSession(sessionId)
      archivedIds.push(sessionId)
    } catch {
      failedIds.push(sessionId)
    }
  }
  return { archivedIds, failedIds }
}
