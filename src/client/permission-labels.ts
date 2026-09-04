type LocaleSnapshot = {
  active: string
}

export type PermissionLabelLocale = {
  getSnapshot?: () => LocaleSnapshot
  subscribe?: (listener: () => void) => () => void
}

type PermissionLabelDefinition = {
  aliases: readonly string[]
  en: string
  zh: string
}

const PERMISSION_LABELS: readonly PermissionLabelDefinition[] = [
  { aliases: ['Read Only', 'preset.readOnly', '只读'], en: 'Read Only', zh: '只读' },
  { aliases: ['Workspace Write', 'preset.workspaceWrite', '工作区写入'], en: 'Workspace Write', zh: '工作区写入' },
  { aliases: ['Full access', 'preset.fullAccess', '完全访问'], en: 'Full access', zh: '完全访问' },
]

const INTERACTIVE_SELECTOR = 'button, [role="menuitem"], [role="menuitemradio"], [role="option"]'

function targetLabel(value: string, activeLocale: string): string | undefined {
  const definition = PERMISSION_LABELS.find(item => item.aliases.includes(value))
  if (definition === undefined) return undefined
  return activeLocale.toLowerCase().startsWith('zh') ? definition.zh : definition.en
}

function applyPermissionLabel(element: Element, activeLocale: string): boolean {
  const document = element.ownerDocument
  const showText = document.defaultView?.NodeFilter.SHOW_TEXT ?? 4
  const walker = document.createTreeWalker(element, showText)
  let changed = false
  let node = walker.nextNode()
  while (node !== null) {
    const value = node.nodeValue ?? ''
    const trimmed = value.trim()
    const next = targetLabel(trimmed, activeLocale)
    if (next !== undefined && next !== trimmed) {
      node.nodeValue = value.replace(trimmed, next)
      changed = true
    }
    node = walker.nextNode()
  }
  return changed
}

/** 只修正权限选择控件里的内置预设名称，不改动正文或自定义权限名称。 */
export function localizePermissionLabels(root: ParentNode, activeLocale: string): number {
  let changed = 0
  const rootElement = root.nodeType === 1 ? root as Element : undefined
  const elements = rootElement?.matches(INTERACTIVE_SELECTOR) === true
    ? [rootElement, ...rootElement.querySelectorAll(INTERACTIVE_SELECTOR)]
    : [...root.querySelectorAll(INTERACTIVE_SELECTOR)]
  for (const element of elements) {
    if (applyPermissionLabel(element, activeLocale)) changed += 1
  }
  return changed
}

/** 兼容宿主设置页和 Chat 中由官方组件直接输出的英文权限名称。 */
export function observePermissionLabels(locale: PermissionLabelLocale): () => void {
  if (typeof document === 'undefined' || document.body === null) return () => {}
  let applying = false
  let frame: number | undefined
  const pendingRoots = new Set<ParentNode>([document])
  const apply = (): void => {
    if (applying) return
    applying = true
    const active = [locale.getSnapshot?.().active, document.documentElement.lang, window.navigator.language]
      .find(value => typeof value === 'string' && value.trim() !== '') ?? 'zh'
    const roots = [...pendingRoots]
    pendingRoots.clear()
    try { for (const root of roots) localizePermissionLabels(root, active) }
    finally { applying = false }
  }
  const schedule = (): void => {
    if (frame !== undefined) return
    frame = window.requestAnimationFrame(() => { frame = undefined; apply() })
  }
  apply()
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target as Element : record.target.parentElement
      const control = target?.closest(INTERACTIVE_SELECTOR)
      if (control !== null && control !== undefined) pendingRoots.add(control)
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches(INTERACTIVE_SELECTOR) || node.querySelector(INTERACTIVE_SELECTOR) !== null) pendingRoots.add(node)
      }
    }
    if (pendingRoots.size > 0) schedule()
  })
  observer.observe(document.body, { childList: true, characterData: true, subtree: true })
  const unsubscribe = locale.subscribe?.(() => { pendingRoots.add(document); schedule() }) ?? (() => {})
  return () => {
    observer.disconnect()
    unsubscribe()
    if (frame !== undefined) window.cancelAnimationFrame(frame)
  }
}
