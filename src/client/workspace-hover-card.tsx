import { useEffect } from 'react'
import { IconBranchOutline16, IconFolderClose16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { useHoverDispatch, useHoverValue } from './hover-shell.tsx'

/** 只订阅悬停值，避免工作区树随鼠标移动整树重绘。 */
export function WorkspaceHoverCard({ t, onEditWorkspace }: { t: TranslateNS<typeof NS>; onEditWorkspace: (id: string, title: string) => void }) {
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
  return <div className="dcu-wb-tip" style={{ left: hoverTip.left, top: hoverTip.top }} onMouseEnter={keepTip} onMouseLeave={hideTip}><div className="dcu-wb-tip-title">{hoverTip.kind === 'workspace' && <span className="dcu-wb-folder"><IconFolderClose16 size={16} /></span>}<span>{hoverTip.title}</span>{hoverTip.time !== undefined && <span className="dcu-wb-tip-time">{hoverTip.time}</span>}</div>{hoverTip.kind === 'workspace' && hoverTip.count !== undefined && <div className="dcu-wb-tip-meta">{t('workspace.taskCount', { count: hoverTip.count })}</div>}{hoverTip.kind === 'workspace' && hoverTip.path !== undefined && hoverTip.path !== '' && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><IconFolderClose16 size={16} /></span><span>{hoverTip.path}</span></div>}{hoverTip.kind === 'session' && hoverTip.project !== undefined && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><IconFolderClose16 size={16} /></span><span>{hoverTip.project}</span></div>}{hoverTip.kind === 'session' && hoverTip.branch !== undefined && hoverTip.branch !== '' && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><IconBranchOutline16 size={16} /></span><span>{hoverTip.branch}</span></div>}{hoverTip.kind === 'workspace' && hoverTip.id !== undefined && <><div className="dcu-wb-tip-sep" /><button type="button" className="dcu-wb-tip-edit" onClick={() => { onEditWorkspace(hoverTip.id ?? '', hoverTip.title); dismissTip() }}><svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true"><path fill="currentColor" d="M8 1.4A6.6 6.6 0 1 0 8 14.6 6.6 6.6 0 0 0 8 1.4Zm0 1.4a5.2 5.2 0 1 1 0 10.4A5.2 5.2 0 0 1 8 2.8Zm-.7 2.3h1.4v3.05l2.2 1.3-.7 1.18L7.3 9.1V5.1Z" /></svg>{t('workspace.edit')}</button></>}</div>
}
