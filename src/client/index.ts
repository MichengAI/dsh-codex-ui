import type { ClientContext, SessionId, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { CodexSidebar, type CodexSidebarProps } from './CodexSidebar.tsx'
import { CodexWorkspaceBrowser } from './CodexWorkspaceBrowser.tsx'
import { ConnectorsSection } from './ConnectorsSection.tsx'
import { en, NS, zh } from './locales.ts'
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
      openSession: (sessionId: SessionId) => { ctx.sessions.open(sessionId) },
      startSession: (workspaceId?: WorkspaceId) => { ctx.workspaces.startSession(workspaceId) },
      toggleSidebar: () => { ctx.layout.toggleSidebar() },
    }),
  }, CodexSidebar))

  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities', id: 'turn-navigator', order: 100, locale: NS,
  }, TurnNavigator))

  const forkSession = async (sessionId: SessionId): Promise<void> => {
    const childId = await ctx.sessions.fork({ sessionId, increaseTitle: true })
    ctx.sessions.open(childId)
  }
  const renameSession = async (sessionId: SessionId, title: string): Promise<void> => {
    const session = ctx.sessions.binding(sessionId)?.session
    if (session === undefined) throw new Error(t('sessions.unknown'))
    const result = await session.rename(title)
    if (!result.ok) throw new Error(result.error.message)
  }
  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
    name: 'sidebar.workspaces', priority: -1, locale: NS,
    inject: () => ({
      archiveSession: (sessionId: SessionId) => ctx.workspaces.archiveSession(sessionId),
      forkSession,
      openPath: (path: string) => ctx.workspaces.openPath(path),
      openSession: (sessionId: SessionId) => { ctx.sessions.open(sessionId) },
      renameSession,
      renameWorkspace: (workspaceId: WorkspaceId, title: string) => ctx.workspaces.rename(workspaceId, title),
      insertWorkspaceBefore: (workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId) => ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId),
      insertSessionBefore: (workspaceId: WorkspaceId, sessionId: SessionId, beforeSessionId?: SessionId) => ctx.workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId),
      startSession: (workspaceId?: WorkspaceId) => { ctx.workspaces.startSession(workspaceId) },
    }),
  }, CodexWorkspaceBrowser))

  ctx.effect(() => {
    if (typeof window === 'undefined') return () => {}
    const sessionId = new URL(window.location.href).searchParams.get('session') as SessionId | null
    if (sessionId === null || sessionId === '') return () => {}
    let opened = false
    const openDeepLink = (): void => {
      if (opened || ctx.sessions.list.getSnapshot().byId[sessionId] === undefined) return
      opened = true
      ctx.sessions.open(sessionId)
    }
    openDeepLink()
    return ctx.sessions.list.subscribe(openDeepLink)
  }, 'michengai-codex-ui: session deep link')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'connectors', order: 17, label: () => t('sidebar.connectors'),
    inject: () => ({ sessionStore: ctx.sessions.list, t }),
  }, ConnectorsSection))
}
