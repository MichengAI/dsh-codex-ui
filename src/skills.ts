export type SkillGroup = 'builtin' | 'installed'

/** DSH 将随发行包提供的技能标为 bundled，其余来源均是用户或项目安装的技能。 */
export function skillGroupOf(source: string): SkillGroup {
  return source === 'bundled' ? 'builtin' : 'installed'
}
