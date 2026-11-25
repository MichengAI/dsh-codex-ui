import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  flushSectionsSave,
  httpTransport,
  scheduleSectionsSave,
  setSectionsTransport,
} from '../src/client/sidebar/sections/store.ts'

describe('工作区分区客户端存储：保存与重试熔断', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    setSectionsTransport(undefined)
    vi.useRealTimers()
  })

  it('当保存失败时最多重试一次，绝不陷入死循环', async () => {
    let saveCallCount = 0
    setSectionsTransport({
      load: async () => null,
      save: async () => {
        saveCallCount++
        return false // 模拟 503 / 失败
      },
    })

    scheduleSectionsSave(JSON.stringify({ version: 1, sections: [] }))

    // 第一次定时器 350ms 到期触发首次保存
    await vi.advanceTimersByTimeAsync(400)
    expect(saveCallCount).toBe(1)

    // 重试排队的定时器 350ms 到期触发第二次保存（重试）
    await vi.advanceTimersByTimeAsync(400)
    expect(saveCallCount).toBe(2)

    // 继续等待，确认不会继续无限重试
    await vi.advanceTimersByTimeAsync(1200)
    expect(saveCallCount).toBe(2)
  })
})

describe('工作区分区客户端存储：默认 httpTransport 启动竞态退避重试与异常防护', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
  })

  it('当遇到 503 时退避重试，宿主就绪返回 200 后成功获取数据', async () => {
    let attempts = 0
    const mockJson = JSON.stringify({ version: 1, sections: [{ id: 's1', name: '测试', ids: [] }] })
    globalThis.fetch = vi.fn(async () => {
      attempts++
      if (attempts < 3) {
        return new Response(null, { status: 503 })
      }
      return new Response(mockJson, { status: 200 })
    })

    const promise = httpTransport.load()
    const result = await promise
    expect(attempts).toBe(3)
    expect(result).toBe(mockJson)
  })

  it('当持续 503 且重试耗尽时，抛出明确异常而非静默吞错返回 null', async () => {
    let attempts = 0
    globalThis.fetch = vi.fn(async () => {
      attempts++
      return new Response(null, { status: 503 })
    })

    await expect(httpTransport.load()).rejects.toThrow('Sections store unavailable: HTTP 503')
    expect(attempts).toBe(4) // 首次 + 3 次重试
  })

  it('当返回 404 时视为服务端未持久化文档，不重试并返回 null', async () => {
    let attempts = 0
    globalThis.fetch = vi.fn(async () => {
      attempts++
      return new Response('Not Found', { status: 404 })
    })

    const result = await httpTransport.load()
    expect(attempts).toBe(1)
    expect(result).toBeNull()
  })

  it('当返回 204 时视为无内容，不重试并返回 null', async () => {
    let attempts = 0
    globalThis.fetch = vi.fn(async () => {
      attempts++
      return new Response(null, { status: 204 })
    })

    const result = await httpTransport.load()
    expect(attempts).toBe(1)
    expect(result).toBeNull()
  })

  it.each([401, 403, 500, 504])('当遇到 HTTP %i 未就绪或鉴权异常时，退避重试并在耗尽后抛出明确异常，绝不伪装为 null', async (status) => {
    let attempts = 0
    globalThis.fetch = vi.fn(async () => {
      attempts++
      return new Response(null, { status })
    })

    await expect(httpTransport.load()).rejects.toThrow(`Sections store unavailable: HTTP ${status}`)
    expect(attempts).toBe(4) // 首次 + 3 次重试
  })

  it('save 正常返回布尔值', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    expect(await httpTransport.save('{}')).toBe(true)

    globalThis.fetch = vi.fn(async () => new Response(null, { status: 503 }))
    expect(await httpTransport.save('{}')).toBe(false)
  })
})
