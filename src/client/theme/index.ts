import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ThemeRuntime } from '@deepseek-ai/dsh-client-ui-theme/client'
import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'
import { applyGlassSettings, disposeGlassMode, type GlassMode, type GlassPreset } from './glass.ts'
import { ALL_BUILTIN_THEMES } from './palettes.ts'
import {
  getThemeSettingsState,
  setGlassEnabled,
  setGlassGlow,
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

let lastAppliedTokens: string[] = []

/**
 * 将指定主题精准映射并深度应用到真实 DOM（双重保险，彻底压制并覆盖官方亮暗限制）
 */
export function applyThemeToDocument(
  themeOption: ThemeOption,
  themeRuntime?: ThemeRuntime,
  syncRuntime = true,
): void {
  if (typeof document === 'undefined') return
  const runtime = themeRuntime ?? globalThemeRuntime

  if (themeOption === 'stock') {
    // 1. 清理自定义 Token 注入
    for (const name of lastAppliedTokens) {
      document.body.style.removeProperty(name)
    }
    lastAppliedTokens = []

    // 2. 清理根节点残留属性，恢复官方原生渲染
    document.documentElement.style.removeProperty('color-scheme')
    document.documentElement.removeAttribute('data-ds-theme-source')
    document.body.removeAttribute('data-ds-dark-theme')

    // 3. 仅当宿主当前活动主题属于本插件注册的自定义主题时，才在切回 stock 时还原为系统偏好；
    // 若宿主本就在运行原生主题（dark/light/system），严禁调用 setTheme 篡改用户的全局偏好！
    if (syncRuntime && runtime && typeof runtime.setTheme === 'function') {
      try {
        const activeId = runtime.getTheme?.()?.active?.id
        if (activeId && ALL_BUILTIN_THEMES.some((t) => t.id === activeId)) {
          runtime.setTheme('system')
        }
      } catch {}
    }
    return
  }

  const targetTheme = ALL_BUILTIN_THEMES.find((t) => t.id === themeOption)
  if (!targetTheme) return

  // 1. 同步通知 ThemeRuntime（首帧启动不阻塞，用户交互时即时同步）
  if (syncRuntime && runtime && typeof runtime.setTheme === 'function') {
    try {
      const activeId = runtime.getTheme?.()?.active?.id
      if (activeId !== targetTheme.id) {
        runtime.setTheme(targetTheme.id)
      }
    } catch {}
  }

  // 2. 深度同步 DOM 根属性与配色模式（确保全应用与 Electron 窗口标题栏全部跟随）
  const scheme = targetTheme.colorScheme
  document.documentElement.style.colorScheme = scheme
  document.documentElement.setAttribute('data-ds-theme-source', scheme)
  if (scheme === 'dark') {
    document.body.setAttribute('data-ds-dark-theme', '')
  } else {
    document.body.removeAttribute('data-ds-dark-theme')
  }

  // 3. 逐 Token 注入 CSSOM（覆盖官方原生与第三方样式的默认值）
  for (const name of lastAppliedTokens) {
    if (!(name in targetTheme.tokens)) {
      document.body.style.removeProperty(name)
    }
  }
  const applied: string[] = []
  for (const [name, value] of Object.entries(targetTheme.tokens)) {
    document.body.style.setProperty(name, value)
    applied.push(name)
  }
  lastAppliedTokens = applied
}

/**
 * 供 UI 直接调用的主题切换入口，立即执行 ThemeRuntime.setTheme 并持久化。
 */
export function changeTheme(themeOption: ThemeOption): void {
  setThemeOption(themeOption)
  applyThemeToDocument(themeOption)
}

/**
 * 供 UI 直接调用的玻璃质感与排版模式切换入口。
 */
export function changeGlass(options: {
  enabled?: boolean
  mode?: GlassMode
  preset?: GlassPreset
  glow?: boolean
}): void {
  const state = getThemeSettingsState()
  const enabled = options.enabled ?? state.glassEnabled
  const mode = options.mode ?? state.glassMode
  const preset = options.preset ?? state.glassPreset
  const glow = options.glow ?? state.glassGlow

  if (options.enabled !== undefined) setGlassEnabled(options.enabled)
  if (options.mode !== undefined) setGlassMode(options.mode)
  if (options.preset !== undefined) setGlassPreset(options.preset)
  if (options.glow !== undefined) setGlassGlow(options.glow)

  applyGlassSettings({ enabled, mode, preset, glow })
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

  const applyCurrentState = (syncRuntime = true): void => {
    if (disposed) return
    const state = getThemeSettingsState()

    // 1. 同步玻璃质感与排版模式
    applyGlassSettings({
      enabled: state.glassEnabled,
      mode: state.glassMode,
      preset: state.glassPreset,
      glow: state.glassGlow,
    })

    // 2. 同步主题配色（首帧启动时不阻塞宿主 ThemeRuntime）
    applyThemeToDocument(state.themeOption, theme, syncRuntime)
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
    applyCurrentState(true)
  })

  // 初始即时应用（首帧只注入 CSSOM，确保 0 延迟、0 白闪且绝对不阻断宿主启动生命周期）
  applyCurrentState(false)

  // 监听官方 theme/change：当官方或系统切换主题时，若当前处于自选主题，仅补齐 DOM tokens 确保不丢失，
  // 严禁在此处调用 theme.setTheme 导致无限微任务死循环卡死页面。
  const offThemeChange = ctx.on('theme/change', () => {
    if (disposed) return
    const state = getThemeSettingsState()
    if (state.themeOption === 'stock') return
    const targetTheme = ALL_BUILTIN_THEMES.find((t) => t.id === state.themeOption)
    if (targetTheme) {
      for (const [name, value] of Object.entries(targetTheme.tokens)) {
        document.body.style.setProperty(name, value)
      }
    }
  })

  // 监听状态订阅
  const unsubscribe = subscribeThemeSettings(() => {
    applyCurrentState()
  })

  return () => {
    disposed = true
    unsubscribe()
    offThemeChange?.()
    disposeGlassMode()
    for (const dispose of disposers) dispose()
    if (globalThemeRuntime === theme) globalThemeRuntime = undefined
  }
}
