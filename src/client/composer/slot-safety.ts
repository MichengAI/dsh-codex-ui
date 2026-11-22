/**
 * 保护 single slot 免受同 priority 冲突崩溃并支持优雅降级。
 */
export interface SingleSlotRegisterOptions {
  name: string
  priority?: number
  [key: string]: unknown
}

export interface SlotRegistryLike {
  register(options: SingleSlotRegisterOptions, component: unknown): () => void
}

/**
 * 安全注册 single slot：
 * 1. 当遇到同 priority 碰撞报错（例如被第三方插件占用）时，自动递减 priority 至更低档位重试：
 *    既规避同 priority 冲突崩溃，又在 DSH single slot 机制中以更低数值优先胜出渲染（lowest renders）；
 * 2. 超过最大重试次数或发生不可恢复异常时安全降级，打印警告并返回 no-op 清理函数，
 *    确保绝不抛出未捕获异常阻塞插件后续生命周期的加载。
 */
export function registerSingleSlotSafely(
  slots: SlotRegistryLike,
  options: SingleSlotRegisterOptions,
  component: unknown,
  maxRetries = 5,
): () => void {
  let priority = options.priority ?? 0
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return slots.register({
        ...options,
        priority,
      }, component)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('already has a registration at priority') && attempt < maxRetries) {
        const nextPriority = priority - 1
        console.info(`[codex-ui] single slot "${options.name}" already occupied at priority ${priority}, fallback to priority ${nextPriority} to win registration`)
        priority = nextPriority
        continue
      }
      console.warn(`[codex-ui] Failed to register single slot "${options.name}":`, err)
      return () => {}
    }
  }
  return () => {}
}
