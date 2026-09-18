import { openHostSession, type HostSessionAccess } from './session-host.ts'

/** 官方 alpha.2 走 uiWorkspace.openSession；旧宿主继续 sessions.open。打开时同时退出全局面板。 */
export function openConversation(host: HostSessionAccess, layout: object, id: string): boolean
export function openConversation(host: object, layout: object, id: string): boolean
export function openConversation(host: object, layout: object, id: string): boolean {
  const opened = openHostSession(host, id)
  selectGlobalPanel(layout, null)
  return opened
}

/** 统一检测旧宿主是否提供面板切换能力，保留宿主方法的 this。 */
export function selectGlobalPanel(layout: object, id: string | null): void {
  if ('selectPanel' in layout && typeof layout.selectPanel === 'function') layout.selectPanel(id)
}
