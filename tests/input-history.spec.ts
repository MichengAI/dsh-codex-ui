import { describe, expect, it } from 'vitest'
import { HISTORY_KEY, HistoryCursor, InputHistory } from '../src/client/input-history.ts'

describe('输入历史', () => {
  it('仅在没有新存储时导入旧 BTW 历史，保留旧键且后续仅写 Codex UI', () => {
    const data = new Map([['michengai.btw.history.v1', JSON.stringify({ a: ['旧输入'] })]])
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
    const history = new InputHistory(storage)
    expect(history.list('a')).toEqual(['旧输入'])
    expect(data.has(HISTORY_KEY)).toBe(true)
    history.add('a', '新输入')
    expect(JSON.parse(data.get('michengai.btw.history.v1')!)).toEqual({ a: ['旧输入'] })
    expect(new InputHistory(storage).list('a')).toEqual(['旧输入', '新输入'])
  })
  it('历史达到容量后裁剪旧内容，持久化结果仍可重新读取', () => {
    let saved = ''
    const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value } }
    const history = new InputHistory(storage)
    for (let index = 0; index < 320; index++) history.add(`scope-${index % 4}`, `${index}${'文'.repeat(7990)}`)
    expect(saved.length).toBeLessThanOrEqual(1_000_000)
    const reloaded = new InputHistory(storage)
    expect(reloaded.list('scope-3').at(-1)).toBe(history.list('scope-3').at(-1))
    expect(reloaded.list('scope-3').length).toBeGreaterThan(0)
  })
  it('按工作区隔离、去连续重复、保留多行并限制条数', () => {
    const history = new InputHistory(undefined, 2)
    history.add('a', '第一行\n第二行')
    history.add('a', '第一行\n第二行')
    history.add('a', '新输入')
    history.add('b', '其他项目')
    expect(history.list('a')).toEqual(['第一行\n第二行', '新输入'])
    history.add('a', '最新')
    expect(history.list('a')).toEqual(['新输入', '最新'])
    expect(history.list('b')).toEqual(['其他项目'])
  })
  it('上下键到头不循环，向下到底恢复草稿', () => {
    const cursor = new HistoryCursor()
    expect(cursor.move(-1, '', ['旧', '新'])).toBe('新')
    expect(cursor.move(-1, '新', ['旧', '新'])).toBe('旧')
    expect(cursor.move(-1, '旧', ['旧', '新'])).toBe('旧')
    expect(cursor.move(1, '旧', ['旧', '新'])).toBe('新')
    expect(cursor.move(1, '新', ['旧', '新'])).toBe('')
    expect(cursor.move(1, '', ['旧', '新'])).toBeUndefined()
  })
  it('不覆盖正在编辑的内容，编辑召回内容后退出', () => {
    const cursor = new HistoryCursor()
    expect(cursor.move(-1, '草稿', ['历史'])).toBeUndefined()
    expect(cursor.move(-1, '', ['历史'])).toBe('历史')
    expect(cursor.move(-1, '修改后的历史', ['历史'])).toBeUndefined()
  })
  it('损坏存储和存储失败不影响当前输入历史', () => {
    let warning = ''
    const history = new InputHistory({ getItem: () => '{', setItem: () => { throw new Error('已满') } }, 10, message => { warning = message })
    expect(history.list('a')).toEqual([])
    history.add('a', '输入')
    expect(history.list('a')).toEqual(['输入'])
    expect(warning).not.toBe('')
  })
})
