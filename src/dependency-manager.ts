import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANAGED_DEPENDENCIES, managedDependency, type ManagedDependencyId } from './dependencies.ts'

type ProfileManifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}

type PackageManifest = { version?: string }

export type DependencyStatus = {
  id: ManagedDependencyId
  packageName: string
  installed: boolean
  version?: string
  latestVersion?: string
  updateAvailable: boolean
}

function profileDirectory(): string {
  if (process.env.DSH_PROFILE_DIR !== undefined) return process.env.DSH_PROFILE_DIR
  return resolve(homedir(), '.dsh', 'profiles', 'web')
}

async function profileManifest(): Promise<ProfileManifest> {
  try {
    return JSON.parse(await readFile(resolve(profileDirectory(), 'package.json'), 'utf8')) as ProfileManifest
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

async function installedPackageVersion(packageName: string): Promise<string | undefined> {
  try {
    const manifest = JSON.parse(await readFile(resolve(profileDirectory(), 'node_modules', ...packageName.split('/'), 'package.json'), 'utf8')) as PackageManifest
    return typeof manifest.version === 'string' ? manifest.version : undefined
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

async function npmLatestVersion(packageName: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, { signal: AbortSignal.timeout(5_000) })
    if (!response.ok) return undefined
    const manifest = await response.json() as PackageManifest
    return typeof manifest.version === 'string' ? manifest.version : undefined
  } catch {
    return undefined
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 将用户确认的精确版本合并进 Profile 的 pnpm 发布时间保护例外。 */
export function applyReleaseExclude(source: string, packageName: string, version: string): string {
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

/** 将用户本次确认的精确版本加入 Profile 的 pnpm 发布时间保护例外。 */
async function ensureLatestReleaseAllowed(packageName: string, version: string): Promise<void> {
  if (versionParts(version) === undefined) throw new Error('npm 返回了无法识别的最新版本。')
  const path = resolve(profileDirectory(), 'pnpm-workspace.yaml')
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

function versionParts(version: string): readonly [number, number, number] | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version)
  return match === null ? undefined : [Number(match[1]), Number(match[2]), Number(match[3])]
}

function newerVersion(installed: string, latest: string): boolean {
  const current = versionParts(installed)
  const candidate = versionParts(latest)
  if (current === undefined || candidate === undefined) return false
  return candidate[0] > current[0]
    || (candidate[0] === current[0] && candidate[1] > current[1])
    || (candidate[0] === current[0] && candidate[1] === current[1] && candidate[2] > current[2])
}

/** 返回 Web profile 中固定管理插件的实际安装版本与 npm latest 状态。 */
export async function dependencyStatuses(): Promise<readonly DependencyStatus[]> {
  const manifest = await profileManifest()
  return Promise.all(MANAGED_DEPENDENCIES.map(async dependency => {
    const declared = manifest.dependencies?.[dependency.packageName] ?? manifest.devDependencies?.[dependency.packageName]
    if (declared === undefined) return { ...dependency, installed: false, updateAvailable: false }
    const version = await installedPackageVersion(dependency.packageName)
    if (version === undefined) return { ...dependency, installed: false, updateAvailable: false }
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

function pluginCommandError(stderr: string): Error {
  const detail = stderr.replace(/\s+/g, ' ').trim()
  if (detail.includes('minimumReleaseAge') || detail.includes('Release age')) {
    return new Error('更新被 pnpm 发布时间保护拦截。请确认已写入当前版本白名单后重试。')
  }
  if (detail.includes('EPERM') || detail.includes('EBUSY') || detail.includes('EACCES')) {
    return new Error('无法覆盖正在运行的插件文件。请先停止 DSH Web，再点击更新。')
  }
  return new Error('从 npm 安装或更新依赖失败。请检查网络、npm registry 或发布时间保护后重试。')
}

/**
 * 复用启动当前服务的 DSH CLI：它会通过 pnpm 从 npm 安装或更新，并自动维护
 * dsh.profile.bundles，避免浏览器端直接管理 profile 文件。
 */
function runDshPlugin(args: readonly string[]): Promise<void> {
  const entry = resolveDshCliEntry()
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, entry, 'plugin', '--profile', 'web', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, CI: 'true' },
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr?.on('data', chunk => { stderr += String(chunk) })
    child.once('error', () => { reject(new Error('无法启动 DSH 插件安装命令。请确认 Node.js 与 pnpm 可用后重试。')) })
    child.once('exit', code => { code === 0 ? resolvePromise() : reject(pluginCommandError(stderr)) })
  })
}

/** 仅允许安装固定依赖，避免把浏览器输入转成任意命令。 */
export async function installDependency(id: string | null): Promise<readonly DependencyStatus[]> {
  const dependency = managedDependency(id)
  if (dependency === undefined) throw new Error('不支持安装该依赖。')
  const latestVersion = await npmLatestVersion(dependency.packageName)
  if (latestVersion === undefined) throw new Error('无法获取 npm 最新版本，请检查网络或 npm registry 后重试。')
  await ensureLatestReleaseAllowed(dependency.packageName, latestVersion)
  await runDshPlugin(['add', `${dependency.packageName}@${latestVersion}`])
  const installed = await installedPackageVersion(dependency.packageName)
  if (installed !== latestVersion) {
    throw new Error(`已请求 ${dependency.packageName}@${latestVersion}，但当前仍是 ${installed ?? '未安装'}。请先停止 DSH Web 后再更新。`)
  }
  return dependencyStatuses()
}
