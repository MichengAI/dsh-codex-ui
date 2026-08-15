import assert from 'node:assert/strict'
import { normalizePinnedWorkspaceIds, togglePinnedWorkspace } from '../src/client/pinned-workspaces.ts'

assert.deepEqual(
  normalizePinnedWorkspaceIds(['a', '', 'b', 'a', '  ', 'c']),
  ['a', 'b', 'c'],
)
assert.deepEqual(togglePinnedWorkspace(['a'], 'b'), ['a', 'b'])
assert.deepEqual(togglePinnedWorkspace(['a', 'b'], 'a'), ['b'])
