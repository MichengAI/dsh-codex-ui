import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { AboutSection } from '../src/client/AboutSection.tsx'
import { zh, en, ja, es, fr, de, ru, pt } from '../src/client/locales.ts'

const createRoot = (createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}).createRoot

const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

class TestIntersectionObserver {
  static current: TestIntersectionObserver | undefined
  readonly root = null
  readonly rootMargin = '0px'
  readonly thresholds = [0.2]

  constructor(private readonly callback: IntersectionObserverCallback) {
    TestIntersectionObserver.current = this
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return [] }

  emit(isIntersecting: boolean): void {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await new Promise(resolve => window.setTimeout(resolve, 0))
  })
}

afterEach(() => {
  TestIntersectionObserver.current = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test.each([401, 403, 503])('依赖读取 HTTP %s 显示专属提示而非通用失败', async status => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status })))
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(AboutSection, { t: ((key: string) => key) as never })) })
    await flush()
    expect(container.textContent).toContain(status === 401 ? 'errors.unauthorized' : status === 403 ? 'errors.forbidden' : 'errors.serviceUnavailable')
  } finally { await act(async () => { root.unmount() }) }
})

test('关于页已有数据刷新失败时保留内容并显示非阻断提示', async () => {
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
  const fetcher = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ dependencies: [] }), { status: 200 }))
    .mockRejectedValueOnce(new Error('网络暂时不可用'))
  vi.stubGlobal('fetch', fetcher)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  try {
    await act(async () => { root.render(createElement(AboutSection, { t: ((key: string) => key) as never })) })
    await flush()
    expect(container.textContent).not.toContain('about.refreshFailed')

    await act(async () => {
      TestIntersectionObserver.current?.emit(false)
      TestIntersectionObserver.current?.emit(true)
    })
    await flush()

    expect(container.querySelector('.dcu-about-dependencies')).not.toBeNull()
    expect(container.textContent).toContain('about.refreshFailed')
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})



test.each([
  ['single', 'applied', 'about.applied'],
  ['single', 'restart-required', 'about.restartRequired'],
  ['single', 'overridden', 'about.applied'],
  ['all', 'applied', 'about.applied'],
  ['all', 'restart-required', 'about.restartRequired'],
  ['all', 'overridden', 'about.applied'],
  ['all', 'up-to-date', 'about.upToDate'],
  ['all', 'restart-zero', 'about.restartRequired'],
])('dependency %s click shows actual %s outcome', async (target, outcome, expected) => {
  const before = [{ id: 'schedule', packageName: '@michengai/dsh-automation', installed: false, updateAvailable: false }]
  const after = [{ ...before[0], installed: true }]
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') return new Response(JSON.stringify({
      dependencies: after, application: outcome === 'up-to-date' ? 'applied' : outcome === 'restart-zero' ? 'restart-required' : outcome,
      updatedCount: outcome === 'up-to-date' || outcome === 'restart-zero' ? 0 : 1,
      results: outcome === 'up-to-date' ? [] : [{ packageName: before[0].packageName }],
    }), { status: 200 })
    if (String(input).includes('action=progress')) return new Response('{}', { status: 200 })
    return new Response(JSON.stringify({ dependencies: before }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetcher)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(AboutSection, { t: ((key: string) => key) as never })) })
    await flush()
    const scope = target === 'single' ? container.querySelector('.dcu-about-dependency') : container.querySelector('.dcu-card-dependencies')
    const button = [...(scope?.querySelectorAll('button') ?? [])].find(node => node.textContent?.includes(target === 'single' ? 'about.install' : 'about.updateAll'))
    expect(button).toBeDefined()
    await act(async () => { button!.click() })
    await flush()
    expect(fetcher.mock.calls.some(([url, init]) => init?.method === 'POST' && String(url).includes(target === 'single' ? 'dependency=schedule' : 'action=update-all'))).toBe(true)
    const message = container.querySelector('.dcu-card-dependencies .dcu-about-message[role=status]')
    expect(message?.textContent).toBe(expected)
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})


test.each([zh, en, ja, es, fr, de, ru, pt])('every locale describes applied and restart outcomes distinctly', locale => {
  expect(locale['about.applied']).toBeTruthy()
  expect(locale['about.restartRequired']).toBeTruthy()
  expect(locale['about.installBusy']).toBeTruthy()
  expect(locale['about.installSuiteUnsupported']).toBeTruthy()
  expect(locale['about.applied']).not.toBe(locale['about.restartRequired'])
})

test.each([
  [200, {}],
  [503, { application: 'applied' }],
  [200, { application: 'failed' }],
])('install rejects unconfirmed outcome HTTP %s', async (status, outcome) => {
  const dependencies = [{ id: 'schedule', packageName: '@michengai/dsh-automation', installed: false, updateAvailable: false }]
  vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
    new Response(JSON.stringify({ dependencies, ...(init?.method === 'POST' ? outcome : {}) }), { status: init?.method === 'POST' ? status : 200 })))
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(AboutSection, { t: ((key: string) => key) as never })) })
    await flush()
    const button = [...container.querySelectorAll<HTMLButtonElement>('.dcu-about-dependency button')].find(node => node.textContent?.includes('about.install'))
    expect(button).toBeDefined()
    await act(async () => { button!.click() })
    await flush()
    expect(container.querySelector('.dcu-card-dependencies [role=alert]')?.textContent).toBe('about.installFailed')
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})

test('install failure still commits partial dependency updates into UI state', async () => {
  const initial = [
    { id: 'schedule', packageName: '@michengai/dsh-automation', installed: false, updateAvailable: false },
    { id: 'pua', packageName: '@michengai/dsh-pua', installed: false, updateAvailable: false },
  ]
  const partialUpdated = [
    { id: 'schedule', packageName: '@michengai/dsh-automation', installed: true, updateAvailable: false },
    { id: 'pua', packageName: '@michengai/dsh-pua', installed: false, updateAvailable: false },
  ]
  const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return new Response(JSON.stringify({
        dependencies: partialUpdated,
        application: 'failed',
        error: '插件安装超时，请检查网络后重试。',
      }), { status: 503 })
    }
    return new Response(JSON.stringify({ dependencies: initial }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetcher)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(AboutSection, { t: ((key: string) => key) as never })) })
    await flush()
    const button = container.querySelector<HTMLButtonElement>('.dcu-card-dependencies button')
    expect(button).toBeDefined()
    await act(async () => { button!.click() })
    await flush()
    // 错误提示展示
    expect(container.querySelector('.dcu-card-dependencies [role=alert]')?.textContent).toBe('about.installTimeout')
    // 但界面依赖列表必须已更新：schedule 已变为已安装状态
    const scheduleRow = container.querySelector('.dcu-about-dependency[data-dependency-id="schedule"]')
    expect(scheduleRow).not.toBeNull()
    expect(scheduleRow?.querySelector('.dcu-about-status')?.getAttribute('data-installed')).toBe('true')
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})
