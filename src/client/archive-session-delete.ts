/** 永久删除会话由归档管理插件通过 remote.workspaceRegistry.deleteSession 提供。 */
export function hasArchiveSessionDelete(value: unknown): boolean {
  return value !== null && typeof value === 'object' && typeof (value as { deleteSession?: unknown }).deleteSession === 'function'
}
