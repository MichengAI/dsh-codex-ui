export const COMPOSER_MIN_WIDTH = 640
export const COMPOSER_EDGE_BUDGET = 176
/** 按用户要求用最窄宽度替代宿主自适应默认；已有有效偏好不重置，拖拽起点沿用宿主存储。 */
export function initializeComposerWidth(storage: Pick<Storage, 'getItem' | 'setItem'>): void {
  const key = 'dsh.conversation.contentWidth'
  try {
    const saved = Number(storage.getItem(key))
    if (Number.isFinite(saved) && saved > 0) return
    storage.setItem(key, String(COMPOSER_MIN_WIDTH))
  } catch (error) {
    console.warn('[codex-ui] 无法初始化输入区宽度，将使用宿主默认值。', error)
  }
}
/** 新建页没有宿主 WidthHandle，补充同一宽度偏好的拖拽入口。 */
export function observeHeroWidthHandles(label: string): () => void {
  const mounted = new Map<HTMLElement, () => void>()
  const style = document.createElement('style')
  style.textContent = `[data-phase=hero]:has([data-conversation-scroll]){position:relative}[data-dcu-width-handle]{position:absolute;top:0;bottom:0;width:32px;padding:0;border:0;background:transparent;cursor:col-resize;touch-action:none;z-index:8;outline-offset:-5px}[data-dcu-width-handle=left]{right:calc(50% + var(--dsh-chat-content-width) / 2 + 16px)}[data-dcu-width-handle=right]{left:calc(50% + var(--dsh-chat-content-width) / 2 + 16px)}[data-dcu-width-handle]::after{content:'';position:absolute;top:calc(var(--dcu-pointer-y,50%) - 50px);height:100px;width:3px;left:14px;border-radius:3px;background:linear-gradient(transparent,var(--dsw-alias-scrollbar-hover-l1,#888),transparent);opacity:0}[data-dcu-width-handle]:hover::after,[data-dcu-width-handle]:focus-visible::after,[data-dcu-width-handle][data-dragging]::after{opacity:1}[data-phase=hero]:has([data-conversation-composer-overlay]) [data-dcu-width-handle]{display:none}`
  document.head.append(style)
  const sync = () => {
    for (const [root, dispose] of mounted) {
      if (!root.isConnected || root.dataset.phase !== 'hero') { dispose(); mounted.delete(root) }
    }
    for (const root of document.querySelectorAll<HTMLElement>('[data-phase=hero]')) {
      if (mounted.has(root) || !root.querySelector('[data-conversation-scroll]')) continue
      const clamp = (value: number) => Math.min(Math.max(COMPOSER_MIN_WIDTH, value), Math.max(COMPOSER_MIN_WIDTH, root.clientWidth - COMPOSER_EDGE_BUDGET))
      const current = () => {
        const raw = getComputedStyle(root).getPropertyValue('--dsh-chat-user-width')
        return clamp(parseFloat(raw) || COMPOSER_MIN_WIDTH)
      }
      const publish = (width: number, save: boolean) => {
        const value = clamp(width)
        root.style.setProperty('--dsh-chat-user-width', `${value}px`)
        if (save) {
          try { localStorage.setItem('dsh.conversation.contentWidth', String(value)) }
          catch (error) { console.warn('[codex-ui] 无法保存输入区宽度。', error) }
        }
      }
      const handles = ['left', 'right'].map(side => {
        const handle = document.createElement('button')
        handle.type = 'button'
        handle.dataset.dcuWidthHandle = side
        handle.setAttribute('aria-label', label)
        let origin = 0
        let initial = COMPOSER_MIN_WIDTH
        let dragging = false
        handle.addEventListener('pointerdown', event => {
          if (event.button !== 0) return
          event.preventDefault()
          origin = event.clientX
          initial = current()
          dragging = true
          handle.dataset.dragging = ''
          handle.setPointerCapture(event.pointerId)
        })
        handle.addEventListener('pointermove', event => {
          handle.style.setProperty('--dcu-pointer-y', `${event.clientY - handle.getBoundingClientRect().top}px`)
          if (dragging) publish(initial + (event.clientX - origin) * (side === 'right' ? 2 : -2), false)
        })
        handle.addEventListener('pointerup', event => {
          if (!dragging) return
          publish(initial + (event.clientX - origin) * (side === 'right' ? 2 : -2), true)
          dragging = false
          delete handle.dataset.dragging
          handle.releasePointerCapture(event.pointerId)
        })
        handle.addEventListener('lostpointercapture', () => {
          if (dragging) publish(initial, false)
          dragging = false
          delete handle.dataset.dragging
        })
        handle.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return
          event.preventDefault()
          const delta = (event.key === 'ArrowRight' ? 1 : -1) * (side === 'right' ? 1 : -1) * 20
          publish(event.key === 'Home' ? COMPOSER_MIN_WIDTH : current() + delta, true)
        })
        root.append(handle)
        return handle
      })
      mounted.set(root, () => { handles.forEach(handle => handle.remove()) })
    }
  }
  const observer = new MutationObserver(sync)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase'] })
  sync()
  return () => { observer.disconnect(); mounted.forEach(dispose => dispose()); mounted.clear(); style.remove() }
}
