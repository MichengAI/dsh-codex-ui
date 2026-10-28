import { describe, expect, it, vi, afterEach } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { name, apply, isSubPluginDisabledOnDisk } from '../src/composer-plugin.ts'
import { checkComposerEnabled, COMPOSER_ENHANCEMENT_STYLE_ID } from '../src/client/composer/index.tsx'
import { CODEX_UI_API_ENDPOINTS } from '../src/business-api.ts'

describe('codex-ui-composer sub-plugin', () => {
  it('子插件元数据命名必须是 codex-ui-composer', () => {
    expect(name).toBe('codex-ui-composer')
  })

  it('宿主插件正确向 webServer 注册 /api/michengai/dsh-codex-ui/composer 端点', () => {
    const ctx = new Context()
    let registeredPath = ''
    let handlerFn: ((req: unknown, res: { writeHead: (status: number, headers?: Record<string, string>) => void; end: (body?: string) => void }) => void) | undefined

    ctx.provide('webServer', {
      register: (options: { kind: 'exact'; path: string; handler: typeof handlerFn }) => {
        registeredPath = options.path
        handlerFn = options.handler
        return () => {
          registeredPath = ''
          handlerFn = undefined
        }
      },
    } as never)

    apply(ctx)

    expect(registeredPath).toBe(CODEX_UI_API_ENDPOINTS.composer)
    expect(handlerFn).toBeDefined()

    let responseStatus = 0
    let responseBody = ''
    handlerFn!({}, {
      writeHead: (status) => { responseStatus = status },
      end: (body) => { responseBody = body ?? '' },
    })

    expect(responseStatus).toBe(200)
    expect(typeof JSON.parse(responseBody).enabled).toBe('boolean')
  })

  it('isSubPluginDisabledOnDisk 能准确识别 cordis.patch.yml 中的 disabled 配置', () => {
    const testDir = join(tmpdir(), `dcu-test-${Date.now()}`)
    const desktopProfile = join(testDir, 'profiles', 'desktop')
    mkdirSync(desktopProfile, { recursive: true })

    try {
      // 1. 无 disabled 配置
      writeFileSync(join(desktopProfile, 'cordis.patch.yml'), '- id: other\n  config: {}\n', 'utf8')
      expect(isSubPluginDisabledOnDisk('codex-ui-composer', testDir)).toBe(false)

      // 2. 显式配置 disabled: true
      writeFileSync(join(desktopProfile, 'cordis.patch.yml'), '- id: codex-ui-composer\n  disabled: true\n', 'utf8')
      expect(isSubPluginDisabledOnDisk('codex-ui-composer', testDir)).toBe(true)

      // 3. 显式配置 disabled: false
      writeFileSync(join(desktopProfile, 'cordis.patch.yml'), '- id: codex-ui-composer\n  disabled: false\n', 'utf8')
      expect(isSubPluginDisabledOnDisk('codex-ui-composer', testDir)).toBe(false)
    } finally {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('客户端探测与生命周期', () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
      globalThis.fetch = originalFetch
      document.getElementById(COMPOSER_ENHANCEMENT_STYLE_ID)?.remove()
      document.getElementById('dcu-composer-suggestions-mount')?.remove()
    })

    it('当端点返回 200 { enabled: true } 时，探测成功', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: true }),
      } as Response)

      const enabled = await checkComposerEnabled()
      expect(enabled).toBe(true)
    })

    it('当端点返回 200 { enabled: false } 时，探测停用返回 false', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: false }),
      } as Response)

      const enabled = await checkComposerEnabled()
      expect(enabled).toBe(false)
    })
  })
})
