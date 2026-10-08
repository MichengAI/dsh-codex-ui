import { expect, test, vi } from 'vitest'
import { beginSidebarSession } from '../src/client/sidebar-session.ts'

test('新建会话先回到任务页签，再交给宿主创建', () => {
  const order: string[] = []
  const setTab = vi.fn(() => { order.push('tab') })
  const startSession = vi.fn(() => { order.push('start') })
  beginSidebarSession(setTab, startSession)
  beginSidebarSession(setTab, startSession, 'ws-1')
  expect(setTab.mock.calls).toEqual([['tasks'], ['tasks']])
  expect(startSession.mock.calls).toEqual([[], ['ws-1']])
  expect(order).toEqual(['tab', 'start', 'tab', 'start'])
})
