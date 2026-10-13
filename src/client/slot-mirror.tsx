import { createElement, useMemo, type ComponentType } from 'react'
import type { SlotCore, StoredEntry, SlotEntryDef } from '@deepseek-ai/dsh-client-ui-slots'

/** Dynamic keys are erased only at the public registry seam, never at the renderer. */
type MirrorContext = { slots: Pick<SlotCore, 'spec' | 'entriesOfSlot' | 'subscribe' | 'register'>; effect?: (callback: () => () => void) => () => void }
type Render = (key: string, ...args: unknown[]) => unknown
const bridges = new WeakMap<object, Map<string, string>>()
const wrappers = new WeakMap<object, Map<string, ComponentType<any>>>()

/** Keep a real React component boundary and its hooks; translate only renderer-owned bindings. */
export function withSlotAliases<P extends object>(Component: ComponentType<P>, aliases: Readonly<Record<string, string>>): ComponentType<P> {
  const pairs = Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b))
  const signature = JSON.stringify(pairs)
  let cached = wrappers.get(Component)
  if (!cached) wrappers.set(Component, cached = new Map())
  const previous = cached.get(signature)
  if (previous) return previous
  const map = new Map(pairs)
  function SlotAliases(props: P) {
    const face = props as P & { renderSlot?: Render; renderSlotChain?: Render }
    const renderSlot = useMemo(() => face.renderSlot && ((key: string, ...args: unknown[]) => face.renderSlot!(map.get(key) ?? key, ...args)), [face.renderSlot])
    const renderSlotChain = useMemo(() => face.renderSlotChain && ((key: string, ...args: unknown[]) => face.renderSlotChain!(map.get(key) ?? key, ...args)), [face.renderSlotChain])
    return createElement(Component, { ...props, ...(renderSlot && { renderSlot }), ...(renderSlotChain && { renderSlotChain }) })
  }
  cached.set(signature, SlotAliases)
  return SlotAliases
}

/**
 * Mirror effective contributions into a predeclared, exclusive root-scope alias.
 * Supports single/list/keyed; chain and session scopes are deliberately rejected.
 * The parent owns the top-level alias declaration and must call the returned disposer
 * on unmount. Source declarations/entries are never changed. Children get new declarations.
 */
export function mirrorSlot(ctx: MirrorContext, source: string, target: string): () => void {
  const slots = ctx.slots
  const readSpec = slots.spec.bind(slots) as (key: string) => SlotEntryDef | undefined
  const register = slots.register.bind(slots) as (options: object, component: ComponentType<any>) => () => void
  const validate = (spec: SlotEntryDef) => {
    if (spec.scope !== 'root' || !['single', 'list', 'keyed'].includes(spec.kind)) throw new Error('slot mirror supports only root single/list/keyed slots')
  }
  const install = (from: string, to: string, ancestors: Set<string>): (() => void) => {
    if (from === to || ancestors.has(from)) throw new Error('recursive slot mirror')
    let graph = bridges.get(ctx)
    if (!graph) bridges.set(ctx, graph = new Map())
    let cursor: string | undefined = from
    while (cursor !== undefined) {
      if (cursor === to) throw new Error('recursive slot mirror')
      cursor = graph.get(cursor)
    }
    if (graph.has(to)) throw new Error(`mirror target '${to}' already has a bridge`)
    const targetSpec = readSpec(to)
    if (!targetSpec) throw new Error(`mirror target '${to}' must be declared by its parent`)
    validate(targetSpec)
    const branch = new Set(ancestors).add(from)
    const active = new Map<StoredEntry, () => void>()
    let stopped = false
    const clear = () => { for (const remove of active.values()) remove(); active.clear() }
    graph.set(to, from)
    const stop = () => { if (stopped) return; stopped = true; unsubSource(); unsubTarget(); graph.delete(to); clear() }
    const sync = () => {
      if (stopped) return
      if (!readSpec(to)) { stop(); return }
      const spec = readSpec(from)
      if (spec) {
        validate(spec)
        if (spec.kind !== targetSpec.kind) throw new Error('slot mirror kind mismatch')
      }
      const entries = slots.entriesOfSlot(from)
      for (const [entry, remove] of active) if (!entries.includes(entry)) { remove(); active.delete(entry) }
      for (const entry of entries) {
        if (active.has(entry)) continue
        const aliases: Record<string, string> = Object.create(null)
        const children: Record<string, SlotEntryDef> = Object.create(null)
        for (const [child, childSpec] of Object.entries(entry.children ?? {})) {
          validate(childSpec)
          if (branch.has(child)) throw new Error('recursive slot mirror')
          const alias = `${to}.${encodeURIComponent(child)}`
          if (readSpec(alias)) throw new Error(`mirror child alias '${alias}' is already declared`)
          aliases[child] = alias
          children[alias] = childSpec
        }
        const removes: (() => void)[] = []
        try {
          removes.push(register({ name: to, ...entry.options, inject: entry.inject, store: entry.store, locale: entry.locale, registrant: entry.registrant,
            ...(entry.children && { children }) }, withSlotAliases(entry.component as ComponentType<any>, aliases)))
          for (const [child, alias] of Object.entries(aliases)) removes.push(install(child, alias, branch))
          active.set(entry, () => { for (const remove of removes.reverse()) remove() })
        } catch (error) { for (const remove of removes.reverse()) remove(); throw error }
      }
    }
    const unsubSource = slots.subscribe(from, sync)
    const unsubTarget = slots.subscribe(to, sync)
    try { sync() } catch (error) { stop(); throw error }
    return stop
  }
  const start = () => install(source, target, new Set())
  return ctx.effect ? ctx.effect(start) : start()
}
