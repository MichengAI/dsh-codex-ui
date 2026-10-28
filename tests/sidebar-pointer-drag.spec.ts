import { describe, expect, it, vi } from 'vitest'
import { moveEntry, normalizeLayout } from '../src/client/sidebar/layout.ts'

describe('侧栏指针拖拽逻辑验证', () => {
  it('从更多拖动到常驻区正确更新并持久化', () => {
    let layout = normalizeLayout({ pinned: [], more: ['skills', 'im'] }, ['plugins', 'skills', 'im'])
    expect(layout.pinned).toEqual([])
    expect(layout.more).toEqual(['skills', 'im'])

    // 拖动 skills 到 pinned 的末尾 (index 0)
    layout = moveEntry(layout, { id: 'skills', zone: 'pinned', index: 0 })
    expect(layout.pinned).toEqual(['skills'])
    expect(layout.more).toEqual(['im'])

    // 再拖动 im 到 pinned 的技能后面 (index 1)
    layout = moveEntry(layout, { id: 'im', zone: 'pinned', index: 1 })
    expect(layout.pinned).toEqual(['skills', 'im'])
    expect(layout.more).toEqual([])

    // 拖回更多 (index 0)
    layout = moveEntry(layout, { id: 'skills', zone: 'more', index: 0 })
    expect(layout.pinned).toEqual(['im'])
    expect(layout.more).toEqual(['skills'])
  })
})
