import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'

export type WorkspaceStartService = {
  startSession: (workspaceId?: WorkspaceId) => void
}

export type WorkspaceConnectService = {
  connectWorkspace: (workspaceId: WorkspaceId) => Promise<SessionId>
}

export type WorkspaceRefreshService = {
  refresh: () => Promise<void>
}

export function hasStartSession(value: unknown): value is WorkspaceStartService {
  return value !== null && typeof value === 'object' && 'startSession' in value && typeof value.startSession === 'function'
}

export function hasConnectWorkspace(value: unknown): value is WorkspaceConnectService {
  return value !== null && typeof value === 'object' && 'connectWorkspace' in value && typeof value.connectWorkspace === 'function'
}

export function hasWorkspaceRefresh(value: unknown): value is WorkspaceRefreshService {
  return value !== null && typeof value === 'object' && 'refresh' in value && typeof value.refresh === 'function'
}

/** 与 DSH 官方最近工作区策略一致；时间相同时保留 Host 工作区顺序。 */
export function recentWorkspaceId(
  workspaces: readonly { workspaceId: WorkspaceId; sessionIds: readonly SessionId[]; createdAt: string }[],
  sessions: Readonly<Record<string, { updatedAt: number }>>,
): WorkspaceId | undefined {
  let selected: WorkspaceId | undefined
  let selectedTime = Number.NEGATIVE_INFINITY
  for (const workspace of workspaces) {
    let latest = Number.NEGATIVE_INFINITY
    for (const sessionId of workspace.sessionIds) {
      const session = sessions[sessionId]
      if (session !== undefined) latest = Math.max(latest, session.updatedAt)
    }
    if (latest === Number.NEGATIVE_INFINITY) latest = Date.parse(workspace.createdAt)
    if (selected === undefined || latest > selectedTime) {
      selected = workspace.workspaceId
      selectedTime = latest
    }
  }
  return selected
}

/** 旧版提供聚合字段；alpha.5 起由工作区和会话两个 Store 分别报告基线阶段。 */
export function workspaceBaselinesReady(workspaces: object, sessions: object): boolean {
  if ('baselinesReady' in workspaces) return workspaces.baselinesReady === true
  return 'phase' in workspaces && workspaces.phase === 'ready' && 'phase' in sessions && sessions.phase === 'ready'
}
