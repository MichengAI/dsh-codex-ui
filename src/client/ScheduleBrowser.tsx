import { useMemo, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { WORKSPACE_TREE_STYLE } from './CodexWorkspaceBrowser.tsx'
import { formatHoverTime, hoverCardAnchor } from './hover-tip.ts'
import { isChannelSession } from './channel-api.ts'
import { groupScheduleSessions, type ScheduleSession } from './schedule-sessions.ts'
import { toggleSessionId } from './session-manager.ts'
import { SessionHoverCardLayer, SessionModals, useBusyAction, useSessionDialogs, useSessionFlags } from './session-row-actions.tsx'
import { HoverShell, useHoverDispatch } from './hover-shell.tsx'
import { GroupHead, SessionRow, sessionMenuItems } from './session-tree.tsx'

type SessionRecord = {
  displayTitle?: string
  title?: string
  updatedAt?: number
  running?: boolean
  origin?: string
  blank?: boolean
}

type SessionStore = {
  current?: string
  ids?: readonly string[]
  byId: Record<string, SessionRecord>
}

type WorkspaceStore = {
  archivedSessionIds?: readonly string[]
}

type ScheduleBrowserProps = {
  openSession: (sessionId: SessionId) => void
  archiveSession: (sessionId: SessionId) => Promise<void>
  deleteSession: (sessionId: SessionId) => Promise<void>
  forkSession: (sessionId: SessionId) => Promise<void>
  renameSession: (sessionId: SessionId, title: string) => Promise<void>
  useSessions: (selector: (state: SessionStore) => SessionStore) => SessionStore
  useWorkspaces: (selector: (state: WorkspaceStore) => WorkspaceStore) => WorkspaceStore
  t: TranslateNS<typeof NS>
}

function ScheduleClock() {
  return <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true"><path fill="currentColor" d="M8 1.15A6.85 6.85 0 1 0 8 14.85 6.85 6.85 0 0 0 8 1.15Zm0 1.4a5.45 5.45 0 1 1 0 10.9 5.45 5.45 0 0 1 0-10.9Z" /><path fill="currentColor" d="M8.62 4.35H7.28v4.2l3.02 1.78.67-1.13-2.35-1.39V4.35Z" /></svg>
}

/** 定时树：数据来自会话快照，行/菜单/悬停与任务树共用。 */
export function ScheduleBrowser(props: ScheduleBrowserProps) {
  const [menuId, setMenuId] = useState<string>()
  return <HoverShell blocked={menuId !== undefined}><ScheduleBrowserTree {...props} menuId={menuId} setMenuId={setMenuId} /></HoverShell>
}

function ScheduleBrowserTree({ openSession, archiveSession, deleteSession, forkSession, renameSession, useSessions, useWorkspaces, t, menuId, setMenuId }: ScheduleBrowserProps & { menuId?: string; setMenuId: (id?: string) => void }) {
  const sessions = useSessions(state => state)
  const workspaces = useWorkspaces(state => state)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const flags = useSessionFlags(sessions.current)
  const { showTip, hideTip, dismissTip } = useHoverDispatch()
  const { busy, error, setError, run } = useBusyAction(() => { setMenuId(undefined) })
  const dialogs = useSessionDialogs({ archiveSession, deleteSession, forkSession, renameSession }, flags, run, () => { setMenuId(undefined); setError(undefined) })
  const groups = useMemo(() => {
    const archived = new Set(workspaces.archivedSessionIds ?? [])
    const items: ScheduleSession[] = (sessions.ids ?? Object.keys(sessions.byId)).flatMap(id => {
      const session = sessions.byId[id]
      if (session === undefined || archived.has(id) || session.blank === true || session.origin === 'im' || session.origin === 'subagent' || isChannelSession(id)) return []
      return [{ id, title: session.displayTitle ?? session.title ?? id, updatedAt: session.updatedAt, running: session.running === true }]
    })
    return groupScheduleSessions(items)
  }, [sessions.byId, sessions.ids, workspaces.archivedSessionIds])
  return <section className="dcu-wb" aria-label={t('sidebar.scheduleTab')}>
    <style>{WORKSPACE_TREE_STYLE}</style>
    <div className="dcu-wb-tree" role="tree">
      {error !== undefined && <div className="dcu-wb-error" role="alert">{error}</div>}
      {groups.length === 0 && <div className="dcu-wb-empty">{t('schedule.empty')}</div>}
      {groups.map(group => {
        const isExpanded = expanded[group.id] ?? true
        return <div className="dcu-wb-project" key={group.id}>
          <GroupHead expanded={isExpanded} title={group.label} icon={<ScheduleClock />} onToggle={() => { setExpanded(current => ({ ...current, [group.id]: !isExpanded })) }} />
          {isExpanded && group.sessions.map(session => {
            const id = session.id
            const title = session.title
            const pinned = flags.pinnedSessionIds.includes(id)
            const unread = flags.unreadSessionIds.includes(id)
            return <SessionRow key={id} id={id} title={title} selected={sessions.current === id} menuOpen={menuId === id} pinned={pinned} unread={unread} running={session.running} t={t} menuItems={sessionMenuItems(t, { pinned, unread })} onOpen={() => { flags.setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onMenuChange={(open) => { setMenuId(open ? id : undefined) }} onPin={() => { flags.setPinnedSessionIds(ids => toggleSessionId(ids, id)) }} onArchive={() => { void run('archive', () => archiveSession(id as SessionId)) }} onHover={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); showTip({ title, project: group.label, time: session.updatedAt === undefined ? undefined : formatHoverTime(session.updatedAt), left: box.left, top: box.top }) }} onLeave={hideTip} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenuId(id) }} onSelectAction={(action) => { if (busy === undefined) dialogs.handleAction(action, id, title) }} />
          })}
        </div>
      })}
    </div>
    <SessionHoverCardLayer />
    <SessionModals t={t} busy={busy} error={error} {...dialogs} setError={setError} />
  </section>
}
