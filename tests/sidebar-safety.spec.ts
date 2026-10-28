import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it } from 'vitest'
import { isSubPluginDisabledOnDisk } from '../src/sidebar-plugin.ts'

it('客户端不再启用会反复重绘宿主侧栏的 DOM 观察器', () => {
  const entry = readFileSync('src/client/index.ts', 'utf8')
  expect(entry).not.toContain('observeSidebarEnhancement')
})

it('isSubPluginDisabledOnDisk 严格隔离当前 profile，不受其他 profile 污染', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sidebar-safety-'))
  const oldProfile = process.env.DSH_PROFILE
  try {
    const webPatch = join(dir, 'profiles', 'web')
    const deskPatch = join(dir, 'profiles', 'desktop')
    mkdirSync(webPatch, { recursive: true })
    mkdirSync(deskPatch, { recursive: true })

    // 仅在 web profile 写入 disabled: true
    writeFileSync(join(webPatch, 'cordis.patch.yml'), '- id: codex-ui-sidebar\n  disabled: true\n', 'utf8')

    // 当运行在 desktop profile 时，不应被 web 污染
    process.env.DSH_PROFILE = 'desktop'
    expect(isSubPluginDisabledOnDisk('codex-ui-sidebar', dir)).toBe(false)

    // 当运行在 web profile 时，准确识别 disabled
    process.env.DSH_PROFILE = 'web'
    expect(isSubPluginDisabledOnDisk('codex-ui-sidebar', dir)).toBe(true)
  } finally {
    if (oldProfile === undefined) {
      delete process.env.DSH_PROFILE
    } else {
      process.env.DSH_PROFILE = oldProfile
    }
    rmSync(dir, { recursive: true, force: true })
  }
})
