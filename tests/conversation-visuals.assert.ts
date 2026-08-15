import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sidebar = readFileSync(new URL('../src/client/CodexSidebar.tsx', import.meta.url), 'utf8')
const navigator = readFileSync(new URL('../src/client/TurnNavigator.tsx', import.meta.url), 'utf8')
const client = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')

assert.match(sidebar, /--dsh-chat-content-width:800px/, '会话内容列必须使用更宽的 Codex 阅读宽度')
assert.match(sidebar, /\[data-composer-card\]\{min-height:142px/, '输入框必须提升最小高度')
assert.match(sidebar, /\[data-input-mirror\]\{min-height:78px/, '输入框必须保持自动增长的镜像高度机制')
assert.match(client, /conversation\.session\.header\.utilities/, '轮次导航必须挂在原生会话扩展位')
assert.match(navigator, /conversationAnchor/, '轮次跳转必须使用集中管理的 DSH 聊天锚点适配层')
assert.match(navigator, /turns\.label/, '轮次导航必须有无障碍名称')
assert.match(navigator, /focus-visible/, '轮次导航必须支持键盘聚焦展开')
assert.match(navigator, /prefers-reduced-motion/, '轮次跳转必须遵循减少动态效果设置')
