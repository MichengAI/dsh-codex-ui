import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-session'
import { AboutSection } from './AboutSection.tsx'
import { en, NS, zh } from './locales.ts'
import { observeSettingsSkin } from './settings-skin/index.ts'
import { observeSettingsNavIcon } from './settings-nav-icon.ts'
import { observeComposerEnhancements } from './composer/index.tsx'
import { observeSidebarNav, checkSidebarEnabled } from './sidebar/index.ts'
import { observeWorkspaceSections } from './sidebar/sections/index.ts'
import { observeTheme } from './theme/index.ts'

export const inject = ['slots', 'locale', 'sessions', 'conversation', 'inputTriggers', 'layout', 'uiWorkspace']

/** 浏览器客户端插件入口；保留官方原生侧边栏与工作区树，提供输入框增强、设置美化与生态关于页。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'michengai-codex-ui: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.effect(() => observeTheme(ctx), 'michengai-codex-ui: theme & appearance')
  ctx.effect(() => observeSidebarNav(ctx), 'michengai-codex-ui: sidebar navigation')
  // 工作区分区随侧栏子插件一起启停：探活失败（子插件被停用或 Host 路由缺失）时不注入任何标题。
  ctx.effect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    void checkSidebarEnabled().then(enabled => {
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
  ctx.effect(() => observeComposerEnhancements(ctx), 'michengai-codex-ui: composer enhancements')
  ctx.effect(() => observeSettingsSkin(), 'michengai-codex-ui: official settings skin')
  ctx.effect(() => observeSettingsNavIcon(() => t('about.nav')), 'michengai-codex-ui: settings nav icon')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'codex-ui',
    order: Number.MAX_SAFE_INTEGER,
    label: () => t('about.nav'),
    locale: NS,
  }, AboutSection))
}
