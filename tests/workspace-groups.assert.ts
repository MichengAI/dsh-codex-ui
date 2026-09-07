import assert from 'node:assert/strict'
import * as workspaceGroupActions from '../src/workspace-groups.ts'
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
  WorkspaceGroupError,
} from '../src/workspace-groups.ts'

const initial = [
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['archive', 'engram'] },
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] },
]

assert.deepEqual(parseWorkspaceGroups(initial), initial)
assert.equal(typeof workspaceGroupActions.renameWorkspaceGroup, 'function', 'rename action must exist')
const renamed = workspaceGroupActions.renameWorkspaceGroup(initial, 'knowledge', '  Knowledge  ')
assert.deepEqual(renamed, [{ ...initial[0], title: 'Knowledge' }, initial[1]])
assert.equal(initial[0].title, '数据与知识管理', 'rename must not mutate the original')
assert.deepEqual(workspaceGroupActions.renameWorkspaceGroup(renamed, 'knowledge', 'KNOWLEDGE'), [{ ...initial[0], title: 'KNOWLEDGE' }, initial[1]])
for (const title of ['', '   ', 'a'.repeat(81), '平台与基础设施']) {
  assert.throws(() => workspaceGroupActions.renameWorkspaceGroup(initial, 'knowledge', title), error => error instanceof WorkspaceGroupError && error.code === 'group-invalid')
}
assert.throws(() => workspaceGroupActions.renameWorkspaceGroup(renamed, 'platform', 'knowledge'), error => error instanceof WorkspaceGroupError && error.code === 'group-invalid')
assert.throws(() => workspaceGroupActions.renameWorkspaceGroup(initial, 'missing', 'Name'), error => error instanceof WorkspaceGroupError && error.code === 'group-missing')
assert.equal(workspaceGroupActions.renameWorkspaceGroup(initial, 'knowledge', 'a'.repeat(80))[0].title.length, 80)
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
assert.throws(
  () => placeWorkspaceInGroup(initial, 'archive', 'platform', 'missing'),
  error => error instanceof WorkspaceGroupError && error.code === 'order-anchor-missing',
)
assert.deepEqual(moveWorkspaceGroup(initial, 'knowledge'), [
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] },
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['archive', 'engram'] },
])
assert.deepEqual(moveWorkspaceGroup(initial, 'platform', 'knowledge'), [
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] },
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['archive', 'engram'] },
])
assert.deepEqual(moveWorkspaceGroup(initial, 'knowledge', 'knowledge'), initial)
assert.throws(
  () => moveWorkspaceGroup(initial, 'knowledge', 'missing'),
  error => error instanceof WorkspaceGroupError && error.code === 'order-anchor-missing',
)
assert.deepEqual(deleteWorkspaceGroup(initial, 'knowledge'), [{ id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] }])
assert.deepEqual(pruneWorkspaceGroups(initial, ['archive', 'codex']), [
  { id: 'knowledge', title: '数据与知识管理', workspaceIds: ['archive'] },
  { id: 'platform', title: '平台与基础设施', workspaceIds: ['codex'] },
])
assert.deepEqual(groupedWorkspaceIds(initial), ['archive', 'engram', 'codex'])

console.log('✓ workspace group assertions passed')
