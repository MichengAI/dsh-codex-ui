import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { expect, test, vi } from 'vitest'
import { NewConversationSuggestions } from '../src/client/NewConversationSuggestions.tsx'
import { prefillNewConversation, createDraftPresenceSource } from '../src/client/new-conversation-draft.ts'
import { zh } from '../src/client/locales.ts'

const { createRoot } = createRequire(import.meta.url)('react-dom/client') as { createRoot: (el: HTMLElement) => { render: (node: ReactNode) => void; unmount: () => void } }
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

test('任务建议只写空白草稿，保留原文、附件、提及和提交状态', () => {
  const setDraft = vi.fn()
  for (const state of [
    { phase: 'plain', draft: '已有内容', imageIds: [], occurrences: [] },
    { phase: 'plain', draft: '', imageIds: ['image'], occurrences: [] },
    { phase: 'plain', draft: '', imageIds: [], occurrences: ['mention'] },
    { phase: 'submitting', draft: '', imageIds: [], occurrences: [] },
  ]) expect(prefillNewConversation({ state: { getSnapshot: () => state }, setDraft }, '建议')).not.toBe('ready')
  expect(setDraft).not.toHaveBeenCalled()
  expect(prefillNewConversation(undefined, '建议')).toBe('workspace')
  expect(prefillNewConversation({ state: { getSnapshot: () => ({ phase: 'plain', draft: '', imageIds: [], occurrences: [] }) }, setDraft }, '建议')).toBe('ready')
  expect(setDraft).toHaveBeenCalledExactlyOnceWith('建议')
})

test('中部任务入口展开后才填入建议，离开首页和卸载不残留 portal', async () => {
  document.body.innerHTML = '<div id="mount"></div><main data-phase="hero"><div class="host_composerHero"><div><div class="host_stack"><span>原标志和文案</span></div></div></div></main>'
  const main = document.querySelector('main')!
  const root = createRoot(document.querySelector('#mount')!)
  const prefill = vi.fn(() => 'ready' as const)
  let draft = ''
  const listeners = new Set<() => void>()
  const draftSource = { getSnapshot: () => draft.length > 0, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } } }
  try {
    await act(async () => root.render(createElement(NewConversationSuggestions, { t: key => zh[key as keyof typeof zh], prefill, draftSource })))
    expect(document.querySelectorAll('.dcu-home-card')).toHaveLength(4)
    await act(async () => document.querySelector<HTMLButtonElement>('.dcu-home-card')!.click())
    expect(prefill).not.toHaveBeenCalled()
    expect(document.querySelectorAll('.dcu-home-tasks[data-active=true] .dcu-home-task')).toHaveLength(2)
    expect(document.querySelectorAll('.dcu-home-tasks[data-active=false] button:enabled')).toHaveLength(0)
    await act(async () => document.querySelector<HTMLButtonElement>('.dcu-home-task')!.click())
    expect(prefill).toHaveBeenCalledExactlyOnceWith(zh['home.explore.prompt1'])
    await act(async () => { draft = '输入内容'; listeners.forEach(listener => listener()) })
    expect(document.querySelector('.dcu-home-suggestions')?.getAttribute('aria-hidden')).toBe('true')
    expect(document.querySelectorAll('.dcu-home-suggestions button:enabled')).toHaveLength(0)
    await act(async () => { draft = ''; listeners.forEach(listener => listener()) })
    expect(document.querySelector('.dcu-home-suggestions')?.getAttribute('aria-hidden')).toBe('false')
    await act(async () => { main.dataset.phase = 'active' })
    expect(document.querySelector('.dcu-home-suggestions')).toBeNull()
    expect(main.textContent).toBe('原标志和文案')
    await act(async () => { main.dataset.phase = 'hero' })
    expect(document.querySelector('[aria-pressed=true]')).toBeNull()
  } finally {
    await act(async () => root.unmount())
    expect(document.querySelector('.dcu-home-suggestions')).toBeNull()
    document.body.innerHTML = ''
  }
})


test('切换会话时草稿订阅跟随新输入状态，释放旧订阅', () => {
  function store(draft: string) {
    const listeners = new Set<() => void>()
    return { listeners, getSnapshot: () => ({ draft }), subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } } }
  }
  const selection = store(''), first = store(''), second = store('已有草稿')
  let current = first
  const source = createDraftPresenceSource(selection, () => current)
  const stop = source.subscribe(() => {})
  expect(source.getSnapshot()).toBe(false)
  expect(first.listeners.size).toBe(1)
  current = second
  selection.listeners.forEach(fn => fn())
  expect(source.getSnapshot()).toBe(true)
  expect(first.listeners.size).toBe(0)
  expect(second.listeners.size).toBe(1)
  stop()
  expect(selection.listeners.size + second.listeners.size).toBe(0)
})
