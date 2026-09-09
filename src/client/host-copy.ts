import type { CodexUiKey } from './locales.ts'

type Locale = { subscribe: (listener: () => void) => () => void }
type Translate = (key: CodexUiKey) => string
const commands = {
  compact: ['Compact older conversation history', 'host.command.compact'],
  export: ['Download this Session log as a ZIP archive', 'host.command.export'],
  feedback: ['record feedback about this session', 'host.command.feedback'],
  goal: ['set or view the goal for a long-running task', 'host.command.goal'],
  permission: ['Switch the permission preset (sandbox mode + approval policy)', 'host.command.permission'],
  plan: ['Enter or leave plan mode', 'host.command.plan'],
} as const
const transcript = { Normal: 'host.transcript.normal', Compact: 'host.transcript.compact' } as const

/** 只补译已核对的宿主控件文本；保留原 Text 节点、事件和业务状态。 */
export function observeHostCopy(locale: Locale, t: Translate): () => void {
  const owned = new Map<Text, { original: string; rendered: string; key: CodexUiKey }>()
  const replace = (element: Element, original: string, key: CodexUiKey) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let node: Node | null
    while ((node = walker.nextNode()) !== null) {
      if (node.nodeValue?.trim() !== original) continue
      const text = node as Text
      const rendered = text.data.replace(original, t(key))
      owned.set(text, { original: text.data, rendered, key })
      if (text.data !== rendered) text.data = rendered
    }
  }
  const apply = () => {
    for (const [node, state] of owned) {
      if (!node.isConnected || node.data !== state.rendered) { owned.delete(node); continue }
      const next = state.original.replace(state.original.trim(), t(state.key))
      if (node.data !== next) node.data = next
      state.rendered = next
    }
    const selector = document.querySelector('[data-dcu-settings-item="transcript-view"] button[aria-haspopup="menu"]')
    if (selector) {
      for (const [original, key] of Object.entries(transcript)) replace(selector, original, key)
      // 原 Menu 使用 portal；同时核对两个完整选项，避免匹配其他设置的下拉菜单。
      if (selector.getAttribute('aria-expanded') === 'true') {
        for (const menu of document.querySelectorAll('[role="menu"]')) {
          const items = [...menu.querySelectorAll('[role="menuitem"],[role="menuitemradio"]')]
          const labels = items.map(item => item.textContent?.trim())
          if (items.length !== 2 || !['Normal', t('host.transcript.normal')].some(label => labels.includes(label))
            || !['Compact', t('host.transcript.compact')].some(label => labels.includes(label))) continue
          for (const item of items) for (const [original, key] of Object.entries(transcript)) replace(item, original, key)
        }
      }
    }
    for (const option of document.querySelectorAll('[data-trigger-menu] button[role="option"]')) {
      const spans = [...option.children].filter(child => child.tagName === 'SPAN' && child.getAttribute('aria-hidden') !== 'true')
      const name = spans[0]?.textContent?.trim()
      if (!name || !Object.hasOwn(commands, name) || !spans[1]) continue
      const [original, key] = commands[name as keyof typeof commands]
      replace(spans[1], original, key)
    }
  }
  const scope = '[data-trigger-menu],[data-dcu-settings-item="transcript-view"],[role="menu"]'
  const roots = new Map<Element, MutationObserver>()
  const discover = () => {
    for (const [element, observer] of roots) if (!element.isConnected) { observer.disconnect(); roots.delete(element) }
    for (const element of document.querySelectorAll(scope)) {
      if (roots.has(element)) continue
      const observer = new MutationObserver(apply)
      observer.observe(element, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-expanded'] })
      roots.set(element, observer)
    }
    apply()
  }
  // 全局仅发现控件挂载；字符变化只在已知设置项和菜单内观察。
  const observer = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
      node instanceof Element && (node.matches(scope) || node.querySelector(scope) !== null)))) discover()
  })
  discover()
  observer.observe(document.body, { subtree: true, childList: true })
  const unsubscribe = locale.subscribe(apply)
  return () => {
    observer.disconnect()
    roots.forEach(observer => observer.disconnect())
    roots.clear()
    unsubscribe()
    for (const [node, state] of owned) if (node.data === state.rendered) node.data = state.original
    owned.clear()
  }
}
