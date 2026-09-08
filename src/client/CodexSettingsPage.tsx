import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, Archive, BarChart3, Box, CircleHelp, Clock, Cpu, Link, MessageSquare, PanelRight, Search, Settings, SlidersHorizontal, Sparkles, Store, User } from 'lucide-react'
import type { PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { ConnectionIndicator } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConnectionState } from '@deepseek-ai/dsh-client-connection/client'
import { NS } from './locales.ts'
import { filterSettingsRows, generalItemGroup, settingsGroup, type SettingsRow } from './settings-page-model.ts'
import { settingsPageStyles } from './settings-page-styles.ts'
import { settingsElementAvailable, settingsOverlays } from './settings-focus.ts'
import { SETTINGS_OPEN_SECTION_EVENT } from './settings-navigation.ts'

const groupLabels = { personal: 'settings.personal', integrations: 'settings.integrations', records: 'settings.records', permissions: 'settings.permissions', general: 'settings.general', editor: 'settings.editor' } as const

export type SettingsSource<T> = { getSnapshot: () => readonly T[]; subscribe: (listener: () => void) => () => void }
export type SettingsPageInjected = {
  sections: SettingsSource<SettingsRow>
  onboarding: SettingsSource<{ id: string }>
  connectionState: { getSnapshot: () => ConnectionState | undefined; subscribe: (listener: () => void) => () => void }
  reconnect: () => void
}
export type CodexSettingsPageProps = PropsRuntime<'sidebar.settings'>
  & PropsRenderSlots<'settings.trigger' | 'settings.header' | 'settings.action' | 'settings.close' | 'settings.section' | 'settings.onboarding'>
  & PropsLocale<typeof NS> & SettingsPageInjected

function sectionIcon(id: string) {
  if (id === 'usage-statistics') return BarChart3
  if (id === 'market' || id === 'plugin-marketplace') return Store
  if (id === 'better-sidebar' || id === 'sidebar-cards') return PanelRight
  if (/model/.test(id)) return Cpu
  if (/archive/.test(id)) return Archive
  if (/about/.test(id)) return CircleHelp
  if (/expert|agency/.test(id)) return User
  if (/skill/.test(id)) return Sparkles
  if (/connector|mcp/.test(id)) return Link
  if (/schedule|automation/.test(id)) return Clock
  if (/im|assistant/.test(id)) return MessageSquare
  if (id === 'general') return Settings
  if (/plugin/.test(id)) return SlidersHorizontal
  return Box
}

/** 独立设置视图复用原始 section/close 合约，退出时保留底层会话与输入状态。 */
export function CodexSettingsPage({ wide, sections, onboarding, connectionState, reconnect, useSessions, renderSlot, t }: CodexSettingsPageProps) {
  const rows = useSyncExternalStore(sections.subscribe, sections.getSnapshot)
  const steps = useSyncExternalStore(onboarding.subscribe, onboarding.getSnapshot)
  const connection = useSyncExternalStore(connectionState.subscribe, connectionState.getSnapshot)
  const onboardingActive = useSessions(state => state.phase === 'ready' && (state.current === undefined || state.byId[state.current]?.blank === true))
  const [completed, setCompleted] = useState<ReadonlySet<string>>(() => new Set())
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState('general')
  const [query, setQuery] = useState('')
  const [recovered, setRecovered] = useState(false)
  const previousConnection = useRef(connection)
  const trigger = useRef<HTMLButtonElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const onboardingRoot = useRef<HTMLDivElement>(null)
  const main = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  const exitAnimation = useRef<Animation | null>(null)
  const active = rows.find(row => row.id === activeId) ?? rows[0]
  const step = onboardingActive ? steps.find(item => !completed.has(item.id)) : undefined
  const close = useCallback(() => {
    if (exitAnimation.current !== null) return
    const finish = () => { exitAnimation.current = null; setOpen(false); setQuery('') }
    const element = page.current
    if (element?.animate === undefined || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { finish(); return }
    // 保留透明末帧直到 React 卸载，避免动画结束与提交之间闪回；入场中退出从当前透明度接续。
    const animation = element.animate([{ opacity: getComputedStyle(element).opacity }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'forwards' })
    exitAnimation.current = animation
    animation.onfinish = finish
  }, [])
  const openSection = useCallback((id: string) => { exitAnimation.current?.cancel(); exitAnimation.current = null; setActiveId(id); setOpen(true) }, [])
  useEffect(() => {
    const element = trigger.current
    const navigate = (event: Event) => {
      const labels: unknown = (event as CustomEvent).detail?.labels
      if (!Array.isArray(labels)) return
      const row = labels.flatMap(label => rows.filter(item => (item.id === 'general' ? t('settings.general') : item.label) === label))[0]
      if (!row) return
      event.preventDefault()
      setQuery('')
      openSection(row.id)
    }
    element?.addEventListener(SETTINGS_OPEN_SECTION_EVENT, navigate)
    return () => element?.removeEventListener(SETTINGS_OPEN_SECTION_EVENT, navigate)
  }, [rows, t, openSection])
  useEffect(() => () => { exitAnimation.current?.cancel() }, [])

  useEffect(() => { if (!onboardingActive) setCompleted(new Set()) }, [onboardingActive])
  useEffect(() => {
    const previous = previousConnection.current
    previousConnection.current = connection
    setRecovered(connection === 'connected' && (previous === 'disconnected' || previous === 'connecting'))
    if (connection !== 'connected') return
    const timer = window.setTimeout(() => { setRecovered(false) }, 3000)
    return () => { window.clearTimeout(timer) }
  }, [connection])
  useEffect(() => {
    if (wasOpen.current && !open) trigger.current?.focus()
    wasOpen.current = open
    if (!open || page.current === null) return
    if (settingsElementAvailable(page.current) && settingsOverlays().length === 0) back.current?.focus()
    // 只隔离被设置页覆盖的分支，不卸载会话，也不移动宿主 React 节点。
    const hidden = new Map<HTMLElement, boolean>()
    // 只为活动引导保留模态区域，不把无关菜单或其整棵包装子树一并放行。
    const guideModals = step === undefined ? [] : settingsOverlays('[role="dialog"][aria-modal="true"],[role="alertdialog"][aria-modal="true"]')
    const isolate = (element: HTMLElement) => {
      if (element === onboardingRoot.current || guideModals.includes(element)) return
      if (guideModals.some(modal => element.contains(modal))) {
        for (const child of element.children) if (child instanceof HTMLElement && !/^(STYLE|SCRIPT|LINK)$/.test(child.tagName)) isolate(child)
        return
      }
      hidden.set(element, element.inert)
      element.inert = true
    }
    let branch: HTMLElement = page.current
    while (branch.parentElement !== null) {
      for (const sibling of branch.parentElement.children) {
        if (!(sibling instanceof HTMLElement) || sibling === branch || /^(STYLE|SCRIPT|LINK)$/.test(sibling.tagName)) continue
        isolate(sibling)
      }
      branch = branch.parentElement
      if (branch === document.body) break
    }
    const onKeyDown = (event: KeyboardEvent) => {
      // 捕获阶段先检查浮层，避免它关闭后同一次 Escape 又退出设置；不阻止其自身处理事件。
      if (event.key === 'Escape' && !event.defaultPrevented && settingsOverlays().length === 0) {
        event.preventDefault()
        close()
      }
    }
    const keepFocus = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof Node) || page.current === null || !settingsElementAvailable(page.current)) return
      if (page.current.contains(target) || onboardingRoot.current?.contains(target)
        || settingsOverlays().some(overlay => overlay.contains(target))) return
      back.current?.focus()
    }
    const wrapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented || page.current === null
        || !settingsElementAvailable(page.current) || settingsOverlays().length > 0) return
      const roots = [page.current, onboardingRoot.current].filter((root): root is HTMLDivElement => root !== null)
      const items = roots.flatMap(root => [...root.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex]')])
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && settingsElementAvailable(element))
      const next = event.shiftKey ? items.at(-1) : items[0]
      if (document.activeElement === (event.shiftKey ? items[0] : items.at(-1))) {
        event.preventDefault()
        next?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('keydown', wrapFocus)
    document.addEventListener('focusin', keepFocus)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('keydown', wrapFocus)
      document.removeEventListener('focusin', keepFocus)
      for (const [element, inert] of hidden) element.inert = inert
    }
  }, [open, close, step?.id])
  useEffect(() => { if (main.current !== null) main.current.scrollTop = 0 }, [active?.id])

  const visible = filterSettingsRows(rows, query)
  const connectionIndicator = connection === 'disconnected' ? 'disconnected' : connection === 'connecting' ? 'connecting' : recovered ? 'recovered' : undefined
  return <>
    <style>{settingsPageStyles}</style>
    <button ref={trigger} type="button" className="dcu-settings-trigger" data-dcu-settings-trigger data-wide={wide} aria-expanded={open} aria-label={t('settings.title')} onClick={() => { openSection('general') }}>
      {renderSlot('settings.trigger', { wide })}
    </button>
    <ConnectionIndicator state={wide ? connectionIndicator : undefined} disconnectedLabel={t('settings.disconnected')} reconnectLabel={t('settings.reconnect')} connectingLabel={t('settings.connecting')} recoveredLabel={t('settings.recovered')} reconnectActionLabel={t('settings.reconnect')} restartActionLabel={t('settings.reconnect')} onReconnect={reconnect}/>
    {open && <div ref={page} className="dcu-settings-page" data-dcu-settings-page role="region" aria-label={t('settings.title')}>
      <nav className="dcu-settings-nav" aria-label={t('settings.title')}>
        <button ref={back} type="button" className="dcu-settings-back" onClick={close}><ArrowLeft size={16}/>{renderSlot('settings.close', {}) ?? t('settings.back')}</button>
        {renderSlot('settings.header', {})}
        <label className="dcu-settings-search"><Search size={15} aria-hidden="true"/><input type="search" value={query} aria-label={t('settings.search')} placeholder={t('settings.search')} onChange={event => { setQuery(event.target.value) }}/></label>
        <div className="dcu-settings-groups">
          {(['personal', 'integrations', 'records'] as const).map(group => {
            const entries = visible.filter(row => settingsGroup(row.id) === group)
            return entries.length > 0 && <section className="dcu-settings-group" key={group}>
              <h2 className="dcu-settings-group-label">{t(groupLabels[group])}</h2>
              {entries.map(row => { const Icon = sectionIcon(row.id); return <button key={row.id} type="button" className="dcu-settings-link" aria-current={row.id === active?.id ? 'page' : undefined} onClick={() => { setActiveId(row.id) }}><Icon size={16} strokeWidth={1.6} aria-hidden="true"/><span>{row.id === 'general' ? t('settings.general') : row.label}</span></button> })}
            </section>
          })}
        </div>
        {visible.length > 0 && !visible.some(row => row.id === active?.id) && <p className="dcu-settings-empty" role="status">{t('settings.filterHint')}</p>}
        {visible.length === 0 && <p className="dcu-settings-empty" role="status">{t('settings.noResults')}</p>}
      </nav>
      <div ref={main} className="dcu-settings-main">
        <div className="dcu-settings-inner">
          <header className="dcu-settings-heading" data-own-title={active?.id === 'general'}>{active?.id === 'general' && <h1>{t('settings.general')}</h1>}<div className="dcu-settings-actions">{renderSlot('settings.action', {})}</div></header>
          {active !== undefined && renderSlot('settings.section', { close }, { only: active.id })}
        </div>
      </div>
    </div>}
    <div ref={onboardingRoot} style={{ display: 'contents' }}>{step !== undefined && renderSlot('settings.onboarding', { stepId: step.id, complete: () => { setCompleted(previous => new Set([...previous, step.id])) }, openSection }, { only: step.id })}</div>
  </>
}

/** 每条偏好仍由原插件渲染和保存，只为公共条目添加可扩展的分组容器。 */
export function CodexGeneralSettings({ items, renderSlot, t }: { items: SettingsSource<{ id: string }> } & PropsRenderSlots<'settings.general.item'> & PropsLocale<typeof NS>) {
  const rows = useSyncExternalStore(items.subscribe, items.getSnapshot)
  return <div className="dcu-settings-general">
    {(['permissions', 'general', 'editor'] as const).map(group => {
      const entries = rows.filter(row => generalItemGroup(row.id) === group)
      return entries.length > 0 && <section className="dcu-settings-general-group" key={group}><h2>{t(groupLabels[group])}</h2><div className="dcu-settings-card">{entries.map(row => <div className="dcu-settings-row" data-dcu-settings-item={row.id} key={row.id}>{renderSlot('settings.general.item', {}, { only: row.id })}</div>)}</div></section>
    })}
  </div>
}
