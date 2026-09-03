export const SESSION_MOVE_ENDPOINT = '/api/michengai/codex-ui/session-move'
const MOVE_ACTION_PREFIX = 'move-session:'

type WorkspaceSummary = {
  workspaceId: string
  title: string
  sessionIds: readonly string[]
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type SessionMoveCompletionOptions = {
  sessionId: string
  currentUrl: string
  navigate: (url: string) => void
}

export class SessionMoveRequestError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'SessionMoveRequestError'
  }
}

export function moveSessionActionId(workspaceId: string): string {
  return `${MOVE_ACTION_PREFIX}${encodeURIComponent(workspaceId)}`
}

export function parseMoveSessionActionId(actionId: string): string | undefined {
  if (!actionId.startsWith(MOVE_ACTION_PREFIX)) return undefined
  try {
    const workspaceId = decodeURIComponent(actionId.slice(MOVE_ACTION_PREFIX.length))
    return workspaceId === '' ? undefined : workspaceId
  } catch {
    return undefined
  }
}

/** 按 Host 项目顺序生成目标列表，并排除会话当前所属项目。 */
export function sessionMoveTargets(workspaces: readonly WorkspaceSummary[], sessionId: string): Array<{ id: string; label: string }> {
  return workspaces
    .filter(workspace => !workspace.sessionIds.includes(sessionId))
    .map(workspace => ({ id: workspace.workspaceId, label: workspace.title || workspace.workspaceId }))
}

export async function requestSessionMove(sessionId: string, targetWorkspaceId: string, fetcher: Fetcher = fetch): Promise<void> {
  let response: Response
  try {
    response = await fetcher(SESSION_MOVE_ENDPOINT, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, targetWorkspaceId }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new SessionMoveRequestError('session-move/unavailable')
  }
  let payload: unknown
  try { payload = await response.json() } catch { throw new SessionMoveRequestError('session-move/unavailable') }
  const code = payload !== null && typeof payload === 'object' && typeof (payload as Record<string, unknown>).code === 'string'
    ? (payload as Record<string, string>).code
    : undefined
  if (!response.ok || payload === null || typeof payload !== 'object' || (payload as Record<string, unknown>).ok !== true) {
    throw new SessionMoveRequestError(code ?? 'session-move/failed')
  }
}

/** 通过现有深链入口选中移动后的会话，同时用页面重建清除 DSH 保留的只读会话对象。 */
export function finishSessionMove({ sessionId, currentUrl, navigate }: SessionMoveCompletionOptions): void {
  const targetUrl = new URL(currentUrl)
  targetUrl.searchParams.set('session', sessionId)
  navigate(targetUrl.toString())
}
