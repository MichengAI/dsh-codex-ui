import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/client/channel-brand.tsx', import.meta.url), 'utf8')
const wecom = source.match(/if \(brand === 'wecom'\) \{([\s\S]*?)\n  \}/)?.[1] ?? ''

assert.match(wecom, /viewBox="4 6 39 34"/)
assert.match(wecom, /#0082ef/)
assert.match(wecom, /#2dbc00/)
assert.match(wecom, /#fb6500/)
assert.match(wecom, /#fc0/)
assert.doesNotMatch(wecom, /fill="#fff"/)

console.log('✓ compact WeCom channel brand keeps the meaningful multicolor mark without a white tile')
