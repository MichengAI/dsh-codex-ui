import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { expect, test, vi } from 'vitest'
import { SidebarExpandControl } from '../src/client/SidebarExpandControl.tsx'

const { createRoot } = createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}

test('窗口展开按钮支持鼠标和键盘原生按钮语义，并随插槽卸载', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const toggleSidebar = vi.fn()
  try {
    await act(async () => { root.render(createElement(SidebarExpandControl, { toggleSidebar, t: () => '展开侧边栏' })) })
    const button = container.querySelector('button')!
    expect(button.type).toBe('button')
    expect(button.getAttribute('aria-label')).toBe('展开侧边栏')
    button.focus()
    expect(document.activeElement).toBe(button)
    await act(async () => { button.click() })
    expect(toggleSidebar).toHaveBeenCalledOnce()
  } finally {
    await act(async () => { root.unmount() })
    expect(container.childElementCount).toBe(0)
    container.remove()
  }
})
