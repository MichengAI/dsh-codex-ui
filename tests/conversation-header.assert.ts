import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const header = readFileSync(new URL('../src/client/conversation-header.ts', import.meta.url), 'utf8')
const client = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')

assert.match(header, /actions.after\(tabs\)/, '对话轨迹页签必须插到子代理操作行后面')
assert.match(header, /data-dcu-inline-tabs/, '内联页签必须带稳定标记')
assert.match(header, /data-dcu-title-folder/, '会话标题必须加上文件夹图标')
assert.match(client, /observeConversationHeader/, '会话顶栏观察必须接入客户端')
assert.match(header, /data-dcu-title-more/, '会话标题右侧必须有三点菜单')
assert.match(header, /HEADER_PROJECT_TIP_EVENT/, '顶栏文件夹必须复用项目悬停卡片')
assert.match(header, /HEADER_SESSION_MENU_EVENT/, '顶栏三点必须复用会话菜单')
assert.match(header, /\[role=tab\]:after/, '对话轨迹页签必须去掉下划线')
assert.match(header, /aria-selected=true/, '选中页签必须能识别当前项')
assert.match(header, /data-dcu-tab-slider/, '对话轨迹必须使用滑动选中块')
assert.match(header, /button-info-fill/, '选中页签必须使用原来的蓝色')
assert.match(header, /padding-bottom:12px/, '顶栏分割线必须和页签拉开距离')
assert.match(header, /width="16" height="16"/, '顶栏文件夹必须和侧栏一样是 16px')
assert.match(header, /getRect/, '三点菜单必须按按钮位置取锚点')
assert.match(header, /toggle: true/, '再次点击顶栏文件夹必须关闭卡片')
assert.doesNotMatch(header, /mouseenter/, '顶栏文件夹不得再用悬停打开卡片')
assert.match(header, /translate\(1.5 2.429\)/, '顶栏文件夹必须使用官方 IconFolderClose16 路径')
assert.match(header, /decorateUserBubbles/, '会话观察必须把用户气泡改成 Codex 卡片')
