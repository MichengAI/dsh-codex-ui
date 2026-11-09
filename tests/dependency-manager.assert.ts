import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import {
  beginInstallProgress,
  dependencyStatuses,
  directPackagesForInstall,
  endInstallProgress,
  installDependency,
  installProgressSnapshot,
  isManagedPackageDeclared,
  isManagedPackageInstalled,
  isOfficialRuntimePackage,
  newerVersion,
  noteHostInstallState,
  noteInstallOutput,
  pluginsToRemoveBeforeInstall,
  resolveDependencyRuntime,
  resolveDshPluginTarget,
  updatableDependencyIds,
} from '../src/dependency-manager.ts'
import { publicDependencyError } from '../src/index.ts'

const desktopProfileDir = resolve('fixtures', 'desktop-profile')
const desktopRuntimeDir = resolve('fixtures', 'desktop-runtime')
const desktopServices = new Map<string, unknown>([
  ['desktopProfiles', { current: { name: 'desktop', dir: desktopProfileDir } }],
])
const desktopRuntime = resolveDependencyRuntime({ get: name => desktopServices.get(name) }, {
  env: { DSH_RUNTIME_DIR: desktopRuntimeDir },
  argv: ['/app'],
  homeDir: resolve('fixtures', 'home'),
})
assert.equal(desktopRuntime.environmentKind, 'desktop')
assert.equal(desktopRuntime.profileName, 'desktop')
assert.equal(desktopRuntime.profileDir, desktopProfileDir, 'Desktop 必须读取 Host 当前 profile，而不是回退到 web')
assert.deepEqual(desktopRuntime.runtimeRoots, [desktopRuntimeDir], 'Desktop 提供的 DSH_RUNTIME_DIR 必须继续用于运行时版本检测')

const customRuntime = resolveDependencyRuntime(undefined, {
  env: { DSH_PROFILE_DIR: resolve('fixtures', 'profiles', 'custom') },
  argv: ['/node', 'bin.mjs', '--profile', 'custom'],
  homeDir: resolve('fixtures', 'home'),
})
assert.equal(customRuntime.environmentKind, 'cli')
assert.equal(customRuntime.profileName, 'custom')
assert.equal(customRuntime.profileDir, resolve('fixtures', 'profiles', 'custom'), '普通 Web/CLI 必须继续尊重 DSH_PROFILE_DIR')

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
  assert.equal(statuses.some(status => status.packageName === '@deepseek-ai/dsh'), false, '插件清单不应包含 DSH runtime')
  assert.equal(statuses.find(status => status.id === 'skills')?.installed, false, '当前 profile 未安装的精确包仍应显示缺失')
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

assert.equal(
  publicDependencyError(new Error('从 npm 安装或更新依赖失败。请检查网络或 npm registry 后重试。')),
  '从 npm 安装或更新依赖失败。请检查网络或 npm registry 后重试。',
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
assert.equal(isOfficialRuntimePackage('@deepseek-ai/dsh'), true)
assert.equal(isOfficialRuntimePackage('@michengai/dsh-codex-ui'), false)
assert.equal(newerVersion('0.1.0-rc.7', '0.1.0-rc.8'), true, '同号 rc 必须能看出可升级')
assert.equal(newerVersion('0.1.0-rc.8', '0.1.0-rc.7'), false, '不得把更旧的 rc 当成升级')
assert.equal(newerVersion('0.1.0-beta.1', '0.1.0-beta.2'), true, '同号 beta 必须能看出可升级')
assert.equal(newerVersion('0.1.0-alpha.9', '0.1.0-beta.1'), true, '预发布标识必须按 SemVer 比较')
assert.equal(newerVersion('0.1.0-rc.1', '0.1.0'), true, '正式版必须高于同号预发布版')
assert.equal(newerVersion('0.1.0', '0.1.0-rc.1'), false, '不得把同号预发布版推荐给正式版用户')
assert.equal(newerVersion('0.1.0+build.1', '0.1.0+build.2'), false, '构建元数据不得影响版本先后')

// 验证宿主官方 plugin-manager/install-state 广播阶段接收与状态对齐
beginInstallProgress('@michengai/dsh-agency-agents@latest')
noteHostInstallState({ phase: 'resolving', requestId: 'req-1' })
assert.equal(installProgressSnapshot().phase, 'resolving', '官方 resolving 广播必须正确写入安装阶段')
noteHostInstallState({ phase: 'downloading', attempt: 1 })
assert.equal(installProgressSnapshot().phase, 'downloading', '官方 downloading 广播必须正确写入安装阶段')
noteHostInstallState({ phase: 'linking' })
assert.equal(installProgressSnapshot().phase, 'linking', '官方 linking 广播必须正确写入安装阶段')
noteHostInstallState({ phase: 'building' })
assert.equal(installProgressSnapshot().phase, 'building', '官方 building 广播必须正确写入安装阶段')
noteHostInstallState({ phase: 'unknown-phase' })
assert.equal(installProgressSnapshot().phase, 'building', '未知广播阶段不得污染现有状态')
noteHostInstallState(null)
assert.equal(installProgressSnapshot().phase, 'building', '空广播不得导致异常')
endInstallProgress()

// 验证宿主官方 pluginManager 服务注入与探测
const mockPluginManager = {
  installBundle: async (spec: string) => ({ status: 'ok', spec }),
  updateBundle: async (name: string, version: string) => ({ status: 'ok', name, version }),
  listBundles: async () => ({ status: 'ok', data: [] }),
}
const runtimeWithPluginManager = resolveDependencyRuntime({
  get: (name: string) => name === 'pluginManager' ? mockPluginManager : undefined,
})
assert.equal(runtimeWithPluginManager.pluginManager, mockPluginManager, '宿主 pluginManager 服务必须透传至 DependencyRuntime')

// 验证真实委托执行：当 pluginManager 存在时，installDependency 委托调用宿主方法
const delegateRoot = await mkdtemp(join(tmpdir(), 'dcu-delegate-test-'))
try {
  await writeFile(join(delegateRoot, 'package.json'), JSON.stringify({
    dsh: { profile: { bundles: ['@michengai/dsh-agency-agents'] } },
    dependencies: { '@michengai/dsh-agency-agents': '0.1.0' },
  }), 'utf8')
  await writeManifest(delegateRoot, '@michengai/dsh-agency-agents', '0.1.0')
  const calls: string[] = []
  const trackingPluginManager = {
    installBundle: async (spec: string) => {
      calls.push(`install:${spec}`)
      const at = spec.lastIndexOf('@')
      const name = at > 0 ? spec.slice(0, at) : spec
      const version = at > 0 ? spec.slice(at + 1) : '1.0.0'
      const current = JSON.parse(readFileSync(join(delegateRoot, 'package.json'), 'utf8')) as { dsh: { profile: { bundles: string[] } } }
      if (!current.dsh.profile.bundles.includes(name)) current.dsh.profile.bundles.push(name)
      await writeFile(join(delegateRoot, 'package.json'), JSON.stringify(current), 'utf8')
      const dir = join(delegateRoot, 'node_modules', ...name.split('/'))
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'package.json'), JSON.stringify({ name, version }), 'utf8')
      return { changed: true, application: 'applied', stage: 'enable', target: spec }
    },
    updateBundle: async (name: string, version: string) => {
      calls.push(`update:${name}@${version}`)
      const dir = join(delegateRoot, 'node_modules', ...name.split('/'))
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'package.json'), JSON.stringify({ name, version }), 'utf8')
      return { from: '0.1.0', to: version, step: 'install', result: { changed: true, application: 'applied', stage: 'enable', target: name } }
    },
    listBundles: async () => ({ status: 'ok', data: [] }),
  }
  const delegateRuntime = {
    environmentKind: 'cli' as const,
    profileName: 'web',
    profileDir: delegateRoot,
    runtimeRoots: [],
    pluginManager: trackingPluginManager,
  }
  const prevFetch = globalThis.fetch
  globalThis.fetch = async (url) => new Response(JSON.stringify({ version: '1.0.0' }))
  try {
    await installDependency('schedule', delegateRuntime)
    assert.equal(calls.some(call => call.startsWith('install:@michengai/dsh-automation@')), true, '未声明依赖必须通过宿主 installBundle 安装')

    calls.length = 0
    await installDependency('experts', delegateRuntime)
    assert.equal(calls.some(call => call.startsWith('update:@michengai/dsh-agency-agents@')), true, '已声明依赖必须优先通过宿主 updateBundle 升级')
  } finally {
    globalThis.fetch = prevFetch
  }

  // 严禁任何自建包管理兜底：没有 pluginManager 时必须直接抛错拒绝！
  const runtimeWithoutPluginManager = {
    environmentKind: 'cli' as const,
    profileName: 'web',
    profileDir: delegateRoot,
    runtimeRoots: [],
  }
  await assert.rejects(
    installDependency('schedule', runtimeWithoutPluginManager),
    /DSH 宿主插件管理服务尚未就绪/,
    '没有官方插件管理服务时必须直接拒绝，严禁自建包管理兜底',
  )
} finally {
  await rm(delegateRoot, { recursive: true, force: true })
}
