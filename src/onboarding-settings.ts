import type { Context } from '@deepseek-ai/cordis'

/** 0.1.5 及更早的设置服务用这个命名空间保存欢迎提示版本。 */
const ONBOARDING_SETTINGS_NAMESPACE = 'ui-onboarding'

type SettingsService = {
  configure?: (options: { auto: boolean }, fiber: unknown) => (() => void) | void
  register?: (namespace: string, schema: unknown) => void
}

type SettingsContext = Context & {
  settings?: SettingsService
}

/**
 * 停用官方设置壳后，仍登记引导设置。
 * 不能 import `@deepseek-ai/dsh-client-ui-settings-general`：裸模块名会向上解析到
 * `~/.dsh/profiles/node_modules` 里的 0.1.2 残留，其 `settings.register` 在新宿主上不存在，
 * 会让整个渲染进程启动失败。
 */
export function registerOnboardingSettings(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    const bound = settingsCtx as SettingsContext
    const settings = bound.settings
    try {
      if (typeof settings?.configure === 'function') {
        return bound.effect(() => {
          const dispose = settings.configure!({ auto: false }, ctx.fiber)
          return typeof dispose === 'function' ? dispose : () => {}
        })
      }
      if (typeof settings?.register === 'function') {
        settings.register(ONBOARDING_SETTINGS_NAMESPACE, {
          welcomeNoticeVersion: { type: 'string' },
        })
        return
      }
      ctx.logger.warn('[michengai-codex-ui] 当前宿主没有设置 schema 接口，跳过引导设置注册。')
    } catch (error) {
      ctx.logger.warn('[michengai-codex-ui] 引导设置注册已跳过：%s', error)
    }
  })
}
