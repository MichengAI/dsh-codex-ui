import React, { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NS } from '../src/client/locales.ts'
import {
  MarkUnreadMenuItem,
  observeSessionUnread,
  type MarkUnreadMenuProps,
} from '../src/client/sidebar/session-unread/index.tsx'
import {
  findSessionMenuButton,
  sessionIdOfRowKey,
  writeSessionUnread,
} from '../src/client/sidebar/session-unread/model.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const t = (key: string): string => {
  const dictionary: Record<string, string> = {
    'session.markUnread': '标记为未读',
    'session.markRead': '标记为已读',
  }
  return dictionary[key] ?? key
}

interface MenuScenario {
  unread?: boolean
  archived?: boolean
  openInMainView?: boolean
  running?: boolean
}

function createMenuProps(scenario: MenuScenario = {}) {
  const setMenuOpen = vi.fn()
  const markUnread = vi.fn(() => true)
  const markRead = vi.fn(() => true)
  const statuses = new Map([
    [
      's1',
      {
        completionUnread: scenario.unread === true,
        running: scenario.running === true,
        pendingInteraction: undefined,
      },
    ],
  ])
  const props: MarkUnreadMenuProps = {
    sessionId: 's1',
    t,
    markUnread,
    markRead,
    useMenuOpenState: () => [true, setMenuOpen],
    useSessionStatus: selector => selector(statuses),
    useSessions: selector =>
      selector({ byId: { s1: { retainedBy: { mainView: scenario.openInMainView === true ? 1 : 0 } } } }),
    useWorkspaces: selector => selector({ archivedSessionIds: scenario.archived === true ? ['s1'] : [] }),
  }
  return { props, setMenuOpen, markUnread, markRead }
}

async function mountMenu(props: MarkUnreadMenuProps): Promise<{ container: HTMLDivElement; unmount: () => Promise<void> }> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(MarkUnreadMenuItem, props))
  })
  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    },
  }
}

afterEach(() => {
  document.body.innerHTML = ''
  window.getSelection()?.removeAllRanges()
  vi.restoreAllMocks()
})

describe('会话行右键菜单：宿主 DOM 定位', () => {
  it('只解析 session: 前缀；工作区行与空键返回 undefined', () => {
    expect(sessionIdOfRowKey('session:abc')).toBe('abc')
    expect(sessionIdOfRowKey('session:')).toBeUndefined()
    expect(sessionIdOfRowKey('workspace:abc')).toBeUndefined()
    expect(sessionIdOfRowKey('')).toBeUndefined()
    expect(sessionIdOfRowKey(null)).toBeUndefined()
    expect(sessionIdOfRowKey(undefined)).toBeUndefined()
  })

  it('优先取 Menu 包裹的锚点，不把归档/置顶按钮当成「···」', () => {
    const row = document.createElement('div')
    const actions = document.createElement('span')
    actions.className = 'Rows_rowActions__hash'
    const menuRoot = document.createElement('span')
    menuRoot.className = 'Menu_root__hash'
    const trigger = document.createElement('button')
    menuRoot.appendChild(trigger)
    const archive = document.createElement('button')
    const pin = document.createElement('button')
    actions.append(menuRoot, archive, pin)
    row.appendChild(actions)

    expect(findSessionMenuButton(row)).toBe(trigger)
  })

  it('0.2.2+ 直接命中带 data-context-menu-trigger 的锚点，绕过 rowQuickActions 里的快捷按钮', () => {
    const row = document.createElement('div')
    const actions = document.createElement('span')
    actions.className = 'rowActions'
    const trigger = document.createElement('button')
    trigger.setAttribute('data-context-menu-trigger', '')
    const quick = document.createElement('span')
    quick.className = 'rowQuickActions'
    const archive = document.createElement('button')
    const pin = document.createElement('button')
    quick.append(archive, pin)
    actions.append(trigger, quick)
    row.appendChild(actions)

    expect(findSessionMenuButton(row)).toBe(trigger)
  })

  it('外部插件插入的星标按钮会被跳过（归档管理器会让路）', () => {
    const row = document.createElement('div')
    const actions = document.createElement('span')
    actions.className = 'rowActions'
    const starWrapper = document.createElement('span')
    const star = document.createElement('button')
    star.className = 'dsham_rowStar'
    starWrapper.appendChild(star)
    const trigger = document.createElement('button')
    actions.append(starWrapper, trigger)
    row.appendChild(actions)

    expect(findSessionMenuButton(row)).toBe(trigger)
  })

  it('没有 Menu 包裹结构时回到操作区第一个非外部按钮；空白会话行没有操作区', () => {
    const row = document.createElement('div')
    const actions = document.createElement('span')
    actions.className = 'rowActions'
    const trigger = document.createElement('button')
    const archive = document.createElement('button')
    actions.append(trigger, archive)
    row.appendChild(actions)
    expect(findSessionMenuButton(row)).toBe(trigger)

    expect(findSessionMenuButton(document.createElement('div'))).toBeNull()
  })
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

describe('会话菜单项：按会话状态渲染', () => {
  it('已读会话提供「标记为未读」，点击后关闭菜单并写入未读', async () => {
    const scenario = createMenuProps()
    const { container, unmount } = await mountMenu(scenario.props)

    const button = container.querySelector('button[role="menuitem"]')
    expect(button?.textContent).toBe('标记为未读')
    await act(async () => {
      ;(button as HTMLButtonElement).click()
    })

    expect(scenario.setMenuOpen).toHaveBeenCalledWith(false)
    expect(scenario.markUnread).toHaveBeenCalledWith('s1')
    expect(scenario.markRead).not.toHaveBeenCalled()
    await unmount()
  })

  it('未读会话提供「标记为已读」，点击后清除未读', async () => {
    const scenario = createMenuProps({ unread: true })
    const { container, unmount } = await mountMenu(scenario.props)

    const button = container.querySelector('button[role="menuitem"]')
    expect(button?.textContent).toBe('标记为已读')
    await act(async () => {
      ;(button as HTMLButtonElement).click()
    })

    expect(scenario.setMenuOpen).toHaveBeenCalledWith(false)
    expect(scenario.markRead).toHaveBeenCalledWith('s1')
    expect(scenario.markUnread).not.toHaveBeenCalled()
    await unmount()
  })

  it('正在主视图打开 / 已归档 / 忙碌的会话不渲染标记行', async () => {
    for (const scenario of [{ openInMainView: true }, { archived: true }, { running: true }]) {
      const { container, unmount } = await mountMenu(createMenuProps(scenario).props)
      expect(container.querySelector('button')).toBeNull()
      await unmount()
    }
  })

  it('宿主标准 hook 缺失时整行不渲染，不拖垮宿主菜单', async () => {
    const { container, unmount } = await mountMenu({ ...createMenuProps().props, useSessionStatus: undefined })
    expect(container.querySelector('button')).toBeNull()
    await unmount()
  })
})

describe('会话未读：Observer 装配与右键唤起', () => {
  interface RegistrationLike {
    name: string
    id: string
    order: number
    locale: string
    inject: () => { markUnread: (id: string) => boolean; markRead: (id: string) => boolean }
  }

  const createFakeCtx = (host: { service?: unknown } = {}) => {
    const registrations: RegistrationLike[] = []
    const disposeRegistration = vi.fn()
    const ctx = {
      slots: {
        inject: vi.fn((_name: string, callback: () => unknown) => callback()),
        register: vi.fn((options: RegistrationLike) => {
          registrations.push(options)
          return disposeRegistration
        }),
      },
      get: vi.fn((name: string) => (name === 'uiSession' ? host.service : undefined)),
    }
    return { ctx, registrations, disposeRegistration, host }
  }

  const appendSessionRow = (sessionId: string): { row: HTMLDivElement; trigger: HTMLButtonElement } => {
    const row = document.createElement('div')
    row.setAttribute('data-row-key', `session:${sessionId}`)
    const actions = document.createElement('span')
    actions.className = 'rowActions'
    const menuRoot = document.createElement('span')
    const trigger = document.createElement('button')
    menuRoot.appendChild(trigger)
    actions.append(menuRoot)
    row.appendChild(actions)
    document.body.appendChild(row)
    return { row, trigger }
  }

  it('通过宿主会话菜单槽位登记菜单行，并注入读写动作', () => {
    const completionUnread = new Set<string>()
    const publishStatus = vi.fn()
    const { ctx, registrations } = createFakeCtx({ service: { completionUnread, publishStatus } })

    const stop = observeSessionUnread(ctx as never)
    expect(registrations).toHaveLength(1)
    expect(registrations[0]).toMatchObject({
      name: 'sidebar.workspaces.session.menu.item',
      id: 'codex-ui:session-unread',
      order: 150,
      locale: NS,
    })

    const actions = registrations[0]!.inject()
    expect(actions.markUnread('s1')).toBe(true)
    expect(completionUnread.has('s1')).toBe(true)
    expect(publishStatus).toHaveBeenCalledTimes(1)
    expect(actions.markRead('s1')).toBe(true)
    expect(completionUnread.has('s1')).toBe(false)
    stop()
  })

  it('宿主服务晚到时按点击时刻惰性读取，早期点击不抛错也不缓存失败', () => {
    const { ctx, registrations, host } = createFakeCtx()
    const stop = observeSessionUnread(ctx as never)
    const actions = registrations[0]!.inject()

    expect(actions.markUnread('s1')).toBe(false)

    const completionUnread = new Set<string>()
    host.service = { completionUnread, publishStatus: vi.fn() }
    expect(actions.markUnread('s1')).toBe(true)
    expect(completionUnread.has('s1')).toBe(true)
    stop()
  })

  it('右击会话行会接管浏览器菜单并点击宿主「···」锚点', () => {
    const { ctx } = createFakeCtx()
    const stop = observeSessionUnread(ctx as never)
    const { row, trigger } = appendSessionRow('s2')
    const triggerClick = vi.spyOn(trigger, 'click')

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    row.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(triggerClick).toHaveBeenCalledTimes(1)

    stop()
  })

  it('宿主自带右键菜单服务时完全不插手，避免与宿主抢事件或把菜单关掉', () => {
    const { ctx } = createFakeCtx()
    ;(ctx.get as (name: string) => unknown) = vi.fn((name: string) =>
      name === 'contextMenus' ? { open: () => {} } : undefined,
    )
    const stop = observeSessionUnread(ctx as never)
    const { row, trigger } = appendSessionRow('s5')
    const triggerClick = vi.spyOn(trigger, 'click')

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    row.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(triggerClick).not.toHaveBeenCalled()
    stop()
  })

  it('行内已有宿主右键标记（即使拿不到服务）也说明右键归宿主所有', () => {
    const { ctx } = createFakeCtx()
    const stop = observeSessionUnread(ctx as never)
    const { row, trigger } = appendSessionRow('s6')
    trigger.setAttribute('data-context-menu-trigger', '')
    const triggerClick = vi.spyOn(trigger, 'click')

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    row.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(triggerClick).not.toHaveBeenCalled()
    stop()
  })

  it('非会话行、空白会话行和文字选区都不接管右键', () => {
    const { ctx } = createFakeCtx()
    const stop = observeSessionUnread(ctx as never)

    const workspaceRow = document.createElement('div')
    workspaceRow.setAttribute('data-row-key', 'workspace:w1')
    workspaceRow.appendChild(document.createElement('button'))
    document.body.appendChild(workspaceRow)
    const workspaceEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    workspaceRow.dispatchEvent(workspaceEvent)
    expect(workspaceEvent.defaultPrevented).toBe(false)

    const blankRow = document.createElement('div')
    blankRow.setAttribute('data-row-key', 'session:blank')
    document.body.appendChild(blankRow)
    const blankEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    blankRow.dispatchEvent(blankEvent)
    expect(blankEvent.defaultPrevented).toBe(false)

    const { row, trigger } = appendSessionRow('s3')
    const triggerClick = vi.spyOn(trigger, 'click')
    const selectedText = document.createElement('span')
    selectedText.textContent = '要复制的标题'
    row.appendChild(selectedText)
    const range = document.createRange()
    range.selectNodeContents(selectedText)
    window.getSelection()?.addRange(range)

    const selectionEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    row.dispatchEvent(selectionEvent)
    expect(selectionEvent.defaultPrevented).toBe(false)
    expect(triggerClick).not.toHaveBeenCalled()

    stop()
  })

  it('卸载后移除右键监听并注销菜单项', () => {
    const { ctx, disposeRegistration } = createFakeCtx()
    const stop = observeSessionUnread(ctx as never)
    stop()
    stop()

    expect(disposeRegistration).toHaveBeenCalledTimes(1)

    const { row } = appendSessionRow('s4')
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    row.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('slots 服务缺失时安静降级，不安装任何监听', () => {
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
        if (name === 'uiSession') return { completionUnread, publishStatus }
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

    // 已归档与主视图打开会话过滤
    expect(nativeRegistrations[0].resolve({ sessionId: 'archived-1' })).toEqual([])
    expect(nativeRegistrations[0].resolve({ sessionId: 'open-1' })).toEqual([])

    stop()
    expect(unregNative).toHaveBeenCalledTimes(1)
  })
})
