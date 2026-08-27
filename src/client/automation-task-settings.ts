export const AUTOMATION_TASK_SETTINGS_EVENT = 'dsh-automation:open-task-settings'
export const AUTOMATION_TASK_SETTINGS_STORAGE_KEY = 'dsh-automation:pending-task-settings'

export type AutomationTaskSettingsRequest = {
  name: string
  sessionIds: string[]
}

/**
 * The Automation settings component may mount only after the Settings shell has
 * switched sections. Persist the one-shot request first, then emit an event for
 * the already-mounted case.
 */
export function requestAutomationTaskSettings(request: AutomationTaskSettingsRequest): void {
  try { window.sessionStorage.setItem(AUTOMATION_TASK_SETTINGS_STORAGE_KEY, JSON.stringify(request)) } catch { /* unavailable storage */ }
  window.dispatchEvent(new CustomEvent(AUTOMATION_TASK_SETTINGS_EVENT, { detail: request }))
}

export function clearAutomationTaskSettingsRequest(): void {
  try { window.sessionStorage.removeItem(AUTOMATION_TASK_SETTINGS_STORAGE_KEY) } catch { /* unavailable storage */ }
}
