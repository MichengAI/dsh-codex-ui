import { useEffect, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Modal, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import { NS } from './locales.ts'
import { ChannelBrandIcon } from './channel-brand.tsx'
import { loadChannelGroups, type ChannelGroup } from './channel-api.ts'
import { WORKSPACE_TREE_STYLE } from './CodexWorkspaceBrowser.tsx'
import { formatHoverTime, hoverCardAnchor, clampHoverCardPosition } from './hover-tip.ts'
import { readSessionIds, SESSION_PINS_STORAGE_KEY, SESSION_UNREAD_STORAGE_KEY, toggleSessionId, writeSessionIds } from './session-manager.ts'
import { copySessionLink, GroupHead, SessionHoverCard, SessionRow, sessionMenuItems, type SessionHoverTip } from './session-tree.tsx'

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

type DialogTarget = { id: string; title: string }

function storage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

/** 频道树：数据来自 IM，行/菜单/悬停与任务树共用。 */
export function ChannelBrowser({ openSession, archiveSession, deleteSession, forkSession, renameSession, useSessions, t }: ChannelBrowserProps) {
  const sessions = useSessions(state => state)
  const [groups, setGroups] = useState<ChannelGroup[]>([])
  const [error, setError] = useState<string>()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [menuId, setMenuId] = useState<string>()
  const [hoverTip, setHoverTip] = useState<SessionHoverTip>()
  const hideTipTimer = useRef<number>()
  const [renameTarget, setRenameTarget] = useState<DialogTarget>()
  const [deleteTarget, setDeleteTarget] = useState<DialogTarget>()
  const [renameDraft, setRenameDraft] = useState('')
  const [busy, setBusy] = useState<string>()
  const [pinnedSessionIds, setPinnedSessionIds] = useState(() => readSessionIds(storage(), SESSION_PINS_STORAGE_KEY))
  const [unreadSessionIds, setUnreadSessionIds] = useState(() => readSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY))
  useEffect(() => { writeSessionIds(storage(), SESSION_PINS_STORAGE_KEY, pinnedSessionIds) }, [pinnedSessionIds])
  useEffect(() => { writeSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY, unreadSessionIds) }, [unreadSessionIds])
  useEffect(() => {
    const current = sessions.current
    if (current !== undefined) setUnreadSessionIds(ids => ids.filter(id => id !== current))
  }, [sessions.current])
  useEffect(() => {
    let disposed = false
    const load = (): void => {
      void loadChannelGroups().then(next => {
        if (!disposed) { setGroups(next); setError(undefined) }
      }).catch(reason => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason))
      })
    }
    load()
    const timer = window.setInterval(load, 4000)
    return () => { disposed = true; window.clearInterval(timer) }
  }, [])
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
  return <section className="dcu-wb" aria-label={t('sidebar.channelsTab')}>
    <style>{WORKSPACE_TREE_STYLE}</style>
    <div className="dcu-wb-tree" role="tree">
      {error !== undefined && <div className="dcu-wb-error" role="alert">{error}</div>}
      {error === undefined && groups.length === 0 && <div className="dcu-wb-empty">{t('channels.empty')}</div>}
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
            const pinned = pinnedSessionIds.includes(id)
            const unread = unreadSessionIds.includes(id)
            return <SessionRow key={id} id={id} title={title} selected={selected} menuOpen={menuId === id} pinned={pinned} unread={unread} running={running} t={t} menuItems={sessionMenuItems(t, { pinned, unread })} onOpen={() => { setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onMenuChange={(open) => { setMenuId(open ? id : undefined) }} onPin={() => { setPinnedSessionIds(ids => toggleSessionId(ids, id)) }} onArchive={() => { void run('archive', () => archiveSession(id as SessionId)) }} onHover={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); showTip({ title, project: group.label, time: updatedAt === undefined ? undefined : formatHoverTime(updatedAt), left: box.left, top: box.top }) }} onLeave={hideTip} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenuId(id) }} onSelectAction={(action) => {
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
    <Modal open={renameTarget !== undefined} onClose={() => { setRenameTarget(undefined); setError(undefined) }} closeLabel={t('sessions.close')} title={t('sessions.rename')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" onClick={() => { setRenameTarget(undefined) }}>{t('sessions.cancel')}</Button><Button variant="primary" disabled={busy !== undefined || renameDraft.trim() === ''} onClick={() => { if (renameTarget === undefined || renameDraft.trim() === '') return; void run('rename', async () => { await renameSession(renameTarget.id as SessionId, renameDraft.trim()); setRenameTarget(undefined) }) }}>{t('sessions.save')}</Button></div>}><input className="dcu-wb-rename-input" value={renameDraft} autoFocus onFocus={event => { event.target.select() }} onChange={event => { setRenameDraft(event.target.value); setError(undefined) }} onKeyDown={event => { if (event.key === 'Enter' && renameTarget !== undefined && renameDraft.trim() !== '') void run('rename', async () => { await renameSession(renameTarget.id as SessionId, renameDraft.trim()); setRenameTarget(undefined) }) }} />{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
    <Modal open={deleteTarget !== undefined} onClose={() => { if (busy !== 'delete') { setDeleteTarget(undefined); setError(undefined) } }} closeLabel={t('sessions.close')} title={t('sessions.delete')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" disabled={busy === 'delete'} onClick={() => { setDeleteTarget(undefined); setError(undefined) }}>{t('sessions.cancel')}</Button><Button variant="outline" className="dcu-wb-delete-button" disabled={busy === 'delete'} onClick={() => { if (deleteTarget === undefined) return; void run('delete', async () => { await deleteSession(deleteTarget.id as SessionId); setPinnedSessionIds(ids => ids.filter(id => id !== deleteTarget.id)); setUnreadSessionIds(ids => ids.filter(id => id !== deleteTarget.id)); setDeleteTarget(undefined) }) }}>{t('sessions.delete')}</Button></div>}><p className="dcu-wb-delete-copy">{deleteTarget === undefined ? '' : t('sessions.deleteDescription', { name: deleteTarget.title })}</p>{busy === 'delete' && <div className="dcu-wb-error" role="status">{t('sessions.deletePending')}</div>}{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
  </section>
}
