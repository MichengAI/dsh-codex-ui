import assert from 'node:assert/strict'
import { sessionTitleLine, titleOverflowPx, titleScrollDurationMs } from '../src/client/session-title-scroll.ts'

assert.equal(sessionTitleLine('第一行\n第二行'), '第一行')
assert.equal(sessionTitleLine('只有一行'), '只有一行')
assert.equal(titleOverflowPx(120, 120), 0)
assert.equal(titleOverflowPx(121, 120), 0)
assert.equal(titleOverflowPx(122, 120), 2)
assert.equal(titleOverflowPx(200, 100), 100)
assert.equal(titleScrollDurationMs(0), 0)
assert.equal(titleScrollDurationMs(42), 1600)
assert.equal(titleScrollDurationMs(84), 2000)
assert.equal(titleScrollDurationMs(10_000), 8000)
