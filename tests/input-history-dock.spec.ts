import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test } from 'vitest'
import type { InputState } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { InputHistoryDock } from '../src/client/InputHistoryDock.tsx'
import { InputHistory } from '../src/client/input-history.ts'

const { createRoot } = createRequire(import.meta.url)('react-dom/client') as {
  createRoot(container: Element): { render(node: ReactNode): void; unmount(): void }
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

function store<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    listeners, getSnapshot: () => value,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    set(next: T) { value = next; listeners.forEach(fn => fn()) },
  }
}

const idle: InputState = { draft: '', phase: 'plain', imageIds: [], occurrences: [], queue: [], draftRev: 0 }
afterEach(() => document.body.replaceChildren())

test('独立挂载采集用户消息，命令成功后记录，失败不记录；切换与卸载释放绑定', async () => {
  const container = document.createElement('section')
  const slot = document.createElement('div')
  const editor = document.createElement('textarea')
  container.append(slot, editor)
  document.body.append(container)
  const root = createRoot(slot)
  const history = new InputHistory()
  const seen = new WeakMap<object, number>()
  const state = store(idle)
  const events = store({ entries: [] as unknown[] })
  const menu = store({ open: false })
  const binding = { ctx: {}, eventSource: events }
  const ctx = {
    sessions: { binding: () => binding, list: { getSnapshot: () => ({ byId: { a: { cwd: '项目一' }, b: { cwd: '项目二' } } }) } },
    conversation: { input: { for: () => ({ state, setDraft(text: string) { editor.value = text; state.set({ ...idle, draft: text }) } }) } },
    inputTriggers: { sessionOf: () => ({ menu }) },
  }
  const render = async (id: string) => act(async () => {
    root.render(createElement(InputHistoryDock, { ctx: ctx as never, sessionId: id as never, history, seen }))
  })
  const press = () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })
    editor.dispatchEvent(event)
    return event.defaultPrevented
  }
  try {
    await render('a')
    events.set({ entries: [
      { type: 'event', event: { seq: 1, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '普通消息' }] } } },
      { type: 'event', event: { seq: 2, type: 'user/message', data: { source: { kind: 'system' }, content: [{ type: 'text', text: '系统内容' }] } } },
    ] })
    expect(history.list('项目一')).toEqual(['普通消息'])
    state.set({ ...idle, phase: 'submitting', draft: '/btw 旁问', claim: { token: '/btw' } })
    state.set(idle)
    expect(history.list('项目一')).toEqual(['普通消息', '/btw 旁问'])
    state.set({ ...idle, phase: 'submitting', draft: '/失败' })
    state.set({ ...idle, phase: 'claimed', draft: '/失败' })
    state.set(idle)
    expect(history.list('项目一')).not.toContain('/失败')
    expect(press()).toBe(true)
    expect(editor.value).toBe('/btw 旁问')
    for (const guard of [
      { ...idle, phase: 'submitting' as const },
      { ...idle, phase: 'adjudicating' as const },
      { ...idle, imageIds: ['image'] as never },
      { ...idle, occurrences: [{}] as never },
    ]) {
      state.set(guard)
      expect(press()).toBe(false)
    }
    state.set(idle)
    menu.set({ open: true })
    expect(press()).toBe(false)
    menu.set({ open: false })
    await render('b')
    expect(state.listeners.size).toBe(1)
    expect(events.listeners.size).toBe(1)
    expect(press()).toBe(false)
    history.add('项目二', '另一个项目')
    expect(press()).toBe(true)
    expect(editor.value).toBe('另一个项目')
    state.set(idle)
    await render('a')
    expect(press()).toBe(true)
    expect(editor.value).toBe('/btw 旁问')
  } finally { await act(async () => root.unmount()) }
  expect(state.listeners.size).toBe(0)
  expect(events.listeners.size).toBe(0)
  state.set(idle)
  expect(press()).toBe(false)
})
