import assert from 'node:assert/strict'
import {
  insertPinnedWorkspace,
  normalizePinnedWorkspaceIds,
  prunePinnedWorkspaceIds,
  readHostWorkspacePreferences,
  readWorkspaceGroupsCache,
  resolveWorkspacePreferencesHydration,
  resolvePinnedWorkspaceHydration,
  saveWorkspaceGroupsCache,
  togglePinnedWorkspace,
  WORKSPACE_GROUPS_STORAGE_KEY,
  WORKSPACE_PREFERENCES_ENDPOINT,
  writeHostPinnedWorkspaceIds,
  writeHostWorkspacePreferences,
} from '../src/client/pinned-workspaces.ts'

assert.deepEqual(
  normalizePinnedWorkspaceIds(['a', '', 'b', 'a', '  ', 'c']),
  ['a', 'b', 'c'],
)
assert.deepEqual(togglePinnedWorkspace(['a'], 'b'), ['a', 'b'])
assert.deepEqual(togglePinnedWorkspace(['a', 'b'], 'a'), ['b'])

assert.deepEqual(insertPinnedWorkspace(['a', 'b'], 'c', 'b'), ['a', 'c', 'b'])
assert.deepEqual(insertPinnedWorkspace(['a', 'b'], 'c'), ['a', 'b', 'c'])
assert.deepEqual(insertPinnedWorkspace(['a', 'b'], 'b', 'a'), ['b', 'a'])
assert.deepEqual(prunePinnedWorkspaceIds(['a', 'b'], ['a', 'b', 'c']), ['a', 'b'])
assert.deepEqual(prunePinnedWorkspaceIds(['a', 'stale', 'b'], ['a', 'b']), ['a', 'b'])

assert.deepEqual(resolvePinnedWorkspaceHydration([], { exists: true, pinnedWorkspaceIds: ['host'] }), { ids: ['host'], writeHost: false })
assert.deepEqual(resolvePinnedWorkspaceHydration(['legacy'], { exists: false, pinnedWorkspaceIds: [] }), { ids: ['legacy'], writeHost: true })
assert.deepEqual(resolvePinnedWorkspaceHydration(['legacy'], { exists: true, pinnedWorkspaceIds: ['host'] }, ['dirty']), { ids: ['dirty'], writeHost: true })

const host = await readHostWorkspacePreferences(async (input, init) => {
  assert.equal(input, WORKSPACE_PREFERENCES_ENDPOINT)
  assert.equal(init?.method, 'GET')
  return new Response(JSON.stringify({ exists: true, pinnedWorkspaceIds: ['a', 'a', 'b'], workspaceGroups: [] }), { status: 200 })
})
assert.deepEqual(host, { exists: true, pinnedWorkspaceIds: ['a', 'b'], workspaceGroups: [], workspaceGroupsSupported: true })

const legacyHost = await readHostWorkspacePreferences(async () => {
  return new Response(JSON.stringify({ exists: true, pinnedWorkspaceIds: ['legacy-host'] }), { status: 200 })
})
assert.deepEqual(legacyHost, { exists: true, pinnedWorkspaceIds: ['legacy-host'], workspaceGroups: [], workspaceGroupsSupported: false })
assert.deepEqual(
  resolveWorkspacePreferencesHydration(
    { pinnedWorkspaceIds: ['local'], workspaceGroups: [{ id: 'local-group', title: '本地分组', workspaceIds: ['a'] }] },
    legacyHost,
  ),
  { pinnedWorkspaceIds: ['legacy-host'], workspaceGroups: [{ id: 'local-group', title: '本地分组', workspaceIds: ['a'] }], writeHost: false },
  '旧 Host 缺少分组字段时必须保留浏览器同步缓存',
)
await assert.rejects(
  readHostWorkspacePreferences(async () => new Response(JSON.stringify({ exists: true, pinnedWorkspaceIds: [], workspaceGroups: 'broken' }), { status: 200 })),
  /置顶偏好响应格式无效/,
  'Host 明确返回非法分组时不得静默降级',
)

const values = new Map<string, string>()
const localStorage = {
  get length() { return values.size },
  clear() { values.clear() },
  getItem(key: string) { return values.get(key) ?? null },
  key(index: number) { return [...values.keys()][index] ?? null },
  removeItem(key: string) { values.delete(key) },
  setItem(key: string, value: string) { values.set(key, value) },
} satisfies Storage
const cachedGroups = [{ id: 'cached', title: '同步缓存', workspaceIds: ['a'] }]
saveWorkspaceGroupsCache(localStorage, cachedGroups, true)
assert.deepEqual(readWorkspaceGroupsCache(localStorage), { workspaceGroups: cachedGroups, pendingHostSync: true })
assert.equal(values.has(WORKSPACE_GROUPS_STORAGE_KEY), true)
values.set(WORKSPACE_GROUPS_STORAGE_KEY, '{broken')
assert.deepEqual(readWorkspaceGroupsCache(localStorage), { workspaceGroups: [], pendingHostSync: false }, '损坏的分组缓存必须安全退化为空列表')

assert.deepEqual(
  resolveWorkspacePreferencesHydration(
    { pinnedWorkspaceIds: ['legacy'], workspaceGroups: [] },
    { exists: true, pinnedWorkspaceIds: ['host'], workspaceGroups: [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }] },
  ),
  { pinnedWorkspaceIds: ['host'], workspaceGroups: [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }], writeHost: false },
)
assert.deepEqual(
  resolveWorkspacePreferencesHydration(
    { pinnedWorkspaceIds: ['local'], workspaceGroups: cachedGroups },
    { exists: true, pinnedWorkspaceIds: ['host'], workspaceGroups: [], workspaceGroupsSupported: true },
    undefined,
    true,
  ),
  { pinnedWorkspaceIds: ['host'], workspaceGroups: cachedGroups, writeHost: true },
  '尚未同步的本地分组必须在 Host 升级后迁移，且不得覆盖 Host 置顶',
)

await writeHostWorkspacePreferences(['a', 'a', 'b'], [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }], async (input, init) => {
  assert.equal(input, WORKSPACE_PREFERENCES_ENDPOINT)
  assert.equal(init?.method, 'PUT')
  assert.deepEqual(JSON.parse(String(init?.body)), { pinnedWorkspaceIds: ['a', 'b'], workspaceGroups: [{ id: 'knowledge', title: '数据与知识管理', workspaceIds: ['a'] }] })
  return new Response('{}', { status: 200 })
})

await writeHostPinnedWorkspaceIds(['a', 'a', 'b'], async (input, init) => {
  assert.equal(input, WORKSPACE_PREFERENCES_ENDPOINT)
  assert.deepEqual(JSON.parse(String(init?.body)), { pinnedWorkspaceIds: ['a', 'b'] }, '旧调用方不得通过空分组覆盖已保存分组')
  return new Response('{}', { status: 200 })
})
