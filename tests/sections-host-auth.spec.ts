import { Context } from '@deepseek-ai/cordis'
import * as connectionHost from '@deepseek-ai/dsh-client-connection'
import { describe, expect, it } from 'vitest'
import * as codexUi from '../src/index.ts'
import * as composerPredictions from '../src/composer-prediction.ts'
import { CODEX_UI_API_ENDPOINTS } from '../src/business-api.ts'

type Route = {
  path: string
  handler: (
    request: { method: string; url: string; headers: Record<string, string> },
    response: { writeHead: (status: number) => void; end: (body?: string) => void },
  ) => Promise<void> | void
}

describe('业务路由的真实 Cordis 认证作用域', () => {
  it('宿主连接稍后就绪时，业务路由使用宿主认证并保持拒绝未认证请求', async () => {
    const host = new Context()
    const routes = new Map<string, Route>()
    host.provide('webServer', {
      register(route: Route) {
        routes.set(route.path, route)
        return () => { routes.delete(route.path) }
      },
    })
    host.provide('profileContext', { name: 'codex-ui-auth-test' })
    host.provide('pluginManager', {})

    const request = async (authenticated = false, site = 'same-origin', path: string = CODEX_UI_API_ENDPOINTS.sections) => {
      const route = routes.get(path)
      expect(route).toBeDefined()
      let status: number | undefined
      await route!.handler({
        method: 'GET',
        url: path,
        headers: { host: '127.0.0.1:3080', 'sec-fetch-site': site, ...(authenticated ? { 'x-fixture-auth': 'yes' } : {}) },
      }, { writeHead: value => { status = value }, end() {} })
      return status
    }

    try {
      await host.plugin(codexUi)
      await host.plugin(composerPredictions)
      expect(await request()).toBe(503)
      expect(await request(false, 'same-origin', CODEX_UI_API_ENDPOINTS.composerPredictionStream)).toBe(503)

      const connection = host.plugin(connectionHost)
      await connection
      const peer = new connectionHost.Peer(host, { principal: { kind: 'owner' } })
      host['connection.authentication'].register({ authenticate: request => {
        const headers = request.headers
        const fixtureApproval = headers instanceof Headers ? headers.get('x-fixture-auth') : headers?.['x-fixture-auth']
        return fixtureApproval === 'yes' ? peer : undefined
      } })

      expect(await request(true)).toBe(200)
      expect(await request()).toBe(401)
      expect(await request(true, 'cross-site')).toBe(403)
      expect(await request(false, 'same-origin', CODEX_UI_API_ENDPOINTS.dependencies)).toBe(401)

      for (const path of [CODEX_UI_API_ENDPOINTS.composerPrediction, CODEX_UI_API_ENDPOINTS.composerPredictionStream]) {
        expect(await request(false, 'same-origin', path)).toBe(401)
        // 认证通过后应执行请求方法校验，而不是把认证异常当成预测结果。
        expect(await request(true, 'same-origin', path)).toBe(405)
      }
      await connection.dispose()
      expect(await request(true)).toBe(503)

      // 宿主重载连接插件后必须重新捕获作用域，而不是永久停在 503。
      const reloaded = host.plugin(connectionHost)
      await reloaded
      host['connection.authentication'].register({ authenticate: request => {
        const headers = request.headers
        const fixtureApproval = headers instanceof Headers ? headers.get('x-fixture-auth') : headers?.['x-fixture-auth']
        return fixtureApproval === 'yes' ? peer : undefined
      } })
      expect(await request(true)).toBe(200)
      expect(await request()).toBe(401)
    } finally {
      await host.fiber.dispose()
    }
  })
})
