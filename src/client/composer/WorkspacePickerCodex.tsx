import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  IconCheckOutlineRegular, IconFolderCloseRegular, IconPlusOutlineRegular, IconSearchOutlineRegular,
  Input, MenuItemButton, MenuSurface,
} from '@deepseek-ai/dsh-client-ui-primitives'
// 仅类型：拉取 conversation 的槽位 Owner 契约、workspace 的全局 useWorkspaces hooks
// 与 Workspace 快照类型。全部在编译期擦除，不增加客户端运行时依赖。
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { NS } from '../locales.ts'

/** 浮层宽度（对齐参考截图里的 Codex 项目选择器），也是定位计算的钳制依据。 */
const PANEL_WIDTH = 266
/** 浮层的最大可能高度，用于打开时判断向下展开是否放得下。 */
const POPOVER_MAX_HEIGHT = 312
/**
 * 宿主首次初始化的工作区自动标题。宿主展示逻辑在
 * `dsh-api-workspace-controller/default-workspace` 的 `workspaceDisplayTitle`，
 * 该子路径未列入本包 peer 依赖，故此处按同一 sentinel 本地判定。
 */
const DEFAULT_WORKSPACE_TITLE = 'default-workspace'

/**
 * 「新建项目」能力闸门。
 *
 * 宿主只在原生后端（`capability().kind === 'native'`）提供 `directoryPicker.pick`；
 * browse 后端（远程 Peer、SSH 启动、非 loopback 绑定）调用时以
 * `directory-picker/unavailable` 拒绝。客户端没有查询后端种类的接口，因此在第一次
 * 收到该拒绝码后把闸门永久关闭，「新建项目」行随之消失——与官方在没有目录流时
 * 干脆不提供该入口的行为一致。
 */
export interface CreateGate {
  getSnapshot(): boolean
  subscribe(listener: () => void): () => void
  close(): void
}

/** 创建一个初始开放的能力闸门。 */
export function createCreateGate(): CreateGate {
  let open = true
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => open,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    close: () => {
      if (!open) return
      open = false
      for (const listener of listeners) listener()
    },
  }
}

/** 项目选择器自身需要的能力：选目录 + 注册为工作区（由 apply 闭包注入）。 */
export interface WorkspacePickerInjected {
  /** 打开系统目录选择器；用户取消返回 null。 */
  pickDirectory: () => Promise<string | null>
  /** 把选中的目录注册为工作区。 */
  createWorkspace: (input: { path: string }) => Promise<{ workspaceId: WorkspaceId }>
  /** 「新建项目」是否可用的闸门（宿主无原生目录能力后永久关闭）。 */
  createGate: CreateGate
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
  /** 与其它同项目名的路径区分后缀；名字唯一时为 undefined。 */
  readonly suffix: string | undefined
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
 * 同项目名的 Workspace 各取「最短的唯一尾部路径段」用于区分展示。
 *
 * 语义与宿主 `ui-workspace` 的 `distinguishingPathSuffixes` 相同：分段与分隔符
 * 交替切分，逐段加长直到没有同名项共享同一后缀；名字唯一的项目不产生后缀。
 * 该模块未通过宿主的包 `exports` 暴露，因此本地保留同一算法。
 * @param workspaces - 每个项目的 id、展示标题与规范路径。
 * @returns 按 Workspace id 索引的区分后缀。
 */
function distinguishingPathSuffixes<Id>(
  workspaces: readonly { readonly id: Id; readonly title: string; readonly path: string }[],
): ReadonlyMap<Id, string> {
  const rows = workspaces.map(workspace => ({ ...workspace, parts: workspace.path.split(/([\\/])/) }))
  const suffix = (parts: readonly string[], count: number): string => parts.slice(-(2 * count - 1)).join('')
  const suffixes = new Map<Id, string>()
  for (const row of rows) {
    const peers = rows.filter(other => other !== row && other.title === row.title)
    if (peers.length === 0) continue
    let count = 1
    // 根路径（`/`、`C:\`）以空段结尾；遇到空后缀或与同名项重复时继续加长。
    while (
      2 * count - 1 < row.parts.length
      && (suffix(row.parts, count) === '' || peers.some(peer => suffix(peer.parts, count) === suffix(row.parts, count)))
    ) count++
    suffixes.set(row.id, suffix(row.parts, count))
  }
  return suffixes
}

/**
 * Codex 风格项目选择器：搜索 + 项目列表 + 新建项目。
 *
 * 替换宿主 `conversation.hero.workspace` 的单槽默认实现（无搜索的 Menu），
 * 交互与视觉对齐参考截图；所有数据仍走宿主 Workspace Controller：选择项目
 * 调用 owner 的 `onPick`，新建项目先选目录再 `createWorkspace`。
 *
 * 浮层材质、菜单行与搜索框分别复用宿主原语 `MenuSurface` / `MenuItemButton` /
 * `Input`，配色与浅色、深色、玻璃主题由宿主令牌负责；本组件只保留锚点定位、
 * 组合框式搜索过滤与键盘游标（焦点始终留在搜索框）。
 *
 * 与宿主默认实现的差异：本条目未声明 `conversation.hero.workspace.directoryFlow`
 * 子槽（同一子槽只能有一处声明，官方工作区插件已占用），因此「新建项目」走宿主
 * 目录选择能力，不提供应用内目录浏览。
 * @param props - 槽位 owner props、本地化函数与注入的目录/创建能力。
 * @returns 浮层（portal 到 document.body），关闭时为 null。
 */
export function CodexWorkspacePicker(props: CodexWorkspacePickerProps) {
  const {
    open, selectedId, anchorRef, onPick, onClose,
    useWorkspaces, t, pickDirectory, createWorkspace, createGate,
  } = props
  const snapshot = useWorkspaces(state => state)
  const canCreate = useSyncExternalStore(createGate.subscribe, createGate.getSnapshot, createGate.getSnapshot)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<CSSProperties>({
    position: 'fixed', left: 0, top: 0, visibility: 'hidden',
  })
  const surfaceRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // 展开方向在打开时一次决定：输入过滤导致高度变化时不来回翻面。
  const sideRef = useRef<'above' | 'below'>('below')
  const alive = useRef(true)
  // 连点两次「新建项目」时 `busy` 还是上一次渲染的值，用 ref 挡住第二次弹窗。
  const startingRef = useRef(false)
  const baseId = useId()
  const listId = `${baseId}-list`
  const createId = `${baseId}-create`
  const rowIdOf = useCallback((index: number): string => `${baseId}-row-${index}`, [baseId])

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const rows = useMemo<Row[]>(() => {
    const defaultName = t('workspacePicker.defaultName')
    const listed = snapshot.items.map(workspace => ({ workspace, label: projectName(workspace, defaultName) }))
    // 后缀按「全部项目」计算，不受当前搜索过滤影响，避免过滤后名字忽隐忽现。
    const suffixes = distinguishingPathSuffixes(
      listed.map(({ workspace, label }) => ({ id: workspace.workspaceId, title: label, path: workspace.path })),
    )
    const needle = query.trim().toLowerCase()
    const projects = listed
      .filter(({ workspace, label }) => needle === ''
        || label.toLowerCase().includes(needle)
        || workspace.path.toLowerCase().includes(needle))
      .map<ProjectRow>(({ workspace, label }) => ({
        kind: 'project',
        id: workspace.workspaceId,
        label,
        suffix: suffixes.get(workspace.workspaceId),
        path: workspace.path,
      }))
    return canCreate ? [...projects, { kind: 'create' }] : projects
  }, [snapshot.items, query, t, canCreate])
  const projectCount = canCreate ? rows.length - 1 : rows.length

  /** 关闭浮层并把焦点还给锚点胶囊，键盘用户不丢失上下文。 */
  const closeMenu = useCallback((): void => {
    onClose()
    anchorRef?.current?.focus({ preventScroll: true })
  }, [onClose, anchorRef])

  // 每次打开重置搜索与高亮，并把焦点交给搜索框（打开即可直接输入）。
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

  // 键盘游标移动后保持目标行可见：焦点留在搜索框，滚动由这里驱动。
  useEffect(() => {
    if (!open) return
    const id = active < projectCount ? rowIdOf(active) : (canCreate ? createId : undefined)
    if (id === undefined) return
    document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active, projectCount, canCreate, rowIdOf, createId])

  // 打开时按胶囊上下可用空间选一次展开方向，窗口尺寸变化时重新评估。
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

  // 定位：贴在胶囊下方（或上方），随窗口尺寸与滚动归位。
  useLayoutEffect(() => {
    if (!open) return
    const update = (): void => {
      const element = surfaceRef.current
      if (element === null) return
      const anchor = anchorRef?.current
      const rect = anchor?.getBoundingClientRect()
      const width = Math.min(PANEL_WIDTH, window.innerWidth - 16)
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

  // 点击浮层与胶囊之外、或按 Esc 关闭；胶囊自身由宿主 toggle，不在这里吞掉。
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null
      if (target === null) return
      if (surfaceRef.current?.contains(target) === true) return
      if (anchorRef?.current?.contains(target) === true) return
      closeMenu()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, anchorRef, closeMenu])

  const startCreate = useCallback(async (): Promise<void> => {
    if (startingRef.current) return
    startingRef.current = true
    setBusy(true)
    setError(null)
    try {
      const path = await pickDirectory()
      if (path === null || path === '') return
      const workspace = await createWorkspace({ path })
      if (!alive.current) return
      closeMenu()
      onPick(workspace.workspaceId)
    } catch (reason: unknown) {
      if (alive.current) setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      startingRef.current = false
      if (alive.current) setBusy(false)
    }
  }, [pickDirectory, createWorkspace, closeMenu, onPick])

  const choose = useCallback((row: Row): void => {
    if (row.kind === 'create') {
      void startCreate()
      return
    }
    closeMenu()
    onPick(row.id)
  }, [startCreate, closeMenu, onPick])

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
    if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      setActive(rows.length - 1)
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
  const activeId = active < createIndex ? rowIdOf(active) : (canCreate ? createId : undefined)

  return createPortal(
    <MenuSurface
      ref={surfaceRef}
      className="dcu-wsp-panel"
      style={position}
      data-dcu-workspace-picker=""
    >
      <Input
        ref={inputRef}
        className="dcu-wsp-search"
        icon={<IconSearchOutlineRegular size={14} />}
        type="text"
        value={query}
        placeholder={t('workspacePicker.search')}
        aria-label={t('workspacePicker.search')}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={activeId}
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
      <div
        ref={scrollRef}
        id={listId}
        className="dcu-wsp-scroll"
        role="menu"
        aria-label={t('workspacePicker.list')}
      >
        {projectRows.map((row, index) => (
          <div
            key={row.id}
            // 菜单容器的直接子节点应当是 menuitem / group；这层只是定位与高亮载体，
            // 用 role="none" 从无障碍树里抹掉。
            role="none"
            className="dcu-wsp-row"
            data-active={active === index}
            data-workspace-id={row.id}
            onMouseEnter={() => setActive(index)}
          >
            <MenuItemButton
              // 宿主 MenuItemButtonProps 未声明 DOM id，但实现会把剩余属性透传到
              // <button>；aria-activedescendant 需要行 id，这里显式补一个。
              {...({ id: rowIdOf(index) } as { id: string })}
              icon={<IconFolderCloseRegular size={16} />}
              current={row.id === selectedId}
              disabled={busy}
              onSelect={() => choose(row)}
            >
              <span className="dcu-wsp-body">
                <span className="dcu-wsp-label" title={row.path}>{row.label}</span>
                {row.suffix === undefined
                  ? null
                  : <span className="dcu-wsp-suffix">{row.suffix}</span>}
                {/* 当前工作区用宿主对勾标记；MenuItemButton 没有 selected 入参，
                    只能自己补这一枚图标（不是自绘控件）。 */}
                {row.id === selectedId
                  ? <IconCheckOutlineRegular size={16} aria-hidden="true" className="dcu-wsp-check" />
                  : null}
              </span>
            </MenuItemButton>
          </div>
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
      {canCreate
        ? (
          <div role="none" className="dcu-wsp-create" data-active={active === createIndex} data-dcu-workspace-create="">
            <MenuItemButton
              {...({ id: createId } as { id: string })}
              icon={busy
                ? <span className="dcu-wsp-spin" aria-hidden="true" />
                : <IconPlusOutlineRegular size={16} />}
              disabled={busy}
              separatorBefore
              onSelect={() => choose({ kind: 'create' })}
            >
              {t('workspacePicker.new')}
            </MenuItemButton>
          </div>
        )
        : null}
      {error !== null
        ? <div className="dcu-wsp-error" role="alert">{t('workspacePicker.createFailed')}{error}</div>
        : null}
    </MenuSurface>,
    document.body,
  )
}
