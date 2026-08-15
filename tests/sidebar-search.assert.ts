import assert from 'node:assert/strict'
import { filterSidebarSearchItems } from '../src/client/sidebar-search.ts'

const items = [
  { id: 'session-a', label: '开发会话功能并编写文档', keywords: 'dsh-codex-ui 文档' },
  { id: 'settings-skills', label: '技能', keywords: '设置 扩展管理' },
  { id: 'settings-plugins', label: '插件', keywords: '设置 扩展管理' },
]

assert.deepEqual(filterSidebarSearchItems(items, '文档').map(item => item.id), ['session-a'])
assert.deepEqual(filterSidebarSearchItems(items, '设置').map(item => item.id), ['settings-skills', 'settings-plugins'])
assert.deepEqual(filterSidebarSearchItems(items, '   ').map(item => item.id), ['session-a', 'settings-skills', 'settings-plugins'])
