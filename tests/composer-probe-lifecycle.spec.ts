import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeComposerEnhancements } from '../src/client/composer/index.tsx'
import { setSubPluginEnabled } from '../src/client/composer/prediction-state.ts'

/**
 * composer 子插件探活的生命周期契约。
 *
 * 与 Issue #107 的主题探活同一类缺陷：子插件在 cordis.patch.yml 里被停用后，
 * Host 侧端点不存在，客户端若无条件定时轮询就会在 DevTools 里持续刷 404。
 * 这里钉死三件事：正常态不轮询、404 有界收敛、显式停用立即终止。
 */

function fakeCtx(): any {
  return {
    locale: { bind: () => (key: string) => key },
    slots: {
      inject: () => () => {},
      register: () => () => {},
    },
    get: () => undefined,
    uiWorkspace: { pickDirectory: async () => null },
    workspaces: { create: async () => undefined },
  }
}

function okEnabled(): Response {
  return { ok: true, json: async () => ({ enabled: true, prediction: true }) } as unknown as Response
}

function okDisabled(): Response {
  return { ok: true, json: async () => ({ enabled: false, prediction: false }) } as unknown as Response
}

function notFound(): Response {
  return { ok: false, status: 404 } as unknown as Response
}

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.useRealTimers()
  document.getElementById('dcu-composer-enhancements-style')?.remove()
  setSubPluginEnabled(true)
})

describe('composer 探活：不产生无界轮询', () => {
  it('端点正常时只做首帧探活，60 秒内不得再发任何周期请求', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(okEnabled())
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const dispose = observeComposerEnhancements(fakeCtx())
    try {
      await vi.advanceTimersByTimeAsync(50)
      expect(fetchMock.mock.calls.length).toBe(1)

      await vi.advanceTimersByTimeAsync(60000)
      // 旧的 setInterval(15000) 在这里会变成 5 次请求
      expect(fetchMock.mock.calls.length).toBe(1)
    } finally {
      dispose()
    }
  })

  it('端点 404 时有界收敛：首帧 1 次 + 最多 3 次退避，之后彻底停止', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(notFound())
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const dispose = observeComposerEnhancements(fakeCtx())
    try {
      await vi.advanceTimersByTimeAsync(50)
      await vi.advanceTimersByTimeAsync(60000)
      expect(fetchMock.mock.calls.length).toBe(4)

      // 再推进 2 分钟，仍不得出现新的请求
      await vi.advanceTimersByTimeAsync(120000)
      expect(fetchMock.mock.calls.length).toBe(4)
    } finally {
      dispose()
    }
  })

  it('端点明确返回 200 { enabled: false } 时立即终止，不进入退避重试', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(okDisabled())
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const dispose = observeComposerEnhancements(fakeCtx())
    try {
      await vi.advanceTimersByTimeAsync(50)
      expect(fetchMock.mock.calls.length).toBe(1)

      await vi.advanceTimersByTimeAsync(60000)
      expect(fetchMock.mock.calls.length).toBe(1)
    } finally {
      dispose()
    }
  })

  it('窗口获焦触发单次补探，且不会再启动后台定时器', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(notFound())
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const dispose = observeComposerEnhancements(fakeCtx())
    try {
      await vi.advanceTimersByTimeAsync(50)
      await vi.advanceTimersByTimeAsync(60000)
      const settled = fetchMock.mock.calls.length
      expect(settled).toBe(4)

      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(50)
      expect(fetchMock.mock.calls.length).toBe(settled + 1)

      await vi.advanceTimersByTimeAsync(60000)
      expect(fetchMock.mock.calls.length).toBe(settled + 1)
    } finally {
      dispose()
    }
  })

  it('端点恢复后再次获焦可以重新激活增强能力', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(notFound())
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const dispose = observeComposerEnhancements(fakeCtx())
    try {
      await vi.advanceTimersByTimeAsync(50)
      expect(document.getElementById('dcu-composer-enhancements-style')).toBeNull()

      fetchMock.mockResolvedValue(okEnabled())
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(50)

      expect(document.getElementById('dcu-composer-enhancements-style')).not.toBeNull()
    } finally {
      dispose()
    }
  })
})
