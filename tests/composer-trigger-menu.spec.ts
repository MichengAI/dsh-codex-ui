// @vitest-environment jsdom
import { expect, test, vi } from 'vitest'
import { observeComposerToolMenus } from '../src/client/composer-tool-menus.ts'

test('点击指令按钮后，不把 @ 建议菜单的内部列表当作工具弹窗', async () => {
  document.body.innerHTML = '<section data-conversation-scroll><div data-composer-card><button aria-haspopup="listbox">指令</button></div></section>'
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  const rects = vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
  const stop = observeComposerToolMenus({ search: '搜索', empty: '无结果' })
  try {
    document.querySelector('button')!.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    const shell = document.createElement('div')
    shell.dataset.triggerMenu = ''
    shell.innerHTML = '<nav>文件路径</nav><div role="listbox"><button role="option">文件.ts</button></div>'
    document.querySelector('[data-composer-card]')!.append(shell)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(shell.querySelector('[data-dcu-tool-menu]')).toBeNull()
    expect(shell.hasAttribute('data-dcu-tool-menu')).toBe(false)
  } finally {
    stop(); rects.mockRestore(); vi.unstubAllGlobals(); document.body.replaceChildren()
  }
})
