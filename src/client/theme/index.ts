import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ThemeRuntime } from '@deepseek-ai/dsh-client-ui-theme/client'
import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'
import { applyGlassSettings, disposeGlassMode, type GlassMode, type GlassPreset } from './glass.ts'
import { ALL_BUILTIN_THEMES } from './palettes.ts'
import {
  getThemeSettingsState,
  isThemeSubPluginEnabled,
  setGlassEnabled,
  setGlassGlow,
  setGlassMode,
  setGlassPreset,
  setThemeOption,
  setThemeSubPluginEnabled,
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

export const THEME_SURFACE_STYLE_ID = 'dsh-codex-ui-theme-surface-style'

/**
 * 确保注入消除插件页等场景色差的全局表面样式
 */
export function ensureThemeSurfaceStyles(doc: Document = typeof document !== 'undefined' ? document : (undefined as unknown as Document)): void {
  if (!doc) return
  let tag = doc.getElementById(THEME_SURFACE_STYLE_ID) as HTMLStyleElement | null
  if (!tag) {
    tag = doc.createElement('style')
    tag.id = THEME_SURFACE_STYLE_ID
    tag.textContent = `
/* 彻底消除插件管理页顶栏与全局背景之间的色差：静止与滚动吸顶均保持底板透明，与全局背景底色与渐变自然融为一体；吸顶时仅保留微透磨砂与底部分割线 */
[data-plugin-bar]:before,
[class*="pageBar"]:before {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  transition: background 0.15s ease !important;
}

[data-plugin-bar][data-scrolled]:before,
[data-plugin-bar][data-compact]:before,
[class*="pageBar"][data-scrolled]:before,
[class*="pageBar"][data-compact]:before {
  background: transparent !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
}

[data-plugin-bar][data-compact]:after,
[class*="pageBar"][data-compact]:after,
[data-plugin-bar][data-scrolled]:after,
[class*="pageBar"][data-scrolled]:after {
  content: "" !important;
  position: absolute !important;
  inset-inline: 0 !important;
  bottom: 0 !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  pointer-events: none !important;
}
`
    doc.head.appendChild(tag)
  }
}

export function removeThemeSurfaceStyles(doc: Document = typeof document !== 'undefined' ? document : (undefined as unknown as Document)): void {
  if (!doc) return
  const tag = doc.getElementById(THEME_SURFACE_STYLE_ID)
  if (tag) tag.remove()
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
  if (!isThemeSubPluginEnabled()) {
    removeThemeSurfaceStyles()
    for (const name of lastAppliedTokens) {
      document.body.style.removeProperty(name)
    }
    lastAppliedTokens = []
    return
  }

  const runtime = themeRuntime ?? globalThemeRuntime

  if (themeOption === 'stock') {
    removeThemeSurfaceStyles()
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
  ensureThemeSurfaceStyles()

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
  if (!isThemeSubPluginEnabled()) {
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
  if (!isThemeSubPluginEnabled()) {
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

let globalCheckAndSync: (() => Promise<void>) | undefined

/** 供外部（如关于页或弹窗交互）主动触发主题启用状态探活与同步 */
export async function syncThemeState(): Promise<void> {
  if (globalCheckAndSync) {
    await globalCheckAndSync()
  } else {
    const enabled = await checkThemeEnabled()
    setThemeSubPluginEnabled(enabled)
  }
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
    const state = getThemeSettingsState()
    applyThemeToDocument(state.themeOption, theme, true)
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
    if (disposed || !isThemeSubPluginEnabled()) return
    const state = getThemeSettingsState()

    // 1. 同步玻璃质感与排版模式
    applyGlassSettings({
      enabled: state.glassEnabled,
      mode: state.glassMode,
      preset: state.glassPreset,
      glow: state.glassGlow,
    })

    // 2. 同步主题配色（首帧启动即同步宿主 ThemeRuntime）
    applyThemeToDocument(state.themeOption, globalThemeRuntime ?? theme, syncRuntime)
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
      setThemeSubPluginEnabled(false)
      disposeGlassMode()
      for (const name of lastAppliedTokens) {
        document.body.style.removeProperty(name)
      }
      lastAppliedTokens = []

      // 彻底清理根节点属性，恢复官方原生标记
      if (hasAppliedCustomTheme) {
        document.documentElement.style.removeProperty('color-scheme')
        document.documentElement.removeAttribute('data-ds-theme-source')
        document.body.removeAttribute('data-ds-dark-theme')
        hasAppliedCustomTheme = false
      }

      // 优先启动快速自愈探测（3 秒），网络恢复或端点挂载后自动恢复
      if (!healTimer) {
        healTimer = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            void checkAndSync()
          }
        }, 3000)
      }

      // 安全尝试将宿主主题还原为系统偏好，任何异常均安全捕获不阻断
      try {
        const curThemeRuntime = theme ?? globalThemeRuntime ?? (ctx.get('theme') as ThemeRuntime | undefined)
        if (curThemeRuntime && typeof curThemeRuntime.setTheme === 'function') {
          const cur = curThemeRuntime.getTheme?.()?.active?.id
          if (ALL_BUILTIN_THEMES.some((t) => t.id === cur)) {
            curThemeRuntime.setTheme('system')
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
    // 翻转启用标记并广播，由 subscribeThemeSettings 自动触发状态恢复与 UI 重渲染
    setThemeSubPluginEnabled(true)
  }

  globalCheckAndSync = checkAndSync

  // 窗口重获焦点时即时同步状态（响应用户在插件管理中实时切开关）
  const onFocus = (): void => {
    if (!disposed) {
      void checkAndSync()
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus)
    disposers.push(() => window.removeEventListener('focus', onFocus))
  }

  // 监听设置面板内的开关交互（响应用户在插件管理列表或设置弹窗中实时切开关）
  if (typeof document !== 'undefined') {
    let clickTimer: ReturnType<typeof setTimeout> | undefined
    const onClick = (e: MouseEvent): void => {
      if (disposed) return
      const target = e.target as Element | null
      if (target?.closest?.('[data-plugin-rows], [data-plugin-row], [data-shortcut-modal="settings"], [role="switch"]')) {
        if (clickTimer) clearTimeout(clickTimer)
        clickTimer = setTimeout(() => {
          if (!disposed) void checkAndSync()
        }, 150)
      }
    }
    document.addEventListener('click', onClick, true)
    disposers.push(() => {
      if (clickTimer) clearTimeout(clickTimer)
      document.removeEventListener('click', onClick, true)
    })
  }

  // 观察设置面板 DOM 结构变更（如插件状态从运行中变为已关闭）
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    let settingsObserverTimer: ReturnType<typeof setTimeout> | undefined
    const observer = new MutationObserver((mutations) => {
      if (disposed) return
      let touchesSettings = false
      for (const m of mutations) {
        if (
          (m.target instanceof HTMLElement && (m.target.closest('[data-shortcut-modal="settings"]') || m.target.closest('[data-plugin-rows]'))) ||
          [...m.addedNodes, ...m.removedNodes].some(n => n instanceof HTMLElement && (n.getAttribute?.('data-shortcut-modal') === 'settings' || n.querySelector?.('[data-shortcut-modal="settings"]')))
        ) {
          touchesSettings = true
          break
        }
      }
      if (touchesSettings) {
        if (settingsObserverTimer) clearTimeout(settingsObserverTimer)
        settingsObserverTimer = setTimeout(() => {
          if (!disposed) void checkAndSync()
        }, 150)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'aria-checked'] })
    disposers.push(() => {
      if (settingsObserverTimer) clearTimeout(settingsObserverTimer)
      observer.disconnect()
    })
  }

  // 启动探活
  void checkAndSync()

  // 初始即时应用（首帧注入并立即同步宿主 ThemeRuntime）
  applyCurrentState(true)

  // 监听官方 theme/change：当官方或系统切换主题时，若当前处于自选主题，同步 DOM tokens 并纠正 DOM 根属性
  // 传入 syncRuntime = false 防止调用 theme.setTheme 导致无限微任务死循环卡死页面。
  const offThemeChange = ctx.on('theme/change', () => {
    if (disposed || !isThemeSubPluginEnabled()) return
    const state = getThemeSettingsState()
    if (state.themeOption === 'stock') return
    applyThemeToDocument(state.themeOption, undefined, false)
  })

  // 监听状态订阅
  const unsubscribe = subscribeThemeSettings(() => {
    if (disposed || !isThemeSubPluginEnabled()) return
    applyCurrentState()
  })

  return () => {
    disposed = true
    if (globalCheckAndSync === checkAndSync) globalCheckAndSync = undefined
    if (healTimer) clearInterval(healTimer)
    unsubscribe()
    offThemeChange?.()
    disposeGlassMode()
    for (const dispose of disposers) dispose()
    if (globalThemeRuntime === theme) globalThemeRuntime = undefined
  }
}
