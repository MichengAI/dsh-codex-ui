import assert from 'node:assert/strict'
import {
  parseTreeExpansionState,
  readTreeExpansionState,
  WORKSPACE_EXPANSION_STORAGE_KEY,
  writeTreeExpansionState,
} from '../src/client/tree-expansion.ts'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length(): number { return this.values.size }
  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const storage = new MemoryStorage()
const state = { 'workspace:one': false, 'section:projects': false, 'workspace:two': true }
writeTreeExpansionState(storage, WORKSPACE_EXPANSION_STORAGE_KEY, state)
assert.deepEqual(readTreeExpansionState(storage, WORKSPACE_EXPANSION_STORAGE_KEY), state)

storage.setItem(WORKSPACE_EXPANSION_STORAGE_KEY, '{broken')
assert.deepEqual(readTreeExpansionState(storage, WORKSPACE_EXPANSION_STORAGE_KEY), {})

assert.deepEqual(parseTreeExpansionState({ open: true, closed: false, invalid: 'false', nested: {} }), { open: true, closed: false })
assert.deepEqual(readTreeExpansionState(undefined, WORKSPACE_EXPANSION_STORAGE_KEY), {})
writeTreeExpansionState(undefined, WORKSPACE_EXPANSION_STORAGE_KEY, state)

console.log('✓ tree expansion persistence assertions passed')
