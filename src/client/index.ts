import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-session'
import { AboutSection } from './AboutSection.tsx'
import { de, en, es, fr, ja, NS, pt, ru, zh } from './locales.ts'
import { observeSettingsSkin } from './settings-skin/index.ts'
import { CodexUiNavIcon, observeSettingsNavIcon } from './settings-nav-icon.ts'
import { observeComposerEnhancements } from './composer/index.tsx'
import { observeSidebarNav, checkSidebarEnabled } from './sidebar/index.ts'
import { observeWorkspaceSections } from './sidebar/sections/index.ts'
import { observeSessionUnread } from './sidebar/session-unread/index.tsx'
import { observeTheme } from './theme/index.ts'
import { observeDesktopTitlebarMenus, checkDesktopMenuEnabled } from './desktop-menu/index.ts'

export const inject = ['slots', 'locale', 'sessions', 'conversation', 'inputTriggers', 'layout', 'uiWorkspace', 'workspaces']

let clientContext: ClientContext | undefined
export function getClientContext(): ClientContext | undefined {
  return clientContext
}

/** 浏览器客户端插件入口；保留官方原生侧边栏与工作区树，提供输入框增强、设置美化与生态关于页。 */
export function apply(ctx: ClientContext): void {
  clientContext = ctx
  ctx.effect(() => ctx.locale.register(NS, { zh, en, ja, es, fr, de, ru, pt }), 'michengai-codex-ui: dictionaries')
  const t = ctx.locale.bind(NS)
  // 侧栏增强共用一次探活：分区标题与会话未读都随 sidebar 子插件启停，但不需要各发一次请求。
  const sidebarReady = checkSidebarEnabled()

  ctx.effect(() => observeTheme(ctx), 'michengai-codex-ui: theme & appearance')
  ctx.effect(() => observeSidebarNav(ctx), 'michengai-codex-ui: sidebar navigation')
  ctx.effect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    void checkDesktopMenuEnabled().then(enabled => {
      if (cancelled || !enabled) return
      const translate = (key: string, fallback?: string): string => {
        try {
          const value = (t as unknown as (name: string) => string)(key)
          return typeof value === 'string' && value !== '' && value !== key ? value : (fallback ?? key)
        } catch {
          return fallback ?? key
        }
      }
      stop = observeDesktopTitlebarMenus(translate)
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, 'michengai-codex-ui: desktop titlebar menus')
  // 工作区分区随侧栏子插件一起启停：探活失败（子插件被停用或 Host 路由缺失）时不注入任何标题。
  ctx.effect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    void sidebarReady.then(enabled => {
      if (cancelled || !enabled) return
      const translate = (key: string, fallback?: string): string => {
        try {
          const value = (t as unknown as (name: string) => string)(key)
          return typeof value === 'string' && value !== '' && value !== key ? value : (fallback ?? key)
        } catch {
          return fallback ?? key
        }
      }
      stop = observeWorkspaceSections(ctx, translate)
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, 'michengai-codex-ui: workspace sections')
  // 会话「标记为未读」也是侧栏增强：子插件停用或端点不可达时，既不注册菜单项也不接管右键。
  ctx.effect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    void sidebarReady.then(enabled => {
      if (cancelled || !enabled) return
      stop = observeSessionUnread(ctx)
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, 'michengai-codex-ui: session unread')
  ctx.effect(() => observeComposerEnhancements(ctx), 'michengai-codex-ui: composer enhancements')
  ctx.effect(() => observeSettingsSkin(), 'michengai-codex-ui: official settings skin')
  ctx.effect(() => observeSettingsNavIcon(() => t('about.nav')), 'michengai-codex-ui: settings nav icon')

  // 老宿主没有 settings.section.icon 插槽：inject 会等声明，未声明时回调不执行、也不抛错（安全降级）
  ;(ctx.slots.inject as any)('settings.section.icon', () => (ctx.slots.register as any)({
    name: 'settings.section.icon',
    id: 'codex-ui',
    locale: NS,
  }, CodexUiNavIcon))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'codex-ui',
    order: Number.MAX_SAFE_INTEGER,
    label: () => t('about.nav'),
    locale: NS,
  }, AboutSection))
}
