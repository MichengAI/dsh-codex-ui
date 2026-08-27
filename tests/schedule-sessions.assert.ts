import assert from 'node:assert/strict'
import { groupScheduleSessions, isScheduleSession, scheduleGroupName } from '../src/client/schedule-sessions.ts'

assert.equal(isScheduleSession('dsh-automation-session-1', '普通标题'), true)
assert.equal(isScheduleSession('abc', '2026-08-18 19:05 - 天气预报'), true)
assert.equal(isScheduleSession('abc', '你好'), false)
// 用户手动把普通会话改名为时间开头（没有 “ - 任务名” 分隔符）时不得误判为定时任务
assert.equal(isScheduleSession('abc', '2026-08-18 20:00 站会'), false)
assert.equal(isScheduleSession('abc', '2026-08-18 20:00'), false)
assert.equal(scheduleGroupName('2026-08-18 19:05 - 天气预报'), '天气预报')
const groups = groupScheduleSessions([
  { id: 'dsh-automation-session-1', title: '2026-08-18 19:05 - 天气预报', updatedAt: 2, running: false },
  { id: 'dsh-automation-session-2', title: '2026-08-18 18:40 - 天气预报', updatedAt: 1, running: false },
  { id: 'normal', title: '你好', updatedAt: 3, running: false },
])
assert.equal(groups.length, 1)
assert.equal(groups[0].label, '天气预报')
assert.equal(groups[0].sessions[0].id, 'dsh-automation-session-1')

const stableGroupsBeforeArchive = groupScheduleSessions([
  { id: 'dsh-automation-session-weather-new', title: '2026-08-18 20:00 - 天气', updatedAt: 4, running: false },
  { id: 'dsh-automation-session-weekly', title: '2026-08-18 19:55 - 每周巡检', updatedAt: 3, running: false },
  { id: 'dsh-automation-session-weather-old', title: '2026-08-18 19:50 - 天气', updatedAt: 2, running: false },
])
const stableGroupsAfterArchive = groupScheduleSessions([
  { id: 'dsh-automation-session-weekly', title: '2026-08-18 19:55 - 每周巡检', updatedAt: 3, running: false },
  { id: 'dsh-automation-session-weather-old', title: '2026-08-18 19:50 - 天气', updatedAt: 2, running: false },
])
assert.deepEqual(stableGroupsBeforeArchive.map(group => group.label), ['每周巡检', '天气'])
assert.deepEqual(stableGroupsAfterArchive.map(group => group.label), ['每周巡检', '天气'])
