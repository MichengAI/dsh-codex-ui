import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { AboutSection } from '../src/client/AboutSection.tsx'

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

