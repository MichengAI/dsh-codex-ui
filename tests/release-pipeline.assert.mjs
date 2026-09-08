/** 隔离目录验证自动升版至双语说明的完整链路，不访问 npm 或用户配置。 */
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseDocument } from 'workflow-yaml'

for (const name of ['ci.yml', 'publish.yml', 'release.yml', 'release-suite-installer.yml']) {
  const doc = parseDocument(readFileSync(`.github/workflows/${name}`, 'utf8'), { uniqueKeys: true })
  assert.deepEqual(doc.errors, [], `${name} 必须是有效 YAML`)
  const workflow = doc.toJS()
  assert.ok(workflow.on && workflow.jobs)
  for (const key of Object.keys(workflow)) assert.ok(['name', 'on', 'permissions', 'concurrency', 'jobs', 'env', 'defaults', 'run-name'].includes(key), `${name} 根级字段无效：${key}`)
  for (const job of Object.values(workflow.jobs)) {
    assert.ok(Array.isArray(job.steps))
    for (const [index, step] of job.steps.entries()) {
      assert.notEqual(step.run === undefined, step.uses === undefined, '步骤必须且只能指定 run 或 uses')
      if (step.run?.trim() === 'pnpm test') {
        const install = job.steps.findIndex(item => item.run?.includes('pnpm install --frozen-lockfile'))
        const browser = job.steps.findIndex(item => item.run?.includes('playwright install --with-deps chromium'))
        assert.ok(install >= 0 && browser > install && browser < index, `${name} 必须先安装依赖及 Chromium 再测试`)
      }
    }
  }
}

const directory = mkdtempSync(join(tmpdir(), 'dcu-release-contract-'))
try {
  for (const file of ['scripts/prepare-suite-installer-release.mjs', 'scripts/extract-release-notes.mjs', 'scripts/release-changelog.mjs', 'packages/dsh-codex-suite-installer/installer.mjs', 'packages/dsh-codex-suite-installer/package.json', 'packages/dsh-codex-suite/package.json']) {
    mkdirSync(dirname(join(directory, file)), { recursive: true })
    copyFileSync(resolve(file), join(directory, file))
  }
  const fixture = '# 更新记录\n\n## Unreleased\n\nPending work\n\n## 0.0.1 - 2020-01-01\n\nHistorical entry\n'
  for (const file of ['CHANGELOG.md', 'CHANGELOG.zh-CN.md']) writeFileSync(join(directory, file), fixture)
  writeFileSync(join(directory, 'mock-registry.mjs'), 'globalThis.fetch = async () => new Response(JSON.stringify({ "dist-tags": { latest: "1.2.3" } }));')
  const run = (script, args = []) => spawnSync(process.execPath, ['--import', './mock-registry.mjs', `scripts/${script}`, ...args], { cwd: directory, encoding: 'utf8' })
  const prepared = run('prepare-suite-installer-release.mjs', ['--release-notes', 'prepared.md'])
  assert.equal(prepared.status, 0, prepared.stderr)
  const version = JSON.parse(readFileSync(join(directory, 'packages/dsh-codex-suite-installer/package.json'), 'utf8')).version
  const extracted = run('extract-release-notes.mjs', [`suite-installer-v${version}`, 'extracted.md'])
  assert.equal(extracted.status, 0, extracted.stderr)
  assert.equal(readFileSync(join(directory, 'extracted.md'), 'utf8'), readFileSync(join(directory, 'prepared.md'), 'utf8'))
  for (const file of ['CHANGELOG.md', 'CHANGELOG.zh-CN.md']) {
    const body = readFileSync(join(directory, file), 'utf8')
    assert.ok(body.includes('Historical entry') && body.includes('Pending work'))
    assert.ok(body.includes(`## suite-installer-v${version} - `))
  }
  assert.equal(run('prepare-suite-installer-release.mjs', ['--version', version]).status, 0)
  assert.equal(readFileSync(join(directory, 'CHANGELOG.md'), 'utf8').split(`## suite-installer-v${version} - `).length, 2, '重试不得产生重复版本章节')
  writeFileSync(join(directory, 'CHANGELOG.zh-CN.md'), fixture)
  assert.notEqual(run('extract-release-notes.mjs', [`suite-installer-v${version}`, 'incomplete.md']).status, 0, '缺少一种语言必须阻止发布')
} finally { rmSync(directory, { recursive: true, force: true }) }
