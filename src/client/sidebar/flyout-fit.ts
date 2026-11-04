/**
 * 把悬浮二级菜单收进侧栏列矩形内。
 *
 * 为什么需要：宿主侧边栏在「收起/抽屉」状态下有 linger 逻辑（`SCROLLBAR_LINGER_MS = 2000`）——
 * 指针离开侧栏列的矩形后，`document` 上的 pointermove 会不断续期，2 秒后抽屉自动收起，
 * 挂在里面的菜单连同我们的二级菜单一起消失。二级菜单默认开在父菜单右边缘 +2px，
 * 在 280px 宽的抽屉里很容易伸出列外，于是「鼠标一移到分区上，两秒后整块消失」。
 *
 * 因此抽屉模式下必须把面板夹在列内：先尝试压缩宽度（与父菜单并排），
 * 空间不足时才右对齐到列内（允许压住父菜单一部分），但绝不越出列的左右上下边界。
 */

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface PanelBox {
  left: number
  top: number
  width: number
  height: number
}

export interface FitResult {
  left: number
  top: number
  width: number
  /** 是否被压缩过宽度（调用方需要写回 max-width/min-width） */
  shrunk: boolean
}

const DEFAULT_INSET = 6
/** 压缩到这个宽度以下就不再压，改为右对齐（比这个更窄菜单文字会挤成一团） */
const MIN_USABLE_WIDTH = 104

/** 列矩形是否真的可见（抽屉收起时 rect 会停在屏幕左侧外，此时不做夹取，否则会把面板也推出屏幕） */
export function isColumnVisible(column: Rect | null): boolean {
  if (column === null) return false
  return column.left > -4 && column.right - column.left >= 80
}

export function fitFlyoutIntoColumn(
  panel: PanelBox,
  column: Rect | null,
  options: { inset?: number; minUsableWidth?: number } = {},
): FitResult {
  if (!isColumnVisible(column)) {
    return { left: panel.left, top: panel.top, width: panel.width, shrunk: false }
  }
  const rect = column as Rect
  const inset = options.inset ?? DEFAULT_INSET
  const minUsable = options.minUsableWidth ?? MIN_USABLE_WIDTH
  const maxRight = rect.right - inset
  const minLeft = rect.left + inset
  const maxBottom = rect.bottom - inset
  const minTop = rect.top + inset

  let left = panel.left
  let width = panel.width
  let shrunk = false

  if (left + width > maxRight) {
    const available = maxRight - left
    if (available >= minUsable) {
      // 与父菜单并排，只是窄一点
      width = available
      shrunk = true
    } else {
      // 并排已经放不下：右对齐进列内，允许压住父菜单一部分，但保证指针不越出列
      left = Math.max(minLeft, maxRight - width)
    }
  }
  if (left < minLeft) {
    left = minLeft
    width = Math.min(width, maxRight - minLeft)
    shrunk = true
  }

  let top = panel.top
  if (top + panel.height > maxBottom) top = Math.max(minTop, maxBottom - panel.height)
  if (top < minTop) top = minTop

  return { left, top, width, shrunk }
}
