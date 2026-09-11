import { createRequire } from 'node:module'
import { act, createElement, useSyncExternalStore, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { ChannelBrowser } from '../src/client/ChannelBrowser.tsx'

const { createRoot } = createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}
const t = (key: string): string => key

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); window.localStorage.clear() })

async function setup(fail = false) {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const fetcher = vi.fn(async () => new Response(JSON.stringify({
    groups: [{ id: 'dingtalk', label: '钉钉', sessions: [{ sessionId: 'im:archive', title: '深圳天气查询', running: false }] }],
  })))
  vi.stubGlobal('fetch', fetcher)
  let snapshot = { items: [], archivedSessionIds: [] as string[] }
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
  const useWorkspaces = <T,>(selector: (state: typeof snapshot) => T): T => selector(useSyncExternalStore(subscribe, () => snapshot))
  const updateArchive = (ids: string[]) => {
    snapshot = { ...snapshot, archivedSessionIds: ids }
    listeners.forEach(listener => listener())
  }
  const archiveSession = vi.fn(async (id: string) => {
    if (fail) throw new Error('归档服务不可用')
    updateArchive([id])
  })
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(ChannelBrowser, {
      openSession: vi.fn(), archiveSession, deleteSession: vi.fn(), forkSession: vi.fn(), renameSession: vi.fn(),
      useSessions: selector => selector({ byId: {} }), useWorkspaces, t,
    }))
  })
  return {
    container, fetcher, archiveSession, updateArchive,
    archive: async () => {
      const button = container.querySelector<HTMLButtonElement>('button[aria-label="sessions.archive"]')
      expect(button).not.toBeNull()
      await act(async () => { button!.click() })
    },
    dispose: async () => { await act(async () => { root.unmount() }); container.remove() },
  }
}

test('频道归档成功后无需等待轮询就隐藏会话及空分组，旧响应不能恢复它', async () => {
  const view = await setup()
  try {
    expect(view.container.querySelectorAll('.dcu-wb-session')).toHaveLength(1)
    await view.archive()
    expect(view.archiveSession).toHaveBeenCalledWith('im:archive')
    expect(view.fetcher).toHaveBeenCalledTimes(1)
    expect(view.container.querySelectorAll('.dcu-wb-session')).toHaveLength(0)
    expect(view.container.querySelectorAll('.dcu-wb-project')).toHaveLength(0)
    expect(view.container.querySelector('.dcu-wb-empty')?.textContent).toBe('channels.empty')
    await act(async () => { await vi.advanceTimersByTimeAsync(4000) })
    expect(view.fetcher).toHaveBeenCalledTimes(2)
    expect(view.container.querySelectorAll('.dcu-wb-session')).toHaveLength(0)
  } finally { await view.dispose() }
})

test('频道归档失败保留会话并展示错误', async () => {
  const view = await setup(true)
  try {
    await view.archive()
    expect(view.container.querySelectorAll('.dcu-wb-session')).toHaveLength(1)
    expect(view.container.querySelector('[role="alert"]')?.textContent).toBeTruthy()
  } finally { await view.dispose() }
})

test('其他客户端归档和取消归档时，频道按宿主状态即时更新缓存列表', async () => {
  const view = await setup()
  try {
    await act(async () => { view.updateArchive(['im:archive']) })
    expect(view.container.querySelectorAll('.dcu-wb-session')).toHaveLength(0)
    await act(async () => { view.updateArchive([]) })
    expect(view.container.querySelectorAll('.dcu-wb-session')).toHaveLength(1)
    expect(view.fetcher).toHaveBeenCalledTimes(1)
  } finally { await view.dispose() }
})
