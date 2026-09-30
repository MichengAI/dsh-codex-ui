import { readFileSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { expect, test, vi } from 'vitest'
import { registerOnboardingSettings } from '../src/onboarding-settings.ts'

function host(settings: Record<string, unknown> | undefined) {
  const warn = vi.fn()
  const effect = vi.fn((callback: () => unknown) => callback())
  const injected: Array<(ctx: Context) => unknown> = []
  const ctx = {
    fiber: { id: 'codex-ui' },
    logger: { warn },
    inject: (_services: string[], callback: (ctx: Context) => unknown) => {
      injected.push(callback)
    },
  } as unknown as Context
  return { ctx, warn, effect, run: () => injected[0]!({ settings, effect, fiber: { id: 'child' } } as unknown as Context) }
}

test('新宿主走 settings.configure，不调用已删除的 register', () => {
  const configure = vi.fn(() => () => {})
  const register = vi.fn()
  const harness = host({ configure, register })
  registerOnboardingSettings(harness.ctx)
  expect(() => harness.run()).not.toThrow()
  expect(configure).toHaveBeenCalledWith({ auto: false }, { id: 'codex-ui' })
  expect(register).not.toHaveBeenCalled()
})

test('旧宿主只在 register 存在时登记引导命名空间', () => {
  const register = vi.fn()
  const harness = host({ register })
  registerOnboardingSettings(harness.ctx)
  harness.run()
  expect(register).toHaveBeenCalledWith('ui-onboarding', { welcomeNoticeVersion: { type: 'string' } })
})

test('register 抛错时只记录警告，不让渲染进程启动失败', () => {
  const harness = host({ register: () => { throw new TypeError('settings.register is not a function') } })
  registerOnboardingSettings(harness.ctx)
  expect(() => harness.run()).not.toThrow()
  expect(harness.warn).toHaveBeenCalled()
})

test('宿主入口不再按包名导入 settings-general', () => {
  const source = readFileSync('src/index.ts', 'utf8')
  expect(source).not.toMatch(/@deepseek-ai\/dsh-client-ui-settings-general/)
  expect(source).toMatch(/registerOnboardingSettings\(ctx\)/)
})
