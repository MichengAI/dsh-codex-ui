/**
 * 自有设置壳通过事件直接打开分区，不依赖账号入口的按钮或菜单结构。
 * 保留的宿主设置壳仍从设置入口触发，再按可访问名称选择页面。
 */
export function pickSettingsSectionButton<T extends { textContent: string | null }>(
  buttons: readonly T[],
  labels: readonly string[],
): T | undefined {
  for (const label of labels) {
    const match = buttons.find(button => button.textContent?.trim() === label)
    if (match !== undefined) return match
  }
  return undefined
}

/**
 * 可选插件未注册设置入口时，直接打开兜底页，避免先展示通用设置并等待导航超时。
 */
export function routeOptionalSettingsSection(
  available: boolean,
  openRequested: () => void,
  openFallback: () => void,
): void {
  if (available) {
    openRequested()
    return
  }
  openFallback()
}

/** 官方 alpha.2 插件管理页占用 sidebar.panellist / main 的同一 id。 */
export const OFFICIAL_PLUGINS_PANEL_ID = 'plugins'

let cancelPendingNavigation: (() => void) | undefined
export const SETTINGS_NAVIGATION_TIMEOUT_MS = 4_000
export const SETTINGS_TRIGGER_SELECTOR = 'button[aria-haspopup="menu"],button[aria-haspopup="dialog"]'
export type SettingsNavigationRequest = { labels: readonly string[]; result?: 'selected' | 'missing' }

const SETTINGS_DIALOG_SELECTOR = '[data-shortcut-modal="settings"]'


function clickOfficialSettingsItem(): boolean {
  const items = [...document.querySelectorAll<HTMLButtonElement>('[role="menu"] [role="menuitem"]')]
  const target = items.find(item => /^(settings|设置|preferences|偏好设置)$/i.test(item.textContent?.trim() ?? '')) ?? items[0]
  if (target === undefined) return false
  target.click()
  return true
}

/** 通过官方账号菜单打开原生设置，让其自有 Store 与快捷键闭包保持连接。 */
export function openSettingsRoot(root: HTMLElement | null): void {
  if (document.querySelector(SETTINGS_DIALOG_SELECTOR) !== null) return
  const trigger = root?.querySelector<HTMLButtonElement>(SETTINGS_TRIGGER_SELECTOR)
  if (trigger === null || trigger === undefined) return
  if (trigger.getAttribute('aria-haspopup') === 'dialog') {
    trigger.click()
    return
  }
  if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
  const clickItem = (): boolean => clickOfficialSettingsItem()
  if (clickItem()) return
  const observer = new MutationObserver(() => {
    if (clickItem()) { observer.disconnect(); window.clearTimeout(timeout) }
  })
  const timeout = window.setTimeout(() => observer.disconnect(), SETTINGS_NAVIGATION_TIMEOUT_MS)
  observer.observe(document.body, { childList: true, subtree: true })
}

export function openSettingsSection(root: HTMLElement | null, label: string | readonly string[], onMissing?: () => void, onSelected?: () => void): void {
  const labels = typeof label === 'string' ? [label] : label
  cancelPendingNavigation?.()
  let finished = false
  let frame: number | undefined
  let observer: MutationObserver
  const cleanup = (): void => {
    if (finished) return
    finished = true
    observer.disconnect()
    window.clearTimeout(timeout)
    if (frame !== undefined) window.cancelAnimationFrame(frame)
    if (cancelPendingNavigation === cleanup) cancelPendingNavigation = undefined
  }
  const select = (): boolean => {
    const dialog = document.querySelector<HTMLElement>(SETTINGS_DIALOG_SELECTOR)
    if (dialog === null) return false
    const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('nav button')]
    const target = pickSettingsSectionButton(buttons, labels)
    if (target === undefined) return false
    cleanup()
    target.click()
    onSelected?.()
    return true
  }
  const schedule = (): void => {
    if (finished || frame !== undefined) return
    frame = window.requestAnimationFrame(() => {
      frame = undefined
      if (select()) return
      const trigger = root?.querySelector<HTMLButtonElement>(SETTINGS_TRIGGER_SELECTOR)
      if (trigger === null || trigger === undefined) return
      if (trigger.getAttribute('aria-haspopup') === 'dialog') {
        if (document.querySelector(SETTINGS_DIALOG_SELECTOR) === null) trigger.click()
        return
      }
      if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
      clickOfficialSettingsItem()
    })
  }
  observer = new MutationObserver(schedule)
  const timeout = window.setTimeout(() => {
    if (select()) return
    cleanup()
    console.warn(`[michengai-codex-ui] 未找到设置分区：${labels.join(' / ')}`)
    onMissing?.()
  }, SETTINGS_NAVIGATION_TIMEOUT_MS)
  observer.observe(document.body, { childList: true, subtree: true })
  cancelPendingNavigation = cleanup
  schedule()
}
