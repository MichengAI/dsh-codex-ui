import { useSyncExternalStore } from 'react'

export const SHARED_NOW_INTERVAL_MS = 60_000

/** 对齐到下一个整档，避免「刚刚」在整分钟边界之后还多停将近一轮。 */
export function msUntilNextNowTick(now: number, intervalMs = SHARED_NOW_INTERVAL_MS): number {
  const remainder = now % intervalMs
  return remainder === 0 ? intervalMs : intervalMs - remainder
}

const listeners = new Set<() => void>()
let sharedNow = Date.now()
let timeoutId = 0
let intervalId = 0
let cancelled = true

function publish(now: number) {
  sharedNow = now
  for (const listener of listeners) listener()
}

function startClock() {
  cancelled = false
  timeoutId = window.setTimeout(() => {
    if (cancelled) return
    publish(Date.now())
    intervalId = window.setInterval(() => { publish(Date.now()) }, SHARED_NOW_INTERVAL_MS)
    if (cancelled) {
      window.clearInterval(intervalId)
      intervalId = 0
    }
  }, msUntilNextNowTick(Date.now()))
}

function stopClock() {
  cancelled = true
  window.clearTimeout(timeoutId)
  window.clearInterval(intervalId)
  timeoutId = 0
  intervalId = 0
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    sharedNow = Date.now()
    startClock()
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stopClock()
  }
}

function getSnapshot() {
  return sharedNow
}

/** 模块级当前时刻。几棵树挂着都只走一套定时器，每分钟刷新一次。 */
export function useSharedNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
