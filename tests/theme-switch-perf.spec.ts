import { describe, expect, it } from 'vitest'
import { applyThemeToDocument, changeTheme, getThemeSettingsState, observeTheme } from '../src/client/theme/index.ts'

describe('主题切换卡死防范与性能回归', () => {
  it('连续多次切换主题应当极速完成，不得出现微任务堆积或无限循环', () => {
    let callCount = 0
    const fakeRuntime: any = {
      getTheme: () => ({ active: { id: 'stock' }, preference: 'system' }),
      setTheme: (id: string) => {
        callCount++
      },
      register: () => () => {},
    }

    const unobserve = observeTheme({
      get: (name: string) => (name === 'theme' ? fakeRuntime : undefined),
      on: (_event: string, _fn: any) => () => {},
    } as any)

    const themes = ['codex-dark', 'codex-light', 'catppuccin-mocha', 'catppuccin-latte', 'stock'] as const

    const t0 = performance.now()
    for (const id of themes) {
      changeTheme(id)
    }
    const t1 = performance.now()

    expect(t1 - t0).toBeLessThan(250) // 250ms 内极速完成，杜绝死循环挂起
    unobserve()
  })
})
