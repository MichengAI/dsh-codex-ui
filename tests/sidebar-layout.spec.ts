import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PINNED,
  FIXED_PANEL_IDS,
  SIDEBAR_LAYOUT_KEY,
  moveEntry,
  normalizeLayout,
  orderedPinned,
  parseLayout,
  serializeLayout,
} from '../src/client/sidebar/layout.ts'

describe('侧栏导航布局模型', () => {
  it('首次使用时除固定入口外全部收入更多', () => {
    const layout = normalizeLayout(undefined, ['plugins', 'skills', 'im', 'schedules'])
    expect(layout.pinned).toEqual([...DEFAULT_PINNED])
    expect(layout.more).toEqual(['skills', 'im', 'schedules'])
  })

  it('固定入口不会出现在更多里', () => {
    const layout = normalizeLayout({ pinned: ['plugins', 'skills'], more: ['plugins', 'im'] }, ['plugins', 'skills', 'im'])
    expect(layout.more).not.toContain('plugins')
    expect(layout.pinned).toEqual(['skills'])
  })

  it('新增入口追加到更多末尾且不改动已有顺序', () => {
    const layout = normalizeLayout({ pinned: ['skills'], more: ['im'] }, ['plugins', 'skills', 'im', 'schedules'])
    expect(layout.pinned).toEqual(['skills'])
    expect(layout.more).toEqual(['im', 'schedules'])
  })

  it('入口消失时移除，重新出现时追加到更多', () => {
    const layout = normalizeLayout({ pinned: ['skills'], more: ['im', 'schedules'] }, ['plugins', 'skills', 'im'])
    expect(layout.pinned).toEqual(['skills'])
    expect(layout.more).toEqual(['im'])
  })

  it('保存的顺序优先于宿主注册顺序', () => {
    const layout = normalizeLayout({ pinned: ['im', 'skills'], more: [] }, ['plugins', 'skills', 'im'])
    expect(orderedPinned(layout)).toEqual(['im', 'skills'])
  })

  it('可以从更多拖到常驻区的指定位置', () => {
    const layout = moveEntry(
      { pinned: ['skills'], more: ['im', 'schedules'] },
      { id: 'im', zone: 'pinned', index: 0 },
    )
    expect(layout.pinned).toEqual(['im', 'skills'])
    expect(layout.more).toEqual(['schedules'])
  })

  it('可以从常驻区拖回更多', () => {
    const layout = moveEntry(
      { pinned: ['skills', 'im'], more: ['schedules'] },
      { id: 'skills', zone: 'more', index: 1 },
    )
    expect(layout.pinned).toEqual(['im'])
    expect(layout.more).toEqual(['schedules', 'skills'])
  })

  it('同一区内拖动调整顺序', () => {
    const layout = moveEntry(
      { pinned: ['a', 'b', 'c'], more: [] },
      { id: 'c', zone: 'pinned', index: 0 },
    )
    expect(layout.pinned).toEqual(['c', 'a', 'b'])
  })

  it('固定入口拒绝移动', () => {
    const layout = moveEntry(
      { pinned: ['skills'], more: ['im'] },
      { id: 'plugins', zone: 'more', index: 0 },
    )
    expect(layout.pinned).toEqual(['skills'])
    expect(layout.more).toEqual(['im'])
  })

  it('未知入口不写入布局', () => {
    const layout = moveEntry(
      { pinned: ['skills'], more: [] },
      { id: 'missing', zone: 'pinned', index: 0 },
    )
    expect(layout.pinned).toEqual(['skills'])
    expect(layout.more).toEqual([])
  })

  it('落点索引超出范围时收敛到末尾', () => {
    const layout = moveEntry(
      { pinned: ['a'], more: ['b'] },
      { id: 'b', zone: 'pinned', index: 99 },
    )
    expect(layout.pinned).toEqual(['a', 'b'])
  })

  it('损坏的存储内容回退到默认布局', () => {
    expect(parseLayout('not json')).toBeUndefined()
    expect(parseLayout('{"pinned":"x"}')).toBeUndefined()
    expect(parseLayout(JSON.stringify({ pinned: ['a'], more: ['b'] }))).toEqual({ pinned: ['a'], more: ['b'] })
  })

  it('序列化后可以原样读回', () => {
    const raw = serializeLayout({ pinned: ['skills'], more: ['im'] })
    expect(parseLayout(raw)).toEqual({ pinned: ['skills'], more: ['im'] })
    expect(SIDEBAR_LAYOUT_KEY).toContain('sidebar')
    expect(FIXED_PANEL_IDS).toContain('plugins')
  })
})

