import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MENU_ITEM_ATTR,
  SECTION_HEADER_ATTR,
  collectProjectBlocks,
  findWorkspaceList,
  observeWorkspaceSections,
} from '../src/client/sidebar/sections/index.ts'
import { DEFAULT_SECTION_ID, PINNED_SECTION_ID } from '../src/client/sidebar/sections/model.ts'
import { flushSectionsSave, setSectionsTransport } from '../src/client/sidebar/sections/store.ts'

/** 宿主列表夹具：`.list > .groupSection > [data-row-key]`，与 rc.3 的实际结构一致。 */
function mountFixture(ids: readonly string[]): HTMLElement {
  const list = document.createElement('div')
  list.className = 'list'
  list.setAttribute('role', 'tree')
  for (const id of ids) {
    // 与宿主 0.2.1-rc.3 一致：list > groupSection > span > 项目行。
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
  const service = {
    list: {
      getSnapshot: () => ({ items: state.order.map(workspaceId => ({ workspaceId })) }),
      subscribe: vi.fn(() => () => {}),
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
  return { service, state }
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

  const mount = (ids: string[], ctxExtra: Record<string, unknown> = {}) => {
    const fake = fakeWorkspaces(ids)
    const ctx = {
      get: (name: string) => (name === 'workspaces' ? fake.service : undefined),
      ...ctxExtra,
    }
    dispose = observeWorkspaceSections(ctx as never)
    return fake
  }

  it('首次同步把未归类的工作区全部落进兜底分区，并渲染两个内置标题', async () => {
    mountFixture(['a', 'b'])
    mount(['a', 'b'])
    await waitForSync()
    expect(headerIdsInDomOrder()).toEqual([PINNED_SECTION_ID, DEFAULT_SECTION_ID])
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
          { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
          { id: 's1', name: '客户项目', ids: ['b'] },
          { id: DEFAULT_SECTION_ID, name: '项目', ids: ['a'] },
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
    mount(['a', 'b', 'c'])
    await waitForSync()

    // 模拟列表平铺顺序变化：c 移动到最前
    const list = document.querySelector<HTMLElement>('.list')!
    const groups = new Map<string, HTMLElement>()
    for (const row of Array.from(document.querySelectorAll<HTMLElement>('[data-row-key^="workspace:"]'))) {
      groups.set((row.getAttribute('data-row-key') ?? '').slice('workspace:'.length), row.parentElement as HTMLElement)
    }
    for (const id of ['c', 'a', 'b']) list.appendChild(groups.get(id)!)
    await waitForSync(10)

    // a 依然属于置顶，b 和 c 依然属于项目（c 的位置在 b 之前），绝对不把 c 错误篡改归入置顶！
    const pinned = hostSection(PINNED_SECTION_ID)
    const fallback = hostSection(DEFAULT_SECTION_ID)
    expect(pinned.ids).toEqual(['a'])
    expect(fallback.ids).toEqual(['c', 'b'])
  })

  it('卸载后标题、菜单与存储写入全部撤销', async () => {
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
    expect(headers.map(node => node.getAttribute(SECTION_HEADER_ATTR))).toEqual([
      PINNED_SECTION_ID,
      's1',
      DEFAULT_SECTION_ID,
    ])
    const blockOf = (id: string): Element => {
      const group = list.querySelector(`[data-dcu-test-group="${id}"]`)
      expect(group).not.toBeNull()
      return group as Element
    }
    // 标题必须排在它的分组块之前（文档序），这是「贴住分区」的判据。
    const precedes = (header: Element, block: Element): boolean =>
      (header.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    expect(precedes(headers[1]!, blockOf('b'))).toBe(true)
    expect(precedes(headers[2]!, blockOf('a'))).toBe(true)
    expect(precedes(headers[0]!, blockOf('b'))).toBe(true)
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
    mountFixture(['a'])
    mount(['a'])
    await waitForSync()
    for (const id of [PINNED_SECTION_ID, DEFAULT_SECTION_ID]) {
      const header = headers().find(item => item.getAttribute(SECTION_HEADER_ATTR) === id)!
      expect(header.draggable).toBe(false)
      const button = header.querySelector<HTMLElement>('.dcu-ws-section-actions button')
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
    const button = custom.querySelector<HTMLElement>('.dcu-ws-section-actions button')!
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
    // 标题顺序仍按分区顺序。
    expect(headerIdsInDomOrder()).toEqual([PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID])
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
    const actionsBtn = s1Header.querySelector<HTMLElement>('.dcu-ws-section-actions button')!
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
})