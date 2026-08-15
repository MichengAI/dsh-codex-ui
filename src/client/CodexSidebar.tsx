import { useRef, useState, type ReactNode } from 'react'
import {
  BrandWordmark, FishLogo, IconAgentPresetOutline16, IconEnhanceOutline16,
  IconGoalOutline16, IconLinkOutline16, IconNewChatOutline16, IconSearchOutline16, IconSkillOutline16,
  IconUserOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { PinnedWorkspaces } from './PinnedWorkspaces.tsx'
import { openSettingsSection } from './settings-navigation.ts'

type CodexSidebarInjected = {
  startSession: (workspaceId?: WorkspaceId) => void
  toggleSidebar: () => void
}

export type CodexSidebarProps =
  PropsRuntime<'sidebar'>
  & PropsRenderSlots<'sidebar.workspaces' | 'sidebar.settings' | 'sidebar.footer.action'>
  & PropsLocale<typeof NS>
  & CodexSidebarInjected

const stylesheet = `
.dcu-root{height:100%;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill);color:var(--dsw-alias-label-primary);font:14px/20px var(--dsw-font-family)}
.dcu-root *{box-sizing:border-box}.dcu-head{height:58px;padding:14px 12px 10px;display:flex;align-items:center;gap:8px}.dcu-brand{border:0;background:transparent;color:inherit;padding:0;display:flex;align-items:center;min-width:0;flex:1}.dcu-brand svg{max-width:100%;height:20px}
.dcu-icon,.dcu-menu button,.dcu-footer-link{appearance:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}.dcu-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;color:var(--dsw-alias-label-primary)}
.dcu-icon:hover,.dcu-menu button:hover,.dcu-footer-link:hover{background:var(--dsw-specific-sidebar-nav-item-hover);color:var(--dsw-alias-label-primary)}
.dcu-menu{padding:0 10px 8px;display:grid;gap:2px}.dcu-menu button,.dcu-footer-link{display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:10px;align-items:center;width:100%;min-height:36px;padding:0 6px;border-radius:8px;text-align:left;font-weight:550}
.dcu-menu-icon{display:grid;place-items:center start;width:20px;height:20px}.dcu-menu-icon svg,.dcu-footer-link svg{display:block;width:16px;height:16px;color:var(--dsw-alias-label-primary)}.dcu-menu button:disabled{color:var(--dsw-alias-label-secondary);cursor:default;opacity:1}.dcu-menu button:disabled svg{color:var(--dsw-alias-label-secondary)}
.dcu-extension-items{display:grid;gap:1px;margin:1px 0 4px 24px;padding-left:8px;border-left:1px solid var(--dsw-alias-border-l2)}.dcu-extension-items button{font-size:13px}
.dcu-workspaces{display:flex;min-height:0;flex:1;flex-direction:column}.dcu-native-workspaces{display:flex;min-height:0;flex:1}.dcu-native-workspaces>*{min-width:0;flex:1}.dcu-foot{display:grid;gap:4px;padding:8px 10px 12px;border-top:1px solid var(--dsw-alias-border-l1)}.dcu-footer-actions:empty,.dcu-settings-seat:empty{display:none}.dcu-compact{align-items:center;padding:12px 0}.dcu-compact .dcu-icon{width:40px;height:40px}.dcu-compact .dcu-workspaces{width:100%;flex:1}.dcu-compact .dcu-foot{margin-top:auto;padding:8px 0;border-top:0}.dcu-compact .dcu-footer-link{display:flex;justify-content:center;width:40px;padding:0;font-size:0}.dcu-compact .dcu-footer-link svg{width:18px;height:18px}
[data-conversation-scroll]{--dsh-chat-content-width:800px;--dsh-composer-card-max-width:calc(var(--dsh-chat-content-width) + 32px);--dsh-composer-side-clearance:24px}[data-conversation-scroll] [data-chat-flow]{gap:20px}[data-conversation-scroll] [data-composer-card]{min-height:142px;padding-top:14px;border-radius:20px;box-shadow:var(--dsw-shadow-lv3);transition:border-color 180ms ease,box-shadow 180ms ease}[data-conversation-scroll] [data-composer-card]:focus-within{border-color:var(--dsw-alias-button-info-fill);box-shadow:0 0 0 2px var(--dsw-static-deepseek-50),var(--dsw-shadow-lv3)}[data-conversation-scroll] [data-input-mirror]{min-height:78px}@media (prefers-reduced-motion:reduce){[data-conversation-scroll] [data-composer-card]{transition:none}}
`

function MenuIcon({ children }: { children: ReactNode }) { return <span className="dcu-menu-icon">{children}</span> }

/** Codex 风格的 DSH 侧栏，只替换导航外观，项目浏览和设置仍由 DSH 官方组件提供。 */
export function CodexSidebar({ collapsed, startSession, toggleSidebar, useWorkspaces, renderSlot, t }: CodexSidebarProps) {
  const settingsSeat = useRef<HTMLDivElement>(null)
  const [extensionsOpen, setExtensionsOpen] = useState(true)
  const selectSection = (label: string): void => { openSettingsSection(settingsSeat.current, label) }
  if (collapsed) return <aside className="dcu-root dcu-compact" aria-label={t('sidebar.label')}><style>{stylesheet}</style><button type="button" className="dcu-icon" aria-label={t('sidebar.expand')} onClick={toggleSidebar}><FishLogo size={24} /></button><footer className="dcu-foot"><div className="dcu-footer-actions">{renderSlot('sidebar.footer.action', { wide: false })}</div><div ref={settingsSeat} className="dcu-settings-seat">{renderSlot('sidebar.settings', { wide: false })}</div></footer></aside>

  return <aside className="dcu-root" aria-label={t('sidebar.label')}>
    <style>{stylesheet}</style>
    <header className="dcu-head"><button type="button" className="dcu-brand" aria-label={t('sidebar.newTask')} onClick={() => { startSession() }}><BrandWordmark size={20} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.search')}><IconSearchOutline16 size={19} /></button></header>
    <nav className="dcu-menu" aria-label={t('sidebar.mainMenu')}>
      <button type="button" onClick={() => { startSession() }}><MenuIcon><IconNewChatOutline16 size={16} /></MenuIcon>{t('sidebar.newTask')}</button>
      <button type="button" aria-expanded={extensionsOpen} onClick={() => { setExtensionsOpen(open => !open) }}><MenuIcon><IconEnhanceOutline16 size={16} /></MenuIcon>{t('sidebar.extensions')}</button>
      {extensionsOpen && <div className="dcu-extension-items"><button type="button" disabled title={t('sidebar.expertKitUnavailable')}><MenuIcon><IconAgentPresetOutline16 size={16} /></MenuIcon>{t('sidebar.expertKit')}</button><button type="button" onClick={() => { selectSection(t('sidebar.skills')) }}><MenuIcon><IconSkillOutline16 size={16} /></MenuIcon>{t('sidebar.skills')}</button><button type="button" onClick={() => { selectSection(t('sidebar.plugins')) }}><MenuIcon><IconEnhanceOutline16 size={16} /></MenuIcon>{t('sidebar.plugins')}</button><button type="button" onClick={() => { selectSection(t('sidebar.connectors')) }}><MenuIcon><IconLinkOutline16 size={16} /></MenuIcon>{t('sidebar.connectors')}</button></div>}
      <button type="button" disabled title={t('sidebar.scheduleUnavailable')}><MenuIcon><IconGoalOutline16 size={16} /></MenuIcon>{t('sidebar.schedule')}</button>
      <button type="button" onClick={() => { selectSection(t('sidebar.agentPresets')) }}><MenuIcon><IconUserOutline16 size={16} /></MenuIcon>{t('sidebar.assistant')}</button>
    </nav>
    <div className="dcu-workspaces"><PinnedWorkspaces t={t} useWorkspaces={useWorkspaces} /><div className="dcu-native-workspaces">{renderSlot('sidebar.workspaces', { wide: true, expandSidebar: toggleSidebar })}</div></div>
    <footer className="dcu-foot"><div className="dcu-footer-actions">{renderSlot('sidebar.footer.action', { wide: true })}</div><div ref={settingsSeat} className="dcu-settings-seat">{renderSlot('sidebar.settings', { wide: true })}</div></footer>
  </aside>
}
