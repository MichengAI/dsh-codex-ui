/**
 * DSH 设置壳暂未提供按 section id 打开的公开 API。该兼容层只从本插件渲染
 * 的设置入口触发，再按壳的可访问名称选择页面；宿主升级时可集中替换。
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

let cancelPendingNavigation: (() => void) | undefined

export function openSettingsSection(root: HTMLElement | null, label: string | readonly string[], onMissing?: () => void, onSelected?: () => void): void {
  const labels = typeof label === 'string' ? [label] : label
  const trigger = root?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')
  if (trigger === null || trigger === undefined) {
    onMissing?.()
    return
  }
  const opening = cancelPendingNavigation !== undefined
  cancelPendingNavigation?.()
  if (!opening && document.querySelector('[role="dialog"]') === null) trigger.click()
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
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] nav button')]
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
  }, 1_500)
  observer.observe(document.body, { childList: true, subtree: true })
  cancelPendingNavigation = cleanup
  schedule()
}
