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

export const HOVER_TIP_SHOW_DELAY_MS = 1000
export const HOVER_TIP_HIDE_DELAY_MS = 120

export type HoverDispatch = {
  showTip: (tip: HoverCardTip, options?: { immediate?: boolean }) => void
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
  const showTipTimer = useRef<number>()
  const pendingTip = useRef<HoverCardTip>()
  const blockedRef = useRef(blocked)
  blockedRef.current = blocked
  const tipRef = useRef(hoverTip)
  tipRef.current = hoverTip
  const place = (tip: HoverCardTip): HoverCardTip => ({
    ...tip,
    ...clampHoverCardPosition(tip.left, tip.top, 248, 148, window.innerWidth, window.innerHeight),
  })
  const dispatch = useMemo<HoverDispatch>(() => ({
    showTip: (tip, options) => {
      if (blockedRef.current) return
      if (hideTipTimer.current !== undefined) { window.clearTimeout(hideTipTimer.current); hideTipTimer.current = undefined }
      pendingTip.current = tip
      // 已经在看卡片时换行立刻更新；划过空行必须停满 1 秒才出现，避免闪现
      if (options?.immediate === true || tipRef.current !== undefined) {
        if (showTipTimer.current !== undefined) { window.clearTimeout(showTipTimer.current); showTipTimer.current = undefined }
        setHoverTip(place(tip))
        return
      }
      if (showTipTimer.current !== undefined) window.clearTimeout(showTipTimer.current)
      showTipTimer.current = window.setTimeout(() => {
        showTipTimer.current = undefined
        const next = pendingTip.current
        if (blockedRef.current || next === undefined) return
        setHoverTip(place(next))
      }, HOVER_TIP_SHOW_DELAY_MS)
    },
    hideTip: () => {
      pendingTip.current = undefined
      if (showTipTimer.current !== undefined) { window.clearTimeout(showTipTimer.current); showTipTimer.current = undefined }
      if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
      hideTipTimer.current = window.setTimeout(() => { setHoverTip(undefined) }, HOVER_TIP_HIDE_DELAY_MS)
    },
    dismissTip: () => {
      pendingTip.current = undefined
      if (showTipTimer.current !== undefined) { window.clearTimeout(showTipTimer.current); showTipTimer.current = undefined }
      if (hideTipTimer.current !== undefined) { window.clearTimeout(hideTipTimer.current); hideTipTimer.current = undefined }
      setHoverTip(undefined)
    },
    keepTip: () => {
      if (hideTipTimer.current !== undefined) { window.clearTimeout(hideTipTimer.current); hideTipTimer.current = undefined }
    },
    isShowing: (kind, id) => tipRef.current?.kind === kind && tipRef.current.id === id,
  }), [])
  useEffect(() => () => {
    if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
    if (showTipTimer.current !== undefined) window.clearTimeout(showTipTimer.current)
  }, [])
  return <HoverDispatchContext.Provider value={dispatch}><HoverValueContext.Provider value={hoverTip}>{children}</HoverValueContext.Provider></HoverDispatchContext.Provider>
}

export function useHoverDispatch(): HoverDispatch {
  return useContext(HoverDispatchContext)
}

export function useHoverValue(): HoverCardTip | undefined {
  return useContext(HoverValueContext)
}
