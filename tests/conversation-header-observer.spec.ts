import { afterEach, expect, test, vi } from 'vitest'
import { observeConversationHeader } from '../src/client/conversation-header.ts'

afterEach(() => {
  document.body.innerHTML = ''
  document.head.querySelectorAll('[id^="dcu-"]').forEach(node => { node.remove() })
  vi.restoreAllMocks()
})

async function settleFrames(frames: Map<number, FrameRequestCallback>): Promise<void> {
  for (let pass = 0; pass < 4; pass += 1) {
    await new Promise(resolve => window.setTimeout(resolve, 0))
    const callbacks = [...frames.values()]
    frames.clear()
    for (const callback of callbacks) callback(performance.now())
  }
}

test('流式回答变化只处理所属消息子树，不扫描整个文档', async () => {
  document.body.innerHTML = `
    <header>
      <div class="host-titleRow"><div class="host-titleCluster"><nav class="host-crumbs"><button class="host-crumbCurrent">会话</button></nav><div class="host-headerActions"></div></div><div class="host-headerUtilities"></div></div>
      <div role="tablist"><button role="tab" aria-selected="true">对话</button></div>
    </header>
    <main><div data-time-hover-root data-turn-tail="1"><div><div class="assistant">回答</div></div></div></main>
  `
  let nextFrame = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    const id = ++nextFrame
    frames.set(id, callback)
    return id
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })

  const assistant = document.querySelector('.assistant') as HTMLElement
  const main = document.querySelector('main') as HTMLElement
  const stop = observeConversationHeader(document)
  await settleFrames(frames)

  const query = vi.spyOn(document, 'querySelector')
  const queryAll = vi.spyOn(document, 'querySelectorAll')
  assistant.append(document.createElement('span'))
  await settleFrames(frames)

  expect(query).not.toHaveBeenCalled()
  expect(queryAll).not.toHaveBeenCalled()

  const row = document.createElement('div')
  row.dataset.timeHoverRoot = ''
  row.innerHTML = '<div><div class="new-user">新增问题</div></div>'
  main.append(row)
  await settleFrames(frames)
  expect(row.querySelector<HTMLElement>('.new-user')?.dataset.dcuExpandableUserBubble).toBe('')
  expect(query).not.toHaveBeenCalled()
  expect(queryAll).not.toHaveBeenCalled()
  stop()
})
