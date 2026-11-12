import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import type { InputState } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionEventLikeEntry, SessionEventWindow, SessionLiveEventEntry } from '@deepseek-ai/dsh-api-session-controller/client'
import { InputHistoryDock, registerInputHistory } from '../src/client/composer/InputHistoryDock.tsx'
import { HISTORY_KEY, InputHistory } from '../src/client/composer/input-history.ts'
import { refreshHistoryScopeSnapshot, setHistoryScope } from '../src/client/composer/history-scope.ts'

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

const idle: InputState = { draft: '', phase: 'plain', attachmentIds: [], occurrences: [], queue: [], draftRev: 0 }
beforeEach(() => { localStorage.clear(); refreshHistoryScopeSnapshot() })
afterEach(() => document.body.replaceChildren())

function userEvent(seq: number, text: string): SessionLiveEventEntry {
  return { type: 'event', event: { seq, time: seq, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text }] } } } as unknown as SessionLiveEventEntry
}

function eventStore(initial: SessionEventWindow = { entries: [], revision: 0, hasMore: false, change: { kind: 'replace', entries: [] } }) {
  const events = store(initial)
  return {
    ...events,
    append(...entries: SessionLiveEventEntry[]) {
      const current = events.getSnapshot()
      events.set({ ...current, entries: [...current.entries, ...entries], revision: current.revision + 1, change: { kind: 'append', entries } })
    },
    window(kind: 'replace' | 'prepend', entries: SessionEventLikeEntry[]) {
      const current = events.getSnapshot()
      events.set({ entries: kind === 'replace' ? entries : [...entries, ...current.entries], revision: current.revision + 1, hasMore: false, change: { kind, entries } })
    },
  }
}

test.each(['imageIds', 'attachmentIds'] as const)('%s：消息与命令历史、附件保护和卸载', async attachmentKey => {
  const { attachmentIds: _attachments, ...base } = idle
  const idleState = { ...base, [attachmentKey]: [] } as unknown as InputState
  const container = document.createElement('section')
  const slot = document.createElement('div')
  const editor = document.createElement('textarea')
  container.append(slot, editor)
  document.body.append(container)
  const root = createRoot(slot)
  const history = new InputHistory()
  const seen = new WeakMap<object, number>()
  const state = store(idleState)
  const events = eventStore()
  const menu = store({ open: false })
  const binding = { ctx: {}, eventSource: events }
  const ctx = {
    sessions: { binding: () => binding, list: { getSnapshot: () => ({ byId: { a: { cwd: '项目一' }, b: { cwd: '项目二' } } }) } },
    conversation: { input: { for: () => ({ state, setDraft(text: string) { editor.value = text; state.set({ ...idleState, draft: text }) } }) } },
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
    events.append(userEvent(1, '普通消息'), { type: 'event', event: { seq: 2, time: 2, type: 'user/message', data: { source: { kind: 'system' }, content: [{ type: 'text', text: '系统内容' }] } } } as unknown as SessionLiveEventEntry)
    expect(history.list('a')).toEqual(['普通消息'])
    state.set({ ...idleState, phase: 'submitting', draft: '/btw 旁问', claim: { name: 'btw', token: '/btw' } })
    state.set(idleState)
    expect(history.list('a')).toEqual(['普通消息', '/btw 旁问'])
    state.set({ ...idleState, phase: 'submitting', draft: '/失败' })
    state.set({ ...idleState, phase: 'claimed', draft: '/失败' })
    state.set(idleState)
    expect(history.list('a')).not.toContain('/失败')
    expect(press()).toBe(true)
    expect(editor.value).toBe('/btw 旁问')
    for (const guard of [
      { ...idleState, phase: 'submitting' as const },
      { ...idleState, phase: 'adjudicating' as const },
      { ...idleState, [attachmentKey]: ['file:1'] as never },
      { ...idleState, occurrences: [{}] as never },
    ]) {
      state.set(guard)
      expect(press()).toBe(false)
    }
    state.set(idleState)
    menu.set({ open: true })
    expect(press()).toBe(false)
    menu.set({ open: false })
    await render('b')
    expect(state.listeners.size).toBe(1)
    expect(events.listeners.size).toBe(1)
    expect(press()).toBe(false)
    expect(history.list('a')).toEqual(['普通消息', '/btw 旁问'])
    expect(history.list('b')).toEqual([])
    history.add('b', '另一个项目')
    expect(press()).toBe(true)
    expect(editor.value).toBe('另一个项目')
    state.set(idleState)
    await render('a')
    expect(press()).toBe(true)
    expect(editor.value).toBe('/btw 旁问')
  } finally { await act(async () => root.unmount()) }
  expect(state.listeners.size).toBe(0)
  expect(events.listeners.size).toBe(0)
  state.set(idleState)
  expect(press()).toBe(false)
})

test.each(['replace', 'append'] as const)('重载时不重放已有 %s 窗口或重新保存历史', async kind => {
  const entries = [userEvent(1, 'hello'), userEvent(2, 'world')]
  let saved = JSON.stringify({ project: ['hello', 'world'] })
  let writes = 0
  const storage = { getItem: (key: string) => key === HISTORY_KEY ? saved : null, setItem: (_key: string, value: string) => { saved = value; writes++ } }
  for (let reload = 0; reload < 2; reload++) {
    const events = eventStore({ entries, revision: 2, hasMore: false, change: { kind, entries } })
    const history = new InputHistory(storage)
    const fixture = await mountHistory(events, history)
    try { expect(history.list('project')).toEqual(['hello', 'world']) }
    finally { await fixture.unmount() }
  }
  expect(writes).toBe(0)
})

test('异步窗口替换和前翻不入历史，只记录新的 append 增量且同一通知不重复', async () => {
  const events = eventStore()
  const history = new InputHistory()
  const fixture = await mountHistory(events, history)
  try {
    events.window('replace', [userEvent(10, '窗口旧消息')])
    events.window('prepend', [userEvent(1, '更早消息')])
    expect(history.list('s')).toEqual([])
    events.append(userEvent(11, '实时消息'))
    expect(history.list('s')).toEqual(['实时消息'])
    history.add('s', '另一会话消息')
    events.set(events.getSnapshot())
    expect(history.list('s')).toEqual(['实时消息', '另一会话消息'])
    events.window('replace', [userEvent(20, '重连窗口消息')])
    events.append(userEvent(21, '实时消息'))
    expect(history.list('s')).toEqual(['实时消息', '另一会话消息', '实时消息'])
  } finally { await fixture.unmount() }
})

test('重复挂载共享会话只采集一次，卸载期间的事件不补录', async () => {
  const events = eventStore()
  const history = new InputHistory()
  const seen = new WeakMap<object, number>()
  const binding = { ctx: {}, eventSource: events }
  const first = await mountHistory(events, history, seen, binding)
  const second = await mountHistory(events, history, seen, binding)
  try {
    events.append(userEvent(1, '第一条'), userEvent(2, '第二条'))
    expect(history.list('s')).toEqual(['第一条', '第二条'])
  } finally { await first.unmount(); await second.unmount() }
  events.append(userEvent(3, '离线输入'))
  const remounted = await mountHistory(events, history, seen, binding)
  try {
    expect(history.list('s')).toEqual(['第一条', '第二条'])
    events.append(userEvent(4, '重新挂载后输入'))
    expect(history.list('s')).toEqual(['第一条', '第二条', '重新挂载后输入'])
  } finally { await remounted.unmount() }
})

test('替换窗口的 revision 归零后恢复实时采集，多实例仍去重且不回灌旧消息', async () => {
  const entries = [userEvent(10, '旧消息')]
  const events = eventStore({ entries, revision: 50, hasMore: false, change: { kind: 'replace', entries } })
  const history = new InputHistory()
  const seen = new WeakMap<object, number>()
  const binding = { ctx: {}, eventSource: events }
  const first = await mountHistory(events, history, seen, binding)
  const second = await mountHistory(events, history, seen, binding)
  try {
    events.set({ entries, revision: 0, hasMore: false, change: { kind: 'replace', entries } })
    expect(history.list('s')).toEqual([])
    events.append(userEvent(11, '新消息一'), userEvent(12, '新消息二'))
    expect(history.list('s')).toEqual(['新消息一', '新消息二'])
    history.add('s', '其他会话输入')
    events.set(events.getSnapshot())
    expect(history.list('s')).toEqual(['新消息一', '新消息二', '其他会话输入'])
  } finally { await first.unmount(); await second.unmount() }
})


test('工作区模式按 cwd 共享历史，同一工作区的会话互相召回', async () => {
  setHistoryScope('workspace')
  const history = new InputHistory()
  const seen = new WeakMap<object, number>()
  const eventsA = eventStore()
  const eventsB = eventStore()
  const a = await mountHistory(eventsA, history, seen, { ctx: {}, eventSource: eventsA }, { sessionId: 'a', cwd: '项目一' })
  const b = await mountHistory(eventsB, history, seen, { ctx: {}, eventSource: eventsB }, { sessionId: 'b', cwd: '项目一' })
  try {
    eventsA.append(userEvent(1, 'A 的输入'))
    expect(history.list('项目一')).toEqual(['A 的输入'])
    eventsB.append(userEvent(2, 'B 的输入'))
    expect(history.list('项目一')).toEqual(['A 的输入', 'B 的输入'])
  } finally { await a.unmount(); await b.unmount() }
})

test('切换作用域后立即生效，新输入写入新作用域且不补录旧消息', async () => {
  const history = new InputHistory()
  const events = eventStore()
  const fixture = await mountHistory(events, history)
  try {
    events.append(userEvent(1, '会话内输入'))
    expect(history.list('s')).toEqual(['会话内输入'])
    await act(async () => { setHistoryScope('workspace') })
    events.append(userEvent(2, '工作区输入'))
    expect(history.list('project')).toEqual(['工作区输入'])
    expect(history.list('s')).toEqual(['会话内输入'])
  } finally { await fixture.unmount() }
})

async function mountHistory(events: ReturnType<typeof eventStore>, history: InputHistory, seen = new WeakMap<object, number>(), binding = { ctx: {}, eventSource: events }, options: { sessionId?: string; cwd?: string } = {}) {
  const sessionId = options.sessionId ?? 's'
  const cwd = options.cwd ?? 'project'
  const container = document.createElement('section')
  const slot = document.createElement('div')
  container.append(slot, document.createElement('textarea'))
  document.body.append(container)
  const state = store(idle)
  const ctx = {
    sessions: { binding: () => binding, list: { getSnapshot: () => ({ byId: { [sessionId]: { cwd } } }) } },
    conversation: { input: { for: () => ({ state, setDraft() {} }) } },
    inputTriggers: { sessionOf: () => ({ menu: { getSnapshot: () => ({ open: false }) } }) },
  }
  const root = createRoot(slot)
  await act(async () => root.render(createElement(InputHistoryDock, { ctx: ctx as never, sessionId: sessionId as never, history, seen })))
  return { unmount: async () => { await act(async () => root.unmount()); container.remove() } }
}
