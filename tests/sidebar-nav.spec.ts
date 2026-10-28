import React, { act, createElement, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarNav } from '../src/client/sidebar/SidebarNav.tsx'
import { observeSidebarNav, checkSidebarEnabled } from '../src/client/sidebar/index.ts'
import { SIDEBAR_ACTIVE_ATTR } from '../src/client/sidebar/styles.ts'
import { SIDEBAR_LAYOUT_KEY, type SidebarLayout } from '../src/client/sidebar/layout.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('SidebarNav 组件与交互测试', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    localStorage.clear()
  })

  afterEach(() => {
    container.remove()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  const createMockCtx = (overrides?: Record<string, unknown>) => {
    const panels = [
      { options: { id: 'plugins', label: '插件管理', order: 10 }, component: () => createElement('span', null, 'IconPlugins') },
      { options: { id: 'skills', label: '技能管理', order: 20 }, component: () => createElement('span', null, 'IconSkills') },
      { options: { id: 'im', label: 'IM助理', order: 30 }, component: () => createElement('span', null, 'IconIM') },
    ]
    const selectPanel = vi.fn()
    const startSession = vi.fn()

    const ctx = {
      slots: {
        entriesOfSlot: vi.fn((slot: string) => (slot === 'sidebar.panellist' ? panels : [])),
        subscribe: vi.fn(() => vi.fn()),
      },
      locale: {
        bind: vi.fn(() => (key: string) => key),
        subscribe: vi.fn(() => vi.fn()),
      },
      layout: {
        selectPanel,
        panelInfo: {
          getSnapshot: vi.fn(() => ({ activePanelId: 'plugins' })),
          subscribe: vi.fn(() => vi.fn()),
        },
      },
      uiWorkspace: {
        startSession,
      },
      get: vi.fn((name: string) => {
        if (name === 'layout') return ctx.layout
        if (name === 'uiWorkspace') return ctx.uiWorkspace
        return undefined
      }),
      ...overrides,
    }
    return { ctx, selectPanel, startSession }
  }

  it('渲染新会话按钮、固定插件项与收入更多的项', async () => {
    const { ctx } = createMockCtx()
    const root = createRoot(container)

    await act(async () => {
      root.render(createElement(SidebarNav, { ctx: ctx as never }))
    })

    // 新会话按钮
    const newSessionBtn = container.querySelector('.dcu-sb-new-session-row')
    expect(newSessionBtn).not.toBeNull()
    expect(newSessionBtn?.getAttribute('aria-label')).toBe('新会话')

    // 固定项 plugins (处于常驻区，且 draggable 为 false)
    const pinnedSection = container.querySelector('[data-zone="pinned"]')
    expect(pinnedSection).not.toBeNull()
    const pluginsBtn = pinnedSection?.querySelector('[aria-label="插件管理"]') as HTMLElement
    expect(pluginsBtn).not.toBeNull()
    expect(pluginsBtn.draggable).toBe(false)

    // 更多区
    const moreTrigger = container.querySelector('.dcu-sb-more-trigger') as HTMLElement
    expect(moreTrigger).not.toBeNull()
    expect(moreTrigger.getAttribute('aria-expanded')).toBe('false')

    root.unmount()
  })

  it('点击更多可展开与收缩折叠面板', async () => {
    const { ctx } = createMockCtx()
    const root = createRoot(container)

    await act(async () => {
      root.render(createElement(SidebarNav, { ctx: ctx as never }))
    })

    const moreTrigger = container.querySelector('.dcu-sb-more-trigger') as HTMLElement
    const accordion = container.querySelector('.dcu-sb-accordion') as HTMLDivElement

    expect(accordion.classList.contains('dcu-sb-accordion-open')).toBe(false)
    expect(accordion.getAttribute('aria-hidden')).toBe('true')

    // 点击展开
    await act(async () => {
      moreTrigger.click()
    })

    expect(accordion.classList.contains('dcu-sb-accordion-open')).toBe(true)
    expect(accordion.getAttribute('aria-hidden')).toBe('false')

    // 展开后内部按钮可访问，且包含官方底部操作项
    const skillBtn = accordion.querySelector('[aria-label="技能管理"]') as HTMLElement
    expect(skillBtn).not.toBeNull()
    expect(skillBtn.tabIndex).toBe(0)

    const browseBtn = accordion.querySelector('[aria-label="浏览更多插件"]') as HTMLElement
    expect(browseBtn).not.toBeNull()
    const createBtn = accordion.querySelector('[aria-label="创建你的插件"]') as HTMLElement
    expect(createBtn).not.toBeNull()

    // 再次点击收起
    await act(async () => {
      moreTrigger.click()
    })

    expect(accordion.classList.contains('dcu-sb-accordion-open')).toBe(false)
    expect(accordion.getAttribute('aria-hidden')).toBe('true')

    root.unmount()
  })

  it('点击入口调用 layout.selectPanel，点击新会话调用 uiWorkspace.startSession', async () => {
    const { ctx, selectPanel, startSession } = createMockCtx()
    const root = createRoot(container)

    await act(async () => {
      root.render(createElement(SidebarNav, { ctx: ctx as never }))
    })

    // 点击新会话
    const newSessionBtn = container.querySelector('.dcu-sb-new-session-row') as HTMLElement
    await act(async () => {
      newSessionBtn.click()
    })
    expect(startSession).toHaveBeenCalledTimes(1)

    // 点击面板项
    const pluginsBtn = container.querySelector('[aria-label="插件管理"]') as HTMLElement
    await act(async () => {
      pluginsBtn.click()
    })
    expect(selectPanel).toHaveBeenCalledWith('plugins')

    root.unmount()
  })

  it('拖拽排序：从更多区拖动到常驻区并持久化', async () => {
    const { ctx } = createMockCtx()
    let savedLayout: SidebarLayout | undefined
    const onLayoutChange = vi.fn((layout: SidebarLayout) => {
      savedLayout = layout
    })

    const root = createRoot(container)
    await act(async () => {
      root.render(createElement(SidebarNav, {
        ctx: ctx as never,
        onLayoutChange,
        initialLayout: { pinned: [], more: ['skills', 'im'] },
      }))
    })

    // 展开更多
    const moreTrigger = container.querySelector('.dcu-sb-more-trigger') as HTMLElement
    await act(async () => {
      moreTrigger.click()
    })

    const skillBtn = container.querySelector('[aria-label="技能管理"]') as HTMLElement
    const pinnedZone = container.querySelector('[data-zone="pinned"]') as HTMLDivElement

    // 模拟从更多拖拽 skills 到常驻区 drop
    await act(async () => {
      const dragStartEvent = new Event('dragstart', { bubbles: true })
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: {
          setData: vi.fn(),
          getData: vi.fn((t: string) => (t === 'text/plain' ? 'skills' : '')),
          effectAllowed: 'move',
        },
      })
      skillBtn.dispatchEvent(dragStartEvent)

      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: vi.fn((t: string) => (t === 'text/plain' ? 'skills' : '')),
        },
      })
      pinnedZone.dispatchEvent(dropEvent)
    })

    expect(onLayoutChange).toHaveBeenCalled()
    expect(savedLayout?.pinned).toContain('skills')
    expect(savedLayout?.more).not.toContain('skills')
    expect(localStorage.getItem(SIDEBAR_LAYOUT_KEY)).toContain('skills')

    root.unmount()
  })

  it('全部从更多拖出来后，更多触发器仍然保留，支持拖回收纳', async () => {
    const { ctx } = createMockCtx()
    let savedLayout: SidebarLayout | undefined
    const onLayoutChange = vi.fn((layout: SidebarLayout) => {
      savedLayout = layout
    })

    const root = createRoot(container)
    await act(async () => {
      // 模拟所有项都已放入常驻区，更多为空
      root.render(createElement(SidebarNav, {
        ctx: ctx as never,
        onLayoutChange,
        initialLayout: { pinned: ['skills', 'im'], more: [] },
      }))
    })

    // 更多触发器依然存在，绝不消失
    const moreTrigger = container.querySelector('.dcu-sb-more-trigger') as HTMLElement
    expect(moreTrigger).not.toBeNull()

    // 展开更多，展示空收纳引导提示
    await act(async () => {
      moreTrigger.click()
    })
    const emptyHint = container.querySelector('.dcu-sb-empty-drop-hint')
    expect(emptyHint).not.toBeNull()
    expect(emptyHint?.textContent).toContain('拖至此处收入更多')

    // 模拟将常驻项 skills 拖回更多触发器
    const skillBtn = container.querySelector('[aria-label="技能管理"]') as HTMLElement
    await act(async () => {
      const dragStartEvent = new Event('dragstart', { bubbles: true })
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: {
          setData: vi.fn(),
          getData: vi.fn((t: string) => (t === 'text/plain' ? 'skills' : '')),
          effectAllowed: 'move',
        },
      })
      skillBtn.dispatchEvent(dragStartEvent)

      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: vi.fn((t: string) => (t === 'text/plain' ? 'skills' : '')),
        },
      })
      moreTrigger.dispatchEvent(dropEvent)
    })

    expect(onLayoutChange).toHaveBeenCalled()
    expect(savedLayout?.more).toContain('skills')
    expect(savedLayout?.pinned).not.toContain('skills')

    root.unmount()
  })

  it('同区域向下拖拽排序落点精确对齐，不发生错位', async () => {
    const { ctx } = createMockCtx({
      slots: {
        entriesOfSlot: vi.fn(() => [
          { options: { id: 'plugins', label: '插件管理' } },
          { options: { id: 'a', label: '面板A' } },
          { options: { id: 'b', label: '面板B' } },
          { options: { id: 'c', label: '面板C' } },
        ]),
        subscribe: vi.fn(() => vi.fn()),
      },
    })
    let savedLayout: SidebarLayout | undefined
    const onLayoutChange = vi.fn((layout: SidebarLayout) => {
      savedLayout = layout
    })

    const root = createRoot(container)
    await act(async () => {
      root.render(createElement(SidebarNav, {
        ctx: ctx as never,
        onLayoutChange,
        initialLayout: { pinned: ['a', 'b', 'c'], more: [] },
      }))
    })

    const rowA = container.querySelector('[data-dcu-panel-id="a"]') as HTMLElement
    const rowB = container.querySelector('[data-dcu-panel-id="b"]') as HTMLElement
    rowB.getBoundingClientRect = () => ({
      top: 100,
      bottom: 136,
      height: 36,
      left: 14,
      right: 266,
      width: 252,
      x: 14,
      y: 100,
      toJSON: () => ({}),
    })

    // 把 A 拖放到 B 后面 (向下拖拽)
    await act(async () => {
      const dragStartEvent = new Event('dragstart', { bubbles: true })
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: { setData: vi.fn(), getData: () => 'a', effectAllowed: 'move' },
      })
      rowA.dispatchEvent(dragStartEvent)

      // y = 125 > 100 + 18 -> position: 'after'
      const dragOverEvent = new Event('dragover', { bubbles: true })
      Object.defineProperty(dragOverEvent, 'clientY', { value: 125 })
      Object.defineProperty(dragOverEvent, 'dataTransfer', { value: { dropEffect: 'move' } })
      rowB.dispatchEvent(dragOverEvent)

      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', { value: { getData: () => 'a' } })
      rowB.dispatchEvent(dropEvent)
    })

    // A 移到 B 后，期望准确为 ['b', 'a', 'c']
    expect(savedLayout?.pinned).toEqual(['b', 'a', 'c'])

    root.unmount()
  })

  it('在相邻两项之间移动鼠标时，指示线位置绝对唯一且稳定，绝不出现双落点或上下跳动', async () => {
    const { ctx } = createMockCtx({
      slots: {
        entriesOfSlot: vi.fn(() => [
          { options: { id: 'plugins', label: '插件管理' } },
          { options: { id: 'a', label: '面板A' } },
          { options: { id: 'b', label: '面板B' } },
          { options: { id: 'c', label: '面板C' } },
        ]),
        subscribe: vi.fn(() => vi.fn()),
      },
    })

    const root = createRoot(container)
    await act(async () => {
      root.render(createElement(SidebarNav, {
        ctx: ctx as never,
        initialLayout: { pinned: ['a', 'b', 'c'], more: [] },
      }))
    })

    const rowA = container.querySelector('[data-dcu-panel-id="a"]') as HTMLElement
    const rowB = container.querySelector('[data-dcu-panel-id="b"]') as HTMLElement
    const rowC = container.querySelector('[data-dcu-panel-id="c"]') as HTMLElement

    rowB.getBoundingClientRect = () => ({
      top: 100,
      bottom: 136,
      height: 36,
      left: 14,
      right: 266,
      width: 252,
      x: 14,
      y: 100,
      toJSON: () => ({}),
    })
    rowC.getBoundingClientRect = () => ({
      top: 138,
      bottom: 174,
      height: 36,
      left: 14,
      right: 266,
      width: 252,
      x: 14,
      y: 138,
      toJSON: () => ({}),
    })

    // 起拖 A
    await act(async () => {
      const dragStartEvent = new Event('dragstart', { bubbles: true })
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: { setData: vi.fn(), getData: () => 'a', effectAllowed: 'move' },
      })
      rowA.dispatchEvent(dragStartEvent)
    })

    // 1. 鼠标位于 B 项下半区 (y = 125, aiming below B -> into C)
    await act(async () => {
      const dragOverEvent = new Event('dragover', { bubbles: true })
      Object.defineProperty(dragOverEvent, 'clientY', { value: 125 })
      Object.defineProperty(dragOverEvent, 'dataTransfer', { value: { dropEffect: 'move' } })
      rowB.dispatchEvent(dragOverEvent)
    })

    // 指示线应稳固地出现在 C 的顶部 (data-drag-over="before")，B 绝不能同时显示 after
    expect(rowB.getAttribute('data-drag-over')).toBeNull()
    expect(rowC.getAttribute('data-drag-over')).toBe('before')
    expect(container.querySelectorAll('[data-drag-over]')).toHaveLength(1)

    // 2. 鼠标微移至 C 项上半区 (y = 145, aiming above C -> still between B and C)
    await act(async () => {
      const dragOverEvent = new Event('dragover', { bubbles: true })
      Object.defineProperty(dragOverEvent, 'clientY', { value: 145 })
      Object.defineProperty(dragOverEvent, 'dataTransfer', { value: { dropEffect: 'move' } })
      rowC.dispatchEvent(dragOverEvent)
    })

    // 指示线位置完全相同（仍在 C 顶部），全区域仅有唯一落点，不产生跳动或双落点
    expect(rowB.getAttribute('data-drag-over')).toBeNull()
    expect(rowC.getAttribute('data-drag-over')).toBe('before')
    expect(container.querySelectorAll('[data-drag-over]')).toHaveLength(1)

    root.unmount()
  })

  it('拖拽首项向上至固定插件或其自身上半区时，指示线保持在最上方，绝不跳到下方', async () => {
    const { ctx } = createMockCtx({
      slots: {
        entriesOfSlot: vi.fn(() => [
          { options: { id: 'plugins', label: '插件管理' } },
          { options: { id: 'archive', label: '归档会话' } },
          { options: { id: 'expert', label: '专家' } },
          { options: { id: 'im', label: 'IM助理' } },
        ]),
        subscribe: vi.fn(() => vi.fn()),
      },
    })

    const root = createRoot(container)
    await act(async () => {
      root.render(createElement(SidebarNav, {
        ctx: ctx as never,
        initialLayout: { pinned: ['archive', 'expert', 'im'], more: [] },
      }))
    })

    const pluginsBtn = container.querySelector('[data-dcu-panel-id="plugins"]') as HTMLElement
    const archiveBtn = container.querySelector('[data-dcu-panel-id="archive"]') as HTMLElement
    const expertBtn = container.querySelector('[data-dcu-panel-id="expert"]') as HTMLElement

    archiveBtn.getBoundingClientRect = () => ({
      top: 100, bottom: 136, height: 36, left: 14, right: 266, width: 252, x: 14, y: 100, toJSON: () => ({}),
    })

    // 起拖首项 archive
    await act(async () => {
      const dragStartEvent = new Event('dragstart', { bubbles: true })
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: { setData: vi.fn(), getData: () => 'archive', effectAllowed: 'move' },
      })
      archiveBtn.dispatchEvent(dragStartEvent)
    })

    // 1. 悬停在固定插件行 plugins 上
    await act(async () => {
      const dragOverEvent = new Event('dragover', { bubbles: true })
      Object.defineProperty(dragOverEvent, 'dataTransfer', { value: { dropEffect: 'move' } })
      pluginsBtn.dispatchEvent(dragOverEvent)
    })

    // 指示线必须在 archive 顶部，绝不能跳到下方的 expert
    expect(archiveBtn.getAttribute('data-drag-over')).toBe('before')
    expect(expertBtn.getAttribute('data-drag-over')).toBeNull()

    // 2. 悬停在 archive 自身上半区 (y = 110)
    await act(async () => {
      const dragOverEvent = new Event('dragover', { bubbles: true })
      Object.defineProperty(dragOverEvent, 'clientY', { value: 110 })
      Object.defineProperty(dragOverEvent, 'dataTransfer', { value: { dropEffect: 'move' } })
      archiveBtn.dispatchEvent(dragOverEvent)
    })

    // 指示线仍必须在 archive 顶部
    expect(archiveBtn.getAttribute('data-drag-over')).toBe('before')
    expect(expertBtn.getAttribute('data-drag-over')).toBeNull()

    root.unmount()
  })

  it('支持 React.memo 图标及函数式图标正常渲染，隔离 Hooks 状态', async () => {
    const MemoIcon = React.memo(() => createElement('span', null, 'MemoIcon'))
    const HookIcon = () => {
      const [count] = useState(0)
      return createElement('span', null, `HookIcon:${count}`)
    }
    const { ctx } = createMockCtx({
      slots: {
        entriesOfSlot: vi.fn(() => [
          { options: { id: 'plugins', label: '插件管理' }, component: MemoIcon },
          { options: { id: 'skills', label: '技能管理' }, component: HookIcon },
        ]),
        subscribe: vi.fn(() => vi.fn()),
      },
    })
    const root = createRoot(container)
    await act(async () => {
      root.render(createElement(SidebarNav, { ctx: ctx as never }))
    })
    expect(container.textContent).toContain('MemoIcon')
    expect(container.textContent).toContain('HookIcon:0')
    root.unmount()
  })

  it('侧栏根容器为 nav 且所有菜单项均为 button[type="button"]，满足官方生态选择器契约', async () => {
    const { ctx } = createMockCtx({
      slots: {
        entriesOfSlot: vi.fn(() => [
          { options: { id: 'plugins', label: '插件管理' } },
          { options: { id: 'schedules', label: '自动化任务' } },
        ]),
        subscribe: vi.fn(() => vi.fn()),
      },
    })
    const root = createRoot(container)
    await act(async () => {
      root.render(createElement(SidebarNav, { ctx: ctx as never }))
    })

    // 根容器必须为语义化 nav
    const navRoot = container.querySelector('nav.dcu-sb-root')
    expect(navRoot).not.toBeNull()

    // 验证所有菜单行均为原生 button[type="button"]
    const rows = container.querySelectorAll('.dcu-sb-row')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.tagName).toBe('BUTTON')
      expect(row.getAttribute('type')).toBe('button')
    }

    // 验证满足生态插件形如 nav button[aria-label="..."] 的选择器契约
    const officialScheduleSelector = 'nav button[aria-label="自动化任务"]'
    const scheduleBtn = container.querySelector(officialScheduleSelector)
    expect(scheduleBtn).not.toBeNull()

    root.unmount()
  })

  it('新会话按钮支持提取快捷键并在展开时呈现快捷键提示', async () => {
    // 模拟原生存在带有 aria-keyshortcuts 的按钮
    const hostBtn = document.createElement('button')
    hostBtn.className = 'host_newSession'
    hostBtn.setAttribute('aria-keyshortcuts', 'Control+Alt+N')
    document.body.appendChild(hostBtn)

    const { ctx } = createMockCtx()
    const root = createRoot(container)
    await act(async () => {
      root.render(createElement(SidebarNav, { ctx: ctx as never }))
    })

    const newBtn = container.querySelector('.dcu-sb-new-session-row') as HTMLElement
    expect(newBtn).not.toBeNull()
    expect(newBtn.getAttribute('aria-keyshortcuts')).toBe('Control+Alt+N')

    hostBtn.remove()
    root.unmount()
  })
})

describe('observeSidebarNav 挂载与回退生命周期', () => {
  let sidebarRoot: HTMLDivElement
  let nativeNewSession: HTMLButtonElement
  let nativePanelList: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    sidebarRoot = document.createElement('div')
    sidebarRoot.className = 'host_root'

    nativeNewSession = document.createElement('button')
    nativeNewSession.className = 'host_newSession'
    nativeNewSession.textContent = '原生新会话'

    nativePanelList = document.createElement('nav')
    nativePanelList.className = 'host_panelList'
    nativePanelList.textContent = '原生面板'

    sidebarRoot.append(nativeNewSession, nativePanelList)
    document.body.appendChild(sidebarRoot)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('探活关闭或失败时保持原生侧栏不变', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const enabled = await checkSidebarEnabled()
    expect(enabled).toBe(false)

    const ctx = {
      slots: { entriesOfSlot: () => [], subscribe: () => vi.fn() },
      locale: { bind: () => (k: string) => k, subscribe: () => vi.fn() },
      effect: vi.fn(),
    }

    const dispose = observeSidebarNav(ctx as never)
    await act(async () => {
      await new Promise(r => setTimeout(r, 20))
    })

    // 不应挂载自定义容器
    expect(document.querySelector('.dcu-sidebar-nav-root')).toBeNull()
    expect(sidebarRoot.hasAttribute(SIDEBAR_ACTIVE_ATTR)).toBe(false)

    dispose()
  })

  it('探活成功时无损挂载并在卸载时完全复原原生侧栏', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response)

    const ctx = {
      slots: { entriesOfSlot: () => [], subscribe: () => vi.fn() },
      locale: { bind: () => (k: string) => k, subscribe: () => vi.fn() },
      effect: vi.fn(),
    }

    const dispose = observeSidebarNav(ctx as never)
    await act(async () => {
      await new Promise(r => setTimeout(r, 40))
    })

    // 应该挂载自定义容器并打上激活标记
    const managedContainer = document.querySelector('.dcu-sidebar-nav-root')
    expect(managedContainer).not.toBeNull()
    expect(sidebarRoot.getAttribute(SIDEBAR_ACTIVE_ATTR)).toBe('true')

    // 卸载
    await act(async () => {
      dispose()
    })

    // 容器移除，激活标记清空，原生侧栏完好
    expect(document.querySelector('.dcu-sidebar-nav-root')).toBeNull()
    expect(sidebarRoot.hasAttribute(SIDEBAR_ACTIVE_ATTR)).toBe(false)
    expect(document.contains(nativeNewSession)).toBe(true)
    expect(document.contains(nativePanelList)).toBe(true)
  })

  it('子插件运行时状态切换：开启后停用自动卸载并复原，重新启用自动挂载', async () => {
    let enabled = true
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      ok: true,
      json: async () => ({ enabled }),
    } as Response))

    const ctx = {
      slots: { entriesOfSlot: () => [], subscribe: () => vi.fn() },
      locale: { bind: () => (k: string) => k, subscribe: () => vi.fn() },
      effect: vi.fn(),
    }

    const dispose = observeSidebarNav(ctx as never)
    await act(async () => {
      await new Promise(r => setTimeout(r, 40))
    })
    expect(document.querySelector('.dcu-sidebar-nav-root')).not.toBeNull()

    // 模拟在设置中停用子插件并切回窗口聚焦
    enabled = false
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await new Promise(r => setTimeout(r, 40))
    })
    expect(document.querySelector('.dcu-sidebar-nav-root')).toBeNull()
    expect(sidebarRoot.hasAttribute(SIDEBAR_ACTIVE_ATTR)).toBe(false)

    // 重新启用并获焦
    enabled = true
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await new Promise(r => setTimeout(r, 40))
    })
    expect(document.querySelector('.dcu-sidebar-nav-root')).not.toBeNull()
    expect(sidebarRoot.getAttribute(SIDEBAR_ACTIVE_ATTR)).toBe('true')

    dispose()
  })

  it('宿主侧栏 DOM 被替换时，先释放旧 React 树再挂载新容器', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response)

    let subCount = 0
    const ctx = {
      slots: { entriesOfSlot: () => [], subscribe: () => { subCount++; return () => subCount-- } },
      locale: { bind: () => (k: string) => k, subscribe: () => vi.fn() },
      effect: vi.fn(),
    }

    const dispose = observeSidebarNav(ctx as never)
    await act(async () => {
      await new Promise(r => setTimeout(r, 40))
    })
    expect(subCount).toBe(1)

    // 宿主替换侧栏 DOM
    await act(async () => {
      sidebarRoot.remove()
      const newRoot = document.createElement('div')
      newRoot.className = 'host_root'
      const newBtn = document.createElement('button')
      newBtn.className = 'host_newSession'
      newRoot.appendChild(newBtn)
      document.body.appendChild(newRoot)
      await new Promise(r => setTimeout(r, 60))
    })

    // 旧树释放，新树挂载，订阅计数依然为 1，不出现翻倍泄漏
    expect(subCount).toBe(1)
    expect(document.querySelectorAll('.dcu-sidebar-nav-root')).toHaveLength(1)

    dispose()
  })
})
