import assert from 'node:assert/strict'
import { moveBefore, visibleSessionIds } from '../src/client/workspace-browser.ts'

const sessions = {
  a: { id: 'a', origin: 'user', blank: false },
  b: { id: 'b', origin: 'subagent', blank: false },
  c: { id: 'c', origin: 'user', blank: true },
  d: { id: 'd', origin: 'user', blank: false },
}

assert.deepEqual(visibleSessionIds(['a', 'b', 'c', 'd'], sessions, ['d']), ['a'])
assert.deepEqual(moveBefore(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b'])
assert.deepEqual(moveBefore(['a', 'b', 'c'], 'a', undefined), ['b', 'c', 'a'])
assert.deepEqual(moveBefore(['a', 'b'], 'a', 'a'), ['a', 'b'])
