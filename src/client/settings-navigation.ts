/**
 * DSH 设置壳暂未提供按 section id 打开的公开 API。该兼容层只从本插件渲染
 * 的设置入口触发，再按壳的可访问名称选择页面；宿主升级时可集中替换。
 */
export function openSettingsSection(root: HTMLElement | null, label: string, onMissing?: () => void): void {
  const trigger = root?.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')
  if (trigger === null || trigger === undefined) {
    onMissing?.()
    return
  }
  trigger.click()
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const buttons = document.querySelectorAll<HTMLButtonElement>('[role="dialog"] nav button')
      for (const button of buttons) {
        if (button.textContent?.trim() === label) {
          button.click()
          return
        }
      }
      // 显式留痕而不是静默失效；不会影响用户仍可手动选择设置页。
      console.warn(`[michengai-codex-ui] 未找到设置分区：${label}`)
      onMissing?.()
    })
  })
}
