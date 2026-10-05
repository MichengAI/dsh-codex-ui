import type { Context } from '@deepseek-ai/cordis'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import type { DirectoryFlowOwnerProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'

export const WORKSPACE_DIRECTORY_FLOW = 'sidebar.codex.directoryFlow' as const
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'sidebar.codex.directoryFlow': { kind: 'single'; scope: 'root'; owner: DirectoryFlowOwnerProps }
  }
}

/** Give the selected host picker an outlet owned by our sidebar, including while collapsed.
 * Directory pickers have no children; preserve their injected face, locale and store.
 * The registry has erased the original component's types, so only this forwarding boundary
 * uses the erased registration signature. No host implementation or private state is imported.
 */
export function registerWorkspaceDirectoryFlow(ctx: Context): void {
  ctx.slots.inject(WORKSPACE_DIRECTORY_FLOW, () => {
    let entry: StoredEntry | undefined
    let offEntry = () => {}
    const register = ctx.slots.register.bind(ctx.slots) as unknown as (options: {
      name: typeof WORKSPACE_DIRECTORY_FLOW
      inject?: StoredEntry['inject']
      store?: StoredEntry['store']
      locale?: string
    }, component: unknown) => () => void
    const reconcile = () => {
      const next = ctx.slots.entriesOfSlot('sidebar.workspaces.directoryFlow')[0]
      if (next === entry) return
      offEntry()
      offEntry = () => {}
      entry = next
      if (!next || Object.keys(next.children ?? {}).length > 0) return
      offEntry = register({ name: WORKSPACE_DIRECTORY_FLOW, inject: next.inject, store: next.store, locale: next.locale }, next.component)
    }
    reconcile()
    const off = ctx.slots.subscribe('sidebar.workspaces.directoryFlow', reconcile)
    return () => { off(); offEntry() }
  })
}
