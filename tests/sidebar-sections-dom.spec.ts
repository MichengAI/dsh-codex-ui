import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  MENU_ITEM_ATTR,
  SECTION_HEADER_ATTR,
  collectProjectBlocks,
  findWorkspaceList,
  observeWorkspaceSections,
} from '../src/client/sidebar/sections/index.ts'
import { DEFAULT_SECTION_ID, PINNED_SECTION_ID } from '../src/client/sidebar/sections/model.ts'
import { flushSectionsSave, setSectionsTransport } from '../src/client/sidebar/sections/store.ts'

/** 宿主列表夹具：`.list > .groupSection > [data-row-key]`，与 rc.5 的实际结构一致。 */
function mountFixture(ids: readonly string[]): HTMLElement {
  const list = document.createElement('div')
  list.className = 'list'
  list.setAttribute('role', 'tree')
  for (const id of ids) {
    // 与宿主 0.2.1-rc.5 一致：list > groupSection > span > 项目行。
    const group = document.createElement('div')
    group.className = 'groupSection'
    group.setAttribute('data-dcu-test-group', id)
    const row = document.createElement('div')
    row.setAttribute('data-row-key', `workspace:${id}`)
    row.setAttribute('role', 'treeitem')
    row.textContent = id
    // 与宿主一致：操作区里第一颗是 ··· 菜单，第二颗是新建会话。
    const actions = document.createElement('span')
    actions.className = 'xyz_rowActions'
    const menuButton = document.createElement('button')
    menuButton.type = 'button'
    menuButton.setAttribute('aria-label', `${id} 操作`)
    menuButton.textContent = '···'
    const newSessionButton = document.createElement('button')
    newSessionButton.type = 'button'
    newSessionButton.setAttribute('aria-label', `${id} 新建会话`)
    newSessionButton.textContent = '+'
    actions.appendChild(menuButton)
    actions.appendChild(newSessionButton)
    row.appendChild(actions)
    const wrapper = document.createElement('span')
    wrapper.className = 'rowWrapper'
    wrapper.appendChild(row)
    group.appendChild(wrapper)
    list.appendChild(group)
  }

  // 真实宿主外面还套着「区块标题 + 列表区」：插件只认这一层里的树，
  // 夹具必须还原它，否则会被当成频道/定时页签的树而跳过。
  const region = document.createElement('div')
  region.className = 'mockBrowser'
  const header = document.createElement('div')
  header.className = 'mock_sectionHeader'
  const label = document.createElement('span')
  label.className = 'mock_sectionLabel'
  label.textContent = '工作区'
  const headerActions = document.createElement('span')
  headerActions.className = 'mock_headerActions'
  for (const name of ['视图选项', '添加工作区']) {
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('aria-label', name)
    headerActions.appendChild(button)
  }
  header.appendChild(label)
  header.appendChild(headerActions)
  const area = document.createElement('div')
  area.className = 'mock_listArea'
  area.appendChild(list)
  region.appendChild(header)
  region.appendChild(area)
  document.body.appendChild(region)
  return list
}

/** 假 workspaces 服务：insertBefore 同时重排 DOM，模拟宿主落库后的重渲染。 */
function fakeWorkspaces(order: string[]) {
  const state = { order: order.slice() }
  const listeners = new Set<() => void>()
  const service = {
    list: {
      getSnapshot: () => ({ items: state.order.map(workspaceId => ({ workspaceId })) }),
      subscribe: vi.fn((listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }),
    },
    insertBefore: vi.fn(async (workspaceId: string, beforeWorkspaceId?: string) => {
      const list = findWorkspaceList(document)
      state.order = state.order.filter(id => id !== workspaceId)
      const at = beforeWorkspaceId === undefined ? state.order.length : state.order.indexOf(beforeWorkspaceId)
      state.order.splice(at === -1 ? state.order.length : at, 0, workspaceId)
      if (list !== undefined) {
        // 按新顺序把分组块依次搬过去，模拟宿主重排（块是 list 的直接子级）。
        const blocks = new Map(collectProjectBlocks(document, list).map(item => [item.workspaceId, item.block]))
        state.order.forEach(id => {
          const block = blocks.get(id)
          if (block !== undefined) list.appendChild(block)
        })
      }
      return {}
    }),
  }
  const notify = () => listeners.forEach(l => l())
  return { service, state, notify }
}

/** 假宿主存储：分区文档现在由宿主接口持有，测试用它替代 localStorage。 */
let hostDocument: string | null = null
const seedSections = (document: unknown): void => {
  hostDocument = JSON.stringify(document)
}
interface StoredSection {
  id: string
  name: string
  ids: string[]
}

const readHostSections = (): { sections: StoredSection[] } => {
  const parsed = JSON.parse(hostDocument ?? '{}') as { sections?: StoredSection[] }
  return { sections: parsed.sections ?? [] }
}

/** 从假宿主文档里取出某个分区；断言失败时给出可读信息，而不是 undefined 崩掉。 */
const hostSection = (id: string): StoredSection => {
  const found = readHostSections().sections.find(section => section.id === id)
  if (found === undefined) throw new Error(`宿主文档里没有分区 ${id}：${hostDocument ?? 'null'}`)
  return found
}

const headers = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[${SECTION_HEADER_ATTR}]`))

const headerIdsInDomOrder = (): string[] =>
  headers().map(header => header.getAttribute(SECTION_HEADER_ATTR) ?? '')

const blockIdsInDomOrder = (): string[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-row-key^="workspace:"]')).map(row =>
    (row.getAttribute('data-row-key') ?? '').slice('workspace:'.length),
  )

const waitForSync = async (times = 6): Promise<void> => {
  for (let i = 0; i < times; i += 1) {
    await new Promise<void>(resolve => {
      window.requestAnimationFrame(() => resolve())
    })
    await Promise.resolve()
  }
  // 分区文档现在是「合并 350ms 后写宿主」，断言前先把待写内容刷出去。
  await flushSectionsSave()
}

describe('工作区分区：DOM 层', () => {
  let dispose: (() => void) | undefined

  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    hostDocument = null
    setSectionsTransport({
      load: async () => hostDocument,
      save: async body => {
        hostDocument = body
        return true
      },
    })
  })

  afterEach(() => {
    dispose?.()
    dispose = undefined
    setSectionsTransport(undefined)
    document.body.innerHTML = ''
    localStorage.clear()
    vi.restoreAllMocks()
  })

  const defaultSlots = {
    entries: (name: string) => (name === 'sidebar.workspaces.directoryFlow' ? [{}] : []),
    subscribe: () => () => {},
  }

  const mount = (ids: string[], ctxExtra: Record<string, unknown> = {}) => {
    const fake = fakeWorkspaces(ids)
    const ctx = {
      get: (name: string) => (name === 'workspaces' ? fake.service : undefined),
      slots: defaultSlots,
      ...ctxExtra,
    }
    dispose = observeWorkspaceSections(ctx as never)
    return fake
  }

  /** 每次重建宿主菜单，避免上一次注入的项目上下文被夹具复用。 */
  const openWorkspaceMenu = async (id: string): Promise<HTMLElement> => {
    document.querySelectorAll('[role="menu"]').forEach(menu => menu.remove())
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    menu.innerHTML = '<div><button role="menuitem"><span><svg></svg></span><span>重命名</span></button></div>'
    document.body.appendChild(menu)
    document.querySelector<HTMLButtonElement>(`button[aria-label="${id} 操作"]`)!.click()
    await Promise.resolve()
    return menu
  }

  it('取消置顶到末尾只移动选中的项目一次，不搬动途中的其他项目', async () => {
    seedSections({ sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b', 'c', 'd'] },
    ] })
    mountFixture(['a', 'b', 'c', 'd'])
    const fake = mount(['a', 'b', 'c', 'd'])
    await waitForSync()
    fake.service.insertBefore.mockClear()
    const menu = await openWorkspaceMenu('a')
    menu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    expect(fake.service.insertBefore.mock.calls).toEqual([['a', undefined]])
    expect(blockIdsInDomOrder()).toEqual(['b', 'c', 'd', 'a'])
  })

  it('宿主快照先到而 DOM 尚未提交时，不提前移动标题或改成员归属', async () => {
    seedSections({ sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b', 'c'] },
    ] })
    const list = mountFixture(['a', 'b', 'c'])
    let order = ['a', 'b', 'c']
    let resolveWrite!: () => void
    const service = {
      list: { getSnapshot: () => ({ items: order.map(workspaceId => ({ workspaceId })) }), subscribe: () => () => {} },
      insertBefore: vi.fn(() => new Promise<void>(resolve => { resolveWrite = resolve })),
    }
    dispose = observeWorkspaceSections({ get: () => service } as never)
    await waitForSync()
    const before = list.innerHTML
    const menu = await openWorkspaceMenu('a')
    menu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    expect(list.innerHTML).toBe(before)
    // 快照到达不等于 React 已完成 DOM 提交；期间菜单/其它树变动也不能触发重排。
    order = ['b', 'c', 'a']
    document.body.appendChild(document.createElement('span'))
    await waitForSync()
    expect(list.innerHTML).toBe(before)
    expect(service.insertBefore.mock.calls).toEqual([['a', undefined]])
    // 模拟宿主只移动选中块，随后才确认写请求。
    list.appendChild(list.querySelector('[data-dcu-test-group="a"]')!)
    await waitForSync()
    expect(list.querySelector('[data-dcu-test-group="a"]')!.getAttribute('data-dcu-section-member')).toBe(DEFAULT_SECTION_ID)
    resolveWrite()
    await waitForSync()
    expect(hostSection(PINNED_SECTION_ID).ids).toEqual([])
    expect(hostSection(DEFAULT_SECTION_ID).ids).toEqual(['b', 'c', 'a'])
  })

  it('空分区位于上一区全部成员之后，重复同步不产生标题搬动', async () => {
    seedSections({ sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
      { id: 's1', name: '空分区', ids: [] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b'] },
    ] })
    const list = mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    const layout = () => Array.from(list.children).map(el => el.getAttribute(SECTION_HEADER_ATTR) ?? el.getAttribute('data-dcu-test-group'))
    expect(layout()).toEqual([PINNED_SECTION_ID, 'a', 's1', DEFAULT_SECTION_ID, 'b'])
    const insert = vi.spyOn(list, 'insertBefore')
    document.body.appendChild(document.createElement('span'))
    await waitForSync()
    expect(insert).not.toHaveBeenCalled()
  })

  it('宿主 DOM 提交后在下一绘制帧之前完成标题归位，而非再等一帧', async () => {
    seedSections({ sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a', 'b', 'c'] },
    ] })
    const list = mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()
    const menu = await openWorkspaceMenu('c')
    const frames: FrameRequestCallback[] = []
    const move = fake.service.insertBefore.getMockImplementation()!
    fake.service.insertBefore.mockImplementation((...args) => {
      void move(...args)
      return new Promise(() => {})
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length })
    menu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    // MutationObserver 与 Promise 微任务已完成，但不运行任何 rAF。
    await Promise.resolve()
    await Promise.resolve()
    const layout = Array.from(list.children).map(el => el.getAttribute(SECTION_HEADER_ATTR) ?? el.getAttribute('data-dcu-test-group'))
    expect(fake.service.insertBefore.mock.calls).toEqual([['c', 'a']])
    expect(layout).toEqual([PINNED_SECTION_ID, 'c', DEFAULT_SECTION_ID, 'a', 'b'])
  })

  it('分区事务只在最终布局上播放一次块位移，不叠加宿主行位移', async () => {
    seedSections({ sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a', 'b', 'c'] },
    ] })
    const list = mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()
    const c = list.querySelector<HTMLElement>('[data-dcu-test-group="c"]')!
    const cancelHost = vi.fn()
    const hostAnimation = { effect: { getKeyframes: () => [{ transform: 'translateY(40px)' }, { transform: 'none' }] }, cancel: cancelHost }
    const row = c.querySelector<HTMLElement>('[data-row-key]')!
    Object.defineProperty(row, 'getAnimations', { configurable: true, value: () => [hostAnimation] })
    vi.spyOn(c, 'getBoundingClientRect').mockImplementation(() => ({
      top: Array.from(list.children).indexOf(c) * 40, left: 0, width: 200, height: 40,
    } as DOMRect))
    const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }))
    Object.defineProperty(c, 'animate', { configurable: true, value: animate })
    const menu = await openWorkspaceMenu('c')
    menu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    expect(cancelHost).toHaveBeenCalledTimes(1)
    expect(animate).toHaveBeenCalledTimes(1)
    expect(fake.service.insertBefore.mock.calls).toEqual([['c', 'a']])
    document.body.appendChild(document.createElement('span'))
    await waitForSync()
    expect(animate).toHaveBeenCalledTimes(1)
  })

  it('连续置顶再取消置顶按操作身份串行，不让第二次写入抢跑', async () => {
    mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()
    const move = fake.service.insertBefore.getMockImplementation()!
    let release!: () => void
    fake.service.insertBefore.mockImplementationOnce(async (...args) => {
      await move(...args)
      await new Promise<void>(resolve => { release = resolve })
      return {}
    })
    ;(await openWorkspaceMenu('c')).querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    ;(await openWorkspaceMenu('c')).querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    expect(fake.service.insertBefore.mock.calls).toEqual([['c', 'a']])
    release()
    await waitForSync()
    expect(fake.service.insertBefore.mock.calls).toEqual([['c', 'a'], ['c', undefined]])
    expect(blockIdsInDomOrder()).toEqual(['a', 'b', 'c'])
    expect(hostSection(PINNED_SECTION_ID).ids).toEqual([])
  })

  it('写入拒绝后撤销未确认意图，后续操作仍可成功且不自动重发', async () => {
    mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fake.service.insertBefore.mockRejectedValueOnce(new Error('拒绝移动'))
    ;(await openWorkspaceMenu('c')).querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    expect(fake.service.insertBefore).toHaveBeenCalledTimes(1)
    expect(hostSection(PINNED_SECTION_ID).ids).toEqual([])
    expect(warning).toHaveBeenCalled()
    ;(await openWorkspaceMenu('c')).querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    expect(fake.service.insertBefore.mock.calls).toEqual([['c', 'a'], ['c', 'a']])
    expect(hostSection(PINNED_SECTION_ID).ids).toEqual(['c'])
  })

  it('写入期间新增项目不会让旧目标顺序永久阻塞后续分区操作', async () => {
    const list = mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()
    const move = fake.service.insertBefore.getMockImplementation()!
    let release!: () => void
    fake.service.insertBefore.mockImplementationOnce(async (...args) => {
      await move(...args)
      await new Promise<void>(resolve => { release = resolve })
      return {}
    })
    ;(await openWorkspaceMenu('c')).querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    fake.state.order.unshift('d')
    const d = list.querySelector<HTMLElement>('[data-dcu-test-group="b"]')!.cloneNode(true) as HTMLElement
    d.setAttribute('data-dcu-test-group', 'd')
    d.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:d')
    list.insertBefore(d, list.firstChild)
    release()
    await waitForSync()
    ;(await openWorkspaceMenu('c')).querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    expect(fake.service.insertBefore.mock.calls).toEqual([['c', 'a'], ['d', 'a'], ['c', undefined]])
    expect(hostSection(DEFAULT_SECTION_ID).ids).toEqual(['d', 'a', 'b', 'c'])
  })

  it('宿主列表无变化时，反复 DOM 更新不会重复保存分区文档', async () => {
    const saved = vi.fn(async (body: string) => { hostDocument = body; return true })
    setSectionsTransport({ load: async () => hostDocument, save: saved })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    saved.mockClear()
    document.body.appendChild(document.createElement('span'))
    await waitForSync()
    document.body.appendChild(document.createElement('span'))
    await waitForSync()
    expect(saved).not.toHaveBeenCalled()
  })

  it('克隆带快捷键槽的宿主菜单项时，不会把快捷键槽误当作文本槽造成文字错位', () => {
    // 模拟宿主带快捷键的菜单项结构：icon + label("设置") + shortcut("Ctrl+S")
    const wrapper = document.createElement('div')
    wrapper.className = 'host-item-wrap'
    const button = document.createElement('button')
    button.setAttribute('role', 'menuitem')
    const iconSpan = document.createElement('span')
    iconSpan.className = 'host-itemIcon'
    iconSpan.innerHTML = '<svg></svg>'
    const labelSpan = document.createElement('span')
    labelSpan.className = 'host-itemLabel'
    labelSpan.textContent = '设置'
    const shortcutSpan = document.createElement('span')
    shortcutSpan.className = 'host-shortcut'
    shortcutSpan.innerHTML = '<span>Ctrl+,</span>'
    button.append(iconSpan, labelSpan, shortcutSpan)
    wrapper.appendChild(button)

    // openHostPanel 内部会用 buildMenuRow 克隆
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    menu.appendChild(wrapper)
    document.body.appendChild(menu)

    const btn = document.querySelector<HTMLButtonElement>('button[aria-label="a 操作"]')
    btn?.click()

    const pinnedItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      el => el.textContent?.includes('置顶')
    )
    expect(pinnedItem).toBeDefined()
    // 关键断言：绝对不能残留“设置”字样！
    expect(pinnedItem?.textContent).not.toContain('设置')
    expect(pinnedItem?.querySelector('[class*="shortcut"]')).toBeNull()
  })

  it('宿主仅展示部分项目时仍能完成分区操作，隐藏项目归属不丢失', async () => {
    mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()
    document.querySelector('[data-dcu-test-group="b"]')!.remove()
    await waitForSync()
    ;(await openWorkspaceMenu('c')).querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    expect(fake.service.insertBefore.mock.calls).toEqual([['c', 'a']])
    expect(hostSection(PINNED_SECTION_ID).ids).toEqual(['c'])
    expect(hostSection(DEFAULT_SECTION_ID).ids).toEqual(['a', 'b'])
    expect(document.querySelector('[data-dcu-test-group="c"]')!.getAttribute('data-dcu-section-member')).toBe(PINNED_SECTION_ID)
  })

  it('宿主写入超过 20 秒未返回时安全放弃并回滚，不锁死后续队列', async () => {
    mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()
    let releaseLate!: () => void
    fake.service.insertBefore.mockImplementationOnce(async () => {
      await new Promise<void>(resolve => { releaseLate = resolve })
      return {}
    })
    const menu = await openWorkspaceMenu('c')
    vi.useFakeTimers()
    try {
      menu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
      await vi.advanceTimersByTimeAsync(8100)
      expect(document.querySelector('[data-dcu-sections-wait]')?.textContent).toContain('尚未完成')
      // 达到 20s 逃生时间
      await vi.advanceTimersByTimeAsync(12000)
      expect(document.querySelector('[data-dcu-sections-wait="aborted"]')?.textContent).toContain('已自动撤销')
      // 确认未提交的置顶意图被回滚
      expect(hostSection(PINNED_SECTION_ID).ids).toEqual([])
      // 4s 后告警提示自动消失
      await vi.advanceTimersByTimeAsync(4100)
      expect(document.querySelector('[data-dcu-sections-wait]')).toBeNull()
      // 此时发起新操作，队列未被锁死，可以正常进行
      fake.service.insertBefore.mockImplementationOnce(async (workspaceId, beforeWorkspaceId) => {
        return fakeWorkspaces(['a', 'b', 'c']).service.insertBefore(workspaceId, beforeWorkspaceId)
      })
      const secondMenu = await openWorkspaceMenu('b')
      secondMenu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
      await vi.advanceTimersByTimeAsync(100)
      expect(fake.service.insertBefore).toHaveBeenCalledTimes(2)
      // 迟到的第一次请求终于返回，但不应干扰当前状态
      releaseLate()
      await vi.advanceTimersByTimeAsync(100)
    } finally {
      vi.useRealTimers()
    }
  })

  it('宿主写入长时间未返回时显示等待提示，不并发重发；迟到完成后继续队列', async () => {
    mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()
    const move = fake.service.insertBefore.getMockImplementation()!
    let release!: () => void
    fake.service.insertBefore.mockImplementationOnce(async (...args) => {
      await move(...args)
      await new Promise<void>(resolve => { release = resolve })
      return {}
    })
    const menu = await openWorkspaceMenu('c')
    vi.useFakeTimers()
    try {
      menu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
      await vi.advanceTimersByTimeAsync(8100)
      expect(document.querySelector('[data-dcu-sections-wait]')?.textContent).toContain('尚未完成')
      expect(fake.service.insertBefore.mock.calls).toEqual([['c', 'a']])
      release()
      await vi.advanceTimersByTimeAsync(1000)
      expect(document.querySelector('[data-dcu-sections-wait]')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('首次同步把未归类的工作区全部落进兜底分区，空的置顶分区不渲染标题', async () => {
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    // 没有任何置顶项目时，「置顶」标题整行都不渲染，不占侧栏高度。
    expect(headerIdsInDomOrder()).toEqual([DEFAULT_SECTION_ID])
    expect(hostSection(DEFAULT_SECTION_ID).ids).toEqual(['a', 'b'])
  })

  it('标题按分区成员的位置插入，顺序与分区一致', async () => {
    seedSections({
        sections: [
          { id: PINNED_SECTION_ID, name: '置顶', ids: ['b'] },
          { id: 's1', name: '客户项目', ids: ['c'] },
          { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a'] },
        ],
      })
    mountFixture(['a', 'b', 'c'])
    mount(['a', 'b', 'c'])
    await waitForSync()
    // 宿主顺序被写成 b,c,a；标题各自贴在自己第一个分组块前。
    expect(blockIdsInDomOrder()).toEqual(['b', 'c', 'a'])
    expect(headerIdsInDomOrder()).toEqual([PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID])
  })

  it('空分区把标题插在下一个分区之前，而不是被挤到列表末尾', async () => {
    seedSections({
        sections: [
          { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
          { id: 's1', name: '客户项目', ids: [] },
          { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b'] },
        ],
      })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    expect(headerIdsInDomOrder()).toEqual([PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID])
  })

  it('顺序已一致时不再写宿主', async () => {
    seedSections({
        sections: [
          { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
          { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b'] },
        ],
      })
    mountFixture(['a', 'b'])
    const fake = mount(['a', 'b'])
    await waitForSync()
    expect(fake.service.insertBefore).not.toHaveBeenCalled()
  })


  it('既有项目的分区归属完全以权威记录为准，绝不通过平铺位置瞎猜篡改归属或将其他项目交换回去', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b', 'c'] },
      ],
    })
    mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()

    // 同时发布快照与完整工作区块，模拟宿主外部更新，而非拆散原生树节点。
    const list = document.querySelector<HTMLElement>('.list')!
    const groups = new Map(collectProjectBlocks(document, list).map(item => [item.workspaceId, item.block]))
    fake.state.order = ['c', 'a', 'b']
    for (const id of fake.state.order) list.appendChild(groups.get(id)!)
    await waitForSync(10)

    // a 依然属于置顶，b 和 c 依然属于项目（c 的位置在 b 之前），绝对不把 c 错误篡改归入置顶！
    const pinned = hostSection(PINNED_SECTION_ID)
    const fallback = hostSection(DEFAULT_SECTION_ID)
    expect(pinned.ids).toEqual(['a'])
    expect(fallback.ids).toEqual(['c', 'b'])
  })

  it('卸载后标题、菜单与存储写入全部撤销', async () => {
    seedSections({ sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
    ] })
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()
    expect(headers()).toHaveLength(2)
    dispose?.()
    dispose = undefined
    expect(headers()).toHaveLength(0)
    expect(document.querySelector(`.dcu-ws-section-menu`)).toBeNull()
  })

  it('collectProjectBlocks 与 findWorkspaceList 能定位宿主结构', () => {
    const list = mountFixture(['a', 'b'])
    expect(findWorkspaceList(document)).toBe(list)
    expect(collectProjectBlocks(document).map(block => block.workspaceId)).toEqual(['a', 'b'])
    // 分组块必须落在 list 的直接子级上，标题才有地方插。
    expect(collectProjectBlocks(document)[0]!.block.parentElement).toBe(list)
  })

  it('标题是列表的直接子节点，并且紧贴各自的分组块', async () => {
    seedSections({
        sections: [
          { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
          { id: 's1', name: '客户项目', ids: ['b'] },
          { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a'] },
        ],
      })
    const list = mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    const headers = Array.from(list.children).filter(child => child.hasAttribute(SECTION_HEADER_ATTR))
    // 置顶分区为空，不渲染标题；剩下两个标题各自贴住自己的分组块。
    expect(headers.map(node => node.getAttribute(SECTION_HEADER_ATTR))).toEqual(['s1', DEFAULT_SECTION_ID])
    const blockOf = (id: string): Element => {
      const group = list.querySelector(`[data-dcu-test-group="${id}"]`)
      expect(group).not.toBeNull()
      return group as Element
    }
    // 标题必须排在它的分组块之前（文档序），这是「贴住分区」的判据。
    const precedes = (header: Element, block: Element): boolean =>
      (header.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    expect(precedes(headers[0]!, blockOf('b'))).toBe(true)
    expect(precedes(headers[1]!, blockOf('a'))).toBe(true)
  })

  it('点击项目行菜单按钮后，在宿主菜单顶部追加「置顶」「分区」两行', async () => {
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    // 宿主菜单：role=menu > 每条一行 div > button[role=menuitem](图标 span + 文案 span)
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    hostRow.className = 'hostRow'
    const hostItem = document.createElement('button')
    hostItem.type = 'button'
    hostItem.setAttribute('role', 'menuitem')
    hostItem.className = 'hostItem'
    const hostIcon = document.createElement('span')
    hostIcon.className = 'hostIcon'
    hostIcon.innerHTML = '<svg></svg>'
    const hostLabel = document.createElement('span')
    hostLabel.className = 'hostLabel'
    hostLabel.textContent = '重命名'
    hostItem.append(hostIcon, hostLabel)
    hostRow.appendChild(hostItem)
    menu.appendChild(hostRow)
    document.body.appendChild(menu)

    document.querySelector<HTMLButtonElement>('button[aria-label="a 操作"]')!.click()
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 0)
    })

    // MENU_ITEM_ATTR 打在按钮上；行容器是宿主的 wrapper div。
    const injected = Array.from(menu.querySelectorAll<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`))
    expect(injected).toHaveLength(2)
    expect(menu.children).toHaveLength(3)
    expect(menu.children[2]).toBe(hostRow)
    expect(menu.children[0]!.querySelector(`[${MENU_ITEM_ATTR}]`)).toBe(injected[0])
    expect(menu.children[1]!.querySelector(`[${MENU_ITEM_ATTR}]`)).toBe(injected[1])

    const [pinButton, sectionButton] = injected as [HTMLButtonElement, HTMLButtonElement]
    // 整行克隆宿主的类名与结构，样式因此与「重命名」完全一致。
    expect(pinButton.parentElement?.className).toBe('hostRow')
    expect(pinButton.className).toBe('hostItem')
    expect(pinButton.querySelector('span')?.innerHTML).toContain('svg')
    expect(pinButton.querySelectorAll('span')[1]?.textContent).toBe('置顶')
    expect(sectionButton.querySelectorAll('span')[1]?.textContent).toBe('分区')
    expect(hostItem.textContent).toBe('重命名')
  })

  it('右键时菜单还没挂上也必须注入成功（宿主是事件之后才开菜单，靠轮询窗口等到）', async () => {
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()

    const row = document.querySelector<HTMLElement>('[data-row-key="workspace:a"]')!
    // 模拟归档管理器的星标按钮插入在操作区最前面
    const starBtn = document.createElement('button')
    starBtn.className = 'dsham_rowStar'
    row.querySelector('[class*="rowActions"]')?.prepend(starBtn)

    // 真实时序：右键先发生，宿主随后才把菜单挂上来。
    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    expect(document.querySelector('[role="menu"]')).toBeNull()

    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    hostRow.className = 'hostRow'
    const hostItem = document.createElement('button')
    hostItem.type = 'button'
    hostItem.setAttribute('role', 'menuitem')
    hostItem.className = 'hostItem'
    const hostIcon = document.createElement('span')
    hostIcon.className = 'hostIcon'
    hostIcon.innerHTML = '<svg></svg>'
    const hostLabel = document.createElement('span')
    hostLabel.className = 'hostLabel'
    hostLabel.textContent = '重命名'
    hostItem.append(hostIcon, hostLabel)
    hostRow.appendChild(hostItem)
    menu.appendChild(hostRow)
    document.body.appendChild(menu)

    // 菜单随后才挂上：注入靠 20ms × 6 的重试或挂载后的 body 观察器落位（两条路径都在生产里）
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 60)
    })

    const injected = Array.from(menu.querySelectorAll<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`))
    expect(injected).toHaveLength(2)
    expect(injected[0]?.textContent).toBe('置顶')
    expect(injected[1]?.textContent).toBe('分区')
  })

  it('操作区只有「新建会话」的行不能被当成菜单锚点（语义不匹配就放弃，不退回第一个按钮）', async () => {
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()

    const row = document.querySelector<HTMLElement>('[data-row-key="workspace:a"]')!
    const actions = row.querySelector<HTMLElement>('[class*="rowActions"]')!
    // 未分组伪工作区的行只有「新建会话」；把它前面的菜单按钮摘掉还原该形态
    actions.querySelectorAll('button')[0]?.remove()
    const newSessionBtn = actions.querySelector('button')!
    expect(newSessionBtn.getAttribute('aria-label')).toContain('新建会话')

    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    const hostItem = document.createElement('button')
    hostItem.type = 'button'
    hostItem.setAttribute('role', 'menuitem')
    const hostIcon = document.createElement('span')
    hostIcon.className = 'hostIcon'
    hostIcon.innerHTML = '<svg></svg>'
    const hostLabel = document.createElement('span')
    hostLabel.className = 'hostLabel'
    hostLabel.textContent = '重命名'
    hostItem.append(hostIcon, hostLabel)
    hostRow.appendChild(hostItem)
    menu.appendChild(hostRow)
    document.body.appendChild(menu)

    newSessionBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 60)
    })

    // 语义不匹配就放弃：不能因为「操作区里有个按钮」就把新建会话当成菜单锚点
    expect(menu.querySelectorAll(`[${MENU_ITEM_ATTR}]`)).toHaveLength(0)
  })

  it('菜单里的「置顶」行能把项目移进内置置顶分区', async () => {
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    hostRow.className = 'hostRow'
    const hostItem = document.createElement('button')
    hostItem.setAttribute('role', 'menuitem')
    hostItem.className = 'hostItem'
    const hostIcon = document.createElement('span')
    hostIcon.innerHTML = '<svg></svg>'
    const hostLabel = document.createElement('span')
    hostLabel.textContent = '重命名'
    hostItem.append(hostIcon, hostLabel)
    hostRow.appendChild(hostItem)
    menu.appendChild(hostRow)
    document.body.appendChild(menu)

    document.querySelector<HTMLButtonElement>('button[aria-label="a 操作"]')!.click()
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 0)
    })
    const pinButton = document.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!
    expect(pinButton.textContent).toContain('置顶')
    pinButton.click()
    await waitForSync()

    const pinned = hostSection(PINNED_SECTION_ID)
    expect(pinned.ids).toEqual(['a'])
  })

  it('点同一行的「新建会话」按钮不会注入菜单项', async () => {
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    document.body.appendChild(menu)
    document.querySelector<HTMLButtonElement>('button[aria-label="a 新建会话"]')!.click()
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 0)
    })
    expect(document.querySelector(`[${MENU_ITEM_ATTR}]`)).toBeNull()
  })
  it('频道/定时页签里的树（不在工作区块内）不插分区标题', async () => {
    // 只有 list，外面没有「区块标题 + 操作按钮」这一层，等同于其它页签的列表。
    const stray = document.createElement('div')
    stray.className = 'list'
    stray.setAttribute('role', 'tree')
    const group = document.createElement('div')
    group.className = 'groupSection'
    const row = document.createElement('div')
    row.setAttribute('data-row-key', 'workspace:x')
    row.textContent = 'x'
    group.appendChild(row)
    stray.appendChild(group)
    document.body.appendChild(stray)

    mount(['x'])
    await waitForSync()
    expect(headers()).toHaveLength(0)
  })

  it('未分组桶归属于「项目」分区：跟着缩进并跟着折叠', async () => {
    const list = mountFixture(['a'])
    // 宿主把未归类的工作区放在 `workspace:`（空 id）这个桶里。
    const ungrouped = document.createElement('div')
    ungrouped.className = 'groupSection'
    const row = document.createElement('div')
    row.setAttribute('data-row-key', 'workspace:')
    row.textContent = '未分组'
    ungrouped.appendChild(row)
    list.appendChild(ungrouped)

    mount(['a'])
    await waitForSync()
    expect(ungrouped.getAttribute('data-dcu-section-member')).toBe(DEFAULT_SECTION_ID)

    const defaultHeader = headers().find(header => header.getAttribute(SECTION_HEADER_ATTR) === DEFAULT_SECTION_ID)!
    defaultHeader.click()
    // 折叠现在有 180ms 的高度过渡，等动画收尾后再断言最终状态。
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 420)
    })
    await waitForSync()
    expect(ungrouped.getAttribute('data-dcu-section-hidden')).toBe('true')
  })

  it('内置分区有 ···（只提供「新建分区」），且不可拖动', async () => {
    // 置顶一个项目，让两个内置分区标题都真实存在（空的置顶分区不渲染标题）。
    seedSections({ sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
    ] })
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()
    for (const id of [PINNED_SECTION_ID, DEFAULT_SECTION_ID]) {
      const header = headers().find(item => item.getAttribute(SECTION_HEADER_ATTR) === id)!
      expect(header.draggable).toBe(false)
      const button = header.querySelector<HTMLElement>('.dcu-ws-section-actions button[data-dcu-action="more"]')
      expect(button).not.toBeNull()
      button!.click()
      await waitForSync(2)
      const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')!
      const labels = Array.from(panel.querySelectorAll('button')).map(item => item.textContent?.trim())
      // 内置分区不给改名、不给移除，只留「新建分区」入口。
      expect(labels).toEqual(['新建分区'])
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      await waitForSync(2)
    }
  })

  it('分区菜单和宿主行菜单同一套定位：左缘贴住「···」、向右展开', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '测试分区', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
      ],
    })
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()

    const custom = headers().find(header => header.getAttribute(SECTION_HEADER_ATTR) === 's1')!
    const button = custom.querySelector<HTMLElement>('.dcu-ws-section-actions button[data-dcu-action="more"]')!
    const box = (left: number, top: number, width: number, height: number) =>
      ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect
    // 宿主自己的行菜单是「左缘≈按钮左缘+4，向右铺」；这里把按钮放在右侧验证同一个规则。
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(box(187, 100, 24, 24))

    button.click()
    await waitForSync(2)

    const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')!
    expect(panel.style.left).toBe('191px')
    expect(panel.style.top).toBe('128px')
  })

  it('所有分区标题均不可拖动，分区转移完全通过菜单确定性操作', async () => {
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    for (const h of headers()) {
      expect(h.draggable).toBe(false)
    }
    // 文档上不再有悬挂的拖拽指示线容器
    expect(document.querySelector('.dcu-ws-section-drop')).toBeNull()
  })

  it('菜单里选自定义分区后，项目真的移动到那个分区（不是只写存储）', async () => {
    seedSections({
        sections: [
          { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
          { id: 's1', name: '客户项目', ids: [] },
          { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a', 'b', 'c'] },
        ],
      })
    mountFixture(['a', 'b', 'c'])
    mount(['a', 'b', 'c'])
    await waitForSync()
    expect(blockIdsInDomOrder()).toEqual(['a', 'b', 'c'])

    // 宿主菜单：role=menu > 行 > button[role=menuitem](图标 + 文案)
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    const hostItem = document.createElement('button')
    hostItem.type = 'button'
    hostItem.setAttribute('role', 'menuitem')
    const icon = document.createElement('span')
    icon.innerHTML = '<svg></svg>'
    const label = document.createElement('span')
    label.textContent = '重命名'
    hostItem.append(icon, label)
    hostRow.appendChild(hostItem)
    menu.appendChild(hostRow)
    document.body.appendChild(menu)

    // 打开「c」这一行的菜单，点我们注入的「分区」，再选自定义分区。
    document.querySelector<HTMLButtonElement>('button[aria-label="c 操作"]')!.click()
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 0)
    })
    const sectionButton = Array.from(document.querySelectorAll<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)).find(
      button => button.textContent?.includes('分区'),
    )!
    sectionButton.click()
    await waitForSync(2)

    const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')!
    const target = Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).find(
      button => button.textContent?.trim() === '客户项目',
    )!
    target.click()
    await waitForSync(12)

    // 自定义分区在「项目」之前，所以成员整体前置：c 排到最前面。
    expect(blockIdsInDomOrder()).toEqual(['c', 'a', 'b'])
    const custom = hostSection('s1')
    expect(custom.ids).toEqual(['c'])
    // 标题顺序仍按分区顺序；置顶分区为空，标题不渲染。
    expect(headerIdsInDomOrder()).toEqual(['s1', DEFAULT_SECTION_ID])
  })
  it('连续两次改归属不会互相打断（写入串行，最终以最后一次为准）', async () => {
    seedSections({
        sections: [
          { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
          { id: 's1', name: '客户项目', ids: [] },
          { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a', 'b', 'c'] },
        ],
      })
    mountFixture(['a', 'b', 'c'])
    mount(['a', 'b', 'c'])
    await waitForSync()

    const hostMenu = () => {
      const existing = document.querySelector('[role="menu"]')
      if (existing !== null) return existing
      const menu = document.createElement('div')
      menu.setAttribute('role', 'menu')
      const row = document.createElement('div')
      const item = document.createElement('button')
      item.type = 'button'
      item.setAttribute('role', 'menuitem')
      const icon = document.createElement('span')
      icon.innerHTML = '<svg></svg>'
      const label = document.createElement('span')
      label.textContent = '重命名'
      item.append(icon, label)
      row.appendChild(item)
      menu.appendChild(row)
      document.body.appendChild(menu)
      return menu
    }

    const assignTo = async (workspaceLabel: string): Promise<void> => {
      hostMenu()
      const menu = document.querySelector('[role="menu"]')!
      // 每次都重新开一次宿主菜单，模拟用户两次操作
      document.querySelector<HTMLButtonElement>(`button[aria-label="${workspaceLabel} 操作"]`)!.click()
      await new Promise<void>(resolve => {
        window.setTimeout(resolve, 0)
      })
      const sectionButton = Array.from(menu.querySelectorAll<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)).find(
        button => button.textContent?.includes('分区'),
      )
      if (sectionButton === undefined) return
      sectionButton.click()
      await waitForSync(2)
      const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')
      const target = Array.from(panel?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
        button => button.textContent?.trim() === '客户项目',
      )
      target?.click()
    }

    await assignTo('c')
    await assignTo('b')
    await waitForSync(14)

    // 两次都进了自定义分区，且顺序按最后一次落点收敛，没有被第一次的写入打断。
    const custom = hostSection('s1')
    expect(custom.ids.slice().sort()).toEqual(['b', 'c'])
    const order = blockIdsInDomOrder()
    expect(order.filter(id => id === 'b' || id === 'c')).toEqual(custom.ids)
  })
  it('空分区通过菜单直接移入（确定性操作，无拖拽歧义）', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a', 'b'] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    expect(hostSection(PINNED_SECTION_ID).ids).toEqual([])

    // 打开 b 的菜单并点击置顶
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    hostRow.className = 'hostRow'
    const hostItem = document.createElement('button')
    hostItem.setAttribute('role', 'menuitem')
    const hostIcon = document.createElement('span')
    hostIcon.innerHTML = '<svg></svg>'
    const hostLabel = document.createElement('span')
    hostLabel.textContent = '重命名'
    hostItem.append(hostIcon, hostLabel)
    hostRow.appendChild(hostItem)
    menu.appendChild(hostRow)
    document.body.appendChild(menu)

    document.querySelector<HTMLButtonElement>('button[aria-label="b 操作"]')!.click()
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    const pinBtn = document.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!
    pinBtn.click()
    await waitForSync()

    expect(hostSection(PINNED_SECTION_ID).ids).toEqual(['b'])
    expect(blockIdsInDomOrder()).toEqual(['b', 'a'])
  })

  it('把一个项目移到别的分区只写一次宿主顺序（不再整表重写）', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '客户项目', ids: [] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a', 'b', 'c'] },
      ],
    })
    mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()
    fake.service.insertBefore.mockClear()

    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    const hostItem = document.createElement('button')
    hostItem.type = 'button'
    hostItem.setAttribute('role', 'menuitem')
    const icon = document.createElement('span')
    icon.innerHTML = '<svg></svg>'
    const label = document.createElement('span')
    label.textContent = '重命名'
    hostItem.append(icon, label)
    hostRow.appendChild(hostItem)
    menu.appendChild(hostRow)
    document.body.appendChild(menu)

    document.querySelector<HTMLButtonElement>('button[aria-label="c 操作"]')!.click()
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 0)
    })
    const sectionButton = Array.from(document.querySelectorAll<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)).find(
      button => button.textContent?.includes('分区'),
    )!
    sectionButton.click()
    await waitForSync(2)
    const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')!
    Array.from(panel.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === '客户项目')!
      .click()
    await waitForSync(12)

    // 一次移动 = 一次 insertBefore；整表重写会写出 3 次，宿主就要重渲染 3 次（卡顿来源）。
    expect(fake.service.insertBefore.mock.calls.length).toBeLessThanOrEqual(1)
    expect(hostSection('s1').ids).toEqual(['c'])
  })
  it('收起后再展开，内容会真的留在展开态（不会自己缩回去）', async () => {
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    const def = headers().find(header => header.getAttribute(SECTION_HEADER_ATTR) === DEFAULT_SECTION_ID)!

    const settle = async (): Promise<void> => {
      await new Promise<void>(resolve => {
        window.setTimeout(resolve, 320)
      })
      await waitForSync()
    }

    def.click()
    await settle()
    expect(document.querySelectorAll('[data-dcu-section-hidden="true"]').length).toBeGreaterThan(0)

    def.click()
    await settle()
    // 展开后不能再被收起，也不应残留 collapsing 中间态。
    expect(document.querySelectorAll('[data-dcu-section-hidden="true"]').length).toBe(0)
    expect(document.querySelectorAll('[data-dcu-section-hidden="collapsing"]').length).toBe(0)
  })
  it('「分区」二级菜单不再列出项目当前所在的分区', async () => {
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    hostRow.className = 'hostRow'
    const hostItem = document.createElement('button')
    hostItem.setAttribute('role', 'menuitem')
    hostItem.className = 'hostItem'
    const hostIcon = document.createElement('span')
    hostIcon.innerHTML = '<svg></svg>'
    const hostLabel = document.createElement('span')
    hostLabel.textContent = '重命名'
    hostItem.append(hostIcon, hostLabel)
    hostRow.appendChild(hostItem)
    menu.appendChild(hostRow)
    document.body.appendChild(menu)

    document.querySelector<HTMLButtonElement>('button[aria-label="a 操作"]')!.click()
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 0)
    })
    const sectionButton = Array.from(document.querySelectorAll<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)).find(
      button => (button.textContent ?? '') === '分区',
    )!
    expect(sectionButton).toBeDefined()
    sectionButton.click()
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 0)
    })

    const panel = document.querySelector('.dcu-ws-section-menu')!
    const labels = Array.from(panel.querySelectorAll('button')).map(button => (button.textContent ?? '').trim())
    // a 默认待在「项目」分区：既不该出现它自己，也不该出现「置顶」（父菜单已有独立一行）。
    expect(labels).toEqual(['新建分区'])
  })

  it('展开后即使宿主重渲染、同步多跑几拍，也不会自己收回', async () => {
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    const def = headers().find(header => header.getAttribute(SECTION_HEADER_ATTR) === DEFAULT_SECTION_ID)!
    const settle = async (): Promise<void> => {
      await new Promise<void>(resolve => {
        window.setTimeout(resolve, 320)
      })
      await waitForSync()
    }

    def.click() // 收起
    await settle()
    def.click() // 展开
    await settle()
    expect(def.getAttribute('data-open')).toBe('true')

    // 模拟宿主重渲染：把分组块换成新节点，再跑几拍同步。
    const list = document.querySelector('[data-sidebar] .list, .list')!
    const blocks = Array.from(list.querySelectorAll<HTMLElement>('[data-dcu-section-member]'))
    for (const block of blocks) {
      const clone = block.cloneNode(true) as HTMLElement
      clone.removeAttribute('data-dcu-section-hidden')
      block.replaceWith(clone)
    }
    await waitForSync()
    await waitForSync()

    expect(def.getAttribute('data-open')).toBe('true')
    expect(document.querySelectorAll('[data-dcu-section-hidden="true"]').length).toBe(0)
  })

  it('点击「移除分区」后，该分区标题当场从 DOM 中立刻消失（0ms），成员回流到默认分区', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '临时分区', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b'] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()


    const s1Header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === 's1')!
    expect(s1Header).toBeDefined()

    // 打开 s1 的标题 ··· 菜单
    const actionsBtn = s1Header.querySelector<HTMLElement>('.dcu-ws-section-actions button[data-dcu-action="more"]')!
    actionsBtn.click()
    await waitForSync()

    const panel = document.querySelector('.dcu-ws-section-menu')!
    const removeBtn = Array.from(panel.querySelectorAll('button')).find(b => b.textContent?.trim() === '移除分区')!
    expect(removeBtn).toBeDefined()

    // 点击移除分区：标题必须当场在同步帧被从 DOM 移除
    removeBtn.click()
    expect(document.querySelector(`[${SECTION_HEADER_ATTR}="s1"]`)).toBeNull()
    expect(headers().some(h => h.getAttribute(SECTION_HEADER_ATTR) === 's1')).toBe(false)

    await waitForSync()
    // a 成员自动回流到默认「项目」分区
    expect(hostSection(DEFAULT_SECTION_ID).ids).toContain('a')
  })

  it('同分区内部的项目拖拽排序正常放行（dragstart 不被拦截，保留原生拖拽排序）', async () => {
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    const rowA = document.querySelector<HTMLElement>('[data-row-key="workspace:a"]')!
    const startEvent = new Event('dragstart', { bubbles: true, cancelable: true })
    rowA.dispatchEvent(startEvent)

    // 验证：dragstart 绝不被阻止，宿主原生同分区拖拽排序完全正常
    expect(startEvent.defaultPrevented).toBe(false)

    // 悬停在同分区的 b 上：主动 preventDefault 并设 move，彻底消灭禁止图标 🚫
    const rowB = document.querySelector<HTMLElement>('[data-row-key="workspace:b"]')!
    const overEvent = new Event('dragover', { bubbles: true, cancelable: true }) as any
    overEvent.dataTransfer = { dropEffect: 'none' }
    rowB.dispatchEvent(overEvent)
    expect(overEvent.defaultPrevented).toBe(true)
    expect(overEvent.dataTransfer.dropEffect).toBe('move')
  })

  it('跨分区拖拽与悬停在分区标题上时被严格拦截（符合 HTML5 规范 dropEffect=none，且阻断向宿主传递）', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b'] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    function createDragEvent(type: string) {
      const event = new Event(type, { bubbles: true, cancelable: true }) as any
      event.dataTransfer = { dropEffect: 'move' }
      let stopped = false
      const origStop = event.stopPropagation.bind(event)
      event.stopPropagation = () => {
        stopped = true
        origStop()
      }
      Object.defineProperty(event, 'isStopped', { get: () => stopped })
      return event as DragEvent & { isStopped: boolean }
    }

    // 模拟上一轮拖拽异常结束残留了 blocked 属性
    document.body.setAttribute('data-dcu-drag-blocked', 'true')

    // 从默认项目 b 发起拖拽：验证 dragstart 立刻主动防御性复位该属性
    const rowB = document.querySelector<HTMLElement>('[data-row-key="workspace:b"]')!
    const startEvent = createDragEvent('dragstart')
    rowB.dispatchEvent(startEvent)
    expect(document.body.hasAttribute('data-dcu-drag-blocked')).toBe(false)

    // 1. 试图悬停在分区标题上：HTML5 规范设定 dropEffect='none'，不 preventDefault（即不可放置），并 stopPropagation 阻断宿主
    const pinnedHeader = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === PINNED_SECTION_ID)!
    const overHeader = createDragEvent('dragover')
    pinnedHeader.dispatchEvent(overHeader)
    expect(overHeader.dataTransfer?.dropEffect).toBe('none')
    expect(overHeader.defaultPrevented).toBe(false) // 规范语义：不 preventDefault 即禁止放置
    expect(overHeader.isStopped).toBe(true)

    // 2. 试图悬停在不同分区（置顶）的项目 a 上：设为 none，不 preventDefault，并阻断向宿主传递
    const rowA = document.querySelector<HTMLElement>('[data-row-key="workspace:a"]')!
    const overForeign = createDragEvent('dragover')
    rowA.dispatchEvent(overForeign)
    expect(overForeign.dataTransfer?.dropEffect).toBe('none')
    expect(overForeign.defaultPrevented).toBe(false)
    expect(overForeign.isStopped).toBe(true)
    // 验证：body 打上 data-dcu-drag-blocked 标记，纯 CSS 隐藏宿主落点线
    expect(document.body.hasAttribute('data-dcu-drag-blocked')).toBe(true)

    // 移回同分区（默认项目 b）：标记自动摘除，宿主落点线自然恢复，零 DOM className 篡改
    const overSame = createDragEvent('dragover')
    rowB.dispatchEvent(overSame)
    expect(document.body.hasAttribute('data-dcu-drag-blocked')).toBe(false)

    // 3. 试图落在不同分区的项目 a 上：直接 preventDefault + stopPropagation 拦截丢弃
    const dropForeign = createDragEvent('drop')
    rowA.dispatchEvent(dropForeign)
    expect(dropForeign.defaultPrevented).toBe(true)
    expect(dropForeign.isStopped).toBe(true)
    expect(document.body.hasAttribute('data-dcu-drag-blocked')).toBe(false)

    // 拖拽结束
    document.dispatchEvent(createDragEvent('dragend'))
    expect(document.body.hasAttribute('data-dcu-drag-blocked')).toBe(false)
  })

  it('dispose() 时彻底解绑全部 document 级事件监听器，避免多次启停时内存与全局点击泄漏', async () => {
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()
    expect(document.querySelector(`[${SECTION_HEADER_ATTR}]`)).not.toBeNull()

    // 监测 document.removeEventListener
    const spy = vi.spyOn(document, 'removeEventListener')

    // 执行 dispose
    dispose?.()
    dispose = undefined

    // 验证：卸载后 headers 集合被清空，DOM 标题被清理
    expect(document.querySelector(`[${SECTION_HEADER_ATTR}]`)).toBeNull()

    // 验证：8 个全局监听器全部执行了具名解绑（真哨兵断言！）
    const removedEvents = spy.mock.calls.map(call => call[0])
    expect(removedEvents).toContain('dragstart')
    expect(removedEvents).toContain('dragover')
    expect(removedEvents).toContain('drop')
    expect(removedEvents).toContain('dragend')
    expect(removedEvents).toContain('keydown')
    expect(removedEvents).toContain('pointerdown')
    expect(removedEvents).toContain('click')

    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    expect(spy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true)
    expect(spy).toHaveBeenCalledWith('click', expect.any(Function), true)
    expect(spy).toHaveBeenCalledWith('dragstart', expect.any(Function), true)
  })

  it('会话行的操作菜单绝对不被注入「置顶」与「分区」（该功能专属项目文件夹）', async () => {
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()

    // 1. 模拟先打开一次工作区菜单（产生过 assigningWorkspaceId）
    document.querySelector<HTMLButtonElement>('button[aria-label="a 操作"]')!.click()
    await new Promise<void>(resolve => setTimeout(resolve, 10))

    // 2. 模拟关闭工作区菜单后，打开一个会话操作菜单（包含会话特有文本「置顶会话」「归档会话」）
    const sessionMenu = document.createElement('div')
    sessionMenu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    hostRow.className = 'hostRow'
    const hostItem = document.createElement('button')
    hostItem.setAttribute('role', 'menuitem')
    const hostLabel = document.createElement('span')
    hostLabel.textContent = '置顶会话'
    hostItem.append(hostLabel)
    hostRow.appendChild(hostItem)
    sessionMenu.appendChild(hostRow)

    // 模拟点击会话行内部
    const sessionRow = document.createElement('div')
    sessionRow.setAttribute('data-row-key', 'session:s1')
    const sessionBtn = document.createElement('button')
    sessionRow.appendChild(sessionBtn)
    document.body.appendChild(sessionRow)
    sessionBtn.click()
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    // 挂载会话菜单
    document.body.appendChild(sessionMenu)
    await new Promise<void>(resolve => setTimeout(resolve, 50))

    // 验证：会话菜单内绝对没有任何插件注入的工作区选项！此选项专属项目文件夹！
    expect(sessionMenu.querySelector(`[${MENU_ITEM_ATTR}]`)).toBeNull()
  })

  it('选择分区后立刻在同步帧完成乐观 DOM 物理就位（0ms瞬间移动，老位置零残留）', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '分组一', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b'] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    // 初始：a 在 s1，b 在 default
    expect(blockIdsInDomOrder()).toEqual(['a', 'b'])

    // 打开 b 的操作菜单，移入 s1
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    hostRow.className = 'hostRow'
    const hostItem = document.createElement('button')
    hostItem.setAttribute('role', 'menuitem')
    const hostIcon = document.createElement('span')
    hostIcon.innerHTML = '<svg></svg>'
    const hostLabel = document.createElement('span')
    hostLabel.textContent = '重命名'
    hostItem.append(hostIcon, hostLabel)
    hostRow.appendChild(hostItem)
    menu.appendChild(hostRow)
    document.body.appendChild(menu)

    document.querySelector<HTMLButtonElement>('button[aria-label="b 操作"]')!.click()
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    const secBtn = Array.from(document.querySelectorAll<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)).find(
      button => (button.textContent ?? '').includes('分区'),
    )!
    secBtn.click()
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    const panel = document.querySelector('.dcu-ws-section-menu')!
    const targetBtn = Array.from(panel.querySelectorAll('button')).find(btn => btn.textContent?.includes('分组一'))!

    // 点击目标分区分组一：验证无需等待任何网络或异步延迟，DOM 物理排布当场瞬时重排！
    targetBtn.click()

    // 0ms 同步检查：b 必须已经在 s1 内部（排在 a 之后），顺序当场为 ['a', 'b']，且属于 s1！
    const bBlock = document.querySelector('[data-row-key="workspace:b"]')!.closest<HTMLElement>('.groupSection')!
    expect(bBlock.getAttribute('data-dcu-section-member')).toBe('s1')
  })

  it('通过菜单把项目移入展开的分组时，当场进入目标分区并立即显示（不需收缩展开）', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '客户项目', ids: [] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a', 'b'] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-row-key^="workspace:"]'))
    const aBlock = rows[0]!.closest<HTMLElement>('.groupSection')!
    aBlock.style.maxHeight = '0px'
    aBlock.style.overflow = 'hidden'
    aBlock.style.opacity = '0'

    // 模拟菜单操作：移入 s1
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const hostRow = document.createElement('div')
    hostRow.className = 'hostRow'
    const hostItem = document.createElement('button')
    hostItem.setAttribute('role', 'menuitem')
    const hostIcon = document.createElement('span')
    hostIcon.innerHTML = '<svg></svg>'
    const hostLabel = document.createElement('span')
    hostLabel.textContent = '重命名'
    hostItem.append(hostIcon, hostLabel)
    hostRow.appendChild(hostItem)
    menu.appendChild(hostRow)
    document.body.appendChild(menu)

    document.querySelector<HTMLButtonElement>('button[aria-label="a 操作"]')!.click()
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    const secBtn = Array.from(document.querySelectorAll<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)).find(
      button => (button.textContent ?? '') === '分区',
    )!
    secBtn.click()
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    const panel = document.querySelector('.dcu-ws-section-menu')!
    const targetBtn = Array.from(panel.querySelectorAll('button')).find(b => b.textContent?.trim() === '客户项目')!
    targetBtn.click()
    await waitForSync()

    // 验证：a 已归入 s1 分区
    const s1 = hostSection('s1')
    expect(s1?.ids).toContain('a')

    // 验证：展开态下所有内联高度限制和 hidden 被清除，当场自然呈现
    expect(aBlock.getAttribute('data-dcu-section-hidden')).toBeNull()
    expect(aBlock.style.maxHeight).toBe('')
    expect(aBlock.style.overflow).toBe('')
    expect(aBlock.style.opacity).toBe('')
  })

  it('展开一个分区后再展开另一个，先展开的不会回弹、也不残留内联高度', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '客户项目', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b', 'c'] },
      ],
    })
    mountFixture(['a', 'b', 'c'])
    mount(['a', 'b', 'c'])
    await waitForSync()
    const settle = async (): Promise<void> => {
      await new Promise<void>(resolve => {
        window.setTimeout(resolve, 320)
      })
      await waitForSync()
    }
    const headerOf = (id: string): HTMLElement =>
      headers().find(header => header.getAttribute(SECTION_HEADER_ATTR) === id)!

    // 先把两个分区都收起
    headerOf('s1').click()
    await settle()
    headerOf(DEFAULT_SECTION_ID).click()
    await settle()

    // 紧挨着展开两块：上一轮动画还没收尾就发起下一轮
    headerOf('s1').click()
    headerOf(DEFAULT_SECTION_ID).click()
    await settle()
    await settle()

    expect(headerOf('s1').getAttribute('data-open')).toBe('true')
    expect(headerOf(DEFAULT_SECTION_ID).getAttribute('data-open')).toBe('true')
    expect(document.querySelectorAll('[data-dcu-section-hidden="true"]').length).toBe(0)
    // 关键：不能把过期的 max-height / overflow 留在块上（那会让内容回弹、还会裁掉落点线）
    for (const block of Array.from(document.querySelectorAll<HTMLElement>('[data-dcu-section-member]'))) {
      expect(block.style.maxHeight).toBe('')
      expect(block.style.overflow).toBe('')
    }
  })

  it('展开箭头用宿主项目行同一个 slot 尺寸，状态由 data-open 驱动', async () => {
    seedSections({ sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
    ] })
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()
    const header = headers().find(item => item.getAttribute(SECTION_HEADER_ATTR) === PINNED_SECTION_ID)!
    const chevron = header.querySelector('.dcu-ws-section-chevron')!
    // 与宿主项目行一致：16×20 的 slot，展开态给 svg 加 rotate(90deg)。
    expect(chevron).not.toBeNull()
    expect(getComputedStyle(chevron).width).toBe('16px')
    expect(getComputedStyle(chevron).height).toBe('20px')
    expect(header.getAttribute('data-open')).toBe('true')
  })

  it('空的「置顶」分区整行隐藏，置顶首个项目后标题回到最上方，取消最后一个置顶后再次隐藏', async () => {
    seedSections({ sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a', 'b'] },
    ] })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    expect(headerIdsInDomOrder()).toEqual([DEFAULT_SECTION_ID])

    // 置顶 b：标题立刻出现在最上方，并贴着 b 的分组块。
    const pinMenu = await openWorkspaceMenu('b')
    pinMenu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    expect(hostSection(PINNED_SECTION_ID).ids).toEqual(['b'])
    expect(headerIdsInDomOrder()).toEqual([PINNED_SECTION_ID, DEFAULT_SECTION_ID])

    // 取消置顶最后一个项目：标题重新消失，不留下空白行。
    const unpinMenu = await openWorkspaceMenu('b')
    unpinMenu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync()
    expect(hostSection(PINNED_SECTION_ID).ids).toEqual([])
    expect(headerIdsInDomOrder()).toEqual([DEFAULT_SECTION_ID])
  })

// 下面两组用例必须留在本 describe 内部：mountFixture / mount / waitForSync / seedSections/
// openWorkspaceMenu 与 beforeEach 里的宿主传输桩都定义在本 describe 作用域内，提到顶层就取不到这些夹具。
/**
 * 分区菜单必须走宿主原语（MenuSurface + MenuItemButton）：既不自绘行，也不依赖
 * 「页面上已经开着某个宿主菜单」。冷启动（全新打开 DSH 后第一次点分区标题 ···）同样要能弹出。
 */
describe('分区菜单使用宿主原语渲染：', () => {
  it('冷启动（页面上没有任何宿主菜单）点分区标题 ··· 也能弹出菜单', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '测试分区', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
      ],
    })
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()
    // 冷启动前提：文档里没有任何宿主菜单可克隆
    document.querySelectorAll('[role="menu"]').forEach(menu => menu.remove())
    expect(document.querySelectorAll('[role="menu"]').length).toBe(0)

    const header = headers().find(item => item.getAttribute(SECTION_HEADER_ATTR) === 's1')!
    header.querySelector<HTMLElement>('.dcu-ws-section-actions button[data-dcu-action="more"]')!.click()
    await waitForSync(2)
    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))

    const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')
    expect(panel).not.toBeNull()
    expect(panel!.getAttribute('role')).toBe('menu')
    // 表面来自宿主 MenuSurface（自带 data-menu-material 磨砂层），行来自宿主 MenuItemButton
    expect(panel!.hasAttribute('data-dcu-menu-surface')).toBe(true)
    expect(panel!.hasAttribute('data-menu-material')).toBe(true)
    // 可访问名称：读屏能报出这是「分区」菜单
    expect(panel!.getAttribute('aria-label')).toBe('分区')
    const labels = Array.from(panel!.querySelectorAll('button[role="menuitem"]')).map(button =>
      button.textContent?.trim(),
    )
    expect(labels).toContain('重命名')
  })

  it('不再自绘面板材质，也不再克隆宿主菜单外壳', () => {
    const source = readFileSync('src/client/sidebar/sections/index.ts', 'utf8')
    expect(source).not.toContain('dcu-ws-section-menu-material')
    expect(source).not.toContain('hostMenuShellTemplate')
    expect(source).toContain('MenuSurface')
    expect(source).toContain('MenuItemButton')
  })
})


describe('分区二级菜单的可访问性：', () => {
  it('「分区 ›」行声明 aria-haspopup=menu，展开时 aria-expanded 同步翻转', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '测试分区', ids: ['b'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    const menu = await openWorkspaceMenu('a')
    const sectionRow = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')).find(
      button => button.textContent?.trim() === '分区',
    )
    expect(sectionRow).toBeDefined()
    expect(sectionRow!.getAttribute('aria-haspopup')).toBe('menu')
    expect(sectionRow!.getAttribute('aria-expanded')).toBe('false')

    sectionRow!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
    await new Promise<void>(resolve => setTimeout(resolve, 140))
    expect(document.querySelector('.dcu-ws-section-menu')).not.toBeNull()
    // 菜单行可能被重新注入，按文案重新取一次当前节点
    const liveRow = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')).find(
      button => button.textContent?.trim() === '分区',
    )
    expect(liveRow!.getAttribute('aria-expanded')).toBe('true')

    // 关闭（Escape）后展开态必须回到 false，否则读屏会一直报「已展开」
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await waitForSync()
    const closedRow = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')).find(
      button => button.textContent?.trim() === '分区',
    )
    expect(closedRow!.getAttribute('aria-expanded')).toBe('false')
  })

  it('菜单行包在内层滚动容器里（面板本体保持 overflow:visible，hover 桥才不会被横向裁掉）', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '测试分区', ids: ['b'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    const menu = await openWorkspaceMenu('a')
    const sectionRow = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')).find(
      button => button.textContent?.trim() === '分区',
    )!
    sectionRow.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
    await new Promise<void>(resolve => setTimeout(resolve, 140))

    const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')!
    const scroll = panel.querySelector<HTMLElement>('.dcu-ws-section-menu-scroll')
    expect(scroll).not.toBeNull()
    // 容器必须脱离 z-index 竞争：宿主侧边栏的层级可高于任何数字，靠 top layer（popover）压住
    expect(panel.parentElement!.getAttribute('popover')).toBe('manual')
    expect(panel.parentElement!.style.zIndex).toBe('2147483000')
    const rows = scroll!.querySelectorAll('button[role="menuitem"]')
    expect(rows.length).toBeGreaterThan(0)
    // 所有行都在内层容器里（外层不再承担滚动，桥才不会被 overflow 裁剪）
    expect(panel.querySelectorAll('button[role="menuitem"]').length).toBe(rows.length)
  })

  it('指针从「分区」行移到二级菜单上不会把菜单收起（行侧 180ms 定时器要被面板取消）', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '测试分区', ids: ['b'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    const menu = await openWorkspaceMenu('a')
    const row = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')).find(
      button => button.textContent?.trim() === '分区',
    )!
    row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
    await new Promise<void>(resolve => setTimeout(resolve, 140))
    const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')
    expect(panel).not.toBeNull()

    // 指针离开行、进入面板（mouseenter 不冒泡，真实浏览器里是容器收到）
    row.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
    panel!.parentElement!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))

    // 越过 180ms 宽限：菜单必须还在
    await new Promise<void>(resolve => setTimeout(resolve, 260))
    expect(document.querySelector('.dcu-ws-section-menu')).not.toBeNull()
  })

  it('跨独立渲染树的内部 pointerout 不应上报给宿主，真正离开菜单仍应放行', async () => {
    seedSections({ sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
      { id: 's1', name: '测试分区', ids: ['b'] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
    ] })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    const menu = await openWorkspaceMenu('a')
    const row = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'))
      .find(button => button.textContent?.trim() === '分区')!
    row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
    await new Promise<void>(resolve => setTimeout(resolve, 150))
    const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')!
    const item = panel.querySelector<HTMLButtonElement>('button[role="menuitem"]')!
    const received: Event[] = []
    const onPointerOut = (event: Event): void => { received.push(event) }
    document.addEventListener('pointerout', onPointerOut)
    try {
      // rc.5 的 React 根会把来自另一棵树的 relatedTarget 当作菜单外部。
      row.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: item }))
      expect(received).toHaveLength(0)
      item.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: row }))
      expect(received).toHaveLength(0)
      item.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: document.body }))
      expect(received).toHaveLength(1)
      // 不涉及子面板的父菜单事件不应被吞掉。
      row.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: menu }))
      expect(received).toHaveLength(2)
    } finally {
      document.removeEventListener('pointerout', onPointerOut)
    }
  })

  it('父菜单被宿主摘掉后，悬停「分区」仍能重新弹出（陈旧 menuHost 必须先自清）', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '测试分区', ids: ['b'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    const menu = await openWorkspaceMenu('a')
    const row = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')).find(
      button => button.textContent?.trim() === '分区',
    )!
    row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
    await new Promise<void>(resolve => setTimeout(resolve, 150))
    const first = document.querySelector<HTMLElement>('.dcu-ws-section-menu')
    expect(first).not.toBeNull()

    // 模拟宿主自己关掉菜单（滚动/缩放/路由切换）：容器被摘走，但插件侧 menuHost 仍指向它
    first!.parentElement!.remove()
    expect(document.querySelector('.dcu-ws-section-menu')).toBeNull()

    // 再次悬停：不得被「menuHost 已存在」的守卫挡住
    row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
    await new Promise<void>(resolve => setTimeout(resolve, 180))
    expect(document.querySelector('.dcu-ws-section-menu')).not.toBeNull()
  })

  it('方向键走到二级菜单首尾时必须被截住，不能把焦点甩回一级菜单', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '测试分区', ids: ['b'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    const menu = await openWorkspaceMenu('a')
    const row = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')).find(
      button => button.textContent?.trim() === '分区',
    )!
    row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
    await new Promise<void>(resolve => setTimeout(resolve, 150))

    const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')!
    const items = Array.from(panel.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'))
    expect(items.length).toBeGreaterThan(1)

    // 末项再按 ↓：必须 preventDefault，否则宿主的 roving focus 会把焦点移出面板
    items[items.length - 1].focus()
    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    items[items.length - 1].dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)

    // 首项再按 ↑：同理
    items[0].focus()
    const up = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })
    items[0].dispatchEvent(up)
    expect(up.defaultPrevented).toBe(true)

    // 中间位置的方向键必须放行，否则面板内就无法用键盘移动
    items[0].focus()
    const pass = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    items[0].dispatchEvent(pass)
    expect(pass.defaultPrevented).toBe(false)
  })

  it('Home/End 必须把焦点留在二级菜单内，不能甩回一级菜单', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '测试分区', ids: ['b'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
      ],
    })
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()

    const menu = await openWorkspaceMenu('a')
    const row = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')).find(
      button => button.textContent?.trim() === '分区',
    )!
    row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
    await new Promise<void>(resolve => setTimeout(resolve, 150))

    const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')!
    const items = Array.from(panel.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'))
    expect(items.length).toBeGreaterThan(1)

    // Home：宿主的漫游里它等于「整个菜单第一项」（一级菜单首行），必须截住并落在面板首行
    const last = items[items.length - 1]
    last.focus()
    const home = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })
    last.dispatchEvent(home)
    expect(home.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(items[0])

    // End：落在面板末行（当前恰好也是整个菜单末行，显式处理以防宿主将来在面板后追加行）
    items[0].focus()
    const end = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })
    items[0].dispatchEvent(end)
    expect(end.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(items[items.length - 1])
  })

  it('所有分区（置顶、项目、自定义分区）均在 ··· 右侧提供添加工作区图标按钮，且 ··· 菜单内不再重复显示', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
        { id: 's1', name: '客户项目', ids: ['b'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['c'] },
      ],
    })
    mountFixture(['a', 'b', 'c'])
    mount(['a', 'b', 'c'])
    await waitForSync()

    for (const id of [PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID]) {
      const header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === id)!
      const buttons = Array.from(header.querySelectorAll<HTMLButtonElement>('.dcu-ws-section-actions button'))
      expect(buttons.length).toBe(2)
      // 第一个按钮（左侧）必须是 ··· 更多按钮
      expect(buttons[0].getAttribute('data-dcu-action')).toBe('more')
      // 第二个按钮（右侧）必须是添加工作区按钮，含 SVG 图标
      expect(buttons[1].getAttribute('data-dcu-action')).toBe('add-workspace')
      expect(buttons[1].getAttribute('title')).toBe('添加工作区')
      expect(buttons[1].querySelector('svg')).not.toBeNull()

      // 打开 ··· 菜单确认内部不再混入添加工作区，且标题标上 data-menu-open="true" 保持操作区可见
      buttons[0].click()
      await waitForSync()
      expect(header.getAttribute('data-menu-open')).toBe('true')
      const panel = document.querySelector<HTMLElement>('.dcu-ws-section-menu')!
      const addWsInMenu = Array.from(panel.querySelectorAll('button')).find(b =>
        b.textContent?.includes('添加工作区') || b.textContent?.includes('新建工作区'),
      )
      expect(addWsInMenu).toBeUndefined()
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      await waitForSync(2)
      expect(header.getAttribute('data-menu-open')).toBeNull()
    }

    // 校验操作区 CSS：与宿主行对齐的 gap:13px 与默认隐藏悬停显隐规则
    const styleText = document.getElementById('michengai-codex-ui-sections-styles')?.textContent ?? ''
    expect(styleText).toContain('.dcu-ws-section-actions{display:none;align-items:center;gap:13px;')
    expect(styleText).toContain('.dcu-ws-section:hover .dcu-ws-section-actions{display:inline-flex}')
    expect(styleText).toContain(".dcu-ws-section[data-menu-open='true'] .dcu-ws-section-actions{display:inline-flex}")
  })

  it('点击分区标题 ··· 右侧的「添加工作区」图标按钮后，触发宿主新建并自动归属且展开目标分区（含自定义与置顶）', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['p1'] },
        { id: 's1', name: '客户项目', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b'] },
      ],
    })
    mountFixture(['p1', 'a', 'b'])
    const fake = mount(['p1', 'a', 'b'])
    await waitForSync()

    // 先把 s1 折起，验证新建后会顺便自动展开
    const s1Header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === 's1')!
    s1Header.click()
    await waitForSync()
    expect(s1Header.dataset.open).toBe('false')

    // 复用夹具自身头部操作栏里的宿主原生「添加工作区」按钮（不再额外往 body 伪造）
    const hostAddBtn = document.querySelector<HTMLButtonElement>('.mock_headerActions button[aria-label="添加工作区"]')!
    const addClicked = vi.fn()
    hostAddBtn.addEventListener('click', addClicked)

    // 1. 点击 s1 标题操作栏左侧的添加工作区按钮
    const s1AddBtn = s1Header.querySelector<HTMLButtonElement>('.dcu-ws-section-actions button[data-dcu-action="add-workspace"]')!
    s1AddBtn.click()
    expect(addClicked).toHaveBeenCalledTimes(1)

    // 模拟宿主创建新工作区 'new-1'
    const list = document.querySelector('.list')!
    const newBlock1 = list.querySelector<HTMLElement>('[data-dcu-test-group="b"]')!.cloneNode(true) as HTMLElement
    newBlock1.setAttribute('data-dcu-test-group', 'new-1')
    newBlock1.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-1')
    list.appendChild(newBlock1)
    fake.state.order = ['p1', 'a', 'b', 'new-1']
    fake.notify()
    await waitForSync()

    // 验证 new-1 自动归入 s1 且 s1 自动展开
    expect(hostSection('s1').ids).toContain('new-1')
    expect(hostSection(DEFAULT_SECTION_ID).ids).not.toContain('new-1')
    expect(s1Header.dataset.open).toBe('true')

    // 2. 点击置顶分区标题操作栏左侧的添加工作区按钮
    const pinHeader = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === PINNED_SECTION_ID)!
    const pinAddBtn = pinHeader.querySelector<HTMLButtonElement>('.dcu-ws-section-actions button[data-dcu-action="add-workspace"]')!
    pinAddBtn.click()
    expect(addClicked).toHaveBeenCalledTimes(2)

    const newBlock2 = list.querySelector<HTMLElement>('[data-dcu-test-group="b"]')!.cloneNode(true) as HTMLElement
    newBlock2.setAttribute('data-dcu-test-group', 'new-2')
    newBlock2.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-2')
    list.appendChild(newBlock2)
    fake.state.order = ['p1', 'a', 'new-1', 'b', 'new-2']
    fake.notify()
    await waitForSync()

    // 验证 new-2 自动归入置顶分区
    expect(hostSection(PINNED_SECTION_ID).ids).toContain('new-2')
  })

  it('无头部添加按钮时绝不误点工作区行操作按钮（含「工作区」字样），并剥离克隆壳的错误菜单属性', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '客户项目', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b'] },
      ],
    })
    mountFixture(['a', 'b'])
    // 将夹具头部原生的添加按钮替换为无关按钮（既保留头部 >=2 颗按钮以通过区域识别，又构造「头部无添加按钮」且含模糊字样的严格测试场景）
    const origHeaderAdd = document.querySelector<HTMLButtonElement>('.mock_headerActions button[aria-label="添加工作区"]')!
    origHeaderAdd.setAttribute('aria-label', '筛选工作区')

    // 给测试夹具的工作区行操作按钮加上真实宿主的属性：iconButton 类、包含「工作区」的 aria-label、菜单语义
    const rowMenuBtn = document.querySelector<HTMLButtonElement>('[data-row-key="workspace:a"] [class*="rowActions"] button')!
    rowMenuBtn.className = 'iconButton'
    rowMenuBtn.setAttribute('aria-label', '工作区“a”的操作')
    rowMenuBtn.setAttribute('aria-haspopup', 'menu')
    rowMenuBtn.setAttribute('aria-expanded', 'false')
    rowMenuBtn.setAttribute('data-context-menu-trigger', '')
    const rowMenuClicked = vi.fn()
    rowMenuBtn.addEventListener('click', rowMenuClicked)
    origHeaderAdd.addEventListener('click', rowMenuClicked)

    // 监听兜底快捷键 KeyO
    const shortcutFired = vi.fn()
    const onKeydown = (e: KeyboardEvent) => {
      if (e.code === 'KeyO' && (e.ctrlKey || e.metaKey)) shortcutFired()
    }
    document.addEventListener('keydown', onKeydown)

    mount(['a', 'b'])
    await waitForSync()

    const s1Header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === 's1')!
    const addBtn = s1Header.querySelector<HTMLButtonElement>('.dcu-ws-section-actions button[data-dcu-action="add-workspace"]')!

    // 1. 克隆外壳不得保留菜单错误属性（P3-3）
    expect(addBtn.getAttribute('aria-haspopup')).toBeNull()
    expect(addBtn.getAttribute('aria-expanded')).toBeNull()
    expect(addBtn.getAttribute('data-context-menu-trigger')).toBeNull()

    // 2. 点击「添加工作区」时，由于没有真正的头部添加按钮，绝不能误触发工作区行的 ··· 菜单（P2-1）
    addBtn.click()
    expect(rowMenuClicked).not.toHaveBeenCalled()
    expect(shortcutFired).toHaveBeenCalledTimes(1)

    // 3. 验证真实层叠样式（P3-4）：常态 display=none，menuOpen 时切为 inline-flex，gap 为 13px
    const actions = s1Header.querySelector<HTMLElement>('.dcu-ws-section-actions')!
    expect(window.getComputedStyle(actions).display).toBe('none')
    expect(window.getComputedStyle(actions).gap).toBe('13px')
    s1Header.setAttribute('data-menu-open', 'true')
    expect(window.getComputedStyle(actions).display).toBe('inline-flex')

    document.removeEventListener('keydown', onKeydown)
  })

  it('当分区移动 RPC 尚在途时点击「添加工作区」，新建项目仍准确归入目标分区、自动展开且不残留污染后续项', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '客户项目', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b', 'c'] },
      ],
    })
    mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()

    // 把 s1 折叠，然后对 c 发起一次移动制造 RPC 在途（activeUpdate 阻塞）
    const s1Header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === 's1')!
    s1Header.click()
    await waitForSync()
    expect(s1Header.dataset.open).toBe('false')

    let releaseRpc!: () => void
    const origInsert = fake.service.insertBefore.getMockImplementation()!
    fake.service.insertBefore.mockImplementationOnce(async (wsId: string, beforeId?: string) => {
      await new Promise<void>(resolve => {
        releaseRpc = resolve
      })
      return origInsert(wsId, beforeId)
    })

    // 通过工作区菜单把 c 置顶，使 activeUpdate 卡在等待 releaseRpc
    const menu = await openWorkspaceMenu('c')
    menu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync(2)

    // 在途窗口期间：用户点击 s1 的「添加工作区」并创建出 new-1
    s1Header.querySelector<HTMLButtonElement>('.dcu-ws-section-actions button[data-dcu-action="add-workspace"]')!.click()

    const list = document.querySelector('.list')!
    const newBlock1 = list.querySelector<HTMLElement>('[data-dcu-test-group="b"]')!.cloneNode(true) as HTMLElement
    newBlock1.setAttribute('data-dcu-test-group', 'new-1')
    newBlock1.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-1')
    list.appendChild(newBlock1)
    fake.state.order = ['a', 'b', 'c', 'new-1']
    fake.notify()

    // 此时放行之前卡住的 RPC
    releaseRpc()
    await waitForSync(8)

    // 断言 1：new-1 必须落入 s1（绝不能被 withHostWorkspaces 吞进 default！），且 s1 自动展开
    expect(hostSection('s1').ids).toContain('new-1')
    expect(hostSection(DEFAULT_SECTION_ID).ids).not.toContain('new-1')
    expect(s1Header.dataset.open).toBe('true')

    // 断言 2：pending 已被彻底消费，随后别处新增的 new-2 必须正常落入默认「项目」分区
    const newBlock2 = list.querySelector<HTMLElement>('[data-dcu-test-group="b"]')!.cloneNode(true) as HTMLElement
    newBlock2.setAttribute('data-dcu-test-group', 'new-2')
    newBlock2.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-2')
    list.appendChild(newBlock2)
    fake.state.order = [...fake.state.order, 'new-2']
    fake.notify()
    await waitForSync()

    expect(hostSection('s1').ids).not.toContain('new-2')
    expect(hostSection(DEFAULT_SECTION_ID).ids).toContain('new-2')
  })

  it('startNextUpdate 拉起单项目移动写入时若已有新增项目出现，准确消费 pending、一起排入移动并自动展开', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '客户项目', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b', 'c'] },
      ],
    })
    mountFixture(['a', 'b', 'c'])
    const fake = mount(['a', 'b', 'c'])
    await waitForSync()

    // 折叠 s1 并点击其「添加工作区」（挂起 pendingTargetSectionId = 's1'）
    const s1Header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === 's1')!
    s1Header.click()
    await waitForSync()
    expect(s1Header.dataset.open).toBe('false')
    s1Header.querySelector<HTMLButtonElement>('.dcu-ws-section-actions button[data-dcu-action="add-workspace"]')!.click()

    // 紧接着先打开 c 的菜单，在菜单点击「置顶」前的一瞬间宿主快照与 DOM 已加入 new-1（尚未进入 syncNow 空闲同步）
    const menu = await openWorkspaceMenu('c')
    const list = document.querySelector('.list')!
    const newBlock = list.querySelector<HTMLElement>('[data-dcu-test-group="b"]')!.cloneNode(true) as HTMLElement
    newBlock.setAttribute('data-dcu-test-group', 'new-1')
    newBlock.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-1')
    list.appendChild(newBlock)
    fake.state.order = ['a', 'b', 'c', 'new-1']

    // 点击「置顶」立即调用 commitExplicit(..., ['c']) -> 同步进 startNextUpdate()
    menu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
    await waitForSync(8)

    // 验证 c 已置顶、new-1 归入 s1 且 s1 自动展开（不卡死也不掉进 default）
    expect(hostSection(PINNED_SECTION_ID).ids).toContain('c')
    expect(hostSection('s1').ids).toContain('new-1')
    expect(hostSection(DEFAULT_SECTION_ID).ids).not.toContain('new-1')
    expect(s1Header.dataset.open).toBe('true')
    expect(blockIdsInDomOrder()).toEqual(['c', 'a', 'new-1', 'b'])
  })

  it('当宿主 directoryFlow slot 为空时隐藏分区添加工作区按钮，并在热插拔启用/停用后实时同步显隐', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
        { id: 's1', name: '客户项目', ids: ['b'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['c'] },
      ],
    })
    mountFixture(['a', 'b', 'c'])
    let slotEntries: unknown[] = []
    const slotListeners = new Set<() => void>()
    const fakeSlots = {
      entries: (name: string) => (name === 'sidebar.workspaces.directoryFlow' ? slotEntries : []),
      subscribe: (name: string, listener: () => void) => {
        if (name !== 'sidebar.workspaces.directoryFlow') return () => {}
        slotListeners.add(listener)
        return () => slotListeners.delete(listener)
      },
    }
    const notifySlots = () => slotListeners.forEach(fn => fn())

    mount(['a', 'b', 'c'], { slots: fakeSlots })
    await waitForSync()

    // 1. 初始 slot 为空：全部分区只有 ··· 按钮，不能渲染无效的「添加工作区」按钮
    for (const id of [PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID]) {
      const header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === id)!
      expect(header.querySelector('[data-dcu-action="more"]')).not.toBeNull()
      expect(header.querySelector('[data-dcu-action="add-workspace"]')).toBeNull()
    }

    // 2. 热插拔启用 directoryFlow 后，实时在 ··· 右侧补出「添加工作区」按钮
    slotEntries = [{}]
    notifySlots()
    for (const id of [PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID]) {
      const header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === id)!
      const buttons = Array.from(header.querySelectorAll<HTMLButtonElement>('.dcu-ws-section-actions button'))
      expect(buttons.map(b => b.getAttribute('data-dcu-action'))).toEqual(['more', 'add-workspace'])
    }

    // 3. 再次停用 directoryFlow 后，实时移除按钮
    slotEntries = []
    notifySlots()
    for (const id of [PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID]) {
      const header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === id)!
      const buttons = Array.from(header.querySelectorAll<HTMLButtonElement>('.dcu-ws-section-actions button'))
      expect(buttons.map(b => b.getAttribute('data-dcu-action'))).toEqual(['more'])
    }
  })

  it('在分区点击添加后又取消，随后手动点击宿主全局入口或按 Ctrl+O 新建时不会误归入旧分区', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
        { id: 's1', name: '客户项目', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b'] },
      ],
    })
    mountFixture(['a', 'b'])
    const fake = mount(['a', 'b'])
    await waitForSync()

    const s1Header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === 's1')!
    const s1AddBtn = s1Header.querySelector<HTMLButtonElement>('.dcu-ws-section-actions button[data-dcu-action="add-workspace"]')!
    const hostAddBtn = document.querySelector<HTMLButtonElement>('.mock_headerActions button[aria-label="添加工作区"]')!

    // 场景 A：点击 s1 添加工作区后假设弹窗被取消；随后用户手动点击宿主头部原生「添加工作区」按钮
    s1AddBtn.click()
    hostAddBtn.click()

    const list = document.querySelector('.list')!
    const block1 = list.querySelector<HTMLElement>('[data-dcu-test-group="b"]')!.cloneNode(true) as HTMLElement
    block1.setAttribute('data-dcu-test-group', 'new-global-1')
    block1.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-global-1')
    list.appendChild(block1)
    fake.state.order = ['a', 'b', 'new-global-1']
    fake.notify()
    await waitForSync()

    expect(hostSection('s1').ids).not.toContain('new-global-1')
    expect(hostSection(DEFAULT_SECTION_ID).ids).toContain('new-global-1')

    // 场景 B：再次点击 s1 添加工作区并取消，随后用户手动按 Ctrl/Cmd + O
    s1AddBtn.click()
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'KeyO',
        key: 'o',
        ctrlKey: !isMac,
        metaKey: isMac,
        bubbles: true,
        cancelable: true,
      }),
    )

    const block2 = list.querySelector<HTMLElement>('[data-dcu-test-group="b"]')!.cloneNode(true) as HTMLElement
    block2.setAttribute('data-dcu-test-group', 'new-global-2')
    block2.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-global-2')
    list.appendChild(block2)
    fake.state.order = ['a', 'b', 'new-global-1', 'new-global-2']
    fake.notify()
    await waitForSync()

    expect(hostSection('s1').ids).not.toContain('new-global-2')
    expect(hostSection(DEFAULT_SECTION_ID).ids).toContain('new-global-2')

    // 场景 C：再次点击 s1 添加工作区并取消，随后用户在会话空页 Picker 菜单点击「添加工作区…」菜单项
    s1AddBtn.click()
    const pickerMenu = document.createElement('div')
    pickerMenu.setAttribute('role', 'menu')
    const pickerMenuItem = document.createElement('button')
    pickerMenuItem.setAttribute('role', 'menuitem')
    pickerMenuItem.textContent = '添加工作区…'
    pickerMenu.appendChild(pickerMenuItem)
    document.body.appendChild(pickerMenu)
    pickerMenuItem.click()
    pickerMenu.remove()

    const block3 = list.querySelector<HTMLElement>('[data-dcu-test-group="b"]')!.cloneNode(true) as HTMLElement
    block3.setAttribute('data-dcu-test-group', 'new-global-3')
    block3.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-global-3')
    list.appendChild(block3)
    fake.state.order = ['a', 'b', 'new-global-1', 'new-global-2', 'new-global-3']
    fake.notify()
    await waitForSync()

    expect(hostSection('s1').ids).not.toContain('new-global-3')
    expect(hostSection(DEFAULT_SECTION_ID).ids).toContain('new-global-3')
  })

  it('真实宿主 prepend 语义：在「项目」分组点击添加工作区后，「项目」绝不跑到「置顶」上面且不丢失既有成员', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['p1'] },
        { id: 's1', name: '客户项目', ids: ['a'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b1', 'b2'] },
      ],
    })
    mountFixture(['p1', 'a', 'b1', 'b2'])
    const fake = mount(['p1', 'a', 'b1', 'b2'])
    await waitForSync()

    // 在「项目」分区（DEFAULT_SECTION_ID）点击添加工作区按钮
    const defaultHeader = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === DEFAULT_SECTION_ID)!
    defaultHeader.querySelector<HTMLButtonElement>('.dcu-ws-section-actions button[data-dcu-action="add-workspace"]')!.click()

    // 真实 dsh-workspace 会把新工作区 prepend 到列表第 0 位（置顶之前！）
    const list = document.querySelector('.list')!
    const newBlock = list.querySelector<HTMLElement>('[data-dcu-test-group="b1"]')!.cloneNode(true) as HTMLElement
    newBlock.setAttribute('data-dcu-test-group', 'new-1')
    newBlock.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-1')
    list.prepend(newBlock)
    fake.state.order = ['new-1', 'p1', 'a', 'b1', 'b2']
    fake.notify()
    await waitForSync(8)

    // 1. 标题顺序必须严格维持：置顶 -> 自定义 s1 -> 项目（「项目」绝不能跑到最上面！）
    expect(headerIdsInDomOrder()).toEqual([PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID])
    // 2. 新项目必须被物理移动进「项目」分区第一位，原有项目 b1/b2 紧随其后
    expect(blockIdsInDomOrder()).toEqual(['p1', 'a', 'new-1', 'b1', 'b2'])
    expect(hostSection(DEFAULT_SECTION_ID).ids).toEqual(['new-1', 'b1', 'b2'])
    expect(fake.service.insertBefore).toHaveBeenCalledWith('new-1', 'b1')

    // 3. 验证真实 DOM 子节点顺序：每个标题之后紧跟该分区的全部成员块
    const domFlow = Array.from(list.children).map(el => {
      if (el.hasAttribute(SECTION_HEADER_ATTR)) return `H:${el.getAttribute(SECTION_HEADER_ATTR)}`
      const row = el.querySelector('[data-row-key]')
      return row ? row.getAttribute('data-row-key')!.slice('workspace:'.length) : '?'
    })
    expect(domFlow).toEqual(['H:pinned', 'p1', 'H:s1', 'a', 'H:default', 'new-1', 'b1', 'b2'])
  })

  it('真实宿主 prepend 语义：从全局入口新建工作区（无分区 target）且存在置顶分区时，新项目也自动归入「项目」而非停在「置顶」之上', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['p1'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
      ],
    })
    mountFixture(['p1'])
    const fake = mount(['p1'])
    await waitForSync()

    // 不点任何分区按钮，直接触发宿主全局添加，宿主 prepend 'new-global' 到第 0 位
    const list = document.querySelector('.list')!
    const newBlock = list.querySelector<HTMLElement>('[data-dcu-test-group="p1"]')!.cloneNode(true) as HTMLElement
    newBlock.setAttribute('data-dcu-test-group', 'new-global')
    newBlock.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-global')
    list.prepend(newBlock)
    fake.state.order = ['new-global', 'p1']
    fake.notify()
    await waitForSync(8)

    expect(headerIdsInDomOrder()).toEqual([PINNED_SECTION_ID, DEFAULT_SECTION_ID])
    expect(blockIdsInDomOrder()).toEqual(['p1', 'new-global'])
    expect(hostSection(DEFAULT_SECTION_ID).ids).toEqual(['new-global'])
  })

  it('方案 A：新增工作区归位时不额外触发 SectionLayoutMotion 避免与宿主 AnimatedRows 打架，且菜单主动移动仍保留动效', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['p1'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['b1'] },
      ],
    })
    mountFixture(['p1', 'b1'])
    const fake = mount(['p1', 'b1'])
    await waitForSync()

    const list = document.querySelector('.list')!
    const origAnimate = HTMLElement.prototype.animate
    const animateSpy = vi.fn(() => ({
      finished: Promise.resolve(),
      cancel: vi.fn(),
      effect: null,
    }))
    HTMLElement.prototype.animate = animateSpy as unknown as typeof HTMLElement.prototype.animate
    try {
      // 赋予非零矩形以便 SectionLayoutMotion 真正走到 keyframes -> animate
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        const idx = Array.from(this.parentElement?.children ?? []).indexOf(this)
        return { left: 0, top: idx * 36, width: 200, height: 32, right: 200, bottom: idx * 36 + 32, x: 0, y: idx * 36, toJSON: () => ({}) } as DOMRect
      })

      // 1. 新建工作区从第 0 位自动归位进「项目」分区：绝不能调用插件 animate（完全交由宿主 AnimatedRows 单次平滑）
      const defaultHeader = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === DEFAULT_SECTION_ID)!
      defaultHeader.querySelector<HTMLButtonElement>('.dcu-ws-section-actions button[data-dcu-action="add-workspace"]')!.click()

      const newBlock = list.querySelector<HTMLElement>('[data-dcu-test-group="b1"]')!.cloneNode(true) as HTMLElement
      newBlock.setAttribute('data-dcu-test-group', 'new-1')
      newBlock.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-1')
      newBlock.querySelector('button[aria-label="b1 操作"]')!.setAttribute('aria-label', 'new-1 操作')
      list.prepend(newBlock)
      fake.state.order = ['new-1', 'p1', 'b1']
      fake.notify()
      await waitForSync(8)

      expect(animateSpy).not.toHaveBeenCalled()
      expect(window.getComputedStyle(newBlock).display).not.toBe('none')
      expect(headerIdsInDomOrder()).toEqual([PINNED_SECTION_ID, DEFAULT_SECTION_ID])
      expect(blockIdsInDomOrder()).toEqual(['p1', 'new-1', 'b1'])

      // 2. 用户通过菜单主动将 b1 置顶时，插件 SectionLayoutMotion 依然正常工作
      const menu = await openWorkspaceMenu('b1')
      menu.querySelector<HTMLButtonElement>(`[${MENU_ITEM_ATTR}]`)!.click()
      await waitForSync(8)

      expect(animateSpy).toHaveBeenCalled()
      expect(blockIdsInDomOrder()).toEqual(['p1', 'b1', 'new-1'])
    } finally {
      HTMLElement.prototype.animate = origAnimate
    }
  })

  it('当 ctx.slots 尚未就绪（缺失或无 entries 方法）时不盲目渲染添加工作区按钮', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
        { id: 's1', name: '客户项目', ids: ['b'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['c'] },
      ],
    })
    mountFixture(['a', 'b', 'c'])
    mount(['a', 'b', 'c'], { slots: undefined })
    await waitForSync()

    for (const id of [PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID]) {
      const header = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === id)!
      expect(header.querySelector('[data-dcu-action="more"]')).not.toBeNull()
      expect(header.querySelector('[data-dcu-action="add-workspace"]')).toBeNull()
    }
  })

  it('滞后 create 流帧回滚时压制宿主位移动画并保持标题次序，待 insertBefore 确认后单步显现新工作区', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['p1'] },
        { id: 'secA', name: 'A分组', ids: ['a1'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['d1'] },
      ],
    })
    mountFixture(['p1', 'a1', 'd1'])
    const fake = mount(['p1', 'a1', 'd1'])
    await waitForSync()

    let resolveInsert!: () => void
    const insertGate = new Promise<void>(resolve => {
      resolveInsert = resolve
    })
    fake.service.insertBefore.mockImplementation(async (workspaceId: string, beforeWorkspaceId?: string) => {
      const applyOrder = () => {
        fake.state.order = fake.state.order.filter(id => id !== workspaceId)
        const at = beforeWorkspaceId === undefined ? fake.state.order.length : fake.state.order.indexOf(beforeWorkspaceId)
        fake.state.order.splice(at === -1 ? fake.state.order.length : at, 0, workspaceId)
      }
      applyOrder()
      await insertGate
      applyOrder()
      const listEl = findWorkspaceList(document)!
      const blocks = new Map(collectProjectBlocks(document, listEl).map(item => [item.workspaceId, item.block]))
      fake.state.order.forEach(id => {
        const block = blocks.get(id)
        if (block !== undefined) listEl.appendChild(block)
      })
      fake.notify()
      return {}
    })

    const list = document.querySelector<HTMLElement>('.list')!
    const secAHeader = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === 'secA')!
    secAHeader.querySelector<HTMLButtonElement>('.dcu-ws-section-actions button[data-dcu-action="add-workspace"]')!.click()

    // 模拟宿主 AnimatedRows 在列表行上挂载 transform 动画
    const cancelSpy = vi.fn()
    const rowEl = list.querySelector<HTMLElement>('[data-row-key="workspace:a1"]')!
    ;(rowEl as unknown as { getAnimations: () => unknown[] }).getAnimations = () => [
      {
        effect: { getKeyframes: () => [{ transform: 'translate(0px, -38px)' }, { transform: 'translate(0, 0)' }] },
        cancel: cancelSpy,
      },
    ]

    // 1. 宿主先 prepend new-1 并触发 Commit #1（RPC 仍在飞）
    const newBlock = list.querySelector<HTMLElement>('[data-dcu-test-group="a1"]')!.cloneNode(true) as HTMLElement
    newBlock.setAttribute('data-dcu-test-group', 'new-1')
    newBlock.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-1')
    newBlock.querySelector('button[aria-label="a1 操作"]')!.setAttribute('aria-label', 'new-1 操作')
    const p1Block = list.querySelector<HTMLElement>('[data-dcu-test-group="p1"]')!
    const a1Block = list.querySelector<HTMLElement>('[data-dcu-test-group="a1"]')!
    list.prepend(newBlock)
    fake.state.order = ['new-1', 'p1', 'a1', 'd1']
    fake.notify()
    await waitForSync(4)

    expect(cancelSpy).toHaveBeenCalled()
    expect(newBlock.getAttribute('data-dcu-section-relocating')).toBe('true')
    expect(window.getComputedStyle(newBlock).display).toBe('none')

    // 2. 模拟 create() 滞后流帧到达：DOM 临时将 p1 放到 new-1 后面（企图把 secA 拽到 p1 上面）
    list.insertBefore(p1Block, a1Block)
    fake.state.order = ['new-1', 'p1', 'a1', 'd1']
    fake.notify()
    await waitForSync(4)

    // H:secA 绝不能跃迁到 p1 之上，必须紧跟在 p1 后面（锚定 a1）
    const childrenAfterStaleFrame = Array.from(list.children)
    expect(childrenAfterStaleFrame.indexOf(p1Block)).toBeLessThan(childrenAfterStaleFrame.indexOf(secAHeader))
    expect(headerIdsInDomOrder()).toEqual([PINNED_SECTION_ID, 'secA', DEFAULT_SECTION_ID])
    expect(newBlock.getAttribute('data-dcu-section-relocating')).toBe('true')

    // 3. insertBefore RPC 确认并返回最终顺序 ['p1', 'new-1', 'a1', 'd1']
    resolveInsert()
    await waitForSync(8)

    expect(newBlock.hasAttribute('data-dcu-section-relocating')).toBe(false)
    expect(window.getComputedStyle(newBlock).display).not.toBe('none')
    expect(headerIdsInDomOrder()).toEqual([PINNED_SECTION_ID, 'secA', DEFAULT_SECTION_ID])
    expect(blockIdsInDomOrder()).toEqual(['p1', 'new-1', 'a1', 'd1'])
    const finalChildren = Array.from(list.children)
    expect(finalChildren.indexOf(secAHeader)).toBeLessThan(finalChildren.indexOf(newBlock))
  })

  it('空闲态工作区展开触发宿主 AnimatedRows 时，同步为位移中的分区标题启动同频 200ms 补间', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['p1'] },
        { id: 'secA', name: 'A分组', ids: ['a1'] },
        { id: 'secB', name: 'B分组', ids: ['b1'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['d1'] },
      ],
    })
    mountFixture(['p1', 'a1', 'b1', 'd1'])
    mount(['p1', 'a1', 'b1', 'd1'])
    await waitForSync()

    const list = document.querySelector<HTMLElement>('.list')!
    const pinnedHeader = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === PINNED_SECTION_ID)!
    const secAHeader = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === 'secA')!
    const secBHeader = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === 'secB')!
    const defaultHeader = headers().find(h => h.getAttribute(SECTION_HEADER_ATTR) === DEFAULT_SECTION_ID)!

    // 初始记录各标题 offsetTop，随后模拟 a1 展开新会话使 B分组、项目 下移 34px
    const tops = new Map<HTMLElement, number>([
      [pinnedHeader, 265],
      [secAHeader, 339],
      [secBHeader, 413],
      [defaultHeader, 487],
    ])
    for (const h of [pinnedHeader, secAHeader, secBHeader, defaultHeader]) {
      Object.defineProperty(h, 'offsetParent', { configurable: true, get: () => list })
      Object.defineProperty(h, 'offsetTop', { configurable: true, get: () => tops.get(h) ?? 0 })
    }

    const origAnimate = HTMLElement.prototype.animate
    const animatedTargets: Array<{ el: HTMLElement; keyframes: Keyframe[]; options: KeyframeAnimationOptions }> = []
    HTMLElement.prototype.animate = function (this: HTMLElement, keyframes: Keyframe[], options?: KeyframeAnimationOptions) {
      animatedTargets.push({ el: this, keyframes, options: options ?? {} })
      return { finished: Promise.resolve(), cancel: vi.fn(), playState: 'finished', effect: null } as unknown as Animation
    } as typeof HTMLElement.prototype.animate

    try {
      // 触发一次同步以记录基线 offsetTop
      const probe = document.createElement('div')
      list.querySelector('[data-dcu-test-group="a1"]')!.appendChild(probe)
      await waitForSync(4)

      // 模拟宿主 AnimatedRows 在 b1 上启动位移补间，同时下方两分组 offsetTop 增加 34px
      const b1Row = list.querySelector<HTMLElement>('[data-row-key="workspace:b1"]')!
      ;(b1Row as unknown as { getAnimations: () => unknown[] }).getAnimations = () => [
        {
          effect: { getKeyframes: () => [{ transform: 'translate(0px, -34px)' }, { transform: 'translate(0, 0)' }] },
          cancel: vi.fn(),
        },
      ]
      tops.set(secBHeader, 447)
      tops.set(defaultHeader, 521)
      const sessionNode = document.createElement('div')
      sessionNode.setAttribute('data-row-key', 'session:s1')
      list.querySelector('[data-dcu-test-group="a1"]')!.appendChild(sessionNode)
      await waitForSync(4)

      expect(animatedTargets.some(item => item.el === pinnedHeader)).toBe(false)
      expect(animatedTargets.some(item => item.el === secAHeader)).toBe(false)
      const secBAnim = animatedTargets.find(item => item.el === secBHeader)
      const defaultAnim = animatedTargets.find(item => item.el === defaultHeader)
      expect(secBAnim?.keyframes).toEqual([{ transform: 'translateY(-34px)' }, { transform: 'translateY(0)' }])
      expect(defaultAnim?.keyframes).toEqual([{ transform: 'translateY(-34px)' }, { transform: 'translateY(0)' }])
      expect(secBAnim?.options).toEqual({ duration: 200, easing: 'ease-out' })
    } finally {
      HTMLElement.prototype.animate = origAnimate
    }
  })

  it('新工作区归位 RPC 失败时立即清理暂隐标记，绝不使新增工作区长期隐藏', async () => {
    seedSections({
      sections: [
        { id: PINNED_SECTION_ID, name: '置顶', ids: ['p1'] },
        { id: DEFAULT_SECTION_ID, name: '项目', ids: ['d1'] },
      ],
    })
    mountFixture(['p1', 'd1'])
    const fake = mount(['p1', 'd1'])
    await waitForSync()

    fake.service.insertBefore.mockRejectedValueOnce(new Error('rpc failed'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const list = document.querySelector<HTMLElement>('.list')!
      const newBlock = list.querySelector<HTMLElement>('[data-dcu-test-group="d1"]')!.cloneNode(true) as HTMLElement
      newBlock.setAttribute('data-dcu-test-group', 'new-fail')
      newBlock.querySelector('[data-row-key]')!.setAttribute('data-row-key', 'workspace:new-fail')
      newBlock.querySelector('button[aria-label="d1 操作"]')!.setAttribute('aria-label', 'new-fail 操作')
      list.prepend(newBlock)
      fake.state.order = ['new-fail', 'p1', 'd1']
      fake.notify()
      await waitForSync(8)

      expect(newBlock.hasAttribute('data-dcu-section-relocating')).toBe(false)
      expect(window.getComputedStyle(newBlock).display).not.toBe('none')
    } finally {
      warnSpy.mockRestore()
    }
  })

})

})
