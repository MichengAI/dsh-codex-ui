import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { SidebarExpandControl, registerSidebarExpandControls } from '../src/client/SidebarExpandControl.tsx'
import { loadClientBundle } from './client-module-loader.ts'

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

test.each([false, true])('真实宿主注册器：窗口插槽声明在插件之后=%s，激活与卸载正常', async (lateDeclaration) => {
  const { SlotRegistry } = loadClientBundle('@deepseek-ai/dsh-client-ui-renderer/client') as {
    SlotRegistry: new (ctx: Context) => Context['slots']
  }
  const ctx = new Context()
  new SlotRegistry(ctx)
  const declare = () => ctx.slots.register({ name: 'root', children: {
    'shell.leading': { kind: 'single', scope: 'root' },
    'shell.overlay': { kind: 'list', scope: 'root' },
  } }, (_props: PropsRenderSlots<'shell.leading' | 'shell.overlay'>) => null)
  let removeRoot = lateDeclaration ? undefined : declare()
  const fork = ctx.plugin({ name: 'sidebar-expand-regression', apply: registerSidebarExpandControls })
  try {
    if (lateDeclaration) {
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(ctx.slots.entriesOfSlot('shell.overlay')).toHaveLength(0)
    }
    removeRoot ??= declare()
    // This is the exact runtime exception from the previous registration.
    expect(() => ctx.slots.register({ name: 'shell.overlay' } as never, (() => null) as never))
      .toThrow('list slot "shell.overlay" requires options.id')
    await vi.waitFor(() => {
      expect(ctx.slots.entriesOfSlot('shell.leading')).toHaveLength(1)
      expect(ctx.slots.entriesOfSlot('shell.overlay')).toHaveLength(1)
    })
    expect(ctx.slots.entriesOfSlot('shell.overlay')[0]?.options.id).toBe('michengai-codex-ui-sidebar-expand')
    await fork.dispose()
    await vi.waitFor(() => {
      expect(ctx.slots.entriesOfSlot('shell.leading')).toHaveLength(0)
      expect(ctx.slots.entriesOfSlot('shell.overlay')).toHaveLength(0)
    })
  } finally {
    await fork.dispose()
    removeRoot?.()
  }
})
