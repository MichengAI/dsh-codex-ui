import type { Context as ClientContext } from '@deepseek-ai/cordis'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { ChevronDown, MoreHorizontal, MessageSquarePlus, Blocks, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FC, type DragEvent as ReactDragEvent } from 'react'
import { NS } from '../locales.ts'
import {
  FIXED_PANEL_IDS,
  moveEntry,
  normalizeLayout,
  parseLayout,
  serializeLayout,
  SIDEBAR_LAYOUT_KEY,
  type SidebarLayout,
} from './layout.ts'

const IconBrowse = ((primitives as Record<string, unknown>).IconPluginPinwheelOutlineRegular as FC<{ size?: number }>) ?? Blocks
const IconCreate = ((primitives as Record<string, unknown>).IconPlusOutlineRegular as FC<{ size?: number }>) ?? Plus
const IconNewChat =
  ((primitives as Record<string, unknown>).IconNewChatOutlineMedium as FC<{ size?: number }>) ??
  ((primitives as Record<string, unknown>).IconNewChatOutlineRegular as FC<{ size?: number }>) ??
  MessageSquarePlus

const Tooltip = (primitives as Record<string, unknown>).Tooltip as
  | FC<{
      label: string
      shortcutKeys?: string[]
      side?: 'right' | 'top' | 'bottom' | 'left'
      delayMs?: number
      disabled?: boolean
      children: React.ReactElement
    }>
  | undefined

const ShortcutKeys = (primitives as Record<string, unknown>).ShortcutKeys as
  | FC<{
      keys: string[]
      variant?: 'plain' | 'solid'
    }>
  | undefined

function getNewSessionShortcut(): { aria?: string; keys?: string[] } {
  if (typeof document === 'undefined') return {}
  const btn = document.querySelector('button[class*="newSession"]')
  const aria = btn?.getAttribute('aria-keyshortcuts') || undefined
  if (!aria) {
    const isMac =
      typeof navigator !== 'undefined' &&
      /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent)
    return isMac
      ? { aria: '⌥⌘N', keys: ['⌥', '⌘', 'N'] }
      : { aria: 'Ctrl+Alt+N', keys: ['Ctrl', 'Alt', 'N'] }
  }
  const keys = aria
    .split('+')
    .map(k => {
      const lower = k.trim().toLowerCase()
      if (lower === 'control') return 'Ctrl'
      if (lower === 'alt') return 'Alt'
      if (lower === 'shift') return 'Shift'
      if (lower === 'meta' || lower === 'command') return '⌘'
      return k.trim()
    })
  return { aria, keys }
}

function resolveSlotLabel(label: unknown): string | undefined {
  if (typeof label === 'function') {
    try {
      const res = (label as () => unknown)()
      return typeof res === 'string' ? res : undefined
    } catch {
      return undefined
    }
  }
  return typeof label === 'string' ? label : undefined
}

export interface PanelItem {
  id: string
  label: string
  order: number
  component?: FC<{ size?: number; active?: boolean }>
}

const PanelIcon: FC<{
  component?: PanelItem['component']
  active: boolean
}> = ({ component: Component, active }) => {
  if (!Component) return <div />
  return <Component size={16} active={active} />
}

export interface SidebarNavProps {
  ctx: ClientContext
  onLayoutChange?: (layout: SidebarLayout) => void
  initialLayout?: SidebarLayout
}

interface DragOverState {
  zone: 'pinned' | 'more'
  target: string
}

/** 跨平台拖拽预览镜像，对齐 CodexUI 会话树与 DSH 原生风格。 */
function setDragPreview(dataTransfer: DataTransfer, title: string): void {
  try {
    const preview = document.createElement('div')
    preview.className = 'dcu-sb-drag-ghost'
    preview.textContent = title
    document.body.appendChild(preview)
    void preview.offsetWidth
    dataTransfer.setDragImage(preview, 16, 16)
    window.requestAnimationFrame(() => {
      preview.remove()
    })
  } catch {
    // 某些环境不支持 setDragImage 时优雅降级
  }
}

/**
 * 全局原生拖拽守卫（借鉴 DSH workspace 原语）：
 * 挂载期间持续监听，在自身拖拽进行期间防止 Electron 桌面端窗口层叠边界取消拖拽。
 */
function useNativeDragAcceptance(isDraggingGetter: () => boolean) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const acceptDrag = (e: globalThis.DragEvent) => {
      if (!isDraggingGetter()) return
      e.preventDefault()
      if (e.dataTransfer !== null) {
        e.dataTransfer.dropEffect = 'move'
      }
    }
    const acceptDrop = (e: globalThis.DragEvent) => {
      if (!isDraggingGetter()) return
      e.preventDefault()
    }
    document.addEventListener('dragover', acceptDrag)
    document.addEventListener('drop', acceptDrop)
    return () => {
      document.removeEventListener('dragover', acceptDrag)
      document.removeEventListener('drop', acceptDrop)
    }
  }, [isDraggingGetter])
}

/**
 * 独立的 React 侧栏导航组件：
 * - 接管新会话行、固定常驻区（如 plugins）、用户常驻区与折叠“更多”区；
 * - 原位折叠动画与键盘无障碍管理；
 * - 采用指针手势（Pointer Drag）驱动双向排序与跨区移动，全面规避 Electron HTML5 OS 拖拽拦截；
 * - 鼠标移上去呈现优雅的圆角胶囊形态。
 */
export const SidebarNav: FC<SidebarNavProps> = ({ ctx, onLayoutChange, initialLayout }) => {
  const t = useMemo(() => {
    return (key: string, fallback?: string): string => {
      try {
        const fn = ctx.locale?.bind?.(NS)
        const translated = fn?.(key as never)
        return translated && translated !== key ? translated : (fallback ?? key)
      } catch {
        return fallback ?? key
      }
    }
  }, [ctx])

  // 1. 读取并订阅可用面板
  const [panels, setPanels] = useState<PanelItem[]>(() => {
    try {
      const entries = ctx.slots?.entriesOfSlot?.('sidebar.panellist') ?? []
      return entries
        .filter(entry => typeof entry.options.id === 'string')
        .map(entry => ({
          id: entry.options.id!,
          order: entry.options.order ?? 0,
          label: resolveSlotLabel(entry.options.label) ?? entry.options.id!,
          component: entry.component as PanelItem['component'],
        }))
    } catch {
      return []
    }
  })

  const syncPanels = useCallback(() => {
    try {
      const entries = ctx.slots?.entriesOfSlot?.('sidebar.panellist') ?? []
      const next = entries
        .filter(entry => typeof entry.options.id === 'string')
        .map(entry => ({
          id: entry.options.id!,
          order: entry.options.order ?? 0,
          label: resolveSlotLabel(entry.options.label) ?? entry.options.id!,
          component: entry.component as PanelItem['component'],
        }))
      setPanels(next)
    } catch {
      // 订阅排空或错误保护
    }
  }, [ctx])

  useEffect(() => {
    const unsubSlots = ctx.slots?.subscribe?.('sidebar.panellist', syncPanels)
    const unsubLocale = ctx.locale?.subscribe?.(syncPanels)
    return () => {
      unsubSlots?.()
      unsubLocale?.()
    }
  }, [ctx, syncPanels])

  // 2. 布局模型状态管理
  const availableIds = useMemo(() => panels.map(p => p.id), [panels])

  const [layout, setLayout] = useState<SidebarLayout>(() => {
    if (initialLayout) return normalizeLayout(initialLayout, availableIds)
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SIDEBAR_LAYOUT_KEY) : null
      return normalizeLayout(parseLayout(stored), availableIds)
    } catch {
      return normalizeLayout(undefined, availableIds)
    }
  })

  const layoutRef = useRef(layout)
  layoutRef.current = layout

  // 当可用面板增删时，对齐布局
  useEffect(() => {
    setLayout(prev => {
      const next = normalizeLayout(prev, availableIds)
      if (
        next.pinned.length === prev.pinned.length &&
        next.more.length === prev.more.length &&
        next.pinned.every((id, i) => id === prev.pinned[i]) &&
        next.more.every((id, i) => id === prev.more[i])
      ) {
        return prev
      }
      return next
    })
  }, [availableIds])

  const persistLayout = useCallback(
    (nextLayout: SidebarLayout) => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SIDEBAR_LAYOUT_KEY, serializeLayout(nextLayout))
        }
      } catch {
        // localStorage 满或受限
      }
      onLayoutChange?.(nextLayout)
    },
    [onLayoutChange],
  )

  // 3. 当前高亮面板
  const [activePanelId, setActivePanelId] = useState<string | null>(() => {
    try {
      const layoutApi = (ctx.get?.('layout') ?? (ctx as unknown as { layout?: unknown })?.layout) as {
        panelInfo?: { getSnapshot?: () => { activePanelId: string | null } }
      }
      return layoutApi?.panelInfo?.getSnapshot?.()?.activePanelId ?? null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      const layoutApi = (ctx.get?.('layout') ?? (ctx as unknown as { layout?: unknown })?.layout) as {
        panelInfo?: {
          getSnapshot?: () => { activePanelId: string | null }
          subscribe?: (fn: () => void) => () => void
        }
      }
      if (!layoutApi?.panelInfo?.subscribe) return
      return layoutApi.panelInfo.subscribe(() => {
        const next = layoutApi.panelInfo?.getSnapshot?.()?.activePanelId ?? null
        setActivePanelId(next)
      })
    } catch {
      return () => {}
    }
  }, [ctx])

  // 4. 更多手风琴状态
  const [moreOpen, setMoreOpen] = useState(false)

  // 5. 新建会话 Pending 锁
  const [startingSession, setStartingSession] = useState(false)

  const handleStartSession = useCallback(async () => {
    if (startingSession) return
    setStartingSession(true)
    try {
      const uiWorkspace = (ctx.get?.('uiWorkspace') ?? (ctx as unknown as { uiWorkspace?: unknown })?.uiWorkspace) as {
        startSession?: () => Promise<void> | void
      }
      if (typeof uiWorkspace?.startSession === 'function') {
        await Promise.resolve(uiWorkspace.startSession())
      } else {
        // 回退触发原生隐藏按钮
        const nativeNewSession = document.querySelector('button[class*="newSession"]') as HTMLButtonElement | null
        nativeNewSession?.click()
      }
    } catch (err) {
      console.warn('startSession failed:', err)
    } finally {
      setStartingSession(false)
    }
  }, [ctx, startingSession])

  const handleSelectPanel = useCallback(
    (id: string) => {
      setActivePanelId(id)
      try {
        const layoutApi = (ctx.get?.('layout') ?? (ctx as unknown as { layout?: unknown })?.layout) as {
          selectPanel?: (panelId: string) => void
        }
        if (typeof layoutApi?.selectPanel === 'function') {
          layoutApi.selectPanel(id)
        } else {
          // 回退触发对应原生 row
          const nativeRow = document.querySelector(
            `button[class*="panelRow"][data-dcu-panel-id="${id}"]`,
          ) as HTMLButtonElement | null
          nativeRow?.click()
        }
      } catch (err) {
        console.warn(`selectPanel('${id}') failed:`, err)
      }
    },
    [ctx],
  )

  const handleBrowsePlugins = useCallback(() => {
    try {
      const pluginNav = ctx.get?.('pluginNavigation') as { openList?: () => void } | undefined
      if (typeof pluginNav?.openList === 'function') {
        pluginNav.openList()
        return
      }
    } catch {
      // 容错
    }
    handleSelectPanel('plugins')
  }, [ctx, handleSelectPanel])

  const handleCreatePlugin = useCallback(() => {
    try {
      const uiWorkspace = ctx.get?.('uiWorkspace') as {
        startSession?: (id?: string, options?: unknown) => void
      } | undefined
      if (typeof uiWorkspace?.startSession === 'function') {
        uiWorkspace.startSession(undefined, {
          agentPreset: 'cordis',
          prompt: t('sidebar.createPrompt', '创建一个带左侧栏入口的 DSH 插件。'),
          whenDraftExists: 'append',
        })
        return
      }
    } catch {
      // 容错
    }
    handleStartSession()
  }, [ctx, handleStartSession, t])

  // 6. 拖拽交互状态
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<DragOverState | null>(null)
  const dragOverRef = useRef<DragOverState | null>(null)

  const updateDragOver = useCallback((next: DragOverState | null) => {
    dragOverRef.current = next
    setDragOver(prev => {
      if (prev?.zone === next?.zone && prev?.target === next?.target) return prev
      return next
    })
  }, [])

  const isDraggingRef = useRef<string | null>(null)

  // 启用全局原生拖拽守卫（借鉴 DSH 原生侧栏会话拖拽方案，同步检测当前是否在拖拽中）
  useNativeDragAcceptance(useCallback(() => Boolean(isDraggingRef.current), []))

  const commitDrop = useCallback(
    (
      draggedId: string | null | undefined,
      zone: 'pinned' | 'more',
      target: string,
    ) => {
      if (!draggedId || FIXED_PANEL_IDS.includes(draggedId as never)) return
      const currentLayout = layoutRef.current

      // 1. 投放至“更多”触发器上 -> 收纳进更多分区末尾
      if (target === '__more_trigger__') {
        const next = moveEntry(currentLayout, {
          id: draggedId,
          zone: 'more',
          index: currentLayout.more.filter(id => id !== draggedId).length,
        })
        setLayout(next)
        persistLayout(next)
        setMoreOpen(true)
        return
      }

      // 2. 目标分区排除自身后的实际有效列表
      const targetList = (zone === 'pinned' ? currentLayout.pinned : currentLayout.more).filter(
        id => id !== draggedId,
      )

      // 3. 投放至末尾
      if (target === '__end__') {
        const next = moveEntry(currentLayout, {
          id: draggedId,
          zone,
          index: targetList.length,
        })
        setLayout(next)
        persistLayout(next)
        if (zone === 'more') setMoreOpen(true)
        return
      }

      // 4. 投放至某项之前 (target 为该项 id)
      if (target === draggedId) {
        return
      }

      const targetIdx = targetList.indexOf(target)
      const index = targetIdx !== -1 ? targetIdx : targetList.length
      const next = moveEntry(currentLayout, { id: draggedId, zone, index })
      setLayout(next)
      persistLayout(next)
      if (zone === 'more') setMoreOpen(true)
    },
    [persistLayout],
  )

  const handleDragStart = useCallback((e: ReactDragEvent<HTMLElement>, id: string, label: string) => {
    if (FIXED_PANEL_IDS.includes(id as never)) {
      e.preventDefault()
      return
    }
    e.stopPropagation()
    try {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
      e.dataTransfer.setData('application/x-dsh-panel-id', id)
      setDragPreview(e.dataTransfer, label)
    } catch {
      // 容错环境
    }
    setDraggingId(id)
    isDraggingRef.current = id
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    updateDragOver(null)
    isDraggingRef.current = null
  }, [updateDragOver])

  const handleDragOverRow = useCallback(
    (e: ReactDragEvent<HTMLElement>, targetId: string, zone: 'pinned' | 'more') => {
      const currentDragged = isDraggingRef.current ?? draggingId
      if (!currentDragged) return
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move'
      }

      const list = zone === 'pinned' ? layoutRef.current.pinned : layoutRef.current.more

      // 如果悬停在固定插件行 plugins 上，指示线稳固吸附在常驻区第 1 项顶部
      if (targetId === 'plugins') {
        const firstPanel = list[0]
        updateDragOver({ zone: 'pinned', target: firstPanel ?? '__end__' })
        return
      }

      const targetIdx = list.indexOf(targetId)
      if (targetIdx === -1) {
        updateDragOver({ zone, target: '__end__' })
        return
      }

      const rect = e.currentTarget.getBoundingClientRect()
      const isAfter = e.clientY >= rect.top + rect.height / 2

      if (isAfter) {
        const nextId = list[targetIdx + 1]
        updateDragOver({ zone, target: nextId ?? '__end__' })
      } else {
        updateDragOver({ zone, target: targetId })
      }
    },
    [draggingId, updateDragOver],
  )

  const handleDragLeaveRow = useCallback(
    (e: ReactDragEvent<HTMLElement>, targetId: string) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return
      if (dragOverRef.current?.target === targetId) {
        updateDragOver(null)
      }
    },
    [updateDragOver],
  )

  const handleDropRow = useCallback(
    (e: ReactDragEvent<HTMLElement>, targetId: string, zone: 'pinned' | 'more') => {
      e.preventDefault()
      e.stopPropagation()
      const id =
        e.dataTransfer?.getData('application/x-dsh-panel-id') ||
        e.dataTransfer?.getData('text/plain') ||
        isDraggingRef.current ||
        draggingId

      const target = dragOverRef.current?.target ?? targetId
      commitDrop(id, zone, target)
      handleDragEnd()
    },
    [commitDrop, draggingId, handleDragEnd],
  )

  const handleDragOverZone = useCallback(
    (e: ReactDragEvent<HTMLElement>, zone: 'pinned' | 'more') => {
      const currentDragged = isDraggingRef.current ?? draggingId
      if (!currentDragged) return
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move'
      }
      updateDragOver({ zone, target: '__end__' })
    },
    [draggingId, updateDragOver],
  )

  const handleDropZone = useCallback(
    (e: ReactDragEvent<HTMLElement>, zone: 'pinned' | 'more') => {
      e.preventDefault()
      e.stopPropagation()
      const id =
        e.dataTransfer?.getData('application/x-dsh-panel-id') ||
        e.dataTransfer?.getData('text/plain') ||
        isDraggingRef.current ||
        draggingId

      commitDrop(id, zone, '__end__')
      handleDragEnd()
    },
    [commitDrop, draggingId, handleDragEnd],
  )

  // 7. 渲染数据划分
  const panelMap = useMemo(() => new Map(panels.map(p => [p.id, p])), [panels])

  // 固定入口（始终置顶于常驻区首部）
  const fixedPanels = useMemo(
    () => FIXED_PANEL_IDS.map(id => panelMap.get(id)).filter((p): p is PanelItem => Boolean(p)),
    [panelMap],
  )

  // 用户常驻入口
  const userPinnedPanels = useMemo(
    () => layout.pinned.map(id => panelMap.get(id)).filter((p): p is PanelItem => Boolean(p)),
    [layout.pinned, panelMap],
  )

  // 更多内的入口
  const morePanels = useMemo(
    () => layout.more.map(id => panelMap.get(id)).filter((p): p is PanelItem => Boolean(p)),
    [layout.more, panelMap],
  )

  const newSessionShortcut = useMemo(() => getNewSessionShortcut(), [])

  const newSessionButton = (
    <button
      type="button"
      className="dcu-sb-row dcu-sb-new-session-row"
      aria-label={t('sidebar.newSession', '新会话')}
      aria-keyshortcuts={newSessionShortcut.aria}
      aria-disabled={startingSession}
      onClick={handleStartSession}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleStartSession()
        }
      }}
    >
      <span className="dcu-sb-glyph" aria-hidden="true">
        <IconNewChat size={16} />
      </span>
      <span className="dcu-sb-title">{t('sidebar.newSession', '新会话')}</span>
      {ShortcutKeys && newSessionShortcut.keys && newSessionShortcut.keys.length > 0 && (
        <span className="dcu-sb-shortcut" aria-hidden="true">
          <ShortcutKeys keys={newSessionShortcut.keys} />
        </span>
      )}
    </button>
  )

  return (
    <nav className="dcu-sb-root" data-dcu-sb-root="true">
      {/* 新会话普通行（支持作为置顶放置落点） */}
      <div
        className="dcu-sb-section dcu-sb-new-session-section"
        onDragOver={e => {
          const currentDragged = isDraggingRef.current ?? draggingId
          if (!currentDragged) return
          e.preventDefault()
          e.stopPropagation()
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
          const firstPanel = layoutRef.current.pinned[0]
          updateDragOver({ zone: 'pinned', target: firstPanel ?? '__end__' })
        }}
        onDrop={e => {
          e.preventDefault()
          e.stopPropagation()
          const id =
            e.dataTransfer?.getData('application/x-dsh-panel-id') ||
            e.dataTransfer?.getData('text/plain') ||
            isDraggingRef.current ||
            draggingId
          const firstPanel = layoutRef.current.pinned[0]
          commitDrop(id, 'pinned', firstPanel ?? '__end__')
          handleDragEnd()
        }}
      >
        {Tooltip ? (
          <Tooltip
            label={t('sidebar.newSession', '新会话')}
            shortcutKeys={newSessionShortcut.keys}
            delayMs={500}
            side="right"
          >
            {newSessionButton}
          </Tooltip>
        ) : (
          newSessionButton
        )}
      </div>

      {/* 常驻入口区 */}
      <div
        className="dcu-sb-section dcu-sb-pinned-section"
        data-zone="pinned"
        onDragOver={e => handleDragOverZone(e, 'pinned')}
        onDrop={e => handleDropZone(e, 'pinned')}
      >
        {/* 固定项（不可拖动，但支持作为放置落点） */}
        {fixedPanels.map(panel => {
          const active = activePanelId === panel.id
          const isPluginsOverAfter =
            dragOver?.zone === 'pinned' &&
            dragOver.target === '__end__' &&
            userPinnedPanels.length === 0
          return (
            <button
              type="button"
              key={panel.id}
              className={`dcu-sb-row ${active ? 'dcu-sb-row-active' : ''}`}
              aria-label={panel.label}
              title={t('sidebar.fixed', '始终常驻')}
              aria-current={active ? 'page' : undefined}
              data-dcu-panel-id={panel.id}
              data-drag-over={isPluginsOverAfter ? 'after' : undefined}
              draggable={false}
              onClick={() => handleSelectPanel(panel.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelectPanel(panel.id)
                }
              }}
              onDragOver={e => handleDragOverRow(e, panel.id, 'pinned')}
              onDragLeave={e => handleDragLeaveRow(e, panel.id)}
              onDrop={e => handleDropRow(e, panel.id, 'pinned')}
            >
              <span className="dcu-sb-glyph" aria-hidden="true">
                <PanelIcon component={panel.component} active={active} />
              </span>
              <span className="dcu-sb-title">{panel.label}</span>
            </button>
          )
        })}

        {/* 用户常驻项（支持原生拖拽） */}
        {userPinnedPanels.map((panel, index) => {
          const active = activePanelId === panel.id
          const isDragging = draggingId === panel.id
          const isOverBefore = dragOver?.zone === 'pinned' && dragOver.target === panel.id
          const isLast = index === userPinnedPanels.length - 1
          const isOverAfter = dragOver?.zone === 'pinned' && dragOver.target === '__end__' && isLast
          const overPos = isOverBefore ? 'before' : isOverAfter ? 'after' : undefined

          return (
            <button
              type="button"
              key={panel.id}
              className={`dcu-sb-row ${active ? 'dcu-sb-row-active' : ''}`}
              aria-label={panel.label}
              aria-current={active ? 'page' : undefined}
              data-dcu-panel-id={panel.id}
              data-dragging={isDragging ? 'true' : undefined}
              data-drag-over={overPos}
              draggable={true}
              onClick={() => handleSelectPanel(panel.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelectPanel(panel.id)
                }
              }}
              onDragStart={e => handleDragStart(e, panel.id, panel.label)}
              onDragEnd={handleDragEnd}
              onDragOver={e => handleDragOverRow(e, panel.id, 'pinned')}
              onDragLeave={e => handleDragLeaveRow(e, panel.id)}
              onDrop={e => handleDropRow(e, panel.id, 'pinned')}
            >
              <span className="dcu-sb-glyph" aria-hidden="true">
                <PanelIcon component={panel.component} active={active} />
              </span>
              <span className="dcu-sb-title">{panel.label}</span>
            </button>
          )
        })}
      </div>

      {/* 更多（原位折叠手风琴，恒定保留，无论收纳多少项都永不消失） */}
      <div className="dcu-sb-section dcu-sb-more-section">
        {/* 更多触发器：本身也是一个直接投放目标！ */}
        <button
          type="button"
          className={`dcu-sb-row dcu-sb-more-trigger ${dragOver?.target === '__more_trigger__' ? 'dcu-sb-row-active' : ''}`}
          aria-expanded={moreOpen}
          aria-label={t('sidebar.more', '更多')}
          data-drag-over={dragOver?.target === '__more_trigger__' ? 'onto' : undefined}
          onClick={() => setMoreOpen(prev => !prev)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setMoreOpen(prev => !prev)
            }
          }}
          onDragOver={e => {
            const currentDragged = isDraggingRef.current ?? draggingId
            if (!currentDragged) return
            // 若被拖拽项已在 more 内，鼠标向上拖出更多面板时不在此拦截
            if (layoutRef.current.more.includes(currentDragged)) return

            e.preventDefault()
            e.stopPropagation()
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
            updateDragOver({ zone: 'more', target: '__more_trigger__' })
          }}
          onDragLeave={() => {
            if (dragOverRef.current?.target === '__more_trigger__') {
              updateDragOver(null)
            }
          }}
          onDrop={e => {
            const currentDragged = isDraggingRef.current ?? draggingId
            if (currentDragged && layoutRef.current.more.includes(currentDragged)) return

            e.preventDefault()
            e.stopPropagation()
            const id =
              e.dataTransfer?.getData('application/x-dsh-panel-id') ||
              e.dataTransfer?.getData('text/plain') ||
              isDraggingRef.current ||
              draggingId
            commitDrop(id, 'more', '__more_trigger__')
            handleDragEnd()
          }}
        >
          <span className="dcu-sb-glyph" aria-hidden="true">
            <MoreHorizontal size={16} />
          </span>
          <span className="dcu-sb-title">
            {t('sidebar.more', '更多')}
            {morePanels.length > 0 ? ` (${morePanels.length})` : ''}
          </span>
          <span className={`dcu-sb-chevron ${moreOpen ? 'dcu-sb-chevron-open' : ''}`} aria-hidden="true">
            <ChevronDown size={14} />
          </span>
        </button>

        {/* 手风琴展开列表 */}
        <div
          className={`dcu-sb-accordion ${moreOpen ? 'dcu-sb-accordion-open' : ''}`}
          data-zone="more"
          aria-hidden={!moreOpen}
          onDragOver={e => handleDragOverZone(e, 'more')}
          onDrop={e => handleDropZone(e, 'more')}
        >
          <div className="dcu-sb-accordion-content">
            {morePanels.map((panel, index) => {
              const active = activePanelId === panel.id
              const isDragging = draggingId === panel.id
              const isOverBefore = dragOver?.zone === 'more' && dragOver.target === panel.id
              const isLast = index === morePanels.length - 1
              const isOverAfter = dragOver?.zone === 'more' && dragOver.target === '__end__' && isLast
              const overPos = isOverBefore ? 'before' : isOverAfter ? 'after' : undefined

              return (
                <button
                  type="button"
                  key={panel.id}
                  tabIndex={moreOpen ? undefined : -1}
                  className={`dcu-sb-row ${active ? 'dcu-sb-row-active' : ''}`}
                  aria-label={panel.label}
                  aria-current={active ? 'page' : undefined}
                  data-dcu-panel-id={panel.id}
                  data-dragging={isDragging ? 'true' : undefined}
                  data-drag-over={overPos}
                  draggable={true}
                  onClick={() => handleSelectPanel(panel.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectPanel(panel.id)
                    }
                  }}
                  onDragStart={e => handleDragStart(e, panel.id, panel.label)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => handleDragOverRow(e, panel.id, 'more')}
                  onDragLeave={e => handleDragLeaveRow(e, panel.id)}
                  onDrop={e => handleDropRow(e, panel.id, 'more')}
                >
                  <span className="dcu-sb-glyph" aria-hidden="true">
                    <PanelIcon component={panel.component} active={active} />
                  </span>
                  <span className="dcu-sb-title">{panel.label}</span>
                </button>
              )
            })}

            {/* 当更多为空时，显示收纳引导与投放槽 */}
            {morePanels.length === 0 && (
              <div
                className="dcu-sb-empty-drop-hint"
                data-drag-over={dragOver?.zone === 'more' ? 'after' : undefined}
                onDragOver={e => handleDragOverZone(e, 'more')}
                onDrop={e => handleDropZone(e, 'more')}
              >
                {t('sidebar.dragToMore', '拖至此处收入更多')}
              </div>
            )}

            {/* 官方常驻底部操作菜单 */}
            <div className="dcu-sb-divider" />

            {/* 浏览更多插件 */}
            <button
              type="button"
              tabIndex={moreOpen ? undefined : -1}
              className="dcu-sb-row dcu-sb-footer-row"
              aria-label={t('sidebar.browsePlugins', '浏览更多插件')}
              draggable={false}
              onClick={handleBrowsePlugins}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleBrowsePlugins()
                }
              }}
            >
              <span className="dcu-sb-glyph" aria-hidden="true">
                <IconBrowse size={16} />
              </span>
              <span className="dcu-sb-title">{t('sidebar.browsePlugins', '浏览更多插件')}</span>
            </button>

            {/* 创建你的插件 */}
            <button
              type="button"
              tabIndex={moreOpen ? undefined : -1}
              className="dcu-sb-row dcu-sb-footer-row"
              aria-label={t('sidebar.createPlugin', '创建你的插件')}
              draggable={false}
              onClick={handleCreatePlugin}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCreatePlugin()
                }
              }}
            >
              <span className="dcu-sb-glyph" aria-hidden="true">
                <IconCreate size={16} />
              </span>
              <span className="dcu-sb-title">{t('sidebar.createPlugin', '创建你的插件')}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
