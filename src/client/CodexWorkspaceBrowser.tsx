import { useEffect, useMemo, useState } from 'react'
import type { SessionId, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  Button,
  IconArchiveOutline20,
  IconBranchOutline16,
  IconCopyOutline16,
  IconEditOutline16,
  IconEllipsisOutline16,
  IconFolderClose16,
  IconFolderOpenOutline16,
  IconGoalOutline16,
  IconLinkOutline16,
  IconPlusOutline16,
  IconShareOutline16,
  IconTrashOutline16,
  Menu,
  Modal,
  writeClipboard,
  type MenuEntry,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { NS } from './locales.ts'
import { readPinnedWorkspaceIds, savePinnedWorkspaceIds, togglePinnedWorkspace } from './pinned-workspaces.ts'
import {
  readSessionIds,
  SESSION_PINS_STORAGE_KEY,
  SESSION_UNREAD_STORAGE_KEY,
  sessionDeepLink,
  toggleSessionId,
  writeSessionIds,
} from './session-manager.ts'
import { moveBefore, visibleSessionIds } from './workspace-browser.ts'

type BrowserInjected = {
  archiveSession: (sessionId: SessionId) => Promise<void>
  deleteSession: (sessionId: SessionId) => Promise<void>
  deleteWorkspace: (workspaceId: WorkspaceId) => Promise<void>
  forkSession: (sessionId: SessionId) => Promise<void>
  insertSessionBefore: (workspaceId: WorkspaceId, sessionId: SessionId, beforeSessionId?: SessionId) => Promise<unknown>
  insertWorkspaceBefore: (workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId) => Promise<unknown>
  openPath: (path: string) => Promise<void>
  openSession: (sessionId: SessionId) => void
  renameSession: (sessionId: SessionId, title: string) => Promise<void>
  renameWorkspace: (workspaceId: WorkspaceId, title: string) => Promise<unknown>
  startSession: (workspaceId?: WorkspaceId) => void
}

type CodexWorkspaceBrowserProps = PropsRuntime<'sidebar.workspaces'> & PropsLocale<typeof NS> & BrowserInjected
type MenuState = { id: string; type: 'workspace' | 'session' } | undefined
type RenameTarget = { id: string; kind: 'workspace' | 'session'; title: string } | undefined
type DeleteTarget = { id: string; kind: 'workspace' | 'session'; title: string } | undefined

const stylesheet = `
.dcu-wb{--dcu-wb-inset:10px;display:flex;flex:1;min-height:0;flex-direction:column;padding:4px var(--dcu-wb-inset) 8px;color:var(--dcu-sidebar-primary)}
.dcu-wb *{box-sizing:border-box}
.dcu-wb-tree{flex:1;min-height:0;overflow-y:auto;padding-bottom:16px;scrollbar-gutter:stable}
.dcu-wb-section+.dcu-wb-section{margin-top:10px}
.dcu-wb-section-label{display:flex;align-items:center;min-height:28px;padding:0 6px;color:var(--dcu-sidebar-secondary);font-size:12px;font-weight:650}
.dcu-wb-project{position:relative}
.dcu-wb-project-head,.dcu-wb-session{display:flex;align-items:center;gap:6px;width:100%;border-radius:8px;padding:0 8px;color:var(--dcu-sidebar-primary);cursor:pointer}
.dcu-wb-project-head{height:34px;background:transparent;font:inherit;text-align:left}
.dcu-wb-project-head:hover,.dcu-wb-project-head.dcu-wb-menu-open,.dcu-wb-session:hover,.dcu-wb-session.dcu-wb-selected,.dcu-wb-session.dcu-wb-menu-open{background:var(--dcu-sidebar-hover)}
.dcu-wb-project-head[draggable=true],.dcu-wb-session[draggable=true]{cursor:grab}
.dcu-wb-project-head[draggable=true]:active,.dcu-wb-session[draggable=true]:active{cursor:grabbing}
.dcu-wb-project-head.dcu-wb-drop,.dcu-wb-session.dcu-wb-drop{box-shadow:inset 0 2px var(--dsw-alias-state-business-primary)}
.dcu-wb-folder{display:grid;place-items:center;flex:none;width:16px;height:20px;color:var(--dcu-sidebar-icon)}
.dcu-wb-project-current .dcu-wb-folder{color:var(--dsw-alias-state-business-primary)}
.dcu-wb-project-title,.dcu-wb-session-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px}
.dcu-wb-project-title{flex:1;font-weight:550}
.dcu-wb-session{position:relative;min-height:32px;gap:0;padding-left:32px}
.dcu-wb-session-title{flex:1;margin-left:0}
.dcu-wb-pin{display:grid;place-items:center;flex:none;width:16px;height:20px;margin-left:6px;color:var(--dcu-sidebar-tertiary)}
.dcu-wb-pin svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.4}
.dcu-wb-time{flex:none;color:var(--dcu-sidebar-tertiary);font-size:12px;line-height:20px}
.dcu-wb-actions{display:none;align-items:center;gap:8px;flex:none}
.dcu-wb-quick-actions{display:none;align-items:center;gap:2px;flex:none}
.dcu-wb-project-head:hover .dcu-wb-actions,.dcu-wb-project-head.dcu-wb-menu-open .dcu-wb-actions,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-actions{display:flex}
.dcu-wb-session:hover .dcu-wb-quick-actions,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-quick-actions{display:flex}
.dcu-wb-session:hover .dcu-wb-time,.dcu-wb-session:hover .dcu-wb-unread,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-time,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-unread{display:none}
.dcu-wb-more{display:grid;place-items:center;width:20px;height:20px;border:0;border-radius:4px;padding:0;background:transparent;color:var(--dcu-sidebar-tertiary);cursor:pointer}
.dcu-wb-more:hover{color:var(--dcu-sidebar-primary)}
.dcu-wb-unread{flex:none;width:7px;height:7px;margin-left:8px;margin-right:8px;border-radius:50%;background:var(--dsw-alias-state-business-primary)}
.dcu-wb-empty{padding:14px 8px;color:var(--dcu-sidebar-tertiary);font-size:13px}
.dcu-wb-error{margin:4px 0;padding:6px 8px;border-radius:6px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px}
.dcu-wb-rail{display:none}
.dcu-wb-rename-actions{display:flex;justify-content:flex-end;gap:8px}
.dcu-wb-delete-button{color:var(--dsw-alias-state-error-primary)!important}
.dcu-wb-delete-copy{margin:0;color:var(--dcu-sidebar-secondary);font-size:13px;line-height:20px}
.dcu-wb-rename-input{width:100%;height:44px;border:1px solid var(--dcu-sidebar-border);border-radius:22px;padding:7px 14px;outline:0;background:transparent;color:var(--dcu-sidebar-primary);font:inherit}
.dcu-wb-rename-input:focus{border-color:var(--dsw-alias-button-info-fill)}
`

const runningStyles = `.dcu-wb-running{flex:none;width:12px;height:12px;border:2px solid color-mix(in srgb,var(--dcu-sidebar-secondary) 25%,transparent);border-top-color:var(--dcu-sidebar-secondary);border-radius:50%;animation:dcu-wb-spin .8s linear infinite}@keyframes dcu-wb-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.dcu-wb-running{animation:none}}`

const typographyStyles = `.dcu-wb{font:14px/20px var(--dcu-font,var(--dsw-font-family))}.dcu-wb-section-label{color:var(--dcu-sidebar-tertiary);font-size:12px;font-weight:500}.dcu-wb-project-title{font-weight:500}.dcu-wb-session-title{font-size:14px;line-height:20px;font-weight:400;color:var(--dcu-sidebar-primary)}.dcu-wb-time{color:var(--dcu-sidebar-secondary);font-size:12px;line-height:20px}.dcu-wb-empty{color:var(--dcu-sidebar-tertiary);font-size:12px;line-height:18px}`

function storage(): Storage | undefined { return typeof window === 'undefined' ? undefined : window.localStorage }

function browserBase(): string {
  return typeof window === 'undefined' || window.location.origin === 'null' ? 'http://dsh.internal/' : `${window.location.origin}/`
}

function relativeTime(updatedAt: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - updatedAt) / 1000))
  if (seconds < 60) return '刚刚'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`
  return `${Math.floor(seconds / 86400)} 天前`
}

/** 插件自有的工作区树：复刻原生层级和拖拽行为，并在每个会话菜单中增加管理操作。 */
export function CodexWorkspaceBrowser({ wide, useSessions, useWorkspaces, t, archiveSession, deleteSession, deleteWorkspace, forkSession, insertSessionBefore, insertWorkspaceBefore, openPath, openSession, renameSession, renameWorkspace, startSession }: CodexWorkspaceBrowserProps) {
  const sessions = useSessions(state => state)
  const workspaces = useWorkspaces(state => state)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [pinnedWorkspaceIds, setPinnedWorkspaceIds] = useState(() => readPinnedWorkspaceIds(storage()))
  const [pinnedSessionIds, setPinnedSessionIds] = useState(() => readSessionIds(storage(), SESSION_PINS_STORAGE_KEY))
  const [unreadSessionIds, setUnreadSessionIds] = useState(() => readSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY))
  const [menu, setMenu] = useState<MenuState>()
  const [renameTarget, setRenameTarget] = useState<RenameTarget>()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>()
  const [renameDraft, setRenameDraft] = useState('')
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const [workspaceDragId, setWorkspaceDragId] = useState<string>()
  const [workspaceDropId, setWorkspaceDropId] = useState<string>()
  const [sessionDrag, setSessionDrag] = useState<{ sessionId: string; workspaceId: string }>()
  const [sessionDropId, setSessionDropId] = useState<string>()

  useEffect(() => { savePinnedWorkspaceIds(storage(), pinnedWorkspaceIds) }, [pinnedWorkspaceIds])
  useEffect(() => { writeSessionIds(storage(), SESSION_PINS_STORAGE_KEY, pinnedSessionIds) }, [pinnedSessionIds])
  useEffect(() => { writeSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY, unreadSessionIds) }, [unreadSessionIds])
  useEffect(() => {
    const valid = new Set(workspaces.items.map(workspace => String(workspace.workspaceId)))
    setPinnedWorkspaceIds(ids => ids.filter(id => valid.has(id)))
  }, [workspaces.items])
  useEffect(() => {
    const current = sessions.current
    if (current !== undefined) setUnreadSessionIds(ids => ids.filter(id => id !== current))
  }, [sessions.current])

  const groups = useMemo(() => {
    const archived = workspaces.archivedSessionIds
    const visible = (ids: readonly string[]) => visibleSessionIds(ids, sessions.byId, archived).sort((left, right) => {
      const leftPinned = pinnedSessionIds.indexOf(left)
      const rightPinned = pinnedSessionIds.indexOf(right)
      if (leftPinned !== -1 || rightPinned !== -1) return (leftPinned === -1 ? Number.MAX_SAFE_INTEGER : leftPinned) - (rightPinned === -1 ? Number.MAX_SAFE_INTEGER : rightPinned)
      return 0
    })
    const items = workspaces.items.map(workspace => ({ ...workspace, visibleIds: visible(workspace.sessionIds) }))
    return { items }
  }, [pinnedSessionIds, sessions.byId, sessions.ids, workspaces.archivedSessionIds, workspaces.items])

  const projectPinned = (id: WorkspaceId | string): boolean => pinnedWorkspaceIds.includes(String(id))
  const pinnedGroups = groups.items.filter(workspace => projectPinned(workspace.workspaceId))
  const regularGroups = groups.items.filter(workspace => !projectPinned(workspace.workspaceId))
  const run = async (key: string, action: () => Promise<unknown>): Promise<void> => {
    setBusy(key)
    setError(undefined)
    try { await action(); setMenu(undefined) } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) } finally { setBusy(undefined) }
  }
  const beginRename = (kind: NonNullable<RenameTarget>['kind'], id: string, title: string): void => { setRenameTarget({ kind, id, title }); setRenameDraft(title); setMenu(undefined) }
  const submitRename = (): void => {
    if (renameTarget === undefined || renameDraft.trim() === '') return
    void run('rename', async () => {
      if (renameTarget.kind === 'workspace') await renameWorkspace(renameTarget.id as WorkspaceId, renameDraft.trim())
      else await renameSession(renameTarget.id as SessionId, renameDraft.trim())
      setRenameTarget(undefined)
    })
  }
  const submitDelete = (): void => {
    if (deleteTarget === undefined) return
    const target = deleteTarget
    const operation = target.kind === 'session' ? 'delete-session' : 'delete-workspace'
    void run(operation, async () => {
      if (target.kind === 'session') {
        await deleteSession(target.id as SessionId)
        setPinnedSessionIds(ids => ids.filter(id => id !== target.id))
        setUnreadSessionIds(ids => ids.filter(id => id !== target.id))
      } else {
        await deleteWorkspace(target.id as WorkspaceId)
        setPinnedWorkspaceIds(ids => ids.filter(id => id !== target.id))
      }
      setDeleteTarget(undefined)
    })
  }
  const copy = (value: string | undefined): void => {
    if (value === undefined || value === '') return
    void run('copy', async () => { await writeClipboard(value) })
  }
  const toggleGroup = (workspaceId: string): void => {
    setExpanded(current => ({ ...current, [workspaceId]: !(current[workspaceId] ?? true) }))
  }
  const projectMenu = (workspace: (typeof groups.items)[number]): MenuEntry[] => [
    { id: 'new', label: t('workspace.newSession'), icon: <IconPlusOutline16 size={16} /> },
    { id: 'rename', label: t('workspace.rename'), icon: <IconEditOutline16 size={16} /> },
    { id: 'pin', label: t(projectPinned(workspace.workspaceId) ? 'workspace.unpin' : 'workspace.pin'), icon: <IconGoalOutline16 size={16} /> },
    { id: 'openPath', label: t('workspace.openPath'), icon: <IconFolderOpenOutline16 size={16} /> },
    { type: 'separator', id: 'project-separator' },
    { id: 'delete', label: t('workspace.delete'), icon: <IconTrashOutline16 size={16} />, danger: true },
  ]
  const sessionMenu = (sessionId: string, title: string, path: string | undefined): MenuEntry[] => {
    const pinned = pinnedSessionIds.includes(sessionId)
    const unread = unreadSessionIds.includes(sessionId)
    return [
      { id: 'rename', label: t('sessions.rename'), icon: <IconEditOutline16 size={16} /> },
      { id: 'pin', label: t(pinned ? 'sessions.unpin' : 'sessions.pin'), icon: <IconGoalOutline16 size={16} /> },
      { id: 'unread', label: t(unread ? 'sessions.markRead' : 'sessions.markUnread'), icon: <span className="dcu-wb-unread" /> },
      { id: 'archive', label: t('sessions.archive'), icon: <IconArchiveOutline20 size={16} /> },
      { type: 'separator', id: 'main-separator' },
      { id: 'fork', label: t('sessions.fork'), icon: <IconBranchOutline16 size={16} /> },
      { type: 'separator', id: 'copy-separator' },
      { id: 'openPath', label: t('sessions.openPath'), icon: <IconFolderOpenOutline16 size={16} />, disabled: path === undefined },
      { id: 'copyPath', label: t('sessions.copyPath'), icon: <IconCopyOutline16 size={16} />, disabled: path === undefined },
      { id: 'copyTitle', label: t('sessions.copyTitle'), icon: <IconCopyOutline16 size={16} /> },
      { id: 'copyId', label: t('sessions.copyId'), icon: <IconLinkOutline16 size={16} /> },
      { id: 'copyLink', label: t('sessions.copyLink'), icon: <IconShareOutline16 size={16} /> },
      { type: 'separator', id: 'delete-separator' },
      { id: 'delete', label: t('sessions.delete'), icon: <IconTrashOutline16 size={16} />, danger: true },
    ]
  }
  const renderGroup = (workspace: (typeof groups.items)[number]) => {
    const isExpanded = expanded[workspace.workspaceId] ?? true
    const menuOpen = menu?.type === 'workspace' && menu.id === workspace.workspaceId
    const isCurrentWorkspace = sessions.current !== undefined && workspace.visibleIds.includes(sessions.current)
    return <div className={`dcu-wb-project${isCurrentWorkspace ? ' dcu-wb-project-current' : ''}`} key={workspace.workspaceId} onDragOver={(event) => { if (workspaceDragId === undefined) return; event.preventDefault(); setWorkspaceDropId(workspace.workspaceId) }} onDrop={(event) => { event.preventDefault(); const dragged = workspaceDragId; setWorkspaceDragId(undefined); setWorkspaceDropId(undefined); if (dragged !== undefined && dragged !== workspace.workspaceId && moveBefore(groups.items.map(item => String(item.workspaceId)), dragged, String(workspace.workspaceId)).join() !== groups.items.map(item => String(item.workspaceId)).join()) void run('workspace-order', () => insertWorkspaceBefore(dragged as WorkspaceId, workspace.workspaceId)) }}>
      <div className={`dcu-wb-project-head${menuOpen ? ' dcu-wb-menu-open' : ''}${workspaceDropId === workspace.workspaceId ? ' dcu-wb-drop' : ''}`} role="treeitem" aria-expanded={isExpanded} tabIndex={0} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setWorkspaceDragId(workspace.workspaceId) }} onDragEnd={() => { setWorkspaceDragId(undefined); setWorkspaceDropId(undefined) }} onClick={() => { toggleGroup(workspace.workspaceId) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleGroup(workspace.workspaceId) } }}>
        <span className="dcu-wb-folder">{isExpanded ? <IconFolderOpenOutline16 size={16} /> : <IconFolderClose16 size={16} />}</span><span className="dcu-wb-project-title" title={workspace.path}>{workspace.title}</span><span className="dcu-wb-actions"><Menu open={menuOpen} onClose={() => { setMenu(undefined) }} items={projectMenu(workspace)} onSelect={(id) => { if (busy !== undefined) return; if (id === 'new') { startSession(workspace.workspaceId); setMenu(undefined) }; if (id === 'rename') beginRename('workspace', workspace.workspaceId, workspace.title); if (id === 'pin') { setPinnedWorkspaceIds(ids => togglePinnedWorkspace(ids, workspace.workspaceId)); setMenu(undefined) }; if (id === 'openPath') void run('open-path', () => openPath(workspace.path)); if (id === 'delete') { setDeleteTarget({ id: workspace.workspaceId, kind: 'workspace', title: workspace.title }); setError(undefined); setMenu(undefined) } }} portal dense compact anchor={<button type="button" className="dcu-wb-more" aria-label={t('workspace.actions', { name: workspace.title })} onClick={(event) => { event.stopPropagation(); setMenu(current => current?.id === workspace.workspaceId && current.type === 'workspace' ? undefined : { id: workspace.workspaceId, type: 'workspace' }) }}><IconEllipsisOutline16 size={16} /></button>} /></span><span className="dcu-wb-actions"><button type="button" className="dcu-wb-more" aria-label={t('workspace.newSession')} onClick={(event) => { event.stopPropagation(); startSession(workspace.workspaceId) }}><IconPlusOutline16 size={16} /></button></span>
      </div>
      {isExpanded && workspace.visibleIds.map((id) => {
        const session = sessions.byId[id as SessionId]
        if (session === undefined) return null
        const path = session.cwd ?? workspace.path
        const selected = sessions.current === id
        const sessionMenuOpen = menu?.type === 'session' && menu.id === id
        return <div key={id} className={`dcu-wb-session${selected ? ' dcu-wb-selected' : ''}${sessionMenuOpen ? ' dcu-wb-menu-open' : ''}${sessionDropId === id ? ' dcu-wb-drop' : ''}`} role="treeitem" aria-selected={selected} draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; setSessionDrag({ sessionId: id, workspaceId: workspace.workspaceId }) }} onDragEnd={() => { setSessionDrag(undefined); setSessionDropId(undefined) }} onDragOver={(event) => { if (sessionDrag?.workspaceId !== workspace.workspaceId) return; event.preventDefault(); setSessionDropId(id) }} onDrop={(event) => { event.preventDefault(); const drag = sessionDrag; setSessionDrag(undefined); setSessionDropId(undefined); if (drag !== undefined && drag.sessionId !== id && moveBefore(workspace.visibleIds, drag.sessionId, id).join() !== workspace.visibleIds.join()) void run('session-order', () => insertSessionBefore(workspace.workspaceId, drag.sessionId as SessionId, id as SessionId)) }} onClick={() => { setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); setMenu({ id, type: 'session' }) }}><span className="dcu-wb-session-title">{session.displayTitle}</span>{pinnedSessionIds.includes(id) && <span className="dcu-wb-pin" aria-label={t('sessions.pinned')} title={t('sessions.pinned')}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.5h6M5 2.5v2L3.75 6v1h8.5V6L11 4.5v-2M8 7v6" /></svg></span>}{unreadSessionIds.includes(id) ? <span className="dcu-wb-unread" aria-label={t('sessions.unread')} /> : session.running ? <span className="dcu-wb-running" aria-hidden="true" /> : <span className="dcu-wb-time">{relativeTime(session.updatedAt)}</span>}<span className="dcu-wb-quick-actions"><button type="button" className="dcu-wb-more" aria-label={t(pinnedSessionIds.includes(id) ? 'sessions.unpin' : 'sessions.pin')} title={t(pinnedSessionIds.includes(id) ? 'sessions.unpin' : 'sessions.pin')} onClick={(event) => { event.stopPropagation(); setPinnedSessionIds(ids => toggleSessionId(ids, id)) }}><IconGoalOutline16 size={16} /></button><button type="button" className="dcu-wb-more" aria-label={t('sessions.archive')} title={t('sessions.archive')} onClick={(event) => { event.stopPropagation(); void run('archive', () => archiveSession(id as SessionId)) }}><IconArchiveOutline20 size={16} /></button></span><span className="dcu-wb-actions"><Menu open={sessionMenuOpen} onClose={() => { setMenu(undefined) }} items={sessionMenu(id, session.displayTitle, path)} onSelect={(action) => { if (busy !== undefined) return; const link = sessionDeepLink(browserBase(), id); if (action === 'rename') beginRename('session', id, session.displayTitle); if (action === 'pin') { setPinnedSessionIds(ids => toggleSessionId(ids, id)); setMenu(undefined) }; if (action === 'unread') { setUnreadSessionIds(ids => toggleSessionId(ids, id)); setMenu(undefined) }; if (action === 'archive') void run('archive', () => archiveSession(id as SessionId)); if (action === 'delete') { setDeleteTarget({ id, kind: 'session', title: session.displayTitle }); setError(undefined); setMenu(undefined) }; if (action === 'fork') void run('fork', () => forkSession(id as SessionId)); if (action === 'openPath' && path !== undefined) void run('open-path', () => openPath(path)); if (action === 'copyPath') copy(path); if (action === 'copyTitle') copy(session.displayTitle); if (action === 'copyId') copy(id); if (action === 'copyLink') copy(link) }} portal dense compact anchor={<button type="button" className="dcu-wb-more" aria-label={t('sessions.actions', { name: session.displayTitle })} onClick={(event) => { event.stopPropagation(); setMenu(current => current?.id === id && current.type === 'session' ? undefined : { id, type: 'session' }) }}><IconEllipsisOutline16 size={16} /></button>} /></span></div>
      })}
    </div>
  }

  if (!wide) return <div className="dcu-wb dcu-wb-rail"><style>{stylesheet}</style></div>
  return <section className="dcu-wb" aria-label={t('workspace.label')}>
    <style>{stylesheet}{runningStyles}{typographyStyles}</style>
    {error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}
    <div className="dcu-wb-tree" role="tree">
      <section className="dcu-wb-section" aria-label={t('workspace.pinned')} onDragOver={(event) => { if (workspaceDragId !== undefined) event.preventDefault() }} onDrop={(event) => { event.preventDefault(); const dragged = workspaceDragId; setWorkspaceDragId(undefined); if (dragged !== undefined) setPinnedWorkspaceIds(ids => ids.includes(dragged) ? ids : [dragged, ...ids]) }}>
        <div className="dcu-wb-section-label">{t('workspace.pinned')}</div>
        {pinnedGroups.length > 0 ? pinnedGroups.map(renderGroup) : <div className="dcu-wb-empty">{t('workspace.pinnedEmpty')}</div>}
      </section>
      <section className="dcu-wb-section" aria-label={t('workspace.projects')}>
        <div className="dcu-wb-section-label">{t('workspace.projects')}</div>
        {regularGroups.map(renderGroup)}
        {regularGroups.length === 0 && <div className="dcu-wb-empty">{t('workspace.empty')}</div>}
      </section>
    </div>
    <Modal open={renameTarget !== undefined} onClose={() => { setRenameTarget(undefined); setError(undefined) }} closeLabel={t('sessions.close')} title={renameTarget?.kind === 'workspace' ? t('workspace.rename') : t('sessions.rename')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" onClick={() => { setRenameTarget(undefined) }}>{t('sessions.cancel')}</Button><Button variant="primary" disabled={busy !== undefined || renameDraft.trim() === ''} onClick={submitRename}>{t('sessions.save')}</Button></div>}><input className="dcu-wb-rename-input" value={renameDraft} autoFocus onFocus={event => { event.target.select() }} onChange={event => { setRenameDraft(event.target.value); setError(undefined) }} onKeyDown={event => { if (event.key === 'Enter') submitRename() }} />{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
    <Modal open={deleteTarget !== undefined} onClose={() => { if (busy !== 'delete-workspace' && busy !== 'delete-session') { setDeleteTarget(undefined); setError(undefined) } }} closeLabel={t('sessions.close')} title={deleteTarget?.kind === 'session' ? t('sessions.delete') : t('workspace.delete')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" disabled={busy === 'delete-workspace' || busy === 'delete-session'} onClick={() => { setDeleteTarget(undefined); setError(undefined) }}>{t('sessions.cancel')}</Button><Button variant="outline" className="dcu-wb-delete-button" disabled={busy === 'delete-workspace' || busy === 'delete-session'} onClick={submitDelete}>{deleteTarget?.kind === 'session' ? t('sessions.delete') : t('workspace.delete')}</Button></div>}><p className="dcu-wb-delete-copy">{deleteTarget === undefined ? '' : deleteTarget.kind === 'session' ? t('sessions.deleteDescription', { name: deleteTarget.title }) : t('workspace.deleteDescription', { name: deleteTarget.title })}</p>{busy === 'delete-workspace' && <div className="dcu-wb-error" role="status">{t('workspace.deletePending')}</div>}{busy === 'delete-session' && <div className="dcu-wb-error" role="status">{t('sessions.deletePending')}</div>}{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
  </section>
}
