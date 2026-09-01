import { createRequire } from 'node:module'
import type { SessionId, SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { ChannelBrowser } from '../src/client/ChannelBrowser.tsx'
import { CodexWorkspaceBrowser } from '../src/client/CodexWorkspaceBrowser.tsx'
import { ScheduleBrowser } from '../src/client/ScheduleBrowser.tsx'

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

function createSession(id: string, displayTitle: string, pendingInteraction: SessionSummary['pendingInteraction']): SessionSummary {
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

function expectPendingState(container: Element, title: string, kind: NonNullable<SessionSummary['pendingInteraction']>, label: string): void {
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

test('频道树从 SessionSummary 快照渲染等待审批状态', async () => {
  const session = createSession('im:test-channel', '频道会话快照', 'approval')
  const useSessions = createSessionStore(session)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    groups: [{ id: 'wecom', label: '企业微信', sessions: [{ sessionId: session.id, title: '频道会话', running: true }] }],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })))

  const view = await render(createElement(ChannelBrowser, { ...sessionActions, useSessions, t } as never))
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
    useWorkspaces,
    t,
  } as never))
  try {
    expectPendingState(view.container, session.displayTitle, 'plan-review', '计划待审')
  } finally {
    await view.dispose()
  }
})
