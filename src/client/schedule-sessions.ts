export const AUTOMATION_SESSION_PREFIX = 'dsh-automation-session-'
export const AUTOMATION_TITLE_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/

export type ScheduleSession = {
  id: string
  title: string
  updatedAt?: number
  running: boolean
}

export type ScheduleGroup = {
  id: string
  label: string
  sessions: ScheduleSession[]
}

export function isScheduleSession(id: string, title: string): boolean {
  return id.startsWith(AUTOMATION_SESSION_PREFIX) || AUTOMATION_TITLE_RE.test(title.trim())
}

export function scheduleGroupName(title: string): string {
  const match = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*-\s*(.+)$/.exec(title.trim())
  const name = match?.[2]?.trim()
  return name !== undefined && name !== '' ? name : title.trim()
}

/** 把定时运行会话按任务名收成和任务树一样的分组。 */
export function groupScheduleSessions(items: readonly ScheduleSession[]): ScheduleGroup[] {
  const groups = new Map<string, ScheduleGroup>()
  for (const item of items) {
    if (!isScheduleSession(item.id, item.title)) continue
    const label = scheduleGroupName(item.title)
    const current = groups.get(label) ?? { id: label, label, sessions: [] }
    current.sessions.push(item)
    groups.set(label, current)
  }
  return [...groups.values()].map(group => ({
    ...group,
    sessions: [...group.sessions].sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0)),
  }))
}
