import assert from 'node:assert/strict'
import { collapseProjectSessionWindow, expandedForCurrentSession, expandedForSessionMove, isTaskSession, moveBefore, nextProjectSessionWindow, orderByIds, pinnedHeaderDropIndicator, projectFolderPresentation, projectSessionWindow, readSessionDrag, readWorkspaceDrag, readWorkspaceGroupDrag, reorderDropBeforeId, resolvePinnedSectionDrop, sessionDropAction, sessionDropAfterRowId, ungroupedSessionIds, visibleSessionIds, writeSessionDrag, writeWorkspaceDrag, writeWorkspaceGroupDrag } from '../src/client/workspace-browser.ts'

const sessions = {
  a: { id: 'a', origin: 'user', blank: false },
  b: { id: 'b', origin: 'subagent', blank: false },
  c: { id: 'c', origin: 'user', blank: true },
  d: { id: 'd', origin: 'user', blank: false },
  e: { id: 'dsh-automation-session-1', origin: 'user', blank: false, displayTitle: '2026-08-18 20:05 - 天气预报' },
  f: { id: 'f', origin: 'user', blank: false, displayTitle: '2026-08-18 20:00 - 天气预报' },
  g: { id: 'im:telegram:dm:1:x', origin: 'user', blank: false, displayTitle: '你好' },
  h: { id: 'h', origin: 'user', blank: false, displayTitle: '未归组会话' },
}

assert.deepEqual(visibleSessionIds(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], sessions, ['d']), ['a', 'f', 'h'])
assert.deepEqual(ungroupedSessionIds(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], sessions, ['a'], ['d']), ['f', 'h'])
assert.equal(isTaskSession(sessions.e), false)
assert.equal(isTaskSession(sessions.g), false)
assert.equal(isTaskSession(sessions.a), true)
assert.deepEqual(moveBefore(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b'])
assert.deepEqual(moveBefore(['a', 'b', 'c'], 'a', undefined), ['b', 'c', 'a'])
assert.deepEqual(moveBefore(['a', 'b'], 'a', 'a'), ['a', 'b'])
assert.equal(reorderDropBeforeId(['a', 'b', 'c'], 'a', 'a', false), null, '悬停被拖项自身时不得显示落点')
assert.equal(reorderDropBeforeId(['a', 'b', 'c'], 'a', 'b', false), null, '最终顺序不变时不得显示落点')
assert.equal(reorderDropBeforeId(['a', 'b', 'c'], 'a', 'b', true), 'c', '向下换位时应使用移除被拖项后的下一锚点')
assert.equal(reorderDropBeforeId(['a', 'b', 'c'], 'c', 'b', true), null, '末项落回原末位时不得显示落点')
assert.equal(reorderDropBeforeId(['a', 'b', 'c'], 'external', 'b', true), 'c', '跨分区项目应按目标列表计算插入锚点')
assert.deepEqual(pinnedHeaderDropIndicator(['w1', 'w2']), { kind: 'workspace', workspaceId: 'w1' }, '置顶标题区应复用首项目顶部的插入线')
assert.deepEqual(pinnedHeaderDropIndicator([]), { kind: 'empty' }, '空置顶区才应渲染独立的起始插入线')
assert.deepEqual(resolvePinnedSectionDrop('w1', { zone: 'pinned', beforeId: 'w2' }, false), { id: 'w1', beforeId: 'w2' }, '非空置顶必须沿用蓝线锚点')
assert.deepEqual(resolvePinnedSectionDrop('w1', undefined, true), { id: 'w1' }, '空置顶松手时即使 dragleave 清掉蓝线也必须置顶')
assert.equal(resolvePinnedSectionDrop('w1', undefined, false), undefined, '非空置顶没有落点时不得误置顶')
assert.equal(resolvePinnedSectionDrop(undefined, { zone: 'pinned' }, true), undefined, '没有项目载荷时不得置顶')
assert.deepEqual(
  orderByIds([{ id: 'a' }, { id: 'b' }, { id: 'c' }], ['c', 'a'], item => item.id),
  [{ id: 'c' }, { id: 'a' }],
  '置顶展示必须按置顶 id 顺序，而不是宿主列表顺序',
)
assert.deepEqual(
  expandedForSessionMove({ existing: false }, { workspaceId: 'target', pinned: true, groupId: 'ignored', hasGroups: true }),
  { existing: false, 'section:pinned': true, 'pin:target': true },
  '移动到置顶项目时必须展开置顶区和目标项目，且不得误展开项目分组',
)
assert.deepEqual(
  expandedForSessionMove({}, { workspaceId: 'target', pinned: false, groupId: 'research', hasGroups: true }),
  { 'section:projects': true, 'workspace-group:research': true, target: true },
  '移动到自定义分组中的项目时必须展开项目区、分组和目标项目',
)
assert.deepEqual(
  expandedForSessionMove({}, { workspaceId: 'target', pinned: false, hasGroups: true }),
  { 'section:projects': true, 'workspace-group:ungrouped': true, target: true },
  '存在自定义分组时，移动到未分组项目必须展开未分组分类',
)
assert.deepEqual(
  expandedForSessionMove({}, { workspaceId: 'target', pinned: false, hasGroups: false }),
  { 'section:projects': true, target: true },
  '没有自定义分组时只需展开项目区和目标项目',
)
assert.deepEqual(
  expandedForCurrentSession({ existing: false }, 's1', {
    workspaces: [{ workspaceId: 'target', sessionIds: ['s1'] }],
    pinnedWorkspaceIds: ['target'],
    groups: [{ id: 'ignored', workspaceIds: ['target'] }],
    recentIds: [],
  }),
  { existing: false, 'section:pinned': true, 'pin:target': true },
  '当前会话在置顶项目中时必须展开置顶区和该项目',
)
assert.deepEqual(
  expandedForCurrentSession({}, 's1', {
    workspaces: [{ workspaceId: 'target', sessionIds: ['s1'] }],
    pinnedWorkspaceIds: [],
    groups: [{ id: 'research', workspaceIds: ['target'] }],
    recentIds: [],
  }),
  { 'section:projects': true, 'workspace-group:research': true, target: true },
  '当前会话在自定义分组项目中时必须展开项目区、分组和该项目',
)
assert.deepEqual(
  expandedForCurrentSession({}, 's1', {
    workspaces: [{ workspaceId: 'target', sessionIds: ['s1'] }],
    pinnedWorkspaceIds: [],
    groups: [{ id: 'research', workspaceIds: ['other'] }],
    recentIds: [],
  }),
  { 'section:projects': true, 'workspace-group:ungrouped': true, target: true },
  '存在自定义分组时，未分组项目中的当前会话必须展开未分组分类',
)
assert.deepEqual(
  expandedForCurrentSession({}, 's1', {
    workspaces: [{ workspaceId: 'target', sessionIds: ['s1'] }],
    pinnedWorkspaceIds: [],
    groups: [],
    recentIds: [],
  }),
  { 'section:projects': true, target: true },
  '没有自定义分组时，当前会话只需展开项目区和所属项目',
)
assert.deepEqual(
  expandedForCurrentSession({ existing: false }, 's1', {
    workspaces: [],
    pinnedWorkspaceIds: [],
    groups: [],
    recentIds: ['s1'],
  }),
  { existing: false, 'section:recent': true },
  '当前会话只在最近列表时必须只展开最近分区',
)
assert.deepEqual(
  expandedForCurrentSession({ existing: false, 'section:projects': false }, 'missing', {
    workspaces: [{ workspaceId: 'target', sessionIds: ['s1'] }],
    pinnedWorkspaceIds: [],
    groups: [{ id: 'research', workspaceIds: ['target'] }],
    recentIds: ['other'],
  }),
  { existing: false, 'section:projects': false },
  '会话尚未出现在树中时必须保持当前展开状态',
)
assert.deepEqual(
  projectFolderPresentation(false, true),
  { open: false, current: true },
  '当前会话所在项目收起时必须使用关闭的当前文件夹',
)
assert.deepEqual(
  projectFolderPresentation(true, true),
  { open: true, current: true },
  '当前会话所在项目展开时必须使用打开的当前文件夹',
)
assert.deepEqual(
  projectFolderPresentation(true, false),
  { open: true, current: false },
  '其他展开项目必须使用打开文件夹，但不是当前色',
)
assert.deepEqual(
  projectFolderPresentation(false, false),
  { open: false, current: false },
  '其他收起项目必须使用关闭文件夹',
)
{
  const store = new Map<string, string>()
  const data = { effectAllowed: '', setData: (type: string, value: string) => { store.set(type, value) }, getData: (type: string) => store.get(type) ?? '' } as unknown as DataTransfer
  writeSessionDrag(data, 's1', '会话')
  writeWorkspaceDrag(data, 'w1', '项目')
  assert.equal(readSessionDrag(data), 's1', '会话拖拽必须能从 dataTransfer 读回')
  assert.equal(readWorkspaceDrag(data), undefined, '同时带会话载荷时不得把父项目当成置顶目标')
}
{
  const store = new Map<string, string>()
  const data = { effectAllowed: '', setData: (type: string, value: string) => { store.set(type, value) }, getData: (type: string) => store.get(type) ?? '' } as unknown as DataTransfer
  writeWorkspaceDrag(data, 'w1', '项目')
  assert.equal(readWorkspaceDrag(data), 'w1')
  assert.equal(readSessionDrag(data, 'fallback-session'), 'fallback-session')
}
{
  const store = new Map<string, string>()
  const types: string[] = []
  const data = { effectAllowed: '', types, setData: (type: string, value: string) => { store.set(type, value); if (!types.includes(type)) types.push(type) }, getData: (type: string) => store.get(type) ?? '' } as unknown as DataTransfer
  writeSessionDrag(data, 's1', '会话')
  assert.equal(readWorkspaceDrag(data), undefined, '会话拖拽不得被识别为可置顶项目')
  assert.equal(readSessionDrag({ getData: (type: string) => type === 'text/plain' ? 'dcu-session:s1' : '' } as unknown as DataTransfer), 's1', '自定义类型被剥掉时必须还能从 text/plain 读出会话')
}
{
  const store = new Map<string, string>()
  const data = { effectAllowed: '', setData: (type: string, value: string) => { store.set(type, value) }, getData: (type: string) => store.get(type) ?? '' } as unknown as DataTransfer
  writeWorkspaceGroupDrag(data, 'g1', '项目分组')
  assert.equal(readWorkspaceGroupDrag(data), 'g1', '项目分组拖拽必须能从 dataTransfer 读回')
  assert.equal(readWorkspaceDrag(data, 'stale-workspace'), undefined, '分组载荷不得被旧项目状态误判为项目拖拽')
  assert.equal(readSessionDrag(data), undefined, '分组载荷不得被识别为会话拖拽')

  assert.equal(sessionDropAction('source', 'source'), 'reorder', '同项目拖放必须继续执行会话排序')
  assert.equal(sessionDropAction('source', 'target'), 'move', '跨项目拖放必须执行会话迁移')
  assert.equal(sessionDropAction(undefined, 'target'), 'move', '未归属项目的最近会话拖入项目时必须执行会话迁移')
}

const twenty = Array.from({ length: 20 }, (_, index) => `s${index + 1}`)
assert.deepEqual(
  projectSessionWindow(twenty.slice(0, 4), { expanded: false, page: 1 }),
  { ids: ['s1', 's2', 's3', 's4'], showMore: false },
  '不超过 5 条时必须全部显示，且不出现展开按钮',
)
assert.deepEqual(
  projectSessionWindow(twenty.slice(0, 6), { expanded: false, page: 1 }),
  { ids: ['s1', 's2', 's3', 's4', 's5'], showMore: true },
  '未展开时只显示前 5 条，并提供展开显示',
)
assert.deepEqual(
  projectSessionWindow(twenty.slice(0, 6), { expanded: false, page: 1 }, 's6'),
  { ids: ['s1', 's2', 's3', 's4', 's5', 's6'], showMore: false },
  '当前会话落在前 5 条之外时必须追加到末尾；全部可见后不再显示按钮',
)
assert.deepEqual(nextProjectSessionWindow(undefined), { expanded: true, page: 1 }, '第一次展开显示把页码设为 1')
assert.deepEqual(
  projectSessionWindow(twenty, nextProjectSessionWindow(undefined)),
  { ids: twenty.slice(0, 15), showMore: true },
  '第一次展开显示 15 条，后面还有会话时按钮仍是展开显示',
)
const secondPage = nextProjectSessionWindow(nextProjectSessionWindow(undefined))
assert.deepEqual(secondPage, { expanded: true, page: 2 }, '再次展开显示必须再加一页')
assert.deepEqual(
  projectSessionWindow(twenty, secondPage),
  { ids: twenty, showMore: false },
  '窗口盖住全部会话后，展开显示按钮必须消失',
)
assert.deepEqual(
  projectSessionWindow(twenty, collapseProjectSessionWindow()),
  { ids: twenty.slice(0, 5), showMore: true },
  '折叠项目文件夹后必须回到前 5 条和展开显示',
)
const visibleWindow = twenty.slice(0, 5)
assert.equal(sessionDropAfterRowId({ hoveredId: 's5', beforeId: 's6' }, visibleWindow), 's5', '下一行被折起时，蓝线必须画在当前悬停行下方')
assert.equal(sessionDropAfterRowId({ hoveredId: 's4', beforeId: 's5' }, visibleWindow), undefined, '下一行仍可见时不得改画到悬停行下方')
assert.equal(sessionDropAfterRowId({ hoveredId: 's5', beforeId: undefined }, visibleWindow), 's5', '落到完整列表末尾时，蓝线画在最后一条可见会话下方')
assert.deepEqual(
  visibleWindow.filter(id => sessionDropAfterRowId({ hoveredId: 's5', beforeId: 's6' }, visibleWindow) === id),
  ['s5'],
  '折起锚点时不得把 after 线画满整列可见会话',
)
const renderedWithCurrentSession = ['a', 'b', 'c', 'd', 'e', 'g']
assert.deepEqual(
  renderedWithCurrentSession.filter(id => sessionDropAfterRowId({ hoveredId: 'e', beforeId: 'f' }, renderedWithCurrentSession) === id),
  ['e'],
  '当前会话被追加到末尾且下一行被折起时，蓝线只能出现在悬停行',
)
assert.equal(sessionDropAfterRowId({ hoveredId: 'f', beforeId: 'g' }, renderedWithCurrentSession), undefined, '悬停行不在可见窗口时不得画会话行蓝线')
assert.equal(sessionDropAfterRowId({ beforeId: 's6' }, visibleWindow), undefined, '项目级拖放由容器高亮承担，不画会话行蓝线')
