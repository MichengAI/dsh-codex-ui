import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const suitePath = new URL('../packages/dsh-codex-suite/', import.meta.url)
const packagePath = new URL('package.json', suitePath)
const patchPath = new URL('cordis.patch.yml', suitePath)
const readmePath = new URL('README.zh-CN.md', suitePath)
const rootReadmePath = new URL('../README.md', import.meta.url)
const rootReadmeZhPath = new URL('../README.zh-CN.md', import.meta.url)

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
const rootReadme = readFileSync(rootReadmePath, 'utf8')
const rootReadmeZh = readFileSync(rootReadmeZhPath, 'utf8')
const packages = [
  '@michengai/dsh-codex-ui',
  '@michengai/dsh-agency-agents',
  '@michengai/dsh-skills-manager',
  '@michengai/dsh-archive-manager',
  '@michengai/dsh-im-connect',
  '@michengai/dsh-automation',
]
const expectedVersions: Record<string, string> = {
  '@michengai/dsh-codex-ui': 'workspace:*',
  '@michengai/dsh-agency-agents': '0.1.20',
  '@michengai/dsh-skills-manager': '0.1.23',
  '@michengai/dsh-archive-manager': '0.1.12',
  '@michengai/dsh-im-connect': '0.1.22',
  '@michengai/dsh-automation': '0.1.13',
}

assert.equal(suite.name, '@michengai/dsh-codex-suite', '聚合包名必须稳定')
assert.equal(suite.dsh?.bundle?.patch, './cordis.patch.yml', 'DSH 必须读取聚合 patch')
for (const packageName of packages) {
  assert.notEqual(suite.dependencies?.[packageName], undefined, `聚合包必须安装 ${packageName}`)
  assert.equal(suite.dependencies?.[packageName], expectedVersions[packageName], `聚合包必须固定 ${packageName} 的已验证版本`)
  assert.match(patch, new RegExp(`name: '${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `聚合 patch 必须加载 ${packageName}`)
}
assert.match(readme, /dsh plugin --profile web add @michengai\/dsh-codex-suite@latest --registry=https:\/\/registry\.npmjs\.org\//, '聚合包必须提供官方源一键安装命令')
assert.match(readme, /互斥/, '聚合包必须说明不能与独立安装并存')
assert.match(readme, /@michengai\/dsh-im-connect/, '聚合包说明必须列出 IM 助理')
assert.match(readme, /@michengai\/dsh-automation/, '聚合包说明必须列出定时任务')
assert.match(rootReadme, /dsh plugin --profile web add @michengai\/dsh-codex-suite@latest --registry=https:\/\/registry\.npmjs\.org\//, '英文 README 必须提供套件一键安装命令')
assert.match(rootReadmeZh, /dsh plugin --profile web add @michengai\/dsh-codex-suite@latest --registry=https:\/\/registry\.npmjs\.org\//, '中文 README 必须提供套件一键安装命令')
assert.match(rootReadmeZh, /@michengai\/dsh-im-connect/, '中文 README 必须描述 IM 插件')
assert.match(rootReadmeZh, /@michengai\/dsh-automation/, '中文 README 必须描述定时任务插件')
assert.match(rootReadmeZh, /assets\/branding\/dsh-banner\.png/, '中文 README 必须使用全宽横幅')
