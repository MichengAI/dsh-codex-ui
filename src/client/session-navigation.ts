/** 新版会话控制器不再负责主面板切换；打开会话时同时退出全局面板。 */
export function openConversation<T>(sessions: { open(id: T): void }, layout: object, id: T): void {
  sessions.open(id)
  selectGlobalPanel(layout, null)
}

/** 统一检测旧宿主是否提供面板切换能力，保留宿主方法的 this。 */
export function selectGlobalPanel(layout: object, id: string | null): void {
  if ('selectPanel' in layout && typeof layout.selectPanel === 'function') layout.selectPanel(id)
}
