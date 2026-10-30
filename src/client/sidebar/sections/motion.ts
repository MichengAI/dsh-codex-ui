/**
 * 分区事务的布局动效：宿主仍拥有所有项目节点，只在一次最终布局上做块级 FLIP。
 * 普通原生拖拽不进入此流程；不调用 React 实例或宿主私有动画方法。
 */
export class SectionLayoutMotion {
  private readonly positions = new Map<HTMLElement, DOMRect>()
  private readonly animations = new Set<Animation>()

  constructor(private readonly list: HTMLElement) {
    for (const element of Array.from(list.children)) {
      if (element instanceof HTMLElement) this.positions.set(element, element.getBoundingClientRect())
    }
  }

  /** 合并标题与成员最终布局，在同一绘制前替换本次排序的行级位移。 */
  play(layout: () => void): Promise<void> {
    for (const row of Array.from(this.list.querySelectorAll<HTMLElement>('[data-row-key]'))) {
      // 仅取消本列表正在运行的位移动效；不碰颜色、状态提示等其他动画。
      for (const animation of row.getAnimations?.() ?? []) {
        const effect = animation.effect as KeyframeEffect | null
        if (typeof effect?.getKeyframes === 'function' && effect.getKeyframes().some(frame => frame.transform !== undefined)) {
          animation.cancel()
        }
      }
    }
    layout()
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve()

    // 先统一读几何，再启动动画，避免边写 transform 边测后续项目。
    const frames = Array.from(this.list.children).flatMap<{ element: HTMLElement; keyframes: Keyframe[] }>(element => {
      if (!(element instanceof HTMLElement) || typeof element.animate !== 'function') return []
      const before = this.positions.get(element)
      const after = element.getBoundingClientRect()
      if (after.height === 0) return []
      if (before === undefined || before.height === 0) return [{ element, keyframes: [{ opacity: 0 }, { opacity: 1 }] }]
      const dx = before.left - after.left
      const dy = before.top - after.top
      if (dx === 0 && dy === 0) return []
      return [{ element, keyframes: [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }] }]
    })
    const finished = frames.map(({ element, keyframes }) => {
      const animation = element.animate(keyframes, { duration: 200, easing: 'ease-out' })
      this.animations.add(animation)
      return animation.finished.catch(() => {}).then(() => {
        animation.cancel()
        this.animations.delete(animation)
      })
    })
    return Promise.all(finished).then(() => {})
  }

  /** 卸载时取消本实例创建的动画，释放对宿主节点的引用。 */
  dispose(): void {
    for (const animation of this.animations) animation.cancel()
    this.animations.clear()
    this.positions.clear()
  }
}
