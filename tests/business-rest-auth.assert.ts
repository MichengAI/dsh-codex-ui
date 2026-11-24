import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, inject } from '../src/index.ts'
import { Context } from '@deepseek-ai/cordis'
import { ConnectionAuthentication, HostConnectionService } from '@deepseek-ai/dsh-client-connection'

const dependenciesPath = '/api/michengai/dsh-codex-ui/dependencies'
const sectionsPath = '/api/michengai/dsh-codex-ui/sections'

const expectedPaths = [
  dependenciesPath,
  sectionsPath,
]
const oldPrefix = '/api/michengai/codex-ui/'

type ResponseRecorder = {
  status?: number
  headers?: Record<string, string>
  body?: string
  writeHead(status: number, headers?: Record<string, string>): void
  end(body?: string): void
}
type Route = {
  kind: 'exact'
  path: string
  auth?: 'anonymous' | 'required' | 'deny'
  handler(request: ReturnType<typeof createRequest>, response: ResponseRecorder, peer?: unknown): Promise<void>
}

let rejection: 401 | 403 | 503 | undefined = 401
let connectionAvailable = true
let authenticationError: Error | undefined
let authenticationCalls = 0
const authenticatedRequests: unknown[] = []
const authenticationWarnings: string[] = []
const routes = new Map<string, Route>()
const disposers: Array<() => void> = []
const directory = await mkdtemp(join(tmpdir(), 'dcu-business-rest-'))
const previousProfileDir = process.env.DSH_PROFILE_DIR
process.env.DSH_PROFILE_DIR = directory

const services: Record<string, unknown> = {
  webServer: {
    register(route: Route) {
      routes.set(route.path, route)
      return () => { routes.delete(route.path) }
    },
  },
  agents: { get: () => undefined },
  sessions: {
    get: () => undefined,
    flush: async () => {},
    prepare: () => { throw new Error('认证测试不应创建会话') },
    enter: () => { throw new Error('认证测试不应进入会话') },
  },
  sessionPersistence: {
    list: async () => [],
    readRaw: async () => undefined,
    loadStored: async () => undefined,
    locate: () => undefined,
  },
  tools: { schemas: () => [] },
  workspaceRegistry: { list: () => [{ path: directory }] },
  connection: {
    requestRejection(request: unknown) {
      authenticationCalls += 1
      authenticatedRequests.push(request)
      if (authenticationError !== undefined) throw authenticationError
      return rejection
    },
  },
}
const context = {
  inject() {},
  get(key: string) { return key === 'connection' && !connectionAvailable ? undefined : services[key] },
  effect(effect: () => void | (() => void)) {
    const dispose = effect()
    if (typeof dispose === 'function') disposers.push(dispose)
  },
  emit() {},
  logger: { warn(format: string) { authenticationWarnings.push(format) }, info() {} },
}

function createRequest(method: string, chunks: string[] = []) {
  return {
    method,
    url: '/',
    headers: {
      host: 'dsh.example.test',
      origin: 'https://dsh.example.test',
      'sec-fetch-site': 'same-origin',
      'content-type': 'application/json',
    },
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() { for (const chunk of chunks) yield chunk },
  }
}

async function invoke(path: string, method: string, chunks: string[] = []) {
  const response: ResponseRecorder = {
    writeHead(status, headers) { response.status = status; response.headers = headers },
    end(body) { response.body = body },
  }
  const route = routes.get(path)
  assert.ok(route, `缺少业务路由 ${path}`)
  await route.handler({ ...createRequest(method, chunks), url: path }, response)
  return response
}

try {
  assert.equal(inject.includes('connection'), false, '认证服务缺失时路由必须保持挂载并按请求返回 503')
  apply(context as never)
  assert.deepEqual([...routes.keys()].sort(), expectedPaths.slice().sort())
  assert.equal([...routes.keys()].some(path => path.startsWith(oldPrefix)), false)
  for (const path of expectedPaths) {
    assert.equal(routes.get(path)?.auth, undefined, `${path} 业务路由必须保持默认 required 认证，绝不可声明为 anonymous`)
  }

  // 验证 DSH 0.2.3 WebServer 准入契约：宿主准入层分发的 Peer 必须直接放行业务请求
  const peerResponse: ResponseRecorder = {
    writeHead(status, headers) { peerResponse.status = status; peerResponse.headers = headers },
    end(body) { peerResponse.body = body },
  }
  const admittedPeer = { principal: { kind: 'owner' }, signal: { aborted: false } }
  await routes.get(sectionsPath)!.handler({ ...createRequest('GET'), url: sectionsPath }, peerResponse, admittedPeer)
  assert.equal(peerResponse.status, 200, '携带宿主已认证 Peer 的请求必须直接放行')

  const authorizedCalls = [
    [dependenciesPath, 'GET'],
    [sectionsPath, 'GET'],
    [sectionsPath, 'POST'],
  ] as const
  for (const [path, method] of authorizedCalls) {
    const response = await invoke(path, method)
    assert.equal(response.status, 401, `${path} 必须拒绝未登录请求`)
    assert.equal(response.headers?.['cache-control'], 'no-store')
  }
  assert.equal(authenticationCalls, authorizedCalls.length)
  assert.deepEqual((authenticatedRequests[0] as ReturnType<typeof createRequest>).headers, createRequest('GET').headers, 'Host、Origin 和其他请求头必须原样交给宿主认证')
  assert.equal((authenticatedRequests[0] as ReturnType<typeof createRequest>).url, expectedPaths[0])

  rejection = 403
  assert.equal((await invoke(dependenciesPath, 'GET')).status, 403)

  connectionAvailable = false
  assert.equal((await invoke(dependenciesPath, 'GET')).status, 503)
  assert.equal(authenticationWarnings.length > 0, true, '认证服务缺失必须记录服务端诊断日志')

  connectionAvailable = true
  authenticationError = new Error('authentication fixture failed')
  assert.equal((await invoke(dependenciesPath, 'GET')).status, 503)
  assert.match(authenticationWarnings.at(-1) ?? '', /认证/)
  authenticationError = undefined
  rejection = undefined

  // 验证 connection.admit 接口契约与 503 保持（P2-4 / P2-5）
  let admitResult: { rejection?: 401 | 403 | 503; peer?: unknown } | undefined
  services.connection = {
    admit: () => admitResult,
  }

  // 1) 503 rejection 保留原始 503，不降级为 403
  admitResult = { rejection: 503 }
  const resp503 = await invoke(dependenciesPath, 'GET')
  assert.equal(resp503.status, 503, 'connection.admit 抛出 503 时不得降级为 403')
  assert.match(resp503.body ?? '', /宿主认证服务暂不可用/)

  // 2) 403 rejection
  admitResult = { rejection: 403 }
  const resp403 = await invoke(dependenciesPath, 'GET')
  assert.equal(resp403.status, 403)

  // 3) 401 rejection
  admitResult = { rejection: 401 }
  const resp401 = await invoke(dependenciesPath, 'GET')
  assert.equal(resp401.status, 401)

  // 4) fail-closed: admission 返回 {} (既无 rejection 又无 peer)
  admitResult = {}
  const respNoPeer = await invoke(dependenciesPath, 'GET')
  assert.equal(respNoPeer.status, 403, 'connection.admit 返回无 peer 准入对象时必须 fail-closed 拒绝 (403)')

  // 5) fail-closed: admission 返回 undefined
  admitResult = undefined
  const respUndef = await invoke(dependenciesPath, 'GET')
  assert.equal(respUndef.status, 503, 'connection.admit 返回 undefined 时判定为服务不可用 (503)')

  // 6) 成功准入：admission 返回有效 peer
  admitResult = { peer: { principal: { kind: 'owner' } } }
  const respSuccess = await invoke(sectionsPath, 'GET')
  assert.equal(respSuccess.status, 200, 'connection.admit 返回有效 peer 时必须放行业务请求')


  // 使用锁文件中的真实宿主信任检查，仅将登录层固定为已登录，证明跨站拒绝不依赖 401。
  const hostContext = new Context()
  if (typeof ConnectionAuthentication === 'function') {
    new ConnectionAuthentication(hostContext)
  }
  const hostConnection = new (HostConnectionService as any)(hostContext, ['dsh.example.test'], {
    isAuthenticated: () => true,
  })
  if (hostConnection.authentication?.register) {
    hostConnection.authentication.register({
      authenticate: () => hostConnection.browserPeer,
    })
  }
  services.connection = hostConnection
  try {
    const trusted = createRequest('POST')
    const checkResult = typeof (hostConnection as any).requestRejection === 'function'
      ? (hostConnection as any).requestRejection(trusted)
      : (hostConnection.admit(trusted as any) as any).rejection
    assert.equal(checkResult, undefined, '正对照：已登录的可信来源必须放行')
    for (const headers of [
      { origin: 'https://evil.example' },
      { 'sec-fetch-site': 'cross-site' },
      { origin: 'null' },
      { host: 'evil.example', origin: 'https://evil.example' },
    ]) {
      for (const [path, method] of [[`${dependenciesPath}?action=update-all`, 'POST']] as const) {
        let bodyRead = false
        const response: ResponseRecorder = {
          writeHead(status) { response.status = status },
          end(body) { response.body = body },
        }
        await routes.get(path.split('?')[0]!)!.handler({
          ...trusted, method, url: path,
          headers: { ...trusted.headers, ...headers, 'content-type': 'application/x-www-form-urlencoded' },
          async *[Symbol.asyncIterator]() { bodyRead = true; yield 'action=update-all' },
        }, response)
        assert.equal(response.status, 403, `${path} 跨站请求必须被真实宿主契约拒绝`)
        assert.equal(bodyRead, false, '必须在读取表单及进入业务操作前拒绝')
      }
    }
  } finally { await hostContext.fiber.dispose() }
} finally {
  for (const dispose of disposers.reverse()) dispose()
  if (previousProfileDir === undefined) delete process.env.DSH_PROFILE_DIR
  else process.env.DSH_PROFILE_DIR = previousProfileDir
  await rm(directory, { recursive: true, force: true })
}
