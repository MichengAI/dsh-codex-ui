import { expect, test, vi } from 'vitest'
import { beginSidebarSession } from '../src/client/sidebar-session.ts'

test('新建会话先回到任务页签，再交给宿主创建', () => {
  const setTab = vi.fn()
  const startSession = vi.fn()
  beginSidebarSession(setTab, startSession)
  beginSidebarSession(setTab, startSession, 'ws-1')
  expect(setTab.mock.calls).toEqual([['tasks'], ['tasks']])
  expect(startSession.mock.calls).toEqual([[], ['ws-1']])
})
