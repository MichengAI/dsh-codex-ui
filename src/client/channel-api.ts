export const CHANNELS_ENDPOINT = '/dsh-im-connect/api/channels'
export const CHANNEL_SESSION_PREFIX = 'im:'

export type ChannelSession = {
  sessionId: string
  title: string
  updatedAt?: number
  running: boolean
}

export type ChannelGroup = {
  id: string
  label: string
  sessions: ChannelSession[]
}

/** DSH 会话头不能写 origin=im，频道会话只靠 id 前缀。 */
export function isChannelSession(id: string): boolean {
  return id.startsWith(CHANNEL_SESSION_PREFIX)
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

function updatedAt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value !== '') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

export function parseChannelSession(value: unknown): ChannelSession | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const sessionId = text(row.sessionId)
  if (sessionId === '') return undefined
  return {
    sessionId,
    title: text(row.title) || text(row.chatId) || sessionId,
    updatedAt: updatedAt(row.updatedAt),
    running: row.running === true,
  }
}

export function parseChannelGroups(payload: unknown): ChannelGroup[] {
  const root = payload !== null && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const raw = Array.isArray(root.groups) ? root.groups : Array.isArray(payload) ? payload : []
  return raw.flatMap((item, index) => {
    if (item === null || typeof item !== 'object') return []
    const group = item as Record<string, unknown>
    const sessions = Array.isArray(group.sessions) ? group.sessions.flatMap(session => {
      const parsed = parseChannelSession(session)
      return parsed === undefined ? [] : [parsed]
    }) : []
    return [{
      id: text(group.id, `channel-${index}`),
      label: text(group.label, text(group.title, '频道')),
      sessions,
    }]
  })
}

/** 读取 IM 频道分组；失败时交给界面显示空态或错误。 */
export async function loadChannelGroups(): Promise<ChannelGroup[]> {
  const response = await fetch(CHANNELS_ENDPOINT, { cache: 'no-store' })
  const payload = await response.json() as unknown
  if (!response.ok) throw new Error('无法读取频道会话')
  const root = payload !== null && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  if (root.ok === false) throw new Error(text(root.error, '无法读取频道会话'))
  return parseChannelGroups(payload)
}
