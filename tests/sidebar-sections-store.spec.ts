import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  flushSectionsSave,
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
