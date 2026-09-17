import assert from 'node:assert/strict'
import { msUntilNextNowTick, SHARED_NOW_INTERVAL_MS } from '../src/client/shared-now.ts'

assert.equal(SHARED_NOW_INTERVAL_MS, 60_000)
assert.equal(msUntilNextNowTick(0), 60_000)
assert.equal(msUntilNextNowTick(1_000), 59_000)
assert.equal(msUntilNextNowTick(59_999), 1)
assert.equal(msUntilNextNowTick(60_000), 60_000)
assert.equal(msUntilNextNowTick(4_000, 5_000), 1_000)
