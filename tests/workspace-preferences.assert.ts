import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, RequestBodyTooLargeError, readRequestBody } from '../src/index.ts'
import {
  MAX_PINNED_WORKSPACE_IDS,
  MAX_WORKSPACE_ID_LENGTH,
  parsePinnedWorkspaceIds,
  parseWorkspaceGroups,
  readWorkspacePreferences,
  WORKSPACE_PREFERENCES_FILE,
  writeWorkspacePreferences,
} from '../src/workspace-preferences.ts'

const directory = await mkdtemp(join(tmpdir(), 'dcu-workspace-preferences-'))
const path = join(directory, WORKSPACE_PREFERENCES_FILE)

try {
  assert.deepEqual(await readWorkspacePreferences(path), { version: 2, pinnedWorkspaceIds: [], workspaceGroups: [], exists: false })
  assert.deepEqual(parsePinnedWorkspaceIds(['a', 'a', 'b']), ['a', 'b'])
  assert.equal(parsePinnedWorkspaceIds(Array.from({ length: MAX_PINNED_WORKSPACE_IDS + 1 }, (_, index) => String(index))), undefined)
  assert.equal(parsePinnedWorkspaceIds(['x'.repeat(MAX_WORKSPACE_ID_LENGTH + 1)]), undefined)
  assert.deepEqual(parseWorkspaceGroups([{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }]), [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }])
  assert.equal(parseWorkspaceGroups([{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }, { id: 'duplicate', title: '重复', workspaceIds: ['a'] }]), undefined)

  await writeWorkspacePreferences(['a', 'a', 'b'], [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }], path)
  assert.deepEqual(await readWorkspacePreferences(path), { version: 2, pinnedWorkspaceIds: ['a', 'b'], workspaceGroups: [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }], exists: true })

  await Promise.all([
    writeWorkspacePreferences(['first'], [], path),
    writeWorkspacePreferences(['second'], [], path),
  ])
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), { version: 2, pinnedWorkspaceIds: ['second'], workspaceGroups: [] })

  await writeFile(path, JSON.stringify({ version: 1, pinnedWorkspaceIds: ['legacy'] }), 'utf8')
  assert.deepEqual(await readWorkspacePreferences(path), { version: 2, pinnedWorkspaceIds: ['legacy'], workspaceGroups: [], exists: true })

  await writeFile(path, '{broken', 'utf8')
  await assert.rejects(readWorkspacePreferences(path), SyntaxError)
} finally {
  await rm(directory, { recursive: true, force: true })
}

const request = (chunks: Array<string | Uint8Array>, headers: Record<string, string> = {}) => ({
  headers,
  async *[Symbol.asyncIterator](): AsyncGenerator<string | Uint8Array> {
    for (const chunk of chunks) yield chunk
  },
})

assert.equal(await readRequestBody(request(['{"a":', '1}']), 16), '{"a":1}')
await assert.rejects(readRequestBody(request([], { 'content-length': '17' }), 16), RequestBodyTooLargeError)
await assert.rejects(readRequestBody(request(['12345678', '901234567']), 16), RequestBodyTooLargeError)

type Route = { path: string; handler: (req: ReturnType<typeof request> & { method?: string; url?: string }, response: ResponseRecorder) => Promise<void> }
type ResponseRecorder = { status?: number; headers?: Record<string, string>; body?: string; writeHead: (status: number, headers?: Record<string, string>) => void; end: (body?: string) => void }

let preferencesRoute: Route | undefined
let explorerRoute: Route | undefined
let sessionMoveRoute: Route | undefined
let disposeEffect: (() => void) | undefined
const webServer = {
  register: (route: Route) => {
    if (route.path === '/api/michengai/codex-ui/preferences') preferencesRoute = route
    if (route.path === '/api/michengai/codex-ui/open-in-explorer') explorerRoute = route
    if (route.path === '/api/michengai/codex-ui/session-move') sessionMoveRoute = route
    return () => {}
  },
}
const services: Record<string, unknown> = {
  webServer,
  agents: { get: () => undefined },
  sessions: {
    get: () => undefined,
    flush: async () => {},
    prepare: () => { throw new Error('测试不应创建会话') },
    enter: () => { throw new Error('测试不应进入会话') },
  },
  sessionPersistence: {
    list: async () => [],
    readRaw: async () => undefined,
    loadStored: async () => undefined,
    locate: () => undefined,
  },
  tools: { schemas: () => [] },
  workspaceRegistry: { list: () => [{ path: 'D:\\Repository\\known-workspace' }] },
}
const context = {
  get: (key: string) => services[key],
  effect: (effect: () => void | (() => void)) => { disposeEffect = effect() ?? undefined },
  logger: { warn: () => {} },
}
const previousProfileDir = process.env.DSH_PROFILE_DIR
const endpointDirectory = await mkdtemp(join(tmpdir(), 'dcu-workspace-preferences-endpoint-'))
process.env.DSH_PROFILE_DIR = endpointDirectory

try {
  apply(context as never)
  assert.ok(preferencesRoute)
  assert.ok(sessionMoveRoute)

  const invoke = async (method: string, chunks: string[] = [], headers: Record<string, string> = {}) => {
    const response: ResponseRecorder = {
      writeHead: (status, responseHeaders) => { response.status = status; response.headers = responseHeaders },
      end: body => { response.body = body },
    }
    await preferencesRoute?.handler({ ...request(chunks, headers), method, url: preferencesRoute.path }, response)
    return response
  }

  const missing = await invoke('GET')
  assert.equal(missing.status, 200)
  assert.deepEqual(JSON.parse(missing.body ?? ''), { version: 2, pinnedWorkspaceIds: [], workspaceGroups: [], exists: false })

  const saved = await invoke('PUT', [JSON.stringify({ pinnedWorkspaceIds: ['one', 'two'] })], { 'sec-fetch-site': 'same-origin' })
  assert.equal(saved.status, 200)
  assert.deepEqual((await readWorkspacePreferences(join(endpointDirectory, WORKSPACE_PREFERENCES_FILE))).pinnedWorkspaceIds, ['one', 'two'])

  const savedGroups = await invoke('PUT', [JSON.stringify({ pinnedWorkspaceIds: ['one'], workspaceGroups: [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['one'] }] })], { 'sec-fetch-site': 'same-origin' })
  assert.equal(savedGroups.status, 200)
  assert.deepEqual(JSON.parse(savedGroups.body ?? '').workspaceGroups, [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['one'] }])

  await invoke('PUT', [JSON.stringify({ pinnedWorkspaceIds: ['two'] })], { 'sec-fetch-site': 'same-origin' })
  assert.deepEqual((await readWorkspacePreferences(join(endpointDirectory, WORKSPACE_PREFERENCES_FILE))).workspaceGroups, [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['one'] }], '旧客户端更新置顶时必须保留服务端已有分组')

  assert.equal((await invoke('PUT', ['{}'], { 'sec-fetch-site': 'cross-site' })).status, 403)
  assert.equal((await invoke('PUT', [], { 'content-length': String(33 * 1024) })).status, 413)
  assert.equal((await invoke('POST')).status, 405)

  const explorerResponse: ResponseRecorder = {
    writeHead: (status, responseHeaders) => { explorerResponse.status = status; explorerResponse.headers = responseHeaders },
    end: body => { explorerResponse.body = body },
  }
  await explorerRoute?.handler({ ...request([JSON.stringify({ path: 'D:\\Repository\\unregistered' })], { 'sec-fetch-site': 'same-origin' }), method: 'POST', url: explorerRoute.path }, explorerResponse)
  assert.equal(explorerResponse.status, process.platform === 'win32' ? 403 : 501, 'Explorer Host 路由必须在 Windows 拒绝未注册路径，并在其他平台明确回退')

  const invokeSessionMove = async (chunks: string[], headers: Record<string, string>) => {
    const response: ResponseRecorder = {
      writeHead: (status, responseHeaders) => { response.status = status; response.headers = responseHeaders },
      end: body => { response.body = body },
    }
    await sessionMoveRoute?.handler({ ...request(chunks, headers), method: 'POST', url: sessionMoveRoute.path }, response)
    return response
  }
  const crossSiteMove = await invokeSessionMove([JSON.stringify({ sessionId: 'one', targetWorkspaceId: 'two' })], { 'sec-fetch-site': 'cross-site' })
  assert.equal(crossSiteMove.status, 403)
  assert.equal(JSON.parse(crossSiteMove.body ?? '{}').code, 'session-move/cross-site')
  const invalidMove = await invokeSessionMove([JSON.stringify({ sessionId: '', targetWorkspaceId: '' })], { 'sec-fetch-site': 'same-origin' })
  assert.equal(invalidMove.status, 400)
  assert.equal(JSON.parse(invalidMove.body ?? '{}').code, 'session-move/invalid-request')
} finally {
  disposeEffect?.()
  if (previousProfileDir === undefined) delete process.env.DSH_PROFILE_DIR
  else process.env.DSH_PROFILE_DIR = previousProfileDir
  await rm(endpointDirectory, { recursive: true, force: true })
}
