import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { msUntilNextNowTick, SHARED_NOW_INTERVAL_MS } from '../src/client/shared-now.ts'

const source = readFileSync(new URL('../src/client/shared-now.ts', import.meta.url), 'utf8')
assert.match(source, /useSyncExternalStore/, 'now 必须走模块订阅，不能每棵树各起 useState')
assert.match(source, /const listeners = new Set/, '订阅者必须挂在模块上')
assert.match(source, /cancelled/, 'timeout 转 interval 时必须能取消，避免卸载漏清')
assert.doesNotMatch(source, /useState|useEffect/, '共享时钟不得再按树各起 state 和 effect')

assert.equal(SHARED_NOW_INTERVAL_MS, 60_000)
assert.equal(msUntilNextNowTick(0), 60_000)
assert.equal(msUntilNextNowTick(1_000), 59_000)
assert.equal(msUntilNextNowTick(59_999), 1)
assert.equal(msUntilNextNowTick(60_000), 60_000)
assert.equal(msUntilNextNowTick(4_000, 5_000), 1_000)
