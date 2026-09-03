import { describe, expect, it } from 'vitest'
import { workspaceGroupMoveTargets } from '../src/client/workspace-browser.ts'

const groups = [
  { id: 'group-a', title: '客户项目', workspaceIds: ['workspace-a'] },
  { id: 'group-b', title: '内部工具', workspaceIds: ['workspace-b'] },
]

describe('workspaceGroupMoveTargets', () => {
  it('为未分组项目列出全部自定义分组', () => {
    expect(workspaceGroupMoveTargets(groups, 'workspace-c')).toEqual([
      { groupId: 'group-a', title: '客户项目' },
      { groupId: 'group-b', title: '内部工具' },
    ])
  })

  it('排除当前分组并为已分组项目提供未分组目标', () => {
    expect(workspaceGroupMoveTargets(groups, 'workspace-a')).toEqual([
      { groupId: 'group-b', title: '内部工具' },
      { groupId: undefined, title: undefined },
    ])
  })

  it('没有自定义分组时不提供无效移动目标', () => {
    expect(workspaceGroupMoveTargets([], 'workspace-a')).toEqual([])
  })
})
