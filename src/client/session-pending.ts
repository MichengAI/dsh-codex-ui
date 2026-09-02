export type PendingInteractionKind = 'approval' | 'plan-review' | 'question'

type PendingInteraction = { readonly kind?: unknown }
export type PendingInteractionSnapshot = ReadonlyMap<string, PendingInteraction>
export type UseSessionPendingInteraction = <Selected>(selector: (state: PendingInteractionSnapshot) => Selected) => Selected

const EMPTY_PENDING_INTERACTIONS: PendingInteractionSnapshot = new Map()

export function useEmptySessionPendingInteraction<Selected>(selector: (state: PendingInteractionSnapshot) => Selected): Selected {
  return selector(EMPTY_PENDING_INTERACTIONS)
}

export function visiblePendingKind(kind: unknown): PendingInteractionKind | undefined {
  switch (kind) {
    case 'approval':
    case 'plan-review':
    case 'question':
      return kind
    default:
      return undefined
  }
}

/** 旧版 SessionSummary 的兼容读取；alpha.5 已将该状态迁移到独立 Store。 */
export function legacyPendingInteraction(summary: unknown): unknown {
  if (typeof summary !== 'object' || summary === null || !('pendingInteraction' in summary)) return undefined
  return summary.pendingInteraction
}

export function pendingInteractionForSession(
  sessionId: string,
  pendingInteractions: PendingInteractionSnapshot,
  summaryKind?: unknown,
): PendingInteractionKind | undefined {
  return visiblePendingKind(summaryKind) ?? visiblePendingKind(pendingInteractions.get(sessionId)?.kind)
}
