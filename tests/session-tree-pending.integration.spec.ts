import { createRequire } from 'node:module'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { ChannelBrowser } from '../src/client/ChannelBrowser.tsx'
import { CodexWorkspaceBrowser } from '../src/client/CodexWorkspaceBrowser.tsx'
import { ScheduleBrowser } from '../src/client/ScheduleBrowser.tsx'
import { WORKSPACE_GROUPS_STORAGE_KEY } from '../src/client/pinned-workspaces.ts'
import type { PendingInteractionSnapshot, UseSessionPendingInteraction } from '../src/client/session-pending.ts'
import type { PendingInteractionKind } from '../src/client/session-pending.ts'

const createRoot = (createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}).createRoot

const t = (key: string): string => ({
  'sessions.waitingAnswer': '等待回答',
  'sessions.waitingApproval': '等待审批',
  'sessions.planReview': '计划待审',
}[key] ?? key)

const sessionActions = {
  openSession: () => {},
  archiveSession: async () => {},
  deleteSession: async () => {},
  forkSession: async () => {},
  renameSession: async () => {},
}

const EMPTY_PENDING_INTERACTIONS: PendingInteractionSnapshot = new Map()
const useEmptyPendingInteractions: UseSessionPendingInteraction = selector => selector(EMPTY_PENDING_INTERACTIONS)

type LegacySessionSummary = SessionSummary & { pendingInteraction?: PendingInteractionKind }

function createSession(id: string, displayTitle: string, pendingInteraction: PendingInteractionKind | undefined): LegacySessionSummary {
  return {
    id: id as SessionId,
    displayTitle,
    running: true,
    pendingInteraction,
    blank: false,
    updatedAt: Date.parse('2026-09-01T00:00:00.000Z'),
  }
}

function createSessionStore(session: SessionSummary) {
  const state: SessionListState = {
    ids: [session.id],
    byId: { [session.id]: session },
    current: undefined,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
  return <T,>(selector: (snapshot: SessionListState) => T): T => selector(state)
}

function createPendingInteractionStore(sessionId: string, kind: PendingInteractionKind): UseSessionPendingInteraction {
  const state = new Map([[sessionId, { kind }]])
  return selector => selector(state)
}

async function render(node: ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(node)
    await Promise.resolve()
    await Promise.resolve()
  })
  return {
    container,
    dispose: async () => {
      await act(async () => { root.unmount() })
      container.remove()
    },
  }
}

function expectPendingState(container: Element, title: string, kind: PendingInteractionKind, label: string): void {
  const row = [...container.querySelectorAll<HTMLElement>('.dcu-wb-session')]
    .find(candidate => candidate.querySelector('.dcu-wb-session-title')?.textContent === title)
  const pending = row?.querySelector<HTMLElement>('[data-state="warning"]')
  expect(pending?.dataset.pendingKind).toBe(kind)
  expect(pending?.textContent).toBe(label)
}

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

test('任务树从 SessionSummary 快照渲染等待回答状态', async () => {
  const session = createSession('workspace-session', '任务会话', 'question')
  const useSessions = createSessionStore(session)
  const workspaces = {
    baselinesReady: true,
    archivedSessionIds: [],
    items: [{ workspaceId: 'workspace-1', title: '测试项目', path: 'D:\\Workspace\\test', sessionIds: [session.id] }],
  }
  const useWorkspaces = <T,>(selector: (snapshot: typeof workspaces) => T): T => selector(workspaces)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ exists: true, pinnedWorkspaceIds: [] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })))

  const view = await render(createElement(CodexWorkspaceBrowser, {
    ...sessionActions,
    wide: true,
    useSessions,
    useSessionPendingInteraction: useEmptyPendingInteractions,
    useWorkspaces,
    t,
    deleteWorkspace: async () => {},
    insertSessionBefore: async () => {},
    insertWorkspaceBefore: async () => {},
    openPath: async () => {},
    renameWorkspace: async () => {},
    startSession: () => {},
  } as never))
  try {
    expectPendingState(view.container, '任务会话', 'question', '等待回答')
  } finally {
    await view.dispose()
  }
})

test('Host 读取失败时从同步缓存恢复分组并继续写回新操作', async () => {
  const session = createSession('cached-workspace-session', '缓存任务会话', undefined)
  const useSessions = createSessionStore(session)
  const workspaces = {
    baselinesReady: true,
    archivedSessionIds: [],
    items: [{ workspaceId: 'cached-workspace', title: '缓存项目', path: 'D:\\Workspace\\cached', sessionIds: [session.id] }],
  }
  const useWorkspaces = <T,>(selector: (snapshot: typeof workspaces) => T): T => selector(workspaces)
  window.localStorage.setItem(WORKSPACE_GROUPS_STORAGE_KEY, JSON.stringify({
    version: 1,
    workspaceGroups: [{ id: 'cached-group', title: '缓存分组', workspaceIds: ['cached-workspace'] }],
    pendingHostSync: true,
  }))
  const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'GET') throw new Error('Host 暂时不可用')
    return new Response('{}', { status: 200 })
  })
  vi.stubGlobal('fetch', fetcher)

  const view = await render(createElement(CodexWorkspaceBrowser, {
    ...sessionActions,
    wide: true,
    useSessions,
    useSessionPendingInteraction: useEmptyPendingInteractions,
    useWorkspaces,
    t,
    deleteWorkspace: async () => {},
    insertSessionBefore: async () => {},
    insertWorkspaceBefore: async () => {},
    openPath: async () => {},
    renameWorkspace: async () => {},
    startSession: () => {},
  } as never))
  try {
    expect(view.container.querySelector('.dcu-wb-collection-label')?.textContent).toContain('缓存分组')

    const createButton = view.container.querySelector<HTMLButtonElement>('button[aria-label="workspace.createGroup"]')
    await act(async () => { createButton?.click() })
    const input = document.querySelector<HTMLInputElement>('input[aria-label="workspace.groupName"]')
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setValue?.call(input, '故障期间新建')
      input?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const saveButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'sessions.save')
    await act(async () => {
      saveButton?.click()
      await Promise.resolve()
    })
    expect(fetcher.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(WORKSPACE_GROUPS_STORAGE_KEY) ?? '{}').workspaceGroups).toHaveLength(2)
  } finally {
    await view.dispose()
  }
})

test('频道树从 SessionSummary 快照渲染等待审批状态', async () => {
  const session = createSession('im:test-channel', '频道会话快照', 'approval')
  const useSessions = createSessionStore(session)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    groups: [{ id: 'wecom', label: '企业微信', sessions: [{ sessionId: session.id, title: '频道会话', running: true }] }],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })))

  const view = await render(createElement(ChannelBrowser, { ...sessionActions, useSessions, useSessionPendingInteraction: useEmptyPendingInteractions, t } as never))
  try {
    expectPendingState(view.container, '频道会话', 'approval', '等待审批')
  } finally {
    await view.dispose()
  }
})

test('定时树从 SessionSummary 快照渲染计划待审状态', async () => {
  const session = createSession('dsh-automation-session-review', '2026-09-01 08:00 - 日报任务', 'plan-review')
  const useSessions = createSessionStore(session)
  const workspaces = { archivedSessionIds: [] }
  const useWorkspaces = <T,>(selector: (snapshot: typeof workspaces) => T): T => selector(workspaces)

  const view = await render(createElement(ScheduleBrowser, {
    ...sessionActions,
    useSessions,
    useSessionPendingInteraction: useEmptyPendingInteractions,
    useWorkspaces,
    t,
  } as never))
  try {
    expectPendingState(view.container, session.displayTitle, 'plan-review', '计划待审')
  } finally {
    await view.dispose()
  }
})

test('任务树从待处理交互 Store 渲染等待审批状态', async () => {
  const session = createSession('workspace-store-session', '任务 Store 会话', undefined)
  const useSessions = createSessionStore(session)
  const useSessionPendingInteraction = createPendingInteractionStore(session.id, 'approval')
  const workspaces = {
    baselinesReady: true,
    archivedSessionIds: [],
    items: [{ workspaceId: 'workspace-store-1', title: 'Store 测试项目', path: 'D:\\Workspace\\store-test', sessionIds: [session.id] }],
  }
  const useWorkspaces = <T,>(selector: (snapshot: typeof workspaces) => T): T => selector(workspaces)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ exists: true, pinnedWorkspaceIds: [] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })))

  const view = await render(createElement(CodexWorkspaceBrowser, {
    ...sessionActions,
    wide: true,
    useSessions,
    useSessionPendingInteraction,
    useWorkspaces,
    t,
    deleteWorkspace: async () => {},
    insertSessionBefore: async () => {},
    insertWorkspaceBefore: async () => {},
    openPath: async () => {},
    renameWorkspace: async () => {},
    startSession: () => {},
  } as never))
  try {
    expectPendingState(view.container, session.displayTitle, 'approval', '等待审批')
  } finally {
    await view.dispose()
  }
})

test('频道树从待处理交互 Store 渲染等待回答状态', async () => {
  const session = createSession('im:store-channel', '频道 Store 会话快照', undefined)
  const useSessions = createSessionStore(session)
  const useSessionPendingInteraction = createPendingInteractionStore(session.id, 'question')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    groups: [{ id: 'wecom', label: '企业微信', sessions: [{ sessionId: session.id, title: '频道 Store 会话', running: true }] }],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })))

  const view = await render(createElement(ChannelBrowser, {
    ...sessionActions,
    useSessions,
    useSessionPendingInteraction,
    t,
  } as never))
  try {
    expectPendingState(view.container, '频道 Store 会话', 'question', '等待回答')
  } finally {
    await view.dispose()
  }
})

test('定时树从待处理交互 Store 渲染计划待审状态', async () => {
  const session = createSession('dsh-automation-session-store-review', '2026-09-01 09:00 - Store 日报任务', undefined)
  const useSessions = createSessionStore(session)
  const useSessionPendingInteraction = createPendingInteractionStore(session.id, 'plan-review')
  const workspaces = { archivedSessionIds: [] }
  const useWorkspaces = <T,>(selector: (snapshot: typeof workspaces) => T): T => selector(workspaces)

  const view = await render(createElement(ScheduleBrowser, {
    ...sessionActions,
    useSessions,
    useSessionPendingInteraction,
    useWorkspaces,
    t,
  } as never))
  try {
    expectPendingState(view.container, session.displayTitle, 'plan-review', '计划待审')
  } finally {
    await view.dispose()
  }
})
