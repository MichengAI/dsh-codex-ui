import { Component, createElement, useSyncExternalStore, type ReactNode } from 'react'

export type OfficialPluginPage = (props: Record<string, unknown>) => ReactNode
export type PluginConfigLocale = (ns: string) => (key: string) => string

const FORWARDED_CONFIG_SLOTS = new Set(['plugins.item', 'plugins.bundle.config', 'plugins.row.config'])

export type PluginConfigSlots = {
  entriesOfSlot(name: string): readonly {
    options: { key?: string; id?: string }
    component: unknown
    locale?: string
    inject?: () => unknown
  }[]
  subscribe(name: string, listener: () => void): () => void
  getVersion(name: string): number
}

type RenderSlot = (name: string, owner?: Record<string, unknown>, opts?: OfficialSlotOpts) => ReactNode
type OfficialSlotOpts = { entryKey?: string; only?: string; fallback?: ReactNode }
type SnapshotSource = { getSnapshot: () => unknown; subscribe: (listener: () => void) => () => void }

class SlotEntryBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true } }
  render(): ReactNode { return this.state.failed ? this.props.fallback : this.props.children }
}

function isSnapshotSource(value: unknown): value is SnapshotSource {
  return typeof value === 'object' && value !== null
    && typeof (value as SnapshotSource).getSnapshot === 'function'
    && typeof (value as SnapshotSource).subscribe === 'function'
}

function hookPropName(name: string): string {
  return `use${name[0]?.toUpperCase() ?? ''}${name.slice(1)}`
}

function bindSnapshotSelector(source: SnapshotSource) {
  const subscribe = (listener: () => void) => source.subscribe(listener)
  const getSnapshot = () => source.getSnapshot()
  return function useSelected(selector: (value: unknown) => unknown = value => value) {
    return useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getSnapshot()))
  }
}

function bindInjectFace(inject: unknown): Record<string, unknown> {
  try {
    if (typeof inject !== 'function') return {}
    const face = inject()
    if (typeof face !== 'object' || face === null) return {}
    const { hooks, keyedHooks: _keyedHooks, ...rest } = face as { hooks?: Record<string, unknown>; keyedHooks?: unknown }
    const bound: Record<string, unknown> = { ...rest }
    for (const [name, source] of Object.entries(hooks ?? {})) {
      if (isSnapshotSource(source)) bound[hookPropName(name)] = bindSnapshotSelector(source)
    }
    return bound
  } catch {
    return {}
  }
}

function DelegatedOfficialSlot({ slots, name, owner, opts, bindLocale }: {
  slots: PluginConfigSlots
  name: string
  owner: Record<string, unknown>
  opts?: OfficialSlotOpts
  bindLocale?: PluginConfigLocale
}): ReactNode {
  useSyncExternalStore(listener => slots.subscribe(name, listener), () => slots.getVersion(name))
  const picked = slots.entriesOfSlot(name).filter(entry => (
    opts?.entryKey !== undefined ? entry.options.key === opts.entryKey : opts?.only === undefined || entry.options.id === opts.only
  ))
  const nodes = picked.flatMap((entry, index) => {
    if (typeof entry.component !== 'function') return []
    const t = entry.locale !== undefined && bindLocale !== undefined ? bindLocale(entry.locale) : undefined
    return [createElement(SlotEntryBoundary, {
      key: entry.options.key ?? entry.options.id ?? String(index),
      fallback: opts?.fallback ?? null,
      children: createElement(entry.component as OfficialPluginPage, {
        ...owner,
        ...bindInjectFace(entry.inject),
        ...(t === undefined ? {} : { t }),
      }),
    })]
  })
  return nodes.length > 0 ? <div data-slot={name} style={{ display: 'contents' }}>{nodes}</div> : opts?.fallback ?? null
}

function wrapRenderSlot(settingsRenderSlot: unknown, slots: PluginConfigSlots | undefined, bindLocale?: PluginConfigLocale): RenderSlot {
  return (name, owner = {}, opts) => {
    if (slots !== undefined && FORWARDED_CONFIG_SLOTS.has(name)) {
      return <DelegatedOfficialSlot slots={slots} name={name} owner={owner} opts={opts} bindLocale={bindLocale} />
    }
    return typeof settingsRenderSlot === 'function' ? (settingsRenderSlot as RenderSlot)(name, owner, opts) : null
  }
}

/** 设置里的官方插件管理页副本。官方卡片要 inject 和文案；单卡崩溃不得拆掉整页。 */
export function PluginConfigSection({ Official, officialLabel, slots, bindLocale, ...official }: {
  Official: OfficialPluginPage
  officialLabel: string
  slots?: PluginConfigSlots
  bindLocale?: PluginConfigLocale
} & Record<string, unknown>): ReactNode {
  return <section className="dcu-plugin-config" aria-label={officialLabel}>
    {createElement(Official, { ...official, renderSlot: wrapRenderSlot(official.renderSlot, slots, bindLocale) })}
  </section>
}

export function createPluginConfigSection(Official: OfficialPluginPage, officialLabel: () => string, slots: PluginConfigSlots, bindLocale: PluginConfigLocale): (props: Record<string, unknown>) => ReactNode {
  return function PluginConfigSectionBound(props: Record<string, unknown>): ReactNode {
    return <PluginConfigSection Official={Official} officialLabel={officialLabel()} slots={slots} bindLocale={bindLocale} {...props} />
  }
}
