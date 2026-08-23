/**
 * DSH 尚未公开会话滚动容器和消息锚点服务；把兼容读取集中在这里，方便
 * 宿主提供正式 API 后只替换这一处。所有调用均可失败，不改写会话数据。
 */
export function conversationScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-conversation-scroll]')
}

export function conversationAnchor(root: HTMLElement, key: string): HTMLElement | null {
  return conversationAnchors(root).get(key) ?? null
}

/** 一次扫描生成锚点索引，滚动帧内不得为每个轮次重复遍历 DOM。 */
export function conversationAnchors(root: HTMLElement): ReadonlyMap<string, HTMLElement> {
  const anchors = new Map<string, HTMLElement>()
  for (const anchor of root.querySelectorAll<HTMLElement>('[data-chat-anchor-key]')) {
    const key = anchor.dataset.chatAnchorKey
    if (key !== undefined && !anchors.has(key)) anchors.set(key, anchor)
  }
  return anchors
}
