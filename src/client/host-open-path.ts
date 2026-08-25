type HostOpenPathResponse = {
  result:
    | { ok: true, value: unknown }
    | { ok: false, error: { message: string } }
}

export const OPEN_IN_EXPLORER_ENDPOINT = '/api/michengai/codex-ui/open-in-explorer'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** 直接调用 Host 的系统打开能力，绕过第三方对 workspaces.openPath 的文件预览拦截。 */
export type HostOpenPathConnection = {
  api: {
    host: {
      openPath: (payload: { path: string }) => Promise<HostOpenPathResponse>
    }
  }
}

/** “在资源管理器中打开”属于明确的系统动作，不应被侧边栏文件预览器接管。 */
export async function openPathInHost(connection: HostOpenPathConnection, path: string, fetcher: FetchLike = fetch): Promise<void> {
  let foregroundResponse: Response | undefined
  try {
    foregroundResponse = await fetcher(OPEN_IN_EXPLORER_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path }),
    })
  } catch {}
  if (foregroundResponse?.ok) return
  if (foregroundResponse !== undefined && foregroundResponse.status !== 404 && foregroundResponse.status !== 501) {
    const payload = await foregroundResponse.json().catch(() => ({})) as { error?: unknown }
    throw new Error(typeof payload.error === 'string' ? payload.error : '无法在前台打开资源管理器。')
  }
  const response = await connection.api.host.openPath({ path })
  if (!response.result.ok) throw new Error(`path open failed: ${response.result.error.message}`)
}
