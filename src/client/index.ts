import { deepLinkAction, openConversation, selectGlobalPanel } from './session-navigation.ts'
import { createWorkspaceShortcutSource } from './workspace-shortcuts.ts'
import { registerWorkspaceDirectoryFlow, WORKSPACE_DIRECTORY_FLOW } from './workspace-directory-flow.ts'
import { registerAfterOfficialWave } from './official-slot-shadow.ts'
import {
  archiveHostSession,
  currentSessionId,
  forkHostSession,
  isSessionArchived,
  probeService,
  renameHostSession,
  UnknownSessionError,
} from './session-host.ts'
import { createGlobalPanelSource } from './global-panels.tsx'
import { browserStorage } from './tree-expansion.ts'
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
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { CodexSidebar } from './CodexSidebar.tsx'
import { AboutSection } from './AboutSection.tsx'
import { CodexWorkspaceBrowser } from './CodexWorkspaceBrowser.tsx'
import { en, NS, zh } from './locales.ts'
import { createFooterActionSource, type FooterAction, type FooterActionSource } from './footer-actions.ts'
import { mirrorSlot, withSlotAliases } from './slot-mirror.tsx'
import { observeSettingsSkin } from './settings-skin/index.ts'
import { observeSlimSidebar } from './sidebar-width.ts'
import { observeConversationHeader } from './conversation-header.ts'
import { observeComposerEnhancements } from './composer/index.tsx'
import { hasStartSession } from './workspace-compat.ts'
import { HostActionError, type HostAction, UserFacingError } from './user-error.ts'
import { hasArchiveSessionDelete } from './archive-session-delete.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'sidebar.codex.panellist': SlotMap['sidebar.panellist']
    'sidebar.codex.workspaces': SlotMap['sidebar.workspaces']
    'sidebar.codex.settings': SlotMap['sidebar.settings']
    'sidebar.codex.footer.action': SlotMap['sidebar.footer.action']
  }
}

export const inject = ['slots', 'sessions', 'workspaces', 'layout', 'locale', 'connection', 'inputTriggers', 'conversation']

type ArchiveRegistry = {
  deleteSession: (sessionId: SessionId) => Promise<
    { ok: true; value?: unknown }
    | { ok: false; error?: { message: string; code?: string; details?: unknown; isDSHRemoteError?: true } }
  >
}

function hasDeleteSession(value: unknown): value is ArchiveRegistry {
  return hasArchiveSessionDelete(value)
}

async function runHostAction<T>(action: HostAction, execute: () => Promise<T>): Promise<T> {
  try {
    return await execute()
  } catch (reason) {
    if (reason instanceof UserFacingError || reason instanceof HostActionError) throw reason
    throw new HostActionError(action, reason)
  }
}

/** Archive Manager replaces the official ui-workspace row with this optional service. */
export async function startWorkspaceSession(ctx: ClientContext, workspaceId?: WorkspaceId): Promise<boolean> {
  const uiWorkspace = probeService(ctx, 'uiWorkspace')
  try {
    if (hasStartSession(uiWorkspace)) {
      await Promise.resolve(uiWorkspace.startSession(workspaceId))
      return true
    }
    if (hasStartSession(ctx.workspaces)) {
      await Promise.resolve(ctx.workspaces.startSession(workspaceId))
      return true
    }
    console.warn('DSH 工作空间服务尚未就绪，无法新建会话。')
    return false
  } catch (error) {
    console.warn('新建会话失败：', error)
    return false
  }
}

/** 替换 DSH 的官方 sidebar 插槽，不修改 DSH 源码或会话数据。 */
export function apply(ctx: ClientContext): void {
  Object.assign(globalThis, { __dcuCurrentSessionId: currentSessionId })
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'michengai-codex-ui: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.effect(() => observeComposerEnhancements(ctx), 'michengai-codex-ui: composer enhancements')
  ctx.effect(() => observeSettingsSkin(), 'michengai-codex-ui: official settings skin')
  ctx.effect(() => observeSlimSidebar(), 'michengai-codex-ui: slim sidebar')
  ctx.effect(() => observeConversationHeader(), 'michengai-codex-ui: conversation header')
  const globalPanels = createGlobalPanelSource(ctx.slots, ctx.locale)
  const footerActions = createFooterActionSource(ctx.slots)
  const workspaceShortcuts = createWorkspaceShortcutSource(ctx.slots)
  ctx.effect(() => () => { workspaceShortcuts.dispose() }, 'michengai-codex-ui: workspace shortcuts')
  registerWorkspaceDirectoryFlow(ctx)
  const ownSidebarChildren = {
    [WORKSPACE_DIRECTORY_FLOW]: { kind: 'single' as const, scope: 'root' as const },
  }
  const sharedSidebarChildren = {
    'sidebar.panellist': { kind: 'list' as const, scope: 'root' as const },
    'sidebar.workspaces': { kind: 'single' as const, scope: 'root' as const },
    'sidebar.settings': { kind: 'single' as const, scope: 'root' as const },
    'sidebar.footer.action': { kind: 'list' as const, scope: 'root' as const },
  }
  const sidebarSlotAliases = {
    'sidebar.panellist': 'sidebar.codex.panellist',
    'sidebar.workspaces': 'sidebar.codex.workspaces',
    'sidebar.settings': 'sidebar.codex.settings',
    'sidebar.footer.action': 'sidebar.codex.footer.action',
  }
  const sidebarAliasChildren = {
    'sidebar.codex.panellist': { kind: 'list' as const, scope: 'root' as const },
    'sidebar.codex.workspaces': { kind: 'single' as const, scope: 'root' as const },
    'sidebar.codex.settings': { kind: 'single' as const, scope: 'root' as const },
    'sidebar.codex.footer.action': { kind: 'list' as const, scope: 'root' as const },
  }
  const aliasedSidebar = withSlotAliases(CodexSidebar, sidebarSlotAliases)
  const officialSidebarReady = (): boolean => ctx.slots.spec?.('sidebar.workspaces') !== undefined
  ctx.slots.inject('sidebar', () => registerAfterOfficialWave(ctx.slots, 'sidebar', officialSidebarReady, (timedOut = false) => {
    const declared = (name: string): boolean => {
      const spec = ctx.slots.spec as ((this: unknown, key: string) => unknown) | undefined
      return typeof spec === 'function' && spec.call(ctx.slots, name) !== undefined
    }
    // 0.2 官方侧栏已经声明 panellist。重复声明会让本插件激活失败。
    const allSidebarChildren = { ...sharedSidebarChildren, ...ownSidebarChildren, ...sidebarAliasChildren }
    const children: Partial<typeof allSidebarChildren> = {}
    const candidates = timedOut ? { ...ownSidebarChildren, ...sidebarAliasChildren } : allSidebarChildren
    for (const [name, spec] of Object.entries(candidates)) {
      if (!declared(name)) Object.assign(children, { [name]: spec })
    }
    const register = (next: Partial<typeof allSidebarChildren>): () => void => {
      try {
        const unregister = ctx.slots.register({
          name: 'sidebar', priority: -1, registrant: 'michengai-codex-ui', locale: NS,
          children: next,
          inject: () => ({
            workspaceShortcuts,
            openSession: (sessionId: SessionId) => openConversation(ctx, ctx.layout, sessionId),
            startSession: (workspaceId?: WorkspaceId) => { startWorkspaceSession(ctx, workspaceId) },
            toggleSidebar: () => { ctx.layout.toggleSidebar() },
            archiveSession,
            canDeleteSession: () => hasArchiveSessionDelete(ctx.get('remote.workspaceRegistry')),
            deleteSession,
            forkSession,
            renameSession,
            globalPanels,
            footerActions,
            selectPanel: (id: string | null) => { selectGlobalPanel(ctx.layout, id) },
          }),
        }, aliasedSidebar as typeof CodexSidebar)
        const mirrors: (() => void)[] = []
        try {
          for (const [source, target] of Object.entries(sidebarSlotAliases)) {
            // 官方声明可晚于超时兜底；随声明挂载镜像，避免晚到的贡献永久缺席。
            if (typeof ctx.slots.spec === 'function') mirrors.push(ctx.slots.inject(source as keyof typeof sidebarSlotAliases, () => mirrorSlot({ slots: ctx.slots }, source, target)))
          }
        } catch (error) {
          for (const dispose of mirrors.reverse()) dispose()
          unregister()
          throw error
        }
        return () => { for (const dispose of mirrors.reverse()) dispose(); unregister() }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const conflict = /slot "([^"]+)" is already declared/.exec(message)
        const conflictKey = conflict === null ? undefined : Object.keys(next).find(key => key === conflict[1]) as keyof typeof allSidebarChildren | undefined
        if (conflictKey === undefined || next[conflictKey] === undefined) throw error
        const rest = { ...next }
        delete rest[conflictKey]
        return register(rest)
      }
    }
    return register(children)
  }, true))

  const forkSession = async (sessionId: SessionId): Promise<void> => {
    await runHostAction('fork', () => forkHostSession(ctx, sessionId))
  }
  const renameSession = async (sessionId: SessionId, title: string): Promise<void> => {
    await runHostAction('rename', async () => {
      try {
        await renameHostSession(ctx, sessionId, title)
      } catch (reason) {
        if (reason instanceof UnknownSessionError) throw new UserFacingError(t('sessions.unknown'))
        throw reason
      }
    })
  }
  const deleteSession = async (sessionId: SessionId): Promise<void> => {
    const registry = ctx.get('remote.workspaceRegistry')
    if (!hasDeleteSession(registry)) throw new UserFacingError(t('sessions.deleteUnavailable'))
    await runHostAction('delete', async () => {
      const result = await registry.deleteSession(sessionId)
      if (!result.ok) throw result.error === undefined
        ? new UserFacingError(t('sessions.deleteUnavailable'))
        : result.error
    })
  }
  const archiveSession = (sessionId: SessionId): Promise<void> => runHostAction('archive', () => archiveHostSession(ctx, sessionId))
  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
    name: 'sidebar.workspaces', priority: -1, locale: NS,
    inject: () => ({
      archiveSession,
      canDeleteSession: () => hasArchiveSessionDelete(ctx.get('remote.workspaceRegistry')),
      deleteSession,
      deleteWorkspace: (workspaceId: WorkspaceId) => ctx.workspaces.delete(workspaceId),
      forkSession,
      openSession: (sessionId: SessionId) => openConversation(ctx, ctx.layout, sessionId),
      renameSession,
      renameWorkspace: (workspaceId: WorkspaceId, title: string) => ctx.workspaces.rename(workspaceId, title),
      insertWorkspaceBefore: (workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId) => ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId),
      insertSessionBefore: (workspaceId: WorkspaceId, sessionId: SessionId, beforeSessionId?: SessionId) => ctx.workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId),
      startSession: (workspaceId?: WorkspaceId) => { startWorkspaceSession(ctx, workspaceId) },
      workspaceShortcuts,
    }),
  }, CodexWorkspaceBrowser))

  ctx.effect(() => {
    if (typeof window === 'undefined') return () => {}
    const sessionId = new URL(window.location.href).searchParams.get('session') as SessionId | null
    if (sessionId === null || sessionId === '') return () => {}
    const cleanSessionDeepLink = (): void => {
      try {
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.delete('session')
        window.history.replaceState(null, '', currentUrl.pathname + currentUrl.search + currentUrl.hash)
      } catch {}
    }
    let opened = false
    const openDeepLink = (): void => {
      if (opened) return
      const decision = deepLinkAction(ctx.sessions.list.getSnapshot().byId, isSessionArchived(ctx, sessionId), sessionId)
      if (decision === 'wait') return
      opened = true
      // 归档判断必须早于 byId：已释放的归档会话不在 byId 里，
      // 提前 return 会让深链永远清不掉，桌面壳会反复重载同一地址。
      if (decision === 'clean') {
        cleanSessionDeepLink()
        return
      }
      if (!openConversation(ctx, ctx.layout, sessionId)) cleanSessionDeepLink()
    }
    openDeepLink()
    return ctx.sessions.list.subscribe(openDeepLink)
  }, 'michengai-codex-ui: session deep link')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'codex-ui', order: Number.MAX_SAFE_INTEGER, label: () => t('about.nav'), locale: NS,
  }, AboutSection))
}
