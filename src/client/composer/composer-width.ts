export const COMPOSER_MIN_WIDTH = 640
export const COMPOSER_EDGE_BUDGET = 176
/**
 * 新建页拖柄唯一允许写入的变量。
 *
 * 宿主宽度变量（`--dsh-chat-user-width` / `--dsh-chat-content-width`）由 DSH 自己发布：0.2.2-rc.5 发布到
 * 会话根节点，0.2.3-alpha.2 改为只发布到正文节点并注册为不继承。插件若把值写进这两个变量，行内样式会
 * 盖住宿主之后的重算；宿主也不会再改写它，于是正文停在旧宽度，直到正文节点重挂（切页）才恢复（Issue #115）。
 * 因此这里只写插件私有变量，再由新建页样式映射给宿主变量，且映射规则限定在 `[data-phase=hero]` 内 ——
 * 离开新建页即自动失效，不需要清理时序配合。
 */
const HERO_WIDTH_VAR = '--dcu-hero-chat-width'
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
  style.textContent = `[data-phase=hero]:has([data-conversation-scroll]){position:relative}[data-dcu-width-handle]{position:absolute;top:0;bottom:0;width:32px;padding:0;border:0;background:transparent;cursor:col-resize;touch-action:none;z-index:100;outline-offset:-5px}[data-dcu-width-handle=left]{right:calc(50% + var(--dcu-hero-chat-width, 640px) / 2 + 16px)}[data-dcu-width-handle=right]{left:calc(50% + var(--dcu-hero-chat-width, 640px) / 2 + 16px)}[data-dcu-width-handle]::after{content:'';position:absolute;top:calc(var(--dcu-pointer-y,50%) - 50px);height:100px;width:3px;left:14px;border-radius:3px;background:linear-gradient(transparent,var(--dsw-alias-scrollbar-hover-l1,#888),transparent);opacity:0}[data-dcu-width-handle]:hover::after,[data-dcu-width-handle]:focus-visible::after,[data-dcu-width-handle][data-dragging]::after{opacity:1}[data-phase=hero]:has([data-conversation-composer-overlay]) [data-dcu-width-handle]{display:none}`
  document.head.append(style)
  const sync = () => {
    for (const [root, dispose] of mounted) {
      if (!root.isConnected || root.dataset.phase !== 'hero') { dispose(); mounted.delete(root) }
    }
    for (const root of document.querySelectorAll<HTMLElement>('[data-phase=hero]')) {
      if (mounted.has(root) || !root.querySelector('[data-conversation-scroll]')) continue
      const body = root.querySelector<HTMLElement>('[class*="_body"]:has([data-conversation-scroll])') ?? root.querySelector<HTMLElement>('[class*="_body"]')
      const clamp = (value: number) => Math.min(Math.max(COMPOSER_MIN_WIDTH, value), Math.max(COMPOSER_MIN_WIDTH, root.clientWidth - COMPOSER_EDGE_BUDGET))
      const stored = () => {
        try { return localStorage.getItem('dsh.conversation.contentWidth') ?? undefined }
        catch { return undefined }
      }
      const current = () => {
        const own = root.style.getPropertyValue(HERO_WIDTH_VAR)
        // 已经在本节点拖过：本次拖拽以插件私有变量为起点；否则先读宿主发布值（0.2.2 写根、0.2.3 写正文）。
        const host = root.hasAttribute('data-dcu-hero-width') ? '' : body?.style.getPropertyValue('--dsh-chat-user-width') || getComputedStyle(root).getPropertyValue('--dsh-chat-user-width') || getComputedStyle(root).getPropertyValue('--dsh-chat-content-width')
        const raw = host || own || stored()
        return clamp(Number.parseFloat(raw ?? '') || COMPOSER_MIN_WIDTH)
      }
      // 宿主已发布宽度时以其为准；只有宿主没给值时，私有变量才作为上一次拖拽的起点。
      const publish = (width: number, save: boolean) => {
        const value = clamp(width)
        // 先写值再打标记：标记一出现映射就生效，避免闪一帧没有有效值的中间态。
        root.style.setProperty(HERO_WIDTH_VAR, `${value}px`)
        root.dataset.dcuHeroWidth = ''
        if (save) {
          try { localStorage.setItem('dsh.conversation.contentWidth', String(value)) }
          catch (error) { console.warn('[codex-ui] 无法保存输入区宽度。', error) }
        }
      }
      publish(current(), false)
      const abortDrags: Array<() => void> = []
      const handles = ['left', 'right'].map(side => {
        const handle = document.createElement('button')
        handle.type = 'button'
        handle.dataset.dcuWidthHandle = side
        handle.setAttribute('aria-label', label)
        let origin = 0
        let initial = COMPOSER_MIN_WIDTH
        let dragging = false
        let pointerId: number | undefined
        // 最后一次真正拖到的宽度：窗口外松开时用它结算，而不是用「重新进窗」那一帧的坐标。
        let last = COMPOSER_MIN_WIDTH
        const delta = (event: PointerEvent) => initial + (event.clientX - origin) * (side === 'right' ? 2 : -2)
        // 拖拽状态机放在 window 上：setPointerCapture 在部分宿主/窗口未聚焦时会抛错，
        // 只挂 handle 自己的 pointermove 会让拖拽彻底失灵（拖动无反应）。window 监听不依赖捕获。
        const onWindowMove = (event: PointerEvent) => {
          if (!dragging || event.pointerId !== pointerId) return
          // 在窗口外松开时 pointerup 不会被投递，只剩一串 buttons=0 的 move：
          // 这里按最后拖到的宽度落盘（不能用本次事件坐标，否则宽度会跟着重新进窗的位置跳一下并持久化）。
          if (event.buttons === 0) {
            publish(last, true)
            finish()
            return
          }
          last = delta(event)
          publish(last, false)
        }
        const onWindowEnd = (event: PointerEvent) => {
          if (!dragging || event.pointerId !== pointerId) return
          publish(delta(event), true)
          finish()
        }
        const finish = () => {
          dragging = false
          pointerId = undefined
          delete handle.dataset.dragging
          window.removeEventListener('pointermove', onWindowMove)
          window.removeEventListener('pointerup', onWindowEnd)
          window.removeEventListener('pointercancel', finish)
        }
        abortDrags.push(finish)
        handle.addEventListener('pointerdown', event => {
          if (event.button !== 0) return
          event.preventDefault()
          origin = event.clientX
          initial = current()
          last = initial
          dragging = true
          pointerId = event.pointerId
          handle.dataset.dragging = ''
          try { handle.setPointerCapture(event.pointerId) } catch { /* 捕获失败不影响 window 监听 */ }
          window.addEventListener('pointermove', onWindowMove)
          window.addEventListener('pointerup', onWindowEnd)
          window.addEventListener('pointercancel', finish)
        })
        handle.addEventListener('pointermove', event => {
          handle.style.setProperty('--dcu-pointer-y', `${event.clientY - handle.getBoundingClientRect().top}px`)
        })
        handle.addEventListener('lostpointercapture', event => {
          // 捕获被系统收回（窗口失焦、设备切换）时按最后拖到的宽度落定，避免状态卡在 dragging。
          if (!dragging || event.pointerId !== pointerId) return
          publish(last, true)
          finish()
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
      mounted.set(root, () => {
        abortDrags.forEach(stop => stop())
        handles.forEach(handle => handle.remove())
        root.style.removeProperty(HERO_WIDTH_VAR)
        delete root.dataset.dcuHeroWidth
      })
    }
  }
  const observer = new MutationObserver(sync)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase'] })
  sync()
  return () => { observer.disconnect(); mounted.forEach(dispose => dispose()); mounted.clear(); style.remove() }
}
