/** 按 0.1.5 新增的附件 DOM/CSS 合约验证覆盖后的计算布局。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const skin = readFileSync('src/client/CodexSidebar.tsx', 'utf8').match(/const stylesheet = `([\s\S]*?)`/)[1]
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const width of [390, 900, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.setContent(`<style>
      .card{display:flex;flex-direction:column;gap:12px}.abc_rail{padding:2px 10px 0;margin-bottom:-6px}
      .inner_root{position:relative;min-width:0}.inner_rail{display:flex;overflow:auto hidden;gap:10px}.thumbnail{display:block;height:64px;width:64px}
      [data-message-attachments]{display:flex;flex-wrap:wrap;gap:8px}
      ${skin}
      </style><section data-conversation-scroll><div class="card" data-composer-card><div data-slot="conversation.input.attachments" style="display:contents"><div class="abc_rail"><div class="inner_root"><div class="inner_rail"><div class="thumbnail">附件</div></div></div></div></div><div data-input-scroll style="height:44px">正文</div><div><button>发送</button></div></div></section>
      <div data-time-hover-root><div><div data-message-attachments>附件</div><div class="host_bubble">正文</div></div></div>`)
    const geometry = await page.evaluate(() => ({
      gap: document.querySelector('[data-input-scroll]').getBoundingClientRect().top - document.querySelector('.thumbnail').getBoundingClientRect().bottom,
      attachmentDisplays: [...document.querySelectorAll('[data-message-attachments]')].map(node => getComputedStyle(node).display),
    }))
    assert.equal(geometry.gap, 6, `${width}px：附件与正文保留官方 6px 可见间距`)
    assert.deepEqual(geometry.attachmentDisplays, ['flex'], '纯附件保留官方排列')
  }
  console.log('新版样式回归：附件间距与输入区保留官方排列。')
} finally { await browser.close() }
