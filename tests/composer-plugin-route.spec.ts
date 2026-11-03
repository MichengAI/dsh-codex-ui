import { describe, expect, it, vi } from 'vitest'
import { apply, inject, name } from '../src/composer-plugin.ts'
import { CODEX_UI_API_ENDPOINTS } from '../src/business-api.ts'

describe('composer-plugin: 路由与鉴权契约', () => {
  it('正确声明插件名称与依赖注入项', () => {
    expect(name).toBe('codex-ui-composer')
    expect(inject).toEqual(['webServer'])
  })

  it('正确向 webServer 注册状态端点与预测端点', () => {
    const routes: Array<{ kind: string; path: string; handler: Function }> = []
    const webServer = {
      register: vi.fn((r) => {
        routes.push(r)
        return () => {}
      }),
    }

    const mockCtx = {
      get: vi.fn((key) => {
        if (key === 'webServer') return webServer
        return undefined
      }),
      effect: vi.fn((fn) => fn()),
    } as any

    apply(mockCtx)

    expect(routes).toHaveLength(3)
    expect(routes.map(r => r.path)).toContain(CODEX_UI_API_ENDPOINTS.composer)
    expect(routes.map(r => r.path)).toContain(CODEX_UI_API_ENDPOINTS.composerPrediction)
    expect(routes.map(r => r.path)).toContain(CODEX_UI_API_ENDPOINTS.composerPredictionStream)
  })

  it('未授权请求时返回 401 并拦截', async () => {
    let predictionHandler: any = null
    const webServer = {
      register: (r: any) => {
        if (r.path === CODEX_UI_API_ENDPOINTS.composerPrediction) predictionHandler = r.handler
        return () => {}
      },
    }
    const connection = {
      admit: vi.fn(() => ({ rejection: 401 })),
    }

    const mockCtx = {
      get: (key: string) => {
        if (key === 'webServer') return webServer
        if (key === 'connection') return connection
        return undefined
      },
      effect: (fn: any) => fn(),
    } as any

    apply(mockCtx)

    const response = {
      writeHead: vi.fn(),
      end: vi.fn(),
    }
    await predictionHandler({ method: 'POST' }, response)

    expect(response.writeHead).toHaveBeenCalledWith(401, expect.any(Object))
  })
})
