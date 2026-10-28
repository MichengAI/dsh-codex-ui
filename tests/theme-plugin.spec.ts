import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CODEX_UI_API_ENDPOINTS } from '../src/business-api.ts'
import { apply, isSubPluginDisabledOnDisk, name } from '../src/theme-plugin.ts'
import {
  ALL_BUILTIN_THEMES,
  applyGlassSettings,
  applyThemeToDocument,
  changeGlass,
  changeTheme,
  checkThemeEnabled,
  CODEX_DARK_THEME,
  CODEX_DARK_THEME_ID,
  CODEX_LIGHT_THEME,
  CODEX_LIGHT_THEME_ID,
  disposeGlassMode,
  GLASS_ATTRIBUTE,
  GLASS_COMPAT_ATTRIBUTE,
  GLASS_FLOAT_ATTRIBUTE,
  GLASS_PRESETS,
  getThemeSettingsState,
  refreshThemeSettingsSnapshot,
  observeTheme,
  setGlassEnabled,
  setGlassGlow,
  setGlassMode,
  setGlassPreset,
  setThemeOption,
  STORAGE_KEYS,
  subscribeThemeSettings,
} from '../src/client/theme/index.ts'

describe('codex-ui-theme 子模块与主题换肤', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    localStorage.clear()
    disposeGlassMode()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    localStorage.clear()
    disposeGlassMode()
  })

  it('子插件元数据命名必须是 codex-ui-theme', () => {
    expect(name).toBe('codex-ui-theme')
  })

  it('宿主插件正确向 webServer 注册 /api/michengai/dsh-codex-ui/theme 端点', () => {
    const ctx = new Context()
    let registeredPath = ''
    let handlerFn:
      | ((
          req: unknown,
          res: {
            writeHead: (status: number, headers?: Record<string, string>) => void
            end: (body?: string) => void
          },
        ) => void)
      | undefined

    ctx.provide('webServer', {
      register: (options: { kind: 'exact'; path: string; handler: typeof handlerFn }) => {
        registeredPath = options.path
        handlerFn = options.handler
        return () => {
          registeredPath = ''
          handlerFn = undefined
        }
      },
    } as never)

    apply(ctx)

    expect(registeredPath).toBe(CODEX_UI_API_ENDPOINTS.theme)
    expect(handlerFn).toBeDefined()

    let responseStatus = 0
    let responseBody = ''
    handlerFn!(
      {},
      {
        writeHead: (status) => {
          responseStatus = status
        },
        end: (body) => {
          responseBody = body ?? ''
        },
      },
    )

    expect(responseStatus).toBe(200)
    expect(typeof JSON.parse(responseBody).enabled).toBe('boolean')
  })

  it('isSubPluginDisabledOnDisk 能准确识别 cordis.patch.yml 中的 disabled 配置', () => {
    const testDir = join(tmpdir(), `dcu-theme-test-${Date.now()}`)
    const desktopProfile = join(testDir, 'profiles', 'desktop')
    mkdirSync(desktopProfile, { recursive: true })
    const ctx = {
      get: (k: string) => (k === 'profileContext' ? { name: 'desktop', dir: desktopProfile } : undefined),
    } as never

    try {
      // 1. 无 disabled 配置
      writeFileSync(join(desktopProfile, 'cordis.patch.yml'), '- id: other\n  config: {}\n', 'utf8')
      expect(isSubPluginDisabledOnDisk('codex-ui-theme', testDir, ctx)).toBe(false)

      // 2. 显式配置 disabled: true
      writeFileSync(
        join(desktopProfile, 'cordis.patch.yml'),
        '- id: codex-ui-theme\n  disabled: true\n',
        'utf8',
      )
      expect(isSubPluginDisabledOnDisk('codex-ui-theme', testDir, ctx)).toBe(true)
    } finally {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('checkThemeEnabled 能正确通过 HTTP 端点探测子插件启用状态', async () => {
    // 成功响应
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response)
    expect(await checkThemeEnabled()).toBe(true)

    // 显式禁用响应
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: false }),
    } as Response)
    expect(await checkThemeEnabled()).toBe(false)

    // 404 响应（子插件在 profile 中被停用，端点不存在）
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response)
    expect(await checkThemeEnabled()).toBe(false)

    // 网络异常时遵循 fail-closed 契约回退官方原生
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    expect(await checkThemeEnabled()).toBe(false)
  })

  it('内置色盘包含完整的 6 套主题（4套Catppuccin + 2套Codex），均覆盖全套 190 个 --dsw-* 设计变量', () => {
    expect(ALL_BUILTIN_THEMES.length).toBe(6)

    expect(CODEX_DARK_THEME.id).toBe(CODEX_DARK_THEME_ID)
    expect(CODEX_DARK_THEME.colorScheme).toBe('dark')
    expect(Object.keys(CODEX_DARK_THEME.tokens).length).toBe(190)

    expect(CODEX_LIGHT_THEME.id).toBe(CODEX_LIGHT_THEME_ID)
    expect(CODEX_LIGHT_THEME.colorScheme).toBe('light')
    expect(Object.keys(CODEX_LIGHT_THEME.tokens).length).toBe(190)

    // 验证核心底色与高对比度文字
    expect(CODEX_DARK_THEME.tokens['--dsw-static-neutral-bluish-950']).toBe('#09090b')
    expect(CODEX_LIGHT_THEME.tokens['--dsw-static-neutral-bluish-00']).toBe('#ffffff')

    // 验证包含参考插件的四套
    const themeIds = ALL_BUILTIN_THEMES.map((t) => t.id)
    expect(themeIds).toContain('catppuccin-mocha')
    expect(themeIds).toContain('catppuccin-macchiato')
    expect(themeIds).toContain('catppuccin-frappe')
    expect(themeIds).toContain('catppuccin-latte')
  })

  it('主题状态读写、持久化与广播订阅工作正常', () => {
    const initialState = getThemeSettingsState()
    expect(initialState.themeOption).toBe('stock')
    expect(initialState.glassEnabled).toBe(true)
    expect(initialState.glassMode).toBe('mica')
    expect(initialState.glassPreset).toBe('standard')

    const listener = vi.fn()
    const unsubscribe = subscribeThemeSettings(listener)

    setThemeOption('codex-dark')
    expect(localStorage.getItem(STORAGE_KEYS.themeOption)).toBe('codex-dark')
    expect(getThemeSettingsState().themeOption).toBe('codex-dark')
    expect(listener).toHaveBeenCalledTimes(1)

    setGlassEnabled(false)
    expect(localStorage.getItem(STORAGE_KEYS.glassEnabled)).toBe('false')
    expect(getThemeSettingsState().glassEnabled).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)

    setGlassMode('compat')
    expect(localStorage.getItem(STORAGE_KEYS.glassMode)).toBe('compat')
    expect(getThemeSettingsState().glassMode).toBe('compat')
    expect(listener).toHaveBeenCalledTimes(3)

    setGlassPreset('frosted')
    expect(localStorage.getItem(STORAGE_KEYS.glassPreset)).toBe('frosted')
    expect(getThemeSettingsState().glassPreset).toBe('frosted')
    expect(listener).toHaveBeenCalledTimes(4)

    setGlassGlow(true)
    expect(localStorage.getItem(STORAGE_KEYS.glassGlow)).toBe('true')
    expect(getThemeSettingsState().glassGlow).toBe(true)
    expect(listener).toHaveBeenCalledTimes(5)

    unsubscribe()
    setThemeOption('codex-light')
    expect(listener).toHaveBeenCalledTimes(5)
  })

  it('玻璃质感、云母/兼容排版模式与预设正确操作 DOM 与样式标签', () => {
    const root = document.documentElement

    // 1. 初始关闭
    applyGlassSettings({ enabled: false })
    expect(root.hasAttribute(GLASS_ATTRIBUTE)).toBe(false)
    expect(document.getElementById('dsh-codex-ui-glass-style')).toBeNull()

    // 2. 开启并选用云母模式 (mica) + clear 预设 + glow: true
    applyGlassSettings({ enabled: true, mode: 'mica', preset: 'clear', glow: true })
    expect(root.hasAttribute(GLASS_ATTRIBUTE)).toBe(true)
    expect(root.hasAttribute(GLASS_FLOAT_ATTRIBUTE)).toBe(true)
    expect(root.hasAttribute(GLASS_COMPAT_ATTRIBUTE)).toBe(false)
    expect(root.style.getPropertyValue('--dsh-glass-blur')).toBe(`${GLASS_PRESETS.clear.blur}px`)
    expect(root.style.getPropertyValue('--dsh-glass-glow')).toBe('1')
    expect(document.getElementById('dsh-codex-ui-glass-style')).not.toBeNull()

    // 3. 切换至原版兼容排版模式 (compat) + frosted 预设 + glow: false
    applyGlassSettings({ enabled: true, mode: 'compat', preset: 'frosted', glow: false })
    expect(root.hasAttribute(GLASS_ATTRIBUTE)).toBe(true)
    expect(root.hasAttribute(GLASS_FLOAT_ATTRIBUTE)).toBe(false)
    expect(root.hasAttribute(GLASS_COMPAT_ATTRIBUTE)).toBe(true)
    expect(root.style.getPropertyValue('--dsh-glass-blur')).toBe(`${GLASS_PRESETS.frosted.blur}px`)
    expect(root.style.getPropertyValue('--dsh-glass-glow')).toBe('0')

    // 4. 清理还原
    disposeGlassMode()
    expect(root.hasAttribute(GLASS_ATTRIBUTE)).toBe(false)
    expect(root.hasAttribute(GLASS_FLOAT_ATTRIBUTE)).toBe(false)
    expect(root.hasAttribute(GLASS_COMPAT_ATTRIBUTE)).toBe(false)
    expect(document.getElementById('dsh-codex-ui-glass-style')).toBeNull()
  })

  it('observeTheme 生命周期正常：注册全部 6 套主题，直通 changeTheme/changeGlass，卸载时纯净还原', () => {
    const registeredThemes: string[] = []
    let currentPreference = 'system'

    const fakeThemeRuntime = {
      register: vi.fn((def: { id: string }) => {
        registeredThemes.push(def.id)
        return () => {
          const idx = registeredThemes.indexOf(def.id)
          if (idx >= 0) registeredThemes.splice(idx, 1)
        }
      }),
      setTheme: vi.fn((id: string) => {
        currentPreference = id
      }),
      getTheme: vi.fn(() => ({
        preference: currentPreference,
        active: { id: currentPreference },
      })),
    }

    const ctx = new Context()
    ctx.provide('theme', fakeThemeRuntime as never)

    const dispose = observeTheme(ctx)

    // 验证注册了全部 6 套主题
    expect(fakeThemeRuntime.register).toHaveBeenCalledTimes(6)
    expect(registeredThemes).toContain(CODEX_DARK_THEME_ID)
    expect(registeredThemes).toContain(CODEX_LIGHT_THEME_ID)
    expect(registeredThemes).toContain('catppuccin-mocha')
    expect(registeredThemes).toContain('catppuccin-latte')

    // 用户通过 UI 调用 changeTheme 切换至 codex-dark
    changeTheme('codex-dark')
    expect(fakeThemeRuntime.setTheme).toHaveBeenCalledWith('codex-dark')
    expect(getThemeSettingsState().themeOption).toBe('codex-dark')

    // 切换至 catppuccin-mocha
    changeTheme('catppuccin-mocha')
    expect(fakeThemeRuntime.setTheme).toHaveBeenCalledWith('catppuccin-mocha')
    expect(getThemeSettingsState().themeOption).toBe('catppuccin-mocha')

    // 切换至 stock
    changeTheme('stock')
    expect(fakeThemeRuntime.setTheme).toHaveBeenCalledWith('system')

    // 用户通过 UI 调用 changeGlass
    changeGlass({ enabled: true, mode: 'mica', preset: 'standard' })
    expect(document.documentElement.hasAttribute(GLASS_ATTRIBUTE)).toBe(true)
    expect(document.documentElement.hasAttribute(GLASS_FLOAT_ATTRIBUTE)).toBe(true)

    // 用户在原版排版模式下切换预设
    changeGlass({ mode: 'compat', preset: 'frosted' })
    expect(document.documentElement.hasAttribute(GLASS_COMPAT_ATTRIBUTE)).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--dsh-glass-blur')).toBe(
      `${GLASS_PRESETS.frosted.blur}px`,
    )

    // 卸载
    dispose()
    expect(document.documentElement.hasAttribute(GLASS_ATTRIBUTE)).toBe(false)
    expect(registeredThemes.length).toBe(0)
  })

  it('stock 分支安全守卫：宿主运行原生主题时不调用 setTheme，且彻底清理 DOM 根属性残留', () => {
    let hostTheme = 'dark'
    const fakeRuntime = {
      register: vi.fn(),
      getTheme: vi.fn(() => ({
        preference: hostTheme,
        active: { id: hostTheme },
      })),
      setTheme: vi.fn((id: string) => {
        hostTheme = id
      }),
    }

    // 1. 模拟用户先选了 codex-dark 自定义主题
    applyThemeToDocument('codex-dark', fakeRuntime as never)
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.documentElement.getAttribute('data-ds-theme-source')).toBe('dark')
    expect(document.body.hasAttribute('data-ds-dark-theme')).toBe(true)
    expect(fakeRuntime.setTheme).toHaveBeenCalledWith('codex-dark')

    // 2. 切回 stock：因为当前 active 是 codex-dark（属于自定义主题），正常还给 system
    fakeRuntime.setTheme.mockClear()
    applyThemeToDocument('stock', fakeRuntime as never)
    expect(fakeRuntime.setTheme).toHaveBeenCalledWith('system')
    expect(document.documentElement.style.colorScheme).toBe('')
    expect(document.documentElement.hasAttribute('data-ds-theme-source')).toBe(false)
    expect(document.body.hasAttribute('data-ds-dark-theme')).toBe(false)

    // 3. 关键场景（P1 回归防线）：宿主此时明确运行官方 dark，宿主自行挂载了 dark 根属性，
    // 在 stock 状态下无论拨动几次开关或刷新，绝对不能重置为 system，且绝对不能删除宿主的 dark 属性！
    hostTheme = 'dark'
    document.documentElement.style.colorScheme = 'dark'
    document.documentElement.setAttribute('data-ds-theme-source', 'dark')
    document.body.setAttribute('data-ds-dark-theme', '')

    fakeRuntime.setTheme.mockClear()
    applyThemeToDocument('stock', fakeRuntime as never)
    expect(fakeRuntime.setTheme).not.toHaveBeenCalled()
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.documentElement.getAttribute('data-ds-theme-source')).toBe('dark')
    expect(document.body.hasAttribute('data-ds-dark-theme')).toBe(true)
  })

  it('新装用户默认开箱即用：未持久化 glassEnabled 时默认随排版模式激活 (true)', () => {
    setGlassEnabled(false)
    expect(getThemeSettingsState().glassEnabled).toBe(false)

    localStorage.removeItem(STORAGE_KEYS.glassEnabled)
    refreshThemeSettingsSnapshot()
    expect(getThemeSettingsState().glassEnabled).toBe(true)
  })

  it('主题探活具备自愈机制：初次失败降级后，端点恢复时能够自动重新激活', async () => {
    const root = document.documentElement
    root.removeAttribute(GLASS_ATTRIBUTE)

    // 1. 初次探活失败（模拟网关未就绪 404）
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response)

    const ctx = {
      on: vi.fn(),
      get: vi.fn().mockReturnValue(undefined),
    }

    const dispose = observeTheme(ctx as never)
    // 等待首帧探活执行
    await new Promise((r) => setTimeout(r, 50))
    expect(root.hasAttribute(GLASS_ATTRIBUTE)).toBe(false)

    // 2. 服务恢复 200 { enabled: true }，触发 focus 事件自愈
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response)

    window.dispatchEvent(new Event('focus'))
    await new Promise((r) => setTimeout(r, 50))

    // 自愈成功，毛玻璃重新挂载
    expect(root.hasAttribute(GLASS_ATTRIBUTE)).toBe(true)

    dispose()
  })
})
