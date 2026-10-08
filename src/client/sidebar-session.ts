export function beginSidebarSession(
  setTab: (tab: 'tasks') => void,
  startSession: (workspaceId?: string) => void,
  workspaceId?: string,
): void {
  setTab('tasks')
  if (workspaceId === undefined) startSession()
  else startSession(workspaceId)
}
