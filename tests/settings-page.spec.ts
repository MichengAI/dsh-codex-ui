import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { CodexSettingsPage, type CodexSettingsPageProps } from '../src/client/CodexSettingsPage.tsx'
import { filterSettingsRows, generalItemGroup, settingsGroup } from '../src/client/settings-page-model.ts'
import { openSettingsSection } from '../src/client/settings-navigation.ts'
import { zh } from '../src/client/locales.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({ ConnectionIndicator: () => null }))
const { createRoot } = createRequire(import.meta.url)('react-dom/client') as { createRoot: (element: HTMLElement) => { render: (node: ReactNode) => void; unmount: () => void } }
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const rows = [{ id: 'general', label: '常规', order: 0 }, { id: 'models', label: '模型', order: 1 }, { id: 'third-party', label: '第三方插件', order: 2 }]
const source = <T,>(items: readonly T[]) => ({ getSnapshot: () => items, subscribe: () => () => {} })
const cleanups: Array<() => void> = []
afterEach(async () => { await act(async () => { cleanups.splice(0).forEach(cleanup => cleanup()) }); document.body.innerHTML = ''; vi.restoreAllMocks() })

const settingsPage = () => document.querySelector<HTMLElement>('[data-dcu-settings-page]')
const inSettings = <T extends Element>(selector: string) => document.querySelector<T>(selector)

async function mount(extra: Partial<CodexSettingsPageProps> = {}, parent: HTMLElement = document.body) {
  const container = document.createElement('div')
  parent.append(container)
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

test('关闭后普通入口回到常规，快捷入口仍能指定分区', async () => {
  const { container, trigger } = await mount()
  await act(async () => { openSettingsSection(container, '模型'); await new Promise(resolve => setTimeout(resolve, 50)) })
  await act(async () => { inSettings<HTMLButtonElement>('.dcu-settings-back')!.click() })
  await act(async () => { trigger.click() })
  expect(inSettings('[aria-current="page"]')?.textContent).toBe('常规')
  await act(async () => { inSettings<HTMLButtonElement>('.dcu-settings-back')!.click() })
  await act(async () => { openSettingsSection(container, '模型') })
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)) })
  expect(inSettings('[aria-current="page"]')?.textContent).toBe('模型')
})

test('关闭状态的快捷入口首次渲染就是目标分区，不闪过常规', async () => {
  const rendered: string[] = []
  const { container } = await mount({ renderSlot: ((name: string, _owner: unknown, options?: { only?: string }) => {
    if (name === 'settings.section' && options?.only) rendered.push(options.only)
    return null
  }) as CodexSettingsPageProps['renderSlot'] })
  await act(async () => { inSettings<HTMLButtonElement>('.dcu-settings-back')!.click() })
  rendered.length = 0
  await act(async () => { openSettingsSection(container, '模型') })
  expect(rendered).toEqual(['models'])
})

test('退出设置恢复焦点和被覆盖分支，保留底层会话 DOM', async () => {
  const conversation = document.createElement('textarea')
  conversation.value = '尚未发送的内容'
  document.body.append(conversation)
  const { container, trigger } = await mount()
  expect(conversation.inert).toBe(true)
  expect(document.activeElement).toBe(inSettings('.dcu-settings-back'))
  await act(async () => { inSettings<HTMLButtonElement>('.dcu-settings-back')!.click() })
  expect(settingsPage()).toBeNull()
  expect(conversation.inert).not.toBe(true)
  expect(conversation.value).toBe('尚未发送的内容')
  expect(document.activeElement).toBe(trigger)
})

test('内层确认框独占 Escape，关闭确认框后 Escape 才返回应用', async () => {
  await mount()
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  document.body.append(dialog)
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
  expect(settingsPage()).not.toBeNull()
  dialog.remove()
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
  expect(settingsPage()).toBeNull()
})

test('既有侧栏快捷入口可以在独立设置页选择对应插件', async () => {
  const { container } = await mount()
  await act(async () => { openSettingsSection(container, '模型'); await new Promise(resolve => setTimeout(resolve, 50)) })
  expect(inSettings('.dcu-settings-heading h1')).toBeNull()
  expect(inSettings('[aria-current="page"]')?.textContent).toBe('模型')
  expect(inSettings('[data-section=models]')).not.toBeNull()
  await act(async () => { inSettings<HTMLButtonElement>('[data-section=models]')!.click() })
  expect(settingsPage()).toBeNull()
})

test('搜索保留未知插件，空结果不会误选页面，条目分组覆盖新增项', () => {
  expect(filterSettingsRows(rows, '第三方').map(row => row.id)).toEqual(['third-party'])
  expect(filterSettingsRows(rows, 'MODELS').map(row => row.id)).toEqual(['models'])
  expect(filterSettingsRows(rows, '不存在')).toEqual([])
  expect(generalItemGroup('default-permission')).toBe('permissions')
  expect(generalItemGroup('composer-enter')).toBe('editor')
  expect(generalItemGroup('new-preference')).toBe('general')
  expect(settingsGroup('plugins')).toBe('integrations')
  expect(settingsGroup('plugin-config')).toBe('integrations')
})


test('隐藏或已隔离的无关对话框不阻止 Escape 返回', async () => {
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  document.body.append(dialog)
  const { container, trigger } = await mount()
  expect(container.inert).toBe(true)
  expect(container.contains(trigger)).toBe(true)
  expect(dialog.inert).toBe(true)
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
  expect(settingsPage()).toBeNull()
})

test('设置打开时内联引导仍可完成，迟挂载背景不能抢走焦点', async () => {
  await mount({
    onboarding: source([{ id: 'first-run' }]),
    renderSlot: ((name: string, owner: { complete?: () => void }) => name === 'settings.onboarding'
      ? createElement('button', { 'data-onboarding-test': true, onClick: owner.complete }, '完成引导') : null) as CodexSettingsPageProps['renderSlot'],
  })
  const onboarding = inSettings<HTMLButtonElement>('[data-onboarding-test]')!
  expect(onboarding.closest('[inert]')).toBeNull()
  expect(onboarding.inert).not.toBe(true)
  const late = document.createElement('button')
  document.body.append(late)
  late.focus()
  expect(document.activeElement).toBe(inSettings('.dcu-settings-back'))
  await act(async () => { onboarding.click() })
  expect(inSettings('[data-onboarding-test]')).toBeNull()
})

test('插件配置使用常规页同款自有标题', async () => {
  const { container } = await mount({ sections: source([
    ...rows, {id:'plugin-config',label:'插件配置',order:16},
  ]) })
  await act(async () => { openSettingsSection(container, '插件配置'); await new Promise(resolve => setTimeout(resolve, 50)) })
  expect(inSettings('.dcu-settings-inner')?.getAttribute('data-settings-section')).toBe('plugin-config')
  expect(inSettings('.dcu-settings-heading')?.getAttribute('data-own-title')).toBe('true')
  expect(inSettings('.dcu-settings-heading h1')?.textContent).toBe('插件配置')
})

test('新设置页直接提供互不重复的社区插件图标', async () => {
  await mount({ sections: source([
    ...rows, {id:'market',label:'插件市场',order:3}, {id:'better-sidebar',label:'侧边卡片',order:4},
    {id:'plugins',label:'内置插件',order:15}, {id:'plugin-config',label:'插件配置',order:16},
  ]) })
  expect(inSettings('.dcu-settings-nav .lucide-store')).not.toBeNull()
  expect(inSettings('.dcu-settings-nav .lucide-panel-right')).not.toBeNull()
  expect(inSettings('.dcu-settings-nav .lucide-sliders-horizontal')).not.toBeNull()
})


test('Shift+Tab 在设置内部循环，隐藏的迟挂载 dialog 不拦截 Escape', async () => {
 await mount()
 const back=inSettings<HTMLButtonElement>('.dcu-settings-back')!
 const last=inSettings<HTMLButtonElement>('[data-section]')!
 back.focus()
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}))
 expect(document.activeElement).toBe(last)
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}))
 expect(document.activeElement).toBe(back)
 const hidden=document.createElement('div');hidden.setAttribute('role','dialog');hidden.style.display='none';document.body.append(hidden)
 await act(async()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))})
 expect(settingsPage()).toBeNull()
})

test('官方插件开关的 body toast 不被设置隔离藏掉', async () => {
  const toast = document.createElement('div')
  toast.setAttribute('role', 'alert')
  document.body.append(toast)
  await mount()
  expect(toast.inert).not.toBe(true)
  expect(toast.hasAttribute('data-dcu-settings-isolated')).toBe(false)
  expect(toast.closest('[inert]')).toBeNull()
})

test('设置已打开时晚挂到 body 的 toast 仍可见，焦点不被抢回返回', async () => {
  await mount()
  const toast = document.createElement('div')
  toast.setAttribute('role', 'alert')
  const retry = document.createElement('button')
  retry.textContent = '重试'
  toast.append(retry)
  document.body.append(toast)
  expect(toast.inert).not.toBe(true)
  expect(toast.hasAttribute('data-dcu-settings-isolated')).toBe(false)
  expect(getComputedStyle(toast).visibility).not.toBe('hidden')
  retry.focus()
  expect(document.activeElement).toBe(retry)
})

test('嵌套的 role=alert 不会因为官方 toast 守卫而漏出设置页后面', async () => {
  const host = document.createElement('div')
  const modal = document.createElement('div')
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-modal', 'true')
  const nested = document.createElement('div')
  nested.setAttribute('role', 'alert')
  host.append(modal, nested)
  document.body.append(host)
  await mount({ onboarding: source([{ id: 'portal-step' }]) })
  expect(nested.inert).toBe(true)
  expect(nested.hasAttribute('data-dcu-settings-isolated')).toBe(true)
})

test('已有引导 portal 保留交互，设置退出不改写原始 inert 状态', async () => {
 const overlay=document.createElement('div');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');const next=document.createElement('button');overlay.append(next);document.body.append(overlay)
 const background=document.createElement('div');background.inert=true;background.setAttribute('data-dcu-settings-isolated','previous');document.body.append(background)
 const {container}=await mount({onboarding:source([{id:'portal-step'}])})
 expect(overlay.inert).not.toBe(true)
 next.focus();expect(document.activeElement).toBe(next)
 await act(async()=>{inSettings<HTMLButtonElement>('.dcu-settings-back')!.click()})
 expect(background.inert).toBe(true)
 expect(background.getAttribute('data-dcu-settings-isolated')).toBe('previous')
})


test('搜索弹窗尚未卸载也能从快捷入口打开设置分区', async () => {
 const {container}=await mount()
 await act(async()=>{inSettings<HTMLButtonElement>('.dcu-settings-back')!.click()})
 const search=document.createElement('div');search.setAttribute('role','dialog');document.body.append(search)
 await act(async()=>{openSettingsSection(container,'模型')})
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,50))})
 expect(inSettings('[data-section=models]')).not.toBeNull()
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
  await mount({ onboarding: source([{ id: 'guide' }]) })
  expect(dialog.inert).not.toBe(true)
  expect(menu.inert).toBe(true)
  expect(dialog.hasAttribute('data-dcu-settings-isolated')).toBe(false)
  expect(menu.hasAttribute('data-dcu-settings-isolated')).toBe(true)
  next.focus()
  expect(document.activeElement).toBe(next)
  await act(async () => { inSettings<HTMLButtonElement>('.dcu-settings-back')!.click() })
  expect(menu.inert).not.toBe(true)
  expect(menu.hasAttribute('data-dcu-settings-isolated')).toBe(false)
})

test.each(['menu', 'listbox'])('Escape 只关闭 %s，下一次才退出设置', async role => {
  await mount()
  const popup = document.createElement('div')
  popup.setAttribute('role', role)
  document.body.append(popup)
  const dismiss = () => popup.remove()
  document.addEventListener('keydown', dismiss, { once: true })
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })) })
  expect(popup.isConnected).toBe(false)
  expect(settingsPage()).not.toBeNull()
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })) })
  expect(settingsPage()).toBeNull()
})

test('过滤提示随匹配与选择变化，过滤本身不卸载当前正文', async () => {
  await mount()
  const original = inSettings('[data-section=general]')
  const input = inSettings<HTMLInputElement>('input[type=search]')!
  const search = async (value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  await search('第三方')
  expect(inSettings('[role=status]')?.textContent).toBe(zh['settings.filterHint'])
  expect(inSettings('[data-section=general]')).toBe(original)
  await act(async () => { inSettings<HTMLButtonElement>('.dcu-settings-link')!.click() })
  expect(inSettings('[role=status]')).toBeNull()
  expect(inSettings('[data-section=third-party]')).not.toBeNull()
  await search('不存在')
  expect(inSettings('[role=status]')?.textContent).toBe(zh['settings.noResults'])
  expect(inSettings('[data-section=third-party]')).not.toBeNull()
  await search('')
  expect(inSettings('[role=status]')).toBeNull()
})

test('设置页挂到 document.body，不被收缩侧栏的 transform 包含块困住', async () => {
  const rail = document.createElement('aside')
  rail.style.cssText = 'transform:translateX(0);width:56px;overflow:hidden'
  document.body.append(rail)
  const { container } = await mount({}, rail)
  const page = settingsPage()
  expect(page?.parentElement).toBe(document.body)
  expect(container.contains(page)).toBe(false)
  expect(rail.contains(page)).toBe(false)
})
