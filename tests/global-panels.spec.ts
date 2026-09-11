// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test, vi } from 'vitest'
import { GlobalPanelButtons, createGlobalPanelSource } from '../src/client/global-panels.tsx'

test('面板注册、重命名、移除和语言更新实时同步并释放订阅', () => {
  let entries = [{ options: { id: 'files', order: 2, label: () => '文件' } }]
  const listeners = new Set<() => void>()
  const subscribe = (_name: unknown, fn?: () => void) => { const listener = fn ?? _name as () => void; listeners.add(listener); return () => { listeners.delete(listener) } }
  const source = createGlobalPanelSource({ entriesOfSlot: () => entries, subscribe }, { subscribe: listener => subscribe(listener) })
  const changed = vi.fn()
  const off = source.subscribe(changed)
  expect(source.getSnapshot().map(p => p.label)).toEqual(['文件'])
  const first = source.getSnapshot()
  expect(source.getSnapshot()).toBe(first)
  listeners.forEach(fn => fn())
  expect(source.getSnapshot()).toBe(first)
  entries = [{ options: { id: 'files', order: 2, label: () => 'Files' } }]
  listeners.forEach(fn => fn())
  expect(source.getSnapshot()[0]?.label).toBe('Files')
  entries = []
  listeners.forEach(fn => fn())
  expect(source.getSnapshot()).toEqual([])
  off()
  expect(listeners.size).toBe(0)
})

test.each([true, false])('面板入口可切换、返回会话和显示选中状态；展开=%s', async wide => {
  const mount = document.createElement('div'); document.body.append(mount)
  const root = createRoot(mount), select = vi.fn()
  try {
    await act(async () => root.render(createElement(GlobalPanelButtons, {
      panels: [{ id: 'files', label: '文件', order: 1 }], activeId: 'files', wide,
      conversationLabel: '会话', selectPanel: select, renderIcon: (_id, active) => active ? '●' : '○',
    })))
    const panel = mount.querySelector<HTMLButtonElement>('[aria-label="文件"]')!
    expect(panel.getAttribute('aria-current')).toBe('page')
    panel.click()
    mount.querySelector<HTMLButtonElement>('[aria-label="会话"]')!.click()
    expect(select.mock.calls).toEqual([['files'], [null]])
  } finally { await act(async () => root.unmount()); mount.remove() }
})
