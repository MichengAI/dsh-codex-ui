import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { decorateUserBubbles, splitUserCard } from '../src/client/conversation-bubbles.ts'

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
assert.doesNotMatch(bubbles, /innerText/, '读取气泡文本必须用 textContent，避免强制布局回流')
assert.match(header, /decorateUserBubbles/, '会话观察必须同时改用户气泡')
assert.match(header, /ensureUserBubbleStyle/, '用户卡片样式必须随会话顶栏一起注入')
assert.match(visuals, /--dsh-chat-content-width:800px/, '会话列宽必须继续使用 Codex 阅读宽度')

/** 行为验证：纯文本气泡替换、富文本/空文本回退。 */
{
  const dom = new JSDOM('<div data-chat-flow-kind="user"><div data-time-hover-root><div><div class="bubble">标题行\n副标题行</div></div></div></div>')
  // 源码模块里的 instanceof HTMLElement 用的是全局类，须对齐 jsdom 的元素类
  ;(globalThis as { HTMLElement?: unknown }).HTMLElement = dom.window.HTMLElement
  const doc = dom.window.document
  const bubble = doc.querySelector('.bubble') as HTMLElement

  decorateUserBubbles(doc)
  const card = doc.querySelector('[data-dcu-user-card]')
  assert.ok(card !== null, '纯文本气泡必须替换成卡片')
  assert.ok(bubble.hasAttribute('data-dcu-user-source'), '原气泡必须被隐藏')
  assert.equal(card.querySelector('[data-dcu-user-title]')?.textContent, '标题行')
  assert.equal(card.querySelector('[data-dcu-user-sub]')?.textContent, '副标题行')

  // 消息被编辑成富文本后，必须撤销替换并恢复原气泡，不能继续展示过时的纯文本卡片
  bubble.innerHTML = '<pre>code</pre>'
  decorateUserBubbles(doc)
  assert.equal(doc.querySelector('[data-dcu-user-card]'), null, '富文本气泡必须撤掉替换卡片')
  assert.equal(bubble.hasAttribute('data-dcu-user-source'), false, '原气泡必须恢复显示')

  // 变回纯文本要能重新装饰；清空文本则必须回退
  bubble.innerHTML = '再次编辑的纯文本'
  decorateUserBubbles(doc)
  assert.ok(doc.querySelector('[data-dcu-user-card]') !== null, '再次变回纯文本必须重新装饰')
  bubble.textContent = '   '
  decorateUserBubbles(doc)
  assert.equal(doc.querySelector('[data-dcu-user-card]'), null, '空文本必须撤掉替换卡片')
  assert.equal(bubble.hasAttribute('data-dcu-user-source'), false, '空文本必须恢复原气泡显示')
}
