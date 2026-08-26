export type TreeExpansionState = Record<string, boolean>

export const WORKSPACE_EXPANSION_STORAGE_KEY = 'dsh-codex-ui.workspace-expansion.v1'
export const CHANNEL_EXPANSION_STORAGE_KEY = 'dsh-codex-ui.channel-expansion.v1'
export const SCHEDULE_EXPANSION_STORAGE_KEY = 'dsh-codex-ui.schedule-expansion.v1'

const MAX_EXPANSION_ENTRIES = 500
const MAX_EXPANSION_KEY_LENGTH = 512

export function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  try { return window.localStorage } catch { return undefined }
}

export function parseTreeExpansionState(value: unknown): TreeExpansionState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {}
  const entries = Object.entries(value)
    .filter(([key, expanded]) => key.length > 0 && key.length <= MAX_EXPANSION_KEY_LENGTH && typeof expanded === 'boolean')
    .slice(0, MAX_EXPANSION_ENTRIES)
  return Object.fromEntries(entries)
}

export function readTreeExpansionState(storage: Storage | undefined, key: string): TreeExpansionState {
  if (storage === undefined) return {}
  try { return parseTreeExpansionState(JSON.parse(storage.getItem(key) ?? '{}')) } catch { return {} }
}

export function writeTreeExpansionState(storage: Storage | undefined, key: string, state: TreeExpansionState): void {
  if (storage === undefined) return
  try { storage.setItem(key, JSON.stringify(parseTreeExpansionState(state))) } catch { /* storage may be unavailable or full */ }
}
