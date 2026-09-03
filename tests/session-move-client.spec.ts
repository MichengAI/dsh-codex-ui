import { expect, test, vi } from 'vitest'
import {
  finishSessionMove,
  moveSessionActionId,
  parseMoveSessionActionId,
  requestSessionMove,
  sessionMoveErrorKey,
  sessionMoveTargets,
} from '../src/client/session-move.ts'

test('移动目标排除会话当前所属项目并保持 Host 项目顺序', () => {
  const targets = sessionMoveTargets([
    { workspaceId: 'first', title: '第一个项目', sessionIds: ['session-1'] },
    { workspaceId: 'second', title: '第二个项目', sessionIds: [] },
    { workspaceId: 'third', title: '第三个项目', sessionIds: ['session-2'] },
  ], 'session-1')
  expect(targets).toEqual([
    { id: 'second', label: '第二个项目' },
    { id: 'third', label: '第三个项目' },
  ])
})

test('项目标识经过编码后仍可从菜单动作安全还原', () => {
  const action = moveSessionActionId('项目/研发:一组')
  expect(parseMoveSessionActionId(action)).toBe('项目/研发:一组')
  expect(parseMoveSessionActionId('rename')).toBeUndefined()
})

test('Host 拒绝迁移时保留结构化错误码', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({
    ok: false,
    code: 'session-move/subagent-unsupported',
  }), { status: 409, headers: { 'content-type': 'application/json' } }))

  await expect(requestSessionMove('session-1', 'target', fetcher)).rejects.toMatchObject({
    code: 'session-move/subagent-unsupported',
  })
})

test('迁移错误码映射为准确的客户端文案键', () => {
  expect(sessionMoveErrorKey('session-move/rollback-failed')).toBe('sessions.moveRollbackFailed')
  expect(sessionMoveErrorKey('session-move/service-unavailable')).toBe('sessions.moveUnavailable')
  expect(sessionMoveErrorKey('session-move/session-not-found')).toBe('sessions.moveNotFound')
  expect(sessionMoveErrorKey('session-move/subagent-unsupported')).toBe('sessions.moveSubagent')
  expect(sessionMoveErrorKey('session-move/busy')).toBe('sessions.moveBusy')
  expect(sessionMoveErrorKey('session-move/unrecognized')).toBe('sessions.moveFailed')
})

test('迁移成功后导航到被移动会话并保留其他查询参数', () => {
  const navigate = vi.fn()

  finishSessionMove({
    sessionId: 'session/研发 1',
    currentUrl: 'https://localhost:3080/app?view=chat&session=old#turn-2',
    navigate,
  })

  expect(navigate).toHaveBeenCalledWith('https://localhost:3080/app?view=chat&session=session%2F%E7%A0%94%E5%8F%91+1#turn-2')
})

test('当前地址已经选中被移动会话时仍执行导航以重建可写状态', () => {
  const navigate = vi.fn()
  const currentUrl = 'https://localhost:3080/app?session=session-1'

  finishSessionMove({ sessionId: 'session-1', currentUrl, navigate })

  expect(navigate).toHaveBeenCalledOnce()
  expect(navigate).toHaveBeenCalledWith(currentUrl)
})
