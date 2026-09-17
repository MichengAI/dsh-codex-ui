import { useEffect, useState } from 'react'

export const SHARED_NOW_INTERVAL_MS = 60_000

/** 对齐到下一个整档，避免「刚刚」在整分钟边界之后还多停将近一轮。 */
export function msUntilNextNowTick(now: number, intervalMs = SHARED_NOW_INTERVAL_MS): number {
  const remainder = now % intervalMs
  return remainder === 0 ? intervalMs : intervalMs - remainder
}

/** 三棵会话树共用的当前时刻，每分钟刷新一次。 */
export function useSharedNow(intervalMs = SHARED_NOW_INTERVAL_MS): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let intervalId = 0
    const timeoutId = window.setTimeout(() => {
      setNow(Date.now())
      intervalId = window.setInterval(() => { setNow(Date.now()) }, intervalMs)
    }, msUntilNextNowTick(Date.now(), intervalMs))
    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId !== 0) window.clearInterval(intervalId)
    }
  }, [intervalMs])
  return now
}
