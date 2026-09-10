/** 只适配由输入区工具触发的菜单；保留原条目、选择回调及目录创建流程。 */
const TOOL = '[class*="_heroWorkspaceRow"] button,[data-composer-card] button[aria-haspopup],[data-composer-card] button[aria-expanded]'
const MENU = '[role="menu"],[role="listbox"]'

export const COMPOSER_TOOL_MENU_STYLE = `
[class*="_heroWorkspaceRow"] button{min-height:28px;border-radius:999px;font-size:13px;line-height:20px}
[class*="_heroWorkspaceRow"] button:hover,[class*="_heroWorkspaceRow"] button[aria-expanded=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]){box-sizing:border-box;max-height:var(--dcu-tool-menu-height,360px)!important;padding:5px!important;border-radius:18px!important;background:#fff!important;color:var(--dsw-alias-label-primary);box-shadow:0 8px 32px #0002,0 0 0 1px #0000000a!important;display:flex;flex-direction:column;gap:0;z-index:1100}
/* 原生菜单保留宿主宽度约束；Git 弹窗沿用独立尺寸，避免观察器标记前后跳变。 */
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover])[data-gitgraph-popover]{min-width:0!important;width:262px;max-width:calc(100vw - 24px)}
:is([data-dcu-tool-menu=inline],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal]))[data-gitgraph-popover]{width:320px}
[data-dcu-tool-menu=portal]{position:fixed!important;left:var(--dcu-tool-menu-x)!important;top:var(--dcu-tool-menu-y)!important;bottom:auto!important;right:auto!important}
:is([data-dcu-tool-menu=inline],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal])){translate:var(--dcu-tool-menu-shift,0px) 0}
[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal]){top:auto!important;bottom:calc(100% + 4px)!important}
body[data-ds-dark-theme] :is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]){background:#292929!important;box-shadow:0 8px 32px #0003,0 0 0 1px #ffffff08!important}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover])>[class*="_viewport"]{min-height:0;max-height:none;overflow-y:auto;scrollbar-width:thin}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) :is([role=menuitem],[role=menuitemradio],[role=menuitemcheckbox],[role=option]){box-sizing:border-box;min-height:28px;padding:4px 9px;gap:8px;border-radius:8px;font-size:13px;line-height:20px}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) :is([role=menuitem],[role=menuitemradio],[role=option]):hover:not(:disabled),:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_selected"],:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [aria-selected=true],:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [aria-checked=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_itemIcon"] svg{width:16px;height:16px}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_footer"]{flex:none;margin-top:5px;padding-top:5px;border-top:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
[data-dcu-tool-filter]{box-sizing:border-box;flex:none;width:100%;height:32px;padding:4px 10px;margin:0 0 1px;border:0;border-radius:8px;outline:none;background:transparent;color:inherit;font:13px/20px var(--dsw-font-family,system-ui)}
[data-dcu-tool-filter]:focus-visible{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent)}
[data-dcu-tool-empty]{padding:8px 10px;font-size:13px;color:var(--dsw-alias-label-secondary)}
[data-dcu-tool-filtered]{display:none!important}
/* 建议菜单单独换肤：外框跟随宿主输入区，保留宿主定位和动态高度，不给内部列表套固定宽度。 */
[data-conversation-scroll] [data-trigger-menu]{box-sizing:border-box;left:0;right:0;width:auto;min-width:0;max-width:none;padding:5px;border-radius:18px;background:#fff;box-shadow:0 8px 32px #0002,0 0 0 1px #0000000a}
body[data-ds-dark-theme] [data-conversation-scroll] [data-trigger-menu]{background:#292929;box-shadow:0 8px 32px #0003,0 0 0 1px #ffffff08}
[data-conversation-scroll] [data-trigger-menu]>[role=listbox]{box-sizing:border-box;width:100%;min-width:0;align-self:stretch;scrollbar-width:thin}
[data-conversation-scroll] [data-trigger-menu] [role=option]{box-sizing:border-box;width:100%;min-width:0;min-height:28px;padding:4px 9px;gap:8px;border-radius:8px;font-size:13px;line-height:20px}
[data-conversation-scroll] [data-trigger-menu] [role=option][aria-selected=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
`

export function observeComposerToolMenus(copy: { search: string; empty: string }): () => void {
  let anchor: HTMLElement | undefined
  let known = new Set<Element>()
  let pendingUntil = 0
  const mounted = new Map<HTMLElement, () => void>()
  const now = () => Date.now()
  function capture(event: Event) {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(TOOL) : null
    if (target === null || target.closest('[data-conversation-scroll]') === null) return
    anchor = target
    known = new Set(document.querySelectorAll(MENU))
    pendingUntil = now() + 1000
  }
  function mount(menu: HTMLElement, trigger: HTMLElement) {
    const portal = getComputedStyle(menu).position === 'fixed'
    menu.setAttribute('data-dcu-tool-menu', portal ? 'portal' : 'inline')
    const isProject = trigger.matches('[class*="_heroWorkspaceRow"]>button:first-child')
    const viewport = menu.querySelector<HTMLElement>(':scope>[class*="_viewport"]')
    let input: HTMLInputElement | undefined
    let empty: HTMLElement | undefined
    if (isProject && viewport !== null && menu.querySelector('input') === null) {
      input = document.createElement('input')
      input.type = 'search'
      input.placeholder = copy.search
      input.setAttribute('aria-label', copy.search)
      input.setAttribute('data-dcu-tool-filter', '')
      empty = document.createElement('div')
      empty.setAttribute('data-dcu-tool-empty', '')
      empty.setAttribute('role', 'status')
      empty.textContent = copy.empty
      empty.hidden = true
      menu.prepend(input)
      viewport.after(empty)
      input.addEventListener('input', () => {
        const query = input!.value.trim().toLocaleLowerCase()
        let count = 0
        for (const row of viewport.children) {
          const match = (row.textContent ?? '').toLocaleLowerCase().includes(query)
          row.toggleAttribute('data-dcu-tool-filtered', !match)
          if (match) count++
        }
        empty!.hidden = count > 0
        place()
      })
      input.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown' && event.key !== 'Enter') return
        const first = viewport.querySelector<HTMLButtonElement>(':scope>:not([data-dcu-tool-filtered]) button:not(:disabled)')
        if (first !== null) { event.preventDefault(); event.stopPropagation(); first.focus(); if (event.key === 'Enter') first.click() }
      })
    }
    function place() {
      if (!trigger.isConnected || !menu.isConnected) return
      const rect = trigger.getBoundingClientRect()
      const above = rect.top - 16
      const below = window.innerHeight - rect.bottom - 16
      const topSide = above >= Math.min(260, below)
      menu.style.setProperty('--dcu-tool-menu-height', `${Math.max(60, Math.min(360, topSide ? above : below))}px`)
      if (!portal) {
        const previous = parseFloat(menu.style.getPropertyValue('--dcu-tool-menu-shift')) || 0
        const bounds = menu.getBoundingClientRect()
        const naturalLeft = bounds.left - previous
        const left = Math.max(12, Math.min(naturalLeft, window.innerWidth - bounds.width - 12))
        menu.style.setProperty('--dcu-tool-menu-shift', `${left - naturalLeft}px`)
        return
      }
      const bounds = menu.getBoundingClientRect()
      const x = Math.max(12, Math.min(rect.left, window.innerWidth - bounds.width - 12))
      const y = Math.max(12, topSide ? rect.top - bounds.height - 4 : rect.bottom + 4)
      menu.style.setProperty('--dcu-tool-menu-x', `${x}px`)
      menu.style.setProperty('--dcu-tool-menu-y', `${y}px`)
    }
    const resize = new ResizeObserver(place)
    resize.observe(menu)
    resize.observe(trigger)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    place()
    mounted.set(menu, () => {
      resize.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      input?.remove()
      empty?.remove()
      menu.querySelectorAll('[data-dcu-tool-filtered]').forEach(row => row.removeAttribute('data-dcu-tool-filtered'))
      menu.removeAttribute('data-dcu-tool-menu')
      for (const property of ['--dcu-tool-menu-x', '--dcu-tool-menu-y', '--dcu-tool-menu-height', '--dcu-tool-menu-shift']) menu.style.removeProperty(property)
    })
  }
  function sync() {
    for (const [menu, dispose] of mounted) if (!menu.isConnected) { dispose(); mounted.delete(menu) }
    if (anchor === undefined || now() > pendingUntil) return
    for (const menu of document.querySelectorAll<HTMLElement>(MENU)) {
      // @ 和指令建议的 listbox 是全宽外框内部的滚动区，不能套用工具弹窗的固定宽度。
      if (menu.closest('[data-trigger-menu]') !== null) continue
      if (known.has(menu) || mounted.has(menu) || menu.parentElement?.closest(MENU) !== null) continue
      if (menu.getClientRects().length === 0) continue
      mount(menu, anchor)
      pendingUntil = 0
      break
    }
  }
  const observer = new MutationObserver(sync)
  observer.observe(document.body, { childList: true, subtree: true })
  document.addEventListener('pointerdown', capture, true)
  document.addEventListener('keydown', captureKey, true)
  function captureKey(event: KeyboardEvent) { if (['Enter', ' ', 'ArrowDown'].includes(event.key)) capture(event) }
  return () => {
    observer.disconnect()
    document.removeEventListener('pointerdown', capture, true)
    document.removeEventListener('keydown', captureKey, true)
    mounted.forEach(dispose => dispose())
    mounted.clear()
  }
}
