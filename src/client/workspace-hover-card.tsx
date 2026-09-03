import { useEffect } from 'react'
import { IconBranchOutline16, IconFolderClose16, IconSettingsOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { MessageCircle } from 'lucide-react'
import { NS } from './locales.ts'
import { useHoverDispatch, useHoverValue } from './hover-shell.tsx'
import { PinIcon } from './session-tree.tsx'

/** 只订阅悬停值，避免工作区树随鼠标移动整树重绘。 */
export function WorkspaceHoverCard({ t, onEditWorkspace, onToggleWorkspacePin }: { t: TranslateNS<typeof NS>; onEditWorkspace: (id: string, title: string) => void; onToggleWorkspacePin: (id: string) => void }) {
  const hoverTip = useHoverValue()
  const { keepTip, hideTip, dismissTip } = useHoverDispatch()
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
  }, [hoverTip, dismissTip])
  if (hoverTip === undefined) return null
  const workspace = hoverTip.kind === 'workspace'
  const workspaceId = workspace ? hoverTip.id : undefined
  const taskSummary = hoverTip.unreadCount !== undefined && hoverTip.unreadCount > 0
    ? t('workspace.taskSummary', { count: hoverTip.count ?? 0, unreadCount: hoverTip.unreadCount })
    : t('workspace.taskCount', { count: hoverTip.count ?? 0 })
  return <div className={`dcu-wb-tip${workspace ? ' dcu-wb-tip-workspace' : ''}`} style={{ left: hoverTip.left, top: hoverTip.top }} onMouseEnter={keepTip} onMouseLeave={hideTip}>
    <div className="dcu-wb-tip-title">
      {workspace && <span className="dcu-wb-folder"><IconFolderClose16 size={16} /></span>}
      <span className="dcu-wb-tip-title-main">{hoverTip.title}</span>
      {workspaceId !== undefined
        ? <button type="button" className="dcu-wb-tip-pin" aria-label={t(hoverTip.pinned === true ? 'workspace.unpin' : 'workspace.pin')} onClick={() => { onToggleWorkspacePin(workspaceId); dismissTip() }}><PinIcon /></button>
        : hoverTip.time !== undefined && <span className="dcu-wb-tip-time">{hoverTip.time}</span>}
    </div>
    {workspace && hoverTip.count !== undefined && <div className="dcu-wb-tip-meta"><MessageCircle aria-hidden="true" size={16} strokeWidth={1.5} /><span>{taskSummary}</span></div>}
    {workspace && hoverTip.path !== undefined && hoverTip.path !== '' && <div className="dcu-wb-tip-row dcu-wb-tip-path"><span className="dcu-wb-folder"><IconFolderClose16 size={16} /></span><span className="dcu-wb-tip-path-copy">{hoverTip.path}</span></div>}
    {!workspace && hoverTip.project !== undefined && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><IconFolderClose16 size={16} /></span><span>{hoverTip.project}</span></div>}
    {!workspace && hoverTip.branch !== undefined && hoverTip.branch !== '' && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><IconBranchOutline16 size={16} /></span><span>{hoverTip.branch}</span></div>}
    {workspaceId !== undefined && <><div className="dcu-wb-tip-sep" /><button type="button" className="dcu-wb-tip-edit" onClick={() => { onEditWorkspace(workspaceId, hoverTip.title); dismissTip() }}><IconSettingsOutline16 size={16} />{t('workspace.edit')}</button></>}
  </div>
}
