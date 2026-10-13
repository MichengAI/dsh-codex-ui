import { registerSessionTitleProvider, SESSION_TITLE_PROVIDER_ID, type SessionTitleHost, type SessionTitleDisposer } from './session-title-provider.ts'

const OFFICIAL_TARGETS = [
  { id: 'session-title-llm', name: '@deepseek-ai/dsh-session-title-first-prompt-llm' },
  { id: 'optional-session-title-all-prompts', name: '@deepseek-ai/dsh-session-title-all-prompts-llm' },
] as const

function isOfficialTarget(options: { id?: string; name?: string } | undefined): boolean {
  if (!options) return false
  return OFFICIAL_TARGETS.some(t => t.id === options.id && t.name === options.name)
}

function silenceOfficialProvider(host: SessionTitleHost): (() => void) | undefined {
  const sessionTitle = host.get?.('sessionTitle') as { register?: (provider: unknown) => unknown } | undefined
  if (!sessionTitle || typeof sessionTitle.register !== 'function') return undefined
  const target = Object.getPrototypeOf(sessionTitle) as { register?: (provider: unknown) => unknown }
  if (typeof target?.register !== 'function') return undefined
  const original = target.register
  target.register = function(this: unknown, provider: unknown) {
    const candidate = provider as { id?: string } | undefined
    if (candidate && candidate.id !== SESSION_TITLE_PROVIDER_ID) {
      // 官方标题提供方尝试注册时，若 Codex UI 正在生效，静默接管并返回空卸载函数，不让官方抛出单槽冲突异常
      return () => {}
    }
    return original.apply(this, arguments as unknown as [unknown])
  }
  return () => {
    target.register = original
  }
}
type Entry = {
  options: { id: string; name: string; disabled?: boolean | null }
  disabled: boolean
  fiber?: { dispose: () => Promise<void> }
  update: (patch: { disabled: boolean | null }) => Promise<void>
}
type Loader = { entries: () => Iterable<Entry> }
const transitions = new WeakMap<object, Promise<unknown>>()

function serialize<T>(key: object, work: () => Promise<T>): Promise<T> {
  const previous = transitions.get(key)
  const next = previous ? previous.catch(() => {}).then(work) : work()
  transitions.set(key, next)
  return next
}

/** 仅接管公开的内存条目状态，不使用会持久化的 loader.update。 */
export function startSessionTitleLifecycle(host: SessionTitleHost) {
  let cancelled = false
  let provider: SessionTitleDisposer | undefined
  let restore: (() => Promise<void>) | undefined
  const restoreGuard = silenceOfficialProvider(host)
  const loader = host.loader as Loader | undefined
  const candidates = typeof loader?.entries === 'function' ? [...loader.entries()].filter(entry => isOfficialTarget(entry.options)) : []
  const key = candidates.length === 1 ? candidates[0]! : host
  const ready = serialize(key, async () => {
    if (typeof loader?.entries !== 'function') return
    {
      const matches = [...loader.entries()].filter(entry => isOfficialTarget(entry.options))
      const enabledMatches = matches.filter(entry => !entry.disabled)
      if (enabledMatches.length === 1) {
        const entry = enabledMatches[0]!
        if (typeof entry.update !== 'function' || typeof entry.fiber?.dispose !== 'function') return
        const options = entry.options
        const original = options.disabled
        const fiber = entry.fiber
        const ownsEntry = () => [...loader.entries()].includes(entry) && entry.options === options && isOfficialTarget(options) && options.disabled === true
        restore = async () => {
          if (!ownsEntry()) return
          await entry.update({ disabled: original ?? null })
        }
        try {
          await entry.update({ disabled: true })
        } catch (error) {
          if (ownsEntry()) {
            await fiber.dispose()
            await restore()
          }
          restore = undefined
          throw error
        }
        // entry.update 会启动卸载但不等待，因此显式等待对应 fiber。
        await fiber.dispose()
        if (!ownsEntry()) { restore = undefined; return }
      } else if (matches.length > 0 && enabledMatches.length === 0) {
        // 目标条目全都原本已禁用（例如环境内只有一个官方条目且已被用户显式禁用）
        // 维持原设计：若官方条目显式禁用，则不接管也不注册
        return
      } else if (matches.length > 1) {
        // 当存在多个官方目标且无法唯一确定时，不越权接管
        return
      }
    }
    if (!cancelled) provider = registerSessionTitleProvider(host)
    if (!provider) { await restore?.(); restore = undefined }
  })
  let disposal: Promise<void> | undefined
  return {
    ready,
    dispose: () => {
      cancelled = true
      // 关键：在任何异步等待之前，若本实例已经持有 provider，立即同步将 sessionTitle.registration 标记为 closing，
      // 避免宿主并发重载官方插件 entry 时撞上未释放的单槽！
      const sessionTitle = host.get?.('sessionTitle') as { registration?: { closing?: boolean } } | undefined
      if (sessionTitle?.registration) {
        sessionTitle.registration.closing = true
      }
      return disposal ??= serialize(key, async () => {
        await ready.catch(() => {})
        await provider?.()
        provider = undefined
        if (sessionTitle && sessionTitle.registration?.closing) {
          delete sessionTitle.registration
        }
        await restore?.()
        restore = undefined
        restoreGuard?.()
      })
    },
  }
}
