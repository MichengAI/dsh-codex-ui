import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CODEX_UI_API_ENDPOINTS } from '../src/business-api.ts'
import { apply, isSubPluginDisabledOnDisk, name } from '../src/theme-plugin.ts'
import {
  checkThemeEnabled,
  observeTheme,
  CODEX_DARK_THEME,
  CODEX_DARK_THEME_ID,
  CODEX_LIGHT_THEME,
  CODEX_LIGHT_THEME_ID,
  applyGlassMode,
  disposeGlassMode,
  GLASS_PRESETS,
  getThemeSettingsState,
  setGlassEnabled,
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

  it('宿主插件正确向 webServer 注册 /api/dsh-codex-ui/theme 端点', () => {
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

    // 禁用响应
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: false }),
    } as Response)
    expect(await checkThemeEnabled()).toBe(false)

    // 网络异常响应
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    expect(await checkThemeEnabled()).toBe(false)
  })

  it('内置色盘包含完整的 Codex 暗色与亮色，且覆盖全套 --dsw-* 设计变量', () => {
    expect(CODEX_DARK_THEME.id).toBe(CODEX_DARK_THEME_ID)
    expect(CODEX_DARK_THEME.colorScheme).toBe('dark')
    expect(Object.keys(CODEX_DARK_THEME.tokens).length).toBe(190)

    expect(CODEX_LIGHT_THEME.id).toBe(CODEX_LIGHT_THEME_ID)
    expect(CODEX_LIGHT_THEME.colorScheme).toBe('light')
    expect(Object.keys(CODEX_LIGHT_THEME.tokens).length).toBe(190)

    // 验证核心底色与高对比度文字
    expect(CODEX_DARK_THEME.tokens['--dsw-static-neutral-bluish-950']).toBe('#09090b')
    expect(CODEX_LIGHT_THEME.tokens['--dsw-static-neutral-bluish-00']).toBe('#ffffff')
  })

  it('主题状态读写、持久化与广播订阅工作正常', () => {
    const initialState = getThemeSettingsState()
    expect(initialState.themeOption).toBe('stock')
    expect(initialState.glassEnabled).toBe(false)
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

    setGlassPreset('frosted')
    expect(localStorage.getItem(STORAGE_KEYS.glassPreset)).toBe('frosted')
    expect(getThemeSettingsState().glassPreset).toBe('frosted')
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
    setThemeOption('codex-light')
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('云母模式（Mica）开关与材质预设正确操作 DOM 与样式标签', () => {
    const root = document.documentElement

    // 1. 初始关闭
    applyGlassMode(false)
    expect(root.getAttribute('data-codex-glass')).toBeNull()
    expect(document.getElementById('dsh-codex-ui-glass-style')).toBeNull()

    // 2. 开启并选用 clear 预设
    applyGlassMode(true, 'clear')
    expect(root.getAttribute('data-codex-glass')).toBe('true')
    expect(root.getAttribute('data-codex-glass-preset')).toBe('clear')
    expect(root.style.getPropertyValue('--codex-glass-blur')).toBe(`${GLASS_PRESETS.clear.blur}px`)
    expect(document.getElementById('dsh-codex-ui-glass-style')).not.toBeNull()

    // 3. 切换至 frosted 预设
    applyGlassMode(true, 'frosted')
    expect(root.getAttribute('data-codex-glass-preset')).toBe('frosted')
    expect(root.style.getPropertyValue('--codex-glass-blur')).toBe(`${GLASS_PRESETS.frosted.blur}px`)

    // 4. 清理还原
    disposeGlassMode()
    expect(root.getAttribute('data-codex-glass')).toBeNull()
    expect(document.getElementById('dsh-codex-ui-glass-style')).toBeNull()
  })

  it('observeTheme 生命周期正常：注册主题、响应偏好切换，卸载时纯净还原', () => {
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

    // 模拟服务端探活通过
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response)

    const dispose = observeTheme(ctx)

    // 验证注册了两个主题
    expect(fakeThemeRuntime.register).toHaveBeenCalledTimes(2)
    expect(registeredThemes).toContain(CODEX_DARK_THEME_ID)
    expect(registeredThemes).toContain(CODEX_LIGHT_THEME_ID)

    // 切换至 codex-dark
    setThemeOption('codex-dark')
    expect(fakeThemeRuntime.setTheme).toHaveBeenCalledWith('codex-dark')

    // 切换至 codex-light
    setThemeOption('codex-light')
    expect(fakeThemeRuntime.setTheme).toHaveBeenCalledWith('codex-light')

    // 切换至 stock
    setThemeOption('stock')
    expect(fakeThemeRuntime.setTheme).toHaveBeenCalledWith('system')

    // 开启云母模式
    setGlassEnabled(true)
    expect(document.documentElement.getAttribute('data-codex-glass')).toBe('true')

    // 卸载
    dispose()
    expect(document.documentElement.getAttribute('data-codex-glass')).toBeNull()
    expect(registeredThemes.length).toBe(0)
  })
})
