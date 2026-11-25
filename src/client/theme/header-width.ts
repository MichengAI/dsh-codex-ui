/**
 * 云母浮动顶栏的宽度跟随。
 *
 * 宿主会按保存的偏好与窗口尺寸算出聊天内容宽度，并把结果发布成 CSS 变量：
 * `0.2.2-rc.5` 发布到会话根节点，`0.2.3-alpha.2` 起改成只发布到正文节点，且把相关变量注册为
 * `inherits: false`。浮动顶栏与正文互为兄弟，挂在顶栏上的规则因此拿不到这个值，只能退回到
 * 按列宽估算的兜底宽度 —— 表现就是「拖宽输入区，顶栏不变」。
 *
 * 这里把正文节点上已经解析好的内容宽度提升到会话根节点，命名空间用插件自己的
 * `--dcu-chat-content-width`，绝不改写宿主变量；正文消失或值还不是绝对长度时删除该变量，
 * 让顶栏回到上游兜底规则。
 */

const HOST_CONTENT_WIDTH = '--dsh-chat-content-width'
const HEADER_WIDTH = '--dcu-chat-content-width'
const ROOT_SELECTOR = '[data-dsh-glass-frame] [data-phase]'
const BODY_SELECTOR = '[data-conversation-content]'

/** 只接受宿主已解析成绝对长度的值；`clamp(...)`、`var(...)` 这类未解析文本交给上游兜底。 */
const ABSOLUTE_LENGTH = /^\d+(\.\d+)?px$/

/**
 * 用宏任务合并同一批突变触发，而不是 requestAnimationFrame：
 * Electron 窗口在后台或被遮挡时 rAF 会被暂停，宿主却照常重排（最大化、切换会话都会触发），
 * 依赖 rAF 会让顶栏钉在旧宽度上，正是要修的现象。
 */
const nextFrame = (callback: () => void): number => setTimeout(callback, 0) as unknown as number
const cancelFrame = (id: number): void => clearTimeout(id)

function readContentWidth(body: HTMLElement): string {
  const value = getComputedStyle(body).getPropertyValue(HOST_CONTENT_WIDTH).trim()
  return ABSOLUTE_LENGTH.test(value) ? value : ''
}

/**
 * 跟随宿主内容宽度，把结果写到会话根节点。
 *
 * @returns 注销函数：断开全部观察器并清掉插件变量。
 */
export function startGlassHeaderWidthTracker(): () => void {
  if (typeof document === 'undefined') return () => {}
  const observed = new Set<HTMLElement>()
  const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => schedule())
  let frame: number | undefined
  let disposed = false

  const track = (body: HTMLElement): void => {
    if (resizeObserver === undefined || observed.has(body)) return
    observed.add(body)
    resizeObserver.observe(body)
  }

  const sync = (): void => {
    frame = undefined
    if (disposed) return
    for (const root of document.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
      // 同一会话可能同时挂着多个正文节点（嵌入视图、接管页残留），取实际占据宽度的那个：
      // 隐藏分支上的节点会保留旧宽度，读它就会把顶栏钉在过期值上。
      const bodies = Array.from(root.querySelectorAll<HTMLElement>(BODY_SELECTOR))
      for (const body of bodies) track(body)
      const visible = bodies
        .map(body => ({ body, width: body.getBoundingClientRect().width }))
        .sort((left, right) => right.width - left.width)[0]
      const width = visible === undefined ? '' : readContentWidth(visible.body)
      if (width === '') root.style.removeProperty(HEADER_WIDTH)
      else root.style.setProperty(HEADER_WIDTH, width)
    }
  }

  function schedule(): void {
    if (disposed || frame !== undefined) return
    frame = nextFrame(sync)
  }

  // 会话切换、窗口缩放、宿主重算都会改变正文宽度：MutationObserver 管结构，ResizeObserver 管尺寸，
  // window.resize 兜住桌面端最大化（部分帧上正文尺寸未必变化，但列宽与兜底需要重算）。
  const observer = new MutationObserver(schedule)
  // 宿主重算时既可能换节点（childList）、切相位（data-phase），也可能只改正文上的行内宽度（style）。
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase', 'style'] })
  window.addEventListener('resize', schedule)
  sync()

  return () => {
    disposed = true
    observer.disconnect()
    resizeObserver?.disconnect()
    observed.clear()
    window.removeEventListener('resize', schedule)
    if (frame !== undefined) cancelFrame(frame)
    frame = undefined
    for (const root of document.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) root.style.removeProperty(HEADER_WIDTH)
  }
}
