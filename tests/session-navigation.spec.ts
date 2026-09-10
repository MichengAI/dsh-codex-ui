import { expect, test } from 'vitest'
import { openConversation } from '../src/client/session-navigation.ts'

test('打开已有会话时退出全局面板，兼容没有面板 API 的旧宿主', () => {
  const actions: unknown[] = []
  const sessions = { open(id: string) { actions.push(id) } }
  openConversation(sessions, { selectPanel(id: null) { actions.push(id) } }, 'session-1')
  expect(actions).toEqual(['session-1', null])
  openConversation(sessions, {}, 'session-2')
  expect(actions).toEqual(['session-1', null, 'session-2'])
})
