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

    try {
      // 1. 无 disabled 配置
      writeFileSync(join(desktopProfile, 'cordis.patch.yml'), '- id: other\n  config: {}\n', 'utf8')
      expect(isSubPluginDisabledOnDisk('codex-ui-theme', testDir)).toBe(false)

      // 2. 显式配置 disabled: true
      writeFileSync(
        join(desktopProfile, 'cordis.patch.yml'),
        '- id: codex-ui-theme\n  disabled: true\n',
        'utf8',
      )
      expect(isSubPluginDisabledOnDisk('codex-ui-theme', testDir)).toBe(true)
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

    // 网络异常时保持客户端可用（不阻断换肤）
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    expect(await checkThemeEnabled()).toBe(true)
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
    expect(initialState.glassEnabled).toBe(false)
    expect(initialState.glassMode).toBe('mica')
    expect(initialState.glassPreset).toBe('standard')

    const listener = vi.fn()
    const unsubscribe = subscribeThemeSettings(listener)

    setThemeOption('codex-dark')
    expect(localStorage.getItem(STORAGE_KEYS.themeOption)).toBe('codex-dark')
    expect(getThemeSettingsState().themeOption).toBe('codex-dark')
    expect(listener).toHaveBeenCalledTimes(1)

    setGlassEnabled(true)
    expect(localStorage.getItem(STORAGE_KEYS.glassEnabled)).toBe('true')
    expect(getThemeSettingsState().glassEnabled).toBe(true)
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
})
