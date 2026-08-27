import { beforeEach, expect, test, vi } from 'vitest'
import {
  AUTOMATION_TASK_SETTINGS_EVENT,
  AUTOMATION_TASK_SETTINGS_STORAGE_KEY,
  parseAutomationTaskSettingsRequest,
  requestAutomationTaskSettings,
} from '../src/client/automation-task-settings.ts'

beforeEach(() => { window.sessionStorage.clear() })

test('validates and forwards a one-shot Automation settings request', () => {
  const listener = vi.fn()
  window.addEventListener(AUTOMATION_TASK_SETTINGS_EVENT, listener)
  const request = { automationId: 'task-1', name: '每日简报', sessionIds: ['session-1'] }
  try {
    requestAutomationTaskSettings(request)
    expect(JSON.parse(window.sessionStorage.getItem(AUTOMATION_TASK_SETTINGS_STORAGE_KEY) ?? 'null')).toEqual(request)
    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual(request)
  } finally {
    window.removeEventListener(AUTOMATION_TASK_SETTINGS_EVENT, listener)
  }
})

test('rejects malformed requests without writing or dispatching', () => {
  const listener = vi.fn()
  window.addEventListener(AUTOMATION_TASK_SETTINGS_EVENT, listener)
  try {
    expect(parseAutomationTaskSettingsRequest({ name: '', sessionIds: ['session-1'] })).toBeUndefined()
    expect(parseAutomationTaskSettingsRequest({ name: '任务', sessionIds: [1] })).toBeUndefined()
    requestAutomationTaskSettings({ name: '', sessionIds: ['session-1'] })
    expect(window.sessionStorage.getItem(AUTOMATION_TASK_SETTINGS_STORAGE_KEY)).toBeNull()
    expect(listener).not.toHaveBeenCalled()
  } finally {
    window.removeEventListener(AUTOMATION_TASK_SETTINGS_EVENT, listener)
  }
})
