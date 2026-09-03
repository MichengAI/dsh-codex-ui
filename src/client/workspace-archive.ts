/** 按项目顺序归档会话；失败后停止，交由调用方显示并允许用户重试。 */
export async function archiveWorkspaceSessions(
  sessionIds: readonly string[],
  archiveSession: (sessionId: string) => Promise<void>,
): Promise<void> {
  for (const sessionId of new Set(sessionIds)) await archiveSession(sessionId)
}
