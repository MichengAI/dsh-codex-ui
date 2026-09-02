import assert from 'node:assert/strict'
import {
  insertPinnedWorkspace,
  normalizePinnedWorkspaceIds,
  prunePinnedWorkspaceIds,
  readHostWorkspacePreferences,
  resolveWorkspacePreferencesHydration,
  resolvePinnedWorkspaceHydration,
  togglePinnedWorkspace,
  WORKSPACE_PREFERENCES_ENDPOINT,
  writeHostPinnedWorkspaceIds,
  writeHostWorkspacePreferences,
} from '../src/client/pinned-workspaces.ts'

assert.deepEqual(
  normalizePinnedWorkspaceIds(['a', '', 'b', 'a', '  ', 'c']),
  ['a', 'b', 'c'],
)
assert.deepEqual(togglePinnedWorkspace(['a'], 'b'), ['a', 'b'])
assert.deepEqual(togglePinnedWorkspace(['a', 'b'], 'a'), ['b'])

assert.deepEqual(insertPinnedWorkspace(['a', 'b'], 'c', 'b'), ['a', 'c', 'b'])
assert.deepEqual(insertPinnedWorkspace(['a', 'b'], 'c'), ['a', 'b', 'c'])
assert.deepEqual(insertPinnedWorkspace(['a', 'b'], 'b', 'a'), ['b', 'a'])
assert.deepEqual(prunePinnedWorkspaceIds(['a', 'b'], ['a', 'b', 'c']), ['a', 'b'])
assert.deepEqual(prunePinnedWorkspaceIds(['a', 'stale', 'b'], ['a', 'b']), ['a', 'b'])

assert.deepEqual(resolvePinnedWorkspaceHydration([], { exists: true, pinnedWorkspaceIds: ['host'] }), { ids: ['host'], writeHost: false })
assert.deepEqual(resolvePinnedWorkspaceHydration(['legacy'], { exists: false, pinnedWorkspaceIds: [] }), { ids: ['legacy'], writeHost: true })
assert.deepEqual(resolvePinnedWorkspaceHydration(['legacy'], { exists: true, pinnedWorkspaceIds: ['host'] }, ['dirty']), { ids: ['dirty'], writeHost: true })

const host = await readHostWorkspacePreferences(async (input, init) => {
  assert.equal(input, WORKSPACE_PREFERENCES_ENDPOINT)
  assert.equal(init?.method, 'GET')
  return new Response(JSON.stringify({ exists: true, pinnedWorkspaceIds: ['a', 'a', 'b'], workspaceGroups: [] }), { status: 200 })
})
assert.deepEqual(host, { exists: true, pinnedWorkspaceIds: ['a', 'b'], workspaceGroups: [] })

assert.deepEqual(
  resolveWorkspacePreferencesHydration(
    { pinnedWorkspaceIds: ['legacy'], workspaceGroups: [] },
    { exists: true, pinnedWorkspaceIds: ['host'], workspaceGroups: [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }] },
  ),
  { pinnedWorkspaceIds: ['host'], workspaceGroups: [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }], writeHost: false },
)

await writeHostWorkspacePreferences(['a', 'a', 'b'], [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }], async (input, init) => {
  assert.equal(input, WORKSPACE_PREFERENCES_ENDPOINT)
  assert.equal(init?.method, 'PUT')
  assert.deepEqual(JSON.parse(String(init?.body)), { pinnedWorkspaceIds: ['a', 'b'], workspaceGroups: [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }] })
  return new Response('{}', { status: 200 })
})

await writeHostPinnedWorkspaceIds(['a', 'a', 'b'], async (input, init) => {
  assert.equal(input, WORKSPACE_PREFERENCES_ENDPOINT)
  assert.deepEqual(JSON.parse(String(init?.body)), { pinnedWorkspaceIds: ['a', 'b'] }, '旧调用方不得通过空分组覆盖已保存分组')
  return new Response('{}', { status: 200 })
})
