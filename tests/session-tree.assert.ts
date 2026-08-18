import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const tree = readFileSync(new URL('../src/client/session-tree.tsx', import.meta.url), 'utf8')
const channel = readFileSync(new URL('../src/client/ChannelBrowser.tsx', import.meta.url), 'utf8')
const schedule = readFileSync(new URL('../src/client/ScheduleBrowser.tsx', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('../src/client/CodexWorkspaceBrowser.tsx', import.meta.url), 'utf8')

assert.match(tree, /id: 'pin'[\s\S]*PinIcon/, '共用菜单置顶必须有图标')
assert.match(tree, /id: 'unread'[\s\S]*dcu-wb-unread/, '共用菜单未读必须有图标')
assert.match(tree, /id: 'fork'[\s\S]*IconBranchOutline16/, '共用菜单继续必须有图标')
assert.match(tree, /main-separator/, '共用菜单分隔必须与任务树一致')
assert.match(workspace, /sessionMenuItems\(t, \{ pinned:[\s\S]*includePath: true \}\)/, '任务树必须复用共用会话菜单')
assert.match(channel, /sessionMenuItems\(t, \{ pinned, unread \}\)/, '频道必须复用共用会话菜单')
assert.match(schedule, /sessionMenuItems\(t, \{ pinned, unread \}\)/, '定时必须复用共用会话菜单')
assert.match(channel, /<SessionRow /, '频道必须复用共用会话行')
assert.match(schedule, /<SessionRow /, '定时必须复用共用会话行')
assert.match(channel, /<GroupHead /, '频道分组行必须走共用头部')
assert.doesNotMatch(channel, /showTip\(\{ title: group/, '频道项目行不得显示悬停卡片')
assert.doesNotMatch(schedule, /showTip\(\{ title: group/, '定时项目行不得显示悬停卡片')
assert.doesNotMatch(workspace, /showTip\(\{ kind: 'workspace'/, '任务项目行不得显示悬停卡片')
