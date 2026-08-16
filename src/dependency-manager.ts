import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { MANAGED_DEPENDENCIES, managedDependency, type ManagedDependencyId } from './dependencies.ts'

type ProfileManifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}

export type DependencyStatus = {
  id: ManagedDependencyId
  packageName: string
  installed: boolean
  version?: string
}

function profileDirectory(): string {
  if (process.env.DSH_PROFILE_DIR !== undefined) return process.env.DSH_PROFILE_DIR
  return join(homedir(), '.dsh', 'profiles', 'web')
}

async function profileManifest(): Promise<ProfileManifest> {
  try {
    return JSON.parse(await readFile(join(profileDirectory(), 'package.json'), 'utf8')) as ProfileManifest
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

/** 返回 web profile 中固定管理插件的安装状态。 */
export async function dependencyStatuses(): Promise<readonly DependencyStatus[]> {
  const manifest = await profileManifest()
  return MANAGED_DEPENDENCIES.map(dependency => {
    const version = manifest.dependencies?.[dependency.packageName] ?? manifest.devDependencies?.[dependency.packageName]
    return version === undefined
      ? { ...dependency, installed: false }
      : { ...dependency, installed: true, version }
  })
}

function runPnpm(args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args, { windowsHide: true, stdio: 'ignore' })
    child.once('error', () => { reject(new Error('无法启动 pnpm。请确认已安装 pnpm 后重试。')) })
    child.once('exit', code => { code === 0 ? resolve() : reject(new Error('依赖安装失败，请稍后重试。')) })
  })
}

async function addProfileBundle(packageName: string): Promise<void> {
  const manifest = await profileManifest()
  const bundles = manifest.dsh?.profile?.bundles ?? []
  if (bundles.includes(packageName)) return
  const next: ProfileManifest = {
    ...manifest,
    dsh: { ...manifest.dsh, profile: { ...manifest.dsh?.profile, bundles: [...bundles, packageName] } },
  }
  await writeFile(join(profileDirectory(), 'package.json'), `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}

/** 仅允许安装固定依赖，避免把浏览器输入转成任意命令。 */
export async function installDependency(id: string | null): Promise<readonly DependencyStatus[]> {
  const dependency = managedDependency(id)
  if (dependency === undefined) throw new Error('不支持安装该依赖。')
  await runPnpm(['--dir', profileDirectory(), 'add', '--save-prod', dependency.packageName])
  await addProfileBundle(dependency.packageName)
  return dependencyStatuses()
}
