/**
 * 输入历史（↑/↓ 召回）的作用域偏好。
 *
 * 设计约束：
 * - 默认按**会话**隔离：每个会话只召回自己发送过的输入，避免同一工作区里
 *   不同会话的历史互相污染（终端风格历史应当像 shell 一样属于当前上下文）。
 * - 需要跨会话复用时，用户可在「设置 → Codex UI → 输入框增强」切回**工作区**模式；
 *   旧版本按 cwd 存储的历史仍保留，切回后即可继续召回。
 * - 与预测开关一样属于用户级偏好，存 localStorage；Host 侧不参与，避免站点配置
 *   把用户的输入历史锁死。
 */

export type HistoryScope = 'session' | 'workspace'

export const HISTORY_SCOPE_STORAGE_KEY = 'codex-ui.composer.history-scope'
/** 同一窗口内跨标签页同步（storage 事件在写入方自身不触发）。 */
export const HISTORY_SCOPE_STORAGE_EVENT = 'codex-ui:history-scope-change'

const listeners = new Set<() => void>()

function safeStorage(): Storage | undefined {
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    // 浏览器存储被禁用时按默认值处理，不影响输入本身
  }
  return undefined
}

export function parseStoredHistoryScope(raw: string | null | undefined): HistoryScope {
  // 只有显式 'workspace' 才共享；其余（未存储、损坏、旧值）一律回落到会话级。
  return raw === 'workspace' ? 'workspace' : 'session'
}

let currentScope: HistoryScope = parseStoredHistoryScope(safeStorage()?.getItem(HISTORY_SCOPE_STORAGE_KEY))

/** 稳定的只读快照，可直接交给 `useSyncExternalStore`。 */
export function getHistoryScope(): HistoryScope {
  return currentScope
}

export function subscribeHistoryScope(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function publish(): void {
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch {
      // 单个订阅者异常不能影响其余订阅者
    }
  }
}

export function setHistoryScope(scope: HistoryScope): void {
  currentScope = scope
  try {
    safeStorage()?.setItem(HISTORY_SCOPE_STORAGE_KEY, scope)
  } catch {
    // 写入失败只影响偏好持久化，本次会话内仍然生效
  }
  publish()
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new Event(HISTORY_SCOPE_STORAGE_EVENT))
    } catch {
      // 事件派发失败不影响本地状态
    }
  }
}

/** 测试用：按当前 localStorage 重建内存状态。 */
export function refreshHistoryScopeSnapshot(): void {
  currentScope = parseStoredHistoryScope(safeStorage()?.getItem(HISTORY_SCOPE_STORAGE_KEY))
}

/** 监听跨标签页与同窗口的设置变更。返回卸载函数。 */
export function observeHistoryScope(): () => void {
  if (typeof window === 'undefined') return () => {}
  const sync = (): void => {
    const next = parseStoredHistoryScope(safeStorage()?.getItem(HISTORY_SCOPE_STORAGE_KEY))
    if (next === currentScope) return
    currentScope = next
    publish()
  }
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== HISTORY_SCOPE_STORAGE_KEY) return
    sync()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(HISTORY_SCOPE_STORAGE_EVENT, sync)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(HISTORY_SCOPE_STORAGE_EVENT, sync)
  }
}
