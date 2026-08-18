export const PERMISSION_I18N_STYLE = '[data-dcu-perm-title]{display:block;font-size:14px;line-height:20px;font-weight:500}[data-dcu-perm-desc]{display:block;margin-top:2px;color:var(--dcu-sidebar-secondary,#9ca39f);font-size:12px;line-height:18px;font-weight:400}button[role=menuitem][data-dcu-perm]{align-items:flex-start;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px}button[data-dcu-perm="danger-full-access"],button[data-dcu-perm="danger-full-access"] svg,button[data-dcu-perm="danger-full-access"] [data-dcu-perm-title],button[data-dcu-perm="danger-full-access"] [data-dcu-perm-desc]{color:var(--dsw-alias-state-warn-label,#e3942a)}'
export type PermissionId = 'read-only' | 'workspace-write' | 'danger-full-access' | 'custom'

export type PermissionCopy = {
  readonly title: string
  readonly description: string
  readonly trigger: string
}

const ENGLISH_ALIASES: ReadonlyArray<readonly [string, PermissionId]> = [
  ['Workspace Write', 'workspace-write'],
  ['workspace-write', 'workspace-write'],
  ['Read Only', 'read-only'],
  ['read-only', 'read-only'],
  ['Full access', 'danger-full-access'],
  ['Full Access', 'danger-full-access'],
  ['danger-full-access', 'danger-full-access'],
  ['Custom', 'custom'],
  ['custom', 'custom'],
]

const LOCAL_ALIASES: ReadonlyArray<readonly [string, PermissionId]> = [
  ['帮我批准', 'workspace-write'],
  ['Help me approve', 'workspace-write'],
  ['请求批准', 'read-only'],
  ['Request approval', 'read-only'],
  ['完全访问权限', 'danger-full-access'],
  ['完全访问', 'danger-full-access'],
  ['自定义', 'custom'],
]

/** 把宿主刚写上的英文权限名解析成本插件标识；英文优先于旧中文。 */
export function permissionIdFromLabel(text: string): PermissionId | undefined {
  const normalized = text.trim().replace(/\s+/g, ' ')
  for (const [alias, id] of ENGLISH_ALIASES) {
    if (normalized === alias || normalized.includes(alias)) return id
  }
  for (const [alias, id] of LOCAL_ALIASES) {
    if (normalized === alias || normalized.includes(alias)) return id
  }
  return undefined
}


/** 把夹在中文确认框里的 Full access 换成当前语言名称。 */
export function replaceFullAccessLabel(text: string, localized: string): string {
  if (localized === 'Full access') return text
  return text
    .replaceAll('Full access', ` ${localized} `)
    .replaceAll('Full Access', ` ${localized} `)
    .replace(/ {2,}/g, ' ')
    .replace(/ ([？?。，,！!])/g, '$1')
    .trim()
}

function replaceEmbeddedFullAccess(root: ParentNode, localized: string): number {
  if (typeof document === 'undefined' || localized === 'Full access') return 0
  const doc = root instanceof Document ? root : root.ownerDocument
  if (doc === null) return 0
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let changed = 0
  let node = walker.nextNode()
  while (node !== null) {
    const value = node.nodeValue
    if (value !== null && (value.includes('Full access') || value.includes('Full Access'))) {
      node.nodeValue = replaceFullAccessLabel(value, localized)
      changed += 1
    }
    node = walker.nextNode()
  }
  return changed
}
export function permissionCopy(id: PermissionId, t: (key: string) => string): PermissionCopy {
  return {
    title: t(`permission.${id}.title`),
    description: t(`permission.${id}.description`),
    trigger: t(`permission.${id}.trigger`),
  }
}

function leafTextSpans(root: ParentNode): Element[] {
  return [...root.querySelectorAll('span')].filter(span => span.childElementCount === 0 && (span.textContent ?? '').trim() !== '')
}

function visibleText(root: Element): string {
  return (root.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function applyCopy(label: Element, copy: PermissionCopy, asTrigger: boolean): void {
  const title = asTrigger ? copy.trigger : copy.title
  let titleNode = label.querySelector('[data-dcu-perm-title]')
  let descNode = label.querySelector('[data-dcu-perm-desc]')
  if (titleNode === null) {
    label.textContent = ''
    titleNode = label.ownerDocument.createElement('span')
    titleNode.setAttribute('data-dcu-perm-title', '1')
    label.append(titleNode)
  }
  if (titleNode.textContent !== title) titleNode.textContent = title
  if (asTrigger) {
    descNode?.remove()
    return
  }
  if (descNode === null) {
    descNode = label.ownerDocument.createElement('span')
    descNode.setAttribute('data-dcu-perm-desc', '1')
    label.append(descNode)
  }
  if (descNode.textContent !== copy.description) descNode.textContent = copy.description
}

/** 把当前文档里的权限选择器改成当前语言的 Codex 文案。 */
export function localizePermissionMenus(root: ParentNode, t: (key: string) => string): number {
  let changed = 0
  for (const button of root.querySelectorAll('button')) {
    const menuitem = button.getAttribute('role') === 'menuitem'
    const marked = button.getAttribute('data-dcu-perm') as PermissionId | null
    const spans = leafTextSpans(button)
    const id = permissionIdFromLabel(visibleText(button)) ?? marked ?? undefined
    if (id === undefined) continue
    const label = button.querySelector('[data-dcu-perm-title]')?.parentElement ?? spans[0]
    if (label === undefined) continue
    const copy = permissionCopy(id, t)
    const nextTitle = menuitem ? copy.title : copy.trigger
    const titleNode = label.querySelector('[data-dcu-perm-title]')
    const descNode = label.querySelector('[data-dcu-perm-desc]')
    if (marked === id && titleNode?.textContent === nextTitle && (menuitem ? descNode?.textContent === copy.description : descNode === null)) continue
    button.setAttribute('data-dcu-perm', id)
    applyCopy(label, copy, !menuitem)
    changed += 1
  }
  changed += replaceEmbeddedFullAccess(root, t('permission.danger-full-access.trigger'))
  return changed
}

export function observePermissionMenus(t: (key: string) => string): () => void {
  if (typeof document === 'undefined') return () => {}
  const styleId = 'dcu-permission-i18n'
  if (document.getElementById(styleId) === null) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = PERMISSION_I18N_STYLE
    document.head.append(style)
  }
  let applying = false
  let frame: number | undefined
  const apply = (): void => {
    if (applying) return
    applying = true
    try { localizePermissionMenus(document, t) }
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
