import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { CODEX_UI_API_ENDPOINTS } from '../src/business-api.ts'
import { registerComposerStatusFallback } from '../src/index.ts'

/**
 * composer 子插件被停用时的状态兜底端点（Issue #112）。
 *
 * 子插件停用后它自己注册的 `/composer` 会消失，客户端探活只能拿到 404，
 * DevTools 里表现为持续报错。主插件在磁盘配置确认停用时接管同一路径，
 * 返回 200 { enabled: false }，客户端据此立即收敛。
 */

interface CapturedRoute {
  path: string
  handler: (request: unknown, response: { writeHead: (s: number, h?: Record<string, string>) => void; end: (b?: string) => void }) => void
}

describe('composer 状态兜底端点', () => {
  let profileDir: string
  const originalEnv = { ...process.env }

  const fakeCtx = (routes: CapturedRoute[]) => ({
    get: (key: string) => {
      if (key === 'profileContext') return { name: 'qa', dir: profileDir }
      if (key === 'webServer') {
        return {
          register: (route: CapturedRoute) => {
            routes.push(route)
            return () => {}
          },
        }
      }
      return undefined
    },
  }) as never

  const writePatch = (body: string): void => {
    writeFileSync(join(profileDir, 'cordis.patch.yml'), body, 'utf8')
  }

  beforeEach(() => {
    profileDir = mkdtempSync(join(tmpdir(), 'dcu-composer-fallback-'))
    mkdirSync(profileDir, { recursive: true })
    delete process.env.DSH_PROFILE
    delete process.env.DSH_PROFILE_DIR
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    rmSync(profileDir, { recursive: true, force: true })
  })

  it('子插件在 cordis.patch.yml 中被停用：注册兜底端点并返回 enabled:false', () => {
    writePatch('- id: codex-ui-composer\n  disabled: true\n')
    const routes: CapturedRoute[] = []
    registerComposerStatusFallback(fakeCtx(routes))

    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe(CODEX_UI_API_ENDPOINTS.composer)

    const writeHead = vi.fn()
    const end = vi.fn()
    routes[0].handler({}, { writeHead, end })

    expect(writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'content-type': expect.stringContaining('application/json') }))
    expect(JSON.parse(end.mock.calls[0][0])).toEqual({ enabled: false, prediction: false })
  })

  it('子插件未被停用：绝不注册，避免与子插件自己的同名路由冲突', () => {
    writePatch('- id: codex-ui-composer\n  disabled: false\n')
    const routes: CapturedRoute[] = []
    registerComposerStatusFallback(fakeCtx(routes))
    expect(routes).toHaveLength(0)
  })

  it('profile 中没有该条目时不注册兜底端点', () => {
    writePatch('- id: codex-ui-theme\n  disabled: true\n')
    const routes: CapturedRoute[] = []
    registerComposerStatusFallback(fakeCtx(routes))
    expect(routes).toHaveLength(0)
  })
})
