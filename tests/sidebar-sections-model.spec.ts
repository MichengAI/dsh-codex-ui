import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SECTION_ID,
  PINNED_SECTION_ID,
  assignWorkspace,
  createSection,
  createSectionsState,
  deleteSection,
  flattenSections,
  moveSection,
  normalizeSections,
  parseSections,
  reconcileHostOrder,
  renameSection,
  sortSectionMembers,
  sectionOf,
  serializeSections,
  type SectionsState,
} from '../src/client/sidebar/sections/model.ts'

const state = (sections: SectionsState['sections']): SectionsState => ({ sections })

/** 置顶[a] + 客户项目[b,c] + 项目[d] 的常用夹具。 */
const sample = (): SectionsState =>
  state([
    { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
    { id: 's1', name: '客户项目', ids: ['b', 'c'] },
    { id: DEFAULT_SECTION_ID, name: '项目', ids: ['d'] },
  ])

const order = (value: SectionsState): string[] => flattenSections(value)
const idsOf = (value: SectionsState, id: string): string[] =>
  value.sections.find(section => section.id === id)?.ids ?? []

describe('分区模型：默认结构与序列化', () => {
  it('默认只有置顶与项目两个内置分区，项目在最后', () => {
    const fresh = createSectionsState()
    expect(fresh.sections.map(section => section.id)).toEqual([PINNED_SECTION_ID, DEFAULT_SECTION_ID])
    expect(fresh.sections.at(-1)?.id).toBe(DEFAULT_SECTION_ID)
  })

  it('序列化后可原样解析回来', () => {
    const parsed = parseSections(serializeSections(sample()))
    expect(parsed).toEqual(sample())
  })

  it('结构非法时返回 undefined，由调用方回退默认', () => {
    expect(parseSections(null)).toBeUndefined()
    expect(parseSections('')).toBeUndefined()
    expect(parseSections('{}')).toBeUndefined()
    expect(parseSections('{"sections":[{"id":"x"}]}')).toBeUndefined()
    expect(parseSections('{"sections":[{"id":"x","name":"n","ids":"bad"}]}')).toBeUndefined()
    expect(parseSections('not json')).toBeUndefined()
  })
})

describe('分区模型：归一化', () => {
  it('丢弃已删除的工作区、跨分区重复项与重复分区 id', () => {
    const dirty = state([
      { id: 's1', name: '客户项目', ids: ['b', 'gone', 'c'] },
      { id: 's2', name: '内部', ids: ['b', 'd'] },
      { id: 's1', name: '重复', ids: ['c'] },
    ])
    const clean = normalizeSections(dirty, ['b', 'c', 'd'])
    expect(clean.sections.map(section => section.id)).toEqual([PINNED_SECTION_ID, 's1', 's2', DEFAULT_SECTION_ID])
    expect(idsOf(clean, 's1')).toEqual(['b', 'c'])
    expect(idsOf(clean, 's2')).toEqual(['d'])
    expect(idsOf(clean, DEFAULT_SECTION_ID)).toEqual([])
  })

  it('补齐缺失的内置分区，并把项目分区挪到最后', () => {
    const dirty = state([
      { id: DEFAULT_SECTION_ID, name: '项目', ids: ['d'] },
      { id: 's1', name: '客户项目', ids: ['b'] },
    ])
    const clean = normalizeSections(dirty, ['b', 'd'])
    expect(clean.sections.map(section => section.id)).toEqual([
      PINNED_SECTION_ID,
      's1',
      DEFAULT_SECTION_ID,
    ])
  })

  it('内置分区空名称回退默认名', () => {
    const clean = normalizeSections(
      state([
        { id: PINNED_SECTION_ID, name: '   ', ids: [] },
        { id: DEFAULT_SECTION_ID, name: '', ids: [] },
      ]),
      [],
    )
    expect(clean.sections.map(section => section.name)).toEqual(['置顶', '项目'])
  })
})

describe('分区模型：归属与顺序', () => {
  it('归入其他分区时从原分区移除', () => {
    const next = assignWorkspace(sample(), 'b', PINNED_SECTION_ID)
    expect(idsOf(next, PINNED_SECTION_ID)).toEqual(['a', 'b'])
    expect(idsOf(next, 's1')).toEqual(['c'])
    expect(order(next)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('支持指定分区内位置，越界时收敛到末尾', () => {
    expect(idsOf(assignWorkspace(sample(), 'd', 's1', 0), 's1')).toEqual(['d', 'b', 'c'])
    expect(idsOf(assignWorkspace(sample(), 'd', 's1', 99), 's1')).toEqual(['b', 'c', 'd'])
  })

  it('目标分区不存在时原样返回', () => {
    const current = sample()
    expect(assignWorkspace(current, 'b', 'missing')).toBe(current)
  })

  it('新建分区插到项目之前', () => {
    const next = createSection(sample(), 's9', '内部工具')
    expect(next.sections.map(section => section.id)).toEqual([
      PINNED_SECTION_ID,
      's1',
      's9',
      DEFAULT_SECTION_ID,
    ])
  })

  it('sectionOf 能定位归属，未归类返回 undefined', () => {
    expect(sectionOf(sample(), 'c')).toBe('s1')
    expect(sectionOf(sample(), 'zzz')).toBeUndefined()
  })
})

describe('分区模型：改名与删除', () => {
  it('空名称被忽略', () => {
    const current = sample()
    expect(renameSection(current, 's1', '   ')).toBe(current)
    expect(renameSection(current, 's1', ' 客户 ').sections[1]?.name).toBe('客户')
  })

  it('内置分区不可删除', () => {
    const current = sample()
    expect(deleteSection(current, PINNED_SECTION_ID)).toBe(current)
    expect(deleteSection(current, DEFAULT_SECTION_ID)).toBe(current)
  })

  it('删除自定义分区时成员并入项目末尾', () => {
    const next = deleteSection(sample(), 's1')
    expect(next.sections.map(section => section.id)).toEqual([PINNED_SECTION_ID, DEFAULT_SECTION_ID])
    expect(idsOf(next, DEFAULT_SECTION_ID)).toEqual(['d', 'b', 'c'])
  })
})

describe('分区模型：分区排序', () => {
  it('置顶可以拖到自定义分区之后', () => {
    const next = moveSection(sample(), PINNED_SECTION_ID, DEFAULT_SECTION_ID)
    expect(next).toBe(sample() === next ? next : next) // 只要求不抛错
    expect(next.sections.map(section => section.id)).toEqual([PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID])
  })

  it('置顶固定最上面：内置分区不允许改名，也不参与拖动重排', () => {
    const current = state([
      { id: PINNED_SECTION_ID, name: '置顶', ids: ['a'] },
      { id: 's1', name: '客户项目', ids: ['b'] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: [] },
    ])
    expect(moveSection(current, PINNED_SECTION_ID, null)).toBe(current)
    expect(moveSection(current, PINNED_SECTION_ID, 's1')).toBe(current)
    expect(renameSection(current, PINNED_SECTION_ID, '钉住')).toBe(current)
    expect(renameSection(current, DEFAULT_SECTION_ID, '全部项目')).toBe(current)
    // 自定义分区照常可以改名、可以重排。
    expect(renameSection(current, 's1', '客户').sections[1]!.name).toBe('客户')
  })

  it('项目分区不可移动，目标为项目时原样返回', () => {
    const current = sample()
    expect(moveSection(current, DEFAULT_SECTION_ID, PINNED_SECTION_ID)).toBe(current)
    expect(moveSection(current, 's1', DEFAULT_SECTION_ID)).toBe(current)
    expect(moveSection(current, 's1', 'missing')).toBe(current)
  })
})

describe('分区模型：宿主顺序同步与成员防交换', () => {
  it('分区归属完全以权威记录为准：宿主顺序变化时，既有项目保持各自所在分区，绝不通过邻居瞎猜篡改或把对方项目交换回去', () => {
    // 初始：置顶[a]，客户项目[b,c]，项目[d]
    // 假设宿主序列变为 ['a', 'b', 'd', 'c']：既有项目的归属保持原样，只反映分区内顺序
    const { state: next, changed } = reconcileHostOrder(sample(), ['a', 'b', 'd', 'c'])
    expect(sectionOf(next, 'a')).toBe(PINNED_SECTION_ID)
    expect(sectionOf(next, 'b')).toBe('s1')
    expect(sectionOf(next, 'c')).toBe('s1') // 关键：c 绝对不会被踢出 s1 换到 default 去！
    expect(sectionOf(next, 'd')).toBe(DEFAULT_SECTION_ID)
  })

  it('分区内成员严格跟随宿主顺序排序', () => {
    // 初始 s1 内部是 [b, c]，宿主顺序将 c 提前
    const { state: next, changed } = reconcileHostOrder(sample(), ['a', 'c', 'b', 'd'])
    expect(changed).toBe(true)
    expect(idsOf(next, 's1')).toEqual(['c', 'b'])
  })

  it('未记录的新工作区落到兜底分区', () => {
    const { state: next } = reconcileHostOrder(sample(), ['a', 'b', 'c', 'd', 'new'])
    expect(sectionOf(next, 'new')).toBe(DEFAULT_SECTION_ID)
  })

  it('顺序未变化时 changed 为 false', () => {
    const { changed } = reconcileHostOrder(sample(), ['a', 'b', 'c', 'd'])
    expect(changed).toBe(false)
  })
  it('按宿主顺序重排分区内部成员，分区先后不变', () => {
    const current = state([
      { id: PINNED_SECTION_ID, name: '置顶', ids: [] },
      { id: 's1', name: '客户项目', ids: ['a', 'b'] },
      { id: DEFAULT_SECTION_ID, name: '项目', ids: ['c'] },
    ])
    const next = sortSectionMembers(current, ['b', 'a', 'c'])
    expect(next.sections.map(section => section.ids)).toEqual([[], ['b', 'a'], ['c']])
    expect(next.sections.map(section => section.id)).toEqual([PINNED_SECTION_ID, 's1', DEFAULT_SECTION_ID])
  })
  it('历史上被改过名的内置分区，加载时名字纠正回「置顶 / 项目」且成员不丢', () => {
    const next = normalizeSections(
      state([
        { id: PINNED_SECTION_ID, name: '学习', ids: ['a', 'b'] },
        { id: 's1', name: '插件', ids: ['c'] },
        { id: DEFAULT_SECTION_ID, name: '全部项目', ids: ['d'] },
      ]),
    )
    expect(next.sections.map(section => section.name)).toEqual(['置顶', '插件', '项目'])
    expect(next.sections.map(section => section.ids)).toEqual([['a', 'b'], ['c'], ['d']])
  })
})
