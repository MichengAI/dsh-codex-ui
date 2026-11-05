/**
 * 会话未读标记（会话行右键 →「标记为未读」）。
 *
 * 两个入口共用宿主的同一份会话菜单：
 * 1. 菜单行通过宿主槽位 `sidebar.workspaces.session.menu.item` 与「置顶 / 归档」并排；
 * 2. 右键入口按宿主能力分流：0.2.2+ 由宿主原生 `contextMenus` 直接绑定在会话行上；
 *    0.2.0 / 0.2.1 没有右键菜单，本模块点击行内「···」唤起同一份菜单，不另画浮层。
 *
 * 未读状态直接写宿主 `uiSession`（见 ./model.ts）：行首绿点、悬浮卡状态与侧栏水位线
 * 都由宿主自己负责，与「会话跑完」的未读语义完全一致。标记只在本次页面生命周期内有效，
 * 与宿主内置未读提醒一样不跨刷新持久化。
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import {
  IconCheckCircleOutlineRegular,
  MenuItemButton,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import React from 'react'
import { NS } from '../../locales.ts'
import {
  findSessionMenuButton,
  sessionIdOfRowKey,
  writeSessionUnread,
  type SessionUnreadHost,
} from './model.ts'

/** 宿主会话行菜单槽位（行操作列表）。 */
const MENU_SLOT = 'sidebar.workspaces.session.menu.item'
/** 槽位内本子插件的行 id：命名空间化，避免与宿主行冲突。 */
const MENU_ITEM_ID = 'codex-ui:session-unread'
/** 排在置顶（100）之后、重命名（200）之前。 */
const MENU_ORDER = 150

/** 会话 UI 状态里本能力用到的字段。 */
interface SessionStatusLike {
  readonly running?: boolean
  readonly completionUnread?: boolean
  readonly pendingInteraction?: unknown
}

/** 会话列表行里判断「是否正在主视图打开」的最小形状。 */
interface SessionSummaryLike {
  readonly retainedBy?: { readonly mainView?: number }
}

interface SessionListLike {
  readonly byId: Readonly<Record<string, SessionSummaryLike | undefined>>
}

interface WorkspaceSnapshotLike {
  readonly archivedSessionIds: readonly string[]
}

/** 宿主标准选择器 hook 的最小签名（只用到布尔结果）。 */
type SelectorHook<State> = (selector: (state: State) => boolean) => boolean

/** 会话菜单行收到的 props：owner share + 全局标准 hook + 本子插件注入的动作。 */
export interface MarkUnreadMenuProps {
  /** 行所属会话 id（宿主 owner share）。 */
  sessionId: string
  /** 绑定到本子插件命名空间的翻译函数。 */
  t: (key: string) => string
  /** 写入未读标记；宿主契约不可用时返回 false。 */
  markUnread: (sessionId: string) => boolean
  /** 清除未读标记；宿主契约不可用时返回 false。 */
  markRead: (sessionId: string) => boolean
  useMenuOpenState?: () => readonly [open: boolean, setOpen: (open: boolean) => void]
  useSessionStatus?: SelectorHook<ReadonlyMap<string, SessionStatusLike>>
  useSessions?: SelectorHook<SessionListLike>
  useWorkspaces?: SelectorHook<WorkspaceSnapshotLike>
}

/**
 * 「标记为未读 / 标记为已读」菜单行。
 *
 * 宿主标准 hook 缺一环就整行不渲染：这是可选增强，绝不能让一个缺失的宿主能力
 * 把整份会话菜单拖垮。
 *
 * @param props - 宿主组合 props（见 {@link MarkUnreadMenuProps}）。
 * @returns 一行菜单项，或 null（未读不可写 / 已归档 / 正在主视图打开）。
 */
export function MarkUnreadMenuItem(props: MarkUnreadMenuProps): React.JSX.Element | null {
  const { useMenuOpenState, useSessionStatus, useSessions, useWorkspaces } = props
  if (
    typeof useMenuOpenState !== 'function' ||
    typeof useSessionStatus !== 'function' ||
    typeof useSessions !== 'function' ||
    typeof useWorkspaces !== 'function' ||
    typeof props.markUnread !== 'function' ||
    typeof props.markRead !== 'function'
  ) {
    return null
  }
  return <MarkUnreadMenuRow {...props} />
}

/**
 * 菜单行的渲染主体：hooks 必须无条件调用，因此与能力守卫拆成两个组件。
 *
 * @param props - 已确认具备全部宿主 hook 的组合 props。
 * @returns 菜单项或 null。
 */
function MarkUnreadMenuRow(props: MarkUnreadMenuProps): React.JSX.Element | null {
  const { markRead, markUnread, sessionId, t } = props
  const [, setMenuOpen] = props.useMenuOpenState!()
  const unread = props.useSessionStatus!(statuses => statuses.get(sessionId)?.completionUnread === true)
  const busy = props.useSessionStatus!(statuses => {
    const status = statuses.get(sessionId)
    return status?.running === true || status?.pendingInteraction !== undefined
  })
  // 主视图正在打开的会话：宿主下一次状态重算就会清掉未读，标记了也留不住。
  const openInMainView = props.useSessions!(list => (list.byId[sessionId]?.retainedBy?.mainView ?? 0) > 0)
  // 已归档的行首不画未读点，标记后没有任何可见结果。
  const archived = props.useWorkspaces!(state => state.archivedSessionIds.includes(sessionId))

  if (archived) return null
  if (!unread && (openInMainView || busy)) return null

  const select = (next: boolean): void => {
    setMenuOpen(false)
    if (next) markUnread(sessionId)
    else markRead(sessionId)
  }

  if (unread) {
    return (
      <MenuItemButton icon={<IconCheckCircleOutlineRegular size={16} />} onSelect={() => select(false)}>
        {t('session.markRead')}
      </MenuItemButton>
    )
  }
  return (
    <MenuItemButton icon={<StateDot state="done" size={10} />} onSelect={() => select(true)}>
      {t('session.markUnread')}
    </MenuItemButton>
  )
}

/** 宿主 slots 服务里本能力用到的最小面。 */
interface SlotsLike {
  inject: (name: string, callback: () => unknown) => unknown
  register: (options: Record<string, unknown>, component: unknown) => () => void
}

/**
 * 从客户端 Context 惰性读取宿主 `uiSession`。
 *
 * 故意不列入插件 inject：服务缺失时本能力整体降级，不影响插件其它功能加载；
 * 服务晚到时因为每次点击才读取，标记依然可用。
 *
 * @param ctx - 客户端插件 Context。
 * @returns 宿主服务的最小可用面或 undefined。
 */
function unreadHostOf(ctx: ClientContext): SessionUnreadHost | undefined {
  try {
    const service = (ctx.get?.('uiSession') as unknown) ?? (ctx as unknown as { uiSession?: unknown }).uiSession
    if (service === null || typeof service !== 'object') return undefined
    return service as SessionUnreadHost
  } catch {
    return undefined
  }
}

/**
 * 宿主是否自带右键菜单服务（0.2.2+ 把 `contextmenu` 绑定到了会话行本身）。
 *
 * 服务存在时再点「···」只会把宿主刚打开的面板再切换一次，因此完全让给宿主。
 *
 * @param ctx - 客户端插件 Context。
 * @returns 宿主是否接管右键。
 */
function hostOwnsContextMenu(ctx: ClientContext): boolean {
  try {
    const service = (ctx.get?.('contextMenus') as { open?: unknown } | undefined) ??
      (ctx as unknown as { contextMenus?: { open?: unknown } }).contextMenus
    return typeof service?.open === 'function'
  } catch {
    return false
  }
}

/**
 * 挂载会话未读能力。
 *
 * - 注册会话行菜单项（随宿主槽位声明激活，宿主移除槽位时自动注销）；
 * - 安装文档级 `contextmenu` 委托：只在命中会话行、且宿主自己还没有右键菜单能力时接管
 *   （0.2.0 / 0.2.1），直接点击「···」锚点让宿主自己打开菜单；0.2.2+ 由宿主原生
 *   `contextMenus` 负责右键，本层不插手。
 *
 * @param ctx - 客户端插件 Context。
 * @returns 卸载函数（重复调用安全）。
 */
export function observeSessionUnread(ctx: ClientContext): () => void {
  const slots = ctx.slots as unknown as SlotsLike | undefined
  if (slots === undefined || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
    return () => {}
  }

  let disposed = false
  const markUnread = (sessionId: string): boolean => writeSessionUnread(unreadHostOf(ctx), sessionId, true)
  const markRead = (sessionId: string): boolean => writeSessionUnread(unreadHostOf(ctx), sessionId, false)

  let disposeEntry: unknown
  try {
    disposeEntry = slots.inject(MENU_SLOT, () =>
      slots.register(
        {
          name: MENU_SLOT,
          id: MENU_ITEM_ID,
          order: MENU_ORDER,
          locale: NS,
          inject: () => ({ markUnread, markRead }),
        },
        MarkUnreadMenuItem,
      ),
    )
  } catch (error) {
    console.warn('[codex-ui:session-unread] 会话菜单项注册失败，已跳过。', error)
    return () => {}
  }

  const onContextMenu = (event: MouseEvent): void => {
    if (disposed || event.defaultPrevented) return
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest("input, textarea, [contenteditable='true']") !== null) return
    // 菜单浮层挂在 body 上：右键菜单内部时不要再弹一次。
    if (target.closest('[role="menu"]') !== null) return

    const row = target.closest<HTMLElement>('[data-row-key]')
    if (row === null || sessionIdOfRowKey(row.getAttribute('data-row-key')) === undefined) return

    // 0.2.2+：宿主自己把右键绑定到了会话行；再介入只会与它抢事件或把刚打开的菜单关掉。
    if (hostOwnsContextMenu(ctx) || row.querySelector('[data-context-menu-trigger]') !== null) return

    // 有文字选区时保留浏览器原生菜单：用户可能只是想复制会话标题。
    const selection = typeof window.getSelection === 'function' ? window.getSelection() : null
    if (selection !== null && selection.toString().trim() !== '') return

    const menuButton = findSessionMenuButton(row)
    if (menuButton === null) return
    event.preventDefault()
    menuButton.click()
  }

  document.addEventListener('contextmenu', onContextMenu, true)

  return () => {
    if (disposed) return
    disposed = true
    document.removeEventListener('contextmenu', onContextMenu, true)
    if (typeof disposeEntry !== 'function') return
    try {
      disposeEntry()
    } catch {
      // 宿主已卸载：注册账本随宿主一起消失，这里不必再报错。
    }
  }
}
