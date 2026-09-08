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


test('隐藏或已隔离的无关对话框不阻止 Escape 返回', async () => {
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  document.body.append(dialog)
  const { container, trigger } = await mount()
  expect(trigger.inert).toBe(true)
  expect(dialog.inert).toBe(true)
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
  expect(container.querySelector('[data-dcu-settings-page]')).toBeNull()
})

test('设置打开时内联引导仍可完成，迟挂载背景不能抢走焦点', async () => {
  const { container } = await mount({
    onboarding: source([{ id: 'first-run' }]),
    renderSlot: ((name: string, owner: { complete?: () => void }) => name === 'settings.onboarding'
      ? createElement('button', { 'data-onboarding-test': true, onClick: owner.complete }, '完成引导') : null) as CodexSettingsPageProps['renderSlot'],
  })
  const onboarding = container.querySelector<HTMLButtonElement>('[data-onboarding-test]')!
  expect(onboarding.closest('[inert]')).toBeNull()
  expect(onboarding.inert).not.toBe(true)
  const late = document.createElement('button')
  document.body.append(late)
  late.focus()
  expect(document.activeElement).toBe(container.querySelector('.dcu-settings-back'))
  await act(async () => { onboarding.click() })
  expect(container.querySelector('[data-onboarding-test]')).toBeNull()
})

test('新设置页直接提供互不重复的社区插件图标', async () => {
  const { container } = await mount({ sections: source([
    ...rows, {id:'market',label:'插件市场',order:3}, {id:'better-sidebar',label:'侧边卡片',order:4},
  ]) })
  expect(container.querySelector('.dcu-settings-nav .lucide-store')).not.toBeNull()
  expect(container.querySelector('.dcu-settings-nav .lucide-panel-right')).not.toBeNull()
})


test('Shift+Tab 在设置内部循环，隐藏的迟挂载 dialog 不拦截 Escape', async () => {
 const {container}=await mount()
 const back=container.querySelector<HTMLButtonElement>('.dcu-settings-back')!
 const last=container.querySelector<HTMLButtonElement>('[data-section]')!
 back.focus()
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}))
 expect(document.activeElement).toBe(last)
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}))
 expect(document.activeElement).toBe(back)
 const hidden=document.createElement('div');hidden.setAttribute('role','dialog');hidden.style.display='none';document.body.append(hidden)
 await act(async()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))})
 expect(container.querySelector('[data-dcu-settings-page]')).toBeNull()
})

test('已有引导 portal 保留交互，设置退出不改写原始 inert 状态', async () => {
 const overlay=document.createElement('div');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');const next=document.createElement('button');overlay.append(next);document.body.append(overlay)
 const background=document.createElement('div');background.inert=true;document.body.append(background)
 const {container}=await mount({onboarding:source([{id:'portal-step'}])})
 expect(overlay.inert).not.toBe(true)
 next.focus();expect(document.activeElement).toBe(next)
 await act(async()=>{container.querySelector<HTMLButtonElement>('.dcu-settings-back')!.click()})
 expect(background.inert).toBe(true)
})


test('搜索弹窗尚未卸载也能从快捷入口打开设置分区', async () => {
 const {container}=await mount()
 await act(async()=>{container.querySelector<HTMLButtonElement>('.dcu-settings-back')!.click()})
 const search=document.createElement('div');search.setAttribute('role','dialog');document.body.append(search)
 await act(async()=>{openSettingsSection(container,'模型')})
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,50))})
 expect(container.querySelector('[data-section=models]')).not.toBeNull()
})


test('引导只保留模态区域，同包装的背景菜单仍被隔离', async () => {
  const branch = document.createElement('div')
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  const next = document.createElement('button')
  dialog.append(next)
  const menu = document.createElement('div')
  menu.setAttribute('role', 'menu')
  branch.append(dialog, menu)
  document.body.append(branch)
  const { container } = await mount({ onboarding: source([{ id: 'guide' }]) })
  expect(dialog.inert).not.toBe(true)
  expect(menu.inert).toBe(true)
  next.focus()
  expect(document.activeElement).toBe(next)
  await act(async () => { container.querySelector<HTMLButtonElement>('.dcu-settings-back')!.click() })
  expect(menu.inert).not.toBe(true)
})

test.each(['menu', 'listbox'])('Escape 只关闭 %s，下一次才退出设置', async role => {
  const { container } = await mount()
  const popup = document.createElement('div')
  popup.setAttribute('role', role)
  document.body.append(popup)
  const dismiss = () => popup.remove()
  document.addEventListener('keydown', dismiss, { once: true })
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })) })
  expect(popup.isConnected).toBe(false)
  expect(container.querySelector('[data-dcu-settings-page]')).not.toBeNull()
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })) })
  expect(container.querySelector('[data-dcu-settings-page]')).toBeNull()
})

test('过滤提示随匹配与选择变化，过滤本身不卸载当前正文', async () => {
  const { container } = await mount()
  const original = container.querySelector('[data-section=general]')
  const input = container.querySelector<HTMLInputElement>('input[type=search]')!
  const search = async (value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  await search('第三方')
  expect(container.querySelector('[role=status]')?.textContent).toBe(zh['settings.filterHint'])
  expect(container.querySelector('[data-section=general]')).toBe(original)
  await act(async () => { container.querySelector<HTMLButtonElement>('.dcu-settings-link')!.click() })
  expect(container.querySelector('[role=status]')).toBeNull()
  expect(container.querySelector('[data-section=third-party]')).not.toBeNull()
  await search('不存在')
  expect(container.querySelector('[role=status]')?.textContent).toBe(zh['settings.noResults'])
  expect(container.querySelector('[data-section=third-party]')).not.toBeNull()
  await search('')
  expect(container.querySelector('[role=status]')).toBeNull()
})
