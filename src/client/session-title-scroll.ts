/** 会话行只展示标题第一行，避免换行把胶囊撑高。 */
export function sessionTitleLine(title: string): string {
  return title.split(/\r?\n/)[0] ?? title
}

/** 标题比可视槽多出来的像素；1px 内当作测量误差。 */
export function titleOverflowPx(scrollWidth: number, clientWidth: number): number {
  const extra = Math.ceil(scrollWidth - clientWidth)
  return extra > 1 ? extra : 0
}

const PX_PER_SECOND = 42

/** 按溢出长度估算单程时长，长标题更慢，避免一闪而过。 */
export function titleScrollDurationMs(overflowPx: number): number {
  if (overflowPx <= 0) return 0
  return Math.min(8000, Math.max(1600, Math.round((overflowPx / PX_PER_SECOND) * 1000)))
}
