type Observable<T> = { getSnapshot: () => T; subscribe: (listener: () => void) => () => void }
type ShortcutState = { searchRequest: number; addRequested: boolean }
type Bindings = {
  hooks: { workspaceShortcuts: Observable<ShortcutState> }
  closeAddWorkspace: () => void
  setDirectoryBusy: (busy: boolean) => void
  createWorkspace: (input: { path: string }) => Promise<{ workspaceId: string }>
}
type Entry = { locale?: string; inject?: (...args: never[]) => Record<string, unknown> }
type Slots = { entries: (name: 'sidebar.workspaces') => readonly Entry[]; subscribe: (name: 'sidebar.workspaces', listener: () => void) => () => void }
export type WorkspaceShortcutSource = Observable<{
  searchRequest: number
  addRequested: boolean
  bindings?: Bindings
}> & { dispose: () => void }

function hasBindings(value: Record<string, unknown>): value is Record<string, unknown> & Bindings {
  const hooks = value.hooks as Partial<Bindings['hooks']> | undefined
  const state = hooks?.workspaceShortcuts
  return typeof state?.getSnapshot === 'function' && typeof state.subscribe === 'function'
    && typeof value.closeAddWorkspace === 'function' && typeof value.setDirectoryBusy === 'function'
    && typeof value.createWorkspace === 'function'
}

/** Read the official, shadowed registration's public injected face; keep its command IDs and key bindings. */
export function createWorkspaceShortcutSource(slots: Slots): WorkspaceShortcutSource {
  let entry: Entry | undefined
  let bindings: Bindings | undefined
  let lastSearch = 0
  let snapshot: ReturnType<WorkspaceShortcutSource['getSnapshot']> = { searchRequest: 0, addRequested: false }
  const listeners = new Set<() => void>()
  let offState = () => {}
  const publish = (): void => {
    const state = bindings?.hooks.workspaceShortcuts.getSnapshot()
    const searchRequest = snapshot.searchRequest + (state !== undefined && state.searchRequest !== lastSearch ? 1 : 0)
    lastSearch = state?.searchRequest ?? 0
    const addRequested = state?.addRequested ?? false
    if (snapshot.bindings === bindings && snapshot.searchRequest === searchRequest && snapshot.addRequested === addRequested) return
    snapshot = { searchRequest, addRequested, bindings }
    for (const listener of listeners) listener()
  }
  const reconcile = (): void => {
    const next = slots.entries('sidebar.workspaces').find(row => row.locale === 'workspace')
    if (next === entry) return
    offState()
    entry = next
    const injected = next?.inject?.()
    bindings = injected && hasBindings(injected) ? injected : undefined
    // Historical requests must not reopen search when the plugin is enabled or the host reloads.
    lastSearch = bindings?.hooks.workspaceShortcuts.getSnapshot().searchRequest ?? 0
    offState = bindings?.hooks.workspaceShortcuts.subscribe(publish) ?? (() => {})
    publish()
  }
  reconcile()
  const offSlots = slots.subscribe('sidebar.workspaces', reconcile)
  return {
    getSnapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    dispose: () => { offSlots(); offState(); listeners.clear() },
  }
}
