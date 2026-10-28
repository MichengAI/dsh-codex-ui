import { JSDOM } from 'jsdom'
import { expect, it } from 'vitest'
import { observeSidebarNav } from '../src/client/sidebar/index.ts'

it('observeSidebarNav 挂载后不会产生递归重绘与自触发 RAF 排队循环', async () => {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div class="host_root"><button class="host_newSession">New</button><nav class="host_panelList"><button class="host_panelRow">Plugins</button></nav></div></body></html>',
    { url: 'http://localhost' },
  )

  const originalWindow = globalThis.window
  const originalDoc = globalThis.document

  let queue: Array<() => void> = []
  let scheduled = 0

  dom.window.requestAnimationFrame = ((fn: FrameRequestCallback) => {
    queue.push(() => fn(performance.now()))
    scheduled++
    return scheduled
  }) as unknown as typeof window.requestAnimationFrame
  dom.window.cancelAnimationFrame = () => {}

  // Mock fetch to report sidebar enabled
  dom.window.fetch = async () => ({
    ok: true,
    json: async () => ({ enabled: true }),
  } as unknown as Response)

  const restoreGlobals: Array<() => void> = []
  for (const k of ['window', 'document', 'MutationObserver', 'HTMLElement', 'Element', 'requestAnimationFrame', 'cancelAnimationFrame', 'fetch'] as const) {
    const prev = globalThis[k]
    // @ts-expect-error test assignment
    globalThis[k] = dom.window[k]
    restoreGlobals.push(() => {
      // @ts-expect-error test restore
      globalThis[k] = prev
    })
  }

  try {
    const panels = [
      { options: { id: 'plugins', label: '插件管理', order: 10 } },
      { options: { id: 'skills', label: '技能管理', order: 20 } },
    ]
    const ctx = {
      slots: {
        entriesOfSlot: () => panels,
        subscribe: () => () => {},
      },
      locale: {
        bind: () => (k: string) => k,
        subscribe: () => () => {},
      },
    }

    const dispose = observeSidebarNav(ctx as never)

    // 等待 fetch 与首轮异步挂载排队
    await new Promise(r => setTimeout(r, 20))

    // 执行首轮挂载任务
    const firstTasks = queue
    queue = []
    firstTasks.forEach(fn => fn())

    // 再次等待并清空后续任何由于挂载引起的正常任务
    await new Promise(r => setTimeout(r, 20))
    const settleTasks = queue
    queue = []
    settleTasks.forEach(fn => fn())

    // 记录静止基线
    const baselineScheduled = scheduled

    // 静置 3 轮循环，验证后续不再有新的 RAF 排队
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 20))
      const extraTasks = queue
      queue = []
      extraTasks.forEach(fn => fn())
    }

    // scheduled 次数不应持续递增，队列中待处理任务必须为 0
    expect(queue).toHaveLength(0)
    expect(scheduled).toBe(baselineScheduled)

    dispose()
  } finally {
    restoreGlobals.forEach(r => r())
  }
})
