/** 在全新隔离 home 中验证真实宿主的侧栏启停回退，不安装依赖、不读取用户配置。 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const repo = fileURLToPath(new URL('../', import.meta.url))
const cli = process.env.DCU_DSH_BIN
if (!cli) throw new Error('需要 DCU_DSH_BIN 指向完整宿主 CLI')
const require = createRequire(cli)
const version = JSON.parse(await readFile(require.resolve('@deepseek-ai/dsh/package.json'), 'utf8')).version
const root = await mkdtemp(path.join(process.env.TMPDIR ?? tmpdir(), 'dcu-fallback-host-'))
const home = path.join(root, 'home')
const profile = path.join(home, 'profiles', 'web')
const plugin = path.join(profile, 'node_modules', '@michengai', 'dsh-codex-ui')
await mkdir(plugin, { recursive: true })
for (const name of ['package.json', 'cordis.patch.yml', 'lib', 'locale', 'assets']) {
  await cp(path.join(repo, name), path.join(plugin, name), { recursive: true })
}
await cp(path.join(repo, 'scripts', 'fixtures', 'compat-panel'), path.join(profile, 'node_modules', 'dcu-compat-panel-fixture'), { recursive: true })
const bundles = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@michengai/dsh-codex-ui', 'dcu-compat-panel-fixture']
const manifest = { name: 'dcu-fallback-isolated', private: true, dsh: { profile: { bundles, patchReload: 'live' } } }
await writeFile(path.join(profile, 'package.json'), JSON.stringify(manifest, null, 2), 'utf8')
const patchPath = path.join(profile, 'cordis.patch.yml')
const setEnabled = async enabled => {
  await writeFile(patchPath, `- id: locale\n  config:\n    preference: zh\n- id: codex-ui\n  disabled: ${!enabled}\n- id: michengai-codex-ui-session-title\n  disabled: ${!enabled}\n`, 'utf8')
}
await setEnabled(true)
const env = { ...process.env, DSH_HOME: home }
const checks = []
let server
let log = ''
const start = async () => {
  log = ''
  server = spawn(process.execPath, [cli, 'web', '--no-open', '--port', '0'], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('隔离宿主启动超时')), 90000)
    const inspect = data => {
      log += data
      const match = log.match(/dsh web: (http:\/\/[^\s]+)/)
      if (match) { clearTimeout(timer); resolve(match[1]) }
    }
    server.stdout.on('data', inspect)
    server.stderr.on('data', inspect)
    server.once('error', error => { clearTimeout(timer); reject(error) })
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`隔离宿主提前退出 ${code}`)) })
  })
}
const stop = async () => {
  if (!server || server.exitCode !== null) return
  const exited = new Promise(resolve => server.once('exit', resolve))
  server.kill()
  await exited
}
let browser
let failure
try {
  const target = await start()
  browser = await chromium.launch()
  const page = await browser.newPage({ locale: 'zh-CN', viewport: { width: 1440, height: 960 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(target)
  await page.waitForFunction(() => !!window.__dcuE2E, { timeout: 60000 })
  for (let i = 0; i < 4; i += 1) {
    for (const name of ['继续', '稍后配置']) {
      const button = page.getByRole('button', { name, exact: true })
      if (await button.isVisible()) await button.click()
    }
    await page.waitForTimeout(250)
  }
  const snapshot = () => page.evaluate(() => {
    const slots = window.__dcuE2E.ctx.slots
    const entries = slots.entries('sidebar')
    return {
      registrations: entries.map(entry => ({ locale: entry.locale, priority: entry.options.priority ?? 0 })),
      selected: slots.entriesOfSlot('sidebar')[0]?.locale,
      customVisible: !!document.querySelector('.dcu-root'),
      workspacesDeclared: !!slots.spec('sidebar.workspaces'),
      settingsDeclared: !!slots.spec('sidebar.settings'),
    }
  })
  for (let cycle = 0; cycle < 3; cycle += 1) {
    try { await page.locator('.dcu-root').waitFor({ timeout: 30000 }) } catch (error) {
      console.error('隔离加载状态', JSON.stringify(await snapshot()))
      console.error('客户端异常', JSON.stringify(errors))
      await page.screenshot({ path: path.join(root, 'failure.png') })
      throw error
    }
    const enabled = await snapshot()
    assert.ok(enabled.registrations.some(row => row.priority === 0), '启用时官方侧栏必须保留注册')
    assert.ok(enabled.registrations.some(row => row.priority === -1), '启用时 Codex 必须覆盖官方')
    if (cycle === 0) {
      await page.getByRole('button', { name: '设置', exact: true }).click()
      await page.locator('[data-dcu-settings-page]').waitFor({ timeout: 15000 })
      assert.ok(await page.locator('[data-dcu-settings-page]').getByText('常规', { exact: true }).count() > 0, '启用时自定义设置页必须能渲染官方设置贡献')
      await page.locator('.dcu-settings-back').click()
      await page.locator('[data-dcu-settings-page]').waitFor({ state: 'detached' })
    }
    await setEnabled(false)
    await page.locator('.dcu-root').waitFor({ state: 'detached', timeout: 30000 })
    const disabled = await snapshot()
    assert.ok(disabled.registrations.length > 0 && disabled.registrations.every(row => row.priority === 0), '停用后仍有官方有效侧栏')
    assert.ok(disabled.workspacesDeclared && disabled.settingsDeclared, '停用后共享插槽必须保留')

    await page.screenshot({ path: path.join(root, `disabled-${cycle}.png`) })
    await setEnabled(true)
    await page.locator('.dcu-root').waitFor({ timeout: 30000 })
    checks.push({ cycle, enabled, disabled })
  }
  await setEnabled(false)
  await stop()
  await page.goto(await start())
  await page.waitForFunction(() => !!window.__dcuE2E)
  const restarted = await snapshot()
  assert.equal(restarted.customVisible, false)
  assert.ok(restarted.registrations.length > 0 && restarted.registrations.every(row => row.priority === 0))
  checks.push({ restarted })
  assert.deepEqual(errors, [], '不应有未捕获的客户端异常')
  await page.screenshot({ path: path.join(root, 'disabled-restarted.png') })
  console.log(`真实宿主 ${version}：三轮 live 启停及停用后重启回退通过。证据：${root}`)
} catch (error) {
  failure = error.stack ?? String(error)
  console.error(failure)
  console.error(log.split(/\r?\n/).filter(line => /codex|denied|error|conflict|already|peer/i.test(line)).map(line => line.replace(/https?:\/\/[^\s]+/g, '[URL 已脱敏]')).join('\n'))
  process.exitCode = 1
} finally {
  await browser?.close()
  await stop()
  // 宿主日志不落盘，避免带认证 URL 的日志进入交付物。
  await writeFile(path.join(root, 'report.json'), JSON.stringify({ version, checks, failure }, null, 2), 'utf8')
  console.log(`隔离验证报告：${path.join(root, 'report.json')}`)
}
