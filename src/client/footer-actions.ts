/** dsh-context 挂到 `sidebar.footer.action` 的跨会话洞察入口；侧栏底部不渲染这一条。 */
export const CONTEXT_OVERVIEW_FOOTER_ID = 'context-overview'

export const HIDDEN_FOOTER_ACTION_IDS: ReadonlySet<string> = new Set([CONTEXT_OVERVIEW_FOOTER_ID])

export type FooterAction = { id: string; order: number }

export type FooterActionSource = {
  getSnapshot: () => readonly FooterAction[]
  subscribe: (listener: () => void) => () => void
}

type FooterSlots = {
  entriesOfSlot(name: 'sidebar.footer.action'): readonly { options: { id?: string; order?: number } }[]
  subscribe(name: 'sidebar.footer.action', listener: () => void): () => void
}

export function visibleFooterActions(slots: Pick<FooterSlots, 'entriesOfSlot'>): FooterAction[] {
  return slots.entriesOfSlot('sidebar.footer.action').flatMap(({ options }) => {
    const id = options.id
    if (id === undefined || HIDDEN_FOOTER_ACTION_IDS.has(id)) return []
    return [{ id, order: options.order ?? 0 }]
  }).sort((left, right) => left.order - right.order)
}

function sameFooterActions(left: readonly FooterAction[], right: readonly FooterAction[]): boolean {
  return left.length === right.length && left.every((action, index) => {
    const previous = right[index]
    return previous !== undefined && action.id === previous.id && action.order === previous.order
  })
}

/** 给 React useSyncExternalStore 用的底部动作快照；按 slot id 过滤，不靠 DOM class。 */
export function createFooterActionSource(slots: FooterSlots): FooterActionSource {
  let cached: readonly FooterAction[] = []
  return {
    getSnapshot() {
      const next = visibleFooterActions(slots)
      if (sameFooterActions(next, cached)) return cached
      cached = next
      return cached
    },
    subscribe(listener) {
      return slots.subscribe('sidebar.footer.action', listener)
    },
  }
}
