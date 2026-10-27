/**
 * 为 Codex UI 在 DSH 原生设置导航中补上专属的 16x16 矢量图标。
 * 遵循与 dshmarket / dsh-automation 一致的非侵入式属性标记与 CSS mask 伪元素标准。
 */

export const CODEX_UI_NAV_MARKER = 'data-dcu-nav-icon'
const NAV_ROW_SELECTOR = '[role="dialog"] nav button, [data-shortcut-modal="settings"] nav button'
const STYLE_ID = 'dcu-settings-nav-icon-style'

/** 16x16 窗口+侧边栏布局矢量图标（黑底用于 mask alpha 裁剪） */
const CODEX_UI_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="1.5" y="2" width="13" height="12" rx="2" stroke="black" stroke-width="1.3" fill="none"/><line x1="5.5" y1="2" x2="5.5" y2="14" stroke="black" stroke-width="1.3"/><line x1="5.5" y1="5.5" x2="14.5" y2="5.5" stroke="black" stroke-width="1.3"/></svg>'

const ICON_MASK_URL = `url("data:image/svg+xml,${encodeURIComponent(CODEX_UI_ICON_SVG)}")`

const NAV_ICON_CSS = `
[${CODEX_UI_NAV_MARKER}="codex-ui"] > svg { display: none !important; }
[${CODEX_UI_NAV_MARKER}="codex-ui"]::before {
  content: '';
  flex: none;
  width: 16px;
  height: 16px;
  background-color: currentColor;
  -webkit-mask: ${ICON_MASK_URL} center / contain no-repeat;
  mask: ${ICON_MASK_URL} center / contain no-repeat;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: 16px 16px;
  mask-size: 16px 16px;
}
`

function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID) !== null) return
  const style = doc.createElement('style')
  style.id = STYLE_ID
  style.textContent = NAV_ICON_CSS
  ;(doc.head ?? doc.documentElement).appendChild(style)
}

function matchesLabel(text: string, getLabel: () => string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase()
  const expected = getLabel().trim().toLowerCase()
  return normalized === expected || normalized === 'codex ui'
}

export function applyNavIcon(button: HTMLButtonElement, getLabel: () => string): boolean {
  const text = button.textContent ?? ''
  if (matchesLabel(text, getLabel)) {
    if (button.getAttribute(CODEX_UI_NAV_MARKER) === 'codex-ui') return false
    const doc = button.ownerDocument ?? document
    ensureStyle(doc)
    button.setAttribute(CODEX_UI_NAV_MARKER, 'codex-ui')
    return true
  }
  if (button.getAttribute(CODEX_UI_NAV_MARKER) === 'codex-ui') {
    button.removeAttribute(CODEX_UI_NAV_MARKER)
    return true
  }
  return false
}

export function observeSettingsNavIcon(getLabel: () => string, doc: Document = document): () => void {
  if (typeof doc === 'undefined' || doc.body === null) return () => {}

  const scan = (root: ParentNode): void => {
    if (root instanceof HTMLButtonElement && root.matches(NAV_ROW_SELECTOR)) {
      applyNavIcon(root, getLabel)
      return
    }
    const buttons = root.querySelectorAll?.<HTMLButtonElement>(NAV_ROW_SELECTOR) ?? []
    for (const btn of buttons) applyNavIcon(btn, getLabel)
  }

  scan(doc)

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement
      const owner = target?.closest?.(NAV_ROW_SELECTOR)
      if (owner instanceof HTMLButtonElement) applyNavIcon(owner, getLabel)
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) scan(node)
      }
    }
  })

  observer.observe(doc.body, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    doc.querySelectorAll<HTMLButtonElement>(`[${CODEX_UI_NAV_MARKER}="codex-ui"]`).forEach(btn => {
      btn.removeAttribute(CODEX_UI_NAV_MARKER)
    })
    doc.getElementById(STYLE_ID)?.remove()
  }
}
