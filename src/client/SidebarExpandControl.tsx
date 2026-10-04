import { IconPanelLeftOutlineMedium } from './host-icons.ts'
import type { Context } from '@deepseek-ai/cordis'
import { NS } from './locales.ts'

export const SIDEBAR_EXPAND_STYLE = `
.dcu-shell-expand{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border-radius:50%;cursor:pointer;-webkit-app-region:no-drag}
.dcu-shell-expand svg{display:block;width:16px;height:16px}
.dcu-shell-expand:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dcu-shell-expand:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}
.dcu-shell-expand-windows{display:none;position:fixed;left:12px;top:calc((var(--dsh-windows-titlebar-height,40px) - 28px) / 2);z-index:30}
html[data-windows-titlebar] [data-sidebar-collapsed] [data-shell-overlay] .dcu-shell-expand-windows{display:inline-flex}
html[data-windows-titlebar]:has([data-sidebar-collapsed] .dcu-shell-expand-windows){--dsh-windows-menu-start:48px}
html[data-windows-titlebar][data-fullscreen] .dcu-shell-expand-windows{top:3px}
html[data-windows-titlebar][data-fullscreen] [data-sidebar-collapsed]{--dsh-frame-leading-clearance:60px}
html[data-windows-titlebar][data-fullscreen] [data-sidebar-collapsed] header:has([data-dcu-inline-tabs]){padding-inline-start:60px}
`

/** The host mounts shell.leading only for a collapsed macOS sidebar. Windows
 * uses shell.overlay so the caption button survives the zero-width column. */
export function SidebarExpandControl({ toggleSidebar, t, windows = false }: {
  toggleSidebar: () => void
  t: (key: 'sidebar.expand') => string
  windows?: boolean
}) {
  return <><style>{SIDEBAR_EXPAND_STYLE}</style><button type="button"
    className={`dcu-shell-expand${windows ? ' dcu-shell-expand-windows' : ''}`}
    aria-label={t('sidebar.expand')} onClick={toggleSidebar}>
    <IconPanelLeftOutlineMedium size={16} />
  </button></>
}

export function registerSidebarExpandControls(ctx: Context): void {
  ctx.slots.inject('shell.leading', () => ctx.slots.register({
    name: 'shell.leading',
    registrant: 'michengai-codex-ui',
    locale: NS,
    inject: () => ({ toggleSidebar: () => { ctx.layout.toggleSidebar() }, windows: false }),
  }, SidebarExpandControl))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'michengai-codex-ui-sidebar-expand',
    registrant: 'michengai-codex-ui',
    locale: NS,
    inject: () => ({ toggleSidebar: () => { ctx.layout.toggleSidebar() }, windows: true }),
  }, SidebarExpandControl))
}
