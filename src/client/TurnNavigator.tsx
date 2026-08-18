import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { conversationAnchor, conversationScrollRoot } from './conversation-dom.ts'
import { NS } from './locales.ts'

type TurnLink = { key: string; summary: string }

type TurnNavigatorProps = PropsRuntime<'conversation.session.header.utilities'> & PropsLocale<typeof NS>

const stylesheet = `
.dcu-turn-navigator{position:fixed;z-index:20;top:50%;left:var(--dcu-turn-left,288px);transform:translateY(-50%);width:16px;max-height:calc(100vh - 120px);overflow:visible;pointer-events:none}
.dcu-turn-scroll{width:16px;max-height:inherit;overflow-x:hidden;overflow-y:auto;scrollbar-width:none;pointer-events:none}
.dcu-turn-scroll::-webkit-scrollbar{display:none}
.dcu-turn-list{display:grid;gap:2px;margin:0;padding:4px 0;list-style:none;width:16px;pointer-events:none}
.dcu-turn-link{pointer-events:auto;position:relative;display:flex;align-items:center;width:16px;height:8px;overflow:visible;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-tertiary);font:13px/18px var(--dsw-font-family);text-align:left;cursor:pointer;transition:color 320ms cubic-bezier(.16,1,.3,1)}
.dcu-turn-link::before{width:var(--dcu-tick-w,5px);height:var(--dcu-tick-h,1px);flex:0 0 var(--dcu-tick-w,5px);border-radius:1px;background:currentcolor;content:'';transition:width 360ms cubic-bezier(.16,1,.3,1),height 360ms cubic-bezier(.16,1,.3,1),flex-basis 360ms cubic-bezier(.16,1,.3,1),background-color 320ms cubic-bezier(.16,1,.3,1)}
.dcu-turn-summary{position:absolute;left:16px;top:var(--dcu-summary-top,50%);transform:translateY(-50%);box-sizing:border-box;width:max-content;max-width:240px;height:32px;padding:0 12px;border-radius:16px;background:#3a3d3c;color:#e8ebe9;box-shadow:0 8px 24px rgba(0,0,0,.28);pointer-events:none;z-index:2;display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:32px}
.dcu-turn-link[data-active=true]{color:var(--dsw-alias-label-primary)}
.dcu-turn-link[aria-current=true]{color:var(--dsw-alias-label-primary)}
.dcu-turn-link[aria-current=true]::before{width:var(--dcu-tick-w,5px);flex-basis:var(--dcu-tick-w,5px);height:var(--dcu-tick-h,1px)}
.dcu-turn-navigator[data-hovering=true] .dcu-turn-link[aria-current=true]{color:var(--dsw-alias-label-tertiary)}
.dcu-turn-navigator[data-hovering=true] .dcu-turn-link[data-active=true]{color:var(--dsw-alias-label-primary)}
.dcu-turn-link:focus-visible{outline:0;box-shadow:0 0 0 2px var(--dsw-alias-button-info-fill)}
@media (prefers-reduced-motion:reduce){.dcu-turn-link,.dcu-turn-link::before{transition:none}}
@media (max-width:760px){.dcu-turn-summary{max-width:200px}}
`

export function tickMarkSize(index: number, hoverAt: number | null, _isCurrent: boolean): { width: number; height: number } {
  if (hoverAt === null) return { width: 5, height: 1 }
  const distance = Math.abs(index - hoverAt)
  const wave = Math.exp(-(distance * distance) / 2.1)
  return {
    width: Number((5 + 13 * wave).toFixed(1)),
    height: Number((1 + 1.2 * wave).toFixed(1)),
  }
}

function hoverIndexFromPoint(list: HTMLElement, clientY: number, count: number): number {
  const box = list.getBoundingClientRect()
  if (count <= 0 || box.height <= 0) return 0
  const y = Math.min(Math.max(clientY - box.top, 0), box.height)
  return (y / box.height) * count - 0.5
}

/** 轮目摘要上限：整段长文本会同时进入 title、aria-label 与 DOM 文本，必须截断。 */
const TURN_SUMMARY_LIMIT = 72

function textSummary(content: readonly unknown[], fallback: string): string {
  const text = content.flatMap(block => {
    if (typeof block !== 'object' || block === null) return []
    const value = block as { type?: unknown; text?: unknown }
    return value.type === 'text' && typeof value.text === 'string' ? [value.text] : []
  }).join(' ').replace(/\s+/g, ' ').trim()
  const summary = text === '' ? fallback : text
  return summary.length > TURN_SUMMARY_LIMIT ? `${summary.slice(0, TURN_SUMMARY_LIMIT)}…` : summary
}

function userContent(data: unknown): readonly unknown[] {
  if (typeof data !== 'object' || data === null) return []
  const content = (data as { content?: unknown }).content
  return Array.isArray(content) ? content : []
}

function turnLinks(snapshot: ConversationSnapshot, fallback: string): readonly TurnLink[] {
  const links: TurnLink[] = []
  for (const key of snapshot.chat.order) {
    const node = snapshot.chat.nodes.get(key)
    if (node?.kind !== 'user') continue
    links.push({ key: node.key, summary: textSummary(userContent(node.data), fallback) })
  }
  return links
}

function equalTurns(left: readonly TurnLink[], right: readonly TurnLink[]): boolean {
  return left.length === right.length && left.every((turn, index) => turn.key === right[index]?.key && turn.summary === right[index]?.summary)
}

function railLeftFromSidebar(): number {
  const sidebar = document.querySelector<HTMLElement>('.dcu-root')
  if (sidebar === null) return 288
  return Math.round(sidebar.getBoundingClientRect().right) + 16
}

/** 当前会话的轮次导航；只读取原生聊天锚点并滚动，不改写会话数据或消息视图。 */
export function TurnNavigator({ useSession, t }: TurnNavigatorProps) {
  const turns = useSession(snapshot => turnLinks(snapshot, t('turns.untitled')), equalTurns)
  const [current, setCurrent] = useState<string | null>(turns[0]?.key ?? null)
  const [hoverAt, setHoverAt] = useState<number | null>(null)
  const [railLeft, setRailLeft] = useState(288)
  const [summaryTop, setSummaryTop] = useState(0)
  const navRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const turnKeys = useMemo(() => turns.map(turn => turn.key).join('|'), [turns])
  const activeIndex = hoverAt === null ? -1 : Math.max(0, Math.min(turns.length - 1, Math.round(hoverAt)))
  const activeTurn = activeIndex >= 0 ? turns[activeIndex] : undefined

  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>('.dcu-root')
    const update = (): void => {
      const next = railLeftFromSidebar()
      setRailLeft(previous => previous === next ? previous : next)
    }
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    if (sidebar !== null) observer?.observe(sidebar)
    window.addEventListener('resize', update)
    update()
    return () => { observer?.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  useEffect(() => {
    const host = conversationScrollRoot()
    if (host === null || turns.length === 0) return
    let frame: number | null = null
    const update = (): void => {
      frame = null
      const threshold = host.getBoundingClientRect().top + Math.min(180, host.clientHeight * 0.35)
      let next = turns[0]?.key ?? null
      for (const turn of turns) {
        const anchor = conversationAnchor(host, turn.key)
        if (anchor !== null && anchor.getBoundingClientRect().top <= threshold) next = turn.key
      }
      setCurrent(previous => previous === next ? previous : next)
    }
    const schedule = (): void => { if (frame === null) frame = window.requestAnimationFrame(update) }
    host.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      host.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [turnKeys, turns])

  useEffect(() => {
    const nav = navRef.current
    const list = listRef.current
    if (nav === null || list === null || activeIndex < 0) return
    const button = list.querySelectorAll<HTMLElement>('.dcu-turn-link')[activeIndex]
    if (button === undefined) return
    const next = Math.round(button.getBoundingClientRect().top + button.getBoundingClientRect().height / 2 - nav.getBoundingClientRect().top)
    setSummaryTop(previous => previous === next ? previous : next)
  }, [activeIndex, turns.length])

  if (turns.length === 0) return null
  const moveHover = (event: MouseEvent<HTMLElement>): void => {
    setHoverAt(hoverIndexFromPoint(event.currentTarget, event.clientY, turns.length))
  }
  const style = { '--dcu-turn-left': `${railLeft}px`, '--dcu-summary-top': `${summaryTop}px` } as CSSProperties
  return <nav ref={navRef} className="dcu-turn-navigator" data-hovering={hoverAt !== null || undefined} aria-label={t('turns.label')} style={style}><style>{stylesheet}</style><div className="dcu-turn-scroll"><ol ref={listRef} className="dcu-turn-list" onMouseMove={moveHover} onMouseLeave={() => { setHoverAt(null) }}>{turns.map((turn, index) => {
    const mark = tickMarkSize(index, hoverAt, current === turn.key)
    const active = hoverAt !== null && index === activeIndex
    const tickStyle = hoverAt === null ? undefined : { '--dcu-tick-w': `${mark.width}px`, '--dcu-tick-h': `${mark.height}px` } as CSSProperties
    return <li key={turn.key}><button type="button" className="dcu-turn-link" data-active={active || undefined} aria-current={current === turn.key || undefined} aria-label={t('turns.jump', { index: index + 1, summary: turn.summary })} title={turn.summary} style={tickStyle} onFocus={() => { setHoverAt(index) }} onBlur={() => { setHoverAt(null) }} onClick={() => {
      const host = conversationScrollRoot()
      const anchor = host === null ? null : conversationAnchor(host, turn.key)
      if (host === null || anchor === null) return
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      host.scrollTo({ top: host.scrollTop + anchor.getBoundingClientRect().top - host.getBoundingClientRect().top - 12, behavior: reduceMotion ? 'auto' : 'smooth' })
    }} /></li>
  })}</ol></div>{activeTurn !== undefined && <span className="dcu-turn-summary">{activeTurn.summary}</span>}</nav>
}
