import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, inject } from '../src/index.ts'
import { Context } from '@deepseek-ai/cordis'
import { HostConnectionService } from '@deepseek-ai/dsh-client-connection'

const dependenciesPath = '/api/dsh-codex-ui/dependencies'

const expectedPaths = [
  dependenciesPath,
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
  handler(request: ReturnType<typeof createRequest>, response: ResponseRecorder): Promise<void>
}

let rejection: 401 | 403 | undefined = 401
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

  for (const [path, method] of [
    [dependenciesPath, 'GET'],
  ] as const) {
    const response = await invoke(path, method)
    assert.equal(response.status, 401, `${path} 必须拒绝未登录请求`)
    assert.equal(response.headers?.['cache-control'], 'no-store')
  }
  assert.equal(authenticationCalls, expectedPaths.length)
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

  // 使用锁文件中的真实宿主信任检查，仅将登录层固定为已登录，证明跨站拒绝不依赖 401。
  const hostContext = new Context()
  const hostConnection = new HostConnectionService(hostContext, ['dsh.example.test'], {
    isAuthenticated: () => true,
  } as never)
  services.connection = hostConnection
  try {
    const trusted = createRequest('POST')
    assert.equal(hostConnection.requestRejection(trusted), undefined, '正对照：已登录的可信来源必须放行')
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
