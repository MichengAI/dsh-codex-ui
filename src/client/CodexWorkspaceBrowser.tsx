import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import type { SessionId, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  Button,
  IconArchiveOutline20,
  IconEditOutline16,
  IconEllipsisOutline16,
  IconFolderClose16,
  IconFolderOpenOutline16,
  IconPlusOutline16,
  IconTrashOutline16,
  Menu,
  Modal,
  writeClipboard,
  type MenuEntry,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { NS } from './locales.ts'
import { PinIcon, SessionRow, SessionState, pointerMenuRect, sessionMenuItems } from './session-tree.tsx'
import { pendingInteractionForSession, useEmptySessionPendingInteraction, type UseSessionPendingInteraction } from './session-pending.ts'
import { insertPinnedWorkspace, prunePinnedWorkspaceIds, readHostPinnedWorkspaceIds, readPinnedWorkspaceIds, readWorkspaceGroupsCache, resolveWorkspacePreferencesHydration, savePinnedWorkspaceIds, saveWorkspaceGroupsCache, togglePinnedWorkspace, writeHostWorkspacePreferences } from './pinned-workspaces.ts'
import { assignWorkspaceToGroup, createWorkspaceGroup, deleteWorkspaceGroup, groupedWorkspaceIds, moveWorkspaceGroup, moveWorkspaceGroupMember, placeWorkspaceInGroup, pruneWorkspaceGroups, type WorkspaceGroup } from '../workspace-groups.ts'
import {
  readSessionIds,
  SESSION_PINS_STORAGE_KEY,
  SESSION_UNREAD_STORAGE_KEY,
  completedBackgroundSessionIds,
  sessionDeepLink,
  toggleSessionId,
  writeSessionIds,
} from './session-manager.ts'
import { formatHoverTime, hoverCardAnchor } from './hover-tip.ts'
import { HEADER_PROJECT_TIP_EVENT, HEADER_SESSION_MENU_EVENT, type HeaderAnchorDetail } from './conversation-header.ts'
import { HoverShell, useHoverDispatch, type HoverCardTip } from './hover-shell.tsx'
import { WorkspaceHoverCard } from './workspace-hover-card.tsx'
import { moveBefore, orderByIds, pinnedHeaderDropIndicator, readWorkspaceDrag, readWorkspaceGroupDrag, reorderDropBeforeId, ungroupedSessionIds, visibleSessionIds, writeSessionDrag, writeWorkspaceDrag, writeWorkspaceGroupDrag } from './workspace-browser.ts'
import { browserStorage, readTreeExpansionState, WORKSPACE_EXPANSION_STORAGE_KEY, writeTreeExpansionState } from './tree-expansion.ts'

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
  useSessionPendingInteraction?: UseSessionPendingInteraction
}

type CodexWorkspaceBrowserProps = PropsRuntime<'sidebar.workspaces'> & PropsLocale<typeof NS> & BrowserInjected
type MenuState = { id: string; type: 'workspace' | 'session'; x?: number; y?: number } | undefined
type RenameTarget = { id: string; kind: 'workspace' | 'session'; title: string } | undefined
type DeleteTarget = { id: string; kind: 'workspace' | 'session'; title: string } | undefined
type WorkspaceDropTarget = { zone: 'pinned' | 'projects'; beforeId?: string } | { zone: 'group'; groupId: string; beforeId?: string; ontoGroup?: boolean } | { zone: 'ungrouped'; beforeId?: string; ontoSection?: boolean }
type WorkspaceGroupDropTarget = { beforeId?: string }
type SessionDropTarget = { workspaceId: string; beforeId?: string; ontoProject?: boolean }

const DISCLOSURE_EXIT_MS = 180

type DisclosureBodyProps = {
  className: string
  children: ReactNode
  open: boolean
}

function animateDisclosure(body: HTMLElement, wasOpen: boolean, open: boolean): Animation | undefined {
  if (wasOpen === open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
  const height = `${body.scrollHeight}px`
  const from = wasOpen ? { height, opacity: 1, transform: 'translateY(0)' } : { height: '0px', opacity: 0, transform: 'translateY(-2px)' }
  const to = open ? { height, opacity: 1, transform: 'translateY(0)' } : { height: '0px', opacity: 0, transform: 'translateY(-2px)' }
  return body.animate([from, to], { duration: DISCLOSURE_EXIT_MS, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'none' })
}

/** 所有可折叠层级使用同一套原生高度动画，兼容宿主内核对 auto 高度过渡的差异。 */
function DisclosureBody({ className, children, open }: DisclosureBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const previousOpen = useRef(open)
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (body === null) return
    body.inert = !open
    const animation = animateDisclosure(body, previousOpen.current, open)
    previousOpen.current = open
    return () => { animation?.cancel() }
  }, [open])
  return <div ref={bodyRef} className={className} data-open={open} aria-hidden={!open}>{children}</div>
}

/** 顶层分区使用已有结构，通过统一监听器复用与项目、分组一致的原生动画。 */
function useSectionDisclosureMotion(rootRef: RefObject<HTMLDivElement | null>) {
  const previousOpen = useRef(new WeakMap<HTMLElement, boolean>())
  useLayoutEffect(() => {
    const bodies = rootRef.current?.querySelectorAll<HTMLElement>('.dcu-wb-section-body') ?? []
    for (const body of bodies) {
      const open = body.dataset.open === 'true'
      const previous = previousOpen.current.get(body)
      previousOpen.current.set(body, open)
      body.inert = !open
      if (previous !== undefined) animateDisclosure(body, previous, open)
    }
  })
}

function sameWorkspaceDropTarget(left: WorkspaceDropTarget | undefined, right: WorkspaceDropTarget | undefined): boolean {
  if (left === undefined || right === undefined) return left === right
  if (left.zone !== right.zone) return false
  if (left.zone === 'group' && right.zone === 'group') return left.groupId === right.groupId && left.beforeId === right.beforeId && left.ontoGroup === right.ontoGroup
  if (left.zone === 'ungrouped' && right.zone === 'ungrouped') return left.beforeId === right.beforeId && left.ontoSection === right.ontoSection
  return 'beforeId' in left && 'beforeId' in right && left.beforeId === right.beforeId
}

function sameWorkspaceGroups(left: readonly WorkspaceGroup[], right: readonly WorkspaceGroup[]): boolean {
  return left.length === right.length && left.every((group, index) => group.id === right[index]?.id && group.title === right[index]?.title && sameIds(group.workspaceIds, right[index]?.workspaceIds ?? []))
}

function newWorkspaceGroupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `group-${crypto.randomUUID()}`
  return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

const stylesheet = `
.dcu-wb{--dcu-wb-inset:8px;display:flex;flex:1;min-height:0;flex-direction:column;padding:4px var(--dcu-wb-inset) 8px;color:var(--dcu-sidebar-primary)}
.dcu-wb *{box-sizing:border-box}
.dcu-wb-tree{flex:1;min-height:0;overflow-x:hidden;overflow-y:auto;padding-bottom:16px;scrollbar-gutter:auto;user-select:none;-webkit-user-select:none}
.dcu-wb-section+.dcu-wb-section{margin-top:12px}
.dcu-wb-section-head{position:relative;display:flex;align-items:center;min-height:24px;padding:0;border-radius:6px}.dcu-wb-section-head:hover .dcu-wb-actions{display:flex}.dcu-wb-section-label{position:relative;display:flex;align-items:center;gap:4px;flex:1;min-width:0;min-height:24px;border:0;padding:2px 4px 2px 12px;background:transparent;color:var(--dcu-sidebar-tertiary);font:13px/20px var(--dcu-font,inherit);font-weight:400;letter-spacing:0;text-align:left;cursor:pointer}.dcu-wb-section-caret{display:grid;place-items:center;flex:none;width:12px;height:12px;color:currentColor;opacity:0;transform:rotate(0deg);transform-origin:50% 50%;transition:opacity 120ms ease,transform 160ms ease}.dcu-wb-section-head .dcu-wb-section-caret{position:absolute;left:0;top:6px}.dcu-wb-section-caret svg{display:block}.dcu-wb-section-head:hover .dcu-wb-section-caret,.dcu-wb-section-label:focus-visible .dcu-wb-section-caret{opacity:.78}.dcu-wb-section-label[aria-expanded=true] .dcu-wb-section-caret{transform:rotate(90deg)}.dcu-wb-section-body{display:block}.dcu-wb-section-body[data-open=false]{display:none}.dcu-wb-section-body>div{min-height:0}.dcu-wb-section-body[data-open=true]>div{animation:dcu-wb-section-in 140ms cubic-bezier(.16,1,.3,1)}@keyframes dcu-wb-section-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.dcu-wb-section-caret{transition:none}.dcu-wb-section-body[data-open=true]>div{animation:none}}
.dcu-wb-project{position:relative;min-width:0}
.dcu-wb-collections{display:grid;min-width:0;gap:4px}.dcu-wb-collection,.dcu-wb-ungrouped{position:relative;min-width:0;overflow:visible}.dcu-wb-collection-head{display:flex;align-items:center;min-height:28px;padding:0 4px;border-radius:6px;transition:background 120ms ease}.dcu-wb-collection-head:hover,.dcu-wb-collection-head:focus-within,.dcu-wb-collection-head.dcu-wb-group-drop{background:var(--dcu-sidebar-hover)}.dcu-wb-collection-head.dcu-wb-group-drop{outline:1px solid var(--dsw-alias-state-business-primary)}.dcu-wb-collection-head[draggable=true],.dcu-wb-collection-head[draggable=true] .dcu-wb-collection-label{cursor:grab}.dcu-wb-collection-head[draggable=true]:active,.dcu-wb-collection-head[draggable=true]:active .dcu-wb-collection-label{cursor:grabbing}.dcu-wb-collection-label{display:flex;align-items:center;gap:5px;min-width:0;flex:1;border:0;padding:4px;background:transparent;color:var(--dcu-sidebar-primary);font:13px/20px var(--dcu-font,inherit);text-align:left;cursor:pointer}.dcu-wb-collection-label .dcu-wb-section-caret{position:static;order:-1;opacity:.78}.dcu-wb-collection-label[aria-expanded=true] .dcu-wb-section-caret{transform:rotate(90deg)}.dcu-wb-collection-count{margin-left:auto;color:var(--dcu-sidebar-secondary);font-variant-numeric:tabular-nums}.dcu-wb-collection-body{position:relative;min-width:0;padding-left:12px}.dcu-wb-collection-body::before{content:"";position:absolute;left:31px;top:0;bottom:8px;width:1px;background:var(--dcu-sidebar-border)}.dcu-wb-group-member{position:relative}.dcu-wb-group-member.dcu-wb-drop::before,.dcu-wb-collection.dcu-wb-group-order-drop::before,.dcu-wb-ungrouped.dcu-wb-group-order-drop::before{content:"";position:absolute;z-index:2;left:8px;right:8px;top:-4px;height:8px;pointer-events:none;background:radial-gradient(circle at 4px 50%,var(--dsw-alias-state-business-primary) 3.25px,transparent 3.45px),linear-gradient(var(--dsw-alias-state-business-primary),var(--dsw-alias-state-business-primary)) 10px 50%/calc(100% - 10px) 2px no-repeat}.dcu-wb-group-member.dcu-wb-drop-after::before{top:auto;bottom:0}.dcu-wb-collection-body .dcu-wb-project-head{padding-left:12px}
.dcu-wb-project-head,.dcu-wb-session{position:relative;display:flex;align-items:center;gap:6px;width:100%;min-width:0;border-radius:8px;padding:0 8px;color:var(--dcu-sidebar-primary);cursor:pointer}
.dcu-wb-collection-body::before{left:calc(4px + 4px + 6px)}
.dcu-wb-project-head{height:32px;background:transparent;font:inherit;text-align:left}
.dcu-wb-project-head:hover,.dcu-wb-project-head.dcu-wb-menu-open,.dcu-wb-session:hover,.dcu-wb-session.dcu-wb-selected,.dcu-wb-session.dcu-wb-menu-open{background:var(--dcu-sidebar-hover)}.dcu-wb-project.dcu-wb-session-drop>.dcu-wb-project-head{background:var(--dcu-sidebar-hover);outline:1px solid var(--dsw-alias-state-business-primary)}.dcu-wb-project-head+.dcu-wb-session,.dcu-wb-project-head+.dcu-wb-nochat{margin-top:4px}.dcu-wb-session+.dcu-wb-session{margin-top:2px}
.dcu-wb-project-head[draggable=true],.dcu-wb-session[draggable=true]{cursor:grab}
.dcu-wb-project-head[draggable=true]:active,.dcu-wb-session[draggable=true]:active{cursor:grabbing}
.dcu-wb-section,.dcu-wb-section:focus,.dcu-wb-section:focus-visible,.dcu-wb-project-head:focus,.dcu-wb-session:focus{outline:0}.dcu-wb-pin-end,.dcu-wb-pin-start{position:relative;height:8px}.dcu-wb-project.dcu-wb-drop::before,.dcu-wb-session.dcu-wb-drop::before,.dcu-wb-pin-end.dcu-wb-drop::before,.dcu-wb-pin-start.dcu-wb-drop::before{content:"";position:absolute;z-index:2;left:8px;right:8px;top:-4px;height:8px;pointer-events:none;background:radial-gradient(circle at 4px 50%,var(--dsw-alias-state-business-primary) 3.25px,transparent 3.45px),linear-gradient(var(--dsw-alias-state-business-primary),var(--dsw-alias-state-business-primary)) 10px 50%/calc(100% - 10px) 2px no-repeat}.dcu-wb-pin-start.dcu-wb-drop::before,.dcu-wb-project.dcu-wb-drop::before,.dcu-wb-session.dcu-wb-drop::before{top:0}.dcu-wb-project.dcu-wb-drop-after::before,.dcu-wb-session.dcu-wb-drop-after::before{top:auto;bottom:0}.dcu-wb-dragging{opacity:.28}.dcu-wb-drag-ghost{position:fixed;top:-120px;left:-240px;z-index:10040;max-width:220px;height:32px;padding:0 10px;border:1px solid var(--dcu-sidebar-border);border-radius:8px;background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary);font:13px/32px var(--dcu-font,inherit);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;opacity:0}
.dcu-wb-folder{display:grid;place-items:center;flex:none;width:16px;height:20px;color:var(--dcu-sidebar-icon)}.dcu-wb-brand{display:block;width:16px;height:16px}
.dcu-wb-project-title,.dcu-wb-session-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px}
.dcu-wb-project-title{flex:1;font-weight:400;color:var(--dcu-sidebar-primary)}
.dcu-wb-session{position:relative;min-width:0;min-height:32px;gap:0;overflow:hidden;padding-left:28px;padding-right:28px}
.dcu-wb-session-title{flex:1;margin-left:0}.dcu-wb-session-copy{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}.dcu-wb-session-sub{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dcu-sidebar-tertiary);font-size:12px;line-height:16px}.dcu-wb-session-flat,.dcu-wb-session-top{padding-left:8px}
.dcu-wb-pin{display:grid;place-items:center;flex:none;width:16px;height:20px;margin-left:6px;color:var(--dcu-sidebar-tertiary)}
.dcu-wb-pin svg,.dcu-wb-quick-pin svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.4}
.dcu-wb-actions{display:none;align-items:center;gap:8px;flex:none}
.dcu-wb-quick-actions{position:absolute;right:8px;top:50%;display:flex;align-items:center;gap:2px;opacity:0;pointer-events:none;transform:translateY(-50%);background:var(--dcu-sidebar-hover);border-radius:6px}
.dcu-wb-project-head:hover .dcu-wb-actions,.dcu-wb-project-head.dcu-wb-menu-open .dcu-wb-actions,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-actions{display:flex}
.dcu-wb-session:hover .dcu-wb-quick-actions,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-quick-actions{opacity:1;pointer-events:auto}.dcu-wb-session:hover .dcu-wb-running,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-running,.dcu-wb-session:hover .dcu-wb-pending,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-pending,.dcu-wb-session:hover .dcu-wb-unread,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-unread{visibility:hidden}
.dcu-wb-more{display:grid;place-items:center;width:20px;height:20px;border:0;border-radius:4px;padding:0;background:transparent;color:var(--dcu-sidebar-tertiary);cursor:pointer}
.dcu-wb-more:hover{color:var(--dcu-sidebar-primary)}
.dcu-wb-context-anchor{opacity:0;pointer-events:none}
.dcu-wb-tip{position:fixed;z-index:10050;min-width:220px;max-width:280px;padding:10px 12px;border:1px solid var(--dcu-sidebar-border);border-radius:12px;background:var(--dcu-tip-bg,#fff);box-shadow:var(--dcu-tip-shadow,0 8px 28px rgba(31,39,36,.16));color:var(--dcu-sidebar-primary);animation:dcu-tip-in 180ms cubic-bezier(.16,1,.3,1)}@keyframes dcu-tip-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.dcu-wb-tip{animation:none}}.dcu-wb-tip-title{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;font-size:14px;line-height:20px;font-weight:500}.dcu-wb-tip-time{flex:none;color:var(--dcu-sidebar-tertiary);font-size:12px;line-height:18px;font-weight:400}.dcu-wb-tip-title>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-tip-meta{margin-top:6px;color:var(--dcu-sidebar-secondary);font-size:12px;line-height:18px}.dcu-wb-tip-row{display:flex;align-items:center;gap:6px;min-width:0;margin-top:4px;color:var(--dcu-sidebar-secondary);font-size:12px;line-height:18px}.dcu-wb-tip-row>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-tip-sep{height:1px;margin:8px 0;background:var(--dcu-sidebar-border)}.dcu-wb-tip-edit{display:flex;align-items:center;gap:8px;width:100%;border:0;padding:4px 0;background:transparent;color:var(--dcu-sidebar-primary);font:12px/18px var(--dcu-font,inherit);cursor:pointer}
.dcu-wb-session:has(.dcu-wb-pending){padding-right:112px}.dcu-wb-unread{position:absolute;right:13px;top:50%;width:7px;height:7px;margin:-3.5px 0 0;border-radius:50%;background:var(--dsw-alias-state-business-primary)}
.dcu-wb-pending{position:absolute;right:10px;top:50%;display:flex;align-items:center;gap:4px;max-width:88px;margin:0;transform:translateY(-50%);color:var(--dsw-alias-state-warn-label,#b45309);font-size:11px;line-height:16px;white-space:nowrap}.dcu-wb-pending-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-warn-primary,#f59e0b)}.dcu-wb-pending-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dcu-wb-empty{padding:14px 8px;color:var(--dcu-sidebar-tertiary);font-size:13px}
.dcu-wb-error{margin:4px 0;padding:6px 8px;border-radius:6px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px}
.dcu-wb-rail{display:none}
.dcu-wb-rename-actions{display:flex;justify-content:flex-end;gap:8px}
.dcu-wb-group-picker{display:grid;gap:8px}
.dcu-wb-delete-button{color:var(--dsw-alias-state-error-primary)!important}
.dcu-wb-delete-copy{margin:0;color:var(--dcu-sidebar-secondary);font-size:13px;line-height:20px}
.dcu-wb-rename-input{box-sizing:border-box;width:100%;height:36px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:7px 10px;outline:0;background:var(--dsw-alias-background-secondary);color:var(--dsw-alias-label-primary);font:14px/20px var(--dsw-font-family,inherit);caret-color:var(--dsw-alias-state-business-primary);transition:border-color 120ms ease,box-shadow 120ms ease}
.dcu-wb-rename-input:hover{border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 32%,var(--dsw-alias-border-l2))}
.dcu-wb-rename-input:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-state-business-primary) 28%,transparent)}
`

const runningStyles = `.dcu-wb-running{position:absolute;right:10px;top:50%;flex:none;width:12px;height:12px;margin-top:-6px;border:2px solid color-mix(in srgb,var(--dcu-sidebar-secondary) 25%,transparent);border-top-color:var(--dcu-sidebar-secondary);border-radius:50%;animation:dcu-wb-spin .8s linear infinite}@keyframes dcu-wb-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.dcu-wb-running{animation:none}}`

const typographyStyles = `.dcu-wb{--dcu-wb-disclosure-duration:180ms;--dcu-wb-disclosure-ease:cubic-bezier(.16,1,.3,1);font:14px/20px var(--dcu-font,var(--dsw-font-family))}.dcu-wb-section-label{color:var(--dcu-sidebar-secondary);font:13px/20px var(--dcu-font,var(--dsw-font-family));font-weight:400;letter-spacing:0;padding-left:0}.dcu-wb-section-caret{transition:opacity var(--dcu-wb-disclosure-duration) var(--dcu-wb-disclosure-ease),transform var(--dcu-wb-disclosure-duration) var(--dcu-wb-disclosure-ease)}.dcu-wb-section-head .dcu-wb-section-caret{position:static;left:auto;top:auto;opacity:.78}.dcu-wb-section-body,.dcu-wb-project-body,.dcu-wb-collection-body{display:block;min-height:0;height:auto;overflow:clip;opacity:1;transform:none;visibility:visible}.dcu-wb-section-body[data-open=false],.dcu-wb-project-body[data-open=false],.dcu-wb-collection-body[data-open=false]{display:block;height:0;opacity:0;transform:translateY(-2px);pointer-events:none}.dcu-wb-section-body[data-open=true]>div{animation:none}@media (prefers-reduced-motion:reduce){.dcu-wb-section-caret{transition:none}}.dcu-wb-project-title{font-size:14px;line-height:20px;font-weight:400;color:var(--dcu-sidebar-primary)}.dcu-wb-session-title{font-size:14px;line-height:20px;font-weight:400;color:var(--dcu-sidebar-secondary)}.dcu-wb-session.dcu-wb-selected .dcu-wb-session-title,.dcu-wb-session:hover .dcu-wb-session-title{color:var(--dcu-sidebar-primary)}.dcu-wb-empty{color:var(--dcu-sidebar-tertiary);font-size:13px;line-height:18px}.dcu-wb-nochat{padding:0 8px 4px 28px;color:var(--dcu-sidebar-tertiary);font-size:14px;line-height:20px}`

const collectionLayoutStyles = `.dcu-wb-collection-body{padding-left:0}.dcu-wb-collection-body .dcu-wb-project-head{padding-left:8px}.dcu-wb-collection-body::before,.dcu-wb-group-member::after{display:none}.dcu-wb-collection-head,.dcu-wb-collection-head:focus-within{background:color-mix(in srgb,var(--dcu-sidebar-hover) 28%,transparent)}.dcu-wb-collection-head:hover{background:var(--dcu-sidebar-hover)}.dcu-wb-collection-head.dcu-wb-group-drop{background:var(--dcu-sidebar-hover)}`

export const WORKSPACE_TREE_STYLE = stylesheet + runningStyles + typographyStyles + collectionLayoutStyles

function storage(): Storage | undefined {
  return browserStorage()
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}

function browserBase(): string {
  return typeof window === 'undefined' || window.location.origin === 'null' ? 'http://dsh.internal/' : `${window.location.origin}/`
}

function optionalText(value: object, key: string): string | undefined {
  if (!(key in value)) return undefined
  const next = value[key as keyof typeof value]
  return typeof next === 'string' && next !== '' ? next : undefined
}
/** 插件自有的工作区树：复刻原生层级和拖拽行为，并在每个会话菜单中增加管理操作。 */
export function CodexWorkspaceBrowser(props: CodexWorkspaceBrowserProps) {
  return <HoverShell><CodexWorkspaceTree {...props} /></HoverShell>
}

function CodexWorkspaceTree({ wide, useSessions, useSessionPendingInteraction, useWorkspaces, t, archiveSession, deleteSession, deleteWorkspace, forkSession, insertSessionBefore, insertWorkspaceBefore, openPath, openSession, renameSession, renameWorkspace, startSession }: CodexWorkspaceBrowserProps) {
  const sessions = useSessions(state => state)
  const pendingInteractions = (useSessionPendingInteraction ?? useEmptySessionPendingInteraction)(state => state)
  const workspaces = useWorkspaces(state => state)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => readTreeExpansionState(storage(), WORKSPACE_EXPANSION_STORAGE_KEY))
  const [pinnedWorkspaceIds, setPinnedWorkspaceIdsState] = useState(() => readPinnedWorkspaceIds(storage()))
  const initialWorkspaceGroups = useMemo(() => readWorkspaceGroupsCache(storage()), [])
  const [workspaceGroups, setWorkspaceGroupsState] = useState<WorkspaceGroup[]>(() => initialWorkspaceGroups.workspaceGroups)
  const pinnedWorkspaceIdsRef = useRef(pinnedWorkspaceIds)
  pinnedWorkspaceIdsRef.current = pinnedWorkspaceIds
  const workspaceGroupsRef = useRef(workspaceGroups)
  workspaceGroupsRef.current = workspaceGroups
  const workspaceGroupsPendingHostSyncRef = useRef(initialWorkspaceGroups.pendingHostSync)
  const pinnedHostSupportsWorkspaceGroupsRef = useRef(false)
  const pinnedHostHydratedRef = useRef(false)
  const pinnedHostDirtyRef = useRef(false)
  const pinnedHostSkipWriteRef = useRef<{ pinnedWorkspaceIds: string[]; workspaceGroups: WorkspaceGroup[] }>()
  const pinnedHostWriteRef = useRef<Promise<void>>(Promise.resolve())
  const workspaceBaselineRef = useRef<{ ready: boolean; validIds: string[] }>({ ready: false, validIds: [] })
  workspaceBaselineRef.current = {
    ready: workspaces.baselinesReady === true,
    validIds: workspaces.items.map(workspace => String(workspace.workspaceId)),
  }
  const queuePinnedHostWrite = (ids: readonly string[], groups: readonly WorkspaceGroup[]): void => {
    const snapshot = { pinnedWorkspaceIds: [...ids], workspaceGroups: groups.map(group => ({ ...group, workspaceIds: [...group.workspaceIds] })) }
    const pending = pinnedHostWriteRef.current.then(async () => {
      await writeHostWorkspacePreferences(snapshot.pinnedWorkspaceIds, snapshot.workspaceGroups)
      if (!pinnedHostSupportsWorkspaceGroupsRef.current) return
      if (!sameIds(pinnedWorkspaceIdsRef.current, snapshot.pinnedWorkspaceIds) || !sameWorkspaceGroups(workspaceGroupsRef.current, snapshot.workspaceGroups)) return
      workspaceGroupsPendingHostSyncRef.current = false
      saveWorkspaceGroupsCache(storage(), snapshot.workspaceGroups, false)
    })
    pinnedHostWriteRef.current = pending.catch(() => undefined)
  }
  const setPinnedWorkspaceIds = (update: string[] | ((current: string[]) => string[])): void => {
    pinnedHostDirtyRef.current = true
    const current = pinnedWorkspaceIdsRef.current
    const next = typeof update === 'function' ? update(current) : update
    pinnedWorkspaceIdsRef.current = next
    setPinnedWorkspaceIdsState(next)
  }
  const setWorkspaceGroups = (update: WorkspaceGroup[] | ((current: WorkspaceGroup[]) => WorkspaceGroup[])): void => {
    pinnedHostDirtyRef.current = true
    workspaceGroupsPendingHostSyncRef.current = true
    const current = workspaceGroupsRef.current
    const next = typeof update === 'function' ? update(current) : update
    workspaceGroupsRef.current = next
    setWorkspaceGroupsState(next)
  }
  const [pinnedSessionIds, setPinnedSessionIds] = useState(() => readSessionIds(storage(), SESSION_PINS_STORAGE_KEY))
  const [unreadSessionIds, setUnreadSessionIds] = useState(() => readSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY))
  const previousSessionRunningRef = useRef<Record<string, boolean>>()
  const [menu, setMenu] = useState<MenuState>()
  const [renameTarget, setRenameTarget] = useState<RenameTarget>()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>()
  const { showTip: publishTip, hideTip, dismissTip, isShowing } = useHoverDispatch()
  const showTip = (tip: HoverCardTip, options?: { immediate?: boolean }): void => {
    if (menu !== undefined) return
    publishTip(tip, options)
  }
  const [renameDraft, setRenameDraft] = useState('')
  const [busy, setBusy] = useState<string>()
  const busyRef = useRef<string>()
  const [error, setError] = useState<string>()
  const [workspaceDragId, setWorkspaceDragId] = useState<string>()
  const [workspaceDropTarget, setWorkspaceDropTargetState] = useState<WorkspaceDropTarget>()
  const [workspaceGroupDragId, setWorkspaceGroupDragId] = useState<string>()
  const [workspaceGroupDropTarget, setWorkspaceGroupDropTargetState] = useState<WorkspaceGroupDropTarget>()
  const setWorkspaceGroupDropTarget = (target: WorkspaceGroupDropTarget | undefined): void => {
    setWorkspaceGroupDropTargetState(current => {
      if (current === undefined || target === undefined) return current === target ? current : target
      return current.beforeId === target.beforeId ? current : target
    })
  }
  const workspaceDropTargetRef = useRef<WorkspaceDropTarget>()
  const setWorkspaceDropTarget = (target: WorkspaceDropTarget | undefined): void => {
    // dragover 与 drop 可能发生在 React 提交 state 之前；ref 保证松手时读取到最后一个蓝线落点。
    if (sameWorkspaceDropTarget(workspaceDropTargetRef.current, target)) return
    workspaceDropTargetRef.current = target
    setWorkspaceDropTargetState(target)
  }
  const [headerMenu, setHeaderMenu] = useState<{ id: string; getRect: () => DOMRect }>()
  const headerMenuRef = useRef<{ id: string; getRect: () => DOMRect }>()
  headerMenuRef.current = headerMenu
  // 记录“pointerdown 时顶栏菜单还开着”的时刻，供 onMenu 判断这次点击是否为再次点击关闭
  const headerMenuPointerAt = useRef(0)
  const [sessionDrag, setSessionDrag] = useState<{ sessionId: string; workspaceId: string }>()
  const [sessionDropTarget, setSessionDropTarget] = useState<SessionDropTarget>()
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [groupTitleDraft, setGroupTitleDraft] = useState('')
  const [moveWorkspaceId, setMoveWorkspaceId] = useState<string>()
  const [deleteGroupId, setDeleteGroupId] = useState<string>()
  const [groupMenuOpen, setGroupMenuOpen] = useState(false)

  useEffect(() => { writeTreeExpansionState(storage(), WORKSPACE_EXPANSION_STORAGE_KEY, expanded) }, [expanded])

  useEffect(() => {
    savePinnedWorkspaceIds(storage(), pinnedWorkspaceIds)
    saveWorkspaceGroupsCache(storage(), workspaceGroups, workspaceGroupsPendingHostSyncRef.current)
    if (!pinnedHostHydratedRef.current) return
    const skippedHydration = pinnedHostSkipWriteRef.current
    pinnedHostSkipWriteRef.current = undefined
    if (skippedHydration !== undefined && sameIds(skippedHydration.pinnedWorkspaceIds, pinnedWorkspaceIds) && sameWorkspaceGroups(skippedHydration.workspaceGroups, workspaceGroups)) {
      return
    }
    queuePinnedHostWrite(pinnedWorkspaceIds, workspaceGroups)
  }, [pinnedWorkspaceIds, workspaceGroups])
  useEffect(() => {
    let alive = true
    const local = { pinnedWorkspaceIds: [...pinnedWorkspaceIdsRef.current], workspaceGroups: workspaceGroupsRef.current }
    void readHostPinnedWorkspaceIds().then(host => {
      if (!alive) return
      const dirty = pinnedHostDirtyRef.current
        ? { pinnedWorkspaceIds: pinnedWorkspaceIdsRef.current, workspaceGroups: workspaceGroupsRef.current }
        : undefined
      const hydration = resolveWorkspacePreferencesHydration(local, host, dirty, workspaceGroupsPendingHostSyncRef.current)
      const baseline = workspaceBaselineRef.current
      const ids = baseline.ready ? prunePinnedWorkspaceIds(hydration.pinnedWorkspaceIds, baseline.validIds) : hydration.pinnedWorkspaceIds
      const groups = baseline.ready ? pruneWorkspaceGroups(hydration.workspaceGroups, baseline.validIds) : hydration.workspaceGroups
      const writeHost = hydration.writeHost || !sameIds(ids, hydration.pinnedWorkspaceIds) || !sameWorkspaceGroups(groups, hydration.workspaceGroups)
      pinnedHostSupportsWorkspaceGroupsRef.current = host.workspaceGroupsSupported !== false
      workspaceGroupsPendingHostSyncRef.current = workspaceGroupsPendingHostSyncRef.current
        || (host.workspaceGroupsSupported === false && groups.length > 0)
        || (!host.exists && local.workspaceGroups.length > 0)
      pinnedHostHydratedRef.current = true
      if (!sameIds(pinnedWorkspaceIdsRef.current, ids) || !sameWorkspaceGroups(workspaceGroupsRef.current, groups)) {
        // 只跳过这一份 hydration 快照；若用户紧接着操作，新的状态仍必须写回 Host。
        pinnedHostSkipWriteRef.current = { pinnedWorkspaceIds: [...ids], workspaceGroups: groups }
        pinnedWorkspaceIdsRef.current = ids
        workspaceGroupsRef.current = groups
        setPinnedWorkspaceIdsState(ids)
        setWorkspaceGroupsState(groups)
      }
      savePinnedWorkspaceIds(storage(), ids)
      if (writeHost) queuePinnedHostWrite(ids, groups)
    }).catch(() => {
      // 旧 Host 或临时不可用时保留当前 origin 的缓存；下次加载再尝试迁移。
      pinnedHostHydratedRef.current = true
    })
    return () => { alive = false }
  }, [])
  useEffect(() => { writeSessionIds(storage(), SESSION_PINS_STORAGE_KEY, pinnedSessionIds) }, [pinnedSessionIds])
  useEffect(() => { writeSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY, unreadSessionIds) }, [unreadSessionIds])
  useEffect(() => {
    // Host 可能在 workspace.list 完成前先送来单条 frame；非空不代表完整，必须等双基线 ready。
    // 否则临时列表会把已保存的置顶过滤为空，再由持久化 effect 永久写回空数组。
    if (workspaces.baselinesReady !== true) return
    const validIds = workspaces.items.map(workspace => String(workspace.workspaceId))
    const nextPinned = prunePinnedWorkspaceIds(pinnedWorkspaceIdsRef.current, validIds)
    const nextGroups = pruneWorkspaceGroups(workspaceGroupsRef.current, validIds)
    if (!sameIds(pinnedWorkspaceIdsRef.current, nextPinned)) {
      pinnedWorkspaceIdsRef.current = nextPinned
      setPinnedWorkspaceIdsState(nextPinned)
    }
    if (!sameWorkspaceGroups(workspaceGroupsRef.current, nextGroups)) {
      workspaceGroupsRef.current = nextGroups
      setWorkspaceGroupsState(nextGroups)
    }
  }, [workspaces.baselinesReady, workspaces.items])
  useEffect(() => {
    const current = sessions.current
    if (current !== undefined) setUnreadSessionIds(ids => ids.filter(id => id !== current))
  }, [sessions.current])
  useEffect(() => {
    const next = Object.fromEntries(Object.entries(sessions.byId).map(([id, session]) => [id, session.running === true]))
    const previous = previousSessionRunningRef.current
    previousSessionRunningRef.current = next
    if (previous === undefined) return
    const completed = completedBackgroundSessionIds(previous, next, sessions.current)
    if (completed.length > 0) setUnreadSessionIds(ids => [...completed, ...ids.filter(id => !completed.includes(id))])
  }, [sessions.byId, sessions.current])
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

  // 记录“pointerdown 时顶栏菜单还开着”的时刻：菜单打开时点击三点按钮，宿主 Menu 会在
  // pointerdown 阶段先关闭菜单，随后 click 再派发事件；若不区分，click 会把菜单立即重开。
  useEffect(() => {
    const onPointerDown = (): void => {
      if (headerMenuRef.current !== undefined) headerMenuPointerAt.current = performance.now()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => { window.removeEventListener('pointerdown', onPointerDown, true) }
  }, [])

  useEffect(() => {
    const onProject = (event: Event): void => {
      const detail = (event as CustomEvent<HeaderAnchorDetail>).detail
      const current = sessions.current
      const workspace = groups.items.find(item => current !== undefined && item.visibleIds.includes(String(current)))
      if (workspace === undefined || detail === undefined) return
      if (detail.toggle === true && isShowing('workspace', workspace.workspaceId)) {
        dismissTip()
        return
      }
      showTip({ kind: 'workspace', id: workspace.workspaceId, title: workspace.title, path: workspace.path, count: workspace.visibleIds.length, left: detail.left, top: detail.top }, { immediate: true })
    }
    const onMenu = (event: Event): void => {
      const detail = (event as CustomEvent<HeaderAnchorDetail>).detail
      const current = sessions.current
      if (current === undefined || detail === undefined) return
      dismissTip()
      // 500ms 内有一次“菜单开着时”的 pointerdown：这次点击是再次点击关闭，不再重开
      if (performance.now() - headerMenuPointerAt.current < 500) {
        headerMenuPointerAt.current = 0
        setHeaderMenu(undefined)
        return
      }
      setHeaderMenu({ id: current, getRect: detail.getRect })
    }
    window.addEventListener(HEADER_PROJECT_TIP_EVENT, onProject)
    window.addEventListener(HEADER_SESSION_MENU_EVENT, onMenu)
    return () => {
      window.removeEventListener(HEADER_PROJECT_TIP_EVENT, onProject)
      window.removeEventListener(HEADER_SESSION_MENU_EVENT, onMenu)
    }
  }, [groups.items, sessions.current, menu])


  const projectPinned = (id: WorkspaceId | string): boolean => pinnedWorkspaceIds.includes(String(id))
  const pinnedGroups = orderByIds(groups.items, pinnedWorkspaceIds, workspace => String(workspace.workspaceId))
  const regularGroups = groups.items.filter(workspace => !projectPinned(workspace.workspaceId))
  const pinDragActive = workspaceDragId !== undefined
  const pinnedGroupIds = pinnedGroups.map(workspace => String(workspace.workspaceId))
  const regularGroupIds = regularGroups.map(workspace => String(workspace.workspaceId))
  const groupedIds = new Set(groupedWorkspaceIds(workspaceGroups))
  const workspaceGroupIds = workspaceGroups.map(group => group.id)
  const ungroupedGroups = regularGroups.filter(workspace => !groupedIds.has(String(workspace.workspaceId)))
  const ungroupedGroupIds = ungroupedGroups.map(workspace => String(workspace.workspaceId))
  const workspaceById = new Map(regularGroups.map(workspace => [String(workspace.workspaceId), workspace]))
  const pinnedHeaderDrop = workspaceDropTarget?.zone === 'pinned' && workspaceDropTarget.beforeId === pinnedGroupIds[0]
    ? pinnedHeaderDropIndicator(pinnedGroupIds)
    : undefined
  const assignedIds = workspaces.items.flatMap(workspace => workspace.sessionIds.map(id => String(id)))
  const recentIds = ungroupedSessionIds(sessions.ids ?? Object.keys(sessions.byId), sessions.byId, assignedIds, workspaces.archivedSessionIds).sort((left, right) => (sessions.byId[right as SessionId]?.updatedAt ?? 0) - (sessions.byId[left as SessionId]?.updatedAt ?? 0))
  const run = async (key: string, action: () => Promise<unknown>): Promise<void> => {
    if (busyRef.current !== undefined) return
    busyRef.current = key
    setBusy(key)
    setError(undefined)
    try { await action(); setMenu(undefined) } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) } finally { busyRef.current = undefined; setBusy(undefined) }
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
  const openPathImmediately = (path: string): void => {
    // 系统窗口的首次创建可能需要片刻；先收起菜单，避免点击后看起来毫无响应。
    setMenu(undefined)
    setHeaderMenu(undefined)
    void run('open-path', () => openPath(path))
  }
  const toggleGroup = (key: string, defaultOpen = true): void => {
    setExpanded(current => ({ ...current, [key]: !(current[key] ?? defaultOpen) }))
  }
  const submitCreateGroup = (): void => {
    if (groupTitleDraft.trim() === '') return
    try {
      setWorkspaceGroups(current => createWorkspaceGroup(current, { id: newWorkspaceGroupId(), title: groupTitleDraft }))
      setCreateGroupOpen(false)
      setGroupTitleDraft('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const sectionOpen = (id: 'pinned' | 'projects' | 'recent'): boolean => expanded[`section:${id}`] ?? true
  const toggleSection = (id: 'pinned' | 'projects' | 'recent'): void => {
    setExpanded(current => ({ ...current, [`section:${id}`]: !(current[`section:${id}`] ?? true) }))
  }
  const moveWorkspaceToGroup = (groupId?: string): void => {
    const workspaceId = moveWorkspaceId
    if (workspaceId === undefined) return
    setWorkspaceGroups(current => assignWorkspaceToGroup(current, workspaceId, groupId))
    if (pinnedWorkspaceIdsRef.current.includes(workspaceId)) {
      setPinnedWorkspaceIds(ids => ids.filter(id => id !== workspaceId))
    }
    setMoveWorkspaceId(undefined)
  }
  const projectMenu = (workspace: (typeof groups.items)[number]): MenuEntry[] => [
    { id: 'new', label: t('workspace.newSession'), icon: <IconPlusOutline16 size={16} /> },
    { id: 'rename', label: t('workspace.rename'), icon: <IconEditOutline16 size={16} /> },
    { id: 'pin', label: t(projectPinned(workspace.workspaceId) ? 'workspace.unpin' : 'workspace.pin'), icon: <PinIcon /> },
    { id: 'moveToGroup', label: t('workspace.moveToGroup'), icon: <IconFolderClose16 size={16} /> },
    { id: 'openPath', label: t('workspace.openPath'), icon: <IconFolderOpenOutline16 size={16} /> },
    { type: 'separator', id: 'project-separator' },
    { id: 'delete', label: t('workspace.delete'), icon: <IconTrashOutline16 size={16} />, danger: true },
  ]
  const sessionMenu = (sessionId: string, _title: string, path: string | undefined): MenuEntry[] => sessionMenuItems(t, { pinned: pinnedSessionIds.includes(sessionId), unread: unreadSessionIds.includes(sessionId), path, includePath: true })
  const pinWorkspaceAt = (id: string, beforeId?: string): void => { setPinnedWorkspaceIds(ids => insertPinnedWorkspace(ids, id, beforeId)) }
  const renderGroup = (workspace: (typeof groups.items)[number], zone: 'pinned' | 'projects') => {
    const expandKey = zone === 'pinned' ? `pin:${workspace.workspaceId}` : String(workspace.workspaceId)
    const isExpanded = expanded[expandKey] ?? true
    const shownIds = workspace.visibleIds
    const menuOpen = menu?.type === 'workspace' && menu.id === workspace.workspaceId
    const menuAt = menuOpen && menu.x !== undefined && menu.y !== undefined ? { x: menu.x, y: menu.y } : undefined
    const isPinnedHeaderDrop = zone === 'pinned' && pinnedHeaderDrop?.kind === 'workspace' && pinnedHeaderDrop.workspaceId === String(workspace.workspaceId)
    const workspaceId = String(workspace.workspaceId)
    const zoneIds = zone === 'pinned' ? pinnedGroupIds : regularGroupIds
    const dropsBefore = workspaceDropTarget?.zone === zone && workspaceDropTarget.beforeId === workspaceId
    // 置顶末尾已有独立 pin-end 指示器；项目组再画一次会形成截图中的两条平行蓝线。
    const dropsAfterLast = zone === 'projects' && workspaceDropTarget?.zone === zone && workspaceDropTarget.beforeId === undefined && zoneIds[zoneIds.length - 1] === workspaceId
    const projectSessionDrop = sessionDropTarget?.workspaceId === workspaceId && sessionDropTarget.ontoProject === true
    return <div className={`dcu-wb-project${isPinnedHeaderDrop || dropsBefore ? ' dcu-wb-drop' : ''}${dropsAfterLast ? ' dcu-wb-drop dcu-wb-drop-after' : ''}${projectSessionDrop ? ' dcu-wb-session-drop' : ''}`} key={workspace.workspaceId} onDragOver={(event) => { const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (draggedWorkspace !== undefined) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; const rect = event.currentTarget.getBoundingClientRect(); const after = event.clientY > rect.top + rect.height / 2; const beforeId = reorderDropBeforeId(zoneIds, draggedWorkspace, workspaceId, after); setWorkspaceDropTarget(beforeId === null ? undefined : { zone, beforeId }); return } if (sessionDrag === undefined || sessionDrag.workspaceId !== workspaceId) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setSessionDropTarget({ workspaceId, beforeId: shownIds[0], ontoProject: true }) }} onDragLeave={(event) => { if (event.currentTarget.contains(event.relatedTarget as Node)) return; setWorkspaceDropTarget(undefined); setSessionDropTarget(undefined) }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (dragged !== undefined) { const rect = event.currentTarget.getBoundingClientRect(); const after = event.clientY > rect.top + rect.height / 2; setWorkspaceDragId(undefined); setWorkspaceDropTarget(undefined); const beforeId = reorderDropBeforeId(zoneIds, dragged, workspaceId, after); if (beforeId === null) return; if (zone === 'pinned') { pinWorkspaceAt(dragged, beforeId); return } const hostIds = groups.items.map(item => String(item.workspaceId)); if (moveBefore(hostIds, dragged, beforeId).some((id, index) => id !== hostIds[index])) void run('workspace-order', () => insertWorkspaceBefore(dragged as WorkspaceId, beforeId as WorkspaceId | undefined)); return } const drag = sessionDrag; setSessionDrag(undefined); setSessionDropTarget(undefined); if (drag === undefined || drag.workspaceId !== workspaceId) return; void run('session-order', () => insertSessionBefore(workspace.workspaceId, drag.sessionId as SessionId, shownIds[0] as SessionId | undefined)) }}>
      <div className={`dcu-wb-project-head${menuOpen ? ' dcu-wb-menu-open' : ''}${workspaceDragId === workspaceId ? ' dcu-wb-dragging' : ''}`} role="treeitem" aria-expanded={isExpanded} tabIndex={0} draggable onDragStart={(event) => { event.stopPropagation(); setSessionDrag(undefined); setSessionDropTarget(undefined); setWorkspaceGroupDragId(undefined); setWorkspaceGroupDropTarget(undefined); writeWorkspaceDrag(event.dataTransfer, workspaceId, workspace.title); const preview = document.createElement('div'); preview.className = 'dcu-wb-drag-ghost'; preview.textContent = workspace.title; document.body.appendChild(preview); event.dataTransfer.setDragImage(preview, 16, 18); window.requestAnimationFrame(() => { preview.remove() }); setWorkspaceDragId(workspaceId) }} onDragEnd={() => { setWorkspaceDragId(undefined); setWorkspaceDropTarget(undefined); setWorkspaceGroupDropTarget(undefined) }} onClick={() => { toggleGroup(expandKey, true) }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenu({ id: workspace.workspaceId, type: 'workspace', x: event.clientX, y: event.clientY }) }} onMouseEnter={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); showTip({ kind: 'workspace', id: workspace.workspaceId, title: workspace.title, path: workspace.path, count: workspace.visibleIds.length, left: box.left, top: box.top }) }} onMouseLeave={hideTip} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleGroup(expandKey, true) } }}>
        <span className="dcu-wb-folder" onClick={(event) => { event.stopPropagation(); const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); if (isShowing('workspace', workspace.workspaceId)) { dismissTip(); return } showTip({ kind: 'workspace', id: workspace.workspaceId, title: workspace.title, path: workspace.path, count: workspace.visibleIds.length, left: box.left, top: box.top }, { immediate: true }) }}>{isExpanded ? <IconFolderOpenOutline16 size={16} /> : <IconFolderClose16 size={16} />}</span><span className="dcu-wb-project-title">{workspace.title}</span><span className="dcu-wb-actions"><Menu open={menuOpen} onClose={() => { setMenu(undefined) }} items={projectMenu(workspace)} onSelect={(id) => { if (busy !== undefined) return; if (id === 'new') { startSession(workspace.workspaceId); setMenu(undefined) }; if (id === 'rename') beginRename('workspace', workspace.workspaceId, workspace.title); if (id === 'pin') { setPinnedWorkspaceIds(ids => togglePinnedWorkspace(ids, workspace.workspaceId)); setMenu(undefined) }; if (id === 'moveToGroup') { setMoveWorkspaceId(workspaceId); setMenu(undefined) }; if (id === 'openPath') openPathImmediately(workspace.path); if (id === 'delete') { setDeleteTarget({ id: workspace.workspaceId, kind: 'workspace', title: workspace.title }); setError(undefined); setMenu(undefined) } }} portal dense compact getAnchorRect={menuAt === undefined ? undefined : () => pointerMenuRect(menuAt.x, menuAt.y)} anchor={<button type="button" className="dcu-wb-more" aria-label={t('workspace.actions', { name: workspace.title })} onClick={(event) => { event.stopPropagation(); setMenu(current => current?.id === workspace.workspaceId && current.type === 'workspace' ? undefined : { id: workspace.workspaceId, type: 'workspace' }) }}><IconEllipsisOutline16 size={16} /></button>} /></span><span className="dcu-wb-actions"><button type="button" className="dcu-wb-more" aria-label={t('workspace.newSession')} onClick={(event) => { event.stopPropagation(); startSession(workspace.workspaceId) }}><IconPlusOutline16 size={16} /></button></span>
      </div>
      <DisclosureBody className="dcu-wb-project-body" open={isExpanded}>
      {shownIds.length === 0 && <div className="dcu-wb-nochat">{t('workspace.noChat')}</div>}
      {shownIds.map((id) => {
        const session = sessions.byId[id as SessionId]
        if (session === undefined) return null
        const pendingInteraction = pendingInteractionForSession(id, pendingInteractions, session.pendingInteraction)
        const path = session.cwd ?? workspace.path
        const selected = sessions.current === id
        const sessionMenuOpen = menu?.type === 'session' && menu.id === id
        const sessionMenuAt = sessionMenuOpen && menu.x !== undefined && menu.y !== undefined ? { x: menu.x, y: menu.y } : undefined
        const dropsBeforeSession = sessionDropTarget?.workspaceId === workspaceId && sessionDropTarget.ontoProject !== true && sessionDropTarget.beforeId === id
        const dropsAfterLastSession = sessionDropTarget?.workspaceId === workspaceId && sessionDropTarget.ontoProject !== true && sessionDropTarget.beforeId === undefined && shownIds[shownIds.length - 1] === id
        return <div key={id} className={`dcu-wb-session${selected ? ' dcu-wb-selected' : ''}${sessionMenuOpen ? ' dcu-wb-menu-open' : ''}${dropsBeforeSession ? ' dcu-wb-drop' : ''}${dropsAfterLastSession ? ' dcu-wb-drop dcu-wb-drop-after' : ''}`} role="treeitem" aria-selected={selected} draggable onDragStart={(event) => { event.stopPropagation(); setWorkspaceDragId(undefined); setWorkspaceDropTarget(undefined); setWorkspaceGroupDragId(undefined); setWorkspaceGroupDropTarget(undefined); writeSessionDrag(event.dataTransfer, id, session.displayTitle); const preview = document.createElement('div'); preview.className = 'dcu-wb-drag-ghost'; preview.textContent = session.displayTitle; document.body.appendChild(preview); event.dataTransfer.setDragImage(preview, 16, 18); window.requestAnimationFrame(() => { preview.remove() }); setSessionDrag({ sessionId: id, workspaceId }) }} onDragEnd={() => { setSessionDrag(undefined); setSessionDropTarget(undefined); setWorkspaceGroupDropTarget(undefined) }} onDragOver={(event) => { const drag = sessionDrag; if (drag === undefined || drag.workspaceId !== workspaceId) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; const rect = event.currentTarget.getBoundingClientRect(); const beforeId = reorderDropBeforeId(shownIds, drag.sessionId, id, event.clientY > rect.top + rect.height / 2); setSessionDropTarget(beforeId === null ? undefined : { workspaceId, beforeId }) }} onDragLeave={(event) => { if (event.currentTarget.contains(event.relatedTarget as Node)) return; setSessionDropTarget(undefined) }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const drag = sessionDrag; const rect = event.currentTarget.getBoundingClientRect(); setSessionDrag(undefined); setSessionDropTarget(undefined); if (drag === undefined || drag.workspaceId !== workspaceId) return; const beforeId = reorderDropBeforeId(shownIds, drag.sessionId, id, event.clientY > rect.top + rect.height / 2); if (beforeId !== null) void run('session-order', () => insertSessionBefore(workspace.workspaceId, drag.sessionId as SessionId, beforeId as SessionId | undefined)) }} onClick={() => { setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenu({ id, type: 'session', x: event.clientX, y: event.clientY }) }} onMouseEnter={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); const branch = optionalText(session, 'branch'); showTip({ kind: 'session', id, title: session.displayTitle, project: workspace.title, path: path, branch, time: formatHoverTime(session.updatedAt), left: box.left, top: box.top }) }} onMouseLeave={hideTip}><span className="dcu-wb-session-title">{session.displayTitle.split(/\r?\n/)[0] ?? session.displayTitle}</span>{pinnedSessionIds.includes(id) && <span className="dcu-wb-pin" aria-label={t('sessions.pinned')}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.5h6M5 2.5v2L3.75 6v1h8.5V6L11 4.5v-2M8 7v6" /></svg></span>}<SessionState pendingInteraction={pendingInteraction} unread={unreadSessionIds.includes(id)} running={session.running === true} t={t} /><span className="dcu-wb-quick-actions"><button type="button" className="dcu-wb-more dcu-wb-quick-pin" aria-label={t(pinnedSessionIds.includes(id) ? 'sessions.unpin' : 'sessions.pin')} onClick={(event) => { event.stopPropagation(); setPinnedSessionIds(ids => toggleSessionId(ids, id)) }}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.5h6M5 2.5v2L3.75 6v1h8.5V6L11 4.5v-2M8 7v6" /></svg></button><button type="button" className="dcu-wb-more" aria-label={t('sessions.archive')} onClick={(event) => { event.stopPropagation(); void run('archive', () => archiveSession(id as SessionId)) }}><IconArchiveOutline20 size={16} /></button></span><span className="dcu-wb-actions"><Menu open={sessionMenuOpen} onClose={() => { setMenu(undefined) }} items={sessionMenu(id, session.displayTitle, path)} onSelect={(action) => { if (busy !== undefined) return; const link = sessionDeepLink(browserBase(), id); if (action === 'rename') beginRename('session', id, session.displayTitle); if (action === 'pin') { setPinnedSessionIds(ids => toggleSessionId(ids, id)); setMenu(undefined) }; if (action === 'unread') { setUnreadSessionIds(ids => toggleSessionId(ids, id)); setMenu(undefined) }; if (action === 'archive') void run('archive', () => archiveSession(id as SessionId)); if (action === 'delete') { setDeleteTarget({ id, kind: 'session', title: session.displayTitle }); setError(undefined); setMenu(undefined) }; if (action === 'fork') void run('fork', () => forkSession(id as SessionId)); if (action === 'openPath' && path !== undefined) openPathImmediately(path); if (action === 'copyPath') copy(path); if (action === 'copyTitle') copy(session.displayTitle); if (action === 'copyId') copy(id); if (action === 'copyLink') copy(link) }} portal dense compact getAnchorRect={sessionMenuAt === undefined ? undefined : () => pointerMenuRect(sessionMenuAt.x, sessionMenuAt.y)} anchor={<button type="button" className="dcu-wb-more dcu-wb-context-anchor" aria-label={t('sessions.actions', { name: session.displayTitle })} onClick={(event) => { event.stopPropagation(); setMenu(current => current?.id === id && current.type === 'session' ? undefined : { id, type: 'session' }) }}><IconEllipsisOutline16 size={16} /></button>} /></span></div>
      })}
      </DisclosureBody>
    </div>
  }

  const renderWorkspaceCollection = (group: WorkspaceGroup) => {
    const groupId = group.id
    const expandKey = `workspace-group:${group.id}`
    const isExpanded = expanded[expandKey] ?? true
    const members = group.workspaceIds.flatMap(id => {
      const workspace = workspaceById.get(id)
      return workspace === undefined ? [] : [workspace]
    })
    const memberIds = members.map(workspace => String(workspace.workspaceId))
    const groupDropActive = workspaceDropTarget?.zone === 'group' && workspaceDropTarget.groupId === group.id && workspaceDropTarget.ontoGroup === true
    const groupOrderDrop = workspaceGroupDropTarget?.beforeId === groupId
    return <div className={`dcu-wb-collection${groupOrderDrop ? ' dcu-wb-group-order-drop' : ''}`} key={group.id} onDragOver={(event) => { const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId); if (draggedGroupId !== undefined) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setWorkspaceDropTarget(undefined); const head = event.currentTarget.querySelector<HTMLElement>(':scope > .dcu-wb-collection-head'); const rect = head?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect(); const beforeId = reorderDropBeforeId(workspaceGroupIds, draggedGroupId, groupId, event.clientY > rect.top + rect.height / 2); setWorkspaceGroupDropTarget(beforeId === null ? undefined : { beforeId }); return } const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (dragged === undefined) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setWorkspaceGroupDropTarget(undefined); setWorkspaceDropTarget({ zone: 'group', groupId, ontoGroup: true }) }} onDragLeave={(event) => { if (event.currentTarget.contains(event.relatedTarget as Node)) return; setWorkspaceDropTarget(undefined); setWorkspaceGroupDropTarget(undefined) }} onDrop={(event) => { const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId); if (draggedGroupId !== undefined) { event.preventDefault(); event.stopPropagation(); const head = event.currentTarget.querySelector<HTMLElement>(':scope > .dcu-wb-collection-head'); const rect = head?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect(); const beforeId = reorderDropBeforeId(workspaceGroupIds, draggedGroupId, groupId, event.clientY > rect.top + rect.height / 2); setWorkspaceGroupDragId(undefined); setWorkspaceGroupDropTarget(undefined); if (beforeId !== null) setWorkspaceGroups(current => moveWorkspaceGroup(current, draggedGroupId, beforeId)); return } const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (dragged === undefined) return; event.preventDefault(); event.stopPropagation(); setWorkspaceDragId(undefined); setWorkspaceDropTarget(undefined); setWorkspaceGroups(current => current.find(candidate => candidate.workspaceIds.includes(dragged))?.id === groupId ? moveWorkspaceGroupMember(current, dragged, groupId) : assignWorkspaceToGroup(current, dragged, groupId)) }}>
      <div className={`dcu-wb-collection-head${groupDropActive ? ' dcu-wb-group-drop' : ''}${workspaceGroupDragId === groupId ? ' dcu-wb-dragging' : ''}`} draggable onDragStart={(event) => { event.stopPropagation(); setSessionDrag(undefined); setSessionDropTarget(undefined); setWorkspaceDragId(undefined); setWorkspaceDropTarget(undefined); setWorkspaceGroupDropTarget(undefined); writeWorkspaceGroupDrag(event.dataTransfer, groupId, group.title); const preview = document.createElement('div'); preview.className = 'dcu-wb-drag-ghost'; preview.textContent = group.title; document.body.appendChild(preview); event.dataTransfer.setDragImage(preview, 16, 18); window.requestAnimationFrame(() => { preview.remove() }); setWorkspaceGroupDragId(groupId) }} onDragEnd={() => { setWorkspaceGroupDragId(undefined); setWorkspaceGroupDropTarget(undefined) }}>
        <button type="button" className="dcu-wb-collection-label" draggable aria-expanded={isExpanded} onClick={() => { toggleGroup(expandKey, true) }}>
          <span className="dcu-wb-section-caret" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12"><path d="M6.25 4.25 10.25 8 6.25 11.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span>{group.title}</span><span className="dcu-wb-collection-count">{members.length}</span>
        </button>
      </div>
      <DisclosureBody className="dcu-wb-collection-body" open={isExpanded}>{members.map((workspace) => {
        const workspaceId = String(workspace.workspaceId)
        const preciseTarget = workspaceDropTarget?.zone === 'group' && workspaceDropTarget.groupId === groupId && workspaceDropTarget.ontoGroup !== true
        const orderDrop = preciseTarget && workspaceDropTarget.beforeId === workspaceId
        const orderDropAfter = preciseTarget && workspaceDropTarget.beforeId === undefined && memberIds[memberIds.length - 1] === workspaceId
        return <div key={workspaceId} data-dcu-group-member className={`dcu-wb-group-member${orderDrop ? ' dcu-wb-drop' : ''}${orderDropAfter ? ' dcu-wb-drop dcu-wb-drop-after' : ''}`} onDragOverCapture={(event) => { const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (dragged === undefined) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; const rect = event.currentTarget.getBoundingClientRect(); const beforeId = reorderDropBeforeId(memberIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2); setWorkspaceDropTarget(beforeId === null ? undefined : { zone: 'group', groupId, beforeId }) }} onDropCapture={(event) => { const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (dragged === undefined) return; event.preventDefault(); event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); const beforeId = reorderDropBeforeId(memberIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2); setWorkspaceDragId(undefined); setWorkspaceDropTarget(undefined); if (beforeId === null) return; setWorkspaceGroups(current => current.find(candidate => candidate.workspaceIds.includes(dragged))?.id === groupId ? moveWorkspaceGroupMember(current, dragged, groupId, beforeId) : placeWorkspaceInGroup(current, dragged, groupId, beforeId)) }}>{renderGroup(workspace, 'projects')}</div>
      })}{members.length === 0 && <div className="dcu-wb-empty">{t('workspace.empty')}</div>}</DisclosureBody>
    </div>
  }

  const renderUngroupedCollection = () => {
    const ungroupedExpandKey = 'workspace-group:ungrouped'
    const ungroupedExpanded = expanded[ungroupedExpandKey] ?? true
    const ungroupedDropActive = workspaceDropTarget?.zone === 'ungrouped' && workspaceDropTarget.ontoSection === true
    const groupOrderDrop = workspaceGroupDropTarget !== undefined && workspaceGroupDropTarget.beforeId === undefined
    return <div className={`dcu-wb-ungrouped${groupOrderDrop ? ' dcu-wb-group-order-drop' : ''}`} onDragOver={(event) => { const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId); if (draggedGroupId !== undefined) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setWorkspaceDropTarget(undefined); const lastGroupId = workspaceGroupIds[workspaceGroupIds.length - 1]; const beforeId = lastGroupId === undefined ? null : reorderDropBeforeId(workspaceGroupIds, draggedGroupId, lastGroupId, true); setWorkspaceGroupDropTarget(beforeId === null ? undefined : { beforeId: undefined }); return } const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (dragged === undefined) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setWorkspaceGroupDropTarget(undefined); setWorkspaceDropTarget({ zone: 'ungrouped', ontoSection: true }) }} onDragLeave={(event) => { if (event.currentTarget.contains(event.relatedTarget as Node)) return; setWorkspaceDropTarget(undefined); setWorkspaceGroupDropTarget(undefined) }} onDrop={(event) => { const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId); if (draggedGroupId !== undefined) { event.preventDefault(); event.stopPropagation(); const lastGroupId = workspaceGroupIds[workspaceGroupIds.length - 1]; const beforeId = lastGroupId === undefined ? null : reorderDropBeforeId(workspaceGroupIds, draggedGroupId, lastGroupId, true); setWorkspaceGroupDragId(undefined); setWorkspaceGroupDropTarget(undefined); if (beforeId !== null) setWorkspaceGroups(current => moveWorkspaceGroup(current, draggedGroupId)); return } const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (dragged === undefined) return; event.preventDefault(); event.stopPropagation(); setWorkspaceDragId(undefined); setWorkspaceDropTarget(undefined); setWorkspaceGroups(current => assignWorkspaceToGroup(current, dragged)); void run('workspace-order', () => insertWorkspaceBefore(dragged as WorkspaceId)) }}>
      <div className={`dcu-wb-collection-head${ungroupedDropActive ? ' dcu-wb-group-drop' : ''}`}>
        <button type="button" className="dcu-wb-collection-label" aria-expanded={ungroupedExpanded} onClick={() => { toggleGroup(ungroupedExpandKey, true) }}>
          <span className="dcu-wb-section-caret" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12"><path d="M6.25 4.25 10.25 8 6.25 11.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span>{t('workspace.ungrouped')}</span><span className="dcu-wb-collection-count">{ungroupedGroups.length}</span>
        </button>
      </div>
      <DisclosureBody className="dcu-wb-collection-body" open={ungroupedExpanded}>{ungroupedGroups.map((workspace) => {
        const workspaceId = String(workspace.workspaceId)
        const preciseTarget = workspaceDropTarget?.zone === 'ungrouped' && workspaceDropTarget.ontoSection !== true
        const orderDrop = preciseTarget && workspaceDropTarget.beforeId === workspaceId
        const orderDropAfter = preciseTarget && workspaceDropTarget.beforeId === undefined && ungroupedGroupIds[ungroupedGroupIds.length - 1] === workspaceId
        return <div key={workspaceId} data-dcu-ungrouped-member className={`dcu-wb-group-member dcu-wb-ungrouped-member${orderDrop ? ' dcu-wb-drop' : ''}${orderDropAfter ? ' dcu-wb-drop dcu-wb-drop-after' : ''}`} onDragOverCapture={(event) => { const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (dragged === undefined) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; const rect = event.currentTarget.getBoundingClientRect(); const beforeId = reorderDropBeforeId(ungroupedGroupIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2); setWorkspaceDropTarget(beforeId === null ? undefined : { zone: 'ungrouped', beforeId }) }} onDropCapture={(event) => { const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (dragged === undefined) return; event.preventDefault(); event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); const beforeId = reorderDropBeforeId(ungroupedGroupIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2); setWorkspaceDragId(undefined); setWorkspaceDropTarget(undefined); if (beforeId === null) return; if (groupedIds.has(dragged)) setWorkspaceGroups(current => assignWorkspaceToGroup(current, dragged)); void run('workspace-order', () => insertWorkspaceBefore(dragged as WorkspaceId, beforeId as WorkspaceId | undefined)) }}>{renderGroup(workspace, 'projects')}</div>
      })}</DisclosureBody>
    </div>
  }

  const treeRef = useRef<HTMLDivElement>(null)
  useSectionDisclosureMotion(treeRef)

  if (!wide) return <div className="dcu-wb dcu-wb-rail"><style>{stylesheet}</style></div>
  return <section className="dcu-wb" aria-label={t('workspace.label')}>
    <style>{stylesheet}{runningStyles}{typographyStyles}{collectionLayoutStyles}</style>
    {error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}
    <div ref={treeRef} className="dcu-wb-tree" role="tree">
      <section className="dcu-wb-section" aria-label={t('workspace.pinned')} onDragOver={(event) => { if (!pinDragActive) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; if (event.target === event.currentTarget || (event.target instanceof Element && event.target.closest('.dcu-wb-section-head') !== null)) { const firstId = pinnedGroupIds[0]; const beforeId = firstId === undefined ? undefined : reorderDropBeforeId(pinnedGroupIds, workspaceDragId, firstId, false); setWorkspaceDropTarget(beforeId === null ? undefined : { zone: 'pinned', beforeId }) } }} onDrop={(event) => { event.preventDefault(); const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId); const target = workspaceDropTargetRef.current; setWorkspaceDragId(undefined); setWorkspaceDropTarget(undefined); if (draggedWorkspace !== undefined && target?.zone === 'pinned') pinWorkspaceAt(draggedWorkspace, target.beforeId) }} onDragLeave={(event) => { if (event.currentTarget.contains(event.relatedTarget as Node)) return; setWorkspaceDropTarget(undefined) }}>
        <div className="dcu-wb-section-head"><button type="button" className="dcu-wb-section-label" aria-expanded={sectionOpen('pinned')} onClick={() => { toggleSection('pinned') }}>{t('workspace.pinned')}<span className="dcu-wb-section-caret" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12"><path d="M6.25 4.25 10.25 8 6.25 11.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span></button></div>
        <div className="dcu-wb-section-body" data-open={sectionOpen('pinned')}><div>{pinDragActive && pinnedGroups.length === 0 && <div className={`dcu-wb-pin-start${pinnedHeaderDrop?.kind === 'empty' ? ' dcu-wb-drop' : ''}`} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setWorkspaceDropTarget({ zone: 'pinned', beforeId: undefined }) }} />}{pinnedGroups.length === 0 && !(workspaceDropTarget?.zone === 'pinned' && workspaceDropTarget.beforeId === undefined) && <div className="dcu-wb-empty">{t('workspace.pinnedEmpty')}</div>}{pinnedGroups.map(workspace => renderGroup(workspace, 'pinned'))}{pinDragActive && pinnedGroups.length > 0 && <div className={`dcu-wb-pin-end${workspaceDropTarget?.zone === 'pinned' && workspaceDropTarget.beforeId === undefined ? ' dcu-wb-drop' : ''}`} onDragOver={(event) => { if (!pinDragActive) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; const lastId = pinnedGroupIds[pinnedGroupIds.length - 1]; if (lastId === undefined || workspaceDragId === undefined) return; const beforeId = reorderDropBeforeId(pinnedGroupIds, workspaceDragId, lastId, true); setWorkspaceDropTarget(beforeId === null ? undefined : { zone: 'pinned', beforeId }) }} />}</div></div>
      </section>
      <section className="dcu-wb-section" aria-label={t('workspace.projects')} onDropCapture={(event) => { const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId); if (dragged !== undefined && projectPinned(dragged)) setPinnedWorkspaceIds(ids => ids.filter(id => id !== dragged)) }}>
        <div className="dcu-wb-section-head"><button type="button" className="dcu-wb-section-label" aria-expanded={sectionOpen('projects')} onClick={() => { toggleSection('projects') }}>{t('workspace.projects')}<span className="dcu-wb-section-caret" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12"><path d="M6.25 4.25 10.25 8 6.25 11.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span></button><span className="dcu-wb-actions"><button type="button" className="dcu-wb-more" aria-label={t('workspace.createGroup')} title={t('workspace.createGroup')} onClick={(event) => { event.stopPropagation(); setGroupTitleDraft(''); setError(undefined); setCreateGroupOpen(true) }}><IconPlusOutline16 size={16} /></button>{workspaceGroups.length > 0 && <Menu open={groupMenuOpen} onClose={() => { setGroupMenuOpen(false) }} items={workspaceGroups.map(group => ({ id: group.id, label: t('workspace.deleteGroup', { name: group.title }), icon: <IconTrashOutline16 size={16} />, danger: true }))} onSelect={(id) => { setDeleteGroupId(id); setGroupMenuOpen(false) }} portal dense compact anchor={<button type="button" className="dcu-wb-more" aria-label={t('workspace.manageGroups')} title={t('workspace.manageGroups')} onClick={(event) => { event.stopPropagation(); setGroupMenuOpen(current => !current) }}><IconEllipsisOutline16 size={16} /></button>} />}</span></div>
        <div className="dcu-wb-section-body" data-open={sectionOpen('projects')}><div className="dcu-wb-collections">{workspaceGroups.map(renderWorkspaceCollection)}{workspaceGroups.length > 0 && renderUngroupedCollection()}{workspaceGroups.length === 0 && ungroupedGroups.map(workspace => renderGroup(workspace, 'projects'))}{workspaceGroups.length === 0 && ungroupedGroups.length === 0 && <div className="dcu-wb-empty">{t('workspace.empty')}</div>}</div></div>
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
          const pendingInteraction = pendingInteractionForSession(id, pendingInteractions, session.pendingInteraction)
          return <SessionRow key={id} id={id} title={title} selected={sessions.current === id} menuOpen={menu?.type === 'session' && menu.id === id} pinned={pinned} unread={unread} running={session.running === true} pendingInteraction={pendingInteraction} t={t} menuItems={sessionMenu(id, title, session.cwd)} draggable onDragStart={(event) => { event.stopPropagation(); setWorkspaceDragId(undefined); setWorkspaceDropTarget(undefined); setWorkspaceGroupDragId(undefined); setWorkspaceGroupDropTarget(undefined); writeSessionDrag(event.dataTransfer, id, title); const preview = document.createElement('div'); preview.className = 'dcu-wb-drag-ghost'; preview.textContent = title; document.body.appendChild(preview); event.dataTransfer.setDragImage(preview, 16, 18); window.requestAnimationFrame(() => { preview.remove() }); setSessionDrag({ sessionId: id, workspaceId: '' }) }} onDragEnd={() => { setSessionDrag(undefined); setSessionDropTarget(undefined); setWorkspaceDropTarget(undefined); setWorkspaceGroupDropTarget(undefined) }} menuPoint={menu?.type === 'session' && menu.id === id && menu.x !== undefined && menu.y !== undefined ? { x: menu.x, y: menu.y } : undefined} onOpen={() => { setUnreadSessionIds(ids => ids.filter(item => item !== id)); openSession(id as SessionId) }} onMenuChange={(open) => { setMenu(open ? { id, type: 'session' } : undefined) }} onPin={() => { setPinnedSessionIds(ids => toggleSessionId(ids, id)) }} onArchive={() => { void run('archive', () => archiveSession(id as SessionId)) }} onHover={(event) => { const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect()); showTip({ kind: 'session', id, title, time: formatHoverTime(session.updatedAt), left: box.left, top: box.top }) }} onLeave={hideTip} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); dismissTip(); setMenu({ id, type: 'session', x: event.clientX, y: event.clientY }) }} onSelectAction={(action) => {
            if (busy !== undefined) return
            if (action === 'rename') beginRename('session', id, title)
            if (action === 'pin') { setPinnedSessionIds(ids => toggleSessionId(ids, id)); setMenu(undefined) }
            if (action === 'unread') { setUnreadSessionIds(ids => toggleSessionId(ids, id)); setMenu(undefined) }
            if (action === 'archive') void run('archive', () => archiveSession(id as SessionId))
            if (action === 'delete') { setDeleteTarget({ id, kind: 'session', title }); setError(undefined); setMenu(undefined) }
            if (action === 'fork') void run('fork', () => forkSession(id as SessionId))
            if (action === 'openPath' && session.cwd !== undefined) openPathImmediately(session.cwd)
            if (action === 'copyPath') copy(session.cwd)
            if (action === 'copyTitle') copy(title)
            if (action === 'copyId') copy(id)
            if (action === 'copyLink') copy(sessionDeepLink(browserBase(), id))
          }} />
        })}
        </div></div>
      </section>
    </div>
    {headerMenu !== undefined && sessions.byId[headerMenu.id as SessionId] !== undefined && <Menu open onClose={() => { setHeaderMenu(undefined) }} items={sessionMenu(headerMenu.id, sessions.byId[headerMenu.id as SessionId]!.displayTitle, sessions.byId[headerMenu.id as SessionId]!.cwd ?? groups.items.find(item => item.visibleIds.includes(headerMenu.id))?.path)} onSelect={(action) => { const id = headerMenu.id; const session = sessions.byId[id as SessionId]; if (session === undefined || busy !== undefined) return; const path = session.cwd ?? groups.items.find(item => item.visibleIds.includes(id))?.path; const link = sessionDeepLink(browserBase(), id); if (action === 'rename') beginRename('session', id, session.displayTitle); if (action === 'pin') { setPinnedSessionIds(ids => toggleSessionId(ids, id)) }; if (action === 'unread') { setUnreadSessionIds(ids => toggleSessionId(ids, id)) }; if (action === 'archive') void run('archive', () => archiveSession(id as SessionId)); if (action === 'delete') { setDeleteTarget({ id, kind: 'session', title: session.displayTitle }); setError(undefined) }; if (action === 'fork') void run('fork', () => forkSession(id as SessionId)); if (action === 'openPath' && path !== undefined) openPathImmediately(path); if (action === 'copyPath') copy(path); if (action === 'copyTitle') copy(session.displayTitle); if (action === 'copyId') copy(id); if (action === 'copyLink') copy(link); setHeaderMenu(undefined) }} portal dense compact side="bottom" align="start" getAnchorRect={() => headerMenu.getRect()} anchor={<span />} />}
    <WorkspaceHoverCard t={t} onEditWorkspace={(id, title) => { beginRename('workspace', id, title) }} />
    <Modal open={createGroupOpen} onClose={() => { setCreateGroupOpen(false); setGroupTitleDraft(''); setError(undefined) }} closeLabel={t('sessions.close')} title={t('workspace.createGroup')} description={t('workspace.createGroupDescription')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" onClick={() => { setCreateGroupOpen(false); setGroupTitleDraft(''); setError(undefined) }}>{t('sessions.cancel')}</Button><Button variant="primary" disabled={groupTitleDraft.trim() === ''} onClick={submitCreateGroup}>{t('sessions.save')}</Button></div>}><input className="dcu-wb-rename-input" aria-label={t('workspace.groupName')} value={groupTitleDraft} autoFocus onChange={event => { setGroupTitleDraft(event.target.value); setError(undefined) }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submitCreateGroup() } }} />{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
    <Modal open={moveWorkspaceId !== undefined} onClose={() => { setMoveWorkspaceId(undefined) }} closeLabel={t('sessions.close')} title={t('workspace.moveToGroup')} description={t('workspace.moveToGroupDescription')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" onClick={() => { setMoveWorkspaceId(undefined) }}>{t('sessions.cancel')}</Button></div>}><div className="dcu-wb-group-picker">{workspaceGroups.map(group => <Button key={group.id} variant="outline" onClick={() => { moveWorkspaceToGroup(group.id) }}>{group.title}</Button>)}<Button variant="outline" onClick={() => { moveWorkspaceToGroup() }}>{t('workspace.removeFromGroup')}</Button></div></Modal>
    <Modal open={deleteGroupId !== undefined} onClose={() => { setDeleteGroupId(undefined) }} closeLabel={t('sessions.close')} title={t('workspace.deleteGroup', { name: workspaceGroups.find(group => group.id === deleteGroupId)?.title ?? '' })} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" onClick={() => { setDeleteGroupId(undefined) }}>{t('sessions.cancel')}</Button><Button variant="outline" className="dcu-wb-delete-button" onClick={() => { if (deleteGroupId !== undefined) setWorkspaceGroups(current => deleteWorkspaceGroup(current, deleteGroupId)); setDeleteGroupId(undefined) }}>{t('workspace.deleteGroupAction')}</Button></div>}><p className="dcu-wb-delete-copy">{t('workspace.deleteGroupDescription')}</p></Modal>
    <Modal open={renameTarget !== undefined} onClose={() => { setRenameTarget(undefined); setError(undefined) }} closeLabel={t('sessions.close')} title={renameTarget?.kind === 'workspace' ? t('workspace.rename') : t('sessions.rename')} description={t('sessions.renameDescription')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" onClick={() => { setRenameTarget(undefined) }}>{t('sessions.cancel')}</Button><Button variant="primary" disabled={busy !== undefined || renameDraft.trim() === ''} onClick={submitRename}>{t('sessions.save')}</Button></div>}><input className="dcu-wb-rename-input" aria-label={renameTarget?.kind === 'workspace' ? t('workspace.rename') : t('sessions.rename')} value={renameDraft} autoFocus onFocus={event => { event.target.select() }} onChange={event => { setRenameDraft(event.target.value); setError(undefined) }} onKeyDown={event => { if (event.key === 'Enter') submitRename() }} />{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
    <Modal open={deleteTarget !== undefined} onClose={() => { if (busy !== 'delete-workspace' && busy !== 'delete-session') { setDeleteTarget(undefined); setError(undefined) } }} closeLabel={t('sessions.close')} title={deleteTarget?.kind === 'session' ? t('sessions.delete') : t('workspace.delete')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" disabled={busy === 'delete-workspace' || busy === 'delete-session'} onClick={() => { setDeleteTarget(undefined); setError(undefined) }}>{t('sessions.cancel')}</Button><Button variant="outline" className="dcu-wb-delete-button" disabled={busy === 'delete-workspace' || busy === 'delete-session'} onClick={submitDelete}>{deleteTarget?.kind === 'session' ? t('sessions.delete') : t('workspace.delete')}</Button></div>}><p className="dcu-wb-delete-copy">{deleteTarget === undefined ? '' : deleteTarget.kind === 'session' ? t('sessions.deleteDescription', { name: deleteTarget.title }) : t('workspace.deleteDescription', { name: deleteTarget.title })}</p>{busy === 'delete-workspace' && <div className="dcu-wb-error" role="status">{t('workspace.deletePending')}</div>}{busy === 'delete-session' && <div className="dcu-wb-error" role="status">{t('sessions.deletePending')}</div>}{error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}</Modal>
  </section>
}
