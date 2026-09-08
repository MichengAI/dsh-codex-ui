import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { CodexSettingsPage, type CodexSettingsPageProps } from '../src/client/CodexSettingsPage.tsx'
import { filterSettingsRows, generalItemGroup } from '../src/client/settings-page-model.ts'
import { openSettingsSection } from '../src/client/settings-navigation.ts'
import { zh } from '../src/client/locales.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({ ConnectionIndicator: () => null }))
const { createRoot } = createRequire(import.meta.url)('react-dom/client') as { createRoot: (element: HTMLElement) => { render: (node: ReactNode) => void; unmount: () => void } }
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const rows = [{ id: 'general', label: '常规', order: 0 }, { id: 'models', label: '模型', order: 1 }, { id: 'third-party', label: '第三方插件', order: 2 }]
const source = <T,>(items: readonly T[]) => ({ getSnapshot: () => items, subscribe: () => () => {} })
const cleanups: Array<() => void> = []
afterEach(async () => { await act(async () => { cleanups.splice(0).forEach(cleanup => cleanup()) }); document.body.innerHTML = ''; vi.restoreAllMocks() })

async function mount(extra: Partial<CodexSettingsPageProps> = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const props = {
    wide: true, sections: source(rows), onboarding: source([]), connectionState: { getSnapshot: () => 'connected', subscribe: () => () => {} }, reconnect: () => {},
    useSessions: (selector: (value: object) => unknown) => selector({ phase: 'ready', byId: {} }),
    t: (key: keyof typeof zh) => zh[key],
    renderSlot: (name: string, owner: { close?: () => void }, options?: { only?: string }) => name === 'settings.trigger' ? '设置' : name === 'settings.section' ? createElement('button', { onClick: owner.close, 'data-section': options?.only }, '完成并返回') : null,
    ...extra,
  } as CodexSettingsPageProps
  await act(async () => { root.render(createElement(CodexSettingsPage, props)) })
  cleanups.push(() => root.unmount())
  const trigger = container.querySelector<HTMLButtonElement>('[data-dcu-settings-trigger]')!
  await act(async () => { trigger.click() })
  return { container, trigger }
}

test('退出设置恢复焦点和被覆盖分支，保留底层会话 DOM', async () => {
  const conversation = document.createElement('textarea')
  conversation.value = '尚未发送的内容'
  document.body.append(conversation)
  const { container, trigger } = await mount()
  expect(conversation.inert).toBe(true)
  expect(document.activeElement).toBe(container.querySelector('.dcu-settings-back'))
  await act(async () => { container.querySelector<HTMLButtonElement>('.dcu-settings-back')!.click() })
  expect(container.querySelector('[data-dcu-settings-page]')).toBeNull()
  expect(conversation.inert).not.toBe(true)
  expect(conversation.value).toBe('尚未发送的内容')
  expect(document.activeElement).toBe(trigger)
})

test('内层确认框独占 Escape，关闭确认框后 Escape 才返回应用', async () => {
  const { container } = await mount()
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  document.body.append(dialog)
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
  expect(container.querySelector('[data-dcu-settings-page]')).not.toBeNull()
  dialog.remove()
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
  expect(container.querySelector('[data-dcu-settings-page]')).toBeNull()
})

test('既有侧栏快捷入口可以在独立设置页选择对应插件', async () => {
  const { container } = await mount()
  await act(async () => { openSettingsSection(container, '模型'); await new Promise(resolve => setTimeout(resolve, 50)) })
  expect(container.querySelector('.dcu-settings-heading h1')).toBeNull()
  expect(container.querySelector('[aria-current="page"]')?.textContent).toBe('模型')
  expect(container.querySelector('[data-section=models]')).not.toBeNull()
  await act(async () => { container.querySelector<HTMLButtonElement>('[data-section=models]')!.click() })
  expect(container.querySelector('[data-dcu-settings-page]')).toBeNull()
})

test('搜索保留未知插件，空结果不会误选页面，条目分组覆盖新增项', () => {
  expect(filterSettingsRows(rows, '第三方').map(row => row.id)).toEqual(['third-party'])
  expect(filterSettingsRows(rows, 'MODELS').map(row => row.id)).toEqual(['models'])
  expect(filterSettingsRows(rows, '不存在')).toEqual([])
  expect(generalItemGroup('default-permission')).toBe('permissions')
  expect(generalItemGroup('composer-enter')).toBe('editor')
  expect(generalItemGroup('new-preference')).toBe('general')
})
