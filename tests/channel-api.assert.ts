import assert from 'node:assert/strict'
import { isChannelSession, parseChannelGroups, parseChannelSession } from '../src/client/channel-api.ts'

assert.equal(parseChannelSession({}), undefined)
assert.deepEqual(parseChannelSession({ sessionId: 's1', title: '你好', updatedAt: '2026-08-18T10:00:00.000Z', running: true })?.title, '你好')
assert.equal(parseChannelGroups({ ok: true, groups: [{ id: 'telegram', label: 'Telegram', sessions: [{ sessionId: 's1', title: '你好' }] }] }).length, 1)
assert.equal(parseChannelGroups({ ok: true, groups: [{ id: 'telegram', label: 'Telegram', sessions: [{ sessionId: 's1', title: '你好' }] }] })[0].sessions[0].sessionId, 's1')
assert.equal(isChannelSession('im:telegram:dm:1:x'), true)
assert.equal(isChannelSession('dsh-im-connect'), false)
assert.equal(isChannelSession('a'), false)
