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

  it('上一次写入还没返回时产生的新内容不会被丢弃', async () => {
    const bodies: string[] = []
    let releaseFirst: (() => void) | undefined
    setSectionsTransport({
      load: async () => null,
      save: async body => {
        bodies.push(body)
        // 第一次写入挂起，模拟宿主响应慢：新内容的定时器会在它返回之前到期。
        if (bodies.length === 1) await new Promise<void>(resolve => { releaseFirst = resolve })
        return true
      },
    })

    scheduleSectionsSave('A')
    await vi.advanceTimersByTimeAsync(400)
    expect(bodies).toEqual(['A'])

    scheduleSectionsSave('B')
    await vi.advanceTimersByTimeAsync(400)
    releaseFirst?.()
    await vi.advanceTimersByTimeAsync(1200)

    expect(bodies).toEqual(['A', 'B'])
  })
})

describe('工作区分区客户端存储：默认 HTTP 传输', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
  })

  it('返回宿主提供的分区文档', async () => {
    const mockJson = JSON.stringify({ version: 1, sections: [{ id: 's1', name: '测试', ids: [] }] })
    globalThis.fetch = vi.fn(async () => new Response(mockJson, { status: 200 }))
    await expect(httpTransport.load()).resolves.toBe(mockJson)
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

  it.each([401, 403, 404, 500, 503, 504])('HTTP %i 直接报告读取失败，由侧栏决定是否重试', async status => {
    const fetchStub = vi.fn(async () => new Response(null, { status }))
    globalThis.fetch = fetchStub
    await expect(httpTransport.load()).rejects.toMatchObject({ status })
    expect(fetchStub).toHaveBeenCalledOnce()
  })

  it('save 正常返回布尔值', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    expect(await httpTransport.save('{}')).toBe(true)

    globalThis.fetch = vi.fn(async () => new Response(null, { status: 503 }))
    expect(await httpTransport.save('{}')).toBe(false)
  })
})
