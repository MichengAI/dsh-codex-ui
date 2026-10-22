/** 先切回任务页签再创建，避免新建后仍停在频道或日程。支持同步与异步返回值。 */
export function beginSidebarSession<TWorkspaceId extends string = string, TResult = unknown>(
  setTab: (tab: 'tasks') => void,
  startSession: (workspaceId?: TWorkspaceId) => TResult,
  workspaceId?: TWorkspaceId,
): TResult {
  setTab('tasks')
  return workspaceId === undefined ? startSession() : startSession(workspaceId)
}
