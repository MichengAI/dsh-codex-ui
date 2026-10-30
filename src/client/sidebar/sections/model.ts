/**
 * 工作区「分区」模型（纯函数，不触碰 DOM 与存储）。
 *
 * 分区是插件层的视图结构：宿主的工作区注册表仍是唯一事实来源，
 * 分区只决定「谁排在谁旁边」。因此模型里的分组成员顺序就是最终要写入宿主的顺序，
 * `flattenSections` 的结果与宿主 `workspaces` 的排列应当逐项一致。
 *
 * 不变式：
 * - 始终包含内置分区 `pinned`（置顶）与兜底分区 `default`（项目），且各只有一份；
 * - `default` 永远排在最后，`pinned` 可被拖到任意位置（Codex 同样允许）；
 * - 一个工作区最多出现在一个分区里，未知工作区在归一化时被丢弃。
 */

/** 内置「置顶」分区 id：可拖动、可重命名，但不能删除。 */
export const PINNED_SECTION_ID = 'pinned'

/** 兜底「项目」分区 id：固定最后，成员是尚未归类的工作区。 */
export const DEFAULT_SECTION_ID = 'default'

/** 持久化键；与侧栏导航布局分键，互不影响。 */
export const SECTIONS_STORAGE_KEY = 'michengai.codex-ui.workspace-sections.v1'

/** 一个分区的持久化形态。 */
export interface WorkspaceSection {
  /** 稳定标识；内置分区固定为 `pinned` / `default`。 */
  id: string
  /** 显示名称，用户可改名。 */
  name: string
  /** 成员工作区 id，顺序即分区内顺序。 */
  ids: string[]
}

/** 分区集合的持久化形态。 */
export interface SectionsState {
  sections: WorkspaceSection[]
}

/** 新建用户的默认分区结构：置顶 + 项目，没有自定义分区。 */
export function createSectionsState(): SectionsState {
  return {
    sections: [
      { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
    ],
  }
}

/** 判断是否内置分区（置顶与兜底），内置分区不允许删除。 */
export function isBuiltinSection(id: string): boolean {
  return id === PINNED_SECTION_ID || id === DEFAULT_SECTION_ID
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string')

/**
 * 解析持久化内容。
 * 结构不合法时返回 `undefined`，由调用方回退默认结构（与侧栏布局解析风格一致）。
 */
export function parseSections(raw: string | null | undefined): SectionsState | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined
  try {
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return undefined
    const sections = (data as { sections?: unknown }).sections
    if (!Array.isArray(sections)) return undefined
    const parsed: WorkspaceSection[] = []
    for (const item of sections) {
      if (typeof item !== 'object' || item === null) return undefined
      const record = item as Record<string, unknown>
      if (typeof record.id !== 'string' || record.id === '') return undefined
      if (typeof record.name !== 'string') return undefined
      if (!isStringArray(record.ids)) return undefined
      parsed.push({ id: record.id, name: record.name, ids: record.ids.slice() })
    }
    return { sections: parsed }
  } catch {
    return undefined
  }
}

/** 序列化为持久化字符串。 */
export function serializeSections(state: SectionsState): string {
  return JSON.stringify({ sections: state.sections })
}

/**
 * 用当前实际存在的工作区集合校正分区结构：
 * - 丢弃已删除的工作区、跨分区重复项（保留首次出现）与重复分区 id；
 * - 补齐缺失的内置分区，`default` 固定到最后；
 * - 名称空白的内置分区回退默认名。
 *
 * @param state - 待校正的结构。
 * @param knownIds - 宿主当前存在的工作区 id；省略时只做结构校正，不按存在性裁剪（启动早期宿主可能还没就绪）。
 * @returns 新的、满足不变式的结构。
 */
export function normalizeSections(
  state: SectionsState,
  knownIds?: readonly string[],
): SectionsState {
  const known = knownIds === undefined ? undefined : new Set(knownIds)
  const seenIds = new Set<string>()
  const seenSections = new Set<string>()
  const sections: WorkspaceSection[] = []

  for (const section of state.sections) {
    if (seenSections.has(section.id)) continue
    seenSections.add(section.id)
    const ids: string[] = []
    for (const id of section.ids) {
      if (seenIds.has(id)) continue
      if (known !== undefined && !known.has(id)) continue
      seenIds.add(id)
      ids.push(id)
    }
    // 内置分区的名字是固定语义（置顶/项目），历史上被改成别的名字的旧数据在这里纠正回来，
    // 否则改名功能下线后，用户那边就只剩一个「自己起的名字」，置顶看起来像丢了。
    const canonical = defaultNameFor(section.id)
    const name = canonical !== '' ? canonical : section.name.trim()
    sections.push({ id: section.id, name, ids })
  }

  if (!seenSections.has(PINNED_SECTION_ID)) {
    sections.unshift({ id: PINNED_SECTION_ID, name: defaultNameFor(PINNED_SECTION_ID), ids: [] })
  }
  const defaultIndex = sections.findIndex(section => section.id === DEFAULT_SECTION_ID)
  if (defaultIndex === -1) {
    sections.push({ id: DEFAULT_SECTION_ID, name: defaultNameFor(DEFAULT_SECTION_ID), ids: [] })
  } else if (defaultIndex !== sections.length - 1) {
    const [fallback] = sections.splice(defaultIndex, 1)
    sections.push(fallback!)
  }

  return { sections }
}

/** 内置分区的默认名称。 */
function defaultNameFor(id: string): string {
  if (id === PINNED_SECTION_ID) return '置顶'
  if (id === DEFAULT_SECTION_ID) return '项目'
  return ''
}

/** 查找某个工作区所属分区 id。 */
export function sectionOf(state: SectionsState, workspaceId: string): string | undefined {
  for (const section of state.sections) {
    if (section.ids.includes(workspaceId)) return section.id
  }
  return undefined
}

/** 按分区顺序摊平出的工作区顺序，即应当写入宿主的顺序。 */
export function flattenSections(state: SectionsState): string[] {
  const order: string[] = []
  for (const section of state.sections) order.push(...section.ids)
  return order
}

/**
 * 把工作区放进指定分区。
 *
 * @param state - 当前结构。
 * @param workspaceId - 目标工作区。
 * @param sectionId - 目标分区。
 * @param index - 分区内插入位置；省略时追加到分区末尾。
 * @returns 新的结构；分区不存在时原样返回。
 */
export function assignWorkspace(
  state: SectionsState,
  workspaceId: string,
  sectionId: string,
  index?: number,
): SectionsState {
  const target = state.sections.find(section => section.id === sectionId)
  if (target === undefined) return state

  const sections = state.sections.map(section => ({
    id: section.id,
    name: section.name,
    ids: section.ids.filter(id => id !== workspaceId),
  }))
  const next = sections.find(section => section.id === sectionId)!
  const at = index === undefined ? next.ids.length : Math.max(0, Math.min(index, next.ids.length))
  next.ids.splice(at, 0, workspaceId)
  return { sections }
}

/** 新建自定义分区，插到兜底分区之前。 */
export function createSection(state: SectionsState, id: string, name: string): SectionsState {
  const sections = state.sections.map(section => ({ ...section, ids: section.ids.slice() }))
  const defaultIndex = sections.findIndex(section => section.id === DEFAULT_SECTION_ID)
  const at = defaultIndex === -1 ? sections.length : defaultIndex
  sections.splice(at, 0, { id, name, ids: [] })
  return { sections }
}

/** 重命名分区；名称为空时忽略。 */
export function renameSection(state: SectionsState, sectionId: string, name: string): SectionsState {
  // 内置分区（置顶、项目）固定名称，用户不能改名；这样「置顶」才真的是置顶。
  if (isBuiltinSection(sectionId)) return state
  const trimmed = name.trim()
  if (trimmed === '') return state
  return {
    sections: state.sections.map(section =>
      section.id === sectionId ? { ...section, name: trimmed, ids: section.ids.slice() } : section,
    ),
  }
}

/**
 * 删除自定义分区，成员并入兜底分区末尾。
 * 内置分区（置顶、项目）不可删除，原样返回。
 */
export function deleteSection(state: SectionsState, sectionId: string): SectionsState {
  if (isBuiltinSection(sectionId)) return state
  const removed = state.sections.find(section => section.id === sectionId)
  if (removed === undefined) return state
  const sections = state.sections
    .filter(section => section.id !== sectionId)
    .map(section =>
      section.id === DEFAULT_SECTION_ID
        ? { ...section, ids: [...section.ids, ...removed.ids] }
        : { ...section, ids: section.ids.slice() },
    )
  return { sections }
}

/**
 * 按给定的项目顺序重排各分区内部的成员顺序（分区之间的先后不变）。
 *
 * 用户在某分区内拖动项目后，宿主顺序已经是目标顺序；这里把同样的顺序写回分区成员，
 * 后续同步的「权威顺序」就不会把这次拖动再拽回原位。
 */
export function sortSectionMembers(state: SectionsState, order: readonly string[]): SectionsState {
  const rank = new Map(order.map((id, index) => [id, index]))
  return {
    sections: state.sections.map(section => ({
      ...section,
      ids: section.ids
        .slice()
        .sort((left, right) => (rank.get(left) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right) ?? Number.MAX_SAFE_INTEGER)),
    })),
  }
}

/**
 * 调整分区顺序。
 *
 * @param state - 当前结构。
 * @param sectionId - 被移动的分区。
 * @param beforeSectionId - 插入到该分区之前；`null` 表示排到最后（兜底分区之前）。
 * @returns 新的结构；兜底分区不可移动，非法目标原样返回。
 */
export function moveSection(
  state: SectionsState,
  sectionId: string,
  beforeSectionId: string | null,
): SectionsState {
  // 置顶固定最上面、项目固定最下面，两个内置分区都不参与拖动重排。
  if (sectionId === DEFAULT_SECTION_ID || sectionId === PINNED_SECTION_ID) return state
  const moving = state.sections.find(section => section.id === sectionId)
  if (moving === undefined) return state
  if (beforeSectionId === DEFAULT_SECTION_ID || beforeSectionId === sectionId) return state

  const rest = state.sections.filter(section => section.id !== sectionId)
  let at = rest.length
  if (beforeSectionId !== null) {
    const index = rest.findIndex(section => section.id === beforeSectionId)
    if (index === -1) return state
    at = index
  }
  rest.splice(at, 0, moving)

  // 兜底分区永远最后，无论插入点怎么算。
  const fallbackIndex = rest.findIndex(section => section.id === DEFAULT_SECTION_ID)
  if (fallbackIndex !== -1 && fallbackIndex !== rest.length - 1) {
    const [fallback] = rest.splice(fallbackIndex, 1)
    rest.push(fallback!)
  }
  return { sections: rest }
}

/**
 * 用宿主的最新顺序校正归属（用户在原生树上直接拖动项目后调用）。
 *
 * 判定方式：把新旧顺序做前后缀比较，找出唯一被移动的项；它归入「新位置上方最近的邻居」所属分区，
 * 没有上方邻居时归入下方邻居的分区，两侧都没有则落到兜底分区。
 * 其余项保持原归属。返回结构的分区摊平结果与新顺序逐项一致。
 *
 * @param state - 拖动前的结构。
 * @param order - 宿主当前的完整工作区顺序。
 * @returns 校正后的结构与是否发生变化。
 */
export function reconcileHostOrder(
  state: SectionsState,
  order: readonly string[],
): { state: SectionsState; changed: boolean } {
  // 1. 已有项目的归属完全以 state 现有记录为准（用户显式拖拽与菜单操作才是权威事实源），
  //    绝对不根据平铺序列里的邻居去“猜测”归属，彻底根除“拖进新分区后把对方一个项目交换回来”的 Bug！
  const assignments = new Map<string, string>()
  for (const section of state.sections) {
    for (const id of section.ids) assignments.set(id, section.id)
  }

  // 2. 只有新出现且未记录的项（例如新创建的工作区），才默认进入兜底分区
  let added = false
  for (const id of order) {
    if (!assignments.has(id)) {
      assignments.set(id, DEFAULT_SECTION_ID)
      added = true
    }
  }

  // 3. 各分区内部成员按宿主出现的真实顺序排列，并自动过滤掉已删除项
  const sections = state.sections.map(section => {
    const ids = order.filter(id => assignments.get(id) === section.id)
    return {
      id: section.id,
      name: section.name,
      ids,
    }
  })

  const changed =
    added ||
    sections.some((section, index) => {
      const before = state.sections[index]
      if (before === undefined || before.ids.length !== section.ids.length) return true
      return before.ids.some((id, i) => id !== section.ids[i])
    })

  return { state: { sections }, changed }
}

/** 按归属把新顺序灌进各分区。 */
function rebuild(
  sections: readonly WorkspaceSection[],
  order: readonly string[],
  assignments: ReadonlyMap<string, string>,
): WorkspaceSection[] {
  const next = sections.map(section => ({ id: section.id, name: section.name, ids: [] as string[] }))
  const byId = new Map(next.map(section => [section.id, section]))
  for (const id of order) {
    const sectionId = assignments.get(id) ?? DEFAULT_SECTION_ID
    const section = byId.get(sectionId) ?? byId.get(DEFAULT_SECTION_ID)
    if (section === undefined) continue
    section.ids.push(id)
  }
  return next
}
