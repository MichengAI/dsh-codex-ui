export const SUITE_PACKAGE = '@michengai/dsh-codex-suite'

export const SUITE_MEMBER_PACKAGES = [
  '@michengai/dsh-codex-ui',
  '@michengai/dsh-agency-agents',
  '@michengai/dsh-skills-manager',
  '@michengai/dsh-archive-manager',
  '@michengai/dsh-im-connect',
  '@michengai/dsh-automation',
] as const

export const MANAGED_DEPENDENCIES = [
  { id: 'ui', packageName: '@michengai/dsh-codex-ui' },
  { id: 'experts', packageName: '@michengai/dsh-agency-agents' },
  { id: 'skills', packageName: '@michengai/dsh-skills-manager' },
  { id: 'archive', packageName: '@michengai/dsh-archive-manager' },
  { id: 'im', packageName: '@michengai/dsh-im-connect' },
  { id: 'schedule', packageName: '@michengai/dsh-automation' },
  { id: 'market', packageName: 'dshmarket' },
] as const

export type ManagedDependencyId = typeof MANAGED_DEPENDENCIES[number]['id']

export function managedDependency(id: string | null): typeof MANAGED_DEPENDENCIES[number] | undefined {
  return MANAGED_DEPENDENCIES.find(dependency => dependency.id === id)
}