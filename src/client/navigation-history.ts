import { currentSessionId, type SessionListLike } from './session-host.ts'

export type NavigationHistory = {
  getSnapshot: () => Readonly<{ canBack: boolean; canForward: boolean }>
  subscribe: (listener: () => void) => () => void
  back: () => void
  forward: () => void
  dispose: () => void
}

/** Follow host session selections without navigating the Electron document history. */
export function createNavigationHistory(store: {
  getSnapshot: () => SessionListLike
  subscribe: (listener: () => void) => () => void
}, open: (id: string) => boolean): NavigationHistory {
  let entries: string[] = []
  let index = -1
  let pending: number | undefined
  let snapshot = { canBack: false, canForward: false }
  const listeners = new Set<() => void>()
  const target = (direction: number): number | undefined => {
    for (let next = index + direction; next >= 0 && next < entries.length; next += direction) {
      if (store.getSnapshot().byId?.[entries[next]!] !== undefined) return next
    }
    return undefined
  }
  const update = (): void => {
    const current = currentSessionId(store.getSnapshot())
    if (current !== undefined && pending !== undefined && entries[pending] === current) {
      index = pending
      pending = undefined
    } else if (current !== undefined && entries[index] !== current) {
        entries = entries.slice(0, index + 1)
        entries.push(current)
        index = entries.length - 1
      pending = undefined
    }
    const next = { canBack: target(-1) !== undefined, canForward: target(1) !== undefined }
    if (next.canBack === snapshot.canBack && next.canForward === snapshot.canForward) return
    snapshot = next
    for (const listener of listeners) listener()
  }
  const navigate = (direction: number): void => {
    const next = target(direction)
    if (next === undefined) return
    pending = next
    try {
      if (!open(entries[next]!)) pending = undefined
    } catch (error) {
      pending = undefined
      throw error
    }
    update()
  }
  update()
  const unsubscribe = store.subscribe(update)
  return {
    getSnapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    back: () => { navigate(-1) },
    forward: () => { navigate(1) },
    dispose: () => { unsubscribe(); listeners.clear() },
  }
}
