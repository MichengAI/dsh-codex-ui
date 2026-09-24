/** 设置页只投影已注册能力；未知插件保留在扩展组，不隐藏入口。 */
export type SettingsRow = { id: string; label: string; order: number }
export type SettingsGroup = 'personal' | 'integrations' | 'records'

export function settingsGroup(id: string): SettingsGroup {
  if (/archive|about/.test(id)) return 'records'
  if (/^(general|appearance|theme|language|shortcuts|voice|account)$/.test(id)) return 'personal'
  return 'integrations'
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
