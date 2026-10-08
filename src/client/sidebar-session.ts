/** 先切回任务页签再创建，避免新建后仍停在频道或日程。 */
export function beginSidebarSession<TWorkspaceId extends string = string>(
  setTab: (tab: 'tasks') => void,
  startSession: (workspaceId?: TWorkspaceId) => void,
  workspaceId?: TWorkspaceId,
): void {
  setTab('tasks')
  if (workspaceId === undefined) startSession()
  else startSession(workspaceId)
}
