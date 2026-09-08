import { createRequire } from 'node:module'
import { act, createElement, type ReactNode } from 'react'
import { expect, test, vi } from 'vitest'
import { UsageStatisticsSection, type UsageStatisticsProps } from '../src/client/UsageStatisticsSection.tsx'
import { USAGE_FRAME_PATH, type UsageFrameBridge } from '../src/usage-frame/contract.ts'
import { zh } from '../src/client/locales.ts'

const { createRoot } = createRequire(import.meta.url)('react-dom/client') as { createRoot: (element: HTMLElement) => { render: (node: ReactNode) => void; unmount: () => void } }

test('费用 iframe 就绪前不可见且不参与焦点，加载提示不改变承载区域', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const props = { useStore: () => null, actions: {}, billing: {}, close: vi.fn(), openOriginal: vi.fn(), t: (key: keyof typeof zh) => zh[key] } as unknown as UsageStatisticsProps
  try {
    await act(async () => { root.render(createElement(UsageStatisticsSection, props)) })
    const frame = container.querySelector('iframe')!
    const stage = frame.parentElement
    expect(frame.style.visibility).toBe('hidden')
    expect(frame.tabIndex).toBe(-1)
    expect(stage?.getAttribute('aria-busy')).toBe('true')
    const childDocument = document.implementation.createHTMLDocument()
    childDocument.body.innerHTML = '<div id="billing-root"></div>'
    const target = { location: { origin: location.origin, pathname: USAGE_FRAME_PATH }, document: childDocument, postMessage: vi.fn(), dcuUsageHost: undefined as UsageFrameBridge | undefined }
    Object.defineProperty(frame, 'contentWindow', { configurable: true, value: target })
    await act(async () => { frame.dispatchEvent(new Event('load')) })
    expect(frame.style.visibility).toBe('hidden')
    expect(target.dcuUsageHost).toBeDefined()
    await act(async () => { target.dcuUsageHost!.ready() })
    expect(frame.style.visibility).toBe('visible')
    expect(frame.tabIndex).toBe(0)
    expect(container.querySelector('[role="status"]')).toBeNull()
    expect(frame.parentElement).toBe(stage)
    expect(stage?.getAttribute('aria-busy')).toBe('false')
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})
