import assert from 'node:assert/strict'
import { dropBeforeId, isTaskSession, moveBefore, orderByIds, ungroupedSessionIds, visibleSessionIds } from '../src/client/workspace-browser.ts'

const sessions = {
  a: { id: 'a', origin: 'user', blank: false },
  b: { id: 'b', origin: 'subagent', blank: false },
  c: { id: 'c', origin: 'user', blank: true },
  d: { id: 'd', origin: 'user', blank: false },
  e: { id: 'dsh-automation-session-1', origin: 'user', blank: false, displayTitle: '2026-08-18 20:05 - 天气预报' },
  f: { id: 'f', origin: 'user', blank: false, displayTitle: '2026-08-18 20:00 - 天气预报' },
  g: { id: 'im:telegram:dm:1:x', origin: 'user', blank: false, displayTitle: '你好' },
  h: { id: 'h', origin: 'user', blank: false, displayTitle: '未归组会话' },
}

assert.deepEqual(visibleSessionIds(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], sessions, ['d']), ['a', 'h'])
assert.deepEqual(ungroupedSessionIds(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], sessions, ['a'], ['d']), ['h'])
assert.equal(isTaskSession(sessions.e), false)
assert.equal(isTaskSession(sessions.g), false)
assert.equal(isTaskSession(sessions.a), true)
assert.deepEqual(moveBefore(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b'])
assert.deepEqual(moveBefore(['a', 'b', 'c'], 'a', undefined), ['b', 'c', 'a'])
assert.deepEqual(moveBefore(['a', 'b'], 'a', 'a'), ['a', 'b'])
assert.equal(dropBeforeId(['a', 'b', 'c'], 'b', false), 'b', '落在上半区必须插到该项前面')
assert.equal(dropBeforeId(['a', 'b', 'c'], 'b', true), 'c', '落在中项下半区必须插到下一项前面')
assert.equal(dropBeforeId(['a', 'b', 'c'], 'c', true), undefined, '落在末项下半区必须追加到末尾')
assert.deepEqual(moveBefore(['a', 'b', 'c'], 'a', dropBeforeId(['a', 'b', 'c'], 'b', true)), ['b', 'a', 'c'], '往下拖到下一项下半区必须真正换位')
assert.deepEqual(
  orderByIds([{ id: 'a' }, { id: 'b' }, { id: 'c' }], ['c', 'a'], item => item.id),
  [{ id: 'c' }, { id: 'a' }],
  '置顶展示必须按置顶 id 顺序，而不是宿主列表顺序',
)
