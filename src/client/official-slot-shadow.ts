type SlotLike = {
  spec?: (name: string) => unknown
  subscribe?: (name: string, listener: () => void) => () => void
}

/**
 * 真实插槽核会在同一轮同步启动里继续挂官方插件。
 * 立刻声明官方也要声明的子插槽，官方注册会抛出且不会重试，停用后官方就回不来。
 * 测试夹具没有 spec，保持同步登记。
 */
export function registerAfterOfficialWave(slots: object, slot: string, officialReady: () => boolean, register: (timedOut?: boolean) => () => void, waitForOfficial = false): () => void {
  const face = slots as SlotLike
  if (typeof face.spec !== 'function') return register()
  let remove = () => {}
  let done = false
  let off = () => {}
  let timer: ReturnType<typeof setTimeout> | undefined
  const finish = (timedOut = false): void => {
    if (done) return
    done = true
    if (timer !== undefined) clearTimeout(timer)
    off()
    if (timedOut) {
      console.warn(`[michengai-codex-ui] 等待官方 '${slot}' 注册超时；仅注册自有槽，保留官方共享声明。`)
    }
    remove = register(timedOut)
  }
  if (officialReady()) return register()
  off = face.subscribe?.(slot, () => { if (officialReady()) finish(false) }) ?? (() => {})
  if (!waitForOfficial) {
    queueMicrotask(() => finish(false))
  } else {
    // 即使 waitForOfficial=true，也加有界超时兜底（3000ms），防止精简 bundle 或未装官方插件时界面永久白板
    timer = setTimeout(() => finish(true), 3000)
  }
  return () => {
    done = true
    if (timer !== undefined) clearTimeout(timer)
    off()
    remove()
  }
}
