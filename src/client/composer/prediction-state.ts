/**
 * 输入预测（ghost 建议）的用户级开关。
 *
 * 设计约束：
 * - **只影响预测**，不牵连 `↑`/`↓` 历史召回、宽度手柄、新会话建议卡片；
 * - 关闭后客户端**完全不发请求**，所以不产生任何辅助模型 token 花费（不需要 Host 侧再校验一次）；
 * - `hostAllowed` 来自 Host 状态端点：profile 的 `cordis.patch.yml` 给 `codex-ui-composer`
 *   配 `config: { prediction: false }` 时会被置为 `false`，此时用户开关置灰（fail-closed，
 *   站点管理员意志优先，等价于主题子插件的 `subPluginEnabled` 语义）。
 */

export const PREDICTION_STORAGE_KEY = 'codex-ui.composer.prediction'
/** 同一窗口内跨标签页同步（storage 事件在写入方自身不触发）。 */
export const PREDICTION_STORAGE_EVENT = 'codex-ui:prediction-change'

export interface PredictionSettingsState {
  /** 子插件在 Host 侧是否启用；未启用时整个设置卡片不渲染（对齐 ThemeSettingsCard 规范）。 */
  readonly subPluginEnabled: boolean
  /** 用户开关；`false` 表示用户主动关闭预测。 */
  readonly userEnabled: boolean
  /** Host 侧是否允许预测（配置未声明时默认允许）。 */
  readonly hostAllowed: boolean
  /** 最终生效值：子插件启用且两者同时为真才预测。 */
  readonly enabled: boolean
}

const listeners = new Set<() => void>()

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key)
  } catch {
    // 浏览器存储被禁用时按默认值处理，不影响输入本身
  }
  return null
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  } catch {
    // 写入失败只影响偏好持久化，本次会话内仍然生效
  }
}

function parseStored(raw: string | null): boolean {
  if (raw === 'off' || raw === 'false' || raw === '0') return false
  return true
}

let subPluginEnabled = true
let userEnabled = parseStored(safeGetItem(PREDICTION_STORAGE_KEY))
let hostAllowed = true

function snapshot(): PredictionSettingsState {
  return {
    subPluginEnabled,
    userEnabled,
    hostAllowed,
    enabled: subPluginEnabled && userEnabled && hostAllowed,
  }
}

let cached: PredictionSettingsState = snapshot()

function publish(): void {
  const next = snapshot()
  if (
    next.subPluginEnabled === cached.subPluginEnabled &&
    next.userEnabled === cached.userEnabled &&
    next.hostAllowed === cached.hostAllowed &&
    next.enabled === cached.enabled
  ) {
    return
  }
  cached = next
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch {
      // 单个订阅者异常不能影响其余订阅者
    }
  }
}

/** 稳定的只读快照，可直接交给 `useSyncExternalStore`。 */
export function getPredictionSettingsState(): PredictionSettingsState {
  return cached
}

export function subscribePredictionSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 当前是否应当请求预测；组件热路径用这个，避免每次分配对象。 */
export function isPredictionEnabled(): boolean {
  return cached.enabled
}

export function setPredictionEnabled(enabled: boolean): void {
  userEnabled = enabled
  safeSetItem(PREDICTION_STORAGE_KEY, enabled ? 'on' : 'off')
  publish()
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new Event(PREDICTION_STORAGE_EVENT))
    } catch {
      // 事件派发失败不影响本地状态
    }
  }
}

/** Host 状态端点回报的配置位；缺省视为允许。 */
export function setHostPredictionAllowed(allowed: boolean): void {
  hostAllowed = allowed
  publish()
}

/** 标记 codex-ui-composer 子插件在 Host 侧的启用状态；未启用时设置卡片不渲染（对齐主题卡片）。 */
export function setSubPluginEnabled(enabled: boolean): void {
  subPluginEnabled = enabled
  publish()
}

/** 测试用：按当前 localStorage 与默认 hostAllowed 重建内存状态。 */
export function refreshPredictionSettingsSnapshot(): void {
  userEnabled = parseStored(safeGetItem(PREDICTION_STORAGE_KEY))
  cached = snapshot()
}

/** 监听跨标签页与同窗口的设置变更。返回卸载函数。 */
export function observePredictionSettings(): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== PREDICTION_STORAGE_KEY) return
    userEnabled = parseStored(safeGetItem(PREDICTION_STORAGE_KEY))
    publish()
  }
  const onLocal = (): void => {
    userEnabled = parseStored(safeGetItem(PREDICTION_STORAGE_KEY))
    publish()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(PREDICTION_STORAGE_EVENT, onLocal)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(PREDICTION_STORAGE_EVENT, onLocal)
  }
}
