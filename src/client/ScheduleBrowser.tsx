import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, IconArchiveOutline20, IconEllipsisOutline16, IconSettingsOutline16, Menu, Modal, type MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { NS } from './locales.ts'
import { WORKSPACE_TREE_STYLE } from './CodexWorkspaceBrowser.tsx'
import { formatHoverTime, hoverCardAnchor } from './hover-tip.ts'
import { isChannelSession } from './channel-api.ts'
import { groupScheduleSessions, type ScheduleSession } from './schedule-sessions.ts'
import { toggleSessionId } from './session-manager.ts'
import { SessionHoverCardLayer, SessionModals, useBusyAction, useSessionDialogs, useSessionFlags } from './session-row-actions.tsx'
import { HoverShell, useHoverDispatch } from './hover-shell.tsx'
import { GroupHead, SessionRow, sessionMenuItems } from './session-tree.tsx'
import { browserStorage, readTreeExpansionState, SCHEDULE_EXPANSION_STORAGE_KEY, writeTreeExpansionState } from './tree-expansion.ts'
import { archiveScheduleGroup } from './schedule-group-actions.ts'

type OpenMenu = { id: string; x?: number; y?: number }

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
  overviewContent?: ReactNode
  openTaskSettings?: (request: { name: string; sessionIds: string[] }) => void
}

function ScheduleClock() {
  return <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true"><path fill="currentColor" d="M8 1.15A6.85 6.85 0 1 0 8 14.85 6.85 6.85 0 0 0 8 1.15Zm0 1.4a5.45 5.45 0 1 1 0 10.9 5.45 5.45 0 0 1 0-10.9Z" /><path fill="currentColor" d="M8.62 4.35H7.28v4.2l3.02 1.78.67-1.13-2.35-1.39V4.35Z" /></svg>
}

/** 定时树：数据来自会话快照，行/菜单/悬停与任务树共用。 */
export function ScheduleBrowser(props: ScheduleBrowserProps) {
  const [menu, setMenu] = useState<OpenMenu>()
  const [view, setView] = useState<'runs' | 'overview'>('runs')
  if (props.overviewContent === undefined) return <HoverShell blocked={menu !== undefined}><ScheduleBrowserTree {...props} menu={menu} setMenu={setMenu} /></HoverShell>
  return <div className="dcu-schedule-browser">
    <div className="dcu-schedule-views" role="tablist" aria-label={props.t('sidebar.scheduleTab')}>
      <button type="button" role="tab" aria-selected={view === 'runs'} onClick={() => { setMenu(undefined); setView('runs') }}>{props.t('sidebar.runsTab')}</button>
      <button type="button" role="tab" aria-selected={view === 'overview'} onClick={() => { setMenu(undefined); setView('overview') }}>{props.t('sidebar.overviewTab')}</button>
    </div>
    <div className="dcu-schedule-pane">
      {view === 'runs'
        ? <HoverShell blocked={menu !== undefined}><ScheduleBrowserTree {...props} menu={menu} setMenu={setMenu} /></HoverShell>
        : props.overviewContent}
    </div>
  </div>
}

function ScheduleBrowserTree({ openSession, archiveSession, deleteSession, forkSession, renameSession, useSessions, useWorkspaces, t, openTaskSettings, menu, setMenu }: ScheduleBrowserProps & { menu?: OpenMenu; setMenu: (menu?: OpenMenu) => void }) {
  const sessions = useSessions(state => state)
  const workspaces = useWorkspaces(state => state)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => readTreeExpansionState(browserStorage(), SCHEDULE_EXPANSION_STORAGE_KEY))
  const [groupMenu, setGroupMenu] = useState<string>()
  const [archiveGroupTarget, setArchiveGroupTarget] = useState<{ id: string; label: string; sessionIds: string[] }>()
  const flags = useSessionFlags(sessions.current)
  const { showTip, hideTip, dismissTip } = useHoverDispatch()
  const { busy, error, setError, run } = useBusyAction(() => { setMenu(undefined) })
  const dialogs = useSessionDialogs({ archiveSession, deleteSession, forkSession, renameSession }, flags, run, () => { setMenu(undefined); setError(undefined) })
  const groupMenuItems: MenuEntry[] = [
    { id: 'task-settings', label: t('schedule.taskSettings'), icon: <IconSettingsOutline16 size={16} /> },
    { type: 'separator', id: 'group-separator' },
    { id: 'archive-group', label: t('schedule.archiveGroup'), icon: <IconArchiveOutline20 size={16} />, danger: true },
  ]
  useEffect(() => { writeTreeExpansionState(browserStorage(), SCHEDULE_EXPANSION_STORAGE_KEY, expanded) }, [expanded])
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
          <GroupHead
            expanded={isExpanded}
            title={group.label}
            icon={<ScheduleClock />}
            menuOpen={groupMenu === group.id}
            onToggle={() => { setExpanded(current => ({ ...current, [group.id]: !isExpanded })) }}
            actions={<Menu
              open={groupMenu === group.id}
              onClose={() => { setGroupMenu(undefined) }}
              items={groupMenuItems}
              onSelect={(action) => {
                setGroupMenu(undefined)
                if (action === 'task-settings') {
                  setMenu(undefined)
                  openTaskSettings?.({ name: group.label, sessionIds: group.sessions.map(session => session.id) })
                }
                if (action === 'archive-group') {
                  setError(undefined)
                  setArchiveGroupTarget({ id: group.id, label: group.label, sessionIds: group.sessions.map(session => session.id) })
                }
              }}
              portal
              dense
              compact
              anchor={<button type="button" className="dcu-wb-more" aria-label={t('schedule.groupActions', { name: group.label })} onClick={(event) => { event.stopPropagation(); setMenu(undefined); setGroupMenu(current => current === group.id ? undefined : group.id) }}><IconEllipsisOutline16 size={16} /></button>}
            />}
          />
          {isExpanded && group.sessions.map(session => {
            const id = session.id
            const title = session.title
            const pinned = flags.pinnedSessionIds.includes(id)
            const unread = flags.unreadSessionIds.includes(id)
            return <SessionRow key={id} id={id} title={title} selected={sessions.current === id} menuOpen={menu?.id === id} pinned={pinned} unread={unread} running={session.running} t={t} menuItems={sessionMenuItems(t, { pinned, unread })} menuPoint={menu?.id === id && menu.x !== undefined && menu.y !== undefined ? { x: menu.x, y: menu.y } : undefined} onOpen={() => { flags.setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onMenuChange={(open) => { setMenu(open ? { id } : undefined) }} onPin={() => { flags.setPinnedSessionIds(ids => toggleSessionId(ids, id)) }} onArchive={() => { void run('archive', () => archiveSession(id as SessionId)) }} onHover={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); showTip({ title, project: group.label, time: session.updatedAt === undefined ? undefined : formatHoverTime(session.updatedAt), left: box.left, top: box.top }) }} onLeave={hideTip} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenu({ id, x: event.clientX, y: event.clientY }) }} onSelectAction={(action) => { if (busy === undefined) dialogs.handleAction(action, id, title) }} />
          })}
        </div>
      })}
    </div>
    <SessionHoverCardLayer />
    <SessionModals t={t} busy={busy} error={error} {...dialogs} setError={setError} />
    <Modal
      open={archiveGroupTarget !== undefined}
      onClose={() => { if (busy !== 'archive-group') { setArchiveGroupTarget(undefined); setError(undefined) } }}
      closeLabel={t('sessions.close')}
      title={t('schedule.archiveGroup')}
      footer={<div className="dcu-wb-rename-actions">
        <Button variant="outline" disabled={busy === 'archive-group'} onClick={() => { setArchiveGroupTarget(undefined); setError(undefined) }}>{t('sessions.cancel')}</Button>
        <Button variant="outline" className="dcu-wb-delete-button" disabled={busy === 'archive-group'} onClick={() => {
          if (archiveGroupTarget === undefined) return
          const target = archiveGroupTarget
          void run('archive-group', async () => {
            const result = await archiveScheduleGroup(target.sessionIds, id => archiveSession(id as SessionId))
            flags.setPinnedSessionIds(ids => ids.filter(id => !result.archivedIds.includes(id)))
            flags.setUnreadSessionIds(ids => ids.filter(id => !result.archivedIds.includes(id)))
            if (result.failedIds.length > 0) {
              setArchiveGroupTarget({ ...target, sessionIds: result.failedIds })
              throw new Error(t('schedule.archiveGroupPartial', { archived: result.archivedIds.length, failed: result.failedIds.length }))
            }
            setArchiveGroupTarget(undefined)
          })
        }}>{t('schedule.archiveGroupConfirm')}</Button>
      </div>}
    >
      <p className="dcu-wb-delete-copy">{archiveGroupTarget === undefined ? '' : t('schedule.archiveGroupDescription', { name: archiveGroupTarget.label, count: archiveGroupTarget.sessionIds.length })}</p>
      {busy === 'archive-group' && <div className="dcu-wb-error" role="status">{t('schedule.archiveGroupPending')}</div>}
      {error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}
    </Modal>
  </section>
}
