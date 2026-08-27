import { forwardRef, useCallback, useDeferredValue, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from 'react'
import {
  BrandWordmark, IconEnhanceOutline16,
  IconLinkOutline16, IconNewChatOutline16, IconPanelLeftOutline16, IconPersonalizationOutline16, IconSearchOutline16, IconSkillOutline16,
  IconUserOutline16, Input,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { openSettingsSection } from './settings-navigation.ts'
import { filterSidebarSearchItems, type SidebarSearchItem } from './sidebar-search.ts'
import { EMPTY_COMPANION_TABS, type CompanionTabAvailability } from './companion-slots.ts'
import { ChannelBrowser } from './ChannelBrowser.tsx'
import { ScheduleBrowser } from './ScheduleBrowser.tsx'
import { isSidebarDragHandle, shouldCollapseOnSidebarDrag } from './sidebar-drag.ts'
import { SLIM_SIDEBAR_PX } from './sidebar-width.ts'
import { isTaskSession } from './workspace-browser.ts'
import { clearAutomationTaskSettingsRequest, requestAutomationTaskSettings } from './automation-task-settings.ts'

type CompanionTabSource = {
  getSnapshot: () => CompanionTabAvailability
  subscribe: (onStoreChange: () => void) => () => void
}

const subscribeEmptyCompanionTabs = (): (() => void) => () => {}
const getEmptyCompanionTabs = (): CompanionTabAvailability => EMPTY_COMPANION_TABS
const SIDEBAR_COLLAPSE_SETTLE_MS = 140

type CodexSidebarInjected = {
  openSession: (sessionId: SessionId) => void
  startSession: (workspaceId?: WorkspaceId) => void
  toggleSidebar: () => void
  archiveSession: (sessionId: SessionId) => Promise<void>
  deleteSession: (sessionId: SessionId) => Promise<void>
  forkSession: (sessionId: SessionId) => Promise<void>
  renameSession: (sessionId: SessionId, title: string) => Promise<void>
  openPath: (path: string) => Promise<void> | void
  companionSlots?: CompanionTabSource
}

export type CodexSidebarProps =
  PropsRuntime<'sidebar'>
  & PropsRenderSlots<'sidebar.workspaces' | 'sidebar.settings' | 'sidebar.footer.action' | 'sidebar.channels' | 'sidebar.schedule'>
  & PropsLocale<typeof NS>
  & CodexSidebarInjected

const stylesheet = `
.dcu-root{--dcu-font:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei UI",sans-serif;--dcu-sidebar-wide-width:240px;--dcu-sidebar-primary:#393d3e;--dcu-sidebar-secondary:#676b6c;--dcu-sidebar-tertiary:#9a9f9f;--dcu-sidebar-navigation:#4e5253;--dcu-sidebar-icon:#4e5253;--dcu-sidebar-hover:#dfe8e5;--dcu-sidebar-border:rgba(37,46,41,.10);--dcu-tip-bg:#ffffff;--dcu-tip-shadow:0 10px 32px rgba(31,39,36,.22);height:100%;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;background:#eef7f5;color:var(--dcu-sidebar-primary);font:14px/20px var(--dcu-font)}body[data-ds-dark-theme] .dcu-root{background:#1d2120;--dcu-sidebar-primary:#b9bab9;--dcu-sidebar-secondary:#909191;--dcu-sidebar-tertiary:#666867;--dcu-sidebar-navigation:#b9bab9;--dcu-sidebar-icon:#afafaf;--dcu-sidebar-hover:#303432;--dcu-sidebar-border:rgba(255,255,255,.08);--dcu-tip-bg:#2a2e2c;--dcu-tip-shadow:0 10px 30px rgba(0,0,0,.28)}
.dcu-expanded-shell{display:flex;width:var(--dcu-sidebar-wide-width);min-height:0;flex:1 1 0;overflow:hidden;flex-direction:column;transform-origin:left center;transition:opacity 140ms ease-out,transform 180ms cubic-bezier(.16,1,.3,1);animation:dcu-sidebar-expanded-in 180ms cubic-bezier(.16,1,.3,1)}.dcu-compact-shell{display:none;width:56px}.dcu-root.dcu-collapsing .dcu-expanded-shell{opacity:0;transform:translateX(-6px);pointer-events:none}.dcu-root.dcu-compact .dcu-expanded-shell{display:none}.dcu-root.dcu-compact .dcu-compact-shell{display:flex;min-height:0;flex:1;flex-direction:column;align-items:center;animation:dcu-sidebar-compact-in 140ms ease-out}@keyframes dcu-sidebar-expanded-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}@keyframes dcu-sidebar-compact-in{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
.dcu-root *{box-sizing:border-box}.dcu-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:8px;height:60px;padding:8px 8px 8px 12px}.dcu-brand{border:0;background:transparent;color:inherit;padding:0;display:flex;align-items:center;min-width:0;overflow:hidden}.dcu-brand svg{display:block;width:auto;max-width:100%;height:24px;min-width:0}.dcu-head-actions{display:grid;grid-auto-flow:column;grid-auto-columns:28px;align-items:center;column-gap:8px;height:28px}
.dcu-icon,.dcu-menu button,.dcu-footer-link{appearance:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}.dcu-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;color:var(--dcu-sidebar-icon)}.dcu-head .dcu-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0;padding:0;border-radius:50%;line-height:0}.dcu-head .dcu-icon svg{display:block;width:16px;height:16px}
.dcu-icon:hover,.dcu-menu button:hover:not(:disabled),.dcu-footer-link:hover{background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary)}
.dcu-menu{padding:0 6px 8px;display:grid;gap:2px}.dcu-menu button,.dcu-footer-link{display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:8px;align-items:center;width:100%;min-height:36px;padding:0 4px;border-radius:8px;color:var(--dcu-sidebar-navigation);font-size:14px;line-height:20px;text-align:left;font-weight:400}
.dcu-menu-icon{display:grid;place-items:center start;width:20px;height:20px}.dcu-menu-icon svg,.dcu-footer-link svg{display:block;width:16px;height:16px;color:var(--dcu-sidebar-icon)}.dcu-menu button:disabled{color:var(--dcu-sidebar-secondary);cursor:default;opacity:1}.dcu-menu button:disabled svg{color:var(--dcu-sidebar-secondary)}
.dcu-extension-items{display:grid;gap:1px;margin:1px 0 4px 28px}.dcu-extension-items button{min-height:32px;color:var(--dcu-sidebar-secondary);font-size:13px;font-weight:400}
.dcu-workspaces{display:flex;min-height:0;flex:1;flex-direction:column;margin-top:2px;padding-top:8px;border-top:1px solid var(--dcu-sidebar-border)}.dcu-workspaces.dcu-workspaces-tabs{padding-top:0;border-top:0}.dcu-im-tabs{display:flex;gap:16px;margin:0 8px 12px;padding:0;border-bottom:1px solid var(--dcu-sidebar-border)}.dcu-im-tab{appearance:none;border:0;background:transparent;color:var(--dcu-sidebar-secondary);padding:8px 0 7px;font:14px/22px var(--dcu-font);font-weight:500;cursor:pointer}.dcu-im-tab[data-on=true]{color:var(--dcu-sidebar-primary);font-weight:600;box-shadow:inset 0 -2px 0 currentColor}.dcu-native-workspaces{display:flex;min-height:0;flex:1}.dcu-native-workspaces>*{min-width:0;flex:1}.dcu-native-workspaces .ima-tabs,.dcu-native-workspaces [role=tablist]{display:none!important}.dcu-schedule-browser{display:flex;min-height:0;flex:1;flex-direction:column}.dcu-native-workspaces .dcu-schedule-views{display:flex!important;flex:none;min-height:30px;margin:0 8px 8px;padding:2px;border:1px solid var(--dcu-sidebar-border);border-radius:8px;background:rgba(255,255,255,.025)}.dcu-schedule-views button{appearance:none;flex:1;min-width:0;height:24px;border:0;border-radius:6px;background:transparent;color:var(--dcu-sidebar-secondary);font:600 12px/18px var(--dcu-font);cursor:pointer}.dcu-schedule-views button[aria-selected=true]{background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary);box-shadow:inset 0 0 0 1px var(--dcu-sidebar-border)}.dcu-schedule-pane{display:flex;min-height:0;flex:1}.dcu-schedule-pane>*{min-width:0;flex:1}.dcu-schedule-pane>[data-slot="sidebar.schedule"]{display:flex!important;width:100%;min-width:0;flex:1}.dcu-schedule-pane>[data-slot="sidebar.schedule"]>.dsh-st-rail{width:100%;min-width:0;padding-right:8px;scrollbar-gutter:auto}.dcu-schedule-pane .dsh-st-overview{padding-right:8px}.dcu-foot{display:grid;width:var(--dcu-sidebar-wide-width);gap:4px;padding:8px 6px 12px;border-top:1px solid var(--dcu-sidebar-border);transition:opacity 120ms ease-out,transform 160ms cubic-bezier(.16,1,.3,1)}.dcu-root.dcu-collapsing>.dcu-foot{opacity:0;transform:translateX(-4px);pointer-events:none}.dcu-footer-actions:empty,.dcu-settings-seat:empty{display:none}.dcu-settings-seat>button{width:100%;min-height:36px;padding-left:4px!important;color:var(--dcu-sidebar-navigation);font:14px/20px var(--dcu-font);font-weight:400}.dcu-compact{width:100%;align-items:flex-start;overflow:hidden;padding:10px 0 8px}.dcu-compact-nav{display:flex;flex:1;min-height:0;flex-direction:column;align-items:center;gap:2px;overflow:auto;padding:6px 0}.dcu-compact .dcu-icon{width:36px;height:36px;flex:none}.dcu-compact .dcu-foot{width:36px;margin-top:auto;margin-left:10px;padding:8px 0;border-top:0}.dcu-compact .dcu-settings-seat{width:36px;overflow:hidden}.dcu-compact .dcu-settings-seat>button{display:grid;place-items:center;width:36px;min-height:36px;padding:0!important;font-size:0!important;line-height:0}.dcu-compact .dcu-settings-seat>button svg{width:16px;height:16px}.dcu-compact .dcu-footer-link{display:flex;justify-content:center;width:36px;padding:0;font-size:0}.dcu-compact .dcu-footer-link svg{width:16px;height:16px}
.dcu-native-workspaces{flex-direction:column}.dcu-native-workspaces>[data-mcp-connector-top-mount=true]{flex:none}.dcu-root .mcpConnectorLauncher,.dcu-root [data-mcp-connector-top-mount=true]{display:none!important}
.dcu-dependency-notice{margin:0 10px 8px;border:1px solid var(--dcu-sidebar-border);border-radius:8px;padding:8px;color:var(--dcu-sidebar-secondary);font-size:12px;line-height:18px}
[role="dialog"][aria-labelledby]{width:min(1000px,calc(100vw - 48px));max-width:calc(100vw - 48px);height:min(800px,calc(100vh - 48px))}
.dcu-search-scrim{position:fixed;z-index:10020;inset:0;display:flex;justify-content:center;align-items:flex-start;padding:72px 20px;background:color-mix(in srgb,#000 48%,transparent);animation:dcu-search-scrim-in 140ms ease-out}.dcu-search-dialog{width:min(560px,100%);max-height:min(640px,calc(100vh - 120px));overflow:auto;border:1px solid var(--dcu-sidebar-border);border-radius:16px;padding:10px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv4);animation:dcu-search-dialog-in 180ms cubic-bezier(.16,1,.3,1)}@keyframes dcu-search-scrim-in{from{opacity:0}to{opacity:1}}@keyframes dcu-search-dialog-in{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1;transform:none}}.dcu-search-input{margin-bottom:8px}.dcu-search-section{padding:6px 0}.dcu-search-title{padding:0 8px 4px;color:var(--dcu-sidebar-tertiary);font-size:12px;font-weight:600}.dcu-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;min-height:34px;border:0;border-radius:8px;padding:6px 8px;background:transparent;color:var(--dcu-sidebar-primary);font:inherit;text-align:left;cursor:pointer}.dcu-search-row:hover,.dcu-search-row[data-active=true]{background:var(--dcu-sidebar-hover)}.dcu-search-main{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-search-detail{max-width:160px;overflow:hidden;color:var(--dcu-sidebar-tertiary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.dcu-search-empty{padding:18px 8px;color:var(--dcu-sidebar-tertiary);font-size:13px}@media (prefers-reduced-motion:reduce){.dcu-expanded-shell,.dcu-root.dcu-compact .dcu-compact-shell,.dcu-foot,.dcu-search-scrim,.dcu-search-dialog{animation:none;transition:none}}
[data-conversation-scroll]{--dsh-chat-content-width:800px;--dsh-composer-card-max-width:calc(var(--dsh-chat-content-width) + 32px);--dsh-composer-side-clearance:24px}[data-conversation-scroll] [data-chat-flow]{gap:20px}[data-conversation-scroll] [data-composer-card]{min-height:96px;padding-top:10px;border-radius:16px;box-shadow:var(--dsw-shadow-lv3);transition:border-color 180ms ease,box-shadow 180ms ease}[data-conversation-scroll] [data-composer-card]:focus-within{border-color:var(--dsw-alias-button-info-fill);box-shadow:0 0 0 2px var(--dsw-static-deepseek-50),var(--dsw-shadow-lv3)}[data-conversation-scroll] [data-input-mirror]{min-height:44px}@media (prefers-reduced-motion:reduce){[data-conversation-scroll] [data-composer-card]{transition:none}}
`

function MenuIcon({ children }: { children: ReactNode }) { return <span className="dcu-menu-icon">{children}</span> }
function ScheduleIcon() {
  return <svg viewBox="0 0 16 16" width={16} height={16} fill="none" aria-hidden="true"><path fill="currentColor" d="M8 1.15A6.85 6.85 0 1 0 8 14.85 6.85 6.85 0 0 0 8 1.15Zm0 1.4a5.45 5.45 0 1 1 0 10.9 5.45 5.45 0 0 1 0-10.9Z" /><path fill="currentColor" d="M8.62 4.35H7.28v4.2l3.02 1.78.67-1.13-2.35-1.39V4.35Z" /></svg>
}
function ImAssistantIcon() {
  return <svg viewBox="0 0 16 16" width={16} height={16} fill="none" aria-hidden="true"><path fill="currentColor" d="M2.15 2.9h11.7v8.2H6.42L2.15 13.85V2.9Zm1.4 1.4v6.62l1.78-1.12h7.12V4.3H3.55Z" /></svg>
}

type SearchEntry = SidebarSearchItem & {
  readonly group: 'sessions' | 'settings' | 'actions'
  readonly detail?: string
  readonly run: () => void
}

type SidebarSearchHandle = { open: () => void }

type SidebarSearchProps = Pick<CodexSidebarProps, 'openSession' | 'startSession' | 't' | 'useSessions' | 'useWorkspaces'> & {
  settingsSeat: RefObject<HTMLDivElement>
}

/** 搜索状态与大侧栏隔离：输入、悬停和开关弹窗都不能让工作区树跟着重渲染。 */
const SidebarSearch = forwardRef<SidebarSearchHandle, SidebarSearchProps>(function SidebarSearch(
  { openSession, startSession, t, useSessions, useWorkspaces, settingsSeat },
  ref,
) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const deferredQuery = useDeferredValue(query)
  const sessions = useSessions(state => state)
  const workspaces = useWorkspaces(state => state)

  const close = useCallback((): void => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])
  useImperativeHandle(ref, () => ({ open: () => { setOpen(true) } }), [])

  const selectSection = useCallback((label: string): void => {
    openSettingsSection(settingsSeat.current, label)
  }, [settingsSeat])
  const selectPluginSection = useCallback((): void => {
    openSettingsSection(settingsSeat.current, [t('sidebar.marketplace'), t('sidebar.plugins')])
  }, [settingsSeat, t])
  const selectExternalSection = useCallback((label: string | readonly string[]): void => {
    openSettingsSection(settingsSeat.current, label, () => { selectSection(t('about.nav')) })
  }, [selectSection, settingsSeat, t])
  const openSettings = useCallback((): void => {
    settingsSeat.current?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')?.click()
  }, [settingsSeat])

  const entries = useMemo<SearchEntry[]>(() => {
    const archived = new Set(workspaces.archivedSessionIds)
    const workspaceTitles = new Map(workspaces.items.flatMap(workspace => workspace.sessionIds.map(sessionId => [String(sessionId), workspace.title])))
    const sessionEntries = sessions.ids
      .map(id => sessions.byId[id])
      .filter((session): session is NonNullable<typeof session> => session !== undefined && !archived.has(session.id) && isTaskSession(session))
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map(session => ({ id: `session:${session.id}`, group: 'sessions' as const, label: session.displayTitle, keywords: `${session.cwd ?? ''} ${session.id}`, detail: workspaceTitles.get(String(session.id)) ?? session.cwd, run: () => { close(); openSession(session.id) } }))
    const settingEntries: SearchEntry[] = [
      { id: 'settings:root', group: 'settings', label: t('search.settings'), keywords: t('search.settings'), run: () => { close(); openSettings() } },
      { id: 'settings:experts', group: 'settings', label: t('sidebar.experts'), keywords: t('search.settings'), run: () => { close(); selectExternalSection(t('sidebar.experts')) } },
      { id: 'settings:skills', group: 'settings', label: t('sidebar.skills'), keywords: t('search.settings'), run: () => { close(); selectExternalSection(t('sidebar.skills')) } },
      { id: 'settings:plugins', group: 'settings', label: t('sidebar.plugins'), keywords: t('search.settings'), run: () => { close(); selectPluginSection() } },
      { id: 'settings:connectors', group: 'settings', label: t('sidebar.connectors'), keywords: t('search.settings'), run: () => { close(); selectSection(t('sidebar.connectors')) } },
      { id: 'settings:schedule', group: 'settings', label: t('sidebar.schedule'), keywords: t('search.settings'), run: () => { close(); selectExternalSection(t('sidebar.schedule')) } },
      { id: 'settings:assistant', group: 'settings', label: t('sidebar.assistant'), keywords: t('search.settings'), run: () => { close(); selectExternalSection([t('sidebar.imSettings'), 'IM助理']) } },
      { id: 'settings:about', group: 'settings', label: t('about.nav'), keywords: t('search.settings'), run: () => { close(); selectSection(t('about.nav')) } },
    ]
    return [...sessionEntries, ...settingEntries, { id: 'action:new', group: 'actions', label: t('sidebar.newTask'), keywords: t('search.actions'), run: () => { close(); startSession() } }]
  }, [close, openSession, openSettings, selectExternalSection, selectPluginSection, selectSection, sessions.byId, sessions.ids, startSession, t, workspaces.archivedSessionIds, workspaces.items])
  const results = useMemo(() => filterSidebarSearchItems(entries, deferredQuery).slice(0, 12), [deferredQuery, entries])

  useEffect(() => { setActiveIndex(0) }, [query, open])
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => Math.min(index + 1, Math.max(0, results.length - 1))); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => Math.max(index - 1, 0)); return }
      if (event.key === 'Enter') { const entry = results[activeIndex]; if (entry !== undefined) { event.preventDefault(); entry.run() } }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [activeIndex, close, open, results])

  if (!open) return null
  return <div className="dcu-search-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="dcu-search-dialog" role="dialog" aria-modal="true" aria-label={t('sidebar.search')}><div className="dcu-search-input"><Input autoFocus icon={<IconSearchOutline16 size={16} />} value={query} placeholder={t('search.placeholder')} onChange={event => { setQuery(event.target.value) }} /></div>{results.length === 0 ? <div className="dcu-search-empty">{t('search.empty')}</div> : (['sessions', 'settings', 'actions'] as const).map(group => { const grouped = results.filter(entry => entry.group === group); if (grouped.length === 0) return null; return <section className="dcu-search-section" key={group}><div className="dcu-search-title">{t(`search.${group}`)}</div>{grouped.map(entry => { const index = results.indexOf(entry); return <button type="button" className="dcu-search-row" data-active={index === activeIndex} key={entry.id} onMouseEnter={() => { setActiveIndex(index) }} onClick={entry.run}><span className="dcu-search-main">{entry.label}</span>{entry.detail !== undefined && <span className="dcu-search-detail">{entry.detail}</span>}</button> })}</section> })}</section></div>
})

/** Codex 风格的 DSH 侧栏，只替换导航外观，项目浏览和设置仍由 DSH 官方组件提供。 */
export function CodexSidebar({ collapsed, width, openSession, startSession, toggleSidebar, archiveSession, deleteSession, forkSession, renameSession, openPath, companionSlots, renderSlot, t, useSessions, useWorkspaces }: CodexSidebarProps) {
  const compact = collapsed || width < 80
  const [visualCompact, setVisualCompact] = useState(compact)
  const [collapsing, setCollapsing] = useState(false)
  const lastWideWidth = useRef(width >= 80 ? width : SLIM_SIDEBAR_PX)
  if (!compact) lastWideWidth.current = width
  const settingsSeat = useRef<HTMLDivElement>(null)
  const search = useRef<SidebarSearchHandle>(null)
  const toggleSidebarRef = useRef(toggleSidebar)
  toggleSidebarRef.current = toggleSidebar
  const expandSidebar = useCallback((): void => { toggleSidebarRef.current() }, [])
  const [extensionsOpen, setExtensionsOpen] = useState(true)
  const [imTab, setImTab] = useState<'tasks' | 'channels' | 'schedule'>('tasks')
  const companionTabs = useSyncExternalStore(
    companionSlots?.subscribe ?? subscribeEmptyCompanionTabs,
    companionSlots?.getSnapshot ?? getEmptyCompanionTabs,
    companionSlots?.getSnapshot ?? getEmptyCompanionTabs,
  )
  const showChannels = companionTabs.channels
  const showSchedule = companionTabs.schedule
  const showCompanionTabs = showChannels || showSchedule
  const selectSection = (label: string): void => { openSettingsSection(settingsSeat.current, label) }
  const selectPluginSection = (): void => { openSettingsSection(settingsSeat.current, [t('sidebar.marketplace'), t('sidebar.plugins')]) }
  const selectExternalSection = (label: string | readonly string[]): void => {
    openSettingsSection(settingsSeat.current, label, () => { selectSection(t('about.nav')) })
  }
  useEffect(() => {
    if (imTab === 'channels' && !showChannels) setImTab('tasks')
    if (imTab === 'schedule' && !showSchedule) setImTab('tasks')
  }, [imTab, showChannels, showSchedule])
  useEffect(() => {
    let startX = 0
    let dragging = false
    let pointerId: number | undefined
    const onDown = (event: PointerEvent): void => {
      if (dragging || !isSidebarDragHandle(event.target)) return
      dragging = true
      pointerId = event.pointerId
      startX = event.clientX
    }
    const onUp = (event: PointerEvent): void => {
      if (!dragging || event.pointerId !== pointerId) return
      dragging = false
      pointerId = undefined
      if (!shouldCollapseOnSidebarDrag(startX, event.clientX)) return
      window.requestAnimationFrame(() => { window.requestAnimationFrame(() => { toggleSidebar() }) })
    }
    const onCancel = (event: PointerEvent): void => {
      if (event.pointerId !== pointerId) return
      dragging = false
      pointerId = undefined
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onCancel, true)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onCancel, true)
    }
  }, [toggleSidebar])
  useLayoutEffect(() => {
    if (!compact) {
      setCollapsing(false)
      setVisualCompact(false)
      return
    }
    if (visualCompact) {
      setCollapsing(false)
      return
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true) {
      setCollapsing(false)
      setVisualCompact(true)
      return
    }
    setCollapsing(true)
    const timer = window.setTimeout(() => {
      setVisualCompact(true)
      setCollapsing(false)
    }, SIDEBAR_COLLAPSE_SETTLE_MS)
    return () => { window.clearTimeout(timer) }
  }, [compact, visualCompact])
  const workspaceSlot = useMemo(
    () => renderSlot('sidebar.workspaces', { wide: true, expandSidebar }),
    [expandSidebar, renderSlot],
  )
  const scheduleOverviewSlot = useMemo(
    () => renderSlot('sidebar.schedule', {
      wide: true,
      expandSidebar,
      openSession,
      archiveSession,
      deleteSession,
      forkSession,
      renameSession,
      openPath,
      useSessions,
      useWorkspaces,
      view: 'overview',
      showViewSwitch: false,
    }),
    [archiveSession, companionTabs.schedule, deleteSession, expandSidebar, forkSession, openPath, openSession, renameSession, renderSlot, useSessions, useWorkspaces],
  )

  const sidebarStyle = { '--dcu-sidebar-wide-width': `${lastWideWidth.current}px` } as CSSProperties

  return <aside className={`dcu-root${visualCompact ? ' dcu-compact' : ''}${collapsing ? ' dcu-collapsing' : ''}`} style={sidebarStyle} aria-label={t('sidebar.label')}>
    <style>{stylesheet}</style>
    <div className="dcu-expanded-shell">
    <header className="dcu-head"><button type="button" className="dcu-brand" aria-label={t('sidebar.newTask')} onClick={() => { startSession() }}><BrandWordmark size={24} /></button><div className="dcu-head-actions"><button type="button" className="dcu-icon" aria-label={t('sidebar.collapse')} onClick={toggleSidebar}><IconPanelLeftOutline16 size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.search')} onClick={() => { search.current?.open() }}><IconSearchOutline16 size={16} /></button></div></header>
    <nav className="dcu-menu" aria-label={t('sidebar.mainMenu')}>
      <button type="button" onClick={() => { startSession() }}><MenuIcon><IconNewChatOutline16 size={16} /></MenuIcon>{t('sidebar.newTask')}</button>
      <button type="button" aria-expanded={extensionsOpen} onClick={() => { setExtensionsOpen(open => !open) }}><MenuIcon><IconEnhanceOutline16 size={16} /></MenuIcon>{t('sidebar.extensions')}</button>
      {extensionsOpen && <div className="dcu-extension-items"><button type="button" onClick={() => { selectExternalSection(t('sidebar.experts')) }}><MenuIcon><IconUserOutline16 size={16} /></MenuIcon>{t('sidebar.experts')}</button><button type="button" onClick={() => { selectExternalSection(t('sidebar.skills')) }}><MenuIcon><IconSkillOutline16 size={16} /></MenuIcon>{t('sidebar.skills')}</button><button type="button" onClick={() => { selectPluginSection() }}><MenuIcon><IconPersonalizationOutline16 size={16} /></MenuIcon>{t('sidebar.plugins')}</button><button type="button" onClick={() => { selectSection(t('sidebar.connectors')) }}><MenuIcon><IconLinkOutline16 size={16} /></MenuIcon>{t('sidebar.connectors')}</button></div>}
      <button type="button" onClick={() => { selectExternalSection(t('sidebar.schedule')) }}><MenuIcon><ScheduleIcon /></MenuIcon>{t('sidebar.schedule')}</button>
      <button type="button" onClick={() => { selectExternalSection([t('sidebar.imSettings'), 'IM助理']) }}><MenuIcon><ImAssistantIcon /></MenuIcon>{t('sidebar.assistant')}</button>
    </nav>
    <div className={showCompanionTabs ? "dcu-workspaces dcu-workspaces-tabs" : "dcu-workspaces"}>
      {showCompanionTabs && <div className="dcu-im-tabs">
        <button type="button" className="dcu-im-tab" data-on={imTab === 'tasks'} onClick={() => { setImTab('tasks') }}>{t('sidebar.tasksTab')}</button>
        {showChannels && <button type="button" className="dcu-im-tab" data-on={imTab === 'channels'} onClick={() => { setImTab('channels') }}>{t('sidebar.channelsTab')}</button>}
        {showSchedule && <button type="button" className="dcu-im-tab" data-on={imTab === 'schedule'} onClick={() => { setImTab('schedule') }}>{t('sidebar.scheduleTab')}</button>}
      </div>}
      {imTab === 'channels' && showChannels
        ? <div className="dcu-native-workspaces"><ChannelBrowser openSession={openSession} archiveSession={archiveSession} deleteSession={deleteSession} forkSession={forkSession} renameSession={renameSession} useSessions={useSessions} t={t} /></div>
        : imTab === 'schedule' && showSchedule
          ? <div className="dcu-native-workspaces"><ScheduleBrowser openSession={openSession} archiveSession={archiveSession} deleteSession={deleteSession} forkSession={forkSession} renameSession={renameSession} useSessions={useSessions} useWorkspaces={useWorkspaces} t={t} overviewContent={scheduleOverviewSlot} openTaskSettings={(request) => {
              openSettingsSection(settingsSeat.current, t('sidebar.schedule'), () => { clearAutomationTaskSettingsRequest(); selectSection(t('about.nav')) }, () => { requestAutomationTaskSettings(request) })
            }} /></div>
          : <div className="dcu-native-workspaces">{workspaceSlot}</div>}
    </div>
    </div>
    <div className="dcu-compact-shell"><button type="button" className="dcu-icon" aria-label={t('sidebar.expand')} onClick={toggleSidebar}><IconPanelLeftOutline16 size={16} /></button><nav className="dcu-compact-nav" aria-label={t('sidebar.mainMenu')}><button type="button" className="dcu-icon" aria-label={t('sidebar.newTask')} onClick={() => { startSession() }}><IconNewChatOutline16 size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.search')} onClick={() => { search.current?.open() }}><IconSearchOutline16 size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.experts')} onClick={() => { selectExternalSection(t('sidebar.experts')) }}><IconUserOutline16 size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.skills')} onClick={() => { selectExternalSection(t('sidebar.skills')) }}><IconSkillOutline16 size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.plugins')} onClick={() => { selectPluginSection() }}><IconPersonalizationOutline16 size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.connectors')} onClick={() => { selectSection(t('sidebar.connectors')) }}><IconLinkOutline16 size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.schedule')} onClick={() => { selectExternalSection(t('sidebar.schedule')) }}><ScheduleIcon /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.assistant')} onClick={() => { selectExternalSection([t('sidebar.imSettings'), 'IM助理']) }}><ImAssistantIcon /></button></nav></div>
    <footer className="dcu-foot"><div className="dcu-footer-actions">{renderSlot('sidebar.footer.action', { wide: !visualCompact })}</div><div ref={settingsSeat} className="dcu-settings-seat">{renderSlot('sidebar.settings', { wide: !visualCompact })}</div></footer>
    <SidebarSearch ref={search} settingsSeat={settingsSeat} openSession={openSession} startSession={startSession} t={t} useSessions={useSessions} useWorkspaces={useWorkspaces} />
  </aside>
}








CodexSidebar.displayName = 'michengai-codex-ui'
