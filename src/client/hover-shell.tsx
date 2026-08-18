import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { clampHoverCardPosition } from './hover-tip.ts'

export type HoverCardTip = {
  title: string
  project?: string
  branch?: string
  time?: string
  left: number
  top: number
  kind?: 'workspace' | 'session'
  id?: string
  path?: string
  count?: number
}

export type HoverDispatch = {
  showTip: (tip: HoverCardTip) => void
  hideTip: () => void
  dismissTip: () => void
  keepTip: () => void
  isShowing: (kind: 'workspace' | 'session', id: string) => boolean
}

const noopDispatch: HoverDispatch = {
  showTip: () => {},
  hideTip: () => {},
  dismissTip: () => {},
  keepTip: () => {},
  isShowing: () => false,
}

const HoverDispatchContext = createContext<HoverDispatch>(noopDispatch)
const HoverValueContext = createContext<HoverCardTip | undefined>(undefined)

/** 悬停状态放在独立 Provider 里，读 tip 的卡片会更新，树组件只拿稳定的 dispatch。 */
export function HoverShell({ blocked = false, children }: { blocked?: boolean; children: ReactNode }) {
  const [hoverTip, setHoverTip] = useState<HoverCardTip>()
  const hideTipTimer = useRef<number>()
  const blockedRef = useRef(blocked)
  blockedRef.current = blocked
  const tipRef = useRef(hoverTip)
  tipRef.current = hoverTip
  const dispatch = useMemo<HoverDispatch>(() => ({
    showTip: (tip) => {
      if (blockedRef.current) return
      if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
      setHoverTip({ ...tip, ...clampHoverCardPosition(tip.left, tip.top, 248, 148, window.innerWidth, window.innerHeight) })
    },
    hideTip: () => {
      hideTipTimer.current = window.setTimeout(() => { setHoverTip(undefined) }, 120)
    },
    dismissTip: () => {
      if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
      setHoverTip(undefined)
    },
    keepTip: () => {
      if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
    },
    isShowing: (kind, id) => tipRef.current?.kind === kind && tipRef.current.id === id,
  }), [])
  useEffect(() => () => {
    if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
  }, [])
  return <HoverDispatchContext.Provider value={dispatch}><HoverValueContext.Provider value={hoverTip}>{children}</HoverValueContext.Provider></HoverDispatchContext.Provider>
}

export function useHoverDispatch(): HoverDispatch {
  return useContext(HoverDispatchContext)
}

export function useHoverValue(): HoverCardTip | undefined {
  return useContext(HoverValueContext)
}
