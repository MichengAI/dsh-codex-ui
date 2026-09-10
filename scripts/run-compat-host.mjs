/** 使用指定版本的 CLI，在全新 profile 安装构建包并执行真实浏览器回归。 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, readFile, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const cli = process.env.DCU_DSH_BIN
const tarball = process.env.DCU_E2E_TARBALL
const version = process.env.DCU_E2E_VERSION
if (!cli || !tarball || !['0.1.5-rc.1', '0.1.5-rc.2'].includes(version)) throw new Error('需要 DCU_DSH_BIN、DCU_E2E_TARBALL 和精确的 DCU_E2E_VERSION')
const repo = fileURLToPath(new URL('../', import.meta.url))
const resolve = createRequire(cli)
for (const name of ['dsh', 'dsh-base', 'dsh-web-app', 'dsh-client-ui-layout', 'dsh-client-ui-conversation', 'dsh-client-ui-sidebar', 'dsh-client-ui-session', 'dsh-client-ui-settings']) {
  assert.equal(JSON.parse(await readFile(resolve.resolve(`@deepseek-ai/${name}/package.json`), 'utf8')).version, version, `${name} 不能混入其他候选版本`)
}
const root = await mkdtemp(path.join(tmpdir(), 'dcu-compat-host-'))
const env = { ...process.env, DSH_HOME: path.join(root, 'home'), DCU_E2E_WORKSPACE: path.join(root, 'workspace') }
await mkdir(env.DCU_E2E_WORKSPACE)
function run(args, extraEnv = env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: repo, env: extraEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', data => { output += data })
    child.stderr.on('data', data => { output += data })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve(output) : reject(new Error(output)))
  })
}
console.log(`准备 ${version} 隔离宿主：${root}`)
await run([cli, 'plugin', '--profile', 'web', 'add', path.resolve(tarball), path.join(repo, 'scripts', 'fixtures', 'compat-panel')])
const installed = await realpath(path.join(env.DSH_HOME, 'profiles', 'web', 'node_modules', '@michengai', 'dsh-codex-ui'))
assert.ok(installed.startsWith(root), '必须测试已安装的 tarball，不能链接回开发仓库')
const server = spawn(process.execPath, [cli, 'web', '--no-open', '--port', '0'], { cwd: env.DCU_E2E_WORKSPACE, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
try {
  const url = await new Promise((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error('宿主启动超时')), 45000)
    const inspect = data => {
      output += data
      const match = output.match(/dsh web: (http:\/\/[^\s]+)/)
      if (match) { clearTimeout(timeout); resolve(match[1]) }
    }
    server.stdout.on('data', inspect)
    server.stderr.on('data', inspect)
    server.once('error', error => { clearTimeout(timeout); reject(error) })
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`宿主提前退出 ${code}: ${output}`)) })
  })
  const testEnv = { ...env, DCU_DSH_URL: url }
  console.log(await run(['scripts/verify-compat-host.mjs'], testEnv))
  console.log(await run(['scripts/verify-settings-exit.mjs'], testEnv))
} finally {
  server.kill()
  if (server.exitCode === null) await new Promise(resolve => server.once('exit', resolve))
}
// 留存隔离 profile 供失败排查；验收记录应写明路径，清理不得触及用户真实 profile。
console.log(`完成 ${version}；隔离证据目录：${root}`)
