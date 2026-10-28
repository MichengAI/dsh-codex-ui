import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ThemeRuntime } from '@deepseek-ai/dsh-client-ui-theme/client'
import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'
import { applyGlassSettings, disposeGlassMode, type GlassMode, type GlassPreset } from './glass.ts'
import { ALL_BUILTIN_THEMES } from './palettes.ts'
import {
  getThemeSettingsState,
  setGlassEnabled,
  setGlassMode,
  setGlassPreset,
  setThemeOption,
  subscribeThemeSettings,
  type ThemeOption,
} from './state.ts'

export * from './glass.ts'
export * from './palettes.ts'
export * from './state.ts'

let globalThemeRuntime: ThemeRuntime | undefined

/**
 * 校验主题子插件是否在 Host 侧被显式停用。
 * 只有当接口明确返回 { enabled: false } 时才关闭；网络失败或旧服务端 404 时保持客户端可用。
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
    if (!res.ok) return true // 接口未注册时保持本地可用
    const data = (await res.json()) as { enabled?: boolean }
    return data.enabled !== false
  } catch {
    return true
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
 * 供 UI 直接调用的主题切换入口，立即执行 ThemeRuntime.setTheme 并持久化。
 */
export function changeTheme(themeOption: ThemeOption): void {
  setThemeOption(themeOption)
  if (!globalThemeRuntime || typeof globalThemeRuntime.setTheme !== 'function') return
  try {
    if (themeOption === 'stock') {
      globalThemeRuntime.setTheme('system')
    } else {
      globalThemeRuntime.setTheme(themeOption)
    }
  } catch (e) {
    console.warn('[codex-ui:theme] setTheme failed:', e)
  }
}

/**
 * 供 UI 直接调用的玻璃质感与排版模式切换入口。
 */
export function changeGlass(options: {
  enabled?: boolean
  mode?: GlassMode
  preset?: GlassPreset
}): void {
  const state = getThemeSettingsState()
  const enabled = options.enabled ?? state.glassEnabled
  const mode = options.mode ?? state.glassMode
  const preset = options.preset ?? state.glassPreset

  if (options.enabled !== undefined) setGlassEnabled(options.enabled)
  if (options.mode !== undefined) setGlassMode(options.mode)
  if (options.preset !== undefined) setGlassPreset(options.preset)

  applyGlassSettings({ enabled, mode, preset })
}

/**
 * 挂载并观察主题与外观增强：
 * - 注册全部 6 套内置主题至 ThemeRuntime；
 * - 响应本地配置与云母模式切换；
 * - 卸载时纯净还原 DOM 与官方主题。
 */
export function observeTheme(ctx: ClientContext): () => void {
  let disposed = false
  const theme = ctx.get('theme') as ThemeRuntime | undefined
  globalThemeRuntime = theme

  const disposers: (() => void)[] = []

  // 注册全部 6 套主题（4 套 Catppuccin + 2 套 Codex）
  if (theme && typeof theme.register === 'function') {
    for (const themeDef of ALL_BUILTIN_THEMES) {
      const dispose = tolerantRegistration(() => theme.register(themeDef))
      disposers.push(dispose)
    }
  }

  const applyCurrentState = (): void => {
    if (disposed) return
    const state = getThemeSettingsState()

    // 1. 同步玻璃质感与排版模式
    applyGlassSettings({
      enabled: state.glassEnabled,
      mode: state.glassMode,
      preset: state.glassPreset,
    })

    // 2. 同步主题配色
    if (!theme || typeof theme.setTheme !== 'function') return
    const currentThemeId = theme.getTheme?.()?.active?.id ?? theme.getTheme?.()?.preference

    if (state.themeOption !== 'stock') {
      if (currentThemeId !== state.themeOption) {
        try {
          theme.setTheme(state.themeOption)
        } catch (e) {
          console.warn(`[codex-ui:theme] failed to set ${state.themeOption}:`, e)
        }
      }
    } else {
      const isCustomTheme = ALL_BUILTIN_THEMES.some((t) => t.id === currentThemeId)
      if (isCustomTheme) {
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

  // 探活检查：只有在明确 disabled: true 时才回退
  void checkThemeEnabled().then((enabled) => {
    if (disposed) return
    if (!enabled) {
      disposeGlassMode()
      if (theme && typeof theme.setTheme === 'function') {
        const cur = theme.getTheme?.()?.active?.id
        if (ALL_BUILTIN_THEMES.some((t) => t.id === cur)) {
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
    for (const dispose of disposers) dispose()
    if (globalThemeRuntime === theme) globalThemeRuntime = undefined
  }
}
