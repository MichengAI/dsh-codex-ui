export const AUTOMATION_TASK_SETTINGS_EVENT = 'dsh-automation:open-task-settings'
export const AUTOMATION_TASK_SETTINGS_STORAGE_KEY = 'dsh-automation:pending-task-settings'

export type AutomationTaskSettingsRequest = {
  automationId?: string
  name: string
  sessionIds: string[]
}

export function parseAutomationTaskSettingsRequest(value: unknown): AutomationTaskSettingsRequest | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const record = value as { automationId?: unknown; name?: unknown; sessionIds?: unknown }
  if (typeof record.name !== 'string' || record.name.trim() === '' || !Array.isArray(record.sessionIds) || record.sessionIds.some(id => typeof id !== 'string' || id === '')) return undefined
  if (record.automationId !== undefined && (typeof record.automationId !== 'string' || record.automationId.trim() === '')) return undefined
  return {
    ...(typeof record.automationId === 'string' ? { automationId: record.automationId } : {}),
    name: record.name,
    sessionIds: [...record.sessionIds],
  }
}

/** 定时设置页可能切换分区后才挂载：先保存一次性请求，再通知已挂载实例。 */
export function requestAutomationTaskSettings(request: AutomationTaskSettingsRequest): void {
  if (typeof window === 'undefined') return
  const validated = parseAutomationTaskSettingsRequest(request)
  if (validated === undefined) return
  try { window.sessionStorage.setItem(AUTOMATION_TASK_SETTINGS_STORAGE_KEY, JSON.stringify(validated)) } catch { /* unavailable storage */ }
  window.dispatchEvent(new CustomEvent(AUTOMATION_TASK_SETTINGS_EVENT, { detail: validated }))
}

export function clearAutomationTaskSettingsRequest(): void {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(AUTOMATION_TASK_SETTINGS_STORAGE_KEY) } catch { /* unavailable storage */ }
}
