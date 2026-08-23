import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { conversationAnchor, conversationAnchors } from '../src/client/conversation-dom.ts'

const dom = new JSDOM('<main><div data-chat-anchor-key="a"></div><div data-chat-anchor-key="b"></div><div data-chat-anchor-key="a"></div></main>')
const root = dom.window.document.querySelector('main') as HTMLElement
const anchors = conversationAnchors(root)

assert.equal(anchors.size, 2, '锚点索引必须一次扫描并按 key 去重')
assert.equal(anchors.get('a'), root.firstElementChild, '重复 key 必须保留首个宿主锚点')
assert.equal(conversationAnchor(root, 'b'), root.children[1], '单锚点查询必须复用统一索引语义')
assert.equal(conversationAnchor(root, 'missing'), null)
