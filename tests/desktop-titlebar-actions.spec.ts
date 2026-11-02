import assert from 'node:assert/strict'
import { test, describe } from 'vitest'
import { observeDesktopTitlebarMenus } from '../src/client/desktop-menu/index.ts'

describe('desktop titlebar menu actions and integration', () => {
  test('Help menu only exposes reload and restart, and both keep working', async () => {
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

    const buttons = Array.from(bar.querySelectorAll('button'))
    const helpBtn = buttons[2]

    // 【文件】菜单已彻底移除：顶栏只剩官方两个 + 帮助
    assert.equal(buttons.length, 3, '顶栏应为 应用、编辑、帮助 三项')
    assert.equal(bar.querySelector('#dcu-desktop-menu-file'), null, '不得再注入【文件】菜单')

    helpBtn.click()
    const popover = document.body.querySelector('.dcu-desktop-menu-popover')
    assert.notEqual(popover, null, '点击帮助应弹出下拉菜单')

    const items = Array.from(popover!.querySelectorAll<HTMLButtonElement>('button.dcu-menu-item'))
    assert.equal(items.length, 2, '帮助菜单应只包含 2 个子项')
    assert.equal(items[0].textContent?.replace(/Ctrl\+\w+$/, '').trim(), '刷新页面')
    assert.equal(items[1].textContent?.trim(), '重启应用与 Host')

    // 子项上都已移除快捷键后缀：不再有检查更新、快捷键、关于
    const labels = items.map(item => item.textContent ?? '')
    for (const removed of ['显示键盘快捷键', '检查更新', '关于']) {
      assert.equal(labels.some(label => label.includes(removed)), false, `帮助菜单不应再包含 ${removed}`)
    }

    // 收起当前弹层，后续每次点击都会重新展开
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    assert.equal(document.body.querySelector('.dcu-desktop-menu-popover'), null)

    // 刷新页面：应触发 location.reload（jsdom 的 location.reload 不可直接覆盖，整体替换 location）
    let reloaded = 0
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: () => { reloaded += 1 } },
    })

    helpBtn.click()
    const firstPopover = document.body.querySelector('.dcu-desktop-menu-popover')
    firstPopover!.querySelectorAll<HTMLButtonElement>('button.dcu-menu-item')[0]?.click()
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(reloaded, 1, '刷新页面应调用 location.reload')

    // 重启应用与 Host：走 Host 的重启通道（status 拿令牌 → 带令牌 POST），不再冒充重载
    const calls: Array<{ url: string; method: string; token?: string }> = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const headers = (init?.headers ?? {}) as Record<string, string>
      calls.push({ url, method: init?.method ?? 'GET', token: headers['x-dcu-restart-key'] })
      const payload = url.includes('action=status')
        ? { canRestart: true, platform: 'win32', kind: 'win', token: 'T0KEN' }
        : { ok: true, phase: 'starting' }
      return { ok: true, status: 200, json: async () => payload } as unknown as Response
    }) as typeof fetch

    const originalConfirm = window.confirm
    window.confirm = () => true
    helpBtn.click()
    const secondPopover = document.body.querySelector('.dcu-desktop-menu-popover')
    secondPopover!.querySelectorAll<HTMLButtonElement>('button.dcu-menu-item')[1]?.click()
    await new Promise(resolve => setTimeout(resolve, 40))

    assert.equal(calls.length, 2, '重启应先查状态、再带令牌提交')
    assert.match(calls[0].url, /action=status/)
    assert.equal(calls[0].method, 'GET')
    assert.match(calls[1].url, /action=restart/)
    assert.equal(calls[1].method, 'POST')
    assert.equal(calls[1].token, 'T0KEN', 'POST 必须带 status 文档里的令牌')
    assert.equal(reloaded, 1, '重启不得退化成整页重载')
    assert.notEqual(document.body.querySelector('.dcu-restart-toast'), null, '应显示重启进度卡片')

    window.confirm = originalConfirm
    globalThis.fetch = originalFetch

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })

    cleanup()
  })
})
