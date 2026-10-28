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
 * 遵循统一的 fail-closed 契约：当端点 404 或网络不可达时视为停用并回退官方。
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
    return data?.enabled === true
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

let lastAppliedTokens: string[] = []
let hasAppliedCustomTheme = false
let themeSubPluginEnabled = true

/** 检查当前主题子插件是否在 Host 侧处于激活启用状态 */
export function isThemeSubPluginEnabled(): boolean {
  return themeSubPluginEnabled
}

/** 供测试与内部状态机同步主题子插件启用标记 */
export function setThemeSubPluginEnabled(enabled: boolean): void {
  themeSubPluginEnabled = enabled
}

/**
 * 将指定主题精准映射并深度应用到真实 DOM（双重保险，彻底压制并覆盖官方亮暗限制）
 */
export function applyThemeToDocument(
  themeOption: ThemeOption,
  themeRuntime?: ThemeRuntime,
  syncRuntime = true,
): void {
  if (typeof document === 'undefined') return

  // 物理熔断守卫：当主题子插件被停用时，绝不向 DOM 注入任何 Token，并清理已存在的残留
  if (!themeSubPluginEnabled) {
    for (const name of lastAppliedTokens) {
      document.body.style.removeProperty(name)
    }
    lastAppliedTokens = []
    return
  }

  const runtime = themeRuntime ?? globalThemeRuntime

  if (themeOption === 'stock') {
    // 1. 清理自定义 Token 注入
    for (const name of lastAppliedTokens) {
      document.body.style.removeProperty(name)
    }
    lastAppliedTokens = []

    // 2. 仅在插件之前确实写入过自定义主题时，才清理根节点属性；
    // 若宿主本身就在原生深色/浅色态，严禁删除宿主自己的 data-ds-dark-theme 和 color-scheme！
    if (hasAppliedCustomTheme) {
      document.documentElement.style.removeProperty('color-scheme')
      document.documentElement.removeAttribute('data-ds-theme-source')
      document.body.removeAttribute('data-ds-dark-theme')
      hasAppliedCustomTheme = false
    }

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

  hasAppliedCustomTheme = true

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
  if (!themeSubPluginEnabled) {
    console.warn('[codex-ui:theme] Theme sub-plugin is disabled on host, changeTheme skipped')
    return
  }
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
  if (!themeSubPluginEnabled) {
    console.warn('[codex-ui:theme] Theme sub-plugin is disabled on host, changeGlass skipped')
    return
  }
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

  const registerThemesOnRuntime = (runtimeInstance: ThemeRuntime): void => {
    if (typeof runtimeInstance.register === 'function') {
      for (const themeDef of ALL_BUILTIN_THEMES) {
        const dispose = tolerantRegistration(() => runtimeInstance.register(themeDef))
        disposers.push(dispose)
      }
    }
  }

  // 注册全部 6 套主题（4 套 Catppuccin + 2 套 Codex）
  if (theme) {
    registerThemesOnRuntime(theme)
  } else {
    // 服务注册时序兜底：当宿主 theme 服务稍晚就绪时自动补齐注册与状态同步
    let retries = 0
    const timer = setInterval(() => {
      if (disposed) {
        clearInterval(timer)
        return
      }
      const lateTheme = ctx.get('theme') as ThemeRuntime | undefined
      if (lateTheme) {
        clearInterval(timer)
        globalThemeRuntime = lateTheme
        registerThemesOnRuntime(lateTheme)
        const state = getThemeSettingsState()
        applyThemeToDocument(state.themeOption, lateTheme, true)
      } else if (++retries >= 100) {
        clearInterval(timer)
        console.warn('[codex-ui:theme] host theme service not ready after 5s polling, continuing with DOM-only fallback')
      }
    }, 50)
    disposers.push(() => clearInterval(timer))
  }

  let healTimer: ReturnType<typeof setInterval> | undefined

  const applyCurrentState = (syncRuntime = true): void => {
    if (disposed || !themeSubPluginEnabled) return
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

  // 探活检查与自愈同步机制：
  // 1. 当服务端显式停用或端点未就绪时，fail-closed 回退官方原生，并彻底清除 190 个自定义 Token；
  // 2. 先挂载自愈定时器，再执行状态复位，杜绝宿主服务抛错导致自愈定时器无法启动；
  // 3. 挂载窗口 focus 监听与低频轮询，一旦服务就绪或网络恢复自动重新激活，消除单次抖动永久降级。
  const checkAndSync = async (): Promise<void> => {
    if (disposed) return
    const enabled = await checkThemeEnabled()
    if (disposed) return

    if (!enabled) {
      themeSubPluginEnabled = false
      disposeGlassMode()
      for (const name of lastAppliedTokens) {
        document.body.style.removeProperty(name)
      }
      lastAppliedTokens = []

      // 优先启动低频自愈探测（15 秒），网络恢复或端点挂载后自动恢复
      if (!healTimer) {
        healTimer = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            void checkAndSync()
          }
        }, 15000)
      }

      // 安全尝试将宿主主题还原为系统偏好，任何异常均安全捕获不阻断
      try {
        if (theme && typeof theme.setTheme === 'function') {
          const cur = theme.getTheme?.()?.active?.id
          if (ALL_BUILTIN_THEMES.some((t) => t.id === cur)) {
            theme.setTheme('system')
          }
        }
      } catch {
        // 宿主 theme 抛错时安全忽略，不阻断自愈
      }
      return
    }

    if (healTimer) {
      clearInterval(healTimer)
      healTimer = undefined
    }
    themeSubPluginEnabled = true
    applyCurrentState(true)
  }

  // 窗口重获焦点时尝试自愈
  const onFocus = (): void => {
    if (!themeSubPluginEnabled && !disposed) {
      void checkAndSync()
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus)
    disposers.push(() => window.removeEventListener('focus', onFocus))
  }

  // 启动探活
  void checkAndSync()

  // 初始即时应用（首帧只注入 CSSOM，确保 0 延迟、0 白闪且绝对不阻断宿主启动生命周期）
  applyCurrentState(false)

  // 监听官方 theme/change：当官方或系统切换主题时，若当前处于自选主题，仅补齐 DOM tokens 确保不丢失，
  // 严禁在此处调用 theme.setTheme 导致无限微任务死循环卡死页面。
  const offThemeChange = ctx.on('theme/change', () => {
    if (disposed || !themeSubPluginEnabled) return
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
    if (disposed || !themeSubPluginEnabled) return
    applyCurrentState()
  })

  return () => {
    disposed = true
    if (healTimer) clearInterval(healTimer)
    unsubscribe()
    offThemeChange?.()
    disposeGlassMode()
    for (const dispose of disposers) dispose()
    if (globalThemeRuntime === theme) globalThemeRuntime = undefined
  }
}
