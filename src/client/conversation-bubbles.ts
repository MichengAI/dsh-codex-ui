/** 把 DSH 右侧气泡改成 Codex 的左对齐紧凑卡片，不改会话数据。 */

export const USER_BUBBLE_STYLE_ID = 'dcu-user-bubble-style'

export const USER_BUBBLE_STYLE = `
[data-conversation-scroll] [data-chat-flow-kind="user"] [data-time-hover-root],
[data-conversation-scroll] [data-pending-steering][data-time-hover-root]{align-items:flex-start!important}
[data-conversation-scroll] [data-chat-flow-kind="user"] [data-time-hover-root]>div,
[data-conversation-scroll] [data-pending-steering][data-time-hover-root]>div{align-items:flex-start!important;max-width:min(640px,100%)!important}
[data-conversation-scroll] [data-dcu-user-source]{display:none!important}
[data-conversation-scroll] [data-dcu-user-card],
[data-conversation-scroll] [data-chat-flow-kind="user"] [data-time-hover-root]>div>[class*="bubble"],
[data-conversation-scroll] [data-pending-steering][data-time-hover-root]>div>[class*="bubble"]{background:color-mix(in srgb,var(--dsw-specific-bubble,rgba(255,255,255,.08)) 72%,transparent);color:var(--dsw-alias-label-primary,currentColor);border-radius:16px;padding:10px 14px;font-size:14px;line-height:20px;max-width:100%;box-sizing:border-box}
[data-conversation-scroll] [data-dcu-user-title]{display:block;color:var(--dsw-alias-label-primary,currentColor);font-size:14px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-conversation-scroll] [data-dcu-user-sub]{display:block;margin-top:2px;color:var(--dsw-alias-label-tertiary,currentColor);font-size:13px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`

export function splitUserCard(text: string): { title: string; sub?: string } {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '')
  if (lines.length >= 2) return { title: lines[0] ?? text, sub: lines.slice(1).join(' ') }
  return { title: text.trim() }
}

function findPlainBubble(stack: HTMLElement): HTMLElement | undefined {
  for (const child of stack.children) {
    if (!(child instanceof HTMLElement)) continue
    if (child.dataset.dcuUserCard !== undefined) continue
    if (child.matches('[class*="bubble"]')) return child
  }
  return undefined
}

function isPlainTextBubble(bubble: HTMLElement): boolean {
  return bubble.querySelector('pre,table,img,[class*="Json"]') === null
}

export function decorateUserBubbles(root: ParentNode): void {
  const rows = root.querySelectorAll<HTMLElement>('[data-chat-flow-kind="user"] [data-time-hover-root], [data-pending-steering][data-time-hover-root]')
  for (const row of rows) {
    const stack = row.firstElementChild
    if (!(stack instanceof HTMLElement)) continue
    const bubble = findPlainBubble(stack)
    if (bubble === undefined || !isPlainTextBubble(bubble)) continue
    const text = (bubble.innerText ?? bubble.textContent ?? '').replace(/\s+\n/g, '\n').trim()
    if (text === '') continue
    bubble.dataset.dcuUserSource = ''
    let card = stack.querySelector<HTMLElement>(':scope > [data-dcu-user-card]')
    if (card === null) {
      card = bubble.ownerDocument.createElement('div')
      card.dataset.dcuUserCard = ''
      bubble.after(card)
    }
    if (card.dataset.dcuUserText === text) continue
    const parts = splitUserCard(text)
    const title = bubble.ownerDocument.createElement('span')
    title.dataset.dcuUserTitle = ''
    title.textContent = parts.title
    card.replaceChildren(title)
    if (parts.sub !== undefined && parts.sub !== '') {
      const sub = bubble.ownerDocument.createElement('span')
      sub.dataset.dcuUserSub = ''
      sub.textContent = parts.sub
      card.append(sub)
    }
    card.dataset.dcuUserText = text
    card.title = text
  }
}

export function ensureUserBubbleStyle(doc: Document): void {
  if (doc.getElementById(USER_BUBBLE_STYLE_ID) !== null) return
  if (doc.head === null) return
  const style = doc.createElement('style')
  style.id = USER_BUBBLE_STYLE_ID
  style.textContent = USER_BUBBLE_STYLE
  doc.head.append(style)
}