import type { DragEvent, MouseEvent, ReactNode } from 'react'
import {
  IconArchiveOutline20,
  IconBranchOutline16,
  IconCopyOutline16,
  IconEditOutline16,
  IconEllipsisOutline16,
  IconFolderClose16,
  IconFolderOpenOutline16,
  IconLinkOutline16,
  IconTrashOutline16,
  Menu,
  type MenuEntry,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { Archive as LucideArchiveIcon, Eye, EyeOff, Pin as LucidePinIcon } from 'lucide-react'
import { NS } from './locales.ts'
import type { PendingInteractionKind } from './session-pending.ts'

export function PinIcon() {
  return <LucidePinIcon aria-hidden="true" size={16} strokeWidth={1.5} />
}

export function QuickArchiveIcon() {
  return <LucideArchiveIcon aria-hidden="true" size={16} strokeWidth={1.5} />
}

export type SessionHoverTip = {
  title: string
  project?: string
  branch?: string
  time?: string
  left: number
  top: number
}

export function SessionHoverCard({ tip, onEnter, onLeave }: { tip: SessionHoverTip; onEnter: () => void; onLeave: () => void }) {
  return <div className="dcu-wb-tip" style={{ left: tip.left, top: tip.top }} onMouseEnter={onEnter} onMouseLeave={onLeave}>
    <div className="dcu-wb-tip-title"><span className="dcu-wb-tip-title-main">{tip.title}</span>{tip.time !== undefined && <span className="dcu-wb-tip-time">{tip.time}</span>}</div>
    {tip.project !== undefined && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><IconFolderClose16 size={16} /></span><span>{tip.project}</span></div>}
    {tip.branch !== undefined && tip.branch !== '' && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><IconBranchOutline16 size={16} /></span><span>{tip.branch}</span></div>}
  </div>
}

export function sessionMenuItems(t: TranslateNS<typeof NS>, options: { unread: boolean; path?: string; includePath?: boolean; moveTargets?: readonly { id: string; label: string }[] }): MenuEntry[] {
  const items: MenuEntry[] = [
    { id: 'rename', label: t('sessions.rename'), icon: <IconEditOutline16 size={16} /> },
    { id: 'unread', label: t(options.unread ? 'sessions.markRead' : 'sessions.markUnread'), icon: options.unread ? <EyeOff aria-hidden="true" size={16} strokeWidth={1.5} /> : <Eye aria-hidden="true" size={16} strokeWidth={1.5} /> },
    { id: 'archive', label: t('sessions.archive'), icon: <IconArchiveOutline20 size={16} /> },
    { type: 'separator', id: 'main-separator' },
    { id: 'fork', label: t('sessions.fork'), icon: <IconBranchOutline16 size={16} /> },
  ]
  if (options.includePath === true) {
    items.push({ id: 'openPath', label: t('sessions.openPath'), icon: <IconFolderOpenOutline16 size={16} />, disabled: options.path === undefined })
  }
  if (options.moveTargets !== undefined) {
    items.push({
      id: 'moveWorkspace',
      label: t('sessions.moveWorkspace'),
      icon: <IconFolderClose16 size={16} />,
      disabled: options.moveTargets.length === 0,
      submenu: options.moveTargets.map(target => ({ id: target.id, label: target.label, icon: <IconFolderClose16 size={16} /> })),
    })
  }
  items.push(
    { type: 'separator', id: 'copy-separator' },
    { id: 'copyId', label: t('sessions.copyId'), icon: <IconLinkOutline16 size={16} /> },
    { id: 'copyTitle', label: t('sessions.copyTitle'), icon: <IconCopyOutline16 size={16} /> },
    ...(options.includePath === true ? [{ id: 'copyPath', label: t('sessions.copyPath'), icon: <IconCopyOutline16 size={16} />, disabled: options.path === undefined } satisfies MenuEntry] : []),
    { type: 'separator', id: 'delete-separator' },
    { id: 'delete', label: t('sessions.delete'), icon: <IconTrashOutline16 size={16} />, danger: true },
  )
  return items
}

/** 把右键落点收成 Menu 的锚点矩形，让列表贴着指针打开。 */
export function pointerMenuRect(x: number, y: number): DOMRect {
  return new DOMRect(x, y, 0, 0)
}

export type SessionRowProps = {
  id: string
  title: string
  selected: boolean
  menuOpen: boolean
  unread: boolean
  running: boolean
  pendingInteraction?: PendingInteractionKind
  t: TranslateNS<typeof NS>
  menuItems: MenuEntry[]
  onOpen: () => void
  onMenuChange: (open: boolean) => void
  onSelectAction: (id: string) => void
  onArchive: () => void
  onHover: (event: MouseEvent<HTMLDivElement>) => void
  onLeave: () => void
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void
  menuPoint?: { x: number; y: number }
  subtitle?: string
  flat?: boolean
  draggable?: boolean
  dropActive?: boolean
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
}

function pendingLabel(kind: PendingInteractionKind, t: TranslateNS<typeof NS>): string {
  switch (kind) {
    case 'approval': return t('sessions.waitingApproval')
    case 'plan-review': return t('sessions.planReview')
    case 'question': return t('sessions.waitingAnswer')
  }
}

export function SessionState({ pendingInteraction, unread, running, t }: Pick<SessionRowProps, 'pendingInteraction' | 'unread' | 'running' | 't'>) {
  if (pendingInteraction !== undefined) {
    const label = pendingLabel(pendingInteraction, t)
    return <span className="dcu-wb-pending" data-state="warning" data-pending-kind={pendingInteraction} aria-label={label}><span className="dcu-wb-pending-dot" aria-hidden="true" /><span className="dcu-wb-pending-label">{label}</span></span>
  }
  if (unread) return <span className="dcu-wb-unread" aria-label={t('sessions.unread')} />
  if (running) return <span className="dcu-wb-running" aria-hidden="true" />
  return null
}

export function SessionRow({
  id, title, selected, menuOpen, unread, running, pendingInteraction, t, menuItems,
  onOpen, onMenuChange, onSelectAction, onArchive, onHover, onLeave, onContextMenu, menuPoint,
  subtitle, flat, draggable, dropActive, onDragStart, onDragEnd, onDragOver, onDrop,
}: SessionRowProps) {
  return <div className={`dcu-wb-session${selected ? ' dcu-wb-selected' : ''}${menuOpen ? ' dcu-wb-menu-open' : ''}${dropActive === true ? ' dcu-wb-drop' : ''}${flat === true ? ' dcu-wb-session-flat' : ''}`} role="treeitem" aria-selected={selected} draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={onDrop} onClick={onOpen} onContextMenu={onContextMenu} onMouseEnter={onHover} onMouseLeave={onLeave}>
    {subtitle !== undefined && subtitle !== '' ? <span className="dcu-wb-session-copy"><span className="dcu-wb-session-title">{title.split(/\r?\n/)[0] ?? title}</span><span className="dcu-wb-session-sub">{subtitle}</span></span> : <span className="dcu-wb-session-title">{title.split(/\r?\n/)[0] ?? title}</span>}
    <SessionState pendingInteraction={pendingInteraction} unread={unread} running={running} t={t} />
    <span className="dcu-wb-quick-actions">
      <button type="button" className="dcu-wb-more" aria-label={t('sessions.archive')} onClick={(event) => { event.stopPropagation(); onArchive() }}><QuickArchiveIcon /></button>
    </span>
    <span className="dcu-wb-actions">
      <Menu open={menuOpen} onClose={() => { onMenuChange(false) }} items={menuItems} onSelect={onSelectAction} portal dense compact getAnchorRect={menuPoint === undefined ? undefined : () => pointerMenuRect(menuPoint.x, menuPoint.y)} anchor={<button type="button" className="dcu-wb-more dcu-wb-context-anchor" aria-label={t('sessions.actions', { name: title })} onClick={(event) => { event.stopPropagation(); onMenuChange(!menuOpen) }}><IconEllipsisOutline16 size={16} /></button>} />
    </span>
  </div>
}

export function GroupHead({ expanded, title, icon, onToggle, actions, menuOpen }: { expanded: boolean; title: string; icon: ReactNode; onToggle: () => void; actions?: ReactNode; menuOpen?: boolean }) {
  return <div className={`dcu-wb-project-head${menuOpen === true ? ' dcu-wb-menu-open' : ''}`} role="treeitem" aria-expanded={expanded} tabIndex={0} onClick={onToggle} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onToggle() } }}>
    <span className="dcu-wb-folder">{icon}</span>
    <span className="dcu-wb-project-title">{title}</span>
    {actions !== undefined && <span className="dcu-wb-actions">{actions}</span>}
  </div>
}
