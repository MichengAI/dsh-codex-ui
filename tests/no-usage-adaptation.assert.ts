import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const removed = [
  'src/usage-frame',
  'src/usage-frame-routes.ts',
  'src/client/usage-statistics.ts',
  'src/client/UsageStatisticsSection.tsx',
  'assets/usage-frame.html',
  'scripts/build-usage-frame.mjs',
  'scripts/verify-usage-runtime.mjs',
  'tests/usage-frame-primitives.spec.ts',
  'tests/usage-loading.spec.ts',
  'tests/usage-statistics.spec.ts',
]

function collect(dir: string): string {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return [collect(path)]
    return /\.(?:ts|tsx|mjs|json)$/.test(entry.name) ? [readFileSync(path, 'utf8')] : []
  }).join('\n')
}

const source = collect('src')
const scripts = readFileSync('package.json', 'utf8')

for (const path of removed) {
  assert.equal(existsSync(path), false, `不得保留费用插件适配：${path}`)
}
assert.doesNotMatch(source, /usage-frame|usage-statistics|dsh-ui-usage-billing|billing-trigger|dcu-usage|registerUsageStatistics/, '源码不得再承载、拦截或改写费用插件')
assert.doesNotMatch(scripts, /build-usage-frame|verify-usage-runtime/, '构建和测试不得再打包费用承载页')
console.log('费用插件适配已移除')
