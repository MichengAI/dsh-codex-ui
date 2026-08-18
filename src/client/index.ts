import type { ClientContext, SessionId, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { CodexSidebar } from './CodexSidebar.tsx'
import { AboutSection } from './AboutSection.tsx'
import { CodexWorkspaceBrowser } from './CodexWorkspaceBrowser.tsx'
import { ConnectorsSection } from './ConnectorsSection.tsx'
import { en, NS, zh } from './locales.ts'
import { createCompanionTabSource } from './companion-slots.ts'
import { observePermissionMenus } from './permission-i18n.ts'
import { observeSettingsNavIcons } from './settings-nav-icons.ts'
import { observeSlimSidebar } from './sidebar-width.ts'
import { TurnNavigator } from './TurnNavigator.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'sidebar.schedule': {
      kind: 'single'
      scope: 'root'
      owner: {
        wide: boolean
        expandSidebar: () => void
        openSession: (sessionId: SessionId) => void
        renameSession: (sessionId: SessionId, title: string) => Promise<void>
        archiveSession: (sessionId: SessionId) => Promise<void>
        deleteSession: (sessionId: SessionId) => Promise<void>
        forkSession: (sessionId: SessionId) => Promise<void>
        openPath: (path: string) => Promise<void> | void
        skin?: 'codex' | 'native'
        useSessions: unknown
        useWorkspaces: unknown
      }
    }
    'sidebar.channels': {
      kind: 'single'
      scope: 'root'
      owner: {
        wide: boolean
        expandSidebar: () => void
        openSession: (sessionId: SessionId) => void
        renameSession: (sessionId: SessionId, title: string) => Promise<void>
        archiveSession: (sessionId: SessionId) => Promise<void>
        deleteSession: (sessionId: SessionId) => Promise<void>
        forkSession: (sessionId: SessionId) => Promise<void>
        openPath: (path: string) => Promise<void> | void
        skin?: 'codex' | 'native'
        useSessions: unknown
        useWorkspaces: unknown
      }
    }
  }
}

export const inject = ['slots', 'sessions', 'workspaces', 'layout', 'locale']

type ArchiveRegistry = {
  deleteSession: (sessionId: SessionId) => Promise<{ ok: boolean; error?: { message: string } }>
}

function hasDeleteSession(value: unknown): value is ArchiveRegistry {
  return value !== null && typeof value === 'object' && 'deleteSession' in value && typeof value.deleteSession === 'function'
}

/** 替换 DSH 的官方 sidebar 插槽，不修改 DSH 源码或会话数据。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'michengai-codex-ui: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.effect(() => observePermissionMenus((key) => t(key as keyof typeof zh)), 'michengai-codex-ui: permission i18n')
  ctx.effect(() => observeSlimSidebar(), 'michengai-codex-ui: slim sidebar')
  ctx.effect(() => observeSettingsNavIcons(), 'michengai-codex-ui: settings nav icons')
  const companionSlots = createCompanionTabSource(ctx.slots)
  ctx.slots.inject('sidebar', () => ctx.slots.register({
    name: 'sidebar',
    registrant: 'michengai-codex-ui',
    locale: NS,
    children: {
      'sidebar.workspaces': { kind: 'single', scope: 'root' },
      'sidebar.settings': { kind: 'single', scope: 'root' },
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
      'sidebar.channels': { kind: 'single', scope: 'root' },
      'sidebar.schedule': { kind: 'single', scope: 'root' },
    },
    inject: () => ({
      openSession: (sessionId: SessionId) => { ctx.sessions.open(sessionId) },
      startSession: (workspaceId?: WorkspaceId) => { ctx.workspaces.startSession(workspaceId) },
      toggleSidebar: () => { ctx.layout.toggleSidebar() },
      archiveSession: (sessionId: SessionId) => ctx.workspaces.archiveSession(sessionId),
      deleteSession,
      forkSession,
      renameSession,
      openPath: (path: string) => ctx.workspaces.openPath(path),
      companionSlots,
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
  const deleteSession = async (sessionId: SessionId): Promise<void> => {
    const registry = ctx.get('remote.workspaceRegistry')
    if (!hasDeleteSession(registry)) throw new Error(t('sessions.deleteUnavailable'))
    const result = await registry.deleteSession(sessionId)
    if (!result.ok) throw new Error(result.error?.message ?? t('sessions.deleteUnavailable'))
  }
  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
    name: 'sidebar.workspaces', priority: -1, locale: NS,
    inject: () => ({
      archiveSession: (sessionId: SessionId) => ctx.workspaces.archiveSession(sessionId),
      deleteSession,
      deleteWorkspace: (workspaceId: WorkspaceId) => ctx.workspaces.delete(workspaceId),
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
    ...({ icon: 'connector' } as Record<string, unknown>),
    inject: () => ({ sessionStore: ctx.sessions.list, t }),
  }, ConnectorsSection))
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'about', order: 100, label: () => t('about.nav'), locale: NS,
  }, AboutSection))
}



