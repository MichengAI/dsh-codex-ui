import assert from 'node:assert/strict'
import { groupScheduleSessions, isScheduleSession, scheduleGroupName } from '../src/client/schedule-sessions.ts'

assert.equal(isScheduleSession('dsh-automation-session-1', '普通标题'), true)
assert.equal(isScheduleSession('abc', '2026-08-18 19:05 - 天气预报'), true)
assert.equal(isScheduleSession('abc', '你好'), false)
assert.equal(scheduleGroupName('2026-08-18 19:05 - 天气预报'), '天气预报')
const groups = groupScheduleSessions([
  { id: 'dsh-automation-session-1', title: '2026-08-18 19:05 - 天气预报', updatedAt: 2, running: false },
  { id: 'dsh-automation-session-2', title: '2026-08-18 18:40 - 天气预报', updatedAt: 1, running: false },
  { id: 'normal', title: '你好', updatedAt: 3, running: false },
])
assert.equal(groups.length, 1)
assert.equal(groups[0].label, '天气预报')
assert.equal(groups[0].sessions[0].id, 'dsh-automation-session-1')
