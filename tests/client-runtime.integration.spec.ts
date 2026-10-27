import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { apply, startWorkspaceSession } from '../src/client/index.ts'
import { CodexSidebar } from '../src/client/CodexSidebar.tsx'
import { HostActionError } from '../src/client/user-error.ts'

const createRoot = (createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}).createRoot

type SlotEntry = { readonly name: string; readonly [key: string]: unknown }

class ClientApplyHarness {
  private readonly slotEntries = new Map<string, SlotEntry[]>()
  private readonly disposers: Array<() => void> = []

  readonly slots = {
    snapshot: () => [],
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
    // 此夹具不提供可选的配置文件服务。
    inject: () => () => {},
    slots: this.slots,
    locale: {
      register: () => () => {},
      bind: () => (key: string) => key,
      subscribe: () => () => {},
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

test('新建任务有 reflect 时不硬读未注入的 uiWorkspace', () => {
  const archiveStart = vi.fn()
  startWorkspaceSession({
    reflect: { get: (name: string) => name === 'uiWorkspace' ? { startSession: archiveStart } : undefined },
    get uiWorkspace(): never { throw new Error('cannot get property "uiWorkspace" without inject') },
    get() { throw new Error('get should wait for reflect') },
    workspaces: { startSession: vi.fn() },
  } as never, 'workspace-reflect' as never)
  expect(archiveStart).toHaveBeenCalledWith('workspace-reflect')
})

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

test('新建任务缺少两路工作区服务时记录诊断', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    startWorkspaceSession({
      get: () => undefined,
      workspaces: {},
    } as never)
    expect(warn).toHaveBeenCalledWith('DSH 工作空间服务尚未就绪，无法新建会话。')
  } finally {
    warn.mockRestore()
  }
})

test('会话操作适配层保留 Host 结构化错误', async () => {
  runtime = new ClientApplyHarness()
  const renameFailure = {
    code: 'session/title-invalid',
    details: { sessionId: 'session-1' },
    isDSHRemoteError: true,
    message: 'invalid title',
  }
  const deleteFailure = {
    code: 'session/not-found',
    details: { sessionId: 'session-1' },
    isDSHRemoteError: true,
    message: 'missing session',
  }
  Object.assign(runtime.ctx.sessions, {
    binding: () => ({ session: { rename: async () => ({ ok: false, error: renameFailure }) } }),
  })
  Object.assign(runtime.ctx, {
    get: (name: string): unknown => name === 'connection'
      ? { api: { host: { openPath: async () => ({ result: { ok: true, value: undefined } }) } } }
      : name === 'remote.workspaceRegistry'
        ? { deleteSession: async () => ({ ok: false, error: deleteFailure }) }
        : name === 'conversation' ? {} : undefined,
  })
  runtime.mount()
  const workspace = runtime.slots.entries('sidebar.workspaces')[0]
  const actions = (workspace.inject as (() => {
    renameSession: (sessionId: string, title: string) => Promise<void>
    deleteSession: (sessionId: string) => Promise<void>
  }))()

  await expect(actions.renameSession('session-1', '新名称')).rejects.toMatchObject({
    action: 'rename',
    reason: renameFailure,
  } satisfies Partial<HostActionError>)
  await expect(actions.deleteSession('session-1')).rejects.toMatchObject({
    action: 'delete',
    reason: deleteFailure,
  } satisfies Partial<HostActionError>)
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

test('折叠入口保留在侧栏，不再占用宿主标题栏插槽', () => {
  runtime = new ClientApplyHarness()
  runtime.mount()
  for (const name of ['shell.leading', 'shell.overlay']) {
    expect(runtime.slots.entries(name)).toHaveLength(0)
  }
  runtime.dispose()
  runtime = undefined
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
    await act(async () => { vi.advanceTimersByTime(250) })
    expect(container.querySelector('.dcu-root')?.classList.contains('dcu-collapsing')).toBe(true)
    await act(async () => { vi.advanceTimersByTime(250) })
    expect(container.querySelector('.dcu-root')?.classList.contains('dcu-compact')).toBe(true)
    expect(workspaceRenders).toBe(1)

    await act(async () => { root.render(createElement(CodexSidebar, base as never)) })
    expect(container.querySelector('.dcu-root')?.classList.contains('dcu-compact')).toBe(false)
    expect(container.querySelector('.dcu-root')?.classList.contains('dcu-collapsing')).toBe(false)
    expect(workspaceRenders).toBe(1)
    await act(async () => { root.render(createElement(CodexSidebar, { ...base, collapsed: true, width: 56 } as never)) })
    await act(async () => { vi.advanceTimersByTime(100) })
    await act(async () => { root.render(createElement(CodexSidebar, base as never)) })
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(container.querySelector('.dcu-root')?.classList.contains('dcu-compact')).toBe(false)
    expect(workspaceRenders).toBe(1)
  } finally {
    vi.useRealTimers()
    await act(async () => { root.unmount() })
    container.remove()
  }
})

test('扩展分组默认收起，展开偏好会持久化且悬停不改变展开状态', async () => {
  const storage = window.localStorage ?? new Map<string, string>()
  if (window.localStorage === undefined) {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value) }, removeItem: (key: string) => { storage.delete(key) } },
    })
  }
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
    expect(extensions?.getAttribute('aria-expanded')).toBe('false')

    await act(async () => { extensions?.click() })
    expect(extensions?.getAttribute('aria-expanded')).toBe('true')
    expect(window.localStorage.getItem('dsh-codex-ui.sidebar-expansion.v1')).toBe('{"extensions":true}')
    expect(container.querySelector<HTMLElement>('.dcu-extension-panel')?.getAttribute('data-open')).toBe('true')
    expect([...container.querySelectorAll<HTMLButtonElement>('.dcu-extension-items button')].every(item => item.tabIndex === 0)).toBe(true)

    await act(async () => { extensionsGroup?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    expect(extensions?.getAttribute('aria-expanded')).toBe('true')
    await act(async () => { extensionsGroup?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })) })
    expect(extensions?.getAttribute('aria-expanded')).toBe('true')

    await act(async () => { root.unmount() })
    root = createRoot(container)
    await act(async () => { root.render(createElement(CodexSidebar, base as never)) })
    const remountedExtensions = container.querySelector<HTMLButtonElement>('.dcu-extensions-toggle')
    const remountedItems = container.querySelectorAll<HTMLButtonElement>('.dcu-extension-items button')
    expect(remountedExtensions?.getAttribute('aria-expanded')).toBe('true')
    expect([...remountedItems].every(item => item.tabIndex === 0)).toBe(true)

    await act(async () => { remountedExtensions?.click() })
    expect(remountedExtensions?.getAttribute('aria-expanded')).toBe('false')
    expect(window.localStorage.getItem('dsh-codex-ui.sidebar-expansion.v1')).toBe('{"extensions":false}')
    remountedExtensions?.focus()
    expect(document.activeElement).toBe(remountedExtensions)
    expect([...remountedItems].every(item => item.tabIndex === -1)).toBe(true)
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
    window.localStorage.removeItem('dsh-codex-ui.sidebar-expansion.v1')
  }
})

test('插件侧栏面板收进扩展，展开菜单和窄轨都能看到，不再画到顶栏', async () => {
  window.localStorage.removeItem('dsh-codex-ui.sidebar-expansion.v1')
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const sessions = { ids: [], byId: {} }
  const workspaces = { archivedSessionIds: [], items: [] }
  const selectPanel = vi.fn()
  const panels = [
    { id: 'dsh-context', label: '上下文洞察', order: 30 },
    { id: 'schedules', label: '自动化任务', order: 10 },
    { id: 'board', label: '任务看板', order: 20 },
  ]
  try {
    await act(async () => {
      root.render(createElement(CodexSidebar, {
        width: 240,
        collapsed: false,
        renderSlot: () => null,
        t: (key: string) => key,
        useSessions: (selector: (state: typeof sessions) => unknown) => selector(sessions),
        useWorkspaces: (selector: (state: typeof workspaces) => unknown) => selector(workspaces),
        openSession: () => {},
        startSession: () => {},
        toggleSidebar: () => {},
        archiveSession: async () => {},
        deleteSession: async () => {},
        forkSession: async () => {},
        renameSession: async () => {},
        openPath: () => {},
        selectPanel,
        globalPanels: { getSnapshot: () => panels, subscribe: () => () => {} },
      } as never))
    })
    const extensionItems = container.querySelector('.dcu-extension-items')
    const extensionText = extensionItems?.textContent ?? ''
    expect(extensionText).toContain('自动化任务')
    expect(extensionText).toContain('任务看板')
    expect(extensionText).toContain('上下文洞察')
    const extensionLabels = [...container.querySelectorAll('.dcu-extension-items button')].map(button => button.textContent ?? '')
    const pluginsAt = extensionLabels.indexOf('sidebar.plugins')
    expect(extensionLabels.slice(pluginsAt + 1)).toEqual(['自动化任务', '任务看板', '上下文洞察'])
    expect(container.querySelector('.dcu-menu [aria-label="sidebar.tasksTab"]')).toBeNull()
    const pluginButtons = [...container.querySelectorAll<HTMLButtonElement>('.dcu-extension-items button')].filter(button => button.textContent === '任务看板' || button.textContent === '上下文洞察')
    expect(pluginButtons).toHaveLength(2)
    expect(pluginButtons.every(button => button.tabIndex === -1)).toBe(true)
    const topLevel = [...container.querySelectorAll('.dcu-menu > button, .dcu-menu > .dcu-global-panel')]
    expect(topLevel.some(button => button.textContent === '任务看板' || button.textContent === '上下文洞察')).toBe(false)
    expect(container.querySelector('.dcu-compact-nav button[aria-label="任务看板"]')).not.toBeNull()
    expect(container.querySelector('.dcu-compact-nav button[aria-label="上下文洞察"]')).not.toBeNull()
    const compactLabels = [...container.querySelectorAll('.dcu-compact-nav button')].map(button => button.getAttribute('aria-label'))
    const compactPlugins = compactLabels.indexOf('sidebar.plugins')
    expect(compactLabels.slice(compactPlugins + 1)).toEqual(['自动化任务', '任务看板', '上下文洞察'])
    pluginButtons[0]?.click()
    expect(selectPanel).toHaveBeenCalledWith('board')
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
    window.localStorage.removeItem('dsh-codex-ui.sidebar-expansion.v1')
  }
})



test('全局搜索设置根条目可以触发官方设置入口', async () => {
 Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container)
 const opened=vi.fn();const sessions={ids:[],byId:{}};const workspaces={archivedSessionIds:[],items:[]}
 try{
 await act(async()=>{root.render(createElement(CodexSidebar,{
 width:240,collapsed:false,t:(key:string)=>key,
 useSessions:(f:(s:typeof sessions)=>unknown)=>f(sessions),useWorkspaces:(f:(s:typeof workspaces)=>unknown)=>f(workspaces),
 renderSlot:(name:string)=>name==='sidebar.settings'?createElement('button',{ 'aria-haspopup':'dialog',onClick:opened }):null,
 openSession:()=>{},startSession:()=>{},toggleSidebar:()=>{},archiveSession:async()=>{},deleteSession:async()=>{},forkSession:async()=>{},renameSession:async()=>{},openPath:()=>{},
 } as never))})
 await act(async()=>{container.querySelector<HTMLButtonElement>('[aria-label="sidebar.search"]')!.click()})
 const entry=[...container.querySelectorAll<HTMLButtonElement>('.dcu-search-row')].find(button=>button.textContent?.includes('search.settings'))!
 expect(entry).toBeDefined();await act(async()=>{entry.click()})
 expect(opened).toHaveBeenCalledTimes(1)
 }finally{await act(async()=>{root.unmount()});container.remove()}
})
