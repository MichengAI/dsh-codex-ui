import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, RequestBodyTooLargeError, readRequestBody } from '../src/index.ts'
import {
  MAX_PINNED_WORKSPACE_IDS,
  MAX_WORKSPACE_ID_LENGTH,
  parsePinnedWorkspaceIds,
  readWorkspacePreferences,
  WORKSPACE_PREFERENCES_FILE,
  writeWorkspacePreferences,
} from '../src/workspace-preferences.ts'

const directory = await mkdtemp(join(tmpdir(), 'dcu-workspace-preferences-'))
const path = join(directory, WORKSPACE_PREFERENCES_FILE)

try {
  assert.deepEqual(await readWorkspacePreferences(path), { version: 1, pinnedWorkspaceIds: [], exists: false })
  assert.deepEqual(parsePinnedWorkspaceIds(['a', 'a', 'b']), ['a', 'b'])
  assert.equal(parsePinnedWorkspaceIds(Array.from({ length: MAX_PINNED_WORKSPACE_IDS + 1 }, (_, index) => String(index))), undefined)
  assert.equal(parsePinnedWorkspaceIds(['x'.repeat(MAX_WORKSPACE_ID_LENGTH + 1)]), undefined)

  await writeWorkspacePreferences(['a', 'a', 'b'], path)
  assert.deepEqual(await readWorkspacePreferences(path), { version: 1, pinnedWorkspaceIds: ['a', 'b'], exists: true })

  await Promise.all([
    writeWorkspacePreferences(['first'], path),
    writeWorkspacePreferences(['second'], path),
  ])
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), { version: 1, pinnedWorkspaceIds: ['second'] })

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
let disposeEffect: (() => void) | undefined
const webServer = {
  register: (route: Route) => {
    if (route.path === '/api/michengai/codex-ui/preferences') preferencesRoute = route
    if (route.path === '/api/michengai/codex-ui/open-in-explorer') explorerRoute = route
    return () => {}
  },
}
const services: Record<string, unknown> = {
  webServer,
  agents: { get: () => undefined },
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
  assert.deepEqual(JSON.parse(missing.body ?? ''), { version: 1, pinnedWorkspaceIds: [], exists: false })

  const saved = await invoke('PUT', [JSON.stringify({ pinnedWorkspaceIds: ['one', 'two'] })], { 'sec-fetch-site': 'same-origin' })
  assert.equal(saved.status, 200)
  assert.deepEqual((await readWorkspacePreferences(join(endpointDirectory, WORKSPACE_PREFERENCES_FILE))).pinnedWorkspaceIds, ['one', 'two'])

  assert.equal((await invoke('PUT', ['{}'], { 'sec-fetch-site': 'cross-site' })).status, 403)
  assert.equal((await invoke('PUT', [], { 'content-length': String(33 * 1024) })).status, 413)
  assert.equal((await invoke('POST')).status, 405)

  const explorerResponse: ResponseRecorder = {
    writeHead: (status, responseHeaders) => { explorerResponse.status = status; explorerResponse.headers = responseHeaders },
    end: body => { explorerResponse.body = body },
  }
  await explorerRoute?.handler({ ...request([JSON.stringify({ path: 'D:\\Repository\\unregistered' })], { 'sec-fetch-site': 'same-origin' }), method: 'POST', url: explorerRoute.path }, explorerResponse)
  assert.equal(explorerResponse.status, process.platform === 'win32' ? 403 : 501, 'Explorer Host 路由必须在 Windows 拒绝未注册路径，并在其他平台明确回退')
} finally {
  disposeEffect?.()
  if (previousProfileDir === undefined) delete process.env.DSH_PROFILE_DIR
  else process.env.DSH_PROFILE_DIR = previousProfileDir
  await rm(endpointDirectory, { recursive: true, force: true })
}
