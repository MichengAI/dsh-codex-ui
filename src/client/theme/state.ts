import type { GlassPreset } from './glass.ts'

export type ThemeOption = 'stock' | 'codex-dark' | 'codex-light'

export interface ThemeSettingsState {
  themeOption: ThemeOption
  glassEnabled: boolean
  glassPreset: GlassPreset
}

export const STORAGE_KEYS = Object.freeze({
  themeOption: 'codex-ui.theme.option',
  glassEnabled: 'codex-ui.glass.enabled',
  glassPreset: 'codex-ui.glass.preset',
})

const listeners = new Set<() => void>()

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
  } catch {
    // 降级容错
  }
  return null
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
    }
  } catch {
    // 降级容错
  }
}

function computeSnapshot(): ThemeSettingsState {
  const rawTheme = safeGetItem(STORAGE_KEYS.themeOption)
  const themeOption: ThemeOption =
    rawTheme === 'codex-dark' || rawTheme === 'codex-light' ? rawTheme : 'stock'

  const rawGlass = safeGetItem(STORAGE_KEYS.glassEnabled)
  const glassEnabled = rawGlass === 'true'

  const rawPreset = safeGetItem(STORAGE_KEYS.glassPreset)
  const glassPreset: GlassPreset =
    rawPreset === 'clear' || rawPreset === 'frosted' ? rawPreset : 'standard'

  return Object.freeze({ themeOption, glassEnabled, glassPreset })
}

let currentSnapshot: ThemeSettingsState = computeSnapshot()

export function getThemeSettingsState(): ThemeSettingsState {
  const next = computeSnapshot()
  if (
    currentSnapshot.themeOption !== next.themeOption ||
    currentSnapshot.glassEnabled !== next.glassEnabled ||
    currentSnapshot.glassPreset !== next.glassPreset
  ) {
    currentSnapshot = next
  }
  return currentSnapshot
}

function notify(): void {
  currentSnapshot = computeSnapshot()
  for (const listener of listeners) {
    try {
      listener()
    } catch (e) {
      console.warn('[codex-ui:theme] listener error:', e)
    }
  }
}

export function setThemeOption(themeOption: ThemeOption): void {
  safeSetItem(STORAGE_KEYS.themeOption, themeOption)
  notify()
}

export function setGlassEnabled(enabled: boolean): void {
  safeSetItem(STORAGE_KEYS.glassEnabled, String(enabled))
  notify()
}

export function setGlassPreset(preset: GlassPreset): void {
  safeSetItem(STORAGE_KEYS.glassPreset, preset)
  notify()
}

export function subscribeThemeSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// 绑定全局 storage 事件（跨 tab 自动同步）
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (
      event.key === STORAGE_KEYS.themeOption ||
      event.key === STORAGE_KEYS.glassEnabled ||
      event.key === STORAGE_KEYS.glassPreset
    ) {
      notify()
    }
  })
}
