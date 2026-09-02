import assert from 'node:assert/strict'
import { isChannelSession, loadChannelGroups, parseChannelGroups, parseChannelSession } from '../src/client/channel-api.ts'

assert.equal(parseChannelSession({}), undefined)
assert.deepEqual(parseChannelSession({ sessionId: 's1', title: '你好', updatedAt: '2026-08-18T10:00:00.000Z', running: true })?.title, '你好')
assert.equal(parseChannelGroups({ ok: true, groups: [{ id: 'telegram', label: 'Telegram', sessions: [{ sessionId: 's1', title: '你好' }] }] }).length, 1)
assert.equal(parseChannelGroups({ ok: true, groups: [{ id: 'telegram', label: 'Telegram', sessions: [{ sessionId: 's1', title: '你好' }] }] })[0].sessions[0].sessionId, 's1')
assert.equal(parseChannelGroups({ ok: true, groups: [{ id: 'custom', sessions: [] }] }, 'Channel')[0].label, 'Channel')
assert.equal(parseChannelGroups({ ok: true, groups: [{ id: 'custom', sessions: [] }] }, '频道')[0].label, '频道')
assert.equal(isChannelSession('im:telegram:dm:1:x'), true)
assert.equal(isChannelSession('dsh-im-connect'), false)
assert.equal(isChannelSession('a'), false)

const originalFetch = globalThis.fetch
try {
  globalThis.fetch = async () => new Response('<html>Bad gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } })
  await assert.rejects(loadChannelGroups(), /无法读取频道会话/, '非 JSON 网关错误必须保留稳定错误文案')
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'IM 服务暂不可用' }), { status: 503, headers: { 'content-type': 'application/json' } })
  await assert.rejects(loadChannelGroups(), /IM 服务暂不可用/, '非 2xx JSON 响应必须保留服务端 error')
} finally {
  globalThis.fetch = originalFetch
}
