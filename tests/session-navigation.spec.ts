import { expect, test } from 'vitest'
import { openConversation, selectGlobalPanel } from '../src/client/session-navigation.ts'

test('打开已有会话时退出全局面板，兼容没有面板 API 的旧宿主', () => {
  const actions: unknown[] = []
  const host = { sessions: { open(id: string) { actions.push(id) } } }
  expect(openConversation(host, { selectPanel(id: null) { actions.push(id) } }, 'session-1')).toBe(true)
  expect(actions).toEqual(['session-1', null])
  expect(openConversation(host, {}, 'session-2')).toBe(true)
  expect(actions).toEqual(['session-1', null, 'session-2'])
})

test('打开会话优先官方导航，有 reflect 时不硬读未注入服务', () => {
  const actions: unknown[] = []
  const host = {
    reflect: {
      get(name: string) {
        return name === 'uiWorkspace' ? { openSession: (id: string) => { actions.push(id) } } : undefined
      },
    },
    get uiWorkspace(): never { throw new Error('hard access') },
    sessions: { open(id: string) { actions.push(`legacy:${id}`) } },
  }
  expect(openConversation(host, { selectPanel(id: null) { actions.push(id) } }, 'session-1')).toBe(true)
  expect(actions).toEqual(['session-1', null])
})

test('面板切换保留宿主 this，忽略旧版缺失或非函数能力', () => {
  const layout = { active: null as string | null, selectPanel(id: string | null) { this.active = id } }
  selectGlobalPanel(layout, 'files')
  expect(layout.active).toBe('files')
  selectGlobalPanel(layout, null)
  expect(layout.active).toBeNull()
  expect(() => selectGlobalPanel({ selectPanel: false }, 'files')).not.toThrow()
})
