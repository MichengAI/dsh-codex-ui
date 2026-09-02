import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { expect, test } from 'vitest'
import { TurnNavigator } from '../src/client/TurnNavigator.tsx'

const createRoot = (createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}).createRoot

const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

test('alpha.5 尚未注入 useChat 时轮次导航安全返回空态', async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const snapshot = {
    sessionId: 'session-alpha',
    queue: [],
    pendingSubmissions: [],
    running: false,
    subagent: null,
    removed: false,
    openState: 'open',
    openError: null,
    hasMore: false,
    loadingOlder: false,
    promptError: null,
    blank: false,
    lastAgentError: null,
    promptAttempted: false,
    awaitingFirstTurn: false,
  }
  const useSession = <T,>(selector: (value: typeof snapshot) => T): T => selector(snapshot)

  try {
    await expect(act(async () => {
      root.render(createElement(TurnNavigator, {
        useSession,
        t: (key: string) => key,
      } as never))
    })).resolves.toBeUndefined()
    expect(container.querySelector('.dcu-turn-navigator')).toBeNull()
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})

test('旧版 useSession.chat 仍可渲染轮次导航', async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const chat = {
    order: ['user-1'],
    nodes: {
      get: () => ({ key: 'user-1', kind: 'user', data: { content: [{ type: 'text', text: '旧版问题' }] } }),
    },
  }
  const useSession = <T,>(selector: (value: { chat: typeof chat }) => T): T => selector({ chat })

  try {
    await act(async () => {
      root.render(createElement(TurnNavigator, {
        useSession,
        t: (key: string) => key,
      } as never))
    })
    expect(container.querySelectorAll('.dcu-turn-link')).toHaveLength(1)
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})
