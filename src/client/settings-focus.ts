/** 设置页与宿主浮层共享的可交互判断，忽略隐藏及已被隔离的对话框。 */
export function settingsElementAvailable(element: HTMLElement): boolean {
  for (let node: HTMLElement | null = element; node !== null; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (node.inert || node.hidden || node.getAttribute('aria-hidden') === 'true'
      || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false
  }
  return true
}

export function settingsOverlays(selector = '[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]'): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(selector)].filter(settingsElementAvailable)
}
