export type SettingsNavGroup = 'personal' | 'integrations' | 'records'

export interface SettingsNavGroupSpec {
  id: SettingsNavGroup
  order: number
  labelKey: string
  defaultZh: string
  defaultEn: string
}

export const SETTINGS_NAV_GROUPS: readonly SettingsNavGroupSpec[] = [
  { id: 'personal', order: 100, labelKey: 'settings.personal', defaultZh: '个人', defaultEn: 'Personal' },
  { id: 'integrations', order: 200, labelKey: 'settings.integrations', defaultZh: '集成', defaultEn: 'Integrations' },
  { id: 'records', order: 300, labelKey: 'settings.records', defaultZh: '记录与应用', defaultEn: 'Records and app' },
]

/**
 * 菜单分组模型：
 * 仅置顶「个人」（账号与通用）与置底「记录与应用」（归档与关于），
 * 其余所有项不设规则枚举，统统自动归入「集成」，保持宿主与第三方生态的纯天然扩展性。
 */
export function classifySettingsButton(text: string): SettingsNavGroup {
  const normalized = text.trim().toLowerCase()

  // 1. 个人偏好组（置顶核心个人设置）
  if (/^(账号|账户|余额|account|balance)/i.test(normalized)) {
    return 'personal'
  }
  if (/^(通用|常规|偏好|general|preferences)/i.test(normalized)) {
    return 'personal'
  }

  // 2. 记录与应用组（置底固定记录与关于）
  if (/^(归档|已归档|历史|archive|archived)/i.test(normalized)) {
    return 'records'
  }
  if (/^(关于|codex ui|about)/i.test(normalized)) {
    return 'records'
  }

  // 3. 其余所有项无需人工指定，统统自动归入「集成」
  return 'integrations'
}
