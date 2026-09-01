import { restoreOfficialUserBubbles } from './conversation-bubbles.ts'

export const CONVERSATION_HEADER_STYLE_ID = 'dcu-conversation-header-style'
export const HEADER_PROJECT_TIP_EVENT = 'dcu-header-project-tip'
export const HEADER_SESSION_MENU_EVENT = 'dcu-header-session-menu'

// 宿主 header 的结构是 header > titleRow > titleCluster > [crumbs, headerActions] + headerUtilities，
// 页签（role=tablist）是 header 的直接子节点。这里只用 display:contents 把标题行摊平、
// 再用 order 重排为 [面包屑][操作区][页签][扩展区]，绝不物理搬移 React 管理的节点，
// 否则宿主重渲染时会因节点父级脱钩抛 NotFoundError 导致整个界面白屏。
export const CONVERSATION_HEADER_STYLE = `
header:has([data-dcu-inline-tabs]){box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;gap:10px;min-height:34px;padding-top:3px;padding-bottom:3px;border-bottom:0}
header:has([data-dcu-inline-tabs]):after{display:none;content:none}
header:has([data-dcu-inline-tabs]) [class*="titleRow"],header:has([data-dcu-inline-tabs]) [class*="titleCluster"]{display:contents}
header:has([data-dcu-inline-tabs]) [class*="crumbs"]{order:1;flex:1;min-width:0}
header:has([data-dcu-inline-tabs]) [class*="headerActions"]{order:2;flex:none}
header [data-dcu-inline-tabs]{box-sizing:border-box;order:3;flex:none;display:flex;align-items:center;gap:0;margin:0;padding:0;height:28px;position:relative;z-index:1;overflow:hidden;border:1px solid var(--dsw-alias-border-subtle,rgba(255,255,255,.12));border-radius:8px;background:var(--dsw-alias-background-secondary,rgba(255,255,255,.025))}
header:has([data-dcu-inline-tabs]) [class*="headerUtilities"]{order:4;flex:none}
header [data-dcu-tab-slider]{position:absolute;left:0;top:0;height:26px;border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-button-info-fill,#4c8dff) 18%,transparent);pointer-events:none;z-index:0;opacity:0;transform:translateX(0);width:0;transition:transform 240ms cubic-bezier(.16,1,.3,1),width 240ms cubic-bezier(.16,1,.3,1),opacity 160ms ease}
/* 顶栏统一使用 34px 控件带：与宿主扩展常用的 top:3px + 28px 图标按钮同心，
   外部插件按钮无需在展开/收起时改变位置。 */
header [data-dcu-inline-tabs] [role=tab]{box-sizing:border-box;position:relative;z-index:1;height:26px;padding:3px 10px;margin:0;line-height:20px;color:var(--dsw-alias-label-tertiary);border:0;box-shadow:none;background:transparent;font-size:13px;white-space:nowrap}
header [data-dcu-inline-tabs] [role=tab][aria-selected=true],header [data-dcu-inline-tabs] [role=tab][data-state=active]{color:var(--dsw-alias-button-info-fill,#4c8dff);font-weight:500}
header [data-dcu-inline-tabs] [role=tab]+[role=tab]{border-left:1px solid var(--dsw-alias-border-subtle,rgba(255,255,255,.08))}
header [data-dcu-inline-tabs] [role=tab]:after,header [data-dcu-inline-tabs] [role=tab]:before{display:none!important;content:none!important;background:transparent!important;height:0!important}
header [data-dcu-inline-tabs] [role=tab]:focus-visible,header [data-dcu-session-log-download]:focus-visible{outline:2px solid var(--dsw-alias-button-info-fill,#4c8dff);outline-offset:-2px}
header [data-dcu-session-log-download]{appearance:none;min-width:28px;width:28px;height:28px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary,currentColor);display:inline-grid;place-items:center;cursor:pointer}
header [data-dcu-session-log-download]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,currentColor)}
header [data-dcu-session-log-download]:disabled{color:var(--dsw-alias-label-dimmed,currentColor);cursor:wait}
header [data-dcu-session-log-download] > span{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
header [data-dcu-session-log-download] svg{width:16px;height:16px;flex:none}
header [data-dcu-title-folder],header [data-dcu-title-more]{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,currentColor);display:inline-grid;place-items:center;padding:0;cursor:pointer;border-radius:4px}
header [data-dcu-title-folder]{width:16px;height:20px}
header [data-dcu-title-more]{width:20px;height:20px}
header [data-dcu-title-folder]:hover,header [data-dcu-title-more]:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,currentColor)}
header [data-dcu-title-folder] svg,header [data-dcu-title-more] svg{display:block}
`

const FOLDER_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path fill="currentColor" transform="translate(1.5 2.429)" d="M5.05582 0.518756L4.50669 0.86654L5.05582 0.518756ZM13 9.4837L13.65 9.4837L13.65 3.53962L13 3.53962L12.35 3.53962L12.35 9.4837L13 9.4837ZM11.3264 1.86603L11.3264 1.21603L6.52313 1.21603L6.52313 1.86603L6.52313 2.51603L11.3264 2.51603L11.3264 1.86603ZM5.58054 1.34727L6.12968 0.999489L5.60495 0.170972L5.05582 0.518756L4.50669 0.86654L5.03141 1.69506L5.58054 1.34727ZM4.11323 1.23058e-13L4.11323 -0.65L1.67359 -0.65L1.67359 5.00699e-14L1.67359 0.65L4.11323 0.65L4.11323 1.23058e-13ZM0 1.67359L-0.65 1.67359L-0.65 9.4837L0 9.4837L0.65 9.4837L0.65 1.67359L0 1.67359ZM11.3264 11.1573L11.3264 10.5073L1.67359 10.5073L1.67359 11.1573L1.67359 11.8073L11.3264 11.8073L11.3264 11.1573ZM0 9.4837L-0.65 9.4837C-0.65 10.767 0.390308 11.8073 1.67359 11.8073L1.67359 11.1573L1.67359 10.5073C1.10828 10.5073 0.65 10.049 0.65 9.4837L0 9.4837ZM1.67359 5.00699e-14L1.67359 -0.65C0.390307 -0.65 -0.65 0.390309 -0.65 1.67359L0 1.67359L0.65 1.67359C0.65 1.10828 1.10828 0.65 1.67359 0.65L1.67359 5.00699e-14ZM5.05582 0.518756L5.60495 0.170972C5.28121 -0.340193 4.71829 -0.65 4.11323 -0.65L4.11323 1.23058e-13L4.11323 0.65C4.27282 0.65 4.4213 0.731715 4.50669 0.86654L5.05582 0.518756ZM6.52313 1.86603L6.52313 1.21603C6.36354 1.21603 6.21507 1.13431 6.12968 0.999489L5.58054 1.34727L5.03141 1.69506C5.35515 2.20622 5.91808 2.51603 6.52313 2.51603L6.52313 1.86603ZM13 3.53962L13.65 3.53962C13.65 2.25634 12.6097 1.21603 11.3264 1.21603L11.3264 1.86603L11.3264 2.51603C11.8917 2.51603 12.35 2.97431 12.35 3.53962L13 3.53962ZM13 9.4837L12.35 9.4837C12.35 10.049 11.8917 10.5073 11.3264 10.5073L11.3264 11.1573L11.3264 11.8073C12.6097 11.8073 13.65 10.767 13.65 9.4837L13 9.4837Z"/></svg>'
const MORE_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="4" cy="8" r="1.15" fill="currentColor"/><circle cx="8" cy="8" r="1.15" fill="currentColor"/><circle cx="12" cy="8" r="1.15" fill="currentColor"/></svg>'

export function findConversationTablist(root: ParentNode): HTMLElement | undefined {
  if ('matches' in root && typeof root.matches === 'function' && root.matches('[role=tablist]')) {
    return root as HTMLElement
  }
  return root.querySelector<HTMLElement>('header [role=tablist]') ?? undefined
}

/** 只给宿主页签打内联标记，视觉重排交给样式表；DOM 结构保持宿主原样。 */
export function placeConversationTabs(root: ParentNode): boolean {
  const tabs = findConversationTablist(root)
  if (tabs === undefined || tabs.dataset.dcuInlineTabs === '') return false
  tabs.dataset.dcuInlineTabs = ''
  return true
}

/** 把宿主的 Session log 胶囊标记成紧凑下载按钮；保留文本供无障碍名称使用。 */
export function decorateSessionLogDownload(root: ParentNode): boolean {
  const button = root.querySelector<HTMLButtonElement>('header [class*="headerUtilities"] button[class*="sessionLogButton"]')
  if (button === null || button.dataset.dcuSessionLogDownload === '') return false
  button.dataset.dcuSessionLogDownload = ''
  const label = button.querySelector('span')?.textContent?.trim()
  if (label !== undefined && label !== '') {
    if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', label)
    if (!button.hasAttribute('title')) button.setAttribute('title', label)
  }
  return true
}

export type HeaderAnchorDetail = {
  left: number
  top: number
  getRect: () => DOMRect
  toggle?: boolean
}

function emit(name: string, target: HTMLElement, extra: Partial<HeaderAnchorDetail> = {}): void {
  const box = target.getBoundingClientRect()
  target.dispatchEvent(new CustomEvent<HeaderAnchorDetail>(name, {
    bubbles: true,
    detail: {
      left: box.right + 8,
      top: box.top,
      getRect: () => target.getBoundingClientRect(),
      ...extra,
    },
  }))
}

function buildTitleButton(doc: Document, marker: 'folder' | 'more', svg: string, event: string, extra?: Partial<HeaderAnchorDetail>): HTMLButtonElement {
  const button = doc.createElement('button')
  button.type = 'button'
  if (marker === 'folder') button.dataset.dcuTitleFolder = ''
  else button.dataset.dcuTitleMore = ''
  button.innerHTML = svg
  button.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); emit(event, button, extra) })
  return button
}

/** 在标题前后插入文件夹/三点按钮：只插入插件自己的节点，不搬移宿主标题。 */
export function decorateConversationTitle(root: ParentNode): boolean {
  const title = root.querySelector<HTMLElement>('header [class*="crumbCurrent"]')
  if (title === null) return false
  const scope = title.closest('header') ?? title.ownerDocument
  // 宿主可能整体重建标题节点：清掉不再紧邻当前标题的旧按钮，避免残留出重复图标
  for (const stale of scope.querySelectorAll('[data-dcu-title-folder], [data-dcu-title-more]')) {
    if (stale.previousElementSibling !== title && stale.nextElementSibling !== title) stale.remove()
  }
  const folder = title.previousElementSibling
  const more = title.nextElementSibling
  if (folder?.matches('[data-dcu-title-folder]') === true && more?.matches('[data-dcu-title-more]') === true) return false
  // 装饰不完整（只剩一侧按钮）时先撤掉旧按钮，保证成对插入
  folder?.matches('[data-dcu-title-folder]') === true && folder.remove()
  more?.matches('[data-dcu-title-more]') === true && more.remove()
  const doc = title.ownerDocument
  title.before(buildTitleButton(doc, 'folder', FOLDER_SVG, HEADER_PROJECT_TIP_EVENT, { toggle: true }))
  title.after(buildTitleButton(doc, 'more', MORE_SVG, HEADER_SESSION_MENU_EVENT))
  return true
}


export function selectedConversationTab(tabs: HTMLElement): HTMLElement | undefined {
  return tabs.querySelector<HTMLElement>('[role=tab][aria-selected=true], [role=tab][data-state=active]') ?? undefined
}

export function syncTabSlider(root: ParentNode): void {
  const tabs = findConversationTablist(root)
  if (tabs === undefined) return
  const doc = tabs.ownerDocument
  let slider = tabs.querySelector<HTMLElement>('[data-dcu-tab-slider]')
  if (slider === null) {
    slider = doc.createElement('span')
    slider.dataset.dcuTabSlider = ''
    tabs.prepend(slider)
  }
  const selected = selectedConversationTab(tabs)
  if (selected === undefined) {
    slider.style.opacity = '0'
    return
  }
  const listBox = tabs.getBoundingClientRect()
  const tabBox = selected.getBoundingClientRect()
  slider.style.opacity = '1'
  slider.style.width = `${Math.max(0, tabBox.width)}px`
  slider.style.transform = `translateX(${Math.max(0, tabBox.left - listBox.left)}px)`
}

function watchTabSelection(tabs: HTMLElement): () => void {
  tabs.dataset.dcuTabWatch = ''
  const sync = (): void => { syncTabSlider(tabs) }
  const onClick = (): void => { window.requestAnimationFrame(sync) }
  const observer = new MutationObserver(sync)
  observer.observe(tabs, { attributes: true, subtree: true, attributeFilter: ['aria-selected', 'data-state'] })
  tabs.addEventListener('click', onClick)
  return () => {
    observer.disconnect()
    tabs.removeEventListener('click', onClick)
    delete tabs.dataset.dcuTabWatch
  }
}
function ensureStyle(doc: Document): void {
  if (doc.getElementById(CONVERSATION_HEADER_STYLE_ID) !== null) return
  const style = doc.createElement('style')
  style.id = CONVERSATION_HEADER_STYLE_ID
  style.textContent = CONVERSATION_HEADER_STYLE
  doc.head.append(style)
}

const CONVERSATION_DECORATION_SELECTOR = 'header'

function conversationDecorationMutation(records: readonly MutationRecord[]): boolean {
  const relevant = (node: Node): boolean => node instanceof Element && (
    node.matches(CONVERSATION_DECORATION_SELECTOR)
    || node.closest(CONVERSATION_DECORATION_SELECTOR) !== null
    || node.querySelector(CONVERSATION_DECORATION_SELECTOR) !== null
  )
  return records.some(record => relevant(record.target)
    || [...record.addedNodes].some(relevant)
    || [...record.removedNodes].some(relevant))
}

/** 观察会话顶栏；只对相关子树变更按帧合并，流式回答不会触发全文档扫描。 */
export function observeConversationHeader(doc: Document = document): () => void {
  if (doc.head === null || doc.body === null) return () => {}
  ensureStyle(doc)
  restoreOfficialUserBubbles(doc)
  let applying = false
  let frame: number | undefined
  let watchedTabs: HTMLElement | undefined
  let stopWatchingTabs: (() => void) | undefined
  const run = (): void => {
    frame = undefined
    if (applying) return
    applying = true
    try {
      placeConversationTabs(doc)
      const tabs = findConversationTablist(doc)
      if (tabs !== watchedTabs) {
        stopWatchingTabs?.()
        watchedTabs = tabs
        stopWatchingTabs = tabs === undefined ? undefined : watchTabSelection(tabs)
      }
      syncTabSlider(doc)
      decorateConversationTitle(doc)
      decorateSessionLogDownload(doc)
    } finally {
      applying = false
    }
  }
  const sync = (): void => {
    if (frame !== undefined) return
    frame = window.requestAnimationFrame(run)
  }
  sync()
  const observer = new MutationObserver(records => { if (conversationDecorationMutation(records)) sync() })
  observer.observe(doc.body, { childList: true, subtree: true })
  return () => {
    observer.disconnect()
    stopWatchingTabs?.()
    if (frame !== undefined) window.cancelAnimationFrame(frame)
  }
}
