// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test, vi } from 'vitest'
import { CodexSidebar } from '../src/client/CodexSidebar.tsx'
import {
  CONTEXT_OVERVIEW_FOOTER_ID,
  createFooterActionSource,
  visibleFooterActions,
} from '../src/client/footer-actions.ts'

test('底部动作按 slot id 过滤，跳过 context-overview 并保留用量统计', () => {
  const entries = [
    { options: { id: CONTEXT_OVERVIEW_FOOTER_ID, order: 10 } },
    { options: { id: 'usage-billing', order: 20 } },
    { options: {} },
  ]
  expect(visibleFooterActions({ entriesOfSlot: () => entries })).toEqual([{ id: 'usage-billing', order: 20 }])
})

test('底部动作快照在注册变化后更新，并释放订阅', () => {
  let entries = [{ options: { id: CONTEXT_OVERVIEW_FOOTER_ID, order: 10 } }, { options: { id: 'usage-billing', order: 20 } }]
  const listeners = new Set<() => void>()
  const source = createFooterActionSource({
    entriesOfSlot: () => entries,
    subscribe: (_name, listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
  })
  const changed = vi.fn()
  const off = source.subscribe(changed)
  const first = source.getSnapshot()
  expect(first).toEqual([{ id: 'usage-billing', order: 20 }])
  expect(source.getSnapshot()).toBe(first)
  entries = [{ options: { id: 'usage-billing', order: 20 } }, { options: { id: 'archive-manager', order: 5 } }]
  listeners.forEach(fn => fn())
  expect(source.getSnapshot().map(action => action.id)).toEqual(['archive-manager', 'usage-billing'])
  off()
  expect(listeners.size).toBe(0)
})

test('侧栏只按可见 id 调用 footer.action，不整槽渲染', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const renderSlot = vi.fn((name: string, _owner: unknown, options?: { only?: string }) => {
    if (name !== 'sidebar.footer.action') return null
    return createElement('button', { 'data-footer-id': options?.only }, options?.only)
  })
  const sessions = { ids: [], byId: {} }
  const workspaces = { archivedSessionIds: [], items: [] }
  const snapshot = [{ id: 'usage-billing', order: 20 }] as const
  try {
    await act(async () => {
      root.render(createElement(CodexSidebar, {
        width: 240,
        collapsed: false,
        footerActions: {
          getSnapshot: () => snapshot,
          subscribe: () => () => {},
        },
        renderSlot,
        t: (key: string) => key,
        useSessions: (selector: (state: typeof sessions) => unknown) => selector(sessions),
        useWorkspaces: (selector: (state: typeof workspaces) => unknown) => selector(workspaces),
        openSession: () => {},
        startSession: () => {},
        toggleSidebar: () => {},
        archiveSession: async () => {},
        deleteSession: async () => {},
        forkSession: async () => {},
        renameSession: async () => {},
        openPath: () => {},
      } as never))
    })
    const footerCalls = renderSlot.mock.calls.filter(call => call[0] === 'sidebar.footer.action')
    expect(footerCalls).toEqual([['sidebar.footer.action', { wide: true }, { only: 'usage-billing' }]])
    expect(container.querySelector('[data-footer-id="usage-billing"]')).not.toBeNull()
    expect(container.querySelector(`[data-footer-id="${CONTEXT_OVERVIEW_FOOTER_ID}"]`)).toBeNull()
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})
