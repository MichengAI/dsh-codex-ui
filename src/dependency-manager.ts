import { existsSync, readFileSync } from 'node:fs'
import { readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { npmTotalDownloads } from './npm-downloads.ts'
import { MANAGED_DEPENDENCIES, SUITE_MEMBER_PACKAGES, SUITE_PACKAGE, managedDependency, type ManagedDependencyId } from './dependencies.ts'

export const PROFILE_PENDING_UPDATES_FILE = '.dsh-pending-updates.json'
export const PLUGIN_MOUNT_TIMEOUT_MS = 15_000

type PackageManifest = { version?: string }

export type DependencyStatus = {
  id: ManagedDependencyId
  packageName: string
  installed: boolean
  version?: string
  latestVersion?: string
  totalDownloads?: number
  updateAvailable: boolean
}

type OptionalServiceContext = {
  get?: (name: string) => unknown
}

type DesktopProfilesService = {
  current?: { name?: unknown; dir?: unknown }
}

export type PluginManagerHostService = {
  installBundle?: (spec: string, options?: { requestId?: string; registry?: string; approvedBuilds?: Record<string, boolean> }) => Promise<unknown>
  updateBundle?: (name: string, version: string, options?: { requestId?: string }) => Promise<unknown>
  listBundles?: () => Promise<{ status: string; data?: Array<{ name: string; version?: string; installed: boolean }> }>
}

export type DependencyRuntime = {
  environmentKind: 'desktop' | 'cli'
  profileName: string
  profileDir: string
  runtimeRoots: readonly string[]
  /** 官方插件管理服务：全面由宿主原生处理依赖安装与版本升级。 */
  pluginManager?: PluginManagerHostService
}

type LaunchedProfileService = {
  name?: unknown
  dir?: unknown
}

export type DependencyRuntimeOptions = {
  env?: NodeJS.ProcessEnv
  argv?: readonly string[]
  cwd?: string
  homeDir?: string
}

function optionalService<T>(ctx: OptionalServiceContext | undefined, name: string): T | undefined {
  if (ctx === undefined) return undefined
  return (typeof ctx.get === 'function' ? ctx.get(name) : (ctx as Record<string, unknown>)[name]) as T | undefined
}

function validProfileName(value: unknown): value is string {
  return typeof value === 'string' && value !== '' && value !== '.' && value !== '..'
    && value !== 'node_modules' && !value.includes('/') && !value.includes('\\') && !/[\0-\x1f\x7f]/.test(value)
}

function profileNameFromArgv(argv: readonly string[]): string | undefined {
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--profile') return argv[index + 1]
    if (argument?.startsWith('--profile=')) return argument.slice('--profile='.length)
  }
  return argv[2] === 'web' ? 'web' : undefined
}

/**
 * 运行时解析：优先通过宿主 service 提取当前 Profile 与官方 pluginManager 服务，
 * 不再自建 CLI 探测与包管理 spawn。
 */
export function resolveDependencyRuntime(ctx?: OptionalServiceContext, options: DependencyRuntimeOptions = {}): DependencyRuntime {
  const env = options.env ?? process.env
  const argv = options.argv ?? process.argv
  const home = options.homeDir ?? homedir()
  const profiles = optionalService<DesktopProfilesService>(ctx, 'desktopProfiles')
  const pluginManager = optionalService<PluginManagerHostService>(ctx, 'pluginManager')
  if (profiles !== undefined) {
    const current = profiles.current
    if (!validProfileName(current?.name) || typeof current.dir !== 'string' || !isAbsolute(current.dir)) {
      throw new Error('DSH Desktop 当前 Profile 信息无效，请重启 Desktop 后重试。')
    }
    const profileDir = resolve(current.dir)
    const runtimeRoots = typeof env.DSH_RUNTIME_DIR === 'string' && isAbsolute(env.DSH_RUNTIME_DIR)
      ? [resolve(env.DSH_RUNTIME_DIR)]
      : []
    return {
      environmentKind: 'desktop',
      profileName: current.name,
      profileDir,
      runtimeRoots,
      ...(pluginManager === undefined ? {} : { pluginManager }),
    }
  }
  const launched = optionalService<LaunchedProfileService>(ctx, 'profileContext')
  const launchedDir = typeof launched?.dir === 'string' && isAbsolute(launched.dir) ? resolve(launched.dir) : undefined
  const launchedName = validProfileName(launched?.name) ? launched.name : undefined
  const profileDir = launchedDir ?? resolve(env.DSH_PROFILE_DIR ?? resolve(home, '.dsh', 'profiles', 'web'))
  const selected = profileNameFromArgv(argv)
  const profileName = launchedName ?? (validProfileName(selected) ? selected : validProfileName(basename(profileDir)) ? basename(profileDir) : 'web')
  const runtimeRoots = [env.DSH_RUNTIME_DIR].filter((root): root is string => root !== undefined && root !== '')
  return {
    environmentKind: 'cli',
    profileName,
    profileDir,
    runtimeRoots,
    ...(pluginManager === undefined ? {} : { pluginManager }),
  }
}

function profileDirectory(runtime: DependencyRuntime): string {
  return runtime.profileDir
}

export async function removeUnmountedPackagePath(packageName: string, runtime: DependencyRuntime): Promise<void> {
  const directory = profileDirectory(runtime)
  const target = join(directory, 'node_modules', ...packageName.split('/'))
  if (!existsSync(target)) return
  try {
    await unlink(target)
    return
  } catch {
    // 不是软链接或无法 unlink 时尝试 rm
  }
  await rm(target, { recursive: true, force: true })
}

export function pluginsToRemoveBeforeInstall(declared: readonly string[], installingPackage: string): readonly string[] {
  if (installingPackage === SUITE_PACKAGE) return []
  return declared.includes(SUITE_PACKAGE) ? [SUITE_PACKAGE] : []
}

export function resolveDshPluginTarget(installing: string, _declared: readonly string[]): string {
  return installing
}

export function isOfficialRuntimePackage(packageName: string): boolean {
  return packageName === '@deepseek-ai/dsh'
}

/** 卸载后残留的 node_modules 在 bundles 清除后不得继续标为已安装。 */
export function isManagedPackageInstalled(input: { installedVersion: string | undefined; declared: boolean }): boolean {
  return input.declared && input.installedVersion !== undefined
}

/** 旧 Suite 对其六个成员拥有声明权；迁移成直接依赖前也应显示真实安装版本。 */
export function isManagedPackageDeclared(packageName: string, declared: readonly string[]): boolean {
  return declared.includes(packageName) || (declared.includes(SUITE_PACKAGE) && (SUITE_MEMBER_PACKAGES as readonly string[]).includes(packageName))
}

/** 更新旧 Suite 中任一成员时，必须一次提升全部成员，避免移除 Suite 后只剩一个插件。 */
export function directPackagesForInstall(requested: readonly string[], declared: readonly string[]): readonly string[] {
  const migrateSuite = declared.includes(SUITE_PACKAGE) && requested.some((packageName) => (SUITE_MEMBER_PACKAGES as readonly string[]).includes(packageName))
  return [...new Set(migrateSuite ? [...SUITE_MEMBER_PACKAGES, ...requested] : requested)]
}

function parseSemver(version: string): { major: number; minor: number; patch: number; prerelease: string } | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version.trim())
  if (!match) return undefined
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? '',
  }
}

function comparePrerelease(a: string, b: string): number {
  if (a === '' && b === '') return 0
  if (a === '') return 1
  if (b === '') return -1
  const partsA = a.split('.')
  const partsB = b.split('.')
  const len = Math.max(partsA.length, partsB.length)
  for (let i = 0; i < len; i += 1) {
    const itemA = partsA[i]
    const itemB = partsB[i]
    if (itemA === undefined) return -1
    if (itemB === undefined) return 1
    const isNumA = /^\d+$/.test(itemA)
    const isNumB = /^\d+$/.test(itemB)
    if (isNumA && isNumB) {
      const numA = Number(itemA)
      const numB = Number(itemB)
      if (numA !== numB) return numA > numB ? 1 : -1
      continue
    }
    if (isNumA && !isNumB) return -1
    if (!isNumA && isNumB) return 1
    if (itemA !== itemB) return itemA > itemB ? 1 : -1
  }
  return 0
}

export function newerVersion(installed: string, latest: string): boolean {
  const parsedInstalled = parseSemver(installed)
  const parsedLatest = parseSemver(latest)
  if (!parsedInstalled || !parsedLatest) return false
  if (parsedLatest.major !== parsedInstalled.major) return parsedLatest.major > parsedInstalled.major
  if (parsedLatest.minor !== parsedInstalled.minor) return parsedLatest.minor > parsedInstalled.minor
  if (parsedLatest.patch !== parsedInstalled.patch) return parsedLatest.patch > parsedInstalled.patch
  return comparePrerelease(parsedLatest.prerelease, parsedInstalled.prerelease) > 0
}

async function npmLatestVersion(packageName: string): Promise<string | undefined> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) return undefined
    const data = await response.json() as { version?: unknown }
    return typeof data.version === 'string' && data.version !== '' ? data.version : undefined
  } catch {
    return undefined
  }
}

async function profileBundleNames(runtime: DependencyRuntime): Promise<readonly string[]> {
  const directory = profileDirectory(runtime)
  const manifestPath = join(directory, 'package.json')
  if (!existsSync(manifestPath)) return []
  try {
    const content = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      dsh?: { profile?: { bundles?: unknown } }
    }
    const bundles = content.dsh?.profile?.bundles
    return Array.isArray(bundles) && bundles.every(b => typeof b === 'string') ? bundles : []
  } catch {
    return []
  }
}

async function declaredPluginNames(runtime: DependencyRuntime): Promise<readonly string[]> {
  const bundles = await profileBundleNames(runtime)
  const directory = profileDirectory(runtime)
  const manifestPath = join(directory, 'package.json')
  if (!existsSync(manifestPath)) return bundles
  try {
    const content = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      dependencies?: unknown
    }
    const deps = content.dependencies
    const names = deps !== null && typeof deps === 'object' ? Object.keys(deps) : []
    return [...new Set([...bundles, ...names])]
  } catch {
    return bundles
  }
}

async function installedPackageVersion(packageName: string, runtime: DependencyRuntime): Promise<string | undefined> {
  const directory = profileDirectory(runtime)
  const candidate = join(directory, 'node_modules', ...packageName.split('/'), 'package.json')
  if (existsSync(candidate)) {
    try {
      const manifest = JSON.parse(await readFile(candidate, 'utf8')) as PackageManifest
      if (typeof manifest.version === 'string' && manifest.version !== '') return manifest.version
    } catch {
      // 忽略损坏的 package.json
    }
  }
  return undefined
}

export async function dependencyStatuses(runtime: DependencyRuntime = resolveDependencyRuntime()): Promise<readonly DependencyStatus[]> {
  const bundles = await profileBundleNames(runtime)
  return Promise.all(MANAGED_DEPENDENCIES.map(async (item) => {
    const [installedVersion, latestVersion, totalDownloads] = await Promise.all([
      installedPackageVersion(item.packageName, runtime),
      npmLatestVersion(item.packageName),
      npmTotalDownloads(item.packageName),
    ])
    const declared = isManagedPackageDeclared(item.packageName, bundles)
    const installed = isManagedPackageInstalled({ installedVersion, declared })
    const updateAvailable = installed && installedVersion !== undefined && latestVersion !== undefined
      ? newerVersion(installedVersion, latestVersion)
      : false
    return {
      id: item.id,
      packageName: item.packageName,
      installed,
      version: installed ? installedVersion : undefined,
      latestVersion,
      totalDownloads,
      updateAvailable,
    }
  }))
}

export type InstallProgressPhase = 'resolving' | 'downloading' | 'linking' | 'building'

export type InstallProgressView = {
  active: boolean
  target: string
  seconds: number
  lastLine: string
  phase: InstallProgressPhase | null
  done: number
  total: number | null
  percent: number | null
  currentPackage: string | null
}

const progressState = {
  active: false,
  target: '',
  startedAt: 0,
  seconds: 0,
  lastLine: '',
  phase: null as InstallProgressPhase | null,
  done: 0,
  total: null as number | null,
  percent: null as number | null,
  currentPackage: null as string | null,
}

export function beginInstallProgress(target: string): void {
  progressState.active = true
  progressState.target = target
  progressState.startedAt = Date.now()
  progressState.seconds = 0
  progressState.lastLine = ''
  progressState.phase = 'resolving'
  progressState.done = 0
  progressState.total = null
  progressState.percent = null
  progressState.currentPackage = null
}

export function endInstallProgress(): void {
  progressState.active = false
}

export function installProgressSnapshot(): InstallProgressView {
  return {
    active: progressState.active,
    target: progressState.target,
    seconds: progressState.active && progressState.startedAt > 0
      ? Math.max(0, Math.round((Date.now() - progressState.startedAt) / 1000))
      : 0,
    lastLine: progressState.lastLine,
    phase: progressState.phase,
    done: progressState.done,
    total: progressState.total,
    percent: progressState.percent,
    currentPackage: progressState.currentPackage,
  }
}

/** 接收宿主官方 plugin-manager/install-state 广播事件，对齐官方安装进度阶段。 */
export function noteHostInstallState(event: unknown): void {
  if (event === null || typeof event !== 'object') return
  const data = event as { phase?: unknown; attempt?: unknown }
  if (typeof data.phase === 'string') {
    if (data.phase === 'resolving' || data.phase === 'downloading' || data.phase === 'linking' || data.phase === 'building') {
      progressState.phase = data.phase
    }
  }
}

export function noteInstallOutput(chunk: string): void {
  if (chunk === '') return
  const trimmed = chunk.trim()
  if (trimmed !== '') progressState.lastLine = trimmed.slice(0, 200)
}

export function pluginUnchangedError(): Error {
  return new Error('安装命令已结束，但插件没有进入当前 Profile。请重试。')
}

async function waitUntilPluginMounted(
  packageName: string,
  version: string,
  runtime: DependencyRuntime,
  timeoutMs = PLUGIN_MOUNT_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() <= deadline) {
    const bundles = await profileBundleNames(runtime)
    const inBundles = isOfficialRuntimePackage(packageName) || isManagedPackageDeclared(packageName, bundles)
    const installed = await installedPackageVersion(packageName, runtime)
    if (inBundles && installed === version) return
    await new Promise(resolve => setTimeout(resolve, 80))
  }
  throw pluginUnchangedError()
}

let installing = false

export async function installDependency(
  id: string | null,
  runtime: DependencyRuntime = resolveDependencyRuntime(),
): Promise<readonly DependencyStatus[]> {
  if (installing) throw new Error('已有依赖安装正在进行，请等待完成后再试。')
  installing = true
  try {
    return await installDependenciesLocked([id], runtime)
  } finally {
    installing = false
  }
}

export type UpdateAllDependenciesResult = {
  dependencies: readonly DependencyStatus[]
  updatedCount: number
}

/** 顶部批量操作同时安装缺失插件并更新落后版本。 */
export function updatableDependencyIds(statuses: readonly DependencyStatus[]): ManagedDependencyId[] {
  return statuses.filter(status => !status.installed || status.updateAvailable).map(status => status.id)
}

export async function updateAllDependencies(
  runtime: DependencyRuntime = resolveDependencyRuntime(),
): Promise<UpdateAllDependenciesResult> {
  if (installing) throw new Error('已有依赖安装正在进行，请等待完成后再试。')
  installing = true
  try {
    const current = await dependencyStatuses(runtime)
    const ids = updatableDependencyIds(current)
    if (ids.length === 0) return { dependencies: current, updatedCount: 0 }
    const dependencies = await installDependenciesLocked(ids, runtime)
    return { dependencies, updatedCount: ids.length }
  } finally {
    installing = false
  }
}

export type HostPluginOperations = {
  runPluginCommand: (context: unknown, args: readonly string[], options: unknown) => Promise<{ exitCode: number | null; output: string }>
}

export async function resolveHostPluginOperations(runtime: DependencyRuntime): Promise<HostPluginOperations | undefined> {
  if (runtime.runtimeRoots.length === 0) return undefined
  const candidates = [
    ...runtime.runtimeRoots.map(root => resolve(root, '..')),
    dirname(process.execPath),
    resolve(dirname(process.execPath), '..'),
    'D:/Tools/nodejs/node_global/node_modules/@deepseek-ai/dsh',
    'C:/Tools/nodejs/node_global/node_modules/@deepseek-ai/dsh',
  ]
  for (const candidate of candidates) {
    const file = resolve(candidate, 'node_modules', '@deepseek-ai', 'dsh-plugin-manager', 'lib', 'types', 'operations.js')
    if (existsSync(file)) {
      try {
        const mod = await import(pathToFileURL(file).href)
        if (typeof mod.runPluginCommand === 'function') return mod as HostPluginOperations
      } catch {
        // ignore
      }
    }
  }
  return undefined
}

async function installDependenciesLocked(
  ids: readonly (string | null)[],
  runtime: DependencyRuntime,
): Promise<readonly DependencyStatus[]> {
  const ops = await resolveHostPluginOperations(runtime)
  if (typeof runtime.pluginManager?.installBundle !== 'function' && typeof ops?.runPluginCommand !== 'function') {
    throw new Error('DSH 宿主插件管理服务尚未就绪，请重启 DSH 后重试。')
  }
  const dependencies = [...new Set(ids)].map((id) => {
    const dependency = managedDependency(id)
    if (dependency === undefined) throw new Error('不支持安装该依赖。')
    return dependency
  })
  const declared = await declaredPluginNames(runtime)
  const requestedTargets = await Promise.all(dependencies.map(async (dependency) => {
    const latestVersion = await npmLatestVersion(dependency.packageName)
    if (latestVersion === undefined) throw new Error('无法获取 npm 最新版本，请检查网络或 npm registry 后重试。')
    return { packageName: dependency.packageName, version: latestVersion }
  }))
  const requestedVersions = new Map<string, string>(requestedTargets.map(target => [target.packageName, target.version]))
  const targetPackages = directPackagesForInstall(requestedTargets.map(target => target.packageName), declared)
  const targets = await Promise.all(targetPackages.map(async (packageName) => {
    const requestedVersion = requestedVersions.get(packageName)
    if (requestedVersion !== undefined) return { packageName, version: requestedVersion }
    const version = await installedPackageVersion(packageName, runtime) ?? await npmLatestVersion(packageName)
    if (version === undefined) throw new Error('无法读取成员版本，请检查 npm 安装后重试。')
    return { packageName, version }
  }))
  beginInstallProgress(targets.map(target => `${target.packageName}@${target.version}`).join(', '))
  try {
    if (typeof runtime.pluginManager?.installBundle === 'function') {
      for (const target of targets) {
        noteInstallOutput(`dsh: delegating ${target.packageName}@${target.version} to host pluginManager\n`)
        if (typeof runtime.pluginManager.updateBundle === 'function' && isManagedPackageDeclared(target.packageName, declared)) {
          await runtime.pluginManager.updateBundle(target.packageName, target.version)
        } else {
          await runtime.pluginManager.installBundle(`${target.packageName}@${target.version}`)
        }
        await waitUntilPluginMounted(target.packageName, target.version, runtime)
      }
      return dependencyStatuses(runtime)
    }

    if (typeof ops?.runPluginCommand === 'function') {
      const context = {
        profile: runtime.profileName,
        dir: runtime.profileDir,
        cwd: runtime.profileDir,
        installAnchor: runtime.runtimeRoots[0] ?? resolve(runtime.profileDir, 'package.json'),
      }
      const options = {
        execution: 'service',
        outputBytes: 16384,
        activateNewBundles: true,
        onOutput: (text: string) => noteInstallOutput(text),
      }
      for (const target of targets) {
        noteInstallOutput(`dsh: installing ${target.packageName}@${target.version} via official runPluginCommand\n`)
        const res = await ops.runPluginCommand(context, ['add', `${target.packageName}@${target.version}`], options)
        if (res.exitCode !== 0) throw new Error(res.output || '官方插件安装命令执行失败。')
        await waitUntilPluginMounted(target.packageName, target.version, runtime)
      }
      return dependencyStatuses(runtime)
    }

    return dependencyStatuses(runtime)
  } finally {
    endInstallProgress()
  }
}
