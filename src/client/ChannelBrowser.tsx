import { useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { ChannelBrandIcon } from './channel-brand.tsx'
import { loadChannelGroups, type ChannelGroup } from './channel-api.ts'
import { WORKSPACE_TREE_STYLE } from './CodexWorkspaceBrowser.tsx'
import { formatHoverTime, hoverCardAnchor } from './hover-tip.ts'
import { toggleSessionId } from './session-manager.ts'
import { SessionHoverCardLayer, SessionModals, useBusyAction, useSessionDialogs, useSessionFlags } from './session-row-actions.tsx'
import { HoverShell, useHoverDispatch } from './hover-shell.tsx'
import { GroupHead, SessionRow, sessionMenuItems } from './session-tree.tsx'

type SessionStore = {
  current?: string
  byId: Record<string, { running?: boolean; displayTitle?: string; updatedAt?: number }>
}

type ChannelBrowserProps = {
  openSession: (sessionId: SessionId) => void
  archiveSession: (sessionId: SessionId) => Promise<void>
  deleteSession: (sessionId: SessionId) => Promise<void>
  forkSession: (sessionId: SessionId) => Promise<void>
  renameSession: (sessionId: SessionId, title: string) => Promise<void>
  useSessions: (selector: (state: SessionStore) => SessionStore) => SessionStore
  t: TranslateNS<typeof NS>
}

/** 频道树：数据来自 IM，行/菜单/悬停与任务树共用。 */
export function ChannelBrowser(props: ChannelBrowserProps) {
  const [menuId, setMenuId] = useState<string>()
  return <HoverShell blocked={menuId !== undefined}><ChannelBrowserTree {...props} menuId={menuId} setMenuId={setMenuId} /></HoverShell>
}

function ChannelBrowserTree({ openSession, archiveSession, deleteSession, forkSession, renameSession, useSessions, t, menuId, setMenuId }: ChannelBrowserProps & { menuId?: string; setMenuId: (id?: string) => void }) {
  const sessions = useSessions(state => state)
  const [groups, setGroups] = useState<ChannelGroup[]>([])
  const [pollError, setPollError] = useState<string>()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const flags = useSessionFlags(sessions.current)
  const { showTip, hideTip, dismissTip } = useHoverDispatch()
  const { busy, error, setError, run } = useBusyAction(() => { setMenuId(undefined) })
  const dialogs = useSessionDialogs({ archiveSession, deleteSession, forkSession, renameSession }, flags, run, () => { setMenuId(undefined); setError(undefined) })
  useEffect(() => {
    let disposed = false
    let loading = false
    const load = (): void => {
      if (loading) return
      loading = true
      void loadChannelGroups()
        .then(next => {
          if (!disposed) { setGroups(next); setPollError(undefined) }
        })
        .catch(reason => {
          if (!disposed) setPollError(reason instanceof Error ? reason.message : String(reason))
        })
        .finally(() => { loading = false })
    }
    load()
    const timer = window.setInterval(load, 4000)
    return () => { disposed = true; window.clearInterval(timer) }
  }, [])
  const banner = pollError ?? error
  return <section className="dcu-wb" aria-label={t('sidebar.channelsTab')}>
    <style>{WORKSPACE_TREE_STYLE}</style>
    <div className="dcu-wb-tree" role="tree">
      {banner !== undefined && <div className="dcu-wb-error" role="alert">{banner}</div>}
      {pollError === undefined && groups.length === 0 && <div className="dcu-wb-empty">{t('channels.empty')}</div>}
      {groups.map(group => {
        const isExpanded = expanded[group.id] ?? true
        return <div className="dcu-wb-project" key={group.id}>
          <GroupHead expanded={isExpanded} title={group.label} icon={<ChannelBrandIcon id={group.id} />} onToggle={() => { setExpanded(current => ({ ...current, [group.id]: !isExpanded })) }} />
          {isExpanded && group.sessions.map(session => {
            const id = session.sessionId
            const title = session.title
            const selected = sessions.current === id
            const running = session.running || sessions.byId[id]?.running === true
            const updatedAt = session.updatedAt ?? sessions.byId[id]?.updatedAt
            const pinned = flags.pinnedSessionIds.includes(id)
            const unread = flags.unreadSessionIds.includes(id)
            return <SessionRow key={id} id={id} title={title} selected={selected} menuOpen={menuId === id} pinned={pinned} unread={unread} running={running} t={t} menuItems={sessionMenuItems(t, { pinned, unread })} onOpen={() => { flags.setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onMenuChange={(open) => { setMenuId(open ? id : undefined) }} onPin={() => { flags.setPinnedSessionIds(ids => toggleSessionId(ids, id)) }} onArchive={() => { void run('archive', () => archiveSession(id as SessionId)) }} onHover={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); showTip({ title, project: group.label, time: updatedAt === undefined ? undefined : formatHoverTime(updatedAt), left: box.left, top: box.top }) }} onLeave={hideTip} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenuId(id) }} onSelectAction={(action) => { if (busy === undefined) dialogs.handleAction(action, id, title) }} />
          })}
        </div>
      })}
    </div>
    <SessionHoverCardLayer />
    <SessionModals t={t} busy={busy} error={error} {...dialogs} setError={setError} />
  </section>
}
