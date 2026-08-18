import assert from 'node:assert/strict'
import { insertPinnedWorkspace, normalizePinnedWorkspaceIds, togglePinnedWorkspace } from '../src/client/pinned-workspaces.ts'

assert.deepEqual(
  normalizePinnedWorkspaceIds(['a', '', 'b', 'a', '  ', 'c']),
  ['a', 'b', 'c'],
)
assert.deepEqual(togglePinnedWorkspace(['a'], 'b'), ['a', 'b'])
assert.deepEqual(togglePinnedWorkspace(['a', 'b'], 'a'), ['b'])

assert.deepEqual(insertPinnedWorkspace(['a', 'b'], 'c', 'b'), ['a', 'c', 'b'])
assert.deepEqual(insertPinnedWorkspace(['a', 'b'], 'c'), ['a', 'b', 'c'])
assert.deepEqual(insertPinnedWorkspace(['a', 'b'], 'b', 'a'), ['b', 'a'])
