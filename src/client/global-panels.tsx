import type { ReactNode } from 'react'
import { IconNewChatOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'sidebar.panellist': { kind: 'list'; scope: 'root'; owner: { size: number; active: boolean } }
  }
}

export type GlobalPanel = { id: string; label: string; order: number }
export type GlobalPanelSource = { getSnapshot: () => readonly GlobalPanel[]; subscribe: (listener: () => void) => () => void }
type PanelSlots = {
  entriesOfSlot(name: 'sidebar.panellist'): readonly { options: { id?: string; order?: number; label?: string | (() => string | undefined) } }[]
  subscribe(name: 'sidebar.panellist', listener: () => void): () => void
}

/** 从宿主注册表读取面板元数据；缓存快照以满足 React 外部状态订阅契约。 */
export function createGlobalPanelSource(slots: PanelSlots, locale: Pick<GlobalPanelSource, 'subscribe'>): GlobalPanelSource {
  let cached: readonly GlobalPanel[] = []
  return {
    getSnapshot() {
      const next = slots.entriesOfSlot('sidebar.panellist').flatMap(({ options }) => options.id === undefined ? [] : [{
        id: options.id, order: options.order ?? 0,
        label: (typeof options.label === 'function' ? options.label() : options.label) ?? options.id,
      }]).sort((a, b) => a.order - b.order)
      if (JSON.stringify(next) !== JSON.stringify(cached)) cached = next
      return cached
    },
    subscribe(listener) {
      const offSlots = slots.subscribe('sidebar.panellist', listener)
      const offLocale = locale.subscribe(listener)
      return () => { offSlots(); offLocale() }
    },
  }
}

/** 展开和紧凑侧栏共享同一导航行为，null 回到已有会话而非新建会话。 */
export function GlobalPanelButtons({ panels, activeId, wide, conversationLabel, selectPanel, renderIcon }: {
  panels: readonly GlobalPanel[]; activeId: string | null; wide: boolean; conversationLabel: string
  selectPanel: (id: string | null) => void; renderIcon: (id: string, active: boolean) => ReactNode
}) {
  if (panels.length === 0) return null
  const button = (id: string | null, label: string, icon: ReactNode) => <button key={id ?? 'conversation'} type="button"
    className={wide ? 'dcu-global-panel' : 'dcu-icon dcu-global-panel'} aria-label={label} title={wide ? undefined : label}
    aria-current={activeId === id ? 'page' : undefined} onClick={() => selectPanel(id)}>
    <span className="dcu-menu-icon" aria-hidden="true">{icon}</span>{wide && label}
  </button>
  return <>{button(null, conversationLabel, <IconNewChatOutline16 size={16} />)}{panels.map(panel =>
    button(panel.id, panel.label, renderIcon(panel.id, activeId === panel.id)))}</>
}
