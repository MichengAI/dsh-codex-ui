export const AUTOMATION_SESSION_PREFIX = 'dsh-automation-session-'

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

export function isScheduleSession(id: string, _title?: string): boolean {
  // Automation 从首个版本起就用稳定前缀创建运行会话。标题是用户可编辑数据，
  // 不能作为所有权依据，否则普通会话改成时间格式后会从任务树消失。
  return id.startsWith(AUTOMATION_SESSION_PREFIX)
}

export function scheduleGroupName(title: string): string {
  const match = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*-\s*(.+)$/.exec(title.trim())
  const name = match?.[2]?.trim()
  return name !== undefined && name !== '' ? name : title.trim()
}

/** 把定时运行会话按任务名收成和任务树一样的分组。 */
export function groupScheduleSessions(items: readonly ScheduleSession[], locale = 'zh-CN'): ScheduleGroup[] {
  const groups = new Map<string, ScheduleGroup>()
  for (const item of items) {
    if (!isScheduleSession(item.id, item.title)) continue
    const label = scheduleGroupName(item.title)
    const current = groups.get(label) ?? { id: label, label, sessions: [] }
    current.sessions.push(item)
    groups.set(label, current)
  }
  return [...groups.values()]
    .map(group => ({
      ...group,
      sessions: [...group.sessions].sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0)),
    }))
    // 会话投影在归档后会重排 ids；若沿用首次出现顺序，移除某个会话会让整组文件夹换位。
    // 文件夹按任务名固定排序，组内仍按最近执行时间倒序，避免连续归档时界面跳动。
    .sort((left, right) => left.label.localeCompare(right.label, locale, { numeric: true, sensitivity: 'base' }))
}
