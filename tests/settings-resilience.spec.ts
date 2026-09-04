import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { AboutSection } from '../src/client/AboutSection.tsx'
import { ConnectorsSection } from '../src/client/ConnectorsSection.tsx'

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

test('连接器市场使用 GET 探测并在成功后显示内嵌页面', async () => {
  const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    return new Response('', { status: init?.method === 'HEAD' ? 405 : 200 })
  })
  vi.stubGlobal('fetch', fetcher)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const sessionStore = {
    getSnapshot: () => ({ current: undefined, ids: [], byId: {} }),
    subscribe: () => () => {},
  }

  try {
    await act(async () => {
      root.render(createElement(ConnectorsSection, {
        sessionStore: sessionStore as never,
        startPromptSession: async () => {},
        t: ((key: string) => key) as never,
      }))
    })
    await flush()

    expect(fetcher).toHaveBeenCalledWith('/mcp-connector/ui/', expect.objectContaining({ method: 'GET' }))
    expect(container.querySelector('.dcu-connector-frame')).not.toBeNull()
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})
