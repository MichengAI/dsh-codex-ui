import assert from 'node:assert/strict'
import {
  insertPinnedWorkspace,
  normalizePinnedWorkspaceIds,
  prunePinnedWorkspaceIds,
  readHostPinnedWorkspaceIds,
  resolvePinnedWorkspaceHydration,
  togglePinnedWorkspace,
  WORKSPACE_PREFERENCES_ENDPOINT,
  writeHostPinnedWorkspaceIds,
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

const host = await readHostPinnedWorkspaceIds(async (input, init) => {
  assert.equal(input, WORKSPACE_PREFERENCES_ENDPOINT)
  assert.equal(init?.method, 'GET')
  return new Response(JSON.stringify({ exists: true, pinnedWorkspaceIds: ['a', 'a', 'b'] }), { status: 200 })
})
assert.deepEqual(host, { exists: true, pinnedWorkspaceIds: ['a', 'b'] })

await writeHostPinnedWorkspaceIds(['a', 'a', 'b'], async (input, init) => {
  assert.equal(input, WORKSPACE_PREFERENCES_ENDPOINT)
  assert.equal(init?.method, 'PUT')
  assert.deepEqual(JSON.parse(String(init?.body)), { pinnedWorkspaceIds: ['a', 'b'] })
  return new Response('{}', { status: 200 })
})
