import { expect, test } from 'vitest'
import { deepLinkAction, openConversation, selectGlobalPanel } from '../src/client/session-navigation.ts'
import { isSessionArchived } from '../src/client/session-host.ts'

test('打开已归档会话时直接拦截并返回 false，防止已释放引用击穿 React 渲染树', () => {
  const actions: unknown[] = []
  const host = {
    workspaces: {
      list: {
        getSnapshot() {
          return { archivedSessionIds: ['archived-session-1'] }
        },
      },
    },
    reflect: {
      get(name: string) {
        return name === 'uiWorkspace' ? { openSession: (id: string) => { actions.push(id) } } : undefined
      },
    },
    sessions: { open(id: string) { actions.push(`legacy:${id}`) } },
  }
  expect(openConversation(host, { selectPanel(id: null) { actions.push(id) } }, 'archived-session-1')).toBe(false)
  expect(actions).toEqual([])
})

test('uiWorkspace.openSession 抛错时不击穿并返回 false', () => {
  const host = {
    reflect: {
      get(name: string) {
        return name === 'uiWorkspace' ? {
          openSession() {
            throw new Error('Session reference "s1" is released')
          },
        } : undefined
      },
    },
  }
  expect(openConversation(host, {}, 's1')).toBe(false)
})

test('归档判断优先走 reflect，不硬读未注入的工作区服务', () => {
  const host = {
    reflect: {
      get(name: string) {
        return name === 'workspaces' ? { list: { getSnapshot: () => ({ archivedSessionIds: ['archived-1'] }) } } : undefined
      },
    },
    get workspaces(): never { throw new Error('hard access') },
  }
  expect(isSessionArchived(host, 'archived-1')).toBe(true)
  expect(isSessionArchived(host, 'live-1')).toBe(false)
})

test('工作区服务直读抛错时归档判断安全返回 false', () => {
  const host = { get workspaces(): never { throw new Error('hard access') } }
  expect(isSessionArchived(host, 'archived-1')).toBe(false)
})

test('归档会话即使不在 byId 也必须清理深链', () => {
  expect(deepLinkAction({}, true, 'released-archived')).toBe('clean')
  expect(deepLinkAction({ 'released-archived': {} }, true, 'released-archived')).toBe('clean')
})

test('未归档且尚未加载的深链继续等待，已加载的正常打开', () => {
  expect(deepLinkAction({}, false, 'pending')).toBe('wait')
  expect(deepLinkAction({ live: {} }, false, 'live')).toBe('open')
})

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

test('打开失败时必须保留当前全局面板', () => {
  const actions: unknown[] = []
  const host = {
    reflect: { get() { return undefined } },
    sessions: { retain() { return {} }, open(id: string) { actions.push(`legacy:${id}`) } },
  }
  expect(openConversation(host, { selectPanel(id: null) { actions.push(id) } }, 'session-1')).toBe(false)
  expect(actions).toEqual([])
})

test('面板切换保留宿主 this，忽略旧版缺失或非函数能力', () => {
  const layout = { active: null as string | null, selectPanel(id: string | null) { this.active = id } }
  selectGlobalPanel(layout, 'files')
  expect(layout.active).toBe('files')
  selectGlobalPanel(layout, null)
  expect(layout.active).toBeNull()
  expect(() => selectGlobalPanel({ selectPanel: false }, 'files')).not.toThrow()
})
