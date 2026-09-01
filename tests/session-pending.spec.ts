import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { expect, test } from 'vitest'
import { visiblePendingKind } from '../src/client/session-pending.ts'
import { SessionRow } from '../src/client/session-tree.tsx'

const createRoot = (createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}).createRoot

test('只显示官方 SessionSummary 支持的待处理交互字符串', () => {
  expect(visiblePendingKind('question')).toBe('question')
  expect(visiblePendingKind('approval')).toBe('approval')
  expect(visiblePendingKind('plan-review')).toBe('plan-review')
  expect(visiblePendingKind('custom')).toBeUndefined()
  expect(visiblePendingKind({ kind: 'question' })).toBeUndefined()
  expect(visiblePendingKind(undefined)).toBeUndefined()
})

test('待处理交互覆盖未读点和运行中状态', async () => {
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    await act(async () => {
      root.render(createElement(SessionRow, {
        id: 'session-question',
        title: '需要确认的任务',
        selected: false,
        menuOpen: false,
        pinned: false,
        unread: true,
        running: true,
        pendingInteraction: 'question',
        t: (key: string) => key === 'sessions.waitingAnswer' ? '等待回答' : key,
        menuItems: [],
        onOpen: () => {},
        onMenuChange: () => {},
        onSelectAction: () => {},
        onPin: () => {},
        onArchive: () => {},
        onHover: () => {},
        onLeave: () => {},
        onContextMenu: () => {},
      } as never))
    })

    const pending = container.querySelector('[data-state="warning"]')
    expect(pending?.textContent).toBe('等待回答')
    expect(container.querySelector('.dcu-wb-unread')).toBeNull()
    expect(container.querySelector('.dcu-wb-running')).toBeNull()
  } finally {
    await act(async () => { root.unmount() })
  }
})
