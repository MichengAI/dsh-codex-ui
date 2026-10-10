import type { ReactNode } from 'react'
import { OFFICIAL_PLUGINS_PANEL_ID } from './settings-navigation.ts'

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
      const next = slots.entriesOfSlot('sidebar.panellist').flatMap(({ options }) => {
        if (options.id === undefined || options.id === OFFICIAL_PLUGINS_PANEL_ID) return []
        return [{
          id: options.id, order: options.order ?? 0,
          label: (typeof options.label === 'function' ? options.label() : options.label) ?? options.id,
        }]
      }).sort((a, b) => a.order - b.order)
      if (next.length !== cached.length || next.some((panel, index) => {
        const previous = cached[index]
        return previous === undefined || panel.id !== previous.id || panel.label !== previous.label || panel.order !== previous.order
      })) cached = next
      return cached
    },
    subscribe(listener) {
      const offSlots = slots.subscribe('sidebar.panellist', listener)
      const offLocale = locale.subscribe(listener)
      return () => { offSlots(); offLocale() }
    },
  }
}

/** 展开和紧凑侧栏只列出宿主注册的全局面板，不额外插入返回会话的任务入口。 */
export function GlobalPanelButtons({ panels, activeId, wide, selectPanel, renderIcon }: {
  panels: readonly GlobalPanel[]; activeId: string | null; wide: boolean
  selectPanel: (id: string | null) => void; renderIcon: (id: string, active: boolean) => ReactNode
}) {
  if (panels.length === 0) return null
  return <>{panels.map(panel => <button key={panel.id} type="button"
    className={wide ? 'dcu-global-panel' : 'dcu-icon dcu-global-panel'} aria-label={panel.label} title={wide ? undefined : panel.label}
    aria-current={activeId === panel.id ? 'page' : undefined} onClick={() => selectPanel(panel.id)}>
    <span className="dcu-menu-icon" aria-hidden="true">{renderIcon(panel.id, activeId === panel.id)}</span>{wide && panel.label}
  </button>)}</>
}
