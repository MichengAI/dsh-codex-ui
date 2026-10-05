import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, expect, test, vi } from 'vitest'
import type { DirectoryFlowOwnerProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import { createWorkspaceShortcutSource } from '../src/client/workspace-shortcuts.ts'
import { WorkspaceShortcutBridge } from '../src/client/WorkspaceShortcutBridge.tsx'
import { CodexSidebar } from '../src/client/CodexSidebar.tsx'
import { registerWorkspaceDirectoryFlow, WORKSPACE_DIRECTORY_FLOW } from '../src/client/workspace-directory-flow.ts'

beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true) })

function fixture() {
  let state = { searchRequest: 7, addRequested: false }
  const listeners = new Set<() => void>()
  const slotListeners = new Set<() => void>()
  const set = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; for (const listener of listeners) listener() }
  const bindings = {
    hooks: { workspaceShortcuts: { getSnapshot: () => state, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } } } },
    closeAddWorkspace: vi.fn(() => { set({ addRequested: false }) }),
    setDirectoryBusy: vi.fn(),
    createWorkspace: vi.fn(async (_input: { path: string }) => ({ workspaceId: 'new-workspace' })),
  }
  const official = { locale: 'workspace', inject: () => bindings }
  let entries = [official]
  const source = createWorkspaceShortcutSource({
    entries: () => entries,
    subscribe: (_name, listener) => { slotListeners.add(listener); return () => { slotListeners.delete(listener) } },
  })
  const replace = (present: boolean) => { entries = present ? [official] : []; for (const listener of slotListeners) listener() }
  return { source, bindings, listeners, slotListeners, set, replace }
}

test('official requests stay live through unload/re-enable without replaying old searches', () => {
  const f = fixture()
  const update = vi.fn()
  f.source.subscribe(update)
  expect(f.source.getSnapshot().searchRequest).toBe(0)
  f.set({ searchRequest: 8 })
  expect(f.source.getSnapshot().searchRequest).toBe(1)
  const snapshot = f.source.getSnapshot()
  f.set({ searchRequest: 8 })
  expect(f.source.getSnapshot()).toBe(snapshot)
  f.replace(false)
  expect(f.listeners.size).toBe(0)
  expect(f.source.getSnapshot().bindings).toBeUndefined()
  f.set({ searchRequest: 12 })
  f.replace(true)
  expect(f.source.getSnapshot().searchRequest).toBe(1)
  f.set({ searchRequest: 13, addRequested: true })
  expect(f.source.getSnapshot()).toMatchObject({ searchRequest: 2, addRequested: true })
  f.source.dispose()
  expect(f.listeners.size + f.slotListeners.size).toBe(0)
})

test('bridge opens search and adopts one directory, with cancellation and error recovery', async () => {
  const f = fixture()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const search = vi.fn(), start = vi.fn()
  let owner: DirectoryFlowOwnerProps
  try {
    await act(async () => { root.render(createElement(WorkspaceShortcutBridge, {
      source: f.source, openSearch: search, startSession: start,
      renderDirectoryFlow: flow => { owner = flow; return null }, t: key => key,
    })) })
    expect(search).not.toHaveBeenCalled()
    await act(async () => { f.set({ searchRequest: 8 }) })
    expect(search).toHaveBeenCalledTimes(1)
    await act(async () => { f.set({ addRequested: true }) })
    expect(owner!.open).toBe(true)
    await act(async () => { owner!.onCancel() })
    expect(owner!.open).toBe(false)
    await act(async () => { f.set({ addRequested: true }) })
    await act(async () => { owner!.onPicked('D:/project'); owner!.onPicked('D:/project') })
    expect(f.bindings.createWorkspace).toHaveBeenCalledExactlyOnceWith({ path: 'D:/project' })
    expect(start).toHaveBeenCalledExactlyOnceWith('new-workspace')
    expect(owner!.open).toBe(false)
    expect(owner!.busy).toBe(false)
    f.bindings.createWorkspace.mockRejectedValueOnce(new Error('Denied'))
    await act(async () => { f.set({ addRequested: true }) })
    await act(async () => { owner!.onPicked('D:/denied') })
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Denied')
    expect(start).toHaveBeenCalledTimes(1)
    await act(async () => { f.replace(false) })
    expect(document.querySelector('[role="alert"]')).toBeNull()
  } finally {
    await act(async () => { root.unmount() })
    expect(f.bindings.setDirectoryBusy).toHaveBeenLastCalledWith(false)
    f.source.dispose(); container.remove()
  }
})

test('pending adoption cannot start a session after the official plugin unloads', async () => {
  const f = fixture()
  let finish!: (value: { workspaceId: string }) => void
  f.bindings.createWorkspace.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const container = document.createElement('div'), root = createRoot(container), start = vi.fn()
  let owner: DirectoryFlowOwnerProps
  try {
    await act(async () => { root.render(createElement(WorkspaceShortcutBridge, {
      source: f.source, openSearch: () => {}, startSession: start,
      renderDirectoryFlow: flow => { owner = flow; return null }, t: key => key,
    })) })
    await act(async () => { f.set({ addRequested: true }) })
    await act(async () => { owner!.onPicked('D:/project') })
    expect(owner!.busy).toBe(true)
    await act(async () => { f.replace(false); finish({ workspaceId: 'late' }) })
    expect(start).not.toHaveBeenCalled()
  } finally { await act(async () => { root.unmount() }); f.source.dispose() }
})

test('collapsed sidebar keeps both shortcut outlets without rerendering the workspace tree', async () => {
  const f = fixture(), container = document.createElement('div'), root = createRoot(container)
  document.body.append(container)
  let owner: DirectoryFlowOwnerProps, treeRenders = 0
  const Tree = () => { treeRenders++; return null }
  const sessions = { ids: [], byId: {} }, workspaces = { items: [], archivedSessionIds: [] }
  try {
    await act(async () => { root.render(createElement(CodexSidebar, {
      workspaceShortcuts: f.source, collapsed: true, width: 56,
      renderSlot: (name: string, input: unknown) => {
        if (name === WORKSPACE_DIRECTORY_FLOW) { owner = input as DirectoryFlowOwnerProps; return null }
        return name === 'sidebar.workspaces' ? createElement(Tree) : null
      },
      useSessions: (select: (state: typeof sessions) => unknown) => select(sessions),
      useWorkspaces: (select: (state: typeof workspaces) => unknown) => select(workspaces),
      t: (key: string) => key, openSession: () => {}, startSession: () => {}, toggleSidebar: () => {},
      archiveSession: async () => {}, deleteSession: async () => {}, forkSession: async () => {},
      renameSession: async () => {}, openPath: () => {},
    } as never)) })
    expect(container.querySelector('.dcu-compact')).not.toBeNull()
    const initial = treeRenders
    await act(async () => { f.set({ searchRequest: 8 }) })
    expect(container.querySelector('.dcu-search-scrim')).not.toBeNull()
    await act(async () => { f.set({ addRequested: true }) })
    expect(owner!.open).toBe(true)
    expect(treeRenders).toBe(initial)
  } finally { await act(async () => { root.unmount() }); f.source.dispose(); container.remove() }
})

test('directory outlet preserves host picker inject/locale and follows provider replacement', () => {
  const component = () => null, injected = () => ({ pick: () => {} })
  let winner: object | undefined = { component, inject: injected, locale: 'picker' }
  let notify!: () => void, dispose!: () => void
  const offEntry = vi.fn(), offSubscription = vi.fn()
  const register = vi.fn(function(this: unknown) { expect(this).toBe(slots); return offEntry })
  const slots = {
    inject: (_name: string, mount: () => () => void) => { dispose = mount() },
    entriesOfSlot: () => winner ? [winner] : [],
    subscribe: (_name: string, listener: () => void) => { notify = listener; return offSubscription },
    register,
  }
  registerWorkspaceDirectoryFlow({ slots } as never)
  expect(register).toHaveBeenCalledWith(expect.objectContaining({ name: WORKSPACE_DIRECTORY_FLOW, inject: injected, locale: 'picker' }), component)
  notify()
  expect(register).toHaveBeenCalledTimes(1)
  winner = undefined; notify()
  expect(offEntry).toHaveBeenCalledTimes(1)
  winner = { component, inject: injected }; notify()
  expect(register).toHaveBeenCalledTimes(2)
  dispose()
  expect(offEntry).toHaveBeenCalledTimes(2)
  expect(offSubscription).toHaveBeenCalledTimes(1)
})
