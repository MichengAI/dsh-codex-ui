import assert from 'node:assert/strict'
import { openPathInHost, type HostOpenPathConnection } from '../src/client/host-open-path.ts'

const calls: Array<{ path: string }> = []
const connection: HostOpenPathConnection = {
  api: {
    host: {
      openPath: async (payload) => {
        calls.push(payload)
        return { result: { ok: true, value: undefined } }
      },
    },
  },
}

const foregroundCalls: Array<{ input: string, init?: RequestInit }> = []
await openPathInHost(connection, 'D:\\Repository\\project', async (input, init) => {
  foregroundCalls.push({ input, init })
  return new Response(JSON.stringify({ opened: true, foreground: true }), { status: 200 })
})
assert.equal(foregroundCalls[0]?.input, '/api/michengai/codex-ui/open-in-explorer', 'Windows 前台打开必须优先经过本插件 Host 端点')
assert.deepEqual(JSON.parse(String(foregroundCalls[0]?.init?.body)), { path: 'D:\\Repository\\project' })
assert.deepEqual(calls, [], '前台端点成功时不得再次调用通用 Host 打开，避免重复窗口')

await openPathInHost(connection, 'D:\\Repository\\project', async () => new Response('', { status: 501 }))
assert.deepEqual(calls, [{ path: 'D:\\Repository\\project' }], '资源管理器动作必须直接调用 Host RPC 并保留目录路径')

await assert.rejects(
  openPathInHost(
    { api: { host: { openPath: async () => ({ result: { ok: false, error: { message: 'denied' } } }) } } },
    'D:\\denied',
    async () => new Response('', { status: 501 }),
  ),
  /path open failed: denied/,
  'Host 拒绝打开时必须保留错误信息',
)
