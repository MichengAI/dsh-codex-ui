/**
 * 官方已负责权限文案及布局；这里只给「完全访问权限」保留醒目的风险提示。
 */
export const PERMISSION_RISK_STYLE = 'button[role=menuitem][data-dcu-perm="danger-full-access"],button[role=menuitem][data-dcu-perm="danger-full-access"] *{color:var(--dsw-alias-state-warn-label,#e3942a)}'

const FULL_ACCESS_LABELS = [
  'Full access',
  'Full Access',
  'danger-full-access',
  '完全访问权限',
  '完全访问',
]

/** 不改动宿主文案，只识别完全访问权限选项以施加风险色。 */
export function isFullAccessPermission(text: string): boolean {
  const normalized = text.trim().replace(/\s+/g, ' ')
  return FULL_ACCESS_LABELS.some(label => normalized === label || normalized.includes(label))
}

export function markFullAccessPermissionMenus(root: ParentNode): number {
  let changed = 0
  for (const button of root.querySelectorAll('button[role="menuitem"]')) {
    if (!isFullAccessPermission((button.textContent ?? '').replace(/\s+/g, ' '))) continue
    if (button.getAttribute('data-dcu-perm') === 'danger-full-access') continue
    button.setAttribute('data-dcu-perm', 'danger-full-access')
    changed += 1
  }
  return changed
}

export function observePermissionMenus(): () => void {
  if (typeof document === 'undefined') return () => {}
  const styleId = 'dcu-permission-risk'
  if (document.getElementById(styleId) === null) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = PERMISSION_RISK_STYLE
    document.head.append(style)
  }
  let applying = false
  let frame: number | undefined
  const apply = (): void => {
    if (applying) return
    applying = true
    try { markFullAccessPermissionMenus(document) }
    finally { applying = false }
  }
  const schedule = (): void => {
    if (frame !== undefined) return
    frame = window.requestAnimationFrame(() => { frame = undefined; apply() })
  }
  apply()
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  return () => {
    observer.disconnect()
    if (frame !== undefined) window.cancelAnimationFrame(frame)
  }
}
