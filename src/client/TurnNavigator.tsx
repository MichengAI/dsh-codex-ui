import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { conversationAnchor, conversationScrollRoot } from './conversation-dom.ts'
import { NS } from './locales.ts'

type TurnLink = { key: string; summary: string }

type TurnNavigatorProps = PropsRuntime<'conversation.session.header.utilities'> & PropsLocale<typeof NS>

const stylesheet = `
.dcu-turn-navigator{position:fixed;z-index:8;top:76px;left:var(--dcu-turn-left,288px);max-height:calc(100vh - 96px);overflow-y:auto;padding:4px;scrollbar-width:none}.dcu-turn-navigator::-webkit-scrollbar{display:none}.dcu-turn-list{display:grid;gap:4px;margin:0;padding:0;list-style:none}.dcu-turn-link{display:flex;align-items:center;width:18px;height:16px;overflow:hidden;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:12px/16px var(--dsw-font-family);text-align:left;cursor:pointer;transition:width 180ms ease,height 180ms ease,padding 180ms ease,background-color 180ms ease,color 180ms ease}.dcu-turn-link::before{width:18px;height:2px;flex:0 0 18px;border-radius:2px;background:currentcolor;content:''}.dcu-turn-summary{min-width:0;margin-left:10px;overflow:hidden;opacity:0;text-overflow:ellipsis;white-space:nowrap;transition:opacity 140ms ease}.dcu-turn-link:hover,.dcu-turn-link:focus-visible{width:min(280px,calc(100vw - 64px));height:32px;padding:0 10px;background:var(--dsw-alias-button-floating-hover);color:var(--dsw-alias-label-primary);outline:0}.dcu-turn-link:hover .dcu-turn-summary,.dcu-turn-link:focus-visible .dcu-turn-summary{opacity:1}.dcu-turn-link[aria-current=true]{color:var(--dsw-alias-state-business-primary)}.dcu-turn-link[aria-current=true]::before{height:4px}.dcu-turn-link:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-button-info-fill)}@media (prefers-reduced-motion:reduce){.dcu-turn-link,.dcu-turn-summary{transition:none}}@media (max-width:760px){.dcu-turn-navigator{top:64px;left:4px}.dcu-turn-link:hover,.dcu-turn-link:focus-visible{width:min(220px,calc(100vw - 40px))}}
`

function textSummary(content: readonly unknown[], fallback: string): string {
  const text = content.flatMap(block => {
    if (typeof block !== 'object' || block === null) return []
    const value = block as { type?: unknown; text?: unknown }
    return value.type === 'text' && typeof value.text === 'string' ? [value.text] : []
  }).join('').replace(/\s+/g, ' ').trim()
  return text === '' ? fallback : text.slice(0, 72)
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

/** 当前会话的轮次导航；只读取原生聊天锚点并滚动，不改写会话数据或消息视图。 */
export function TurnNavigator({ useSession, t }: TurnNavigatorProps) {
  const turns = useSession(snapshot => turnLinks(snapshot, t('turns.untitled')), equalTurns)
  const [current, setCurrent] = useState<string | null>(turns[0]?.key ?? null)
  const [sidebarRight, setSidebarRight] = useState(288)
  const turnKeys = useMemo(() => turns.map(turn => turn.key).join('|'), [turns])

  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>('.dcu-root')
    if (sidebar === null) return
    const update = (): void => {
      const next = Math.round(sidebar.getBoundingClientRect().right) + 8
      setSidebarRight(previous => previous === next ? previous : next)
    }
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    observer?.observe(sidebar)
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

  if (turns.length === 0) return null
  const style = { '--dcu-turn-left': `${sidebarRight}px` } as CSSProperties
  return <nav className="dcu-turn-navigator" aria-label={t('turns.label')} style={style}><style>{stylesheet}</style><ol className="dcu-turn-list">{turns.map((turn, index) => <li key={turn.key}><button type="button" className="dcu-turn-link" aria-current={current === turn.key || undefined} aria-label={t('turns.jump', { index: index + 1, summary: turn.summary })} title={turn.summary} onClick={() => {
    const host = conversationScrollRoot()
    const anchor = host === null ? null : conversationAnchor(host, turn.key)
    if (host === null || anchor === null) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    host.scrollTo({ top: host.scrollTop + anchor.getBoundingClientRect().top - host.getBoundingClientRect().top - 12, behavior: reduceMotion ? 'auto' : 'smooth' })
  }}><span className="dcu-turn-summary">{turn.summary}</span></button></li>)}</ol></nav>
}
