import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  BrandWordmark, FishLogo, IconAgentPresetOutline16, IconEnhanceOutline16,
  IconGoalOutline16, IconLinkOutline16, IconNewChatOutline16, IconPersonalizationOutline16, IconSearchOutline16, IconSkillOutline16,
  IconUserOutline16, Input,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { openSettingsSection } from './settings-navigation.ts'
import { filterSidebarSearchItems, type SidebarSearchItem } from './sidebar-search.ts'

type CodexSidebarInjected = {
  openSession: (sessionId: SessionId) => void
  startSession: (workspaceId?: WorkspaceId) => void
  toggleSidebar: () => void
}

export type CodexSidebarProps =
  PropsRuntime<'sidebar'>
  & PropsRenderSlots<'sidebar.workspaces' | 'sidebar.settings' | 'sidebar.footer.action'>
  & PropsLocale<typeof NS>
  & CodexSidebarInjected

const stylesheet = `
.dcu-root{--dcu-font:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei UI",sans-serif;--dcu-sidebar-primary:#2f3432;--dcu-sidebar-secondary:#57605c;--dcu-sidebar-tertiary:#747c78;--dcu-sidebar-icon:#4c5652;--dcu-sidebar-hover:#dfe8e5;--dcu-sidebar-border:rgba(37,46,41,.10);height:100%;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;background:#eef7f5;color:var(--dcu-sidebar-primary);font:14px/20px var(--dcu-font)}body[data-ds-dark-theme] .dcu-root{background:#1c1f1e;--dcu-sidebar-primary:#d1d5d3;--dcu-sidebar-secondary:#9ca39f;--dcu-sidebar-tertiary:#747b77;--dcu-sidebar-icon:#b2b8b5;--dcu-sidebar-hover:#303432;--dcu-sidebar-border:rgba(255,255,255,.08)}
.dcu-root *{box-sizing:border-box}.dcu-head{height:62px;padding:12px 10px 10px;display:flex;align-items:center;gap:6px}.dcu-brand{border:0;background:transparent;color:inherit;padding:0;display:flex;align-items:center;min-width:0;flex:1}.dcu-brand svg{max-width:100%;height:24px}
.dcu-icon,.dcu-menu button,.dcu-footer-link{appearance:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}.dcu-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;color:var(--dcu-sidebar-icon)}
.dcu-icon:hover,.dcu-menu button:hover,.dcu-footer-link:hover{background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary)}
.dcu-menu{padding:0 10px 10px;display:grid;gap:2px}.dcu-menu button,.dcu-footer-link{display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:8px;align-items:center;width:100%;min-height:36px;padding:0 4px;border-radius:8px;color:var(--dcu-sidebar-primary);font-size:14px;line-height:20px;text-align:left;font-weight:500}
.dcu-menu-icon{display:grid;place-items:center start;width:20px;height:20px}.dcu-menu-icon svg,.dcu-footer-link svg{display:block;width:16px;height:16px;color:var(--dcu-sidebar-icon)}.dcu-menu button:disabled{color:var(--dcu-sidebar-secondary);cursor:default;opacity:1}.dcu-menu button:disabled svg{color:var(--dcu-sidebar-secondary)}
.dcu-extension-items{display:grid;gap:1px;margin:1px 0 4px 22px;padding-left:6px;border-left:1px solid var(--dcu-sidebar-border)}.dcu-extension-items button{color:var(--dcu-sidebar-primary);font-size:14px;font-weight:400}
.dcu-workspaces{display:flex;min-height:0;flex:1;flex-direction:column;margin-top:2px;padding-top:8px;border-top:1px solid var(--dcu-sidebar-border)}.dcu-native-workspaces{display:flex;min-height:0;flex:1}.dcu-native-workspaces>*{min-width:0;flex:1}.dcu-foot{display:grid;gap:4px;padding:8px 10px 12px;border-top:1px solid var(--dcu-sidebar-border)}.dcu-footer-actions:empty,.dcu-settings-seat:empty{display:none}.dcu-settings-seat>button{width:100%;min-height:36px;padding-left:4px!important;color:var(--dcu-sidebar-primary);font:14px/20px var(--dcu-font);font-weight:500}.dcu-compact{width:24px;min-width:24px;align-items:center;overflow:hidden;padding:12px 0}.dcu-compact .dcu-icon{width:24px;height:40px}.dcu-compact .dcu-workspaces{width:100%;flex:1}.dcu-compact .dcu-foot{width:24px;margin-top:auto;padding:8px 0;border-top:0}.dcu-compact .dcu-settings-seat{width:24px;overflow:hidden}.dcu-compact .dcu-footer-link{display:flex;justify-content:center;width:24px;padding:0;font-size:0}.dcu-compact .dcu-footer-link svg{width:16px;height:16px}
.dcu-dependency-notice{margin:0 10px 8px;border:1px solid var(--dcu-sidebar-border);border-radius:8px;padding:8px;color:var(--dcu-sidebar-secondary);font-size:12px;line-height:18px}
[role="dialog"][aria-labelledby]{width:min(1000px,calc(100vw - 48px));max-width:calc(100vw - 48px);height:min(800px,calc(100vh - 48px))}
.dcu-search-scrim{position:fixed;z-index:10020;inset:0;display:flex;justify-content:center;align-items:flex-start;padding:72px 20px;background:color-mix(in srgb,#000 48%,transparent)}.dcu-search-dialog{width:min(560px,100%);max-height:min(640px,calc(100vh - 120px));overflow:auto;border:1px solid var(--dcu-sidebar-border);border-radius:16px;padding:10px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv4)}.dcu-search-input{margin-bottom:8px}.dcu-search-section{padding:6px 0}.dcu-search-title{padding:0 8px 4px;color:var(--dcu-sidebar-tertiary);font-size:12px;font-weight:600}.dcu-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;min-height:34px;border:0;border-radius:8px;padding:6px 8px;background:transparent;color:var(--dcu-sidebar-primary);font:inherit;text-align:left;cursor:pointer}.dcu-search-row:hover,.dcu-search-row[data-active=true]{background:var(--dcu-sidebar-hover)}.dcu-search-main{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-search-detail{max-width:160px;overflow:hidden;color:var(--dcu-sidebar-tertiary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.dcu-search-empty{padding:18px 8px;color:var(--dcu-sidebar-tertiary);font-size:13px}
[data-conversation-scroll]{--dsh-chat-content-width:800px;--dsh-composer-card-max-width:calc(var(--dsh-chat-content-width) + 32px);--dsh-composer-side-clearance:24px}[data-conversation-scroll] [data-chat-flow]{gap:20px}[data-conversation-scroll] [data-composer-card]{min-height:142px;padding-top:14px;border-radius:20px;box-shadow:var(--dsw-shadow-lv3);transition:border-color 180ms ease,box-shadow 180ms ease}[data-conversation-scroll] [data-composer-card]:focus-within{border-color:var(--dsw-alias-button-info-fill);box-shadow:0 0 0 2px var(--dsw-static-deepseek-50),var(--dsw-shadow-lv3)}[data-conversation-scroll] [data-input-mirror]{min-height:78px}@media (prefers-reduced-motion:reduce){[data-conversation-scroll] [data-composer-card]{transition:none}}
`

function MenuIcon({ children }: { children: ReactNode }) { return <span className="dcu-menu-icon">{children}</span> }

type SearchEntry = SidebarSearchItem & {
  readonly group: 'sessions' | 'settings' | 'actions'
  readonly detail?: string
  readonly run: () => void
}

/** Codex 风格的 DSH 侧栏，只替换导航外观，项目浏览和设置仍由 DSH 官方组件提供。 */
export function CodexSidebar({ collapsed, openSession, startSession, toggleSidebar, renderSlot, t, useSessions, useWorkspaces }: CodexSidebarProps) {
  const settingsSeat = useRef<HTMLDivElement>(null)
  const [extensionsOpen, setExtensionsOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchIndex, setActiveSearchIndex] = useState(0)
  const sessions = useSessions(state => state)
  const workspaces = useWorkspaces(state => state)
  const selectSection = (label: string): void => { openSettingsSection(settingsSeat.current, label) }
  const selectExternalSection = (label: string): void => {
    openSettingsSection(settingsSeat.current, label, () => { selectSection(t('about.nav')) })
  }
  const openSettings = (): void => { settingsSeat.current?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')?.click() }
  const closeSearch = (): void => { setSearchOpen(false); setSearchQuery(''); setActiveSearchIndex(0) }
  const searchEntries = useMemo<SearchEntry[]>(() => {
    const archived = new Set(workspaces.archivedSessionIds)
    const workspaceTitles = new Map(workspaces.items.flatMap(workspace => workspace.sessionIds.map(sessionId => [String(sessionId), workspace.title])))
    const sessionEntries = sessions.ids
      .map(id => sessions.byId[id])
      .filter((session): session is NonNullable<typeof session> => session !== undefined && session.origin !== 'subagent' && !session.blank && !archived.has(session.id))
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map(session => ({ id: `session:${session.id}`, group: 'sessions' as const, label: session.displayTitle, keywords: `${session.cwd ?? ''} ${session.id}`, detail: workspaceTitles.get(String(session.id)) ?? session.cwd, run: () => { closeSearch(); openSession(session.id) } }))
    const settingEntries: SearchEntry[] = [
      { id: 'settings:root', group: 'settings', label: t('search.settings'), keywords: t('search.settings'), run: () => { closeSearch(); openSettings() } },
      { id: 'settings:experts', group: 'settings', label: t('sidebar.experts'), keywords: t('search.settings'), run: () => { closeSearch(); selectExternalSection(t('sidebar.experts')) } },
      { id: 'settings:skills', group: 'settings', label: t('sidebar.skills'), keywords: t('search.settings'), run: () => { closeSearch(); selectExternalSection(t('sidebar.skills')) } },
      { id: 'settings:plugins', group: 'settings', label: t('sidebar.plugins'), keywords: t('search.settings'), run: () => { closeSearch(); selectSection(t('sidebar.plugins')) } },
      { id: 'settings:connectors', group: 'settings', label: t('sidebar.connectors'), keywords: t('search.settings'), run: () => { closeSearch(); selectSection(t('sidebar.connectors')) } },
      { id: 'settings:about', group: 'settings', label: t('about.nav'), keywords: t('search.settings'), run: () => { closeSearch(); selectSection(t('about.nav')) } },
    ]
    return [...sessionEntries, ...settingEntries, { id: 'action:new', group: 'actions', label: t('sidebar.newTask'), keywords: t('search.actions'), run: () => { closeSearch(); startSession() } }]
  }, [openSession, sessions, startSession, t, workspaces])
  const searchResults = useMemo(() => filterSidebarSearchItems(searchEntries, searchQuery).slice(0, 12), [searchEntries, searchQuery])
  useEffect(() => { setActiveSearchIndex(0) }, [searchQuery, searchOpen])
  useEffect(() => {
    if (!searchOpen) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); closeSearch(); return }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveSearchIndex(index => Math.min(index + 1, Math.max(0, searchResults.length - 1))); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActiveSearchIndex(index => Math.max(index - 1, 0)); return }
      if (event.key === 'Enter') { const entry = searchResults[activeSearchIndex]; if (entry !== undefined) { event.preventDefault(); entry.run() } }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [activeSearchIndex, searchOpen, searchResults])
  if (collapsed) return <aside className="dcu-root dcu-compact" aria-label={t('sidebar.label')}><style>{stylesheet}</style><button type="button" className="dcu-icon" aria-label={t('sidebar.expand')} onClick={toggleSidebar}><FishLogo size={24} /></button><footer className="dcu-foot"><div className="dcu-footer-actions">{renderSlot('sidebar.footer.action', { wide: false })}</div><div ref={settingsSeat} className="dcu-settings-seat">{renderSlot('sidebar.settings', { wide: false })}</div></footer></aside>

  return <aside className="dcu-root" aria-label={t('sidebar.label')}>
    <style>{stylesheet}</style>
    <header className="dcu-head"><button type="button" className="dcu-brand" aria-label={t('sidebar.newTask')} onClick={() => { startSession() }}><BrandWordmark size={24} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.search')} onClick={() => { setSearchOpen(true) }}><IconSearchOutline16 size={20} /></button></header>
    <nav className="dcu-menu" aria-label={t('sidebar.mainMenu')}>
      <button type="button" onClick={() => { startSession() }}><MenuIcon><IconNewChatOutline16 size={16} /></MenuIcon>{t('sidebar.newTask')}</button>
      <button type="button" aria-expanded={extensionsOpen} onClick={() => { setExtensionsOpen(open => !open) }}><MenuIcon><IconEnhanceOutline16 size={16} /></MenuIcon>{t('sidebar.extensions')}</button>
      {extensionsOpen && <div className="dcu-extension-items"><button type="button" onClick={() => { selectExternalSection(t('sidebar.experts')) }}><MenuIcon><IconUserOutline16 size={16} /></MenuIcon>{t('sidebar.experts')}</button><button type="button" onClick={() => { selectExternalSection(t('sidebar.skills')) }}><MenuIcon><IconSkillOutline16 size={16} /></MenuIcon>{t('sidebar.skills')}</button><button type="button" onClick={() => { selectSection(t('sidebar.plugins')) }}><MenuIcon><IconPersonalizationOutline16 size={16} /></MenuIcon>{t('sidebar.plugins')}</button><button type="button" onClick={() => { selectSection(t('sidebar.connectors')) }}><MenuIcon><IconLinkOutline16 size={16} /></MenuIcon>{t('sidebar.connectors')}</button></div>}
      <button type="button" disabled title={t('sidebar.scheduleUnavailable')}><MenuIcon><IconGoalOutline16 size={16} /></MenuIcon>{t('sidebar.schedule')}</button>
      <button type="button" onClick={() => { selectSection(t('sidebar.agentPresets')) }}><MenuIcon><IconAgentPresetOutline16 size={16} /></MenuIcon>{t('sidebar.assistant')}</button>
    </nav>
    <div className="dcu-workspaces"><div className="dcu-native-workspaces">{renderSlot('sidebar.workspaces', { wide: true, expandSidebar: toggleSidebar })}</div></div>
    <footer className="dcu-foot"><div className="dcu-footer-actions">{renderSlot('sidebar.footer.action', { wide: true })}</div><div ref={settingsSeat} className="dcu-settings-seat">{renderSlot('sidebar.settings', { wide: true })}</div></footer>
    {searchOpen && <div className="dcu-search-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSearch() }}><section className="dcu-search-dialog" role="dialog" aria-modal="true" aria-label={t('sidebar.search')}><div className="dcu-search-input"><Input autoFocus icon={<IconSearchOutline16 size={16} />} value={searchQuery} placeholder={t('search.placeholder')} onChange={event => { setSearchQuery(event.target.value) }} /></div>{searchResults.length === 0 ? <div className="dcu-search-empty">{t('search.empty')}</div> : (['sessions', 'settings', 'actions'] as const).map(group => { const entries = searchResults.filter(entry => entry.group === group); if (entries.length === 0) return null; return <section className="dcu-search-section" key={group}><div className="dcu-search-title">{t(`search.${group}`)}</div>{entries.map(entry => { const index = searchResults.indexOf(entry); return <button type="button" className="dcu-search-row" data-active={index === activeSearchIndex} key={entry.id} onMouseEnter={() => { setActiveSearchIndex(index) }} onClick={entry.run}><span className="dcu-search-main">{entry.label}</span>{entry.detail !== undefined && <span className="dcu-search-detail">{entry.detail}</span>}</button> })}</section> })}</section></div>}
  </aside>
}
