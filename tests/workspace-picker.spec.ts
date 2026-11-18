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

function snapshot() {
  return {
    items,
    archivedSessionIds: [] as string[],
    pinnedSessionIds: [] as string[],
    state: 'ready' as const,
    phase: 'ready' as const,
    error: null,
  }
}

type PickerProps = Parameters<typeof CodexWorkspacePicker>[0]

function pickerProps(overrides: Partial<PickerProps> = {}): PickerProps {
  const anchor = document.createElement('button')
  document.body.appendChild(anchor)
  return {
    open: true,
    selectedId: 'w2',
    anchorRef: { current: anchor },
    onPick: vi.fn(),
    onClose: vi.fn(),
    useWorkspaces: (selector: (state: ReturnType<typeof snapshot>) => unknown) => selector(snapshot()),
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

afterEach(async () => {
  if (root !== undefined) await act(async () => { root!.unmount() })
  root = undefined
  container?.remove()
  container = undefined
  document.body.innerHTML = ''
})

describe('Codex 风格项目选择器', () => {
  it('打开后渲染搜索框、项目列表、选中态与本地化的默认工作区名', async () => {
    const props = pickerProps()
    await mount(props)

    expect(document.querySelector('[data-dcu-workspace-picker]')).not.toBeNull()
    expect(document.querySelector<HTMLInputElement>('.dcu-wsp-input')?.placeholder).toBe(zh['workspacePicker.search'])
    expect(document.querySelectorAll('[data-workspace-id]')).toHaveLength(3)
    expect(document.querySelector('[data-workspace-id="w2"]')?.getAttribute('aria-selected')).toBe('true')
    // 宿主自动标题 default-workspace 必须显示为本地化默认名，而不是字面量
    expect(document.querySelector('[data-workspace-id="w3"]')?.textContent).toContain(zh['workspacePicker.defaultName'])
    expect(document.querySelector('[data-dcu-workspace-create]')?.textContent).toContain(zh['workspacePicker.new'])
  })

  it('按标题或路径搜索并过滤项目，无匹配时给出空状态', async () => {
    await mount(pickerProps())
    const input = document.querySelector<HTMLInputElement>('.dcu-wsp-input')!
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

  it('点击项目把 id 交给 owner 并关闭浮层', async () => {
    const props = pickerProps()
    await mount(props)

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-workspace-id="w1"]')!.click()
    })
    expect(props.onPick).toHaveBeenCalledExactlyOnceWith('w1')
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('新建项目：先选目录再注册工作区，成功后选中新项目', async () => {
    const props = pickerProps()
    await mount(props)

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-dcu-workspace-create]')!.click()
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
      document.querySelector<HTMLButtonElement>('[data-dcu-workspace-create]')!.click()
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
      document.querySelector<HTMLButtonElement>('[data-dcu-workspace-create]')!.click()
      await Promise.resolve()
    })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

    expect(document.querySelector('[role=alert]')?.textContent).toContain('permission denied')
    expect(document.querySelector<HTMLButtonElement>('[data-dcu-workspace-create]')!.disabled).toBe(false)
    expect(props.onPick).not.toHaveBeenCalled()
  })

  it('键盘：方向键移动高亮、Enter 选中、Esc 关闭', async () => {
    const props = pickerProps()
    await mount(props)
    const input = document.querySelector<HTMLInputElement>('.dcu-wsp-input')!
    const press = async (key: string) => act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    })

    expect(document.querySelector('[data-workspace-id="w1"]')?.getAttribute('data-active')).toBe('true')
    await press('ArrowDown')
    expect(document.querySelector('[data-workspace-id="w2"]')?.getAttribute('data-active')).toBe('true')
    await press('Enter')
    expect(props.onPick).toHaveBeenCalledExactlyOnceWith('w2')

    await press('Escape')
    expect(props.onClose).toHaveBeenCalledTimes(2)
  })

  it('列表溢出时在右侧渲染滚动条，并随滚动更新位置', async () => {
    await mount(pickerProps())
    const scroll = document.querySelector<HTMLElement>('.dcu-wsp-scroll')!
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 200 })
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 600 })
    Object.defineProperty(scroll, 'scrollTop', { configurable: true, writable: true, value: 0 })
    const settle = async () => {
      await act(async () => {
        scroll.dispatchEvent(new Event('scroll'))
        await new Promise(resolve => requestAnimationFrame(() => { resolve(undefined) }))
      })
    }
    await settle()
    const thumb = document.querySelector<HTMLElement>('.dcu-wsp-thumb')
    expect(thumb).not.toBeNull()
    expect(Number.parseInt(thumb!.style.height, 10)).toBeGreaterThanOrEqual(24)
    const before = thumb!.style.transform

    Object.defineProperty(scroll, 'scrollTop', { configurable: true, writable: true, value: 200 })
    await settle()
    expect(document.querySelector<HTMLElement>('.dcu-wsp-thumb')!.style.transform).not.toBe(before)
  })

  it('关闭时不渲染浮层', async () => {
    await mount(pickerProps({ open: false }))
    expect(document.querySelector('[data-dcu-workspace-picker]')).toBeNull()
  })
})
