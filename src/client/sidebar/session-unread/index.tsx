/**
 * 会话未读标记（会话行右键 →「标记为未读」）。
 *
 * DSH 0.2.2+ 宿主原生具备 `contextMenus` 服务，直接通过 contextMenus.register(..., order: 150)
 * 绑定在会话行右键菜单上，精准排在置顶（100）之后、重命名（200）之前；同时注入 contextMenu.icon。
 *
 * 未读状态直接写宿主 `uiSession`（见 ./model.ts）：行首绿点、悬浮卡状态与侧栏水位线
 * 都由宿主自己负责，与「会话跑完」的未读语义完全一致。标记只在本次页面生命周期内有效，
 * 与宿主内置未读提醒一样不跨刷新持久化。
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import {
  IconCheckCircleOutlineRegular,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import React from 'react'
import { NS } from '../../locales.ts'
import {
  canMarkSession,
  isSessionArchived,
  isSessionBusy,
  isSessionOpenInMainView,
  shouldShowSessionUnreadAction,
  unreadSetOf,
  writeSessionUnread,
  type SessionUnreadHost,
} from './model.ts'

/** 槽位内本子插件的行 id：命名空间化，避免与宿主行冲突。 */
const MENU_ITEM_ID = 'codex-ui:session-unread'
/** 排在置顶（100）之后、重命名（200）之前。 */
const MENU_ORDER = 150

/** 图标插槽 entryKey。 */
const ICON_UNREAD_KEY = 'codex-ui:icon-session-unread'
const ICON_READ_KEY = 'codex-ui:icon-session-read'

/** 宿主 slots 服务里本能力用到的最小面。 */
interface SlotsLike {
  inject: (name: string, callback: () => unknown) => unknown
  register: (options: Record<string, unknown>, component: unknown) => () => void
}

/**
 * 从客户端 Context 惰性读取宿主 `uiSession`。
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
 */
function getNativeContextMenuService(
  ctx: ClientContext,
): { register?: (spec: unknown) => () => void; open?: unknown } | undefined {
  try {
    const service =
      (ctx.get?.('contextMenus') as { register?: (spec: unknown) => () => void; open?: unknown } | undefined) ??
      (ctx as unknown as { contextMenus?: { register?: (spec: unknown) => () => void; open?: unknown } }).contextMenus
    if (service === null || typeof service !== 'object') return undefined
    return service
  } catch {
    return undefined
  }
}

/**
 * 挂载会话未读能力。
 *
 * DSH 0.2.2+：宿主拥有 contextMenus 服务，直接通过 contextMenus.register(..., order: 150)
 * 注入会话菜单，精准排在置顶（100）之后、重命名（200）之前；同时注入 contextMenu.icon。
 *
 * @param ctx - 客户端插件 Context。
 * @returns 卸载函数（重复调用安全）。
 */
export function observeSessionUnread(ctx: ClientContext): () => void {
  const slots = ctx.slots as unknown as SlotsLike | undefined
  let disposed = false

  const markUnread = (sessionId: string): boolean => writeSessionUnread(unreadHostOf(ctx), sessionId, true)
  const markRead = (sessionId: string): boolean => writeSessionUnread(unreadHostOf(ctx), sessionId, false)

  const nativeContextMenus = getNativeContextMenuService(ctx)
  if (typeof nativeContextMenus?.register !== 'function') {
    return () => {}
  }

  // 0.2.2+ 宿主：通过原生 contextMenus 服务注册，order 150 真正插在置顶（100）和重命名（200）之间
  let disposeUnreadIcon: (() => void) | undefined
  let disposeReadIcon: (() => void) | undefined

  if (slots !== undefined && typeof slots.inject === 'function' && typeof slots.register === 'function') {
    try {
      const u1 = slots.inject('contextMenu.icon', () =>
        slots.register(
          { name: 'contextMenu.icon', key: ICON_UNREAD_KEY },
          () => <StateDot state="done" size={10} />,
        ),
      )
      if (typeof u1 === 'function') disposeUnreadIcon = u1 as () => void
    } catch {}
    try {
      const u2 = slots.inject('contextMenu.icon', () =>
        slots.register(
          { name: 'contextMenu.icon', key: ICON_READ_KEY },
          () => <IconCheckCircleOutlineRegular size={16} />,
        ),
      )
      if (typeof u2 === 'function') disposeReadIcon = u2 as () => void
    } catch {}
  }

  let unregNative: (() => void) | undefined
  try {
    unregNative = nativeContextMenus.register({
      id: MENU_ITEM_ID,
      target: 'session',
      order: MENU_ORDER,
      observe: () => {
        const uiSession = unreadHostOf(ctx) as any
        const sessionStatus = uiSession?.sessionStatus
        return [ctx.locale, ...(sessionStatus?.subscribe ? [sessionStatus] : [])]
      },
      resolve: (target: { sessionId?: string }) => {
        const sessionId = target?.sessionId
        if (!sessionId) return []

        const unreadHost = unreadHostOf(ctx)
        const canWrite = canMarkSession(unreadHost)
        const unreadSet = unreadSetOf(unreadHost)
        const isUnread = unreadSet?.has(sessionId) === true

        // 归档状态检查：已归档会话不渲染
        let archived = false
        try {
          const workspaces = (ctx.get?.('workspaces') as any) ?? (ctx as any).workspaces
          const snapshot = workspaces?.list?.getSnapshot?.() ?? workspaces?.getSnapshot?.()
          archived = isSessionArchived(snapshot?.archivedSessionIds, sessionId)
        } catch {}

        // 忙碌与主视图打开检查
        let openInMainView = false
        let busy = false
        try {
          const sessions = (ctx.get?.('sessions') as any) ?? (ctx as any).sessions
          const list = sessions?.list?.getSnapshot?.() ?? sessions?.getSnapshot?.()
          const sessionItem = list?.byId?.[sessionId] ?? list?.items?.find?.((s: any) => s.id === sessionId)
          openInMainView = isSessionOpenInMainView(sessionItem)

          const uiSession = unreadHost as any
          const statusMap = uiSession?.sessionStatus?.getSnapshot?.() ?? uiSession?.sessionStatus
          const status =
            statusMap instanceof Map
              ? statusMap.get(sessionId)
              : (statusMap?.[sessionId] ?? uiSession?.statusOf?.(sessionId))
          busy = isSessionBusy(status, sessionItem)
        } catch {}

        if (
          !shouldShowSessionUnreadAction({
            canWrite,
            isUnread,
            isArchived: archived,
            isOpenInMainView: openInMainView,
            isBusy: busy,
          })
        ) {
          return []
        }

        const t = ctx.locale?.bind?.(NS) ?? ((k: string) => k)
        if (isUnread) {
          return [
            {
              id: 'mark-read',
              label: t('session.markRead'),
              icon: { key: ICON_READ_KEY },
              run: () => {
                markRead(sessionId)
              },
            },
          ]
        }
        return [
          {
            id: 'mark-unread',
            label: t('session.markUnread'),
            icon: { key: ICON_UNREAD_KEY },
            run: () => {
              markUnread(sessionId)
            },
          },
        ]
      },
    })
  } catch (error) {
    console.warn('[codex-ui:session-unread] 注册原生 contextMenus 失败，跳过。', error)
  }

  return () => {
    if (disposed) return
    disposed = true
    if (typeof unregNative === 'function') {
      try {
        unregNative()
      } catch {}
    }
    if (typeof disposeUnreadIcon === 'function') {
      try {
        disposeUnreadIcon()
      } catch {}
    }
    if (typeof disposeReadIcon === 'function') {
      try {
        disposeReadIcon()
      } catch {}
    }
  }
}
