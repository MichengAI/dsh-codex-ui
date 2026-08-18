import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { splitUserCard } from '../src/client/conversation-bubbles.ts'

assert.deepEqual(splitUserCard('优化了一般，你看看'), { title: '优化了一般，你看看' })
assert.deepEqual(splitUserCard('1、会话上面的时间，要放到悬停卡片上 2、这个侧边栏宽了一点\n这三处已经改完。'), {
  title: '1、会话上面的时间，要放到悬停卡片上 2、这个侧边栏宽了一点',
  sub: '这三处已经改完。',
})
assert.deepEqual(splitUserCard('  标题  \n\n  副标题第一行  \n副标题第二行  '), {
  title: '标题',
  sub: '副标题第一行 副标题第二行',
})

const bubbles = readFileSync(new URL('../src/client/conversation-bubbles.ts', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/client/conversation-header.ts', import.meta.url), 'utf8')
const visuals = readFileSync(new URL('../src/client/CodexSidebar.tsx', import.meta.url), 'utf8')

assert.match(bubbles, /align-items:flex-start!important/, '用户卡片必须左对齐，不能再靠右像聊天气泡')
assert.match(bubbles, /border-radius:16px/, '用户卡片圆角必须接近 Codex，不能再用 22px 胶囊')
assert.match(bubbles, /font-size:14px/, '用户卡片标题必须是 14px')
assert.match(bubbles, /data-dcu-user-title/, '用户卡片必须拆出标题行')
assert.match(bubbles, /data-dcu-user-sub/, '多行用户消息必须拆出淡色副标题')
assert.match(bubbles, /text-overflow:ellipsis/, '过长标题必须单行省略')
assert.match(header, /decorateUserBubbles/, '会话观察必须同时改用户气泡')
assert.match(header, /ensureUserBubbleStyle/, '用户卡片样式必须随会话顶栏一起注入')
assert.match(visuals, /--dsh-chat-content-width:800px/, '会话列宽必须继续使用 Codex 阅读宽度')