import { useEffect, useMemo, useRef, useState } from 'react'
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
import { PinIcon, SessionRow, sessionMenuItems } from './session-tree.tsx'
import { insertPinnedWorkspace, readPinnedWorkspaceIds, savePinnedWorkspaceIds, togglePinnedWorkspace } from './pinned-workspaces.ts'
import {
  readSessionIds,
  SESSION_PINS_STORAGE_KEY,
  SESSION_UNREAD_STORAGE_KEY,
  sessionDeepLink,
  toggleSessionId,
  writeSessionIds,
} from './session-manager.ts'
import { clampHoverCardPosition, formatHoverTime, hoverCardAnchor } from './hover-tip.ts'
import { HEADER_PROJECT_TIP_EVENT, HEADER_PROJECT_TIP_HIDE_EVENT, HEADER_SESSION_MENU_EVENT, type HeaderAnchorDetail } from './conversation-header.ts'
import { moveBefore, ungroupedSessionIds, visibleSessionIds } from './workspace-browser.ts'

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
type HoverTip = { kind: 'workspace' | 'session'; id: string; title: string; project?: string; path?: string; count?: number; branch?: string; time?: string; left: number; top: number }

const stylesheet = `
.dcu-wb{--dcu-wb-inset:4px;display:flex;flex:1;min-height:0;flex-direction:column;padding:4px var(--dcu-wb-inset) 8px;color:var(--dcu-sidebar-primary)}
.dcu-wb *{box-sizing:border-box}
.dcu-wb-tree{flex:1;min-height:0;overflow-y:auto;padding-bottom:16px;scrollbar-gutter:stable;user-select:none;-webkit-user-select:none}
.dcu-wb-section+.dcu-wb-section{margin-top:12px}
.dcu-wb-section-head{position:relative;display:flex;align-items:center;min-height:24px;padding:0 4px;border-radius:6px}.dcu-wb-section-head:hover .dcu-wb-actions{display:flex}.dcu-wb-section-label{display:flex;align-items:center;gap:4px;flex:1;min-width:0;min-height:24px;border:0;padding:2px 4px;background:transparent;color:var(--dcu-sidebar-secondary);font:13px/20px var(--dcu-font,inherit);font-weight:500;letter-spacing:.02em;text-align:left;cursor:pointer}.dcu-wb-section-caret{display:grid;place-items:center;flex:none;width:12px;height:12px;color:currentColor;opacity:0;transform:rotate(0deg);transform-origin:50% 50%;transition:opacity 140ms ease,transform 180ms ease}.dcu-wb-section-caret svg{display:block}.dcu-wb-section-head:hover .dcu-wb-section-caret,.dcu-wb-section-label:focus-visible .dcu-wb-section-caret{opacity:.78}.dcu-wb-section-label[aria-expanded=true] .dcu-wb-section-caret{transform:rotate(90deg)}.dcu-wb-section-body{display:grid;grid-template-rows:0fr;transition:grid-template-rows 220ms ease}.dcu-wb-section-body[data-open=true]{grid-template-rows:1fr}.dcu-wb-section-body>div{overflow:hidden;min-height:0}@media (prefers-reduced-motion:reduce){.dcu-wb-section-caret,.dcu-wb-section-body{transition:none}}
.dcu-wb-project{position:relative}
.dcu-wb-project-head,.dcu-wb-session{position:relative;display:flex;align-items:center;gap:6px;width:100%;border-radius:8px;padding:0 8px;color:var(--dcu-sidebar-primary);cursor:pointer}
.dcu-wb-project-head{height:34px;background:transparent;font:inherit;text-align:left}
.dcu-wb-project-head:hover,.dcu-wb-project-head.dcu-wb-menu-open,.dcu-wb-session:hover,.dcu-wb-session.dcu-wb-selected,.dcu-wb-session.dcu-wb-menu-open{background:var(--dcu-sidebar-hover)}.dcu-wb-project-head+.dcu-wb-session,.dcu-wb-project-head+.dcu-wb-nochat{margin-top:4px}.dcu-wb-session+.dcu-wb-session{margin-top:2px}
.dcu-wb-project-head[draggable=true],.dcu-wb-session[draggable=true]{cursor:grab}
.dcu-wb-project-head[draggable=true]:active,.dcu-wb-session[draggable=true]:active{cursor:grabbing}
.dcu-wb-section,.dcu-wb-section:focus,.dcu-wb-section:focus-visible,.dcu-wb-project-head:focus,.dcu-wb-session:focus{outline:0}.dcu-wb-pin-end{position:relative;height:8px}.dcu-wb-project-head.dcu-wb-drop::before,.dcu-wb-session.dcu-wb-drop::before,.dcu-wb-pin-end.dcu-wb-drop::before,.dcu-wb-section[data-pin-over=true] .dcu-wb-section-head::after{content:"";position:absolute;left:8px;right:8px;top:-4px;height:8px;pointer-events:none;background:radial-gradient(circle at 4px 50%,var(--dsw-alias-state-business-primary) 3.25px,transparent 3.45px),linear-gradient(var(--dsw-alias-state-business-primary),var(--dsw-alias-state-business-primary)) 10px 50%/calc(100% - 10px) 2px no-repeat}.dcu-wb-drag-ghost{position:fixed;top:-120px;left:-240px;z-index:10040;max-width:220px;height:32px;padding:0 10px;border:1px solid var(--dcu-sidebar-border);border-radius:8px;background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary);font:13px/32px var(--dcu-font,inherit);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
.dcu-wb-folder{display:grid;place-items:center;flex:none;width:16px;height:20px;color:var(--dcu-sidebar-icon)}.dcu-wb-brand{display:block;width:16px;height:16px}
.dcu-wb-project-current .dcu-wb-folder{color:var(--dsw-alias-state-business-primary)}
.dcu-wb-project-title,.dcu-wb-session-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px}
.dcu-wb-project-title{flex:1;font-weight:550;color:var(--dcu-sidebar-primary)}
.dcu-wb-session{position:relative;min-height:32px;gap:0;padding-left:28px}
.dcu-wb-session-title{flex:1;margin-left:0}
.dcu-wb-pin{display:grid;place-items:center;flex:none;width:16px;height:20px;margin-left:6px;color:var(--dcu-sidebar-tertiary)}
.dcu-wb-pin svg,.dcu-wb-quick-pin svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.4}
.dcu-wb-actions{display:none;align-items:center;gap:8px;flex:none}
.dcu-wb-quick-actions{position:absolute;right:8px;top:50%;display:flex;align-items:center;gap:2px;opacity:0;pointer-events:none;transform:translateY(-50%);background:var(--dcu-sidebar-hover);border-radius:6px}
.dcu-wb-project-head:hover .dcu-wb-actions,.dcu-wb-project-head.dcu-wb-menu-open .dcu-wb-actions,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-actions{display:flex}
.dcu-wb-session:hover .dcu-wb-quick-actions,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-quick-actions{opacity:1;pointer-events:auto}
.dcu-wb-more{display:grid;place-items:center;width:20px;height:20px;border:0;border-radius:4px;padding:0;background:transparent;color:var(--dcu-sidebar-tertiary);cursor:pointer}
.dcu-wb-more:hover{color:var(--dcu-sidebar-primary)}
.dcu-wb-context-anchor{opacity:0;pointer-events:none}
.dcu-wb-tip{position:fixed;z-index:10050;min-width:220px;max-width:280px;padding:10px 12px;border:1px solid var(--dcu-sidebar-border);border-radius:12px;background:#2a2e2c;box-shadow:0 10px 30px rgba(0,0,0,.28);color:var(--dcu-sidebar-primary)}.dcu-wb-tip-title{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;font-size:14px;line-height:20px;font-weight:500}.dcu-wb-tip-time{flex:none;color:var(--dcu-sidebar-tertiary);font-size:12px;line-height:18px;font-weight:400}.dcu-wb-tip-title>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-tip-meta{margin-top:6px;color:var(--dcu-sidebar-secondary);font-size:12px;line-height:18px}.dcu-wb-tip-row{display:flex;align-items:center;gap:6px;min-width:0;margin-top:4px;color:var(--dcu-sidebar-secondary);font-size:12px;line-height:18px}.dcu-wb-tip-row>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-tip-sep{height:1px;margin:8px 0;background:var(--dcu-sidebar-border)}.dcu-wb-tip-edit{display:flex;align-items:center;gap:8px;width:100%;border:0;padding:4px 0;background:transparent;color:var(--dcu-sidebar-primary);font:12px/18px var(--dcu-font,inherit);cursor:pointer}
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

const typographyStyles = `.dcu-wb{font:14px/20px var(--dcu-font,var(--dsw-font-family))}.dcu-wb-section-label{color:var(--dcu-sidebar-secondary);font-size:13px;font-weight:500;letter-spacing:.02em}.dcu-wb-project-title{font-size:14px;line-height:20px;font-weight:550;color:var(--dcu-sidebar-primary)}.dcu-wb-session-title{font-size:14px;line-height:20px;font-weight:400;color:var(--dcu-sidebar-secondary)}.dcu-wb-session.dcu-wb-selected .dcu-wb-session-title,.dcu-wb-session:hover .dcu-wb-session-title{color:var(--dcu-sidebar-primary)}.dcu-wb-empty{color:var(--dcu-sidebar-tertiary);font-size:13px;line-height:18px}.dcu-wb-nochat{padding:4px 8px 6px 28px;color:var(--dcu-sidebar-tertiary);font-size:14px;line-height:20px}`

export const WORKSPACE_TREE_STYLE = stylesheet + runningStyles + typographyStyles

function storage(): Storage | undefined { return typeof window === 'undefined' ? undefined : window.localStorage }

function browserBase(): string {
  return typeof window === 'undefined' || window.location.origin === 'null' ? 'http://dsh.internal/' : `${window.location.origin}/`
}

function optionalText(value: object, key: string): string | undefined {
  if (!(key in value)) return undefined
  const next = value[key as keyof typeof value]
  return typeof next === 'string' && next !== '' ? next : undefined
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
  const [hoverTip, setHoverTip] = useState<HoverTip>()
  const hoverTipRef = useRef<HoverTip>()
  hoverTipRef.current = hoverTip
  const hideTipTimer = useRef<number>()
  const [renameDraft, setRenameDraft] = useState('')
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const [workspaceDragId, setWorkspaceDragId] = useState<string>()
  const [workspaceDropId, setWorkspaceDropId] = useState<string>()
  const [headerMenu, setHeaderMenu] = useState<{ id: string; getRect: () => DOMRect }>()
  const [pinSlot, setPinSlot] = useState<'header' | 'end' | string>()
  const [sessionDrag, setSessionDrag] = useState<{ sessionId: string; workspaceId: string }>()
  const [sessionDropId, setSessionDropId] = useState<string>()
  const pendingPinRef = useRef<string>()
  const showTip = (tip: HoverTip): void => {
    if (menu !== undefined) return
    if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
    const pos = clampHoverCardPosition(tip.left, tip.top, 248, 148, window.innerWidth, window.innerHeight)
    setHoverTip({ ...tip, ...pos })
  }
  const hideTip = (): void => {
    hideTipTimer.current = window.setTimeout(() => { setHoverTip(undefined) }, 120)
  }
  const dismissTip = (): void => {
    if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
    setHoverTip(undefined)
  }
  useEffect(() => {
    if (hoverTip === undefined) return
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.dcu-wb-tip') !== null || target.closest('[data-dcu-title-folder]') !== null || target.closest('.dcu-wb-project-head') !== null) return
      dismissTip()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => { window.removeEventListener('pointerdown', onPointerDown, true) }
  }, [hoverTip])

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

  useEffect(() => {
    const onProject = (event: Event): void => {
      const detail = (event as CustomEvent<HeaderAnchorDetail>).detail
      const current = sessions.current
      const workspace = groups.items.find(item => current !== undefined && item.visibleIds.includes(String(current)))
      if (workspace === undefined || detail === undefined) return
      if (detail.toggle === true && hoverTipRef.current?.kind === 'workspace' && hoverTipRef.current.id === workspace.workspaceId) {
        dismissTip()
        return
      }
      showTip({ kind: 'workspace', id: workspace.workspaceId, title: workspace.title, path: workspace.path, count: workspace.visibleIds.length, left: detail.left, top: detail.top })
    }
    const onProjectHide = (): void => { hideTip() }
    const onMenu = (event: Event): void => {
      const detail = (event as CustomEvent<HeaderAnchorDetail>).detail
      const current = sessions.current
      if (current === undefined || detail === undefined) return
      dismissTip()
      setHeaderMenu({ id: current, getRect: detail.getRect })
    }
    window.addEventListener(HEADER_PROJECT_TIP_EVENT, onProject)
    window.addEventListener(HEADER_PROJECT_TIP_HIDE_EVENT, onProjectHide)
    window.addEventListener(HEADER_SESSION_MENU_EVENT, onMenu)
    return () => {
      window.removeEventListener(HEADER_PROJECT_TIP_EVENT, onProject)
      window.removeEventListener(HEADER_PROJECT_TIP_HIDE_EVENT, onProjectHide)
      window.removeEventListener(HEADER_SESSION_MENU_EVENT, onMenu)
    }
  }, [groups.items, sessions.current])


  const projectPinned = (id: WorkspaceId | string): boolean => pinnedWorkspaceIds.includes(String(id))
  const pinnedGroups = groups.items.filter(workspace => projectPinned(workspace.workspaceId))
  const regularGroups = groups.items.filter(workspace => !projectPinned(workspace.workspaceId))
  const assignedIds = workspaces.items.flatMap(workspace => workspace.sessionIds.map(id => String(id)))
  const recentIds = ungroupedSessionIds(sessions.ids ?? Object.keys(sessions.byId), sessions.byId, assignedIds, workspaces.archivedSessionIds).sort((left, right) => (sessions.byId[right as SessionId]?.updatedAt ?? 0) - (sessions.byId[left as SessionId]?.updatedAt ?? 0))
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
  const sectionOpen = (id: 'pinned' | 'projects' | 'recent'): boolean => expanded[`section:${id}`] ?? true
  const toggleSection = (id: 'pinned' | 'projects' | 'recent'): void => {
    setExpanded(current => ({ ...current, [`section:${id}`]: !(current[`section:${id}`] ?? true) }))
  }
  const projectMenu = (workspace: (typeof groups.items)[number]): MenuEntry[] => [
    { id: 'new', label: t('workspace.newSession'), icon: <IconPlusOutline16 size={16} /> },
    { id: 'rename', label: t('workspace.rename'), icon: <IconEditOutline16 size={16} /> },
    { id: 'pin', label: t(projectPinned(workspace.workspaceId) ? 'workspace.unpin' : 'workspace.pin'), icon: <PinIcon /> },
    { id: 'openPath', label: t('workspace.openPath'), icon: <IconFolderOpenOutline16 size={16} /> },
    { type: 'separator', id: 'project-separator' },
    { id: 'delete', label: t('workspace.delete'), icon: <IconTrashOutline16 size={16} />, danger: true },
  ]
  const sessionMenu = (sessionId: string, _title: string, path: string | undefined): MenuEntry[] => sessionMenuItems(t, { pinned: pinnedSessionIds.includes(sessionId), unread: unreadSessionIds.includes(sessionId), path, includePath: true })
  const pinWorkspaceAt = (id: string, beforeId?: string): void => { setPinnedWorkspaceIds(ids => insertPinnedWorkspace(ids, id, beforeId)) }
  const renderGroup = (workspace: (typeof groups.items)[number], zone: 'pinned' | 'projects') => {
    const isExpanded = expanded[workspace.workspaceId] ?? true
    const menuOpen = menu?.type === 'workspace' && menu.id === workspace.workspaceId
    const isCurrentWorkspace = sessions.current !== undefined && workspace.visibleIds.includes(sessions.current)
    return <div className={`dcu-wb-project${isCurrentWorkspace ? ' dcu-wb-project-current' : ''}`} key={workspace.workspaceId} onDragOver={(event) => { if (workspaceDragId === undefined) return; event.preventDefault(); event.stopPropagation(); const after = event.clientY > event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2; if (zone === 'pinned') { const ids = pinnedGroups.map(item => String(item.workspaceId)); const index = ids.indexOf(String(workspace.workspaceId)); setPinSlot(after ? (index === ids.length - 1 ? 'end' : ids[index + 1]) : String(workspace.workspaceId)); setWorkspaceDropId(after && index !== ids.length - 1 ? ids[index + 1] : after ? undefined : String(workspace.workspaceId)) } else { setPinSlot(undefined); setWorkspaceDropId(workspace.workspaceId) } }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const dragged = workspaceDragId; const slot = pinSlot; setWorkspaceDragId(undefined); setWorkspaceDropId(undefined); setPinSlot(undefined); if (dragged === undefined || dragged === workspace.workspaceId) return; if (zone === 'pinned') { pinWorkspaceAt(dragged, slot === 'end' || slot === 'header' ? undefined : slot); return } setPinnedWorkspaceIds(ids => ids.filter(id => id !== dragged)); if (moveBefore(groups.items.map(item => String(item.workspaceId)), dragged, String(workspace.workspaceId)).join() !== groups.items.map(item => String(item.workspaceId)).join()) void run('workspace-order', () => insertWorkspaceBefore(dragged as WorkspaceId, workspace.workspaceId)) }}>
      <div className={`dcu-wb-project-head${menuOpen ? ' dcu-wb-menu-open' : ''}${workspaceDropId === workspace.workspaceId ? ' dcu-wb-drop' : ''}`} role="treeitem" aria-expanded={isExpanded} tabIndex={0} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', workspace.title); const preview = document.createElement('div'); preview.className = 'dcu-wb-drag-ghost'; preview.textContent = workspace.title; document.body.appendChild(preview); event.dataTransfer.setDragImage(preview, 16, 18); window.requestAnimationFrame(() => { preview.remove() }); setWorkspaceDragId(workspace.workspaceId) }} onDragEnd={() => { pendingPinRef.current = undefined; setWorkspaceDragId(undefined); setWorkspaceDropId(undefined); setPinSlot(undefined) }} onClick={() => { toggleGroup(workspace.workspaceId) }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenu({ id: workspace.workspaceId, type: 'workspace' }) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleGroup(workspace.workspaceId) } }}>
        <span className="dcu-wb-folder" onClick={(event) => { event.stopPropagation(); const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); if (hoverTipRef.current?.kind === 'workspace' && hoverTipRef.current.id === workspace.workspaceId) { dismissTip(); return } showTip({ kind: 'workspace', id: workspace.workspaceId, title: workspace.title, path: workspace.path, count: workspace.visibleIds.length, left: box.left, top: box.top }) }}>{isExpanded ? <IconFolderOpenOutline16 size={16} /> : <IconFolderClose16 size={16} />}</span><span className="dcu-wb-project-title" title={workspace.path}>{workspace.title}</span><span className="dcu-wb-actions"><Menu open={menuOpen} onClose={() => { setMenu(undefined) }} items={projectMenu(workspace)} onSelect={(id) => { if (busy !== undefined) return; if (id === 'new') { startSession(workspace.workspaceId); setMenu(undefined) }; if (id === 'rename') beginRename('workspace', workspace.workspaceId, workspace.title); if (id === 'pin') { setPinnedWorkspaceIds(ids => togglePinnedWorkspace(ids, workspace.workspaceId)); setMenu(undefined) }; if (id === 'openPath') void run('open-path', () => openPath(workspace.path)); if (id === 'delete') { setDeleteTarget({ id: workspace.workspaceId, kind: 'workspace', title: workspace.title }); setError(undefined); setMenu(undefined) } }} portal dense compact anchor={<button type="button" className="dcu-wb-more" aria-label={t('workspace.actions', { name: workspace.title })} onClick={(event) => { event.stopPropagation(); setMenu(current => current?.id === workspace.workspaceId && current.type === 'workspace' ? undefined : { id: workspace.workspaceId, type: 'workspace' }) }}><IconEllipsisOutline16 size={16} /></button>} /></span><span className="dcu-wb-actions"><button type="button" className="dcu-wb-more" aria-label={t('workspace.newSession')} onClick={(event) => { event.stopPropagation(); startSession(workspace.workspaceId) }}><IconPlusOutline16 size={16} /></button></span>
      </div>
      {isExpanded && workspace.visibleIds.length === 0 && <div className="dcu-wb-nochat">{t('workspace.noChat')}</div>}
      {isExpanded && workspace.visibleIds.map((id) => {
        const session = sessions.byId[id as SessionId]
        if (session === undefined) return null
        const path = session.cwd ?? workspace.path
        const selected = sessions.current === id
        const sessionMenuOpen = menu?.type === 'session' && menu.id === id
        return <div key={id} className={`dcu-wb-session${selected ? ' dcu-wb-selected' : ''}${sessionMenuOpen ? ' dcu-wb-menu-open' : ''}${sessionDropId === id ? ' dcu-wb-drop' : ''}`} role="treeitem" aria-selected={selected} draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; setSessionDrag({ sessionId: id, workspaceId: workspace.workspaceId }) }} onDragEnd={() => { setSessionDrag(undefined); setSessionDropId(undefined) }} onDragOver={(event) => { if (sessionDrag?.workspaceId !== workspace.workspaceId) return; event.preventDefault(); setSessionDropId(id) }} onDrop={(event) => { event.preventDefault(); const drag = sessionDrag; setSessionDrag(undefined); setSessionDropId(undefined); if (drag !== undefined && drag.sessionId !== id && moveBefore(workspace.visibleIds, drag.sessionId, id).join() !== workspace.visibleIds.join()) void run('session-order', () => insertSessionBefore(workspace.workspaceId, drag.sessionId as SessionId, id as SessionId)) }} onClick={() => { setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenu({ id, type: 'session' }) }} onMouseEnter={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); const branch = optionalText(session, 'branch'); showTip({ kind: 'session', id, title: session.displayTitle, project: workspace.title, path: path, branch, time: formatHoverTime(session.updatedAt), left: box.left, top: box.top }) }} onMouseLeave={hideTip}><span className="dcu-wb-session-title">{session.displayTitle}</span>{pinnedSessionIds.includes(id) && <span className="dcu-wb-pin" aria-label={t('sessions.pinned')} title={t('sessions.pinned')}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.5h6M5 2.5v2L3.75 6v1h8.5V6L11 4.5v-2M8 7v6" /></svg></span>}{unreadSessionIds.includes(id) ? <span className="dcu-wb-unread" aria-label={t('sessions.unread')} /> : session.running ? <span className="dcu-wb-running" aria-hidden="true" /> : null}<span className="dcu-wb-quick-actions"><button type="button" className="dcu-wb-more dcu-wb-quick-pin" aria-label={t(pinnedSessionIds.includes(id) ? 'sessions.unpin' : 'sessions.pin')} title={t(pinnedSessionIds.includes(id) ? 'sessions.unpin' : 'sessions.pin')} onClick={(event) => { event.stopPropagation(); setPinnedSessionIds(ids => toggleSessionId(ids, id)) }}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.5h6M5 2.5v2L3.75 6v1h8.5V6L11 4.5v-2M8 7v6" /></svg></button><button type="button" className="dcu-wb-more" aria-label={t('sessions.archive')} title={t('sessions.archive')} onClick={(event) => { event.stopPropagation(); void run('archive', () => archiveSession(id as SessionId)) }}><IconArchiveOutline20 size={16} /></button></span><span className="dcu-wb-actions"><Menu open={sessionMenuOpen} onClose={() => { setMenu(undefined) }} items={sessionMenu(id, session.displayTitle, path)} onSelect={(action) => { if (busy !== undefined) return; const link = sessionDeepLink(browserBase(), id); if (action === 'rename') beginRename('session', id, session.displayTitle); if (action === 'pin') { setPinnedSessionIds(ids => toggleSessionId(ids, id)); setMenu(undefined) }; if (action === 'unread') { setUnreadSessionIds(ids => toggleSessionId(ids, id)); setMenu(undefined) }; if (action === 'archive') void run('archive', () => archiveSession(id as SessionId)); if (action === 'delete') { setDeleteTarget({ id, kind: 'session', title: session.displayTitle }); setError(undefined); setMenu(undefined) }; if (action === 'fork') void run('fork', () => forkSession(id as SessionId)); if (action === 'openPath' && path !== undefined) void run('open-path', () => openPath(path)); if (action === 'copyPath') copy(path); if (action === 'copyTitle') copy(session.displayTitle); if (action === 'copyId') copy(id); if (action === 'copyLink') copy(link) }} portal dense compact anchor={<button type="button" className="dcu-wb-more dcu-wb-context-anchor" aria-label={t('sessions.actions', { name: session.displayTitle })} onClick={(event) => { event.stopPropagation(); setMenu(current => current?.id === id && current.type === 'session' ? undefined : { id, type: 'session' }) }}><IconEllipsisOutline16 size={16} /></button>} /></span></div>
      })}
    </div>
  }

  if (!wide) return <div className="dcu-wb dcu-wb-rail"><style>{stylesheet}</style></div>
  return <section className="dcu-wb" aria-label={t('workspace.label')}>
    <style>{stylesheet}{runningStyles}{typographyStyles}</style>
    {error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}
    <div className="dcu-wb-tree" role="tree">
      <section className="dcu-wb-section" aria-label={t('workspace.pinned')} data-pin-over={workspaceDragId !== undefined && pinSlot === 'header'} onDragOver={(event) => { if (workspaceDragId === undefined) return; event.preventDefault(); if (event.target === event.currentTarget || (event.target instanceof Element && event.target.closest('.dcu-wb-section-head') !== null)) setPinSlot('header') }} onDrop={(event) => { event.preventDefault(); const dragged = workspaceDragId; const slot = pinSlot; setWorkspaceDragId(undefined); setWorkspaceDropId(undefined); setPinSlot(undefined); if (dragged !== undefined) pinWorkspaceAt(dragged, slot === 'header' ? (pinnedGroups[0] === undefined ? undefined : String(pinnedGroups[0].workspaceId)) : slot === 'end' || slot === undefined ? undefined : slot) }} onDragLeave={(event) => { if (event.currentTarget.contains(event.relatedTarget as Node)) return; setPinSlot(undefined) }}>
        <div className="dcu-wb-section-head"><button type="button" className="dcu-wb-section-label" aria-expanded={sectionOpen('pinned')} onClick={() => { toggleSection('pinned') }}>{t('workspace.pinned')}<span className="dcu-wb-section-caret" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12"><path d="M6.25 4.25 10.25 8 6.25 11.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span></button></div>
        <div className="dcu-wb-section-body" data-open={sectionOpen('pinned')}><div>{pinnedGroups.length > 0 ? pinnedGroups.map(workspace => renderGroup(workspace, 'pinned')) : <div className="dcu-wb-empty">{t('workspace.pinnedEmpty')}</div>}{workspaceDragId !== undefined && <div className={`dcu-wb-pin-end${pinSlot === 'end' ? ' dcu-wb-drop' : ''}`} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); setPinSlot('end'); setWorkspaceDropId(undefined) }} />}</div></div>
      </section>
      <section className="dcu-wb-section" aria-label={t('workspace.projects')}>
        <div className="dcu-wb-section-head"><button type="button" className="dcu-wb-section-label" aria-expanded={sectionOpen('projects')} onClick={() => { toggleSection('projects') }}>{t('workspace.projects')}<span className="dcu-wb-section-caret" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12"><path d="M6.25 4.25 10.25 8 6.25 11.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span></button><span className="dcu-wb-actions"><button type="button" className="dcu-wb-more" aria-label={t('workspace.newSession')} onClick={(event) => { event.stopPropagation(); startSession() }}><IconPlusOutline16 size={16} /></button></span></div>
        <div className="dcu-wb-section-body" data-open={sectionOpen('projects')}><div>{regularGroups.map(workspace => renderGroup(workspace, 'projects'))}{regularGroups.length === 0 && <div className="dcu-wb-empty">{t('workspace.empty')}</div>}</div></div>
      </section>
      <section className="dcu-wb-section" aria-label={t('workspace.recent')}>
        <div className="dcu-wb-section-head"><button type="button" className="dcu-wb-section-label" aria-expanded={sectionOpen('recent')} onClick={() => { toggleSection('recent') }}>{t('workspace.recent')}<span className="dcu-wb-section-caret" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12"><path d="M6.25 4.25 10.25 8 6.25 11.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span></button></div>
        <div className="dcu-wb-section-body" data-open={sectionOpen('recent')}><div>
        {recentIds.length === 0 && <div className="dcu-wb-empty">{t('workspace.recentEmpty')}</div>}
        {recentIds.map(id => {
          const session = sessions.byId[id as SessionId]
          if (session === undefined) return null
          const title = session.displayTitle
          const pinned = pinnedSessionIds.includes(id)
          const unread = unreadSessionIds.includes(id)
          return <SessionRow key={id} id={id} title={title} selected={sessions.current === id} menuOpen={menu?.type === 'session' && menu.id === id} pinned={pinned} unread={unread} running={session.running === true} t={t} menuItems={sessionMenu(id, title, session.cwd)} onOpen={() => { setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onMenuChange={(open) => { setMenu(open ? { id, type: 'session' } : undefined) }} onPin={() => { setPinnedSessionIds(ids => toggleSessionId(ids, id)) }} onArchive={() => { void run('archive', () => archiveSession(id as SessionId)) }} onHover={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); showTip({ kind: 'session', id, title, time: formatHoverTime(session.updatedAt), left: box.left, top: box.top }) }} onLeave={hideTip} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenu({ id, type: 'session' }) }} onSelectAction={(action) => {
            if (busy !== undefined) return
            if (action === 'rename') beginRename('session', id, title)
            if (action === 'pin') { setPinnedSessionIds(ids => toggleSessionId(ids, id)); setMenu(undefined) }
            if (action === 'unread') { setUnreadSessionIds(ids => toggleSessionId(ids, id)); setMenu(undefined) }
            if (action === 'archive') void run('archive', () => archiveSession(id as SessionId))
            if (action === 'delete') { setDeleteTarget({ id, kind: 'session', title }); setError(undefined); setMenu(undefined) }
            if (action === 'fork') void run('fork', () => forkSession(id as SessionId))
            if (action === 'openPath' && session.cwd !== undefined) void run('open-path', () => openPath(session.cwd!))
            if (action === 'copyPath') copy(session.cwd)
            if (action === 'copyTitle') copy(title)
            if (action === 'copyId') copy(id)
            if (action === 'copyLink') copy(sessionDeepLink(browserBase(), id))
          }} />
        })}
        </div></div>
      </section>
    </div>
    {headerMenu !== undefined && sessions.byId[headerMenu.id as SessionId] !== undefined && <Menu open onClose={() => { setHeaderMenu(undefined) }} items={sessionMenu(headerMenu.id, sessions.byId[headerMenu.id as SessionId]!.displayTitle, sessions.byId[headerMenu.id as SessionId]!.cwd ?? groups.items.find(item => item.visibleIds.includes(headerMenu.id))?.path)} onSelect={(action) => { const id = headerMenu.id; const session = sessions.byId[id as SessionId]; if (session === undefined || busy !== undefined) return; const path = session.cwd ?? groups.items.find(item => item.visibleIds.includes(id))?.path; const link = sessionDeepLink(browserBase(), id); if (action === 'rename') beginRename('session', id, session.displayTitle); if (action === 'pin') { setPinnedSessionIds(ids => toggleSessionId(ids, id)) }; if (action === 'unread') { setUnreadSessionIds(ids => toggleSessionId(ids, id)) }; if (action === 'archive') void run('archive', () => archiveSession(id as SessionId)); if (action === 'delete') { setDeleteTarget({ id, kind: 'session', title: session.displayTitle }); setError(undefined) }; if (action === 'fork') void run('fork', () => forkSession(id as SessionId)); if (action === 'openPath' && path !== undefined) void run('open-path', () => openPath(path)); if (action === 'copyPath') copy(path); if (action === 'copyTitle') copy(session.displayTitle); if (action === 'copyId') copy(id); if (action === 'copyLink') copy(link); setHeaderMenu(undefined) }} portal dense compact side="bottom" align="start" getAnchorRect={() => headerMenu.getRect()} anchor={<span />} />}
    {hoverTip !== undefined && <div className="dcu-wb-tip" style={{ left: hoverTip.left, top: hoverTip.top }} onMouseEnter={() => { if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current) }} onMouseLeave={hideTip}><div className="dcu-wb-tip-title"><span className="dcu-wb-folder"><IconFolderClose16 size={16} /></span><span>{hoverTip.title}</span>{hoverTip.time !== undefined && <span className="dcu-wb-tip-time">{hoverTip.time}</span>}</div>{hoverTip.kind === 'workspace' && hoverTip.count !== undefined && <div className="dcu-wb-tip-meta">{t('workspace.taskCount', { count: hoverTip.count })}</div>}{hoverTip.kind === 'workspace' && hoverTip.path !== undefined && hoverTip.path !== '' && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><IconFolderClose16 size={16} /></span><span title={hoverTip.path}>{hoverTip.path}</span></div>}{hoverTip.kind === 'session' && hoverTip.project !== undefined && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><IconFolderClose16 size={16} /></span><span>{hoverTip.project}</span></div>}{hoverTip.kind === 'session' && hoverTip.branch !== undefined && hoverTip.branch !== '' && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><IconBranchOutline16 size={16} /></span><span>{hoverTip.branch}</span></div>}{hoverTip.kind === 'workspace' && <><div className="dcu-wb-tip-sep" /><button type="button" className="dcu-wb-tip-edit" onClick={() => { beginRename('workspace', hoverTip.id, hoverTip.title); setHoverTip(undefined) }}><svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true"><path fill="currentColor" d="M8 1.4A6.6 6.6 0 1 0 8 14.6 6.6 6.6 0 0 0 8 1.4Zm0 1.4a5.2 5.2 0 1 1 0 10.4A5.2 5.2 0 0 1 8 2.8Zm-.7 2.3h1.4v3.05l2.2 1.3-.7 1.18L7.3 9.1V5.1Z" /></svg>{t('workspace.edit')}</button></>}</div>}
    <Modal open={renameTarget !== undefined} onClose={() => { setRenameTarget(undefined); setError(undefined) }} closeLabel={t('sessions.close')} title={renameTarget?.kind === 'workspace' ? t('workspace.rename') : t('sessions.rename')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" onClick={() => { setRenameTarget(undefined) }}>{t('sessions.cancel')}</Button><Button variant="primary" disabled={busy !== undefined || renameDraft.trim() === ''} onClick={submitRename}>{t('sessions.save')}</Button></div>}><input className="dcu-wb-rename-input" value={renameDraft} autoFocus onFocus={event => { event.target.select() }} onChange={event => { setRenameDraft(event.target.value); setError(undefined) }} onKeyDown={event => { if (event.key === 'Enter') submitRename() }} />{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
    <Modal open={deleteTarget !== undefined} onClose={() => { if (busy !== 'delete-workspace' && busy !== 'delete-session') { setDeleteTarget(undefined); setError(undefined) } }} closeLabel={t('sessions.close')} title={deleteTarget?.kind === 'session' ? t('sessions.delete') : t('workspace.delete')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" disabled={busy === 'delete-workspace' || busy === 'delete-session'} onClick={() => { setDeleteTarget(undefined); setError(undefined) }}>{t('sessions.cancel')}</Button><Button variant="outline" className="dcu-wb-delete-button" disabled={busy === 'delete-workspace' || busy === 'delete-session'} onClick={submitDelete}>{deleteTarget?.kind === 'session' ? t('sessions.delete') : t('workspace.delete')}</Button></div>}><p className="dcu-wb-delete-copy">{deleteTarget === undefined ? '' : deleteTarget.kind === 'session' ? t('sessions.deleteDescription', { name: deleteTarget.title }) : t('workspace.deleteDescription', { name: deleteTarget.title })}</p>{busy === 'delete-workspace' && <div className="dcu-wb-error" role="status">{t('workspace.deletePending')}</div>}{busy === 'delete-session' && <div className="dcu-wb-error" role="status">{t('sessions.deletePending')}</div>}{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
  </section>
}
