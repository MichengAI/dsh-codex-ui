import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { expect, test, vi } from 'vitest'
import { useSharedNow } from '../src/client/shared-now.ts'

const createRoot = (createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}).createRoot

/** 会话行时间每分钟推进一次靠这个 hook，断言推进节奏与卸载清理。 */
function Probe({ seen }: { seen: number[] }) {
  seen.push(useSharedNow())
  return null
}

test('先对齐整分再每分钟推进，卸载后停止', async () => {
  vi.useFakeTimers()
  try {
    vi.setSystemTime(new Date('2026-09-17T10:00:30.500Z'))
    const seen: number[] = []
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => { root.render(createElement(Probe, { seen })) })
    expect(new Date(seen.at(-1)!).toISOString()).toBe('2026-09-17T10:00:30.500Z')

    await act(async () => { await vi.advanceTimersByTimeAsync(29_000) })
    expect(new Date(seen.at(-1)!).toISOString()).toBe('2026-09-17T10:00:30.500Z')

    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(new Date(seen.at(-1)!).toISOString()).toBe('2026-09-17T10:01:00.000Z')

    await act(async () => { await vi.advanceTimersByTimeAsync(120_000) })
    expect(new Date(seen.at(-1)!).toISOString()).toBe('2026-09-17T10:03:00.000Z')

    const renders = seen.length
    await act(async () => { root.unmount() })
    await act(async () => { await vi.advanceTimersByTimeAsync(600_000) })
    expect(seen.length).toBe(renders)
  } finally {
    vi.useRealTimers()
  }
})

test('两棵树共用一套定时器，卸一棵另一棵继续走', async () => {
  vi.useFakeTimers()
  try {
    vi.setSystemTime(new Date('2026-09-17T10:00:30.500Z'))
    const left: number[] = []
    const right: number[] = []
    const leftRoot = createRoot(document.createElement('div'))
    const rightRoot = createRoot(document.createElement('div'))
    await act(async () => { leftRoot.render(createElement(Probe, { seen: left })) })
    const timers = vi.getTimerCount()
    await act(async () => { rightRoot.render(createElement(Probe, { seen: right })) })
    expect(vi.getTimerCount()).toBe(timers)
    expect(left.at(-1)).toBe(right.at(-1))

    await act(async () => { await vi.advanceTimersByTimeAsync(29_500) })
    expect(left.at(-1)).toBe(right.at(-1))
    expect(new Date(left.at(-1)!).toISOString()).toBe('2026-09-17T10:01:00.000Z')

    await act(async () => { leftRoot.unmount() })
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(new Date(right.at(-1)!).toISOString()).toBe('2026-09-17T10:02:00.000Z')

    const rightRenders = right.length
    await act(async () => { rightRoot.unmount() })
    await act(async () => { await vi.advanceTimersByTimeAsync(600_000) })
    expect(right.length).toBe(rightRenders)
  } finally {
    vi.useRealTimers()
  }
})

test('整分前和整分后卸载都不留定时器', async () => {
  vi.useFakeTimers()
  try {
    vi.setSystemTime(new Date('2026-09-17T10:00:30.500Z'))
    const earlyRoot = createRoot(document.createElement('div'))
    await act(async () => { earlyRoot.render(createElement(Probe, { seen: [] })) })
    expect(vi.getTimerCount()).toBe(1)
    await act(async () => { earlyRoot.unmount() })
    expect(vi.getTimerCount()).toBe(0)

    const ticked: number[] = []
    const tickedRoot = createRoot(document.createElement('div'))
    await act(async () => { tickedRoot.render(createElement(Probe, { seen: ticked })) })
    await act(async () => { await vi.advanceTimersByTimeAsync(29_500) })
    expect(new Date(ticked.at(-1)!).toISOString()).toBe('2026-09-17T10:01:00.000Z')
    await act(async () => { tickedRoot.unmount() })
    expect(vi.getTimerCount()).toBe(0)

    vi.setSystemTime(new Date('2026-09-17T11:20:40.000Z'))
    const remounted: number[] = []
    const remountedRoot = createRoot(document.createElement('div'))
    await act(async () => { remountedRoot.render(createElement(Probe, { seen: remounted })) })
    expect(new Date(remounted.at(-1)!).toISOString()).toBe('2026-09-17T11:20:40.000Z')
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000) })
    expect(new Date(remounted.at(-1)!).toISOString()).toBe('2026-09-17T11:21:00.000Z')
    await act(async () => { remountedRoot.unmount() })
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    vi.useRealTimers()
  }
})
