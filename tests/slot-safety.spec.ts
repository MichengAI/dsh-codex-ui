import { describe, expect, it, vi } from 'vitest'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { registerSingleSlotSafely, type SingleSlotRegisterOptions } from '../src/client/composer/slot-safety.ts'

describe('registerSingleSlotSafely: single slot 冲突安全注册机制', () => {
  it('无碰撞时按原始 priority 直接成功注册', () => {
    const unregister = vi.fn()
    const slots = {
      register: vi.fn((_opts: SingleSlotRegisterOptions, _comp?: unknown) => unregister),
    }
    const comp = () => null
    const result = registerSingleSlotSafely(slots, { name: 'test.slot', priority: -100 }, comp)

    expect(slots.register).toHaveBeenCalledTimes(1)
    expect(slots.register).toHaveBeenCalledWith({ name: 'test.slot', priority: -100 }, comp)
    expect(result).toBe(unregister)
  })

  it('遇到同 priority 碰撞时，自动递减数值重试直到成功避让', () => {
    let calls = 0
    const unregister = vi.fn()
    const slots = {
      register: vi.fn((opts: SingleSlotRegisterOptions, _comp?: unknown) => {
        calls++
        // 模拟 -100 与 -101 都已被其它插件抢占
        if (opts.priority === -100 || opts.priority === -101) {
          throw new Error(`single slot "${opts.name}" already has a registration at priority ${opts.priority}`)
        }
        return unregister
      }),
    }

    const result = registerSingleSlotSafely(slots, { name: 'test.slot', priority: -100 }, null)

    expect(calls).toBe(3) // 依次尝试 -100, -101, -102
    expect(slots.register).toHaveBeenLastCalledWith({ name: 'test.slot', priority: -102 }, null)
    expect(result).toBe(unregister)
  })

  it('超过最大重试次数时安全降级，打印警告并返回 no-op 清理函数，绝不抛出未捕获异常', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const slots = {
        register: vi.fn((opts: SingleSlotRegisterOptions) => {
          throw new Error(`single slot "${opts.name}" already has a registration at priority ${opts.priority}`)
        }),
      }

      let unregister: (() => void) | undefined
      expect(() => {
        unregister = registerSingleSlotSafely(slots, { name: 'test.slot', priority: -100 }, null, 3)
      }).not.toThrow()

      expect(slots.register).toHaveBeenCalledTimes(4) // 初始 1 次 + 3 次重试
      expect(warnSpy).toHaveBeenCalled()
      expect(typeof unregister).toBe('function')
      expect(() => unregister?.()).not.toThrow()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('非 priority 碰撞错误（如其它未知异常）同样安全降级不崩溃', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const slots = {
        register: vi.fn(() => {
          throw new Error('network or internal error')
        }),
      }

      let unregister: (() => void) | undefined
      expect(() => {
        unregister = registerSingleSlotSafely(slots, { name: 'test.slot' }, null)
      }).not.toThrow()

      expect(slots.register).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalled()
      expect(typeof unregister).toBe('function')
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('在真实 SlotCore 环境下：遭遇第三方 -100 抢占时自动避让至 -101 并优先胜出渲染', () => {
    const slots = new SlotCore()
    // 宿主声明 single 插槽
    ;(slots as any).register(
      { name: 'root', children: { 'conversation.hero.workspace': { kind: 'single', scope: 'root' } } },
      () => null,
    )

    const thirdPartyComp = () => 'third-party'
    const codexComp = () => 'codex-ui'

    // 模拟第三方插件抢先以 -100 注册
    const unregisterThirdParty = (slots as any).register(
      { name: 'conversation.hero.workspace', priority: -100 },
      thirdPartyComp,
    )

    // codex-ui 安全注册同一插槽（初始期望 -100）
    const unregisterCodex = registerSingleSlotSafely(
      slots as any,
      { name: 'conversation.hero.workspace', priority: -100 },
      codexComp,
    )

    // 验证：自动降级避让至 -101（数值更低），codex-ui 胜出成为 winning entry
    const winning = slots.entriesOfSlot('conversation.hero.workspace')
    expect(winning).toHaveLength(1)
    expect(winning[0]?.component).toBe(codexComp)
    expect(winning[0]?.options.priority).toBe(-101)

    // 注销 codex-ui 后，第三方条目自动恢复
    unregisterCodex()
    const restored = slots.entriesOfSlot('conversation.hero.workspace')
    expect(restored).toHaveLength(1)
    expect(restored[0]?.component).toBe(thirdPartyComp)
    expect(restored[0]?.options.priority).toBe(-100)

    unregisterThirdParty()
  })
})

