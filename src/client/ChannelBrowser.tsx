import { useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { ChannelBrandIcon } from './channel-brand.tsx'
import { loadChannelGroups, type ChannelGroup } from './channel-api.ts'
import { WORKSPACE_TREE_STYLE } from './CodexWorkspaceBrowser.tsx'
import { formatHoverTime, hoverCardAnchor } from './hover-tip.ts'
import { SessionHoverCardLayer, SessionModals, useBusyAction, useSessionDialogs, useSessionFlags } from './session-row-actions.tsx'
import { HoverShell, useHoverDispatch } from './hover-shell.tsx'
import { GroupHead, SessionRow, sessionMenuItems } from './session-tree.tsx'
import { pendingInteractionForSession, useEmptySessionPendingInteraction, type UseSessionPendingInteraction } from './session-pending.ts'
import { browserStorage, CHANNEL_EXPANSION_STORAGE_KEY, readTreeExpansionState, writeTreeExpansionState } from './tree-expansion.ts'
import { moveSessionActionId, parseMoveSessionActionId, sessionMoveTargets } from './session-move.ts'

type OpenMenu = { id: string; x?: number; y?: number }

type SessionStore = {
  current?: string
  byId: Record<string, { running?: boolean; displayTitle?: string; updatedAt?: number; pendingInteraction?: unknown }>
}

type WorkspaceStore = {
  items: readonly { workspaceId: string; title: string; sessionIds: readonly string[] }[]
}

type ChannelBrowserProps = {
  openSession: (sessionId: SessionId) => void
  archiveSession: (sessionId: SessionId) => Promise<void>
  deleteSession: (sessionId: SessionId) => Promise<void>
  forkSession: (sessionId: SessionId) => Promise<void>
  moveSession?: (sessionId: SessionId, targetWorkspaceId: WorkspaceId) => Promise<void>
  renameSession: (sessionId: SessionId, title: string) => Promise<void>
  useSessions: (selector: (state: SessionStore) => SessionStore) => SessionStore
  useWorkspaces?: (selector: (state: WorkspaceStore) => WorkspaceStore) => WorkspaceStore
  useSessionPendingInteraction?: UseSessionPendingInteraction
  t: TranslateNS<typeof NS>
}

const CHANNEL_LOCALE_KEYS = {
  dingtalk: 'channel.dingtalk', feishu: 'channel.feishu', lark: 'channel.lark', weixin: 'channel.weixin',
  wecom: 'channel.wecom', qq: 'channel.qq', telegram: 'channel.telegram',
} as const

function channelLabel(id: string, fallback: string, t: TranslateNS<typeof NS>): string {
  const key = CHANNEL_LOCALE_KEYS[id as keyof typeof CHANNEL_LOCALE_KEYS]
  return key === undefined ? fallback : t(key)
}

/** 频道树：数据来自 IM，行/菜单/悬停与任务树共用。 */
export function ChannelBrowser(props: ChannelBrowserProps) {
  const [menu, setMenu] = useState<OpenMenu>()
  return <HoverShell blocked={menu !== undefined}><ChannelBrowserTree {...props} menu={menu} setMenu={setMenu} /></HoverShell>
}

function ChannelBrowserTree({ openSession, archiveSession, deleteSession, forkSession, moveSession, renameSession, useSessions, useSessionPendingInteraction, useWorkspaces, t, menu, setMenu }: ChannelBrowserProps & { menu?: OpenMenu; setMenu: (menu?: OpenMenu) => void }) {
  const sessions = useSessions(state => state)
  const workspaces = useWorkspaces?.(state => state)
  const pendingInteractions = (useSessionPendingInteraction ?? useEmptySessionPendingInteraction)(state => state)
  const [groups, setGroups] = useState<ChannelGroup[]>([])
  const [pollError, setPollError] = useState<string>()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => readTreeExpansionState(browserStorage(), CHANNEL_EXPANSION_STORAGE_KEY))
  const flags = useSessionFlags(sessions.current)
  const { showTip, hideTip, dismissTip } = useHoverDispatch()
  const { busy, error, setError, run } = useBusyAction(t, () => { setMenu(undefined) })
  const dialogs = useSessionDialogs({ archiveSession, deleteSession, forkSession, renameSession }, flags, run, () => { setMenu(undefined); setError(undefined) })
  useEffect(() => { writeTreeExpansionState(browserStorage(), CHANNEL_EXPANSION_STORAGE_KEY, expanded) }, [expanded])
  useEffect(() => {
    let disposed = false
    let active: AbortController | undefined
    const load = (): void => {
      if (active !== undefined || document.visibilityState === 'hidden') return
      const controller = new AbortController()
      active = controller
      const timeout = window.setTimeout(() => { controller.abort() }, 8_000)
      void loadChannelGroups(controller.signal, t('channel.unknown'))
        .then(next => {
          if (!disposed) { setGroups(next); setPollError(undefined) }
        })
        .catch(() => {
          if (!disposed) setPollError(t('channels.loadError'))
        })
        .finally(() => {
          window.clearTimeout(timeout)
          if (active === controller) active = undefined
        })
    }
    load()
    const timer = window.setInterval(load, 4000)
    const onVisibilityChange = (): void => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      disposed = true
      active?.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [t])
  const banner = pollError ?? error
  return <section className="dcu-wb" aria-label={t('sidebar.channelsTab')}>
    <style>{WORKSPACE_TREE_STYLE}</style>
    <div className="dcu-wb-tree" role="tree">
      {banner !== undefined && <div className="dcu-wb-error" role="alert">{banner}</div>}
      {pollError === undefined && groups.length === 0 && <div className="dcu-wb-empty">{t('channels.empty')}</div>}
      {groups.map(group => {
        const isExpanded = expanded[group.id] ?? true
        const label = channelLabel(group.id, group.label, t)
        return <div className="dcu-wb-project" key={group.id}>
          <GroupHead expanded={isExpanded} title={label} icon={<ChannelBrandIcon id={group.id} />} onToggle={() => { setExpanded(current => ({ ...current, [group.id]: !isExpanded })) }} />
          {isExpanded && group.sessions.map(session => {
            const id = session.sessionId
            const title = session.title
            const selected = sessions.current === id
            const running = session.running || sessions.byId[id]?.running === true
            const updatedAt = session.updatedAt ?? sessions.byId[id]?.updatedAt
            const unread = flags.unreadSessionIds.includes(id)
            const pendingInteraction = pendingInteractionForSession(id, pendingInteractions, sessions.byId[id]?.pendingInteraction)
            const moveTargets = moveSession === undefined || workspaces === undefined ? undefined : sessionMoveTargets(workspaces.items, id).map(target => ({ ...target, id: moveSessionActionId(target.id) }))
            return <SessionRow key={id} id={id} title={title} selected={selected} menuOpen={menu?.id === id} unread={unread} running={running} pendingInteraction={pendingInteraction} t={t} menuItems={sessionMenuItems(t, { unread, moveTargets })} menuPoint={menu?.id === id && menu.x !== undefined && menu.y !== undefined ? { x: menu.x, y: menu.y } : undefined} onOpen={() => { flags.setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onMenuChange={(open) => { setMenu(open ? { id } : undefined) }} onArchive={() => { void run('archive', () => archiveSession(id as SessionId)) }} onHover={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); showTip({ title, project: label, time: updatedAt === undefined ? undefined : formatHoverTime(updatedAt, t), left: box.left, top: box.top }) }} onLeave={hideTip} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenu({ id, x: event.clientX, y: event.clientY }) }} onSelectAction={(action) => { if (busy !== undefined) return; const targetWorkspaceId = parseMoveSessionActionId(action); if (targetWorkspaceId !== undefined && moveSession !== undefined) { setMenu(undefined); void run('session-move', () => moveSession(id as SessionId, targetWorkspaceId as WorkspaceId)); return }; dialogs.handleAction(action, id, title) }} />
          })}
        </div>
      })}
    </div>
    <SessionHoverCardLayer />
    <SessionModals t={t} busy={busy} error={error} {...dialogs} setError={setError} />
  </section>
}
