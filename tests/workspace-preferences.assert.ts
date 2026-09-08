import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, RequestBodyTooLargeError, readRequestBody } from '../src/index.ts'
import { readHostWorkspacePreferences, writeHostWorkspacePreferences, readWorkspaceGroupsCache, saveWorkspaceGroupsCache, WORKSPACE_GROUPS_STORAGE_KEY } from '../src/client/pinned-workspaces.ts'
import { createWorkspaceGroup, renameWorkspaceGroup } from '../src/workspace-groups.ts'
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
const legacyCaseGroups = [{ id: 'upper', title: 'I', workspaceIds: ['one'] }, { id: 'lower', title: 'i', workspaceIds: ['two'] }]

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

  // 旧 locale 下合法的大小写冲突组必须保留 ID、标题、成员，不能因规则升级清空。
  await writeFile(path, JSON.stringify({ version: 2, pinnedWorkspaceIds: [], workspaceGroups: legacyCaseGroups }), 'utf8')
  assert.deepEqual((await readWorkspacePreferences(path)).workspaceGroups, legacyCaseGroups)
  await writeWorkspacePreferences([], legacyCaseGroups, path)
  assert.deepEqual((await readWorkspacePreferences(path)).workspaceGroups, legacyCaseGroups)
  const cacheValues = new Map([[WORKSPACE_GROUPS_STORAGE_KEY, JSON.stringify({ version: 1, workspaceGroups: legacyCaseGroups, pendingHostSync: false })]])
  const cacheStorage = { getItem: (key: string) => cacheValues.get(key) ?? null, setItem: (key: string, value: string) => { cacheValues.set(key, value) } } as Storage
  assert.deepEqual(readWorkspaceGroupsCache(cacheStorage).workspaceGroups, legacyCaseGroups)
  saveWorkspaceGroupsCache(cacheStorage, legacyCaseGroups, true)
  assert.deepEqual(readWorkspaceGroupsCache(cacheStorage), { workspaceGroups: legacyCaseGroups, pendingHostSync: true })
  const hostPayload = { exists: true, pinnedWorkspaceIds: [], workspaceGroups: legacyCaseGroups }
  assert.deepEqual((await readHostWorkspacePreferences(async () => new Response(JSON.stringify(hostPayload)))).workspaceGroups, legacyCaseGroups)
  await writeHostWorkspacePreferences([], legacyCaseGroups, async (_input, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)).workspaceGroups, legacyCaseGroups)
    return new Response('{}')
  })
  assert.deepEqual(createWorkspaceGroup(legacyCaseGroups, { id: 'new', title: 'Other' }).slice(0, 2), legacyCaseGroups)
  assert.throws(() => createWorkspaceGroup(legacyCaseGroups, { id: 'new', title: 'I' }))
  assert.deepEqual(renameWorkspaceGroup(legacyCaseGroups, 'upper', 'Unique'), [{ ...legacyCaseGroups[0], title: 'Unique' }, legacyCaseGroups[1]])

  await writeFile(path, '{broken', 'utf8')
  await assert.rejects(readWorkspacePreferences(path), SyntaxError)
} finally {
  await rm(directory, { recursive: true, force: true })
}

const request = (chunks: Array<string | Uint8Array>, headers: Record<string, string> = {}) => ({
  headers: { origin: 'http://localhost:3080', host: 'localhost:3080', 'sec-fetch-site': 'same-origin', ...headers },
  socket: { remoteAddress: '127.0.0.1' },
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
let dependenciesRoute: Route | undefined
let explorerRoute: Route | undefined
let sessionMoveRoute: Route | undefined
let disposeEffect: (() => void) | undefined
const webServer = {
  register: (route: Route) => {
    if (route.path === '/api/dsh-codex-ui/preferences') preferencesRoute = route
    if (route.path === '/api/dsh-codex-ui/dependencies') dependenciesRoute = route
    if (route.path === '/api/dsh-codex-ui/open-in-explorer') explorerRoute = route
    if (route.path === '/api/dsh-codex-ui/session-move') sessionMoveRoute = route
    return () => {}
  },
}
let authenticationRejection: 401 | 403 | undefined
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
  connection: { requestRejection: () => authenticationRejection },
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
  assert.ok(dependenciesRoute)
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

  assert.equal((await invoke('PUT', [JSON.stringify({ pinnedWorkspaceIds: [], workspaceGroups: legacyCaseGroups })])).status, 400, 'API must reject newly introduced case-insensitive duplicates')

  await writeFile(join(endpointDirectory, WORKSPACE_PREFERENCES_FILE), JSON.stringify({ version: 2, pinnedWorkspaceIds: [], workspaceGroups: legacyCaseGroups }), 'utf8')
  const legacySaved = await invoke('PUT', [JSON.stringify({ pinnedWorkspaceIds: ['one'], workspaceGroups: legacyCaseGroups })])
  assert.equal(legacySaved.status, 200)
  assert.deepEqual(JSON.parse((await invoke('GET')).body ?? '{}').workspaceGroups, legacyCaseGroups)
  const newConflict = [...legacyCaseGroups, { id: 'another', title: ' I ', workspaceIds: [] }]
  assert.equal((await invoke('PUT', [JSON.stringify({ pinnedWorkspaceIds: [], workspaceGroups: newConflict })])).status, 400)
  const renamedConflict = legacyCaseGroups.map(group => group.id === 'upper' ? { ...group, title: 'i' } : group)
  assert.equal((await invoke('PUT', [JSON.stringify({ pinnedWorkspaceIds: [], workspaceGroups: renamedConflict })])).status, 400)

  const distinctGroups = [{ id: 'alpha', title: 'Alpha', workspaceIds: [] }, { id: 'other', title: 'Other', workspaceIds: [] }]
  assert.equal((await invoke('PUT', [JSON.stringify({ pinnedWorkspaceIds: [], workspaceGroups: distinctGroups })])).status, 200)
  const caseOnlyConflict = distinctGroups.map(group => group.id === 'other' ? { ...group, title: 'ALPHA' } : group)
  assert.equal((await invoke('PUT', [JSON.stringify({ pinnedWorkspaceIds: [], workspaceGroups: caseOnlyConflict })])).status, 400, 'changed IDs/titles cannot acquire legacy conflict exemptions')
  assert.deepEqual(JSON.parse((await invoke('GET')).body ?? '{}').workspaceGroups, distinctGroups)

  authenticationRejection = 403
  assert.equal((await invoke('PUT', ['{}'], { 'sec-fetch-site': 'cross-site' })).status, 403)
  authenticationRejection = undefined
  assert.equal((await invoke('PUT', [], { 'content-length': String(33 * 1024) })).status, 413)
  assert.equal((await invoke('POST')).status, 405)

  const invokeDependencies = async (method: string, url: string, headers: Record<string, string> = {}) => {
    const response: ResponseRecorder = {
      writeHead: (status, responseHeaders) => { response.status = status; response.headers = responseHeaders },
      end: body => { response.body = body },
    }
    await dependenciesRoute?.handler({ ...request([], headers), method, url }, response)
    return response
  }
  authenticationRejection = 403
  const crossSiteDependency = await invokeDependencies('POST', `${dependenciesRoute?.path}?dependency=ui`, { 'sec-fetch-site': 'cross-site' })
  assert.equal(crossSiteDependency.status, 403, '依赖安装路由必须拒绝跨站 POST')
  assert.equal(JSON.parse(crossSiteDependency.body ?? '{}').error, '已拒绝不可信或跨站请求。')
  authenticationRejection = undefined

  services.desktopProfiles = {
    get current(): never { throw new Error('无法读取 D:\\Users\\demo\\secret-profile') },
  }
  const dependencyFailure = await invokeDependencies('GET', dependenciesRoute?.path ?? '')
  assert.equal(dependencyFailure.status, 503)
  assert.equal(JSON.parse(dependencyFailure.body ?? '{}').error, '依赖管理暂不可用，请查看服务端日志。', '依赖路由不得返回本地路径')
  assert.doesNotMatch(dependencyFailure.body ?? '', /secret-profile|D:\\\\Users/, '依赖路由响应必须脱敏')
  delete services.desktopProfiles

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
  authenticationRejection = 403
  const crossSiteMove = await invokeSessionMove([JSON.stringify({ sessionId: 'one', targetWorkspaceId: 'two' })], { 'sec-fetch-site': 'cross-site' })
  assert.equal(crossSiteMove.status, 403)
  assert.deepEqual(JSON.parse(crossSiteMove.body ?? '{}'), { ok: false, code: 'session-move/forbidden', error: '已拒绝不可信或跨站请求。' })
  authenticationRejection = undefined
  const invalidMove = await invokeSessionMove([JSON.stringify({ sessionId: '', targetWorkspaceId: '' })], { 'sec-fetch-site': 'same-origin' })
  assert.equal(invalidMove.status, 400)
  assert.equal(JSON.parse(invalidMove.body ?? '{}').code, 'session-move/invalid-request')
} finally {
  disposeEffect?.()
  if (previousProfileDir === undefined) delete process.env.DSH_PROFILE_DIR
  else process.env.DSH_PROFILE_DIR = previousProfileDir
  await rm(endpointDirectory, { recursive: true, force: true })
}
