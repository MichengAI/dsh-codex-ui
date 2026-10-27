export const HISTORY_KEY = 'michengai.codex-ui.input-history.v1'
const LEGACY_HISTORY_KEY = 'michengai.btw.history.v1'
const MAX_STORAGE_LENGTH = 1_000_000
type StorageFace = Pick<Storage, 'getItem' | 'setItem'>

/** 只保存已发送文本；浏览器存储失败时仍保留本次内存历史。 */
export class InputHistory {
  private readonly scopes = new Map<string, string[]>()
  constructor(private readonly storage?: StorageFace, private readonly limit = 200, private readonly warn: (message: string) => void = console.warn) {
    try {
      const current = storage?.getItem(HISTORY_KEY)
      const raw = current ?? storage?.getItem(LEGACY_HISTORY_KEY)
      if (!raw) return
      if (raw.length > MAX_STORAGE_LENGTH) throw new Error('历史数据过大')
      const data: unknown = JSON.parse(raw)
      if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('历史格式无效')
      for (const [key, value] of Object.entries(data).slice(-20)) {
        if (Array.isArray(value)) this.scopes.set(key, value.filter((item): item is string => typeof item === 'string' && item.length <= 8_000).slice(-limit))
      }
      // 迁移后只写新键，保留旧数据供回退；已有新键时不重复导入。
      if (current === null || current === undefined) storage?.setItem(HISTORY_KEY, JSON.stringify(Object.fromEntries(this.scopes)))
    } catch { warn('输入历史读取失败，本次使用内存历史。') }
  }
  list(scope: string): readonly string[] { return this.scopes.get(scope) ?? [] }
  add(scope: string, text: string): void {
    if (!text.trim() || text.length > 8_000) return
    const previous = this.scopes.get(scope) ?? []
    if (previous.at(-1) === text) return
    this.scopes.delete(scope)
    this.scopes.set(scope, [...previous, text].slice(-this.limit))
    while (this.scopes.size > 20) this.scopes.delete(this.scopes.keys().next().value!)
    let serialized = JSON.stringify(Object.fromEntries(this.scopes))
    while (serialized.length > MAX_STORAGE_LENGTH && this.scopes.size) {
      const oldest = this.scopes.keys().next().value!
      const entries = this.scopes.get(oldest)!
      entries.shift()
      if (!entries.length) this.scopes.delete(oldest)
      serialized = JSON.stringify(Object.fromEntries(this.scopes))
    }
    try { this.storage?.setItem(HISTORY_KEY, serialized) }
    catch { this.warn('输入历史无法保存到浏览器，本次仍可使用。') }
  }
}

/** 从空输入进入，编辑历史即退出，避免覆盖用户的新草稿。 */
export class HistoryCursor {
  private index: number | undefined
  private original = ''
  private displayed = ''
  private entries: readonly string[] = []

  reset(): void { this.index = undefined; this.entries = [] }
  move(direction: -1 | 1, draft: string, entries: readonly string[]): string | undefined {
    if (this.index !== undefined && draft !== this.displayed) this.reset()
    if (this.index === undefined) {
      if (direction !== -1 || draft !== '' || entries.length === 0) return undefined
      this.original = draft
      this.entries = [...entries]
      this.index = this.entries.length
    }
    this.index = Math.max(0, Math.min(this.entries.length, this.index + direction))
    if (this.index === this.entries.length) {
      const restored = this.original
      this.reset()
      return restored
    }
    this.displayed = this.entries[this.index] ?? ''
    return this.displayed
  }
}
