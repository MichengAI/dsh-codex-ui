import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  IconFolderCloseRegular, IconPlusOutlineRegular, IconSearchOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
// 仅类型：拉取 conversation 的槽位 Owner 契约、workspace 的全局 useWorkspaces hooks
// 与 Workspace 快照类型。全部在编译期擦除，不增加客户端运行时依赖。
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { NS } from '../locales.ts'

/** 浮层最大宽度（对齐参考截图里的 Codex 项目选择器）。 */
const POPOVER_WIDTH = 266
/** 浮层的最大可能高度，用于打开时判断向下展开是否放得下。 */
const POPOVER_MAX_HEIGHT = 312
/** 右侧滚动条 thumb 的固定高度（参考截图里就是一小截短条，不随内容比例拉长）。 */
const SCROLL_THUMB_HEIGHT = 24
/** 宿主首次初始化的工作区自动标题；宿主会把它显示为本地化的「默认工作区」。 */
const DEFAULT_WORKSPACE_TITLE = 'default-workspace'

type Translate = PropsLocale<typeof NS>['t']

/** 项目选择器自身需要的能力：选目录 + 注册为工作区（由 apply 闭包注入）。 */
export interface WorkspacePickerInjected {
  /** 打开系统目录选择器；用户取消返回 null。 */
  pickDirectory: () => Promise<string | null>
  /** 把选中的目录注册为工作区。 */
  createWorkspace: (input: { path: string }) => Promise<{ workspaceId: WorkspaceId }>
}

/** 槽位 owner props + 本地化 + 注入能力。 */
export type CodexWorkspacePickerProps =
  PropsRuntime<'conversation.hero.workspace'>
  & PropsLocale<typeof NS>
  & WorkspacePickerInjected

type ProjectRow = {
  readonly kind: 'project'
  readonly id: WorkspaceId
  readonly label: string
  readonly path: string
}
type CreateRow = { readonly kind: 'create' }
type Row = ProjectRow | CreateRow

/** 目录路径的最后一段，作为没有标题时的兜底名称。 */
function pathBasename(path: string): string {
  const parts = path.split(/[\\/]/).filter(part => part !== '')
  return parts[parts.length - 1] ?? path
}

/** 与宿主 workspaceDisplayTitle 一致：自动标题显示本地化默认名，其余原样。 */
function projectName(workspace: WorkspaceView, defaultName: string): string {
  const title = workspace.title.trim()
  if (title === '') return pathBasename(workspace.path)
  return title === DEFAULT_WORKSPACE_TITLE ? defaultName : title
}

/**
 * Codex 风格项目选择器：搜索 + 项目列表 + 新建项目。
 *
 * 替换宿主 `conversation.hero.workspace` 的单槽默认实现（无搜索的 Menu），
 * 交互与视觉对齐参考截图；所有数据仍走宿主 Workspace Controller：
 * 选择项目调用 owner 的 `onPick`，新建项目先选目录再 `createWorkspace`。
 * @param props - 槽位 owner props、本地化函数与注入的目录/创建能力。
 * @returns 浮层（portal 到 document.body），关闭时为 null。
 */
export function CodexWorkspacePicker(props: CodexWorkspacePickerProps) {
  const {
    open, selectedId, anchorRef, onPick, onClose,
    useWorkspaces, t, pickDirectory, createWorkspace,
  } = props
  const snapshot = useWorkspaces(state => state)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 右侧滚动条（自定义 thumb：参考截图里它浮在列表右缘、浅灰圆角）。
  const [thumb, setThumb] = useState<{ visible: boolean; height: number; top: number }>({
    visible: false, height: 0, top: 0,
  })
  const [position, setPosition] = useState<CSSProperties>({
    position: 'fixed', left: 0, top: 0, visibility: 'hidden',
  })
  const popoverRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // 展开方向在打开时一次决定：输入过滤导致高度变化时不来回翻面。
  const sideRef = useRef<'above' | 'below'>('below')
  const alive = useRef(true)
  // onClose 由宿主每次渲染新建，事件监听走 ref 以免反复装卸。
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const rows = useMemo<Row[]>(() => {
    const defaultName = t('workspacePicker.defaultName')
    const needle = query.trim().toLowerCase()
    const projects = snapshot.items
      .filter((workspace) => {
        if (needle === '') return true
        return projectName(workspace, defaultName).toLowerCase().includes(needle)
          || workspace.path.toLowerCase().includes(needle)
      })
      .map<ProjectRow>(workspace => ({
        kind: 'project',
        id: workspace.workspaceId,
        label: projectName(workspace, defaultName),
        path: workspace.path,
      }))
    return [...projects, { kind: 'create' }]
  }, [snapshot.items, query, t])

  // 每次打开重置搜索与高亮，并把焦点交给搜索框（截图里打开即可直接输入）。
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    setError(null)
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => { cancelAnimationFrame(frame) }
  }, [open])

  // 过滤后行数变少时把高亮夹回有效区间。
  useEffect(() => {
    setActive(current => (current > rows.length - 1 ? Math.max(0, rows.length - 1) : current))
  }, [rows.length])

  // 打开时按 chip 上下可用空间选一次展开方向，窗口尺寸变化时重新评估。
  useLayoutEffect(() => {
    if (!open) return
    const syncSide = (): void => {
      const rect = anchorRef?.current?.getBoundingClientRect()
      if (rect === undefined) {
        sideRef.current = 'below'
        return
      }
      const below = window.innerHeight - rect.bottom
      const above = rect.top
      sideRef.current = below >= POPOVER_MAX_HEIGHT || below >= above ? 'below' : 'above'
    }
    syncSide()
    window.addEventListener('resize', syncSide)
    return () => { window.removeEventListener('resize', syncSide) }
  }, [open, anchorRef])

  // 定位：贴在 chip 下方（或上方），随窗口尺寸与滚动归位。
  useLayoutEffect(() => {
    if (!open) return
    const update = (): void => {
      const element = popoverRef.current
      if (element === null) return
      const anchor = anchorRef?.current
      const rect = anchor?.getBoundingClientRect()
      const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16)
      const height = element.offsetHeight
      const anchorLeft = rect?.left ?? 16
      const anchorTop = rect?.top ?? (window.innerHeight - 88)
      const anchorBottom = rect?.bottom ?? (window.innerHeight - 64)
      const left = Math.max(8, Math.min(anchorLeft, window.innerWidth - width - 8))
      const unclamped = sideRef.current === 'below'
        ? anchorBottom + 6
        : anchorTop - height - 6
      const top = Math.max(8, Math.min(unclamped, window.innerHeight - height - 8))
      setPosition(current => (
        current.left === left && current.top === top
        && current.width === width && current.visibility === 'visible'
          ? current
          : { position: 'fixed', left, top, width, visibility: 'visible' }
      ))
    }
    update()
    const frame = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchorRef, rows.length, error, busy])

  // 列表溢出时维护右侧滚动条：固定短条高度，位置按滚动进度映射，随滚动实时更新。
  useLayoutEffect(() => {
    if (!open) return
    const element = scrollRef.current
    if (element === null) return
    let frame = 0
    const sync = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const max = element.scrollHeight - element.clientHeight
        if (max <= 1) {
          setThumb(previous => (previous.visible ? { visible: false, height: 0, top: 0 } : previous))
          return
        }
        const height = SCROLL_THUMB_HEIGHT
        const top = Math.round((element.scrollTop / max) * Math.max(0, element.clientHeight - height))
        setThumb(previous => (
          previous.visible && previous.height === height && previous.top === top
            ? previous
            : { visible: true, height, top }
        ))
      })
    }
    sync()
    element.addEventListener('scroll', sync, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(sync)
    observer?.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('scroll', sync)
      observer?.disconnect()
    }
  }, [open, rows.length])

  // 点击浮层与 chip 之外、或按 Esc 关闭；chip 自身由宿主 toggle，不在这里吞掉。
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null
      if (target === null) return
      if (popoverRef.current?.contains(target) === true) return
      if (anchorRef?.current?.contains(target) === true) return
      closeRef.current()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, anchorRef])

  const startCreate = useCallback(async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const path = await pickDirectory()
      if (path === null || path === '') return
      const workspace = await createWorkspace({ path })
      if (!alive.current) return
      onClose()
      onPick(workspace.workspaceId)
    } catch (reason: unknown) {
      if (alive.current) setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      if (alive.current) setBusy(false)
    }
  }, [busy, pickDirectory, createWorkspace, onClose, onPick])

  /** 拖动 thumb 时按轨道比例滚动列表；滚轮与触控仍走原生滚动。 */
  const onThumbPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const element = scrollRef.current
    if (element === null) return
    event.preventDefault()
    const startY = event.clientY
    const startScroll = element.scrollTop
    const maxScroll = element.scrollHeight - element.clientHeight
    const track = element.clientHeight - thumb.height
    if (maxScroll <= 0 || track <= 0) return
    const move = (moveEvent: PointerEvent): void => {
      element.scrollTop = startScroll + ((moveEvent.clientY - startY) * maxScroll) / track
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const choose = useCallback((row: Row): void => {
    if (row.kind === 'create') {
      void startCreate()
      return
    }
    onClose()
    onPick(row.id)
  }, [startCreate, onClose, onPick])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(current => (current + 1) % rows.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(current => (current - 1 + rows.length) % rows.length)
      return
    }
    if (event.key === 'Enter') {
      const row = rows[active]
      if (row === undefined) return
      event.preventDefault()
      choose(row)
    }
  }

  if (!open) return null

  const projectRows = rows.filter((row): row is ProjectRow => row.kind === 'project')
  const createIndex = projectRows.length
  const settled = snapshot.state !== 'loading'
  const hasProjects = projectRows.length > 0

  return createPortal(
    <div
      ref={popoverRef}
      className="dcu-wsp-panel"
      style={position}
      role="group"
      aria-label={t('workspacePicker.list')}
      data-dcu-workspace-picker=""
    >
      <div className="dcu-wsp-search">
        <IconSearchOutlineRegular size={14} />
        <input
          ref={inputRef}
          className="dcu-wsp-input"
          type="text"
          value={query}
          placeholder={t('workspacePicker.search')}
          aria-label={t('workspacePicker.search')}
          role="combobox"
          aria-expanded="true"
          aria-controls="dcu-wsp-listbox"
          aria-activedescendant={active < createIndex ? `dcu-wsp-option-${active}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="dcu-wsp-divider" />
      <div className="dcu-wsp-list">
        <div
          ref={scrollRef}
          id="dcu-wsp-listbox"
          className="dcu-wsp-scroll"
          role="listbox"
          aria-label={t('workspacePicker.list')}
        >
          {projectRows.map((row, index) => (
            <button
              key={row.id}
              id={`dcu-wsp-option-${index}`}
              type="button"
              role="option"
              aria-selected={row.id === selectedId}
              className="dcu-wsp-item"
              data-active={active === index}
              data-workspace-id={row.id}
              title={row.path}
              disabled={busy}
              onClick={() => choose(row)}
              onMouseEnter={() => setActive(index)}
            >
              <IconFolderCloseRegular size={16} />
              <span className="dcu-wsp-title">{row.label}</span>
            </button>
          ))}
          {!hasProjects && !settled
            ? <div className="dcu-wsp-status" role="status">{t('workspacePicker.loading')}</div>
            : null}
          {!hasProjects && settled
            ? (
              <div className="dcu-wsp-status" role="status">
                {query.trim() === '' ? t('workspacePicker.noProjects') : t('workspacePicker.empty')}
              </div>
            )
            : null}
        </div>
        {thumb.visible
          ? (
            <div
              className="dcu-wsp-thumb"
              style={{ height: thumb.height, transform: `translateY(${thumb.top}px)` }}
              aria-hidden="true"
              onPointerDown={onThumbPointerDown}
            />
          )
          : null}
      </div>
      <div className="dcu-wsp-divider" />
      <button
        type="button"
        className="dcu-wsp-item dcu-wsp-create"
        data-active={active === createIndex}
        data-dcu-workspace-create=""
        disabled={busy}
        onClick={() => choose({ kind: 'create' })}
        onMouseEnter={() => setActive(createIndex)}
      >
        {busy
          ? <span className="dcu-wsp-spin" aria-hidden="true" />
          : <IconPlusOutlineRegular size={16} />}
        <span className="dcu-wsp-title">{t('workspacePicker.new')}</span>
      </button>
      {error !== null
        ? <div className="dcu-wsp-error" role="alert">{t('workspacePicker.createFailed')}{error}</div>
        : null}
    </div>,
    document.body,
  )
}
