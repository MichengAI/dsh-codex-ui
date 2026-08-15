export type SidebarSearchItem = {
  readonly id: string
  readonly label: string
  readonly keywords: string
}

/** 按用户可见名称和辅助关键词筛选侧栏搜索结果。 */
export function filterSidebarSearchItems<T extends SidebarSearchItem>(items: readonly T[], query: string): T[] {
  const needle = query.trim().toLocaleLowerCase()
  if (needle === '') return [...items]
  return items.filter(item => `${item.label} ${item.keywords}`.toLocaleLowerCase().includes(needle))
}
