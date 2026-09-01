import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { restoreOfficialUserBubbles, USER_BUBBLE_STYLE_ID } from '../src/client/conversation-bubbles.ts'

const bubbles = readFileSync(new URL('../src/client/conversation-bubbles.ts', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/client/conversation-header.ts', import.meta.url), 'utf8')
const visuals = readFileSync(new URL('../src/client/CodexSidebar.tsx', import.meta.url), 'utf8')

assert.doesNotMatch(bubbles, /align-items:flex-start!important/, '不得把官方用户气泡改成左对齐卡片')
assert.doesNotMatch(bubbles, /data-dcu-user-title/, '不得再拆官方用户气泡标题行')
assert.doesNotMatch(bubbles, /data-dcu-user-sub/, '不得再拆官方用户气泡副标题')
assert.doesNotMatch(bubbles, /display:none!important/, '不得隐藏官方用户气泡源节点')
assert.doesNotMatch(header, /decorateUserBubbles|ensureUserBubbleStyle/, '会话观察不得再改写用户气泡')
assert.match(header, /restoreOfficialUserBubbles/, '启动时必须撤回旧版 Codex 用户卡片')
assert.doesNotMatch(visuals, /--dsh-chat-content-width:\s*800px/, '不得覆盖宿主自适应和拖拽会话宽度')
assert.doesNotMatch(visuals, /\[data-chat-flow\]\{gap:/, '不得在宿主逐行间距之外叠加旧版 flex gap')

/** 行为验证：旧版替换卡片和隐藏标记必须被撤掉，官方气泡恢复显示。 */
{
  const dom = new JSDOM(`<div data-chat-flow-kind="user"><div data-time-hover-root><div>
    <div class="bubble" data-dcu-user-source>标题行\n副标题行</div>
    <div data-dcu-user-card><span data-dcu-user-title>标题行</span></div>
  </div></div></div>`)
  ;(globalThis as { HTMLElement?: unknown }).HTMLElement = dom.window.HTMLElement
  const doc = dom.window.document
  const style = doc.createElement('style')
  style.id = USER_BUBBLE_STYLE_ID
  doc.head.append(style)
  const bubble = doc.querySelector('.bubble') as HTMLElement

  restoreOfficialUserBubbles(doc)
  assert.equal(doc.querySelector('[data-dcu-user-card]'), null, '旧版替换卡片必须删除')
  assert.equal(bubble.hasAttribute('data-dcu-user-source'), false, '官方气泡必须恢复显示')
  assert.equal(doc.getElementById(USER_BUBBLE_STYLE_ID), null, '旧版用户气泡覆盖样式必须移除')
}
