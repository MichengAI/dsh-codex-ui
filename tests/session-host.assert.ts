import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const host = readFileSync(new URL('../src/client/session-host.ts', import.meta.url), 'utf8')
const navigation = readFileSync(new URL('../src/client/session-navigation.ts', import.meta.url), 'utf8')
const client = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')

assert.match(host, /reflectGet\.call\(access\.reflect, name\)/, '官方服务必须先走 reflect.get')
assert.match(host, /if \(hasReflect\) return undefined/, '有 reflect 时不得硬读未注入属性')
assert.match(host, /typeof access\.sessions\?\.retain === 'function'\) return false/, 'alpha.2 leftover sessions.open 不能当成打开成功')
assert.match(host, /source: 'controllerOperation'/, '绑定/重命名必须用 controllerOperation retain')
assert.match(navigation, /openHostSession\(host, id\)/, '打开会话必须走双路径宿主导航')
assert.match(navigation, /if \(opened\) selectGlobalPanel\(layout, null\)/, '打开失败时必须保留当前全局面板')
assert.match(client, /openConversationWithDraft|openWorkspace/, '连接器草稿必须在 retain 仍有效时写入')
assert.match(client, /__dcuCurrentSessionId/, '兼容脚本必须使用生产环境的当前会话实现')
assert.match(client, /probeService\(ctx, 'uiWorkspace'\)/, '工作区导航必须 probe，不能硬读 ctx.uiWorkspace')
assert.doesNotMatch(client, /export const inject = \[[^\]]*['"]uiWorkspace['"]/, '不得把 uiWorkspace 写进 apply inject')
assert.doesNotMatch(client, /openConversation\(ctx\.sessions/, '打开会话必须传入完整 ctx，才能 probe 官方导航')
assert.match(client, /openConversation\(ctx, ctx\.layout/, '打开会话必须把 ctx 交给双路径导航')
assert.match(client, /currentSessionId\(ctx\.sessions\.list.getSnapshot\(\)\)/, '草稿和预填必须用双路径当前会话')
assert.match(client, /forkHostSession\(ctx, sessionId\)/, '分叉必须优先官方 forkSession')
assert.match(client, /renameHostSession\(ctx, sessionId, title\)/, '重命名必须 using/retain 后再 binding')
assert.match(client, /archiveHostSession\(ctx, sessionId\)/, '归档必须优先官方 archiveSession')
