import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const suitePath = new URL('../packages/dsh-codex-suite/', import.meta.url)
const packagePath = new URL('package.json', suitePath)
const patchPath = new URL('cordis.patch.yml', suitePath)
const readmePath = new URL('README.zh-CN.md', suitePath)

assert.equal(existsSync(packagePath), true, '必须提供可独立发布的聚合包')
assert.equal(existsSync(patchPath), true, '聚合包必须提供 DSH patch')
assert.equal(existsSync(readmePath), true, '聚合包必须说明独立安装方式')

const suite = JSON.parse(readFileSync(packagePath, 'utf8')) as {
  name?: string
  dsh?: { bundle?: { patch?: string } }
  dependencies?: Record<string, string>
}
const patch = readFileSync(patchPath, 'utf8')
const readme = readFileSync(readmePath, 'utf8')
const packages = [
  '@michengai/dsh-codex-ui',
  '@michengai/dsh-agency-agents',
  '@michengai/dsh-skills-manager',
  '@michengai/dsh-archive-manager',
]
const expectedVersions: Record<string, string> = {
  '@michengai/dsh-codex-ui': 'workspace:*',
  '@michengai/dsh-agency-agents': '0.1.4',
  '@michengai/dsh-skills-manager': '0.1.7',
  '@michengai/dsh-archive-manager': '0.1.0',
}

assert.equal(suite.name, '@michengai/dsh-codex-suite', '聚合包名必须稳定')
assert.equal(suite.dsh?.bundle?.patch, './cordis.patch.yml', 'DSH 必须读取聚合 patch')
for (const packageName of packages) {
  assert.notEqual(suite.dependencies?.[packageName], undefined, `聚合包必须安装 ${packageName}`)
  assert.equal(suite.dependencies?.[packageName], expectedVersions[packageName], `聚合包必须固定 ${packageName} 的已验证版本`)
  assert.match(patch, new RegExp(`name: '${packageName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`), `聚合 patch 必须加载 ${packageName}`)
}
assert.match(readme, /dsh plugin --profile web add @michengai\/dsh-codex-suite/, '聚合包必须提供一键安装命令')
assert.match(readme, /互斥/, '聚合包必须说明不能与独立安装并存')
