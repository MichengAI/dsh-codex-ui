import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { clampHoverCardPosition, hoverCardAnchor } from './hover-tip.ts'

export const COMPANION_STYLE_ID = 'dcu-companion-tree-style'

/** 不改 IM/定时组件，只覆盖视觉，让频道和定时长得像任务树。 */
export const COMPANION_TREE_STYLE = `
.dcu-companion-tree{display:flex;min-height:0;flex:1;flex-direction:column}
.dcu-companion-tree>:not(.dcu-wb-tip){min-width:0;flex:1}
.dcu-companion-tree .ima-n-toolbar,
.dcu-companion-tree .dsh-st-n-toolbar{display:none!important}
.dcu-companion-tree .ima-n-time{display:none!important}
.dcu-companion-tree .ima-native,
.dcu-companion-tree .ima-rail,
.dcu-companion-tree .ima-official-tree,
.dcu-companion-tree .dsh-st-rail,
.dcu-companion-tree .dcu-wb{padding:4px 4px 8px!important;color:var(--dcu-sidebar-primary)!important;font:14px/20px var(--dcu-font,inherit)!important}
.dcu-companion-tree .ima-native-tree,
.dcu-companion-tree .dcu-wb-tree{padding-bottom:16px!important}
.dcu-companion-tree .ima-n-row,
.dcu-companion-tree .ima-native-head,
.dcu-companion-tree .dsh-st-rail-head,
.dcu-companion-tree .dcu-wb-project-head{display:flex!important;align-items:center!important;gap:6px!important;width:100%!important;height:34px!important;padding:0 8px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:var(--dcu-sidebar-primary)!important;font:14px/20px var(--dcu-font,inherit)!important;font-weight:550!important}
.dcu-companion-tree .ima-n-sess,
.dcu-companion-tree .ima-native-session,
.dcu-companion-tree .dsh-st-rail-session,
.dcu-companion-tree .dcu-wb-project-head+.dcu-wb-session,.dcu-companion-tree .ima-n-row+.ima-n-sess,.dcu-companion-tree .dsh-st-rail-head+.dsh-st-rail-session{margin-top:4px!important}.dcu-companion-tree .dcu-wb-session{display:flex!important;align-items:center!important;gap:0!important;width:100%!important;min-height:32px!important;height:32px!important;padding:0 8px 0 28px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:var(--dcu-sidebar-secondary)!important;font:14px/20px var(--dcu-font,inherit)!important;font-weight:400!important}
.dcu-companion-tree .ima-n-row:hover,
.dcu-companion-tree .ima-n-sess:hover,
.dcu-companion-tree .ima-n-sess.on,
.dcu-companion-tree .ima-n-row.menu-on,
.dcu-companion-tree .ima-n-sess.menu-on,
.dcu-companion-tree .dsh-st-rail-head:hover,
.dcu-companion-tree .dsh-st-rail-session:hover,
.dcu-companion-tree .dsh-st-rail-session.is-on,
.dcu-companion-tree .ima-native-session.on,
.dcu-companion-tree .dcu-wb-session.dcu-wb-selected{background:var(--dcu-sidebar-hover)!important}
.dcu-companion-tree .ima-n-title,
.dcu-companion-tree .ima-native-title,
.dcu-companion-tree .dsh-st-rail-title,
.dcu-companion-tree .dsh-st-rail-session>span,
.dcu-companion-tree .dcu-wb-project-title,
.dcu-companion-tree .dcu-wb-session-title{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;margin:0!important;font-size:14px!important;line-height:20px!important;font-weight:400!important;color:var(--dcu-sidebar-secondary)!important}
.dcu-companion-tree .ima-n-row .ima-n-title,
.dcu-companion-tree .dsh-st-rail-title,
.dcu-companion-tree .dcu-wb-project-title{font-size:14px!important;font-weight:550!important;color:var(--dcu-sidebar-primary)!important}
.dcu-companion-tree .ima-n-slot,
.dcu-companion-tree .ima-n-folder,
.dcu-companion-tree .dsh-st-rail-folder,
.dcu-companion-tree .dcu-wb-folder{flex:none!important;width:16px!important;height:20px!important;color:var(--dcu-sidebar-icon)!important}
.dcu-companion-tree .ima-n-acts,
.dcu-companion-tree .ima-native-actions{display:none!important;align-items:center!important;gap:2px!important;flex:none!important}
.dcu-companion-tree .ima-n-sess:hover .ima-n-acts,
.dcu-companion-tree .ima-n-sess.menu-on .ima-n-acts,
.dcu-companion-tree .ima-n-row:hover .ima-n-acts,
.dcu-companion-tree .ima-native-session:hover .ima-native-actions{display:inline-flex!important}
.dcu-companion-tree .ima-n-ico,
.dcu-companion-tree .dcu-wb-more{display:grid!important;place-items:center!important;width:20px!important;height:20px!important;border:0!important;border-radius:4px!important;padding:0!important;background:transparent!important;color:var(--dcu-sidebar-tertiary)!important}
.dcu-companion-tree .ima-n-ico:hover,
.dcu-companion-tree .dcu-wb-more:hover{color:var(--dcu-sidebar-primary)!important;background:transparent!important}
.dcu-companion-tree .ima-n-hover,
.dcu-companion-tree .dcu-wb-tip{position:fixed!important;z-index:10050!important;min-width:220px!important;max-width:280px!important;padding:10px 12px!important;border:1px solid var(--dcu-sidebar-border)!important;border-radius:12px!important;background:#2a2e2c!important;box-shadow:0 10px 30px rgba(0,0,0,.28)!important;color:var(--dcu-sidebar-primary)!important}
.dcu-companion-tree .ima-n-hover-title{font-size:14px!important;line-height:20px!important;font-weight:500!important;color:var(--dcu-sidebar-primary)!important}
.dcu-companion-tree .ima-n-hover-time{margin-top:4px!important;font-size:12px!important;line-height:18px!important;color:var(--dcu-sidebar-tertiary)!important}
.dcu-companion-tree .ima-n-hover-state{margin-top:8px!important;font-size:12px!important;line-height:18px!important;color:var(--dcu-sidebar-secondary)!important}
`

export const COMPANION_ROW_SELECTOR = '.dsh-st-rail-session,.dsh-st-rail-head'
export const COMPANION_TITLE_SELECTOR = '.dsh-st-rail-title,.dcu-wb-session-title,.ima-n-title'

export type CompanionTip = { kind: 'workspace' | 'session'; title: string; time?: string; left: number; top: number }

/** 把覆盖样式挂到 document.head，保证压过 IM 后注入的皮肤。 */
export function ensureCompanionTreeStyle(doc: Document = document): HTMLStyleElement | undefined {
  if (doc.head === null) return undefined
  const existing = doc.getElementById(COMPANION_STYLE_ID)
  if (existing !== null && existing.tagName === 'STYLE') {
    if (existing.textContent !== COMPANION_TREE_STYLE) existing.textContent = COMPANION_TREE_STYLE
    doc.head.append(existing)
    return existing as HTMLStyleElement
  }
  const style = doc.createElement('style')
  style.id = COMPANION_STYLE_ID
  style.textContent = COMPANION_TREE_STYLE
  doc.head.append(style)
  return style
}

/** 频道已有原生悬停；只有定时树需要由本插件补卡片。 */
export function shouldShowCompanionTip(row: Element): boolean {
  return row.matches(COMPANION_ROW_SELECTOR)
}

/** 从定时行读出与任务树一致的悬停卡片内容。 */
export function readCompanionTip(row: Element, viewportWidth: number, viewportHeight: number): CompanionTip | undefined {
  if (!shouldShowCompanionTip(row)) return undefined
  const titleNode = row.querySelector(COMPANION_TITLE_SELECTOR) ?? row.querySelector('span')
  const title = titleNode?.textContent?.trim() ?? ''
  if (title === '') return undefined
  const box = hoverCardAnchor(row.getBoundingClientRect())
  const pos = clampHoverCardPosition(box.left, box.top, 248, 148, viewportWidth, viewportHeight)
  return {
    kind: row.matches('.dsh-st-rail-session') ? 'session' : 'workspace',
    title,
    ...pos,
  }
}

function sameTip(left: CompanionTip | undefined, right: CompanionTip | undefined): boolean {
  if (left === undefined || right === undefined) return left === right
  return left.kind === right.kind && left.title === right.title && left.left === right.left && left.top === right.top
}

/** 频道保留 IM 原生悬停/右键；样式靠 CSS 覆盖成任务树。 */
export function CompanionTree({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<CompanionTip>()
  const hideTimer = useRef<number>()
  useEffect(() => { ensureCompanionTreeStyle() }, [])
  const show = (next: CompanionTip): void => {
    if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current)
    setTip(current => sameTip(current, next) ? current : next)
  }
  const hide = (): void => {
    hideTimer.current = window.setTimeout(() => { setTip(undefined) }, 120)
  }
  const onMouseOver = (event: MouseEvent<HTMLDivElement>): void => {
    const row = (event.target as HTMLElement | null)?.closest?.(COMPANION_ROW_SELECTOR)
    if (row === null || row === undefined) return
    const next = readCompanionTip(row, window.innerWidth, window.innerHeight)
    if (next !== undefined) show(next)
  }
  const onMouseOut = (event: MouseEvent<HTMLDivElement>): void => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    hide()
  }
  return <div className="dcu-companion-tree" onMouseOver={onMouseOver} onMouseOut={onMouseOut} onContextMenu={() => { setTip(undefined) }}>
    {children}
    {tip !== undefined && <div className="dcu-wb-tip" style={{ left: tip.left, top: tip.top }} onMouseEnter={() => { if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current) }} onMouseLeave={hide}><div className="dcu-wb-tip-title"><span>{tip.title}</span>{tip.time !== undefined && <span className="dcu-wb-tip-time">{tip.time}</span>}</div></div>}
  </div>
}
