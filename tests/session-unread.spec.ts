import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeSessionUnread } from '../src/client/sidebar/session-unread/index.tsx'
import {
  canMarkSession,
  isSessionArchived,
  isSessionBusy,
  isSessionOpenInMainView,
  shouldShowSessionUnreadAction,
  unreadSetOf,
  writeSessionUnread,
} from '../src/client/sidebar/session-unread/model.ts'

const t = (key: string): string => {
  const dictionary: Record<string, string> = {
    'session.markUnread': '标记为未读',
    'session.markRead': '标记为已读',
  }
  return dictionary[key] ?? key
}

afterEach(() => {
  document.body.innerHTML = ''
  window.getSelection()?.removeAllRanges()
  vi.restoreAllMocks()
})

describe('会话未读：宿主状态读写边界', () => {
  const createHost = () => {
    const completionUnread = new Set<string>()
    const publishStatus = vi.fn()
    return { completionUnread, publishStatus, service: { completionUnread, publishStatus } }
  }

  it('标记未读会写入宿主集合并立即广播；重复标记不重复广播', () => {
    const host = createHost()
    expect(host.completionUnread.has('s1')).toBe(false)
    expect(writeSessionUnread(host.service, 's1', true)).toBe(true)
    expect(host.completionUnread.has('s1')).toBe(true)
    expect(host.publishStatus).toHaveBeenCalledTimes(1)

    expect(writeSessionUnread(host.service, 's1', true)).toBe(true)
    expect(host.publishStatus).toHaveBeenCalledTimes(1)
  })

  it('标记已读只删除目标会话，其它会话的未读保持不变', () => {
    const host = createHost()
    host.completionUnread.add('s1')
    host.completionUnread.add('s2')
    expect(writeSessionUnread(host.service, 's1', false)).toBe(true)
    expect(host.completionUnread.has('s1')).toBe(false)
    expect(host.completionUnread.has('s2')).toBe(true)
    expect(host.publishStatus).toHaveBeenCalledTimes(1)
  })

  it('宿主契约漂移（字段不是 Set / 没有 publishStatus）时 fail-closed，绝不抛错', () => {
    expect(writeSessionUnread(undefined, 's1', true)).toBe(false)
    expect(writeSessionUnread({ completionUnread: ['s1'] }, 's1', true)).toBe(false)
    expect(writeSessionUnread({ completionUnread: new Set() }, 's1', true)).toBe(false)
    expect(writeSessionUnread({ publishStatus: () => {} }, 's1', true)).toBe(false)
    expect(writeSessionUnread({ completionUnread: [], publishStatus: () => {} }, 's1', false)).toBe(false)
  })

  it('广播失败时回滚集合，避免内存状态与宿主渲染分叉', () => {
    const completionUnread = new Set<string>()
    const service = {
      completionUnread,
      publishStatus: () => {
        throw new Error('host publish failed')
      },
    }
    expect(writeSessionUnread(service, 's1', true)).toBe(false)
    expect(completionUnread.has('s1')).toBe(false)
  })
})

describe('会话未读：0.2.2+ 原生 contextMenus 装配', () => {
  it('contextMenus 服务缺失时安静降级，不抛错', () => {
    const stop = observeSessionUnread({ get: () => undefined } as never)
    expect(typeof stop).toBe('function')
    stop()
  })

  it('宿主提供原生 contextMenus 服务时，通过 contextMenus 注册 order 150 菜单项与图标插槽', () => {
    const nativeRegistrations: any[] = []
    const iconRegistrations: any[] = []
    const unregNative = vi.fn()
    const completionUnread = new Set<string>()
    const publishStatus = vi.fn()

    const ctx = {
      slots: {
        inject: vi.fn((name: string, callback: () => unknown) => callback()),
        register: vi.fn((options: any) => {
          if (options.name === 'contextMenu.icon') {
            iconRegistrations.push(options)
          }
          return vi.fn()
        }),
      },
      locale: {
        bind: vi.fn(() => t),
      },
      get: vi.fn((name: string) => {
        if (name === 'contextMenus') {
          return {
            open: () => {},
            register: vi.fn((spec: any) => {
              nativeRegistrations.push(spec)
              return unregNative
            }),
          }
        }
        if (name === 'uiSession') {
          return {
            completionUnread,
            publishStatus,
            sessionStatus: {
              getSnapshot: () =>
                new Map([
                  ['busy-1', { running: false, pendingInteraction: { type: 'approval' } }],
                  ['running-1', { running: true }],
                ]),
              subscribe: vi.fn(),
            },
          }
        }
        if (name === 'workspaces') return { list: { getSnapshot: () => ({ archivedSessionIds: ['archived-1'] }) } }
        if (name === 'sessions') return { list: { getSnapshot: () => ({ byId: { 'open-1': { retainedBy: { mainView: 1 } } } }) } }
        return undefined
      }),
    }

    const stop = observeSessionUnread(ctx as never)
    expect(nativeRegistrations).toHaveLength(1)
    expect(nativeRegistrations[0]).toMatchObject({
      id: 'codex-ui:session-unread',
      target: 'session',
      order: 150,
    })
    expect(iconRegistrations).toHaveLength(2)

    // 已读普通会话
    const unreadItem = nativeRegistrations[0].resolve({ sessionId: 's1' })
    expect(unreadItem).toHaveLength(1)
    expect(unreadItem[0]).toMatchObject({
      id: 'mark-unread',
      label: '标记为未读',
    })
    unreadItem[0].run()
    expect(completionUnread.has('s1')).toBe(true)
    expect(publishStatus).toHaveBeenCalledTimes(1)

    // 未读普通会话
    const readItem = nativeRegistrations[0].resolve({ sessionId: 's1' })
    expect(readItem).toHaveLength(1)
    expect(readItem[0]).toMatchObject({
      id: 'mark-read',
      label: '标记为已读',
    })
    readItem[0].run()
    expect(completionUnread.has('s1')).toBe(false)

    // 已归档与主视图打开会话过滤，以及通过 sessionStatus 检查的忙碌/等待交互会话过滤
    expect(nativeRegistrations[0].resolve({ sessionId: 'archived-1' })).toEqual([])
    expect(nativeRegistrations[0].resolve({ sessionId: 'open-1' })).toEqual([])
    expect(nativeRegistrations[0].resolve({ sessionId: 'busy-1' })).toEqual([])
    expect(nativeRegistrations[0].resolve({ sessionId: 'running-1' })).toEqual([])

    stop()
    expect(unregNative).toHaveBeenCalledTimes(1)
  })

  it('宿主契约漂移时（无法写入）原生 contextMenus 坚决 fail-closed 返回空数组，杜绝静默无效选项', () => {
    const nativeRegistrations: any[] = []
    const ctx = {
      slots: { inject: vi.fn(), register: vi.fn() },
      locale: { bind: vi.fn(() => t) },
      get: vi.fn((name: string) => {
        if (name === 'contextMenus') {
          return {
            register: vi.fn((spec: any) => {
              nativeRegistrations.push(spec)
              return vi.fn()
            }),
          }
        }
        // uiSession 缺失或内部字段不是 Set
        if (name === 'uiSession') return { completionUnread: [] }
        return undefined
      }),
    }

    const stop = observeSessionUnread(ctx as never)
    expect(nativeRegistrations).toHaveLength(1)
    // 契约异常时，对任何会话均应返回空数组
    expect(nativeRegistrations[0].resolve({ sessionId: 's1' })).toEqual([])
    stop()
  })

  it('模型层 shouldShowSessionUnreadAction 统一多维度条件判定', () => {
    // 无法写入时恒为 false
    expect(
      shouldShowSessionUnreadAction({
        canWrite: false,
        isUnread: false,
        isArchived: false,
        isOpenInMainView: false,
        isBusy: false,
      }),
    ).toBe(false)

    // 已归档时恒为 false
    expect(
      shouldShowSessionUnreadAction({
        canWrite: true,
        isUnread: false,
        isArchived: true,
        isOpenInMainView: false,
        isBusy: false,
      }),
    ).toBe(false)

    // 当前未读时，即使忙碌或在主视图也应允许「标记为已读」
    expect(
      shouldShowSessionUnreadAction({
        canWrite: true,
        isUnread: true,
        isArchived: false,
        isOpenInMainView: true,
        isBusy: true,
      }),
    ).toBe(true)

    // 当前已读时，主视图打开或运行中不应展示「标记为未读」
    expect(
      shouldShowSessionUnreadAction({
        canWrite: true,
        isUnread: false,
        isArchived: false,
        isOpenInMainView: true,
        isBusy: false,
      }),
    ).toBe(false)
    expect(
      shouldShowSessionUnreadAction({
        canWrite: true,
        isUnread: false,
        isArchived: false,
        isOpenInMainView: false,
        isBusy: true,
      }),
    ).toBe(false)

    // 正常已读会话展示「标记为未读」
    expect(
      shouldShowSessionUnreadAction({
        canWrite: true,
        isUnread: false,
        isArchived: false,
        isOpenInMainView: false,
        isBusy: false,
      }),
    ).toBe(true)
  })
})
