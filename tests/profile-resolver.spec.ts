import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveCurrentProfile, isSubPluginDisabledOnDisk } from '../src/profile-resolver.ts'

describe('profile-resolver', () => {
  let tempHome: string
  const originalEnv = { ...process.env }

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'dsh-profile-test-'))
    delete process.env.DSH_PROFILE
    delete process.env.DSH_PROFILE_DIR
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    try {
      rmSync(tempHome, { recursive: true, force: true })
    } catch {}
  })

  it('优先从 ctx.get("profileContext") 中解析 profile 信息', () => {
    const fakeCtx = {
      get: (key: string) => {
        if (key === 'profileContext') {
          return { name: 'custom-profile', dir: join(tempHome, 'profiles', 'custom-profile') }
        }
        return undefined
      },
    }

    const info = resolveCurrentProfile(fakeCtx as never, tempHome)
    expect(info.profileName).toBe('custom-profile')
    expect(info.profileDir).toBe(join(tempHome, 'profiles', 'custom-profile'))
  })

  it('缺失环境变量与 profileContext 时，默认安全兜底为 web profile', () => {
    const info = resolveCurrentProfile(undefined, tempHome)
    expect(info.profileName).toBe('web')
    expect(info.profileDir).toBe(join(tempHome, 'profiles', 'web'))
  })

  it('能够从命令行参数 --profile <name> 与 --profile=<name> 中正确解析', () => {
    const origArgv = process.argv
    try {
      process.argv = ['node', 'app.js', '--profile', 'qa-profile']
      const info1 = resolveCurrentProfile(undefined, tempHome)
      expect(info1.profileName).toBe('qa-profile')
      expect(info1.profileDir).toBe(join(tempHome, 'profiles', 'qa-profile'))

      process.argv = ['node', 'app.js', '--profile=ci-profile']
      const info2 = resolveCurrentProfile(undefined, tempHome)
      expect(info2.profileName).toBe('ci-profile')
      expect(info2.profileDir).toBe(join(tempHome, 'profiles', 'ci-profile'))
    } finally {
      process.argv = origArgv
    }
  })

  it('isSubPluginDisabledOnDisk 严格隔离不同 Profile，绝不跨 Profile 串读', () => {
    // 创建 desktop profile 并配置 codex-ui-theme disabled: true
    const desktopDir = join(tempHome, 'profiles', 'desktop')
    mkdirSync(desktopDir, { recursive: true })
    writeFileSync(
      join(desktopDir, 'cordis.patch.yml'),
      `- insert:\n    - id: codex-ui-theme\n      disabled: true\n`
    )

    // 创建 web profile 且未禁用 codex-ui-theme
    const webDir = join(tempHome, 'profiles', 'web')
    mkdirSync(webDir, { recursive: true })
    writeFileSync(
      join(webDir, 'cordis.patch.yml'),
      `- insert:\n    - id: codex-ui-theme\n      name: '@michengai/dsh-codex-ui/theme'\n`
    )

    // 当运行在 web profile 时，绝不受 desktop 的 disabled 配置污染！
    const webCtx = {
      get: (key: string) => (key === 'profileContext' ? { name: 'web', dir: webDir } : undefined),
    }
    const disabledInWeb = isSubPluginDisabledOnDisk('codex-ui-theme', tempHome, webCtx as never)
    expect(disabledInWeb).toBe(false)

    // 当明确在 desktop profile 下时，如实报告 disabled: true
    const desktopCtx = {
      get: (key: string) => (key === 'profileContext' ? { name: 'desktop', dir: desktopDir } : undefined),
    }
    const disabledInDesktop = isSubPluginDisabledOnDisk('codex-ui-theme', tempHome, desktopCtx as never)
    expect(disabledInDesktop).toBe(true)
  })
})
