import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '../src/client/index.ts'
import { CodexSidebar } from '../src/client/CodexSidebar.tsx'
import { ConnectorsSection } from '../src/client/ConnectorsSection.tsx'

const createRoot = (createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}).createRoot

let runtime: SlotTestRuntime | undefined

afterEach(async () => { await runtime?.dispose() })

test('侧栏替换以更低优先级接管工作区树，并保留 footer action 子插槽', async () => {
  runtime = await SlotTestRuntime.create()
  runtime.provide('connection', { api: { host: { openPath: async () => ({ result: { ok: true, value: undefined } }) } } })
  runtime.provide('conversation', {})
  runtime.provide('layout', { toggleSidebar: () => {} })
  runtime.provide('locale', {
    register: () => () => {},
    bind: () => (key: string) => key,
  })
  await runtime.root.declare({
    sidebar: { kind: 'single', scope: 'root', owner: { collapsed: false, width: 280 } },
  }, () => null)

  await runtime.mount({ inject, apply })
  expect(runtime.slots.entries('sidebar')).toHaveLength(1)
  expect(runtime.slots.entries('sidebar.workspaces')).toHaveLength(1)
  expect(runtime.slots.entries('sidebar.footer.action')).toHaveLength(0)

  const disposeFooter = runtime.slots.register({
    name: 'sidebar.footer.action', id: 'compatibility-probe', order: 0,
  }, () => null)
  expect(runtime.slots.entries('sidebar.footer.action')).toHaveLength(1)
  disposeFooter()
})

test('未安装 IM 和定时插件时配套插槽没有注册项', async () => {
  runtime = await SlotTestRuntime.create()
  runtime.provide('connection', { api: { host: { openPath: async () => ({ result: { ok: true, value: undefined } }) } } })
  runtime.provide('conversation', {})
  runtime.provide('layout', { toggleSidebar: () => {} })
  runtime.provide('locale', {
    register: () => () => {},
    bind: () => (key: string) => key,
  })
  await runtime.root.declare({
    sidebar: { kind: 'single', scope: 'root', owner: { collapsed: false, width: 280 } },
  }, () => null)

  await runtime.mount({ inject, apply })
  expect(runtime.slots.entries('sidebar.channels')).toHaveLength(0)
  expect(runtime.slots.entries('sidebar.schedule')).toHaveLength(0)
})

test('搜索和窄轨切换不会重渲染或重新挂载工作区树', async () => {
  vi.useFakeTimers()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let workspaceRenders = 0
  const WorkspaceProbe = (): null => { workspaceRenders += 1; return null }
  const renderSlot = (name: string) => name === 'sidebar.workspaces'
    ? createElement(WorkspaceProbe)
    : name === 'sidebar.settings'
      ? createElement('button', { 'aria-haspopup': 'dialog' })
      : null
  const sessions = { ids: [], byId: {} }
  const workspaces = { archivedSessionIds: [], items: [] }
  const useSessions = (selector: (state: typeof sessions) => unknown): unknown => selector(sessions)
  const useWorkspaces = (selector: (state: typeof workspaces) => unknown): unknown => selector(workspaces)
  const base = {
    width: 240,
    collapsed: false,
    renderSlot,
    t: (key: string) => key,
    useSessions,
    useWorkspaces,
    openSession: () => {},
    startSession: () => {},
    toggleSidebar: () => {},
    archiveSession: async () => {},
    deleteSession: async () => {},
    forkSession: async () => {},
    renameSession: async () => {},
    openPath: () => {},
  }

  try {
    await act(async () => { root.render(createElement(CodexSidebar, base as never)) })
    expect(workspaceRenders).toBe(1)
    const searchButton = container.querySelector<HTMLButtonElement>('[aria-label="sidebar.search"]')
    await act(async () => { searchButton?.click() })
    expect(container.querySelector('.dcu-search-scrim')).not.toBeNull()
    expect(workspaceRenders).toBe(1)

    await act(async () => { root.render(createElement(CodexSidebar, { ...base, collapsed: true, width: 56 } as never)) })
    expect(container.querySelector('.dcu-root')?.classList.contains('dcu-collapsing')).toBe(true)
    expect(container.querySelector('.dcu-root')?.classList.contains('dcu-compact')).toBe(false)
    await act(async () => { vi.advanceTimersByTime(140) })
    expect(container.querySelector('.dcu-root')?.classList.contains('dcu-compact')).toBe(true)
    expect(workspaceRenders).toBe(1)

    await act(async () => { root.render(createElement(CodexSidebar, base as never)) })
    expect(container.querySelector('.dcu-root')?.classList.contains('dcu-compact')).toBe(false)
    expect(container.querySelector('.dcu-root')?.classList.contains('dcu-collapsing')).toBe(false)
    expect(workspaceRenders).toBe(1)
  } finally {
    vi.useRealTimers()
    await act(async () => { root.unmount() })
    container.remove()
  }
})

test('连接器设置页嵌入可用的市场并只接受该 iframe 的 Prompt 消息', async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const startPromptSession = vi.fn(async () => {})
  const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  const sessionStore = {
    getSnapshot: () => ({ current: undefined }),
    subscribe: () => () => {},
  }
  try {
    await act(async () => {
      root.render(createElement(ConnectorsSection, {
        sessionStore,
        startPromptSession,
        t: ((key: string) => key) as never,
      } as never))
      await Promise.resolve()
      await Promise.resolve()
    })
    const frame = container.querySelector<HTMLIFrameElement>('.dcu-connector-frame')
    expect(frame).not.toBeNull()
    expect(fetchMock).toHaveBeenCalledWith('/mcp-connector/ui/', expect.objectContaining({ method: 'HEAD', cache: 'no-store' }))

    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://untrusted.example',
      source: frame?.contentWindow,
      data: { type: 'mcp-connector:start-session', requestId: 'bad', prompt: 'ignore me' },
    }))
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: window.location.origin,
        source: frame?.contentWindow,
        data: { type: 'mcp-connector:start-session', requestId: 'good', prompt: 'Hello MCP' },
      }))
      await Promise.resolve()
    })
    expect(startPromptSession).toHaveBeenCalledTimes(1)
    expect(startPromptSession).toHaveBeenCalledWith('Hello MCP')
  } finally {
    vi.unstubAllGlobals()
    await act(async () => { root.unmount() })
    container.remove()
  }
})
