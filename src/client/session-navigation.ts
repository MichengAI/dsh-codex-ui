import { openHostSession, withSessionBinding, type HostSessionAccess, type SessionBindingLike } from './session-host.ts'

/** 官方 alpha.2 走 uiWorkspace.openSession；旧宿主继续 sessions.open。只有打开成功才退出全局面板。 */
export function openConversation(host: HostSessionAccess, layout: object, id: string): boolean
export function openConversation(host: object, layout: object, id: string): boolean
export function openConversation(host: object, layout: object, id: string): boolean {
  const opened = openHostSession(host, id)
  if (opened) selectGlobalPanel(layout, null)
  return opened
}

/** 先打开再写草稿，避免 using 释放后 composer 换新 binding。 */
export async function openConversationWithDraft(
  host: object,
  layout: object,
  sessions: object | undefined,
  sessionId: string,
  writeDraft: (binding: SessionBindingLike) => void,
): Promise<boolean> {
  return withSessionBinding(sessions, sessionId, binding => {
    const opened = openConversation(host, layout, sessionId)
    writeDraft(binding)
    return opened
  })
}

/** 统一检测旧宿主是否提供面板切换能力，保留宿主方法的 this。 */
export function selectGlobalPanel(layout: object, id: string | null): void {
  if ('selectPanel' in layout && typeof layout.selectPanel === 'function') layout.selectPanel(id)
}
