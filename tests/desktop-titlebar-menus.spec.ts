import assert from 'node:assert/strict'
import { test, describe } from 'vitest'
import { observeDesktopTitlebarMenus } from '../src/client/desktop-menu/index.ts'

/** 构造官方顶栏的最小 shadow 宿主：应用、编辑两个原生按钮 */
function mountHost(): { bar: HTMLElement; shadow: ShadowRoot; host: HTMLElement; cleanup: () => void } {
  document.documentElement.lang = 'zh-CN'
  document.body.innerHTML = ''
  const host = document.createElement('div')
  host.dataset.windowsMenu = ''
  const shadow = host.attachShadow({ mode: 'open' })

  const bar = document.createElement('div')
  bar.setAttribute('role', 'menubar')

  const appBtn = document.createElement('button')
  appBtn.textContent = '应用'
  const editBtn = document.createElement('button')
  editBtn.textContent = '编辑'

  bar.append(appBtn, editBtn)
  shadow.append(bar)
  document.body.append(host)

  const cleanup = observeDesktopTitlebarMenus((_key, fallback) => fallback ?? _key)
  return { bar, shadow, host, cleanup }
}

describe('desktop titlebar menu injection', () => {
  test('does not throw or mutate DOM when data-windows-menu is absent (web environment)', () => {
    document.body.innerHTML = '<div id="app"></div>'
    const cleanup = observeDesktopTitlebarMenus()
    assert.equal(document.body.querySelector('[role="menuitem"]'), null)
    cleanup()
  })

  test('appends only a Help button, keeping official App and Edit untouched', () => {
    const { bar, cleanup } = mountHost()
    const buttons = Array.from(bar.querySelectorAll('button'))

    assert.equal(buttons.length, 3, '官方 应用、编辑 之外只应追加 1 个 帮助')
    assert.equal(buttons[0].textContent, '应用', '首个按钮必须仍是官方【应用】')
    assert.equal(buttons[1].textContent, '编辑', '第二个按钮必须仍是官方【编辑】')
    assert.equal(buttons[2].textContent, '帮助')
    assert.equal(
      bar.querySelector('#dcu-desktop-menu-file'),
      null,
      '【文件】菜单必须彻底移除，不得再注入',
    )

    cleanup()
    assert.equal(bar.querySelectorAll('button').length, 2, 'cleanup 应清理注入的按钮并恢复原样')
  })

  test('Help dropdown opens, holds exactly two items and closes on Escape', () => {
    const { bar, cleanup } = mountHost()
    const buttons = Array.from(bar.querySelectorAll('button'))
    const helpBtn = buttons[2]

    helpBtn.click()
    const popover = document.body.querySelector('.dcu-desktop-menu-popover')
    assert.notEqual(popover, null, '点击帮助应弹出下拉菜单')
    assert.equal(helpBtn.getAttribute('aria-expanded'), 'true')

    const labels = Array.from(popover!.querySelectorAll<HTMLButtonElement>('button.dcu-menu-item'))
      .map(item => (item.textContent ?? '').replace(/Ctrl\+\w+$/, '').trim())
    assert.deepEqual(
      labels,
      ['刷新页面', '重启应用与 Host'],
      '帮助菜单只保留刷新页面与重启应用与 Host',
    )

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    assert.equal(document.body.querySelector('.dcu-desktop-menu-popover'), null, '按 Esc 应收起下拉菜单')
    assert.equal(helpBtn.getAttribute('aria-expanded'), 'false')

    cleanup()
  })

  test('Help 按钮键盘可达：Tab 能到、方向键能开、条目间能移动', () => {
    const { bar, shadow, cleanup } = mountHost()
    const helpBtn = Array.from(bar.querySelectorAll('button'))[2]

    // 宿主 menubar 的 roving tabindex 只认它自己两个按钮，帮助按钮必须自己可 Tab 到
    assert.equal(helpBtn.tabIndex, 0, '帮助按钮必须在 Tab 序列里')

    helpBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    const popover = document.body.querySelector('.dcu-desktop-menu-popover')
    assert.notEqual(popover, null, '按方向键下应展开菜单')

    const items = Array.from(popover!.querySelectorAll<HTMLButtonElement>('button.dcu-menu-item'))
    assert.equal(document.activeElement, items[0], '展开后焦点应落在第一项')

    popover!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    assert.equal(document.activeElement, items[1], '方向键下应移动到第二项')

    popover!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }))
    assert.equal(document.activeElement, items[0], '方向键上应移回第一项')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    assert.equal(document.body.querySelector('.dcu-desktop-menu-popover'), null)
    assert.equal(shadow.activeElement, helpBtn, 'Esc 关闭菜单后焦点必须归还到帮助按钮，不得掉到 body')

    // 左右方向键在 Menubar 上双向循环
    const officialButtons = Array.from(bar.querySelectorAll<HTMLButtonElement>('button:not(#dcu-desktop-menu-help)'))
    const appBtn = officialButtons[0]
    const editBtn = officialButtons[1]

    // 从帮助向左移到编辑
    helpBtn.focus()
    helpBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }))
    assert.equal(shadow.activeElement, editBtn, '帮助按钮向左应跳到官方编辑按钮')
    helpBtn.dispatchEvent(new FocusEvent('blur'))
    assert.equal(helpBtn.tabIndex, 0, '移开焦点后帮助按钮的 tabIndex 必须保持为 0，确保 Tab 序列始终可达')

    // 从编辑向右移到帮助
    editBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    assert.equal(shadow.activeElement, helpBtn, '官方编辑按钮向右应无缝跳入帮助按钮')

    // 从应用向左向前循环到帮助
    appBtn.focus()
    appBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }))
    assert.equal(shadow.activeElement, helpBtn, '官方应用按钮向左应向前循环到帮助按钮')

    cleanup()
  })
})
