import assert from 'node:assert/strict'
import {
  assignWorkspaceToGroup,
  createWorkspaceGroup,
  deleteWorkspaceGroup,
  groupedWorkspaceIds,
  moveWorkspaceGroup,
  moveWorkspaceGroupMember,
  parseWorkspaceGroups,
  placeWorkspaceInGroup,
  pruneWorkspaceGroups,
} from '../src/workspace-groups.ts'

const initial = [
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['archive', 'engram'] },
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] },
]

assert.deepEqual(parseWorkspaceGroups(initial), initial)
assert.equal(parseWorkspaceGroups([{ id: '', title: '无效', workspaceIds: [] }]), undefined)
assert.equal(parseWorkspaceGroups([{ id: 'one', title: '', workspaceIds: [] }]), undefined)
assert.equal(parseWorkspaceGroups([{ id: 'one', title: '重复', workspaceIds: [] }, { id: 'two', title: '重复', workspaceIds: [] }]), undefined)
assert.equal(parseWorkspaceGroups([{ id: 'one', title: '重复项目', workspaceIds: ['archive'] }, { id: 'two', title: '另一组', workspaceIds: ['archive'] }]), undefined)

const created = createWorkspaceGroup(initial, { id: 'agent', title: '智能体与应用开发' })
assert.deepEqual(created.at(-1), { id: 'agent', title: '智能体与应用开发', workspaceIds: [] })

assert.deepEqual(
  assignWorkspaceToGroup(initial, 'archive', 'platform'),
  [
    { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['engram'] },
    { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex', 'archive'] },
  ],
)
assert.deepEqual(assignWorkspaceToGroup(initial, 'archive'), [
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['engram'] },
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] },
])
assert.deepEqual(moveWorkspaceGroupMember(assignWorkspaceToGroup(initial, 'archive', 'platform'), 'archive', 'platform', 'codex'), [
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['engram'] },
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['archive', 'codex'] },
])
assert.deepEqual(placeWorkspaceInGroup(initial, 'archive', 'platform', 'codex'), [
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['engram'] },
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['archive', 'codex'] },
])
assert.deepEqual(placeWorkspaceInGroup(initial, 'ungrouped', 'knowledge', 'engram'), [
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['archive', 'ungrouped', 'engram'] },
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] },
])
assert.throws(() => placeWorkspaceInGroup(initial, 'archive', 'platform', 'missing'), /排序锚点不存在/)
assert.deepEqual(moveWorkspaceGroup(initial, 'knowledge'), [
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] },
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['archive', 'engram'] },
])
assert.deepEqual(moveWorkspaceGroup(initial, 'platform', 'knowledge'), [
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] },
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['archive', 'engram'] },
])
assert.deepEqual(moveWorkspaceGroup(initial, 'knowledge', 'knowledge'), initial)
assert.throws(() => moveWorkspaceGroup(initial, 'knowledge', 'missing'), /排序锚点不存在/)
assert.deepEqual(deleteWorkspaceGroup(initial, 'knowledge'), [{ id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] }])
assert.deepEqual(pruneWorkspaceGroups(initial, ['archive', 'codex']), [
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['archive'] },
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] },
])
assert.deepEqual(groupedWorkspaceIds(initial), ['archive', 'engram', 'codex'])

console.log('✓ workspace group assertions passed')
