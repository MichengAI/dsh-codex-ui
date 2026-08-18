import assert from 'node:assert/strict'
import { COMPANION_STYLE_ID, COMPANION_TREE_STYLE, ensureCompanionTreeStyle, readCompanionTip, shouldShowCompanionTip } from '../src/client/CompanionTree.tsx'

assert.match(COMPANION_TREE_STYLE, /ima-n-toolbar/, '必须盖住频道自带的工作区工具条')
assert.match(COMPANION_TREE_STYLE, /padding:0 8px 0 28px!important/, '频道会话缩进必须与任务树一致')
assert.match(COMPANION_TREE_STYLE, /--dcu-sidebar-hover\)!important/, '频道悬停底色必须用任务树色')
assert.match(COMPANION_TREE_STYLE, /ima-n-acts/, '频道悬停按钮必须保留，只改外观')
assert.match(COMPANION_TREE_STYLE, /ima-n-hover/, '频道悬停卡片必须改成任务树外观')

const schedule = {
  matches: (selector: string) => selector.includes('.dsh-st-rail-session'),
  getBoundingClientRect: () => ({ right: 240, top: 80, left: 20, bottom: 112, width: 220, height: 32, x: 20, y: 80, toJSON: () => ({}) }),
  querySelector: () => ({ textContent: '天气预报' }),
} as unknown as Element
assert.equal(shouldShowCompanionTip(schedule), true)
assert.equal(readCompanionTip(schedule, 1280, 800)?.title, '天气预报')

const channel = {
  matches: (selector: string) => selector.includes('.ima-n-sess'),
  getBoundingClientRect: () => ({ right: 240, top: 80, left: 20, bottom: 112, width: 220, height: 32, x: 20, y: 80, toJSON: () => ({}) }),
  querySelector: () => ({ textContent: '你好' }),
} as unknown as Element
assert.equal(shouldShowCompanionTip(channel), false)

const fakeHead = { nodes: [] as Array<{ id?: string; textContent?: string }>, append(node: { id?: string; textContent?: string }) { this.nodes.push(node) } }
const fakeDoc = {
  head: fakeHead,
  getElementById: () => null,
  createElement: () => ({ id: '', textContent: '' }),
} as unknown as Document
const style = ensureCompanionTreeStyle(fakeDoc)
assert.equal(style?.id, COMPANION_STYLE_ID)
assert.equal(fakeHead.nodes.length, 1, '覆盖样式必须挂到 document.head，才能压过 IM 后注入的皮肤')
