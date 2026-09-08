// 排序仍由各行维护落点；绘制统一使用可见行的几何边界，不依赖外层留白。
const ROWS = '.dcu-wb-section-head,.dcu-wb-collection-head,.dcu-wb-project-head,.dcu-wb-session,.dcu-wb-nochat,.dcu-wb-empty'
const TARGETS = '.dcu-wb-drop,.dcu-wb-group-order-drop'

export type DropIndicatorRect = { top: number; left: number; width: number }

export function measureWorkspaceDropIndicator(root: HTMLElement): DropIndicatorRect | undefined {
  const target = Array.from(root.querySelectorAll<HTMLElement>(TARGETS))
    .find(node => node.closest('[data-open=false]') === null)
  if (target === undefined) return undefined
  const section = target.closest('.dcu-wb-section') ?? root
  const rows = Array.from(section.querySelectorAll<HTMLElement>(ROWS))
    .filter(node => node.closest('[data-open=false]') === null)
    .map(node => ({ node, rect: node.getBoundingClientRect() }))
    .filter(row => row.rect.height > 0 && row.rect.width > 0)
  const owned = rows.filter(row => row.node === target || target.contains(row.node))
  const after = target.classList.contains('dcu-wb-drop-after')
  let upper: number | undefined
  let lower: number | undefined
  let anchor = target.getBoundingClientRect()
  if (owned.length > 0) {
    const edge = after ? owned[owned.length - 1]! : owned[0]!
    const index = rows.indexOf(edge)
    anchor = edge.rect
    upper = after ? edge.rect.bottom : rows[index - 1]?.rect.bottom
    lower = after ? rows[index + 1]?.rect.top : edge.rect.top
  } else if (target.matches('.dcu-wb-pin-start,.dcu-wb-pin-end')) {
    // 空列表和列表末尾已有专用槽；有相邻行时仍按两行的边界居中。
    upper = rows.filter(row => row.rect.bottom <= anchor.top).at(-1)?.rect.bottom
    lower = rows.find(row => row.rect.top >= anchor.bottom)?.rect.top
    if (lower === undefined) lower = anchor.bottom
    if (upper === undefined) upper = anchor.top
  } else return undefined
  const center = upper === undefined ? lower! - 4 : lower === undefined ? upper + 4 : (upper + lower) / 2
  const box = root.getBoundingClientRect()
  return {
    top: center - box.top - root.clientTop + root.scrollTop - 4,
    left: anchor.left - box.left - root.clientLeft + root.scrollLeft + 4,
    width: Math.max(0, anchor.width - 12),
  }
}

/** 仅拖拽期间刷新，滚动、折叠动画和尺寸变化都使用当前帧的布局；结束时完整清理。 */
export function mountWorkspaceDropIndicator(root: HTMLElement): () => void {
  const line = root.ownerDocument.createElement('div')
  line.className = 'dcu-wb-drop-indicator'
  line.setAttribute('aria-hidden', 'true')
  root.append(line)
  root.dataset.dropIndicator = 'measured'
  const view = root.ownerDocument.defaultView!
  let frame = 0
  let previous = ''
  const update = () => {
    const rect = measureWorkspaceDropIndicator(root)
    const next = rect === undefined ? '' : `${rect.top},${rect.left},${rect.width}`
    line.hidden = rect === undefined
    if (rect !== undefined && next !== previous) {
      line.style.top = `${rect.top}px`
      line.style.left = `${rect.left}px`
      line.style.width = `${rect.width}px`
    }
    previous = next
    frame = view.requestAnimationFrame(update)
  }
  update()
  return () => { view.cancelAnimationFrame(frame); line.remove(); delete root.dataset.dropIndicator }
}
