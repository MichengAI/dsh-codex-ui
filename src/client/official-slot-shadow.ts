type SlotLike = {
  spec?: (name: string) => unknown
  subscribe?: (name: string, listener: () => void) => () => void
}

/**
 * 真实插槽核会在同一轮同步启动里继续挂官方插件。
 * 立刻声明官方也要声明的子插槽，官方注册会抛出且不会重试，停用后官方就回不来。
 * 测试夹具没有 spec，保持同步登记。
 */
export function registerAfterOfficialWave(slots: object, slot: string, officialReady: () => boolean, register: () => () => void): () => void {
  const face = slots as SlotLike
  if (typeof face.spec !== 'function') return register()
  let remove = () => {}
  let done = false
  let off = () => {}
  const finish = (): void => {
    if (done) return
    done = true
    off()
    remove = register()
  }
  if (officialReady()) return register()
  off = face.subscribe?.(slot, () => { if (officialReady()) finish() }) ?? (() => {})
  queueMicrotask(finish)
  return () => { done = true; off(); remove() }
}
