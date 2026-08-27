import { describe, expect, test, vi } from 'vitest'
import { archiveScheduleGroup } from '../src/client/schedule-group-actions.ts'
import { groupScheduleSessions, isScheduleSession } from '../src/client/schedule-sessions.ts'

describe('scheduled-session ownership', () => {
  test('uses the Automation-owned id instead of an editable title', () => {
    expect(isScheduleSession('normal-session', '2026-08-27 09:00 - 普通会话')).toBe(false)
    expect(isScheduleSession('dsh-automation-session-run', '用户改过的标题')).toBe(true)
    expect(groupScheduleSessions([
      { id: 'normal-session', title: '2026-08-27 09:00 - 普通会话', running: false },
      { id: 'dsh-automation-session-run', title: '2026-08-27 09:00 - 自动任务', running: false },
    ]).map(group => group.label)).toEqual(['自动任务'])
  })
})

describe('archiveScheduleGroup', () => {
  test('continues after individual failures and reports exact results', async () => {
    const archive = vi.fn(async (id: string) => {
      if (id === 'failed') throw new Error('host unavailable')
    })
    await expect(archiveScheduleGroup(['first', 'failed', 'last'], archive)).resolves.toEqual({
      archivedIds: ['first', 'last'],
      failedIds: ['failed'],
    })
    expect(archive.mock.calls.map(([id]) => id)).toEqual(['first', 'failed', 'last'])
  })
})
