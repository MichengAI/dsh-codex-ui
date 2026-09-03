import { describe, expect, test, vi } from 'vitest'
import { archiveWorkspaceSessions } from '../src/client/workspace-archive.ts'

describe('项目会话批量归档', () => {
  test('按项目顺序归档并跳过重复会话', async () => {
    const archiveSession = vi.fn(async () => {})

    await archiveWorkspaceSessions(['first', 'second', 'first'], archiveSession)

    expect(archiveSession.mock.calls).toEqual([['first'], ['second']])
  })

  test('空项目不发起归档请求', async () => {
    const archiveSession = vi.fn(async () => {})

    await archiveWorkspaceSessions([], archiveSession)

    expect(archiveSession).not.toHaveBeenCalled()
  })

  test('归档失败时停止后续操作并向调用方抛错', async () => {
    const archiveSession = vi.fn(async (sessionId: string) => {
      if (sessionId === 'second') throw new Error('归档失败')
    })

    await expect(archiveWorkspaceSessions(['first', 'second', 'third'], archiveSession)).rejects.toThrow('归档失败')
    expect(archiveSession.mock.calls).toEqual([['first'], ['second']])
  })
})
