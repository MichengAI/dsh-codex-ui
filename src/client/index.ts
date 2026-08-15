import type { ClientContext, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { ArchivedSessionsSection } from './ArchivedSessionsSection.tsx'
import { CodexSidebar, type CodexSidebarProps } from './CodexSidebar.tsx'
import { ConnectorsSection } from './ConnectorsSection.tsx'
import { en, NS, zh } from './locales.ts'
import { SkillsSettingsSection } from './SettingsSkillsSection.tsx'
import { TurnNavigator } from './TurnNavigator.tsx'

export const inject = ['slots', 'sessions', 'workspaces', 'layout', 'locale']

/** 替换 DSH 的官方 sidebar 插槽，不修改 DSH 源码或会话数据。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'michengai-codex-ui: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('sidebar', () => ctx.slots.register({
    name: 'sidebar',
    locale: NS,
    children: {
      'sidebar.workspaces': { kind: 'single', scope: 'root' },
      'sidebar.settings': { kind: 'single', scope: 'root' },
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
    },
    inject: () => ({
      startSession: (workspaceId?: WorkspaceId) => { ctx.workspaces.startSession(workspaceId) },
      toggleSidebar: () => { ctx.layout.toggleSidebar() },
    }),
  }, CodexSidebar))

  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities', id: 'turn-navigator', order: 100, locale: NS,
  }, TurnNavigator))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'skills', order: 16, label: () => t('sidebar.skills'),
    inject: () => ({ sessionStore: ctx.sessions.list, t }),
  }, SkillsSettingsSection))
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'archived-sessions', order: 17, label: () => t('archives.title'),
    inject: () => ({ sessionStore: ctx.sessions.list, workspaceStore: ctx.workspaces.list, t }),
  }, ArchivedSessionsSection))
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'connectors', order: 18, label: () => t('sidebar.connectors'),
    inject: () => ({ sessionStore: ctx.sessions.list, t }),
  }, ConnectorsSection))
}
