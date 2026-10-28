/**
 * 侧栏导航布局模型：
 * 只保存「常驻顺序」与「收入更多的顺序」，入口本身仍由宿主注册与渲染。
 * 纯函数，方便单测；不读写 localStorage。
 */

/** 宿主固定的入口：始终常驻，不参与收纳与拖动。 */
export const FIXED_PANEL_IDS = ['plugins'] as const

/** 首次使用时默认常驻的入口（除固定入口外全部收入更多）。 */
export const DEFAULT_PINNED: readonly string[] = []

export const SIDEBAR_LAYOUT_KEY = 'michengai.codex-ui.sidebar-layout.v1'

export type SidebarZone = 'pinned' | 'more'

export interface SidebarLayout {
  pinned: string[]
  more: string[]
}

export interface SidebarDropTarget {
  id: string
  zone: SidebarZone
  index: number
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string')

/** 解析持久化内容；格式不符时返回 undefined，由调用方回退默认布局。 */
export function parseLayout(raw: string | null): SidebarLayout | undefined {
  if (raw === null || raw === '') return undefined
  try {
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return undefined
    const { pinned, more } = data as Record<string, unknown>
    if (!isStringArray(pinned) || !isStringArray(more)) return undefined
    return { pinned, more }
  } catch {
    return undefined
  }
}

export function serializeLayout(layout: SidebarLayout): string {
  return JSON.stringify({ pinned: layout.pinned, more: layout.more })
}

const isFixed = (id: string): boolean => (FIXED_PANEL_IDS as readonly string[]).includes(id)

/**
 * 把已保存布局与当前实际注册的入口对齐：
 * - 固定入口由宿主恒定渲染，不写入布局数据；
 * - 保存过但已消失的入口丢弃；
 * - 新出现的入口追加到更多末尾，不打断用户已有顺序；
 * - 同一入口不会同时出现在两个分区。
 */
export function normalizeLayout(saved: SidebarLayout | undefined, availableIds: readonly string[]): SidebarLayout {
  const available = new Set(availableIds.filter(id => !isFixed(id)))
  const seen = new Set<string>()
  const pinned: string[] = []

  for (const id of saved?.pinned ?? []) {
    if (!available.has(id) || seen.has(id)) continue
    seen.add(id)
    pinned.push(id)
  }

  const more: string[] = []
  for (const id of saved?.more ?? []) {
    if (!available.has(id) || seen.has(id)) continue
    seen.add(id)
    more.push(id)
  }

  for (const id of availableIds) {
    if (isFixed(id) || seen.has(id)) continue
    seen.add(id)
    more.push(id)
  }

  return { pinned, more }
}

/** 常驻区的实际渲染顺序。 */
export function orderedPinned(layout: SidebarLayout): string[] {
  return layout.pinned
}

/**
 * 把入口移动到目标分区的位置：
 * - 固定入口不可移动；
 * - 未知入口忽略；
 * - 越界索引收敛到末尾。
 */
export function moveEntry(layout: SidebarLayout, target: SidebarDropTarget): SidebarLayout {
  if (isFixed(target.id)) return layout
  const known = new Set([...layout.pinned, ...layout.more])
  if (!known.has(target.id)) return layout

  const pinned = layout.pinned.filter(id => id !== target.id)
  const more = layout.more.filter(id => id !== target.id)
  const bucket = target.zone === 'pinned' ? pinned : more
  const index = Number.isFinite(target.index) ? Math.max(0, Math.min(Math.trunc(target.index), bucket.length)) : bucket.length
  bucket.splice(index, 0, target.id)

  return { pinned, more }
}
