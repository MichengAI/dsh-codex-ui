/** 设置页只投影已注册能力；未知插件保留在扩展组，不隐藏入口。 */
export type SettingsRow = { id: string; label: string; order: number }
export type SettingsGroup = 'personal' | 'integrations' | 'records'

/** 已知分区的显示顺序由 UI 插件固定。各插件自带 order 只用于同组未知项之间。 */
const SETTINGS_NAV: Record<SettingsGroup, readonly string[]> = {
  personal: ['account', 'general'],
  integrations: ['models', 'agent-presets', 'plugins', 'plugin-config', 'agency-agents', 'skills-manager', 'codex-pet', 'connectors', 'scheduled-tasks', 'im-assistant'],
  records: ['archived-sessions', 'about'],
}

const GROUP_INDEX: Record<SettingsGroup, number> = { personal: 0, integrations: 1, records: 2 }

export function settingsGroup(id: string): SettingsGroup {
  for (const group of ['personal', 'integrations', 'records'] as const) {
    if (SETTINGS_NAV[group].includes(id)) return group
  }
  if (/archive|about/.test(id)) return 'records'
  if (/^(general|appearance|theme|language|shortcuts|voice|account)$/.test(id)) return 'personal'
  return 'integrations'
}

/** 先按 UI 插件的固定顺位，未知项跟在同组已知项之后，彼此仍保持原 order。 */
export function orderSettingsRows(rows: readonly SettingsRow[]): SettingsRow[] {
  const rank = (row: SettingsRow) => {
    const group = settingsGroup(row.id)
    const known = SETTINGS_NAV[group].indexOf(row.id)
    const item = known >= 0 ? known : SETTINGS_NAV[group].length + Math.min(Math.max(row.order, 0), 1_000_000) / 1_000_000_000
    return GROUP_INDEX[group] * 1000 + item
  }
  return [...rows].sort((left, right) => rank(left) - rank(right) || left.id.localeCompare(right.id))
}

export function filterSettingsRows(rows: readonly SettingsRow[], query: string): readonly SettingsRow[] {
  const needle = query.trim().toLocaleLowerCase()
  return needle === '' ? rows : rows.filter(row => `${row.label} ${row.id}`.toLocaleLowerCase().includes(needle))
}

export function generalItemGroup(id: string): 'permissions' | 'general' | 'editor' {
  if (/permission|approval|sandbox/.test(id)) return 'permissions'
  if (/composer|font|conversation|chat|enter/.test(id)) return 'editor'
  return 'general'
}
