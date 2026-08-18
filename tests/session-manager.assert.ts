import assert from 'node:assert/strict'
import {
  normalizeSessionIds,
  sessionDeepLink,
  toggleSessionId,
} from '../src/client/session-manager.ts'

assert.deepEqual(normalizeSessionIds(['a', '', 'a', '  ', 'b']), ['a', 'b'])
assert.deepEqual(toggleSessionId(['a', 'b'], 'a'), ['b'])
assert.deepEqual(toggleSessionId(['a'], 'b'), ['b', 'a'])
assert.equal(sessionDeepLink('https://example.test/root', 'session 1'), 'https://example.test/root?session=session+1')
