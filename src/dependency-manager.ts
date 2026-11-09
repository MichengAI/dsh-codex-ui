import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, isAbsolute, join, resolve } from 'node:path'
import { npmTotalDownloads } from './npm-downloads.ts'
import { MANAGED_DEPENDENCIES, SUITE_MEMBER_PACKAGES, SUITE_PACKAGE, managedDependency, type ManagedDependencyId } from './dependencies.ts'

export const PROFILE_PENDING_UPDATES_FILE = '.dsh-pending-updates.json'

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

function detectHostRuntimeRoot(env: NodeJS.ProcessEnv): string | undefined {
  if (typeof env.DSH_RUNTIME_DIR === 'string' && isAbsolute(env.DSH_RUNTIME_DIR)) {
    return resolve(env.DSH_RUNTIME_DIR)
  }
  const candidates = [
    resolve(process.execPath, '..', 'resources', 'app', 'node_modules', '@deepseek-ai', 'dsh'),
    resolve(process.cwd(), 'node_modules', '@deepseek-ai', 'dsh'),
  ]
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'package.json'))) return candidate
  }
  return undefined
}

/**
 * 运行时解析：优先通过宿主官方 profileContext 服务提取当前 Profile，
 * 不再自建 CLI 探测与包管理 spawn。
 */
export function resolveDependencyRuntime(ctx?: OptionalServiceContext, options: DependencyRuntimeOptions = {}): DependencyRuntime {
  const env = options.env ?? process.env
  const argv = options.argv ?? process.argv
  const home = options.homeDir ?? homedir()
  const profileContext = optionalService<LaunchedProfileService>(ctx, 'profileContext')
  const pluginManager = optionalService<PluginManagerHostService>(ctx, 'pluginManager')
  if (profileContext !== undefined) {
    if (typeof profileContext.dir !== 'string' || !isAbsolute(profileContext.dir)) {
      throw new Error('DSH 当前 Profile 路径无效，请重启 DSH 后重试。')
    }
    const profileDir = resolve(profileContext.dir)
    const profileName = validProfileName(profileContext.name) ? profileContext.name : validProfileName(basename(profileDir)) ? basename(profileDir) : 'web'
    const detectedRoot = detectHostRuntimeRoot(env)
    const runtimeRoots = detectedRoot !== undefined ? [detectedRoot] : []
    return {
      environmentKind: profileName === 'desktop' ? 'desktop' : 'cli',
      profileName,
      profileDir,
      runtimeRoots,
      ...(pluginManager === undefined ? {} : { pluginManager }),
    }
  }
  const profiles = optionalService<DesktopProfilesService>(ctx, 'desktopProfiles')
  if (profiles !== undefined) {
    const current = profiles.current
    if (!validProfileName(current?.name) || typeof current.dir !== 'string' || !isAbsolute(current.dir)) {
      throw new Error('DSH Desktop 当前 Profile 信息无效，请重启 Desktop 后重试。')
    }
    const profileDir = resolve(current.dir)
    const detectedRoot = detectHostRuntimeRoot(env)
    const runtimeRoots = detectedRoot !== undefined ? [detectedRoot] : []
    return {
      environmentKind: 'desktop',
      profileName: current.name,
      profileDir,
      runtimeRoots,
      ...(pluginManager === undefined ? {} : { pluginManager }),
    }
  }
  const profileDir = resolve(env.DSH_PROFILE_DIR ?? resolve(home, '.dsh', 'profiles', 'web'))
  const selected = profileNameFromArgv(argv)
  const profileName = validProfileName(selected) ? selected : validProfileName(basename(profileDir)) ? basename(profileDir) : 'web'
  const detectedRoot = detectHostRuntimeRoot(env)
  const runtimeRoots = detectedRoot !== undefined ? [detectedRoot] : []
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

let installing = false

export async function installDependency(
  id: string | null,
  runtime: DependencyRuntime = resolveDependencyRuntime(),
): Promise<DependencyOperationResult> {
  if (installing) throw new Error('已有依赖安装正在进行，请等待完成后再试。')
  installing = true
  try {
    return await installDependenciesLocked([id], runtime)
  } finally {
    installing = false
  }
}

export type DependencyApplication = 'applied' | 'restart-required' | 'overridden' | 'failed' | 'cancelled'
export type DependencyOperationResult = {
  dependencies: readonly DependencyStatus[]
  application: DependencyApplication
  updatedCount: number
  results: readonly DependencyTargetResult[]
}
export type DependencyTargetError = {
  code?: string
  diagnostic?: string
  kind?: string
  message?: string
}

export type DependencyTargetResult = {
  packageName: string
  application: DependencyApplication
  changed: boolean | null
  restartReason?: string
  restore?: { application: DependencyApplication; changed: boolean }
  error?: DependencyTargetError
}
export type UpdateAllDependenciesResult = DependencyOperationResult

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
    if (ids.length === 0) return { dependencies: current, application: 'applied', updatedCount: 0, results: [] }
    return await installDependenciesLocked(ids, runtime)
  } finally {
    installing = false
  }
}

async function installDependenciesLocked(
  ids: readonly (string | null)[],
  runtime: DependencyRuntime,
): Promise<DependencyOperationResult> {
  if (typeof runtime.pluginManager?.installBundle !== 'function') {
    throw new Error('DSH 宿主插件管理服务尚未就绪，请重启 DSH 后重试。')
  }
  const dependencies = [...new Set(ids)].map((id) => {
    const dependency = managedDependency(id)
    if (dependency === undefined) throw new Error('不支持安装该依赖。')
    return dependency
  })
  const declared = await declaredPluginNames(runtime)
  if (declared.includes(SUITE_PACKAGE) && dependencies.some(dependency => (SUITE_MEMBER_PACKAGES as readonly string[]).includes(dependency.packageName))) {
    throw new Error('旧套件成员暂不支持自动迁移，请通过宿主插件管理器处理。')
  }
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
  const results: DependencyTargetResult[] = []
  try {
    for (const target of targets) {
      noteInstallOutput(`dsh: delegating ${target.packageName}@${target.version} to host pluginManager`)
      let raw: unknown
      let restore: unknown
      try {
        const installed = await installedPackageVersion(target.packageName, runtime)
        if (installed !== undefined && declared.includes(target.packageName) && typeof runtime.pluginManager.updateBundle === 'function') {
          const update = await runtime.pluginManager.updateBundle(target.packageName, target.version)
          raw = update !== null && typeof update === 'object' ? (update as { result?: unknown }).result : undefined
          restore = update !== null && typeof update === 'object' ? (update as { restore?: unknown }).restore : undefined
        } else {
          raw = await runtime.pluginManager.installBundle(`${target.packageName}@${target.version}`)
        }
      } catch (caught) {
        results.push({
          packageName: target.packageName,
          application: 'failed',
          changed: null,
          error: { message: caught instanceof Error ? caught.message : String(caught) },
        })
        break
      }
      const change = raw !== null && typeof raw === 'object' ? raw as Record<string, unknown> : undefined
      const valid = change && typeof change.changed === 'boolean' && ['applied', 'restart-required', 'overridden', 'failed', 'cancelled'].includes(String(change.application))
      const application = valid ? change.application as DependencyApplication : 'failed'
      const restored = restore !== null && typeof restore === 'object' ? restore as { application?: unknown; changed?: unknown } : undefined
      const validRestore = restored && typeof restored.changed === 'boolean' && ['applied', 'restart-required', 'overridden', 'failed', 'cancelled'].includes(String(restored.application))
      let errorInfo: DependencyTargetError | undefined
      if (change !== undefined) {
        const errObj = change.error && typeof change.error === 'object' ? change.error as Record<string, unknown> : undefined
        const pkgResult = change.packageResult && typeof change.packageResult === 'object' ? change.packageResult as Record<string, unknown> : undefined
        const code = typeof errObj?.code === 'string' ? errObj.code : typeof change.code === 'string' ? change.code : undefined
        const diagnostic = typeof errObj?.diagnostic === 'string' ? errObj.diagnostic : typeof change.diagnostic === 'string' ? change.diagnostic : undefined
        const message = typeof errObj?.message === 'string' ? errObj.message : typeof change.error === 'string' ? change.error : undefined
        const kind = typeof pkgResult?.kind === 'string' ? pkgResult.kind : undefined
        if (code !== undefined || diagnostic !== undefined || message !== undefined || kind !== undefined) {
          errorInfo = {
            ...(code !== undefined ? { code } : {}),
            ...(diagnostic !== undefined ? { diagnostic } : {}),
            ...(message !== undefined ? { message } : {}),
            ...(kind !== undefined ? { kind } : {}),
          }
        }
      }
      results.push({ packageName: target.packageName, application, changed: valid ? change.changed as boolean : null,
        ...(validRestore ? { restore: { application: restored.application as DependencyApplication, changed: restored.changed as boolean } } : {}),
        ...(application === 'restart-required' && typeof change?.restartReason === 'string' && ['no-hmr', 'package-moved', 'host-module', 'unmanaged-plugin', 'module-comparison'].includes(change.restartReason) ? { restartReason: change.restartReason } : {}),
        ...(errorInfo !== undefined ? { error: errorInfo } : {}),
      })
      if (application === 'failed' || application === 'cancelled') break
    }
    const application = results.find(r => r.application === 'failed' || r.application === 'cancelled')?.application
      ?? (results.some(r => r.application === 'overridden') ? 'overridden' : results.some(r => r.application === 'restart-required') ? 'restart-required' : 'applied')
    return { dependencies: await dependencyStatuses(runtime), application, updatedCount: results.filter(r => r.changed && r.application !== 'failed' && r.application !== 'cancelled').length, results }
  } finally {
    endInstallProgress()
  }
}
