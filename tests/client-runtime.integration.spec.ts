import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { apply, startWorkspaceSession } from '../src/client/index.ts'
import { CodexSidebar } from '../src/client/CodexSidebar.tsx'
import { ConnectorsSection } from '../src/client/ConnectorsSection.tsx'

const createRoot = (createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}).createRoot

type SlotEntry = { readonly name: string; readonly [key: string]: unknown }

class ClientApplyHarness {
  private readonly slotEntries = new Map<string, SlotEntry[]>()
  private readonly disposers: Array<() => void> = []

  readonly slots = {
    inject: (_name: string, mount: () => (() => void) | void): void => {
      const dispose = mount()
      if (typeof dispose === 'function') this.disposers.push(dispose)
    },
    register: (spec: SlotEntry, _component?: unknown): (() => void) => {
      const entries = this.slotEntries.get(spec.name) ?? []
      entries.push(spec)
      this.slotEntries.set(spec.name, entries)
      return () => {
        const current = this.slotEntries.get(spec.name) ?? []
        this.slotEntries.set(spec.name, current.filter(entry => entry !== spec))
      }
    },
    entries: (name: string): readonly SlotEntry[] => this.slotEntries.get(name) ?? [],
    entriesOfSlot: (name: string): readonly SlotEntry[] => this.slotEntries.get(name) ?? [],
    subscribe: (): (() => void) => () => {},
  }

  readonly ctx = {
    slots: this.slots,
    locale: {
      register: () => () => {},
      bind: () => (key: string) => key,
    },
    layout: { toggleSidebar: () => {} },
    sessions: {
      open: () => {},
      fork: async () => 'forked-session',
      binding: () => undefined,
      list: { getSnapshot: () => ({ current: undefined, byId: {} }), subscribe: () => () => {} },
    },
    workspaces: {
      archiveSession: async () => {},
      delete: async () => {},
      rename: async () => {},
      insertBefore: async () => {},
      insertSessionBefore: async () => {},
      list: { getSnapshot: () => ({ items: [] }) },
    },
    get: (name: string): unknown => name === 'connection'
      ? { api: { host: { openPath: async () => ({ result: { ok: true, value: undefined } }) } } }
      : name === 'conversation' ? {} : undefined,
    effect: (mount: () => (() => void) | void): void => {
      const dispose = mount()
      if (typeof dispose === 'function') this.disposers.push(dispose)
    },
  }

  mount(): void {
    apply(this.ctx as never)
  }

  dispose(): void {
    for (const dispose of this.disposers.reverse()) dispose()
  }
}

let runtime: ClientApplyHarness | undefined

afterEach(() => { runtime?.dispose(); runtime = undefined })

test('新建任务优先使用 Archive Manager 提供的 uiWorkspace，并保留官方回退', () => {
  const archiveStart = vi.fn()
  const coreStart = vi.fn()
  const workspaceId = 'workspace-1'
  startWorkspaceSession({
    get: (name: string) => name === 'uiWorkspace' ? { startSession: archiveStart } : undefined,
    workspaces: { startSession: coreStart },
  } as never, workspaceId as never)
  expect(archiveStart).toHaveBeenCalledWith(workspaceId)
  expect(coreStart).not.toHaveBeenCalled()

  startWorkspaceSession({
    get: () => undefined,
    workspaces: { startSession: coreStart },
  } as never, workspaceId as never)
  expect(coreStart).toHaveBeenCalledWith(workspaceId)
})

test('侧栏替换以更低优先级接管工作区树，并保留 footer action 子插槽', async () => {
  runtime = new ClientApplyHarness()
  runtime.mount()
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
  runtime = new ClientApplyHarness()
  runtime.mount()
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

test('扩展分组默认展开，展开偏好会持久化且悬停不改变展开状态', async () => {
  window.localStorage.removeItem('dsh-codex-ui.sidebar-expansion.v1')
  const container = document.createElement('div')
  document.body.appendChild(container)
  let root = createRoot(container)
  const sessions = { ids: [], byId: {} }
  const workspaces = { archivedSessionIds: [], items: [] }
  const base = {
    width: 240,
    collapsed: false,
    renderSlot: () => null,
    t: (key: string) => key,
    useSessions: (selector: (state: typeof sessions) => unknown): unknown => selector(sessions),
    useWorkspaces: (selector: (state: typeof workspaces) => unknown): unknown => selector(workspaces),
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
    const extensions = container.querySelector<HTMLButtonElement>('.dcu-extensions-toggle')
    const extensionsGroup = container.querySelector<HTMLElement>('.dcu-extensions-group')
    expect(extensions?.getAttribute('aria-expanded')).toBe('true')

    await act(async () => { extensions?.click() })
    expect(extensions?.getAttribute('aria-expanded')).toBe('false')
    expect(window.localStorage.getItem('dsh-codex-ui.sidebar-expansion.v1')).toBe('{"extensions":false}')
    expect(container.querySelector<HTMLElement>('.dcu-extension-panel')?.getAttribute('data-open')).toBe('false')
    expect([...container.querySelectorAll<HTMLButtonElement>('.dcu-extension-items button')].every(item => item.tabIndex === -1)).toBe(true)

    await act(async () => { extensionsGroup?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    expect(extensions?.getAttribute('aria-expanded')).toBe('false')
    await act(async () => { extensionsGroup?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })) })
    expect(extensions?.getAttribute('aria-expanded')).toBe('false')

    await act(async () => { root.unmount() })
    root = createRoot(container)
    await act(async () => { root.render(createElement(CodexSidebar, base as never)) })
    const remountedExtensions = container.querySelector<HTMLButtonElement>('.dcu-extensions-toggle')
    const remountedItems = container.querySelectorAll<HTMLButtonElement>('.dcu-extension-items button')
    expect(remountedExtensions?.getAttribute('aria-expanded')).toBe('false')
    expect([...remountedItems].every(item => item.tabIndex === -1)).toBe(true)

    await act(async () => { remountedExtensions?.click() })
    expect(remountedExtensions?.getAttribute('aria-expanded')).toBe('true')
    expect(window.localStorage.getItem('dsh-codex-ui.sidebar-expansion.v1')).toBe('{"extensions":true}')
    remountedExtensions?.focus()
    expect(document.activeElement).toBe(remountedExtensions)
    expect([...remountedItems].every(item => item.tabIndex === 0)).toBe(true)
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
    window.localStorage.removeItem('dsh-codex-ui.sidebar-expansion.v1')
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
