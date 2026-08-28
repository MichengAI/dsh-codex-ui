import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const suitePath = new URL('../packages/dsh-codex-suite/', import.meta.url)
const packagePath = new URL('package.json', suitePath)
const installerPackagePath = new URL('../packages/dsh-codex-suite-installer/package.json', import.meta.url)
const patchPath = new URL('cordis.patch.yml', suitePath)
const readmePath = new URL('README.zh-CN.md', suitePath)
const rootReadmePath = new URL('../README.md', import.meta.url)
const rootReadmeZhPath = new URL('../README.zh-CN.md', import.meta.url)

assert.equal(existsSync(packagePath), true, '必须保留旧聚合包源码以支持存量迁移')
assert.equal(existsSync(patchPath), true, '聚合包必须提供 DSH patch')
assert.equal(existsSync(readmePath), true, '聚合包必须说明独立安装方式')

const suite = JSON.parse(readFileSync(packagePath, 'utf8')) as {
  name?: string
  version?: string
  private?: boolean
  files?: string[]
  dsh?: { bundle?: { patch?: string } }
  dependencies?: Record<string, string>
}
const installer = JSON.parse(readFileSync(installerPackagePath, 'utf8')) as {
  dshCodexSuite?: { members?: Record<string, string> }
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
  ...installer.dshCodexSuite?.members,
  '@michengai/dsh-codex-ui': 'workspace:*',
}

assert.equal(suite.name, '@michengai/dsh-codex-suite', '聚合包名必须稳定')
assert.equal(suite.private, true, '旧聚合包必须阻止后续误发布')
assert.equal(suite.files?.includes('installer.mjs'), false, '兼容聚合包不应携带会触发整棵依赖解析的 npx 安装器')
assert.equal(suite.dsh?.bundle?.patch, './cordis.patch.yml', 'DSH 必须读取聚合 patch')
for (const packageName of packages) {
  assert.notEqual(suite.dependencies?.[packageName], undefined, `聚合包必须安装 ${packageName}`)
  assert.equal(suite.dependencies?.[packageName], expectedVersions[packageName], `聚合包必须固定 ${packageName} 的已验证版本`)
  assert.match(patch, new RegExp(`name: '${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `聚合 patch 必须加载 ${packageName}`)
}
assert.match(readme, /不建议新安装使用/, '聚合包说明必须明确不推荐新安装')
assert.doesNotMatch(readme, /dsh-codex-suite-installer@latest/, '聚合包说明不得继续推荐一键安装器')
assert.doesNotMatch(rootReadme, /dsh-codex-suite-installer@latest/, '英文 README 不得继续推荐一键安装器')
assert.doesNotMatch(rootReadmeZh, /dsh-codex-suite-installer@latest/, '中文 README 不得继续推荐一键安装器')
assert.match(rootReadmeZh, /assets\/branding\/dsh-banner\.png/, '中文 README 必须使用全宽横幅')
