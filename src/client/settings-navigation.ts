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

export function openSettingsSection(root: HTMLElement | null, label: string | readonly string[], onMissing?: () => void): void {
  const labels = typeof label === 'string' ? [label] : label
  const trigger = root?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')
  if (trigger === null || trigger === undefined) {
    onMissing?.()
    return
  }
  trigger.click()
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const buttons = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] nav button')]
      const target = pickSettingsSectionButton(buttons, labels)
      if (target !== undefined) {
        target.click()
        return
      }
      // 显式留痕而不是静默失效；不会影响用户仍可手动选择设置页。
      console.warn(`[michengai-codex-ui] 未找到设置分区：${labels.join(' / ')}`)
      onMissing?.()
    })
  })
}
