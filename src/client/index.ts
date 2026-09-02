import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { CodexSidebar } from './CodexSidebar.tsx'
import { AboutSection } from './AboutSection.tsx'
import { CodexWorkspaceBrowser } from './CodexWorkspaceBrowser.tsx'
import { ConnectorsSection } from './ConnectorsSection.tsx'
import { en, NS, zh } from './locales.ts'
import { createCompanionTabSource } from './companion-slots.ts'
import { openPathInHost, type HostOpenPathConnection } from './host-open-path.ts'
import { observeSettingsNavIcons } from './settings-nav-icons.ts'
import { observePermissionLabels } from './permission-labels.ts'
import { observeSlimSidebar } from './sidebar-width.ts'
import { observeConversationHeader } from './conversation-header.ts'
import { observeOfficialTurnNavigators } from './official-turn-navigator.ts'
import { TurnNavigator } from './TurnNavigator.tsx'
import { hasConnectWorkspace, hasStartSession, recentWorkspaceId, workspaceBaselinesReady } from './workspace-compat.ts'
import { UserFacingError } from './user-error.ts'

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
        view?: 'runs' | 'overview'
        showViewSwitch?: boolean
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

export const inject = ['slots', 'sessions', 'workspaces', 'layout', 'locale', 'connection', 'conversation']

type ArchiveRegistry = {
  deleteSession: (sessionId: SessionId) => Promise<{ ok: boolean; error?: { message: string } }>
}

function hasDeleteSession(value: unknown): value is ArchiveRegistry {
  return value !== null && typeof value === 'object' && 'deleteSession' in value && typeof value.deleteSession === 'function'
}

/** Archive Manager replaces the official ui-workspace row with this optional service. */
export function startWorkspaceSession(ctx: ClientContext, workspaceId?: WorkspaceId): void {
  const uiWorkspace = (ctx.get as (name: string) => unknown)('uiWorkspace')
  if (hasStartSession(uiWorkspace)) {
    uiWorkspace.startSession(workspaceId)
    return
  }
  if (hasStartSession(ctx.workspaces)) {
    ctx.workspaces.startSession(workspaceId)
    return
  }
  console.warn('DSH 工作空间服务尚未就绪，无法新建会话。')
}

/** 替换 DSH 的官方 sidebar 插槽，不修改 DSH 源码或会话数据。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'michengai-codex-ui: dictionaries')
  const t = ctx.locale.bind(NS)
  const connection = ctx.get('connection') as HostOpenPathConnection
  const openPath = (path: string): Promise<void> => openPathInHost(connection, path)
  ctx.effect(() => observeSlimSidebar(), 'michengai-codex-ui: slim sidebar')
  ctx.effect(() => observeSettingsNavIcons(), 'michengai-codex-ui: settings nav icons')
  ctx.effect(() => observePermissionLabels(ctx.locale), 'michengai-codex-ui: permission labels')
  ctx.effect(() => observeConversationHeader(), 'michengai-codex-ui: conversation header')
  ctx.effect(() => observeOfficialTurnNavigators(), 'michengai-codex-ui: official turn navigator')
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
      startSession: (workspaceId?: WorkspaceId) => { startWorkspaceSession(ctx, workspaceId) },
      toggleSidebar: () => { ctx.layout.toggleSidebar() },
      archiveSession: (sessionId: SessionId) => ctx.workspaces.archiveSession(sessionId),
      deleteSession,
      forkSession,
      renameSession,
      openPath,
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
    if (session === undefined) throw new UserFacingError(t('sessions.unknown'))
    const result = await session.rename(title)
    if (!result.ok) throw new Error(result.error.message)
  }
  const deleteSession = async (sessionId: SessionId): Promise<void> => {
    const registry = ctx.get('remote.workspaceRegistry')
    if (!hasDeleteSession(registry)) throw new UserFacingError(t('sessions.deleteUnavailable'))
    const result = await registry.deleteSession(sessionId)
    if (!result.ok) throw result.error?.message === undefined
      ? new UserFacingError(t('sessions.deleteUnavailable'))
      : new Error(result.error.message)
  }
  const startConnectorPromptSession = async (promptText: string): Promise<void> => {
    const prompt = promptText.trim()
    if (prompt === '') throw new UserFacingError(t('connectors.promptRequired'))
    const workspaces = ctx.workspaces.list.getSnapshot()
    const sessionSnapshot = ctx.sessions.list.getSnapshot()
    const currentSessionId = sessionSnapshot.current
    const currentWorkspaceId = currentSessionId === undefined
      ? undefined
      : workspaces.items.find(workspace => workspace.sessionIds.includes(currentSessionId))?.workspaceId
    const baselinesReady = workspaceBaselinesReady(workspaces, sessionSnapshot)
    const targetWorkspaceId = currentWorkspaceId ?? (baselinesReady ? recentWorkspaceId(workspaces.items, sessionSnapshot.byId) : undefined)
    if (targetWorkspaceId === undefined && !baselinesReady) throw new UserFacingError(t('connectors.workspacesLoading'))
    if (targetWorkspaceId === undefined) throw new UserFacingError(t('connectors.workspaceRequired'))
    const uiWorkspace = (ctx.get as (name: string) => unknown)('uiWorkspace')
    const workspaceNavigation = hasConnectWorkspace(uiWorkspace) ? uiWorkspace : hasConnectWorkspace(ctx.workspaces) ? ctx.workspaces : undefined
    if (workspaceNavigation === undefined) throw new UserFacingError(t('connectors.workspaceUnavailable'))
    const sessionId = await workspaceNavigation.connectWorkspace(targetWorkspaceId)
    const conversation = ctx.get('conversation')
    if (conversation === undefined) throw new UserFacingError(t('connectors.conversationUnavailable'))
    const binding = ctx.sessions.binding(sessionId)
    if (binding === undefined) throw new UserFacingError(t('connectors.sessionPending'))
    conversation.input.for(binding.ctx).setDraft(prompt)
    ctx.sessions.open(sessionId)
  }
  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
    name: 'sidebar.workspaces', priority: -1, locale: NS,
    inject: () => ({
      archiveSession: (sessionId: SessionId) => ctx.workspaces.archiveSession(sessionId),
      deleteSession,
      deleteWorkspace: (workspaceId: WorkspaceId) => ctx.workspaces.delete(workspaceId),
      forkSession,
      openPath,
      openSession: (sessionId: SessionId) => { ctx.sessions.open(sessionId) },
      renameSession,
      renameWorkspace: (workspaceId: WorkspaceId, title: string) => ctx.workspaces.rename(workspaceId, title),
      insertWorkspaceBefore: (workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId) => ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId),
      insertSessionBefore: (workspaceId: WorkspaceId, sessionId: SessionId, beforeSessionId?: SessionId) => ctx.workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId),
      startSession: (workspaceId?: WorkspaceId) => { startWorkspaceSession(ctx, workspaceId) },
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
    inject: () => ({ sessionStore: ctx.sessions.list, startPromptSession: startConnectorPromptSession, t }),
  }, ConnectorsSection))
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'about', order: Number.MAX_SAFE_INTEGER, label: () => t('about.nav'), locale: NS,
  }, AboutSection))
}
