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
  version?: string
  files?: string[]
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
  '@michengai/dsh-agency-agents': '0.1.21',
  '@michengai/dsh-skills-manager': '0.1.24',
  '@michengai/dsh-archive-manager': '0.1.13',
  '@michengai/dsh-im-connect': '0.1.23',
  '@michengai/dsh-automation': '0.1.14',
}

assert.equal(suite.name, '@michengai/dsh-codex-suite', '聚合包名必须稳定')
assert.equal(suite.version, '0.1.15', '兼容聚合包必须跟随 UI 修复版本更新')
assert.equal(suite.files?.includes('installer.mjs'), false, '兼容聚合包不应携带会触发整棵依赖解析的 npx 安装器')
assert.equal(suite.dsh?.bundle?.patch, './cordis.patch.yml', 'DSH 必须读取聚合 patch')
for (const packageName of packages) {
  assert.notEqual(suite.dependencies?.[packageName], undefined, `聚合包必须安装 ${packageName}`)
  assert.equal(suite.dependencies?.[packageName], expectedVersions[packageName], `聚合包必须固定 ${packageName} 的已验证版本`)
  assert.match(patch, new RegExp(`name: '${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `聚合 patch 必须加载 ${packageName}`)
}
assert.match(readme, /npx --yes @michengai\/dsh-codex-suite-installer@latest --profile web/, '聚合包必须指向轻量直接成员安装器')
assert.match(readme, /直接依赖/, '聚合包必须说明成员以直接依赖安装')
assert.match(readme, /先提升全部成员，再移除旧聚合依赖/, '安装器必须说明旧聚合 Suite 的安全迁移顺序')
assert.match(readme, /@michengai\/dsh-im-connect/, '聚合包说明必须列出 IM 助理')
assert.match(readme, /@michengai\/dsh-automation/, '聚合包说明必须列出定时任务')
assert.match(rootReadme, /npx --yes @michengai\/dsh-codex-suite-installer@latest --profile web/, '英文 README 必须提供轻量直接成员安装器命令')
assert.match(rootReadmeZh, /npx --yes @michengai\/dsh-codex-suite-installer@latest --profile web/, '中文 README 必须提供轻量直接成员安装器命令')
assert.match(rootReadmeZh, /@michengai\/dsh-im-connect/, '中文 README 必须描述 IM 插件')
assert.match(rootReadmeZh, /@michengai\/dsh-automation/, '中文 README 必须描述定时任务插件')
assert.match(rootReadmeZh, /assets\/branding\/dsh-banner\.png/, '中文 README 必须使用全宽横幅')
