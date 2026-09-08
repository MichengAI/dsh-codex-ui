import { afterEach, describe, expect, it, vi } from 'vitest'
import { measureWorkspaceDropIndicator, mountWorkspaceDropIndicator } from '../src/client/workspace-drop-indicator.ts'

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks() })

function fixture(html: string) {
  document.body.innerHTML = `<div id="root"><section class="dcu-wb-section">${html}</section></div>`
  const root = document.querySelector<HTMLElement>('#root')!
  const box = (selector: string, top: number, height: number) => {
    const node = root.querySelector<HTMLElement>(selector)!
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + height, left: 10, right: 250, width: 240, height } as DOMRect)
    return node
  }
  return { root, box }
}

describe('统一排序线几何', () => {
  it('12px 分组间距取中点，不使用固定上移4px', () => {
    const { root, box } = fixture('<div class="dcu-wb-collection-head" id="a"></div><div class="dcu-wb-group-order-drop"><div class="dcu-wb-collection-head" id="b"></div></div>')
    box('#a', 20, 32); box('#b', 64, 32)
    expect(measureWorkspaceDropIndicator(root)?.top).toBe(58 - 4)
    expect(measureWorkspaceDropIndicator(root)?.left).toBe(14)
    expect(measureWorkspaceDropIndicator(root)?.width).toBe(228)
  })
  it('首项目忽略外层padding，取分组底边和项目顶边', () => {
    const { root, box } = fixture('<div class="dcu-wb-collection-head" id="a"></div><div class="dcu-wb-drop" id="wrapper"><div class="dcu-wb-project-head" id="b"></div></div>')
    box('#a', 20, 32); box('#wrapper', 52, 34); box('#b', 56, 30)
    expect(measureWorkspaceDropIndicator(root)?.top).toBe(54 - 4)
  })
  it('展开项目后使用最后一条会话底边，不使用项目标题底边', () => {
    const { root, box } = fixture('<div class="dcu-wb-project-head" id="a"></div><div class="dcu-wb-session" id="session"></div><div class="dcu-wb-drop"><div class="dcu-wb-project-head" id="b"></div></div>')
    box('#a', 20, 30); box('#session', 54, 30); box('#b', 88, 30)
    expect(measureWorkspaceDropIndicator(root)?.top).toBe(86 - 4)
  })
  it('会话间2px与列表末尾均按相邻可见行居中', () => {
    const { root, box } = fixture('<div class="dcu-wb-session" id="a"></div><div class="dcu-wb-session dcu-wb-drop" id="b"></div><div class="dcu-wb-project-head" id="c"></div>')
    box('#a', 20, 30); const b = box('#b', 52, 30); box('#c', 86, 30)
    expect(measureWorkspaceDropIndicator(root)?.top).toBe(51 - 4)
    b.classList.add('dcu-wb-drop-after')
    expect(measureWorkspaceDropIndicator(root)?.top).toBe(84 - 4)
  })
  it('隐藏的折叠内容不参与边界计算，滚动使用内容坐标', () => {
    const { root, box } = fixture('<div class="dcu-wb-project-head" id="a"></div><div data-open="false"><div class="dcu-wb-session" id="hidden"></div></div><div class="dcu-wb-drop"><div class="dcu-wb-project-head" id="b"></div></div>')
    box('#a', 20, 30); box('#hidden', 54, 30); box('#b', 50, 30)
    root.scrollTop = 100
    expect(measureWorkspaceDropIndicator(root)?.top).toBe(146)
  })
  it('置顶空槽及末尾槽使用槽内边界，不画到槽外', () => {
    const { root, box } = fixture('<div class="dcu-wb-pin-start dcu-wb-drop" id="slot"></div>')
    box('#slot', 20, 8)
    expect(measureWorkspaceDropIndicator(root)?.top).toBe(20)
  })
  it('取消落点隐藏蓝线，卸载取消刷新并移除绘制节点', () => {
    const { root } = fixture('')
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const dispose = mountWorkspaceDropIndicator(root)
    expect(root.querySelector<HTMLElement>('.dcu-wb-drop-indicator')?.hidden).toBe(true)
    dispose()
    expect(root.querySelector('.dcu-wb-drop-indicator')).toBeNull()
    expect(cancel).toHaveBeenCalledWith(1)
  })
})
