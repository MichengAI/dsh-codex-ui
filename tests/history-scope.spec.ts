import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HISTORY_SCOPE_STORAGE_EVENT,
  HISTORY_SCOPE_STORAGE_KEY,
  getHistoryScope,
  observeHistoryScope,
  parseStoredHistoryScope,
  refreshHistoryScopeSnapshot,
  setHistoryScope,
  subscribeHistoryScope,
} from '../src/client/composer/history-scope.ts'

describe('输入历史作用域：默认会话级，可切工作区', () => {
  beforeEach(() => {
    localStorage.clear()
    refreshHistoryScopeSnapshot()
  })

  it('默认按会话隔离，只有显式 workspace 才共享', () => {
    expect(getHistoryScope()).toBe('session')
    expect(parseStoredHistoryScope(null)).toBe('session')
    expect(parseStoredHistoryScope('')).toBe('session')
    expect(parseStoredHistoryScope('off')).toBe('session')
    expect(parseStoredHistoryScope('workspace')).toBe('workspace')
  })

  it('切换后写入 localStorage、立即生效并通知订阅者', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeHistoryScope(listener)
    try {
      setHistoryScope('workspace')
      expect(getHistoryScope()).toBe('workspace')
      expect(localStorage.getItem(HISTORY_SCOPE_STORAGE_KEY)).toBe('workspace')
      expect(listener).toHaveBeenCalledTimes(1)

      setHistoryScope('session')
      expect(getHistoryScope()).toBe('session')
      expect(localStorage.getItem(HISTORY_SCOPE_STORAGE_KEY)).toBe('session')
      expect(listener).toHaveBeenCalledTimes(2)
    } finally {
      unsubscribe()
    }
  })

  it('取消订阅后不再收到通知', () => {
    const listener = vi.fn()
    subscribeHistoryScope(listener)()
    setHistoryScope('workspace')
    expect(listener).not.toHaveBeenCalled()
  })

  it('单个订阅者抛错不影响其余订阅者', () => {
    const healthy = vi.fn()
    const unsubscribeBad = subscribeHistoryScope(() => { throw new Error('boom') })
    const unsubscribeGood = subscribeHistoryScope(healthy)
    try {
      expect(() => { setHistoryScope('workspace') }).not.toThrow()
      expect(healthy).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribeBad()
      unsubscribeGood()
    }
  })

  it('其他标签页写入时通过 storage 事件同步，无关 key 不响应', () => {
    const stop = observeHistoryScope()
    try {
      localStorage.setItem(HISTORY_SCOPE_STORAGE_KEY, 'workspace')
      window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }))
      expect(getHistoryScope()).toBe('session')

      window.dispatchEvent(new StorageEvent('storage', { key: HISTORY_SCOPE_STORAGE_KEY, newValue: 'workspace' }))
      expect(getHistoryScope()).toBe('workspace')
    } finally {
      stop()
    }
  })

  it('同窗口直接写盘可通过自定义事件广播', () => {
    const stop = observeHistoryScope()
    try {
      localStorage.setItem(HISTORY_SCOPE_STORAGE_KEY, 'workspace')
      window.dispatchEvent(new Event(HISTORY_SCOPE_STORAGE_EVENT))
      expect(getHistoryScope()).toBe('workspace')
    } finally {
      stop()
    }
  })

  it('卸载观察器后不再响应外部写入', () => {
    observeHistoryScope()()
    localStorage.setItem(HISTORY_SCOPE_STORAGE_KEY, 'workspace')
    window.dispatchEvent(new Event(HISTORY_SCOPE_STORAGE_EVENT))
    expect(getHistoryScope()).toBe('session')
  })
})
