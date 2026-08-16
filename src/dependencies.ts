export const MANAGED_DEPENDENCIES = [
  { id: 'ui', packageName: '@michengai/dsh-codex-ui' },
  { id: 'experts', packageName: '@michengai/dsh-agency-agents' },
  { id: 'skills', packageName: '@michengai/dsh-skills-manager' },
  { id: 'archive', packageName: '@michengai/dsh-archive-manager' },
] as const

export type ManagedDependencyId = typeof MANAGED_DEPENDENCIES[number]['id']

export function managedDependency(id: string | null): typeof MANAGED_DEPENDENCIES[number] | undefined {
  return MANAGED_DEPENDENCIES.find(dependency => dependency.id === id)
}
