/** 宿主的一次工作区移动；省略锚点表示移动到末尾。 */
export interface WorkspaceMove {
  workspaceId: string
  beforeWorkspaceId: string | undefined
}

/**
 * 生成一次性排序计划，不根据宿主中间帧反复纠偏。
 * 显式操作只允许移动给定的项目；启动恢复才允许调整整表。
 */
export function planWorkspaceMoves(
  current: readonly string[],
  desired: readonly string[],
  workspaceIds?: readonly string[],
): WorkspaceMove[] {
  const order = current.slice()
  const moves: WorkspaceMove[] = []
  const move = (workspaceId: string, beforeWorkspaceId: string | undefined): void => {
    if (!order.includes(workspaceId)) return
    const next = order.filter(id => id !== workspaceId)
    const at = beforeWorkspaceId === undefined ? next.length : next.indexOf(beforeWorkspaceId)
    if (at < 0) return
    next.splice(at, 0, workspaceId)
    if (next.every((id, index) => id === order[index])) return
    moves.push({ workspaceId, beforeWorkspaceId })
    order.splice(0, order.length, ...next)
  }

  if (workspaceIds !== undefined) {
    const moving = new Set(workspaceIds)
    // 从后往前放置，删除分区时也只移动被并入的成员。
    for (let index = desired.length - 1; index >= 0; index -= 1) {
      const id = desired[index]!
      if (moving.has(id)) move(id, desired[index + 1])
    }
  } else {
    // 仅用于启动时恢复持久化顺序，不用于菜单单项目操作。
    for (let index = 0; index < desired.length; index += 1) {
      if (order[index] !== desired[index]) move(desired[index]!, order[index])
    }
  }
  return moves
}
