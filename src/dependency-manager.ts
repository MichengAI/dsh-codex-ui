import { spawn, type ChildProcess } from 'node:child_process'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANAGED_DEPENDENCIES, SUITE_MEMBER_PACKAGES, SUITE_PACKAGE, managedDependency, type ManagedDependencyId } from './dependencies.ts'

export const PROFILE_PENDING_UPDATES_FILE = '.dsh-pending-updates.json'
export const APPLY_PLUGIN_UPDATES_IPC = 'apply-plugin-updates'
export const PLUGIN_INSTALL_TIMEOUT_MS = 10 * 60 * 1000

type PackageManifest = { version?: string }

export type DependencyStatus = {
  id: ManagedDependencyId
  packageName: string
  installed: boolean
  version?: string
  latestVersion?: string
  updateAvailable: boolean
}

type OptionalServiceContext = {
  get?: (name: string) => unknown
}

type DesktopProfilesService = {
  current?: { name?: unknown; dir?: unknown }
}

type DesktopPnpmHandle = {
  stdout?: NodeJS.ReadableStream
  stderr?: NodeJS.ReadableStream
  done: Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>
  cancel(): void
}

type DesktopPnpmService = {
  runPlugin(args: readonly string[], invokingDir: string, signal?: AbortSignal): DesktopPnpmHandle
}

export type DependencyRuntime = {
  environmentKind: 'desktop' | 'cli'
  profileName: string
  profileDir: string
  runtimeRoots: readonly string[]
  desktopPnpm?: DesktopPnpmService
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
 * Desktop 通过可选 Host service 暴露当前 profile；普通 Web/CLI 继续使用
 * DSH_PROFILE_DIR、命令行 profile 与默认 web profile。
 */
export function resolveDependencyRuntime(ctx?: OptionalServiceContext, options: DependencyRuntimeOptions = {}): DependencyRuntime {
  const env = options.env ?? process.env
  const argv = options.argv ?? process.argv
  const cwd = options.cwd ?? process.cwd()
  const home = options.homeDir ?? homedir()
  const profiles = optionalService<DesktopProfilesService>(ctx, 'desktopProfiles')
  const desktopPnpm = optionalService<DesktopPnpmService>(ctx, 'desktopPnpm')
  if (profiles === undefined && desktopPnpm !== undefined) {
    throw new Error('DSH Desktop Profile 服务尚未就绪，请重启 Desktop 后重试。')
  }
  if (profiles !== undefined) {
    const current = profiles.current
    if (!validProfileName(current?.name) || typeof current.dir !== 'string' || !isAbsolute(current.dir)) {
      throw new Error('DSH Desktop 当前 Profile 信息无效，请重启 Desktop 后重试。')
    }
    if (typeof desktopPnpm?.runPlugin !== 'function') {
      throw new Error('DSH Desktop 包管理服务尚未就绪，请重启 Desktop 后重试。')
    }
    const profileDir = resolve(current.dir)
    // 只接受公开 Host contract 与旧 Desktop 明确提供的运行目录；
    // launcher-private bootstrap 路径不属于第三方插件兼容边界。
    const runtimeRoots = typeof env.DSH_RUNTIME_DIR === 'string' && isAbsolute(env.DSH_RUNTIME_DIR)
      ? [resolve(env.DSH_RUNTIME_DIR)]
      : []
    return {
      environmentKind: 'desktop',
      profileName: current.name,
      profileDir,
      runtimeRoots,
      desktopPnpm,
    }
  }
  const profileDir = resolve(env.DSH_PROFILE_DIR ?? resolve(home, '.dsh', 'profiles', 'web'))
  const selected = profileNameFromArgv(argv)
  const profileName = validProfileName(selected) ? selected : validProfileName(basename(profileDir)) ? basename(profileDir) : 'web'
  const cliRuntimeRoot = argv[1] === undefined ? undefined : resolveDshRuntimeRoot(argv[1], cwd)
  const runtimeRoots = [env.DSH_RUNTIME_DIR, cliRuntimeRoot]
    .filter((root): root is string => root !== undefined && root !== '')
  return { environmentKind: 'cli', profileName, profileDir, runtimeRoots }
}

function profileDirectory(runtime: DependencyRuntime): string {
  return runtime.profileDir
}

type ProfileManifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}

async function declaredPluginNames(runtime: DependencyRuntime): Promise<string[]> {
  try {
    const manifest = JSON.parse(await readFile(resolve(profileDirectory(runtime), 'package.json'), 'utf8')) as ProfileManifest
    return [...new Set([
      ...Object.keys({ ...manifest.devDependencies, ...manifest.dependencies }),
      ...(manifest.dsh?.profile?.bundles ?? []),
    ])]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

/** 单独更新子插件时先卸套件，避免两套 patch 冲突。 */
export function pluginsToRemoveBeforeInstall(declared: readonly string[], installing: string): string[] {
  if ((SUITE_MEMBER_PACKAGES as readonly string[]).includes(installing) && declared.includes(SUITE_PACKAGE)) {
    return [SUITE_PACKAGE]
  }
  if (installing === SUITE_PACKAGE) {
    return SUITE_MEMBER_PACKAGES.filter(name => declared.includes(name))
  }
  return []
}

/** 点击哪个包就更新哪个包，不再把子插件重定向到套件。 */
export function resolveDshPluginTarget(installing: string, _declared: readonly string[] = []): string {
  return installing
}

export function isOfficialRuntimePackage(packageName: string): boolean {
  return packageName === '@deepseek-ai/dsh' || packageName.startsWith('@deepseek-ai/dsh-')
}

/** 从全局 npm 安装的 dsh CLI 入口反推出包含 node_modules 的运行时目录；源码启动不匹配该目录结构。 */
export function resolveDshRuntimeRoot(entry = process.argv[1], cwd = process.cwd()): string | undefined {
  if (entry === undefined || entry === '') return undefined
  const cliEntry = resolveDshCliEntry(entry, cwd)
  const marker = ['node_modules', '@deepseek-ai', 'dsh'].join(sep)
  const index = cliEntry.toLowerCase().lastIndexOf(marker.toLowerCase())
  if (index === -1) return undefined
  const end = index + marker.length
  if (end !== cliEntry.length && cliEntry[end] !== sep) return undefined
  const root = cliEntry.slice(0, index)
  return root.endsWith(sep) ? root.slice(0, -1) : root
}

function packageLookupRoots(packageName: string, runtime: DependencyRuntime): string[] {
  if (!isOfficialRuntimePackage(packageName)) return [profileDirectory(runtime)]
  return [...new Set([...runtime.runtimeRoots, profileDirectory(runtime)])]
}

async function installedPackageVersion(packageName: string, runtime: DependencyRuntime): Promise<string | undefined> {
  for (const root of packageLookupRoots(packageName, runtime)) {
    try {
      const manifest = JSON.parse(await readFile(resolve(root, 'node_modules', ...packageName.split('/'), 'package.json'), 'utf8')) as PackageManifest
      if (typeof manifest.version === 'string' && manifest.version !== '') return manifest.version
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  return undefined
}

/** 磁盘有包且仍在 profile 声明里，才算已安装。卸载后残留的 node_modules 不算。 */
export function isManagedPackageInstalled(input: { installedVersion: string | undefined; declared: boolean }): boolean {
  return input.declared && input.installedVersion !== undefined && input.installedVersion !== ''
}

/** 旧 Suite 对其六个成员拥有声明权；迁移成直接依赖前也应显示真实安装版本。 */
export function isManagedPackageDeclared(packageName: string, declared: readonly string[]): boolean {
  return declared.includes(packageName)
    || (declared.includes(SUITE_PACKAGE) && (SUITE_MEMBER_PACKAGES as readonly string[]).includes(packageName))
}

/** 更新旧 Suite 中任一成员时，必须一次提升全部成员，避免移除 Suite 后只剩一个插件。 */
export function directPackagesForInstall(requested: readonly string[], declared: readonly string[]): string[] {
  const migrateSuite = declared.includes(SUITE_PACKAGE)
    && requested.some(packageName => (SUITE_MEMBER_PACKAGES as readonly string[]).includes(packageName))
  return [...new Set(migrateSuite ? [...SUITE_MEMBER_PACKAGES, ...requested] : requested)]
}

/** npm latest 查询缓存有效期：避免每次打开“关于”页都打 7 个 registry 请求。 */
const LATEST_CACHE_TTL_MS = 5 * 60 * 1000

const latestCache = new Map<string, { version: string; at: number }>()

function cacheKey(packageName: string, tag: string): string {
  return packageName + '@' + tag
}

async function npmTaggedVersion(packageName: string, tag: 'latest' | 'next'): Promise<string | undefined> {
  const key = cacheKey(packageName, tag)
  const hit = latestCache.get(key)
  if (hit !== undefined && Date.now() - hit.at < LATEST_CACHE_TTL_MS) return hit.version
  try {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${tag}`, { signal: AbortSignal.timeout(5_000) })
    if (!response.ok) return undefined
    const manifest = await response.json() as PackageManifest
    if (typeof manifest.version !== 'string') return undefined
    latestCache.set(key, { version: manifest.version, at: Date.now() })
    return manifest.version
  } catch {
    return undefined
  }
}

async function npmLatestVersion(packageName: string): Promise<string | undefined> {
  if (isOfficialRuntimePackage(packageName)) {
    return await npmTaggedVersion(packageName, 'next') ?? await npmTaggedVersion(packageName, 'latest')
  }
  return npmTaggedVersion(packageName, 'latest')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 允许写入 YAML 单引号白名单的版本：semver 及常见预发布后缀，禁止引号与空白。 */
function isSafeReleaseVersion(version: string): boolean {
  return /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)
}

/** 将用户确认的精确版本合并进 Profile 的 pnpm 发布时间保护例外。 */
export function applyReleaseExclude(source: string, packageName: string, version: string): string {
  if (!isSafeReleaseVersion(version)) throw new Error('npm 返回了无法识别的最新版本。')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const linePattern = new RegExp(`^  - '${escapeRegExp(packageName)}@([^']*)'\\s*$`, 'm')
  const existing = linePattern.exec(source)
  if (existing !== null) {
    const versions = existing[1].split(/\s*\|\|\s*/).map(item => item.trim()).filter(item => item !== '')
    if (versions.includes(version)) return source
    const next = `  - '${packageName}@${[...versions, version].join(' || ')}'`
    return `${source.slice(0, existing.index)}${next}${source.slice(existing.index + existing[0].length)}`
  }
  const entry = `  - '${packageName}@${version}'`
  const section = /^minimumReleaseAgeExclude:\r?\n(?:(?:  |\t).*(?:\r?\n|$))*/m
  if (section.test(source)) return source.replace(section, match => `${match.endsWith('\n') ? match : `${match}${eol}`}${entry}${eol}`)
  return `${source}${source === '' || source.endsWith('\n') ? '' : eol}minimumReleaseAgeExclude:${eol}${entry}${eol}`
}

/**
 * pnpm 11 会在首次解析带 install script 的传递依赖时中止并写入占位值。
 * 这些依赖的运行时不需要 postinstall，因此在调用 DSH plugin add 之前显式
 * 记录拒绝执行，保证“关于”页单独安装和 Suite Installer 行为一致。
 */
export function applyRequiredBuildPolicies(source: string): string {
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const lines = source.split(/\r?\n/)
  const start = lines.findIndex(line => line === 'allowBuilds:')
  if (start === -1) {
    return `${source}${source === '' || source.endsWith('\n') ? '' : eol}allowBuilds:${eol}  protobufjs: false${eol}  koffi: false${eol}`
  }
  let end = start + 1
  while (end < lines.length && (lines[end] === '' || /^\s/.test(lines[end]!))) end += 1
  const body = lines.slice(start + 1, end).filter(line => !/^\s{2}(?:protobufjs|koffi):/.test(line))
  lines.splice(start + 1, end - start - 1, '  protobufjs: false', '  koffi: false', ...body)
  return lines.join(eol)
}

async function ensureRequiredBuildPolicies(runtime: DependencyRuntime): Promise<void> {
  const path = resolve(profileDirectory(runtime), 'pnpm-workspace.yaml')
  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    source = ''
  }
  const next = applyRequiredBuildPolicies(source)
  if (next !== source) await writeFile(path, next, 'utf8')
}

/** 将用户本次确认的精确版本加入 Profile 的 pnpm 发布时间保护例外。 */
async function ensureLatestReleaseAllowed(packageName: string, version: string, runtime: DependencyRuntime): Promise<void> {
  if (parseSemver(version) === undefined) throw new Error('npm 返回了无法识别的最新版本。')
  const path = resolve(profileDirectory(runtime), 'pnpm-workspace.yaml')
  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    source = ''
  }
  const next = applyReleaseExclude(source, packageName, version)
  if (next !== source) await writeFile(path, next, 'utf8')
}

type Semver = {
  core: readonly [number, number, number]
  prerelease: readonly string[]
}

function parseSemver(version: string): Semver | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version)
  if (match === null) return undefined
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] === undefined ? [] : match[4].split('.'),
  }
}

function comparePrerelease(left: readonly string[], right: readonly string[]): number {
  if (left.length === 0 || right.length === 0) return left.length === right.length ? 0 : left.length === 0 ? 1 : -1
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const a = left[index]
    const b = right[index]
    if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? -1 : 1
    if (a === b) continue
    const aNumeric = /^\d+$/.test(a)
    const bNumeric = /^\d+$/.test(b)
    if (aNumeric && bNumeric) return Number(a) > Number(b) ? 1 : -1
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1
    return a > b ? 1 : -1
  }
  return 0
}

export function newerVersion(installed: string, latest: string): boolean {
  const current = parseSemver(installed)
  const candidate = parseSemver(latest)
  if (current === undefined || candidate === undefined) return false
  for (let index = 0; index < current.core.length; index += 1) {
    if (candidate.core[index] !== current.core[index]) return candidate.core[index]! > current.core[index]!
  }
  return comparePrerelease(candidate.prerelease, current.prerelease) > 0
}

/** 返回当前 profile 中固定管理插件的实际安装版本与 npm latest 状态。 */
export async function dependencyStatuses(runtime: DependencyRuntime = resolveDependencyRuntime()): Promise<readonly DependencyStatus[]> {
  const declaredNames = await declaredPluginNames(runtime)
  return Promise.all(MANAGED_DEPENDENCIES.map(async dependency => {
    const version = await installedPackageVersion(dependency.packageName, runtime)
    // Desktop 本身已由 DSH runtime 启动。若宿主没有通过公开兼容路径暴露
    // runtime 目录，仍应显示为已安装，但不能伪造版本或提供升级操作。
    if (version === undefined && runtime.environmentKind === 'desktop' && isOfficialRuntimePackage(dependency.packageName)) {
      return { ...dependency, installed: true, updateAvailable: false }
    }
    const declared = isOfficialRuntimePackage(dependency.packageName) || isManagedPackageDeclared(dependency.packageName, declaredNames)
    if (version === undefined || !isManagedPackageInstalled({ installedVersion: version, declared })) return { ...dependency, installed: false, updateAvailable: false }
    const latestVersion = await npmLatestVersion(dependency.packageName)
    return { ...dependency, installed: true, version, latestVersion, updateAvailable: latestVersion !== undefined && newerVersion(version, latestVersion) }
  }))
}

/**
 * 把当前进程的 CLI 入口收成绝对路径。源码启动时 argv[1] 常是相对路径，
 * 若再把 cwd 切到 dirname(entry)，子进程会去错误目录找 bin.ts。
 */
export function resolveDshCliEntry(entry = process.argv[1], cwd = process.cwd()): string {
  if (entry === undefined || entry === '') throw new Error('无法定位 DSH CLI。请从 DSH 命令启动 Web 服务后重试。')
  if (entry.startsWith('file:')) return fileURLToPath(entry)
  return resolve(cwd, entry)
}

export function requestDesktopHotUpdate(send: NodeJS.Process['send'] = process.send): boolean {
  if (typeof send !== 'function') return false
  send(APPLY_PLUGIN_UPDATES_IPC)
  return true
}

export function isRestartableInstallError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /完全退出桌面端|正在运行的插件|pnpm 仓库不一致/.test(message)
}

async function recordPendingUpdate(packageName: string, version: string, runtime: DependencyRuntime): Promise<void> {
  const pendingPath = resolve(profileDirectory(runtime), PROFILE_PENDING_UPDATES_FILE)
  let packages: Array<{ packageName: string; version: string }> = []
  try {
    const parsed = JSON.parse(await readFile(pendingPath, 'utf8')) as { packages?: unknown }
    if (Array.isArray(parsed.packages)) {
      packages = parsed.packages.flatMap((item) => {
        if (item === null || typeof item !== 'object') return []
        const record = item as { packageName?: unknown; version?: unknown }
        if (typeof record.packageName !== 'string' || typeof record.version !== 'string') return []
        return [{ packageName: record.packageName, version: record.version }]
      })
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  packages = packages.filter((item) => item.packageName !== packageName)
  packages.push({ packageName, version })
  await writeFile(pendingPath, `${JSON.stringify({ packages }, undefined, 2)}\n`, 'utf8')
}

async function removePendingUpdate(packageName: string, runtime: DependencyRuntime): Promise<void> {
  const pendingPath = resolve(profileDirectory(runtime), PROFILE_PENDING_UPDATES_FILE)
  try {
    const parsed = JSON.parse(await readFile(pendingPath, 'utf8')) as { packages?: unknown }
    if (!Array.isArray(parsed.packages)) return
    const packages = parsed.packages.filter((item) => item === null || typeof item !== 'object' || (item as { packageName?: unknown }).packageName !== packageName)
    if (packages.length === parsed.packages.length) return
    if (packages.length === 0) {
      await unlink(pendingPath)
      return
    }
    await writeFile(pendingPath, `${JSON.stringify({ packages }, undefined, 2)}\n`, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

async function recordDeclaredVersion(packageName: string, version: string, runtime: DependencyRuntime): Promise<void> {
  const manifestPath = resolve(profileDirectory(runtime), 'package.json')
  let manifest: { dependencies?: Record<string, string> }
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { dependencies?: Record<string, string> }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    manifest = {}
  }
  manifest.dependencies = { ...manifest.dependencies, [packageName]: version }
  await writeFile(manifestPath, `${JSON.stringify(manifest, undefined, 2)}\n`, 'utf8')
}
export function pluginCommandError(stderr: string): Error {
  const detail = stderr.replace(/\s+/g, ' ').trim()
  if (detail.includes('minimumReleaseAge') || detail.includes('Release age')) {
    return new Error('更新被 pnpm 发布时间保护拦截。请确认已写入当前版本白名单后重试。')
  }
  if (/EPERM|EBUSY|EACCES|unable to unlink|ERR_PNPM_LOCKED|Lock/i.test(detail)) {
    return new Error('无法覆盖正在运行的插件文件。请先完全退出桌面端，再重新打开后更新。')
  }
  if (/UNEXPECTED_STORE|Unexpected store location/i.test(detail)) {
    return new Error('插件目录和 pnpm 仓库不一致。请完全退出桌面端后再更新。')
  }
  if (/ERR_PNPM_IGNORED_BUILDS|Ignored build scripts/i.test(detail)) {
    return new Error('插件依赖的 pnpm 构建脚本策略尚未确认。请更新 Profile 的 allowBuilds 配置后重试。')
  }
  if (/pnpm not found/i.test(detail)) {
    return new Error('当前环境找不到 pnpm。请从桌面端启动后再更新。')
  }
  return new Error('无法在应用运行时更新插件。请先完全退出桌面端，再重新打开后更新。')
}

/**
 * 复用启动当前服务的 DSH CLI：它会通过 pnpm 从 npm 安装或更新，并自动维护
 * dsh.profile.bundles，避免浏览器端直接管理 profile 文件。
 */
export function pluginExecArgv(args: readonly string[] = process.execArgv): string[] {
  return args.filter(arg => !/^--(?:inspect|inspect-brk|debug|debug-brk)(?:=|$)/.test(arg))
}

const activePluginChildren = new Set<ChildProcess>()
const activeDesktopPluginHandles = new Set<DesktopPnpmHandle>()

function terminatePluginChild(child: ChildProcess): void {
  if (child.exitCode !== null || child.killed) return
  if (process.platform === 'win32' && child.pid !== undefined) {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
    killer.once('error', () => { child.kill('SIGTERM') })
    killer.unref()
    return
  }
  child.kill('SIGTERM')
}

/** 插件停用时终止仍在运行的安装进程，避免热更新后遗留 pnpm。 */
export function disposeDependencyInstaller(): void {
  for (const child of activePluginChildren) terminatePluginChild(child)
  for (const handle of activeDesktopPluginHandles) handle.cancel()
}

export function monitorPluginChild(child: ChildProcess, timeoutMs = PLUGIN_INSTALL_TIMEOUT_MS): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    activePluginChildren.add(child)
    let output = ''
    let settled = false
    const collect = (chunk: Buffer): void => { output = `${output}${String(chunk)}`.slice(-64 * 1024) }
    const finish = (error?: Error): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      activePluginChildren.delete(child)
      error === undefined ? resolvePromise() : reject(error)
    }
    child.stdout?.on('data', collect)
    child.stderr?.on('data', collect)
    child.once('error', () => { finish(new Error('无法启动 DSH 插件安装命令。请确认 Node.js 与 pnpm 可用后重试。')) })
    child.once('exit', code => { finish(code === 0 ? undefined : pluginCommandError(output)) })
    const timeout = setTimeout(() => {
      terminatePluginChild(child)
      finish(new Error('插件安装超时，已终止安装进程。请检查网络后重试。'))
    }, timeoutMs)
    timeout.unref?.()
  })
}

function monitorDesktopPlugin(handle: DesktopPnpmHandle, timeoutMs = PLUGIN_INSTALL_TIMEOUT_MS): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    activeDesktopPluginHandles.add(handle)
    let output = ''
    let settled = false
    const collect = (chunk: Buffer | string): void => { output = `${output}${String(chunk)}`.slice(-64 * 1024) }
    const finish = (error?: Error): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      activeDesktopPluginHandles.delete(handle)
      error === undefined ? resolvePromise() : reject(error)
    }
    handle.stdout?.on('data', collect)
    handle.stderr?.on('data', collect)
    handle.stdout?.once('error', () => { handle.cancel(); finish(new Error('无法读取 DSH Desktop 插件安装输出。')) })
    handle.stderr?.once('error', () => { handle.cancel(); finish(new Error('无法读取 DSH Desktop 插件安装输出。')) })
    void handle.done.then(
      outcome => { finish(outcome.exitCode === 0 && outcome.signal === null ? undefined : pluginCommandError(output)) },
      () => { finish(pluginCommandError(output)) },
    )
    const timeout = setTimeout(() => {
      handle.cancel()
      finish(new Error('插件安装超时，已终止安装进程。请检查网络后重试。'))
    }, timeoutMs)
    timeout.unref?.()
  })
}

export function runDshPlugin(args: readonly string[], runtime: DependencyRuntime = resolveDependencyRuntime(), timeoutMs = PLUGIN_INSTALL_TIMEOUT_MS): Promise<void> {
  if (runtime.desktopPnpm !== undefined) {
    return monitorDesktopPlugin(runtime.desktopPnpm.runPlugin(args, runtime.profileDir), timeoutMs)
  }
  const entry = resolveDshCliEntry()
  const child = spawn(process.execPath, [...pluginExecArgv(), entry, 'plugin', '--profile', runtime.profileName, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, CI: 'true' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return monitorPluginChild(child, timeoutMs)
}

/** 并发安装互斥：pnpm 锁文件竞争会触发 EPERM/EBUSY，同一时间只允许一个安装进程。 */
let installing = false

/** 仅允许安装固定依赖，避免把浏览器输入转成任意命令。 */
export async function installDependency(
  id: string | null,
  requestHotUpdate: () => boolean = requestDesktopHotUpdate,
  runtime: DependencyRuntime = resolveDependencyRuntime(),
): Promise<readonly DependencyStatus[]> {
  if (installing) throw new Error('已有依赖安装正在进行，请等待完成后再试。')
  installing = true
  try {
    return await installDependenciesLocked([id], requestHotUpdate, runtime)
  } finally {
    installing = false
  }
}

export type UpdateAllDependenciesResult = {
  dependencies: readonly DependencyStatus[]
  updatedCount: number
}

/** 只挑选已安装且确有新版本的插件，缺失插件仍交给各行的“安装”按钮。 */
export function updatableDependencyIds(statuses: readonly DependencyStatus[]): ManagedDependencyId[] {
  return statuses.filter(status => status.installed && status.updateAvailable).map(status => status.id)
}

/** 把所有待更新版本一次写入清单，最后只请求一次桌面热更新。 */
export async function updateAllDependencies(
  requestHotUpdate: () => boolean = requestDesktopHotUpdate,
  runtime: DependencyRuntime = resolveDependencyRuntime(),
): Promise<UpdateAllDependenciesResult> {
  if (installing) throw new Error('已有依赖安装正在进行，请等待完成后再试。')
  installing = true
  try {
    const current = await dependencyStatuses(runtime)
    const ids = updatableDependencyIds(current)
    if (ids.length === 0) return { dependencies: current, updatedCount: 0 }
    const dependencies = await installDependenciesLocked(ids, requestHotUpdate, runtime)
    return { dependencies, updatedCount: ids.length }
  } finally {
    installing = false
  }
}

async function installDependenciesLocked(
  ids: readonly (string | null)[],
  requestHotUpdate: () => boolean,
  runtime: DependencyRuntime,
): Promise<readonly DependencyStatus[]> {
  const dependencies = [...new Set(ids)].map((id) => {
    const dependency = managedDependency(id)
    if (dependency === undefined) throw new Error('不支持安装该依赖。')
    return dependency
  })
  const declared = await declaredPluginNames(runtime)
  const requestedTargets = await Promise.all(dependencies.map(async (dependency) => {
    const latestVersion = await npmLatestVersion(dependency.packageName)
    if (latestVersion === undefined) throw new Error('无法获取 npm 最新版本，请检查网络或 npm registry 后重试。')
    const packageName = resolveDshPluginTarget(dependency.packageName, declared)
    const version = packageName === dependency.packageName ? latestVersion : await npmLatestVersion(packageName)
    if (version === undefined) throw new Error('无法获取 npm 最新版本，请检查网络或 npm registry 后重试。')
    return { packageName, version }
  }))
  const requestedVersions = new Map(requestedTargets.map(target => [target.packageName, target.version]))
  const targetPackages = directPackagesForInstall(requestedTargets.map(target => target.packageName), declared)
  const targets = await Promise.all(targetPackages.map(async (packageName) => {
    const requestedVersion = requestedVersions.get(packageName)
    if (requestedVersion !== undefined) return { packageName, version: requestedVersion }
    const version = await installedPackageVersion(packageName, runtime) ?? await npmLatestVersion(packageName)
    if (version === undefined) throw new Error('无法读取 Suite 成员版本，请检查 npm 安装后重试。')
    return { packageName, version }
  }))
  const remove = [...new Set(targets.flatMap(target => pluginsToRemoveBeforeInstall(declared, target.packageName)))]
  await ensureRequiredBuildPolicies(runtime)
  for (const target of targets) {
    await ensureLatestReleaseAllowed(target.packageName, target.version, runtime)
    if (!isOfficialRuntimePackage(target.packageName)) await recordDeclaredVersion(target.packageName, target.version, runtime)
    await recordPendingUpdate(target.packageName, target.version, runtime)
  }
  if (remove.length > 0) await runDshPlugin(['remove', ...remove], runtime)
  if (runtime.desktopPnpm === undefined && requestHotUpdate()) return dependencyStatuses(runtime)
  for (const target of targets) {
    try {
      await runDshPlugin(['add', `${target.packageName}@${target.version}`, '--registry=https://registry.npmjs.org/'], runtime)
    } catch (error) {
      if (isRestartableInstallError(error)) return dependencyStatuses(runtime)
      throw error
    }
    const installed = await installedPackageVersion(target.packageName, runtime)
    if (installed !== target.version) return dependencyStatuses(runtime)
    await removePendingUpdate(target.packageName, runtime)
  }
  return dependencyStatuses(runtime)
}
