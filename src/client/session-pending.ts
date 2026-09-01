export type PendingInteractionKind = 'approval' | 'plan-review' | 'question'

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
