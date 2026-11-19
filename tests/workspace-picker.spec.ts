import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodexWorkspacePicker } from '../src/client/composer/WorkspacePickerCodex.tsx'
import { zh } from '../src/client/locales.ts'

const { createRoot } = createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (el: HTMLElement) => { render: (node: ReactNode) => void; unmount: () => void }
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const t = (key: keyof typeof zh): string => zh[key]

function workspace(id: string, path: string, title = '') {
  return {
    workspaceId: id,
    path,
    title,
    sessionIds: [] as string[],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const items = [
  workspace('w1', '/Users/me/RegionalTrain', 'RegionalTrain'),
  workspace('w2', '/Users/me/dida_sdk', 'dida_sdk'),
  workspace('w3', '/Users/me/default-workspace', 'default-workspace'),
]

function snapshot(list = items) {
  return {
    items: list,
    archivedSessionIds: [] as string[],
    pinnedSessionIds: [] as string[],
    state: 'ready' as const,
    phase: 'ready' as const,
    error: null,
  }
}

type PickerProps = Parameters<typeof CodexWorkspacePicker>[0]

function pickerProps(overrides: Partial<PickerProps> = {}, list = items): PickerProps {
  const anchor = document.createElement('button')
  document.body.appendChild(anchor)
  return {
    open: true,
    selectedId: 'w2',
    anchorRef: { current: anchor },
    onPick: vi.fn(),
    onClose: vi.fn(),
    useWorkspaces: (selector: (state: ReturnType<typeof snapshot>) => unknown) => selector(snapshot(list)),
    t,
    pickDirectory: vi.fn(async () => '/Users/me/new-project'),
    createWorkspace: vi.fn(async ({ path }: { path: string }) => workspace('w9', path, 'new-project')),
    ...overrides,
  } as PickerProps
}

let root: ReturnType<typeof createRoot> | undefined
let container: HTMLElement | undefined

async function mount(props: PickerProps): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => { root!.render(createElement(CodexWorkspacePicker, props)) })
}

/** 组合框输入框：宿主 Input 渲染的 native input。 */
const searchInput = (): HTMLInputElement => document.querySelector<HTMLInputElement>('input[role="combobox"]')!
/** 项目行外层（承载 data-active 与 id 挂钩）。 */
const rowOf = (id: string): HTMLElement => document.querySelector<HTMLElement>(`[data-workspace-id="${id}"]`)!
/** 项目行真正的菜单按钮（宿主 MenuItemButton）。 */
const rowButton = (id: string): HTMLButtonElement => rowOf(id).querySelector<HTMLButtonElement>('button')!
/** 「新建项目」菜单按钮。 */
const createButton = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('[data-dcu-workspace-create] button')!

afterEach(async () => {
  if (root !== undefined) await act(async () => { root!.unmount() })
  root = undefined
  container?.remove()
  container = undefined
  document.body.innerHTML = ''
})

describe('Codex 风格项目选择器', () => {
  it('打开后渲染搜索框、项目列表、当前项标记与本地化的默认工作区名', async () => {
    await mount(pickerProps())

    expect(document.querySelector('[data-dcu-workspace-picker]')).not.toBeNull()
    expect(searchInput().placeholder).toBe(zh['workspacePicker.search'])
    expect(document.querySelectorAll('[data-workspace-id]')).toHaveLength(3)
    // 当前工作区以宿主菜单行的 aria-current 标记，而不是另画一套高亮
    expect(rowButton('w2').getAttribute('aria-current')).toBe('page')
    expect(rowButton('w1').getAttribute('aria-current')).toBeNull()
    // 宿主自动标题 default-workspace 必须显示为本地化默认名，而不是字面量
    expect(rowOf('w3').textContent).toContain(zh['workspacePicker.defaultName'])
    expect(createButton().textContent).toContain(zh['workspacePicker.new'])
  })

  it('同名项目显示区分用的路径后缀，唯一名字不显示后缀', async () => {
    const duplicates = [
      workspace('d1', '/Users/me/work/app', 'app'),
      workspace('d2', '/Users/me/side/app', 'app'),
      workspace('d3', '/Users/me/unique', 'unique'),
    ]
    await mount(pickerProps({ selectedId: 'd1' as never }, duplicates))

    // 与宿主一致：后缀是最短的唯一尾部路径段（不含前导分隔符）
    expect(rowOf('d1').querySelector('.dcu-wsp-suffix')?.textContent).toBe('work/app')
    expect(rowOf('d2').querySelector('.dcu-wsp-suffix')?.textContent).toBe('side/app')
    expect(rowOf('d3').querySelector('.dcu-wsp-suffix')).toBeNull()
  })

  it('按标题或路径搜索并过滤项目，无匹配时给出空状态', async () => {
    await mount(pickerProps())
    const input = searchInput()
    // React 受控输入：必须走原型 setter 再派发 input，才能触发 onChange
    const type = async (value: string) => act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await type('dida')
    expect(document.querySelectorAll('[data-workspace-id]')).toHaveLength(1)
    expect(document.querySelector('[data-workspace-id="w2"]')).not.toBeNull()

    await type('RegionalTrain')
    expect(document.querySelectorAll('[data-workspace-id]')).toHaveLength(1)
    expect(document.querySelector('[data-workspace-id="w1"]')).not.toBeNull()

    await type('不存在')
    expect(document.querySelectorAll('[data-workspace-id]')).toHaveLength(0)
    expect(document.querySelector('.dcu-wsp-status')?.textContent).toBe(zh['workspacePicker.empty'])
  })

  it('点击项目把 id 交给 owner、关闭浮层并把焦点还给胶囊', async () => {
    const props = pickerProps()
    await mount(props)

    await act(async () => { rowButton('w1').click() })
    expect(props.onPick).toHaveBeenCalledExactlyOnceWith('w1')
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(props.anchorRef?.current)
  })

  it('新建项目：先选目录再注册工作区，成功后选中新项目', async () => {
    const props = pickerProps()
    await mount(props)

    await act(async () => {
      createButton().click()
      await Promise.resolve()
    })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

    expect(props.pickDirectory).toHaveBeenCalledTimes(1)
    expect(props.createWorkspace).toHaveBeenCalledExactlyOnceWith({ path: '/Users/me/new-project' })
    expect(props.onPick).toHaveBeenCalledExactlyOnceWith('w9')
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('取消目录选择时不注册工作区，浮层保持打开', async () => {
    const props = pickerProps({ pickDirectory: vi.fn(async () => null) })
    await mount(props)

    await act(async () => {
      createButton().click()
      await Promise.resolve()
    })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

    expect(props.createWorkspace).not.toHaveBeenCalled()
    expect(props.onPick).not.toHaveBeenCalled()
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('新建失败时显示错误并恢复可重试状态', async () => {
    const props = pickerProps({
      createWorkspace: vi.fn(async () => { throw new Error('permission denied') }),
    })
    await mount(props)

    await act(async () => {
      createButton().click()
      await Promise.resolve()
    })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

    expect(document.querySelector('[role=alert]')?.textContent).toContain('permission denied')
    expect(createButton().disabled).toBe(false)
    expect(props.onPick).not.toHaveBeenCalled()
  })

  it('键盘：方向键移动高亮、Enter 选中、Esc 关闭并把焦点还给胶囊', async () => {
    const props = pickerProps()
    await mount(props)
    const input = searchInput()
    const press = async (key: string) => act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    })

    expect(rowOf('w1').getAttribute('data-active')).toBe('true')
    await press('ArrowDown')
    expect(rowOf('w2').getAttribute('data-active')).toBe('true')
    await press('Enter')
    expect(props.onPick).toHaveBeenCalledExactlyOnceWith('w2')

    await press('Escape')
    expect(props.onClose).toHaveBeenCalledTimes(2)
    expect(document.activeElement).toBe(props.anchorRef?.current)
  })

  it('键盘游标移出可视区时把目标行滚动到最近边缘', async () => {
    await mount(pickerProps())
    const scrolled: string[] = []
    const proto = Element.prototype as Element & { scrollIntoView?: (options?: ScrollIntoViewOptions) => void }
    const original = proto.scrollIntoView
    proto.scrollIntoView = function scrollIntoView(this: Element): void { scrolled.push(this.id) }
    try {
      const input = searchInput()
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
      })
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
      })
      expect(scrolled.at(-1)).toBe(rowButton('w3').id)
      // 再落到「新建项目」行：它同样必须被滚动到可见范围
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
      })
      expect(scrolled.at(-1)).toBe(createButton().id)
    } finally {
      if (original === undefined) Reflect.deleteProperty(proto, 'scrollIntoView')
      else proto.scrollIntoView = original
    }
  })

  it('aria-activedescendant 始终指向当前高亮行（含新建项目）', async () => {
    await mount(pickerProps())
    const input = searchInput()
    const press = async (key: string) => act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    })

    expect(input.getAttribute('aria-activedescendant')).toBe(rowButton('w1').id)
    await press('End')
    const active = input.getAttribute('aria-activedescendant')
    expect(active).toBe(createButton().id)
    expect(document.getElementById(active!)?.getAttribute('role')).toBe('menuitem')
  })

  it('关闭时不渲染浮层', async () => {
    await mount(pickerProps({ open: false }))
    expect(document.querySelector('[data-dcu-workspace-picker]')).toBeNull()
  })
})
