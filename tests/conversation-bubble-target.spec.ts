// @vitest-environment jsdom
import { expect, test } from 'vitest'
import { restoreOfficialUserBubbles } from '../src/client/conversation-bubbles.ts'

test('撤销展开覆盖，保留官方正文、附件和引用布局', () => {
  document.body.innerHTML = `<div data-time-hover-root><div>
    <div data-message-attachments data-dcu-expandable-user-bubble>文件一 文件二</div>
  </div></div><div data-time-hover-root><div>
    <div data-message-attachments>附件</div><div class="abc_bubble">正文</div><div class="abc_referenceSummary">引用</div>
  </div></div>`
  restoreOfficialUserBubbles(document)
  expect(document.querySelectorAll('[data-dcu-expandable-user-bubble]')).toHaveLength(0)
  expect(document.querySelector('.abc_bubble')?.hasAttribute('data-dcu-expandable-user-bubble')).toBe(false)
})
