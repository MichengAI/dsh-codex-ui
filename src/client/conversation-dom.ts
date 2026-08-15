/**
 * DSH 尚未公开会话滚动容器和消息锚点服务；把兼容读取集中在这里，方便
 * 宿主提供正式 API 后只替换这一处。所有调用均可失败，不改写会话数据。
 */
export function conversationScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-conversation-scroll]')
}

export function conversationAnchor(root: HTMLElement, key: string): HTMLElement | null {
  for (const anchor of root.querySelectorAll<HTMLElement>('[data-chat-anchor-key]')) {
    if (anchor.dataset.chatAnchorKey === key) return anchor
  }
  return null
}
