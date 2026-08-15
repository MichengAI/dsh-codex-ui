import { useEffect, useMemo, useState } from 'react'
import { IconFolderOpenOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { readPinnedWorkspaceIds, savePinnedWorkspaceIds, togglePinnedWorkspace } from './pinned-workspaces.ts'

type PinnedWorkspacesProps = {
  useWorkspaces: <T>(selector: (state: WorkspaceListState) => T) => T
  t: TranslateNS<typeof NS>
}

const stylesheet = `
.dcu-pinned-workspaces{padding:4px 10px 8px;border-bottom:1px solid var(--dsw-alias-border-l1)}.dcu-pinned-head{display:flex;align-items:center;justify-content:space-between;min-height:28px;padding:0 6px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:650}.dcu-pinned-manage{appearance:none;border:0;border-radius:6px;padding:3px 6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}.dcu-pinned-manage:hover{background:var(--dsw-specific-sidebar-nav-item-hover);color:var(--dsw-alias-label-primary)}.dcu-pinned-list{display:grid;gap:2px}.dcu-pinned-item{display:flex;align-items:center;gap:8px;min-height:30px;padding:4px 6px;border-radius:7px;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:550}.dcu-pinned-item svg{flex:0 0 auto;color:var(--dsw-alias-label-primary)}.dcu-pinned-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-pinned-empty{padding:3px 6px;color:var(--dsw-alias-label-secondary);font-size:12px}.dcu-pinned-popover{position:absolute;z-index:20;left:10px;right:10px;margin-top:2px;padding:8px;background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:var(--dsw-shadow-lv3)}.dcu-pinned-option{display:flex;align-items:center;gap:8px;min-height:30px;padding:4px 6px;border-radius:6px;color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer}.dcu-pinned-option:hover{background:var(--dsw-alias-button-floating-hover)}.dcu-pinned-option input{margin:0;accent-color:var(--dsw-alias-button-primary-fill)}.dcu-pinned-option span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-pinned-option:focus-within{outline:2px solid var(--dsw-alias-button-info-fill);outline-offset:-2px}
`

function storage(): Storage | undefined { return typeof window === 'undefined' ? undefined : window.localStorage }

/** 原生浏览器之外的项目置顶快捷区；会话列表仍完全由 DSH 官方 WorkspaceBrowser 负责。 */
export function PinnedWorkspaces({ useWorkspaces, t }: PinnedWorkspacesProps) {
  const workspaces = useWorkspaces(state => state.items)
  const [pinnedIds, setPinnedIds] = useState(() => readPinnedWorkspaceIds(storage()))
  const [managing, setManaging] = useState(false)
  useEffect(() => { savePinnedWorkspaceIds(storage(), pinnedIds) }, [pinnedIds])
  useEffect(() => {
    const valid = new Set<string>(workspaces.map(workspace => workspace.workspaceId))
    setPinnedIds(ids => ids.filter(id => valid.has(id)))
  }, [workspaces])
  useEffect(() => {
    if (!managing) return
    const close = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.dcu-pinned-workspaces') === null) setManaging(false)
    }
    document.addEventListener('pointerdown', close)
    return () => { document.removeEventListener('pointerdown', close) }
  }, [managing])
  const pinned = useMemo(() => pinnedIds.map(id => workspaces.find(workspace => workspace.workspaceId === id)).filter((workspace): workspace is (typeof workspaces)[number] => workspace !== undefined), [pinnedIds, workspaces])
  return <section className="dcu-pinned-workspaces" aria-label={t('pinned.label')}><style>{stylesheet}</style><div className="dcu-pinned-head"><span>{t('pinned.title')}</span><button type="button" className="dcu-pinned-manage" aria-expanded={managing} onClick={() => { setManaging(open => !open) }}>{t('pinned.manage')}</button></div>{pinned.length > 0 ? <div className="dcu-pinned-list">{pinned.map(workspace => <div key={workspace.workspaceId} className="dcu-pinned-item" title={workspace.path}><IconFolderOpenOutline16 size={16} /><span>{workspace.title}</span></div>)}</div> : <div className="dcu-pinned-empty">{t('pinned.empty')}</div>}{managing && <div className="dcu-pinned-popover" role="dialog" aria-label={t('pinned.dialog')}>{workspaces.map(workspace => <label key={workspace.workspaceId} className="dcu-pinned-option"><input type="checkbox" checked={pinnedIds.includes(workspace.workspaceId)} onChange={() => { setPinnedIds(ids => togglePinnedWorkspace(ids, workspace.workspaceId)) }} /><span title={workspace.path}>{workspace.title}</span></label>)}</div>}</section>
}
