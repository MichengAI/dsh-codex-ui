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
export const SETTINGS_TRIGGER_SELECTOR = '[data-dcu-settings-trigger],[aria-haspopup="dialog"]'
export const SETTINGS_OPEN_SECTION_EVENT = 'dcu-settings-open-section'
export const SETTINGS_OPEN_ROOT_EVENT = 'dcu-settings-open-root'
export type SettingsNavigationRequest = { labels: readonly string[]; result?: 'selected' | 'missing' }
const SETTINGS_OWNER_SELECTOR = '[data-dcu-settings-owner]'

/** 根入口与分区跳转使用同一触发器合约，兼容保留的宿主设置壳。 */
export function openSettingsRoot(root: HTMLElement | null): void {
  const owner = root?.querySelector<HTMLElement>(SETTINGS_OWNER_SELECTOR)
  if (owner && !owner.dispatchEvent(new CustomEvent(SETTINGS_OPEN_ROOT_EVENT, { cancelable: true }))) return
  root?.querySelector<HTMLButtonElement>(SETTINGS_TRIGGER_SELECTOR)?.click()
}

export function openSettingsSection(root: HTMLElement | null, label: string | readonly string[], onMissing?: () => void, onSelected?: () => void): void {
  const labels = typeof label === 'string' ? [label] : label
  const trigger = root?.querySelector<HTMLElement>(SETTINGS_OWNER_SELECTOR) ?? root?.querySelector<HTMLButtonElement>(SETTINGS_TRIGGER_SELECTOR)
  if (trigger === null || trigger === undefined) {
    onMissing?.()
    return
  }
  const opening = cancelPendingNavigation !== undefined
  cancelPendingNavigation?.()
  // 自有设置壳在一次状态提交中打开目标分区；旧壳仍走下方 DOM 导航。
  const request = new CustomEvent(SETTINGS_OPEN_SECTION_EVENT, { detail: { labels }, cancelable: true })
  const detail: SettingsNavigationRequest = { labels }
  const ownerRequest = new CustomEvent(SETTINGS_OPEN_SECTION_EVENT, { detail, cancelable: true })
  if (trigger.hasAttribute('data-dcu-settings-owner')) {
    trigger.dispatchEvent(ownerRequest)
    if (detail.result === 'selected') onSelected?.()
    else onMissing?.()
    return
  }
  if (!trigger.dispatchEvent(request)) { onSelected?.(); return }
  const pageSelector = trigger.hasAttribute('data-dcu-settings-trigger') ? '[data-dcu-settings-page]' : '[role="dialog"]'
  if (!opening && document.querySelector(pageSelector) === null) trigger.click()
  let frame: number | undefined
  let finished = false
  const observer = new MutationObserver(() => { schedule() })
  const cleanup = (): void => {
    if (finished) return
    finished = true
    observer.disconnect()
    window.clearTimeout(timeout)
    if (frame !== undefined) window.cancelAnimationFrame(frame)
    if (cancelPendingNavigation === cleanup) cancelPendingNavigation = undefined
  }
  const select = (): boolean => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>(`${pageSelector} nav button`)]
    const target = pickSettingsSectionButton(buttons, labels)
    if (target === undefined) return false
    cleanup()
    target.click()
    onSelected?.()
    return true
  }
  const schedule = (): void => {
    if (finished || frame !== undefined) return
    frame = window.requestAnimationFrame(() => { frame = undefined; select() })
  }
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
