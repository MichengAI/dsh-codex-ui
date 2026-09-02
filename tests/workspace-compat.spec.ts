import { expect, test } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import { recentWorkspaceId, workspaceBaselinesReady } from '../src/client/workspace-compat.ts'

const sessionId = (value: string): SessionId => value as SessionId
const workspaceId = (value: string): WorkspaceId => value as WorkspaceId

test('最近工作区按会话活跃时间选择，并在时间相同时保持 Host 顺序', () => {
  const workspaces = [
    { workspaceId: workspaceId('workspace-first'), sessionIds: [sessionId('session-first')], createdAt: '2026-09-01T00:00:00.000Z' },
    { workspaceId: workspaceId('workspace-latest'), sessionIds: [sessionId('session-latest')], createdAt: '2026-08-01T00:00:00.000Z' },
  ]

  expect(recentWorkspaceId(workspaces, {
    'session-first': { updatedAt: 10 },
    'session-latest': { updatedAt: 20 },
  })).toBe('workspace-latest')
  expect(recentWorkspaceId(workspaces, {
    'session-first': { updatedAt: 20 },
    'session-latest': { updatedAt: 20 },
  })).toBe('workspace-first')
})

test('无有效会话时按工作区创建时间选择，空列表返回 undefined', () => {
  const workspaces = [
    { workspaceId: workspaceId('workspace-old'), sessionIds: [sessionId('missing')], createdAt: '2026-08-01T00:00:00.000Z' },
    { workspaceId: workspaceId('workspace-new'), sessionIds: [], createdAt: '2026-09-01T00:00:00.000Z' },
  ]

  expect(recentWorkspaceId(workspaces, {})).toBe('workspace-new')
  expect(recentWorkspaceId([], {})).toBeUndefined()
})

test('基线就绪兼容旧版聚合字段和新版双 phase', () => {
  expect(workspaceBaselinesReady({ baselinesReady: true }, {})).toBe(true)
  expect(workspaceBaselinesReady({ baselinesReady: false, phase: 'ready' }, { phase: 'ready' })).toBe(false)
  expect(workspaceBaselinesReady({ phase: 'ready' }, { phase: 'ready' })).toBe(true)
  expect(workspaceBaselinesReady({ phase: 'pending' }, { phase: 'ready' })).toBe(false)
  expect(workspaceBaselinesReady({ phase: 'ready' }, { phase: 'pending' })).toBe(false)
  expect(workspaceBaselinesReady({ phase: 'ready' }, {})).toBe(false)
})
