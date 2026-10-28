import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ThemeRuntime } from '@deepseek-ai/dsh-client-ui-theme/client'
import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'
import { applyGlassMode, disposeGlassMode } from './glass.ts'
import { CODEX_DARK_THEME, CODEX_LIGHT_THEME } from './palettes.ts'
import { getThemeSettingsState, subscribeThemeSettings } from './state.ts'

export * from './glass.ts'
export * from './palettes.ts'
export * from './state.ts'

/**
 * 校验主题子插件是否在 Host 侧启用。
 * 遵循 fail-closed 原则：404、网络失败或未显式 enabled 时视为关闭并回退官方。
 */
export async function checkThemeEnabled(): Promise<boolean> {
  try {
    const base = typeof document !== 'undefined' && document.baseURI ? document.baseURI : 'http://localhost'
    const normalizedBase = base.endsWith('/') ? base : `${base}/`
    const path = CODEX_UI_API_ENDPOINTS.theme.startsWith('/')
      ? CODEX_UI_API_ENDPOINTS.theme.slice(1)
      : CODEX_UI_API_ENDPOINTS.theme
    const url = new URL(path, normalizedBase).href
    const res = await fetch(url)
    if (!res.ok) return false
    const data = (await res.json()) as { enabled?: boolean }
    return data.enabled === true
  } catch {
    return false
  }
}

function tolerantRegistration(run: () => (() => void) | void): () => void {
  try {
    return run() ?? (() => {})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!/already registered/i.test(message)) {
      console.warn('[codex-ui:theme] registration skipped:', message)
    }
    return () => {}
  }
}

/**
 * 挂载并观察主题与外观增强：
 * - 注册 Codex 暗色与亮色至 ThemeRuntime；
 * - 响应本地配置与云母模式切换；
 * - 卸载时纯净还原 DOM 与官方主题。
 */
export function observeTheme(ctx: ClientContext): () => void {
  let disposed = false
  const theme = ctx.get('theme') as ThemeRuntime | undefined

  let disposeDark: (() => void) | null = null
  let disposeLight: (() => void) | null = null

  if (theme && typeof theme.register === 'function') {
    disposeDark = tolerantRegistration(() => theme.register(CODEX_DARK_THEME))
    disposeLight = tolerantRegistration(() => theme.register(CODEX_LIGHT_THEME))
  }

  const applyCurrentState = (): void => {
    if (disposed) return
    const state = getThemeSettingsState()

    // 1. 同步云母质感
    applyGlassMode(state.glassEnabled, state.glassPreset)

    // 2. 同步主题配色
    if (!theme || typeof theme.setTheme !== 'function') return
    const currentThemeId = theme.getTheme?.()?.active?.id ?? theme.getTheme?.()?.preference

    if (state.themeOption === 'codex-dark') {
      if (currentThemeId !== 'codex-dark') {
        try {
          theme.setTheme('codex-dark')
        } catch (e) {
          console.warn('[codex-ui:theme] failed to set codex-dark:', e)
        }
      }
    } else if (state.themeOption === 'codex-light') {
      if (currentThemeId !== 'codex-light') {
        try {
          theme.setTheme('codex-light')
        } catch (e) {
          console.warn('[codex-ui:theme] failed to set codex-light:', e)
        }
      }
    } else if (state.themeOption === 'stock') {
      // 若当前为主题插件专属定制的主题，则恢复为官方系统跟随
      if (currentThemeId === 'codex-dark' || currentThemeId === 'codex-light') {
        try {
          theme.setTheme('system')
        } catch {
          try {
            theme.setTheme('dark')
          } catch {
            // 忽略恢复异常
          }
        }
      }
    }
  }

  // 先行异步探活，若子模块在服务端显式停用，则不生效并还原
  void checkThemeEnabled().then((enabled) => {
    if (disposed) return
    if (!enabled) {
      disposeGlassMode()
      if (theme && typeof theme.setTheme === 'function') {
        const cur = theme.getTheme?.()?.active?.id
        if (cur === 'codex-dark' || cur === 'codex-light') {
          theme.setTheme('system')
        }
      }
      return
    }
    applyCurrentState()
  })

  // 初始即时应用（避免白闪与延迟）
  applyCurrentState()

  // 监听状态订阅
  const unsubscribe = subscribeThemeSettings(() => {
    applyCurrentState()
  })

  return () => {
    disposed = true
    unsubscribe()
    disposeGlassMode()
    disposeDark?.()
    disposeLight?.()
  }
}
