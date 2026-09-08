import { afterEach, expect, test } from 'vitest'
import { observeHostCopy } from '../src/client/host-copy.ts'
import { en, zh } from '../src/client/locales.ts'

afterEach(() => { document.body.innerHTML = '' })
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

test('补译原设置选择器和迟挂载 portal，语言切换与卸载恢复原文', async () => {
  document.body.innerHTML = '<div data-dcu-settings-item="transcript-view"><button aria-haspopup="menu" aria-expanded="true">Compact<svg></svg></button></div><p>Compact</p>'
  let dict: typeof en = zh
  let changed = () => {}
  const stop = observeHostCopy({ subscribe: fn => { changed = fn; return () => {} } }, key => dict[key])
  const button = document.querySelector('button')!
  const icon = button.querySelector('svg')
  expect(button.textContent).toBe('紧凑')
  const portal = document.createElement('div')
  portal.innerHTML = '<div role="menu"><button role="menuitem">Normal</button><button role="menuitem">Compact<svg></svg></button></div>'
  document.body.append(portal)
  await settle()
  expect(portal.textContent).toBe('标准紧凑')
  expect(document.querySelector('p')!.textContent).toBe('Compact')
  expect(button.querySelector('svg')).toBe(icon)
  dict = en; changed(); await settle()
  expect(button.textContent).toBe('Compact')
  expect(portal.textContent).toBe('NormalCompact')
  dict = zh; changed(); await settle()
  expect(button.textContent).toBe('紧凑')
  stop()
  expect(button.textContent).toBe('Compact')
  expect(portal.textContent).toBe('NormalCompact')
})

test('六条官方命令说明补译，保留名称、自定义描述、正文及事件', async () => {
  const names = ['compact', 'export', 'feedback', 'goal', 'permission', 'plan'] as const
  const menu = document.createElement('div')
  menu.setAttribute('data-trigger-menu', '')
  for (const name of names) {
    const option = document.createElement('button')
    option.setAttribute('role', 'option')
    option.innerHTML = `<span>${name}</span><span>${en[`host.command.${name}`]}</span>`
    menu.append(option)
  }
  document.body.append(menu)
  document.body.insertAdjacentHTML('beforeend', '<p>Compact older conversation history</p>')
  menu.insertAdjacentHTML('beforeend', '<button role="option"><span>compact</span><span>自定义压缩说明</span></button>')
  const first = menu.querySelector('button')!
  let clicks = 0
  first.onclick = () => { clicks++ }
  let changed = () => {}
  let dict: typeof en = zh
  const stop = observeHostCopy({ subscribe: fn => { changed = fn; return () => {} } }, key => dict[key])
  names.forEach((name, i) => {
    expect(menu.children[i]!.firstChild!.textContent).toBe(name)
    expect(menu.children[i]!.lastChild!.textContent).toBe(zh[`host.command.${name}`])
  })
  first.click(); expect(clicks).toBe(1)
  expect(menu.lastChild!.textContent).toBe('compact自定义压缩说明')
  expect(document.querySelector('p')!.textContent).toBe('Compact older conversation history')
  // 模拟宿主重新渲染同一个描述节点。
  first.lastChild!.textContent = en['host.command.compact']
  await settle()
  expect(first.lastChild!.textContent).toBe(zh['host.command.compact'])
  dict = en; changed(); await settle()
  expect(first.lastChild!.textContent).toBe(en['host.command.compact'])
  stop()
})
