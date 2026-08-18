import { useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Modal, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import { NS } from './locales.ts'
import { WORKSPACE_TREE_STYLE } from './CodexWorkspaceBrowser.tsx'
import { formatHoverTime, hoverCardAnchor, clampHoverCardPosition } from './hover-tip.ts'
import { readSessionIds, SESSION_PINS_STORAGE_KEY, SESSION_UNREAD_STORAGE_KEY, toggleSessionId, writeSessionIds } from './session-manager.ts'
import { isChannelSession } from './channel-api.ts'
import { groupScheduleSessions, type ScheduleSession } from './schedule-sessions.ts'
import { copySessionLink, GroupHead, SessionHoverCard, SessionRow, sessionMenuItems, type SessionHoverTip } from './session-tree.tsx'

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

type DialogTarget = { id: string; title: string }

function storage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

function ScheduleClock() {
  return <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true"><path fill="currentColor" d="M8 1.15A6.85 6.85 0 1 0 8 14.85 6.85 6.85 0 0 0 8 1.15Zm0 1.4a5.45 5.45 0 1 1 0 10.9 5.45 5.45 0 0 1 0-10.9Z" /><path fill="currentColor" d="M8.62 4.35H7.28v4.2l3.02 1.78.67-1.13-2.35-1.39V4.35Z" /></svg>
}

/** 定时树：数据来自会话快照，行/菜单/悬停与任务树共用。 */
export function ScheduleBrowser({ openSession, archiveSession, deleteSession, forkSession, renameSession, useSessions, useWorkspaces, t }: ScheduleBrowserProps) {
  const sessions = useSessions(state => state)
  const workspaces = useWorkspaces(state => state)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [menuId, setMenuId] = useState<string>()
  const [hoverTip, setHoverTip] = useState<SessionHoverTip>()
  const hideTipTimer = useRef<number>()
  const [renameTarget, setRenameTarget] = useState<DialogTarget>()
  const [deleteTarget, setDeleteTarget] = useState<DialogTarget>()
  const [renameDraft, setRenameDraft] = useState('')
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const [pinnedSessionIds, setPinnedSessionIds] = useState(() => readSessionIds(storage(), SESSION_PINS_STORAGE_KEY))
  const [unreadSessionIds, setUnreadSessionIds] = useState(() => readSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY))
  useEffect(() => { writeSessionIds(storage(), SESSION_PINS_STORAGE_KEY, pinnedSessionIds) }, [pinnedSessionIds])
  useEffect(() => { writeSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY, unreadSessionIds) }, [unreadSessionIds])
  useEffect(() => {
    const current = sessions.current
    if (current !== undefined) setUnreadSessionIds(ids => ids.filter(id => id !== current))
  }, [sessions.current])
  const groups = useMemo(() => {
    const archived = new Set(workspaces.archivedSessionIds ?? [])
    const items: ScheduleSession[] = (sessions.ids ?? Object.keys(sessions.byId)).flatMap(id => {
      const session = sessions.byId[id]
      if (session === undefined || archived.has(id) || session.blank === true || session.origin === 'im' || session.origin === 'subagent' || isChannelSession(id)) return []
      return [{ id, title: session.displayTitle ?? session.title ?? id, updatedAt: session.updatedAt, running: session.running === true }]
    })
    return groupScheduleSessions(items)
  }, [sessions, workspaces.archivedSessionIds])
  const showTip = (tip: SessionHoverTip): void => {
    if (menuId !== undefined) return
    if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
    setHoverTip({ ...tip, ...clampHoverCardPosition(tip.left, tip.top, 248, 148, window.innerWidth, window.innerHeight) })
  }
  const hideTip = (): void => { hideTipTimer.current = window.setTimeout(() => { setHoverTip(undefined) }, 120) }
  const dismissTip = (): void => {
    if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
    setHoverTip(undefined)
  }
  const run = async (key: string, action: () => Promise<unknown>): Promise<void> => {
    setBusy(key)
    setError(undefined)
    try { await action(); setMenuId(undefined) } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) } finally { setBusy(undefined) }
  }
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
            const pinned = pinnedSessionIds.includes(id)
            const unread = unreadSessionIds.includes(id)
            return <SessionRow key={id} id={id} title={title} selected={sessions.current === id} menuOpen={menuId === id} pinned={pinned} unread={unread} running={session.running} t={t} menuItems={sessionMenuItems(t, { pinned, unread })} onOpen={() => { setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onMenuChange={(open) => { setMenuId(open ? id : undefined) }} onPin={() => { setPinnedSessionIds(ids => toggleSessionId(ids, id)) }} onArchive={() => { void run('archive', () => archiveSession(id as SessionId)) }} onHover={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); showTip({ title, project: group.label, time: session.updatedAt === undefined ? undefined : formatHoverTime(session.updatedAt), left: box.left, top: box.top }) }} onLeave={hideTip} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenuId(id) }} onSelectAction={(action) => {
              if (busy !== undefined) return
              if (action === 'rename') { setRenameTarget({ id, title }); setRenameDraft(title); setMenuId(undefined) }
              if (action === 'pin') { setPinnedSessionIds(ids => toggleSessionId(ids, id)); setMenuId(undefined) }
              if (action === 'unread') { setUnreadSessionIds(ids => toggleSessionId(ids, id)); setMenuId(undefined) }
              if (action === 'archive') void run('archive', () => archiveSession(id as SessionId))
              if (action === 'delete') { setDeleteTarget({ id, title }); setError(undefined); setMenuId(undefined) }
              if (action === 'fork') void run('fork', () => forkSession(id as SessionId))
              if (action === 'copyTitle') void run('copy', async () => { await writeClipboard(title) })
              if (action === 'copyId') void run('copy', async () => { await writeClipboard(id) })
              if (action === 'copyLink') void run('copy', async () => { await writeClipboard(copySessionLink(id)) })
            }} />
          })}
        </div>
      })}
    </div>
    {hoverTip !== undefined && <SessionHoverCard tip={hoverTip} onEnter={() => { if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current) }} onLeave={hideTip} />}
    <Modal open={renameTarget !== undefined} onClose={() => { setRenameTarget(undefined); setError(undefined) }} closeLabel={t('sessions.close')} title={t('sessions.rename')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" onClick={() => { setRenameTarget(undefined) }}>{t('sessions.cancel')}</Button><Button variant="primary" disabled={busy !== undefined || renameDraft.trim() === ''} onClick={() => { if (renameTarget === undefined || renameDraft.trim() === '') return; void run('rename', async () => { await renameSession(renameTarget.id as SessionId, renameDraft.trim()); setRenameTarget(undefined) }) }}>{t('sessions.save')}</Button></div>}><input className="dcu-wb-rename-input" value={renameDraft} autoFocus onFocus={event => { event.target.select() }} onChange={event => { setRenameDraft(event.target.value); setError(undefined) }} />{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
    <Modal open={deleteTarget !== undefined} onClose={() => { if (busy !== 'delete') { setDeleteTarget(undefined); setError(undefined) } }} closeLabel={t('sessions.close')} title={t('sessions.delete')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" disabled={busy === 'delete'} onClick={() => { setDeleteTarget(undefined); setError(undefined) }}>{t('sessions.cancel')}</Button><Button variant="outline" className="dcu-wb-delete-button" disabled={busy === 'delete'} onClick={() => { if (deleteTarget === undefined) return; void run('delete', async () => { await deleteSession(deleteTarget.id as SessionId); setPinnedSessionIds(ids => ids.filter(id => id !== deleteTarget.id)); setUnreadSessionIds(ids => ids.filter(id => id !== deleteTarget.id)); setDeleteTarget(undefined) }) }}>{t('sessions.delete')}</Button></div>}><p className="dcu-wb-delete-copy">{deleteTarget === undefined ? '' : t('sessions.deleteDescription', { name: deleteTarget.title })}</p>{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
  </section>
}

