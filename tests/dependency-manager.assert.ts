import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import type { ChildProcess } from 'node:child_process'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { PassThrough } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { applyReleaseExclude, applyRequiredBuildPolicies, beginInstallProgress, dependencyStatuses, directPackagesForInstall, endInstallProgress, ensurePnpmEntry, installProgressSnapshot, isManagedPackageDeclared, isManagedPackageInstalled, isOfficialRuntimePackage, isRestartableInstallError, monitorPluginChild, newerVersion, noteInstallOutput, PLUGIN_MOUNT_TIMEOUT_MS, pluginCommandError, pluginExecArgv, pluginSpawnEnv, pluginToolSearchDirs, pluginUnchangedError, requestDesktopHotUpdate, pluginsToRemoveBeforeInstall, resolveDependencyRuntime, resolveDshPluginTarget, resolveDshCliEntry, resolveDshRuntimeRoot, runDshPlugin, supportsOfficialTurnNavigator, updatableDependencyIds, withPnpmEntry } from '../src/dependency-manager.ts'
import { crossSiteRequest, publicDependencyError } from '../src/index.ts'

const sourceRoot = resolve('fixtures', 'deepseek-harness')
const sourceEntry = join(sourceRoot, 'apps', 'cli', 'src', 'bin.ts')
const installedRoot = resolve('fixtures', 'npm')
const installedEntry = join(installedRoot, 'node_modules', '@deepseek-ai', 'dsh', 'dist', 'bin.mjs')
const managerModule = await import('../src/dependency-manager.ts') as unknown as {
  removeUnmountedPackagePath?: (packageName: string, runtime: ReturnType<typeof resolveDependencyRuntime>) => Promise<void>
}

assert.equal(
  resolveDshCliEntry(join('apps', 'cli', 'src', 'bin.ts'), sourceRoot),
  sourceEntry,
  '源码启动的相对 CLI 入口必须按当前工作目录收成绝对路径',
)
assert.equal(
  resolveDshCliEntry(installedEntry, resolve('fixtures', 'elsewhere')),
  installedEntry,
  '已经是绝对路径的已安装 CLI 不得再拼接他人目录',
)
assert.equal(
  resolveDshCliEntry(pathToFileURL(sourceEntry).href, resolve('fixtures', 'elsewhere')),
  sourceEntry,
  'file URL 入口必须转成当前机器的文件系统路径',
)
assert.equal(
  resolveDshRuntimeRoot(installedEntry),
  installedRoot,
  '全局 npm 安装的 DSH 必须能从当前 CLI 入口识别包含 node_modules 的运行时目录',
)
assert.equal(
  resolveDshRuntimeRoot(sourceEntry),
  undefined,
  '源码启动不应误判为全局 DSH 运行时',
)

const desktopProfileDir = resolve('fixtures', 'desktop-profile')
const desktopRuntimeDir = resolve('fixtures', 'desktop-runtime')
let desktopPluginArgs: readonly string[] | undefined
let desktopPluginCwd: string | undefined
const desktopPnpm = {
  runPlugin(args: readonly string[], invokingDir: string) {
    desktopPluginArgs = args
    desktopPluginCwd = invokingDir
    return {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      done: Promise.resolve({ exitCode: 0, signal: null }),
      cancel() {},
    }
  },
}
const desktopServices = new Map<string, unknown>([
  ['desktopProfiles', { current: { name: 'desktop', dir: desktopProfileDir } }],
  ['desktopPnpm', desktopPnpm],
])
const desktopRuntime = resolveDependencyRuntime({ get: name => desktopServices.get(name) }, {
  env: { DSH_RUNTIME_DIR: desktopRuntimeDir },
  argv: ['/app'],
  homeDir: resolve('fixtures', 'home'),
})
assert.equal(desktopRuntime.environmentKind, 'desktop')
assert.equal(desktopRuntime.profileName, 'desktop')
assert.equal(desktopRuntime.profileDir, desktopProfileDir, 'Desktop 必须读取 Host 当前 profile，而不是回退到 web')
assert.deepEqual(desktopRuntime.runtimeRoots, [desktopRuntimeDir], '旧 Desktop 明确提供的 DSH_RUNTIME_DIR 必须继续用于运行时版本检测')
assert.equal(desktopRuntime.desktopPnpm, desktopPnpm, 'Desktop 安装必须复用 Host 提供的包管理服务')
assert.throws(
  () => resolveDependencyRuntime({ get: name => name === 'desktopProfiles' ? { current: { name: 'desktop', dir: desktopProfileDir } } : undefined }, { env: {} }),
  /包管理服务尚未就绪/,
  '检测到 Desktop 后若公开包管理服务缺失，必须失败而不是回退 ambient CLI',
)
assert.throws(
  () => resolveDependencyRuntime({ get: name => name === 'desktopPnpm' ? desktopPnpm : undefined }, { env: {} }),
  /Profile 服务尚未就绪/,
  '检测到 Desktop 包管理服务后若 Profile 服务缺失，必须失败而不是回退 ambient CLI',
)

const customRuntime = resolveDependencyRuntime(undefined, {
  env: { DSH_PROFILE_DIR: resolve('fixtures', 'profiles', 'custom') },
  argv: ['/node', installedEntry, '--profile', 'custom'],
  homeDir: resolve('fixtures', 'home'),
})
assert.equal(customRuntime.environmentKind, 'cli')
assert.equal(customRuntime.profileName, 'custom')
assert.equal(customRuntime.profileDir, resolve('fixtures', 'profiles', 'custom'), '普通 Web/CLI 必须继续尊重 DSH_PROFILE_DIR')

assert.equal(typeof managerModule.removeUnmountedPackagePath, 'function', '安装缺失插件前必须提供残留 node_modules 清理')
if (managerModule.removeUnmountedPackagePath !== undefined) {
  const staleRoot = await mkdtemp(join(tmpdir(), 'dcu-stale-plugin-'))
  const staleProfile = join(staleRoot, 'profile')
  const staleTarget = join(staleRoot, 'local-skills-manager')
  const stalePath = join(staleProfile, 'node_modules', '@michengai', 'dsh-skills-manager')
  await mkdir(join(staleProfile, 'node_modules', '@michengai'), { recursive: true })
  await mkdir(staleTarget)
  await writeFile(join(staleTarget, 'sentinel.txt'), 'preserve target')
  await writeFile(join(staleProfile, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }))
  await symlink(staleTarget, stalePath, process.platform === 'win32' ? 'junction' : 'dir')
  await managerModule.removeUnmountedPackagePath('@michengai/dsh-skills-manager', {
    environmentKind: 'cli',
    profileName: 'profile',
    profileDir: staleProfile,
    runtimeRoots: [],
  })
  assert.equal(existsSync(stalePath), false, '未挂载插件的旧链接必须删除')
  assert.equal(existsSync(join(staleTarget, 'sentinel.txt')), true, '删除 Junction 不得伤及本地源码目录')
  await rm(staleRoot, { recursive: true, force: true })
}

await runDshPlugin(['add', '@michengai/dsh-codex-ui@0.2.92'], desktopRuntime, 1_000)
assert.deepEqual(desktopPluginArgs, ['add', '@michengai/dsh-codex-ui@0.2.92'])
assert.equal(desktopPluginCwd, desktopProfileDir, 'Desktop 安装必须以当前 profile 作为调用目录')

const statusRoot = await mkdtemp(join(tmpdir(), 'dcu-desktop-status-'))
const statusProfile = join(statusRoot, 'profiles', 'desktop')
const statusRuntimeRoot = join(statusRoot, 'app.asar.unpacked')
const writeManifest = async (root: string, packageName: string, version: string): Promise<void> => {
  const directory = join(root, 'node_modules', ...packageName.split('/'))
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: packageName, version }), 'utf8')
}
await mkdir(statusProfile, { recursive: true })
await writeFile(join(statusProfile, 'package.json'), JSON.stringify({
  dsh: { profile: { bundles: ['@michengai/dsh-codex-ui'] } },
  dependencies: { '@michengai/dsh-codex-ui': '0.2.92' },
}), 'utf8')
await writeManifest(statusProfile, '@michengai/dsh-codex-ui', '0.2.92')
await writeManifest(statusRuntimeRoot, '@deepseek-ai/dsh', '0.1.2-alpha.1')
const previousFetch = globalThis.fetch
globalThis.fetch = async input => new Response(JSON.stringify({ version: String(input).includes('@deepseek-ai') ? '0.1.2-alpha.1' : '0.2.92' }))
try {
  const statuses = await dependencyStatuses({
    environmentKind: 'desktop',
    profileName: 'desktop',
    profileDir: statusProfile,
    runtimeRoots: [statusRuntimeRoot],
  })
  assert.equal(statuses.find(status => status.id === 'ui')?.installed, true, 'Desktop profile 中已声明且存在的 Codex UI 必须显示已安装')
  assert.equal(statuses.find(status => status.id === 'dsh')?.installed, true, 'Desktop 应用内置的 DSH runtime 必须显示已安装')
  assert.equal(statuses.find(status => status.id === 'skills')?.installed, false, '当前 profile 未安装的精确包仍应显示缺失')

  const statusesWithoutRuntimePath = await dependencyStatuses({
    environmentKind: 'desktop',
    profileName: 'desktop',
    profileDir: statusProfile,
    runtimeRoots: [],
    desktopPnpm,
  })
  assert.deepEqual(
    statusesWithoutRuntimePath.find(status => status.id === 'dsh'),
    { id: 'dsh', packageName: '@deepseek-ai/dsh', installed: true, updateAvailable: false },
    'Desktop 未公开 runtime 路径时必须确认宿主 DSH 已安装，但不得伪造版本或升级状态',
  )
} finally {
  globalThis.fetch = previousFetch
  await rm(statusRoot, { recursive: true, force: true })
}

const leftoverRoot = await mkdtemp(join(tmpdir(), 'dcu-leftover-im-'))
try {
  await writeFile(join(leftoverRoot, 'package.json'), JSON.stringify({
    dsh: { profile: { bundles: ['@michengai/dsh-codex-ui'] } },
    dependencies: { '@michengai/dsh-im-connect': '0.1.29' },
  }), 'utf8')
  const leftoverIm = join(leftoverRoot, 'node_modules', '@michengai', 'dsh-im-connect')
  await mkdir(leftoverIm, { recursive: true })
  await writeFile(join(leftoverIm, 'package.json'), JSON.stringify({ name: '@michengai/dsh-im-connect', version: '0.1.27' }), 'utf8')
  const leftoverStatuses = await dependencyStatuses({
    environmentKind: 'cli',
    profileName: 'web',
    profileDir: leftoverRoot,
    runtimeRoots: [],
  })
  assert.equal(
    leftoverStatuses.find(status => status.id === 'im')?.installed,
    false,
    '未进入 bundles 的残留 IM 目录不得显示为已安装',
  )
} finally {
  await rm(leftoverRoot, { recursive: true, force: true })
}

const source = [
  'packages:',
  '  - .',
  '',
  'minimumReleaseAgeExclude:',
  "  - '@michengai/dsh-skills-manager@0.1.8'",
  "  - '@michengai/dsh-archive-manager@0.1.2'",
  '',
].join('\n')

assert.match(
  applyReleaseExclude(source, '@michengai/dsh-skills-manager', '0.1.9'),
  /@michengai\/dsh-skills-manager@0\.1\.8 \|\| 0\.1\.9/,
  '同一包的新确认版本必须合并进已有白名单行',
)
assert.equal(
  applyReleaseExclude(source, '@michengai/dsh-skills-manager', '0.1.8'),
  source,
  '重复确认同一版本时不得改写白名单',
)
assert.match(
  applyReleaseExclude('packages:\n  - .\n', '@michengai/dsh-archive-manager', '0.1.3'),
  /minimumReleaseAgeExclude:\n  - '@michengai\/dsh-archive-manager@0\.1\.3'\n/,
  '没有白名单段时必须新建精确版本例外',
)
assert.throws(
  () => applyReleaseExclude(source, '@michengai/dsh-skills-manager', "0.1.9'evil"),
  /无法识别/,
  '带单引号的版本不得写入 YAML 白名单',
)
assert.match(
  applyReleaseExclude(source, '@michengai/dsh-codex-ui', '0.2.53-rc.1'),
  /@michengai\/dsh-codex-ui@0\.2\.53-rc\.1/,
  '预发布版本仍可写入白名单',
)

assert.equal(
  applyRequiredBuildPolicies('packages:\n  - .\n'),
  'packages:\n  - .\nallowBuilds:\n  protobufjs: false\n  koffi: false\n',
  '干净 Profile 必须在安装前显式拒绝已知非必要构建脚本',
)
assert.equal(
  applyRequiredBuildPolicies('allowBuilds:\n  esbuild: true\n'),
  'allowBuilds:\n  protobufjs: false\n  koffi: false\n  esbuild: true\n',
  '已有 allowBuilds 项必须保留',
)
assert.equal(
  applyRequiredBuildPolicies('allowBuilds:\n  protobufjs: set this to true or false\n  koffi: true\n  protobufjs: false\n'),
  'allowBuilds:\n  protobufjs: false\n  koffi: false\n',
  'pnpm 占位值与重复项必须规范化成确定策略',
)

// 依赖安装 POST 端点的跨站请求判定：浏览器恶意网页可用表单跨站触发安装，
// 必须按 Sec-Fetch-Site / Origin 与 Host 的比对阻断。
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x?dependency=ui' }),
  false,
  '无 headers 的非浏览器请求必须放行',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'same-origin' } }),
  false,
  '同源 fetch 必须放行',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'none' } }),
  false,
  '地址栏直达等非页面发起的请求必须放行',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'cross-site' } }),
  true,
  '跨站请求必须拦截',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'same-site' } }),
  true,
  '同站不同源端口也必须拦截',
)
assert.equal(
  crossSiteRequest({
    method: 'POST',
    url: '/api/x?dependency=ui',
    headers: { origin: 'http://localhost:3080', host: 'localhost:3080' },
  }),
  false,
  '老浏览器同源 POST（Origin 与 Host 一致）必须放行',
)
assert.equal(
  crossSiteRequest({
    method: 'POST',
    url: '/api/x?dependency=ui',
    headers: { origin: 'https://evil.example', host: 'localhost:3080' },
  }),
  true,
  'Origin 与 Host 不一致的请求必须拦截',
)
assert.equal(
  crossSiteRequest({
    method: 'POST',
    url: '/api/x?dependency=ui',
    headers: { origin: 'null', host: 'localhost:3080' },
  }),
  true,
  'Origin 为 null 的沙盒页面请求必须拦截',
)

assert.equal(
  publicDependencyError(new Error('从 npm 安装或更新依赖失败。请检查网络、npm registry 或发布时间保护后重试。')),
  '从 npm 安装或更新依赖失败。请检查网络、npm registry 或发布时间保护后重试。',
  '安装失败的安全文案必须回给浏览器',
)
assert.equal(
  publicDependencyError(new Error("ENOENT: no such file or directory, open 'C:\\\\Users\\\\demo\\\\.dsh\\\\profiles\\\\web\\\\package.json'")),
  '依赖管理暂不可用，请查看服务端日志。',
  '带本地路径的底层错误不得回传浏览器',
)

assert.equal(
  isManagedPackageInstalled({ installedVersion: '0.2.56', declared: true }),
  true,
  '声明仍在且磁盘有版本，视为已安装',
)
assert.equal(
  isManagedPackageInstalled({ installedVersion: undefined, declared: true }),
  false,
  '声明在但磁盘没有包，视为未安装',
)
assert.equal(
  isManagedPackageInstalled({ installedVersion: '0.1.20', declared: false }),
  false,
  '卸载后残留的 node_modules 不得标已安装',
)

assert.deepEqual(
  pluginsToRemoveBeforeInstall(['@michengai/dsh-codex-suite'], '@michengai/dsh-codex-ui'),
  ['@michengai/dsh-codex-suite'],
  '单独更新子插件前必须卸掉套件，避免两套 patch',
)
assert.deepEqual(
  pluginsToRemoveBeforeInstall(['@michengai/dsh-codex-ui'], '@michengai/dsh-codex-ui'),
  [],
  '只装子插件时无需先卸载',
)
assert.deepEqual(
  resolveDshPluginTarget('@michengai/dsh-codex-ui', ['@michengai/dsh-codex-suite']),
  '@michengai/dsh-codex-ui',
  '已装套件时仍更新用户点的那个子插件',
)
assert.deepEqual(
  resolveDshPluginTarget('dshmarket', ['@michengai/dsh-codex-suite']),
  'dshmarket',
  '插件市场不在套件内，仍单独安装',
)
assert.equal(
  isManagedPackageDeclared('@michengai/dsh-skills-manager', ['@michengai/dsh-codex-suite']),
  true,
  '旧 Suite 声明存在时，其成员必须显示真实安装状态以便迁移',
)
assert.equal(
  isManagedPackageDeclared('@michengai/dsh-skills-manager', []),
  false,
  '无直接声明也无 Suite 所有权时不得把残留包算作已声明',
)
assert.deepEqual(
  directPackagesForInstall(['@michengai/dsh-codex-ui'], ['@michengai/dsh-codex-suite']),
  [
    '@michengai/dsh-archive-manager',
    '@michengai/dsh-codex-ui',
    '@michengai/dsh-skills-manager',
    '@michengai/dsh-agency-agents',
    '@michengai/dsh-im-connect',
    '@michengai/dsh-automation',
  ],
  '更新旧 Suite 中任一成员时必须把整套成员提升为直接依赖',
)
assert.deepEqual(
  directPackagesForInstall(['@michengai/dsh-codex-ui'], []),
  ['@michengai/dsh-codex-ui'],
  '普通独立安装不得隐式安装其他成员',
)
assert.deepEqual(
  updatableDependencyIds([
    { id: 'ui', packageName: '@michengai/dsh-codex-ui', installed: true, version: '0.2.79', latestVersion: '0.2.80', updateAvailable: true },
    { id: 'skills', packageName: '@michengai/dsh-skills-manager', installed: true, version: '0.1.24', latestVersion: '0.1.24', updateAvailable: false },
    { id: 'archive', packageName: '@michengai/dsh-archive-manager', installed: false, latestVersion: '0.1.14', updateAvailable: true },
  ]),
  ['ui', 'archive'],
  '一键安装/更新必须同时包含缺失插件与存在新版本的插件',
)
assert.match(
  pluginCommandError('EPERM: unlink failed').message,
  /完全退出桌面端/,
  '文件占用必须提示先退出桌面端',
)
assert.match(
  pluginCommandError('ERR_PNPM_UNEXPECTED_STORE Unexpected store location').message,
  /pnpm 仓库不一致/,
  'store 不一致必须给出明确原因',
)
assert.match(
  pluginCommandError('ERR_PNPM_IGNORED_BUILDS Ignored build scripts: protobufjs').message,
  /allowBuilds/,
  '未知构建脚本再次触发拦截时必须给出准确配置提示',
)
assert.match(
  pluginCommandError('pnpm not found on PATH').message,
  /找不到 pnpm/,
  '英文 pnpm 缺失必须给出明确提示',
)
assert.match(
  pluginCommandError('未找到 pnpm 入口，无法执行插件操作。').message,
  /找不到 pnpm/,
  'Desktop 桥接缺少 pnpm 入口时必须给出明确提示，不得误报成退出桌面端',
)
assert.equal(isRestartableInstallError(new Error('无法覆盖正在运行的插件文件。请先完全退出桌面端，再重新打开后更新。')), true)
assert.match(
  pluginUnchangedError().message,
  /没有进入当前 Profile/,
  '命令成功但未写入 bundles 时必须给出明确失败',
)
assert.doesNotMatch(
  readFileSync(new URL('../src/dependency-manager.ts', import.meta.url), 'utf8'),
  /isRestartableInstallError\(error\)\) return dependencyStatuses/,
  '文件占用不得假装安装成功并返回当前状态',
)

beginInstallProgress('@michengai/dsh-im-connect@0.1.29')
noteInstallOutput('Progress: resolved 91, reused 90, downloaded 1, added 45\n')
{
  const snapshot = installProgressSnapshot()
  assert.equal(snapshot.active, true, '安装过程中进度必须标记为进行中')
  assert.equal(snapshot.target, '@michengai/dsh-im-connect@0.1.29')
  assert.equal(snapshot.total, 91)
  assert.equal(snapshot.done, 45)
  assert.equal(snapshot.percent, 49)
  assert.match(snapshot.lastLine, /resolved 91/)
}
endInstallProgress()
assert.equal(installProgressSnapshot().active, false, '安装结束后进度必须结束')

beginInstallProgress('dshmarket@1.38.1')
noteInstallOutput('Progress: resolved 95, reused 91, downloaded 0, added 4\nDone in 1.4s using pnpm v11.24.0\n')
assert.equal(installProgressSnapshot().percent, 100, 'pnpm Done 行必须把进度收成完成')
assert.match(installProgressSnapshot().lastLine, /Done in 1\.4s/)
endInstallProgress()

beginInstallProgress('dshmarket@1.38.1')
noteInstallOutput('未找到 pnpm 命令，无法执行插件操作')
endInstallProgress()
assert.match(installProgressSnapshot().lastLine, /未找到 pnpm/, '没有换行的最后一行输出也必须进入进度快照')

assert.deepEqual(
  pluginToolSearchDirs('win32', {
    PNPM_HOME: 'D:\\pnpm',
    LOCALAPPDATA: 'C:\\Local',
    APPDATA: 'C:\\Roaming',
  }, 'C:\\Users\\me', 'D:\\Tools\\nodejs'),
  ['D:\\pnpm', join('C:\\Local', 'pnpm'), join('C:\\Roaming', 'npm'), 'D:\\Tools\\nodejs'],
  'Windows 必须把独立安装器和 npm 全局目录补进 PATH',
)
{
  const env = pluginSpawnEnv({
    PATH: 'C:\\Windows\\system32',
    PNPM_HOME: 'D:\\pnpm',
    LOCALAPPDATA: 'C:\\Local',
    APPDATA: 'C:\\Roaming',
  }, 'win32', 'C:\\Users\\me', 'D:\\Tools\\nodejs')
  assert.match(env.PATH ?? '', /D:\\pnpm/, '安装子进程必须能找到 PNPM_HOME')
  assert.match(env.PATH ?? '', /nodejs/, '安装子进程必须能找到当前 Node 目录下的 pnpm')
  assert.equal(env.CI, 'true')
}

{
  const env: NodeJS.ProcessEnv = { DSH_PNPM_ENTRY: 'C:\\bundled\\pnpm.cjs' }
  assert.equal(ensurePnpmEntry(env, 'D:\\missing-node'), 'C:\\bundled\\pnpm.cjs', '已有桌面 pnpm 入口不得被覆盖')
}
{
  const corepackRoot = await mkdtemp(join(tmpdir(), 'dcu-corepack-'))
  await mkdir(join(corepackRoot, 'node_modules', 'corepack', 'dist'), { recursive: true })
  const candidate = join(corepackRoot, 'node_modules', 'corepack', 'dist', 'pnpm.js')
  await writeFile(candidate, '')
  const env: NodeJS.ProcessEnv = { npm_execpath: 'C:\\node_modules\\npm\\bin\\npm-cli.js' }
  assert.equal(ensurePnpmEntry(env, corepackRoot), candidate, 'Web 下的 Desktop 桥接必须能找到 Node 自带的 corepack pnpm')
  assert.equal(env.DSH_PNPM_ENTRY, undefined, '解析 pnpm 入口不得改写调用方环境')
  let observedEntry
  assert.equal(withPnpmEntry(() => {
    observedEntry = env.DSH_PNPM_ENTRY
    return 'called'
  }, env, corepackRoot), 'called')
  assert.equal(observedEntry, candidate, '调用 Desktop 桥接时必须临时提供 pnpm 入口')
  assert.equal(env.DSH_PNPM_ENTRY, undefined, 'Desktop 桥接调用返回后必须恢复环境')
  await rm(corepackRoot, { recursive: true, force: true })
}

assert.ok(PLUGIN_MOUNT_TIMEOUT_MS >= 15_000, '等待 Desktop 写入 bundles 至少保留 15 秒')
assert.equal(requestDesktopHotUpdate(undefined), false)
let sent
assert.equal(requestDesktopHotUpdate((message) => { sent = message; return true }), true)
assert.equal(sent, 'apply-plugin-updates')


assert.equal(isOfficialRuntimePackage('@deepseek-ai/dsh'), true)
assert.equal(isOfficialRuntimePackage('@michengai/dsh-codex-ui'), false)
assert.equal(newerVersion('0.1.0-rc.7', '0.1.0-rc.8'), true, '同号 rc 必须能看出可升级')
assert.equal(newerVersion('0.1.0-rc.8', '0.1.0-rc.7'), false, '不得把更旧的 rc 当成升级')
assert.equal(newerVersion('0.1.0-beta.1', '0.1.0-beta.2'), true, '同号 beta 必须能看出可升级')
assert.equal(newerVersion('0.1.0-alpha.9', '0.1.0-beta.1'), true, '预发布标识必须按 SemVer 比较')
assert.equal(newerVersion('0.1.0-rc.1', '0.1.0'), true, '正式版必须高于同号预发布版')
assert.equal(newerVersion('0.1.0', '0.1.0-rc.1'), false, '不得把同号预发布版推荐给正式版用户')
assert.equal(newerVersion('0.1.0+build.1', '0.1.0+build.2'), false, '构建元数据不得影响版本先后')
assert.equal(supportsOfficialTurnNavigator('0.1.2-alpha.1'), false, 'alpha.1 尚无官方轮次导航')
assert.equal(supportsOfficialTurnNavigator('0.1.2-alpha.2'), true, 'alpha.2 起必须关闭旧版轮次导航')
assert.equal(supportsOfficialTurnNavigator('0.1.2-alpha.3'), true, '后续兼容版本必须保持官方导航能力')
assert.equal(supportsOfficialTurnNavigator('invalid'), false, '未知版本不得误报官方导航能力')
assert.deepEqual(pluginExecArgv(['--inspect=9229', '--trace-warnings', '--inspect-brk']), ['--trace-warnings'], '安装子进程不得继承调试端口参数')

function fakeChild(): ChildProcess & { killedSignal?: NodeJS.Signals | number } {
  const child = new EventEmitter() as ChildProcess & { killedSignal?: NodeJS.Signals | number }
  Object.assign(child, {
    stdout: null,
    stderr: null,
    exitCode: null,
    killed: false,
    kill(signal: NodeJS.Signals | number = 'SIGTERM') {
      child.killedSignal = signal
      ;(child as unknown as { killed: boolean }).killed = true
      return true
    },
  })
  return child
}

{
  const child = fakeChild()
  const keepAlive = setTimeout(() => {}, 50)
  await assert.rejects(monitorPluginChild(child, 5), /安装超时/, '安装子进程超时必须拒绝并释放互斥流程')
  clearTimeout(keepAlive)
  assert.equal(child.killedSignal, 'SIGTERM', '超时必须终止子进程')
}
{
  const child = fakeChild()
  const result = monitorPluginChild(child, 1_000)
  child.emit('error', new Error('spawn failed'))
  child.emit('exit', 1, null)
  await assert.rejects(result, /无法启动 DSH/, 'error 与 exit 连续到达时 Promise 只能由首个错误结算')
}
