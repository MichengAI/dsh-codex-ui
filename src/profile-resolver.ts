import type { Context } from '@deepseek-ai/cordis'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, isAbsolute, join, resolve } from 'node:path'

export interface ProfileContextInfo {
  profileName: string
  profileDir: string
  homeDir: string
}

/**
 * 健壮解析当前 DSH 实例的 Profile 信息：
 * 优先级：
 * 1. Cordis 服务 profileContext（官方运行时注入，最权威）
 * 2. 环境变量 DSH_PROFILE_DIR
 * 3. 命令行参数 --profile <name>
 * 4. 环境变量 DSH_PROFILE
 * 5. 兜底默认值 'web'
 */
export function resolveCurrentProfile(ctx?: Context, customHomeDir?: string): ProfileContextInfo {
  const homeDir = customHomeDir ?? process.env.DSH_HOME ?? join(homedir(), '.dsh')

  let profileName: string | undefined
  let profileDir: string | undefined

  // 1. 从 Context 获取 profileContext 服务
  try {
    const launched = ctx?.get?.('profileContext') as { name?: string; dir?: string } | undefined
    if (typeof launched?.name === 'string' && launched.name.trim()) {
      profileName = launched.name.trim()
    }
    if (typeof launched?.dir === 'string' && isAbsolute(launched.dir)) {
      profileDir = resolve(launched.dir)
    }
  } catch {
    // 忽略服务读取异常
  }

  // 2. 从 DSH_PROFILE_DIR 环境变量解析
  if (!profileDir && process.env.DSH_PROFILE_DIR) {
    try {
      profileDir = resolve(process.env.DSH_PROFILE_DIR)
      if (!profileName) {
        profileName = basename(profileDir)
      }
    } catch {}
  }

  // 3. 从命令行参数 --profile <name> 或 --profile=<name> 解析
  if (!profileName && typeof process !== 'undefined' && Array.isArray(process.argv)) {
    const argv = process.argv
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i]
      if (arg === '--profile' && argv[i + 1]) {
        profileName = argv[i + 1].trim()
        break
      }
      if (typeof arg === 'string' && arg.startsWith('--profile=')) {
        profileName = arg.slice('--profile='.length).trim()
        break
      }
    }
  }

  // 4. 从 DSH_PROFILE 环境变量兜底
  if (!profileName && process.env.DSH_PROFILE) {
    profileName = process.env.DSH_PROFILE.trim()
  }

  // 5. 最终兜底为官方标准 web profile
  if (!profileName) {
    profileName = 'web'
  }
  if (!profileDir) {
    profileDir = join(homeDir, 'profiles', profileName)
  }

  return { profileName, profileDir, homeDir }
}

/**
 * 严格基于当前 Profile 检查 cordis.patch.yml 中是否显式配置了 disabled: true。
 * 杜绝跨 Profile 串读（绝不扫描非当前 Profile 的目录）。
 */
export function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean {
  try {
    const { profileDir } = resolveCurrentProfile(ctx, homeDir)
    const patchPath = join(profileDir, 'cordis.patch.yml')
    if (existsSync(patchPath)) {
      const content = readFileSync(patchPath, 'utf8')
      // 1. 逐条目解析 YAML 列表块，按倒序取最后一条匹配项（容纳 name/config 中间字段、CRLF 换行及不同缩进）
      const itemBlocks = content.split(/(?:\r?\n)(?=-\s+)/)
      for (let i = itemBlocks.length - 1; i >= 0; i--) {
        const block = itemBlocks[i]
        const idRegex = new RegExp(`(?:^|\\s)id:\\s*['"]?${id}['"]?(?:\\s|$)`, 'm')
        if (idRegex.test(block)) {
          if (/(?:^|\s)disabled:\s*true(?:\s|$)/m.test(block)) return true
          if (/(?:^|\s)disabled:\s*false(?:\\s|$)/m.test(block)) return false
          // 目标 id 明确存在于当前条目且未声明 disabled: true 时，确认为未停用，直接返回 false，避免落入跨条目正则误伤
          return false
        }
      }
    }
  } catch {
    // 发生文件 IO 错误时，保持启用以防误判
  }
  return false
}
