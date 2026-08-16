import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
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

/**
 * 复用启动当前服务的 DSH CLI：它会通过 pnpm 从 npm 安装，并自动维护
 * dsh.profile.bundles，避免浏览器端直接管理 profile 文件。
 */
function runDshPluginAdd(packageName: string): Promise<void> {
  const entry = process.argv[1]
  if (entry === undefined || entry === '') return Promise.reject(new Error('无法定位 DSH CLI。请从 DSH 命令启动 Web 服务后重试。'))
  const invocation = { args: [...process.execArgv, entry], cwd: dirname(entry) }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...invocation.args, 'plugin', '--profile', 'web', 'add', packageName], {
      cwd: invocation.cwd,
      env: { ...process.env, CI: 'true' },
      windowsHide: true,
      stdio: 'ignore',
    })
    child.once('error', () => { reject(new Error('无法启动 DSH 插件安装命令。请确认 Node.js 与 pnpm 可用后重试。')) })
    child.once('exit', code => { code === 0 ? resolve() : reject(new Error('从 npm 安装依赖失败。请检查网络或 npm registry 后重试。')) })
  })
}

/** 仅允许安装固定依赖，避免把浏览器输入转成任意命令。 */
export async function installDependency(id: string | null): Promise<readonly DependencyStatus[]> {
  const dependency = managedDependency(id)
  if (dependency === undefined) throw new Error('不支持安装该依赖。')
  await runDshPluginAdd(dependency.packageName)
  return dependencyStatuses()
}
