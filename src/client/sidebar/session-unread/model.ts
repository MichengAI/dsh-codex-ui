/**
 * 会话「未读」标记的纯逻辑层（不依赖 React，也不持有全局状态）。
 *
 * 事实来源：宿主 `uiSession` 的 `completionUnread` —— 会话跑完产生的未读提醒与手动标记
 * 共用这一份状态，所以标记后宿主自己会画绿点、算进侧栏水位线，打开会话时也照常清除。
 * 宿主没有公开的写接口，所有对内部集合的读写都收在本文件；契约漂移时一律 fail-closed。
 */

/** 宿主 `uiSession` 里本能力用到的成员，其余字段属于实现细节。 */
export interface SessionUnreadHost {
  /** 私有未读集合；不是 Set 时视为宿主契约漂移。 */
  completionUnread?: unknown
  /** 重算并广播 UI 状态；缺失时不能标记。 */
  publishStatus?: unknown
}

/** 会话行 `data-row-key` 的前缀。 */
const SESSION_ROW_KEY_PREFIX = 'session:'

/** 宿主行内操作区（CSS Module 哈希前后都保留 `rowActions`）。 */
const ROW_ACTIONS_SELECTOR = '[class*="rowActions"]'

/**
 * 从宿主行的 `data-row-key` 解析会话 id。
 *
 * @param key - 行节点的 `data-row-key`。
 * @returns 会话 id；工作区行、其它行与空键返回 undefined。
 */
export function sessionIdOfRowKey(key: string | null | undefined): string | undefined {
  if (key === null || key === undefined || !key.startsWith(SESSION_ROW_KEY_PREFIX)) return undefined
  const id = key.slice(SESSION_ROW_KEY_PREFIX.length)
  return id === '' ? undefined : id
}

/**
 * 是否有外部插件往操作区塞了非菜单按钮（归档管理器的星标就是这么插的）。
 *
 * @param button - 操作区内的候选按钮。
 * @returns 是外部按钮时返回 true。
 */
function isForeignButton(button: HTMLButtonElement): boolean {
  const className = button.getAttribute('class') ?? ''
  return className.includes('rowStar') || className.includes('dsham_')
}

/**
 * 找到会话行的「···」菜单锚点。
 *
 * 两代宿主结构都要认：
 * - 0.2.2+ 给锚点打了 `data-context-menu-trigger`，快捷操作收进 `rowQuickActions`；
 * - 0.2.1 由 `Menu` 原语把锚点包在自己的 `span` 里，归档 / 置顶按钮与它平级。
 * 标记优先，其次按「非快捷操作区的包裹果」、再按「直接子按钮」兜底。空白会话行没有
 * 操作区，返回 null（右击时保留浏览器原生菜单）。
 *
 * @param row - 会话行节点。
 * @returns 菜单锚点按钮或 null。
 */
export function findSessionMenuButton(row: Element): HTMLButtonElement | null {
  const actions = row.querySelector<HTMLElement>(ROW_ACTIONS_SELECTOR)
  if (actions === null) return null

  const marked = actions.querySelector<HTMLButtonElement>('button[data-context-menu-trigger]')
  if (marked !== null && !isForeignButton(marked)) return marked

  // 快捷操作区（归档 / 置顶 / 外部行按钮）不是「···」，任何层级都不能误判。
  const notQuickAction = (button: HTMLButtonElement): boolean =>
    !isForeignButton(button) && button.closest('[class*="rowQuickActions"]') === null

  const wrapped = Array.from(actions.querySelectorAll<HTMLButtonElement>(':scope > span > button')).filter(
    notQuickAction,
  )
  if (wrapped.length > 0) return wrapped[0] ?? null

  const direct = Array.from(actions.querySelectorAll<HTMLButtonElement>(':scope > button')).filter(
    notQuickAction,
  )
  if (direct.length > 0) return direct[0] ?? null

  const buttons = Array.from(actions.querySelectorAll<HTMLButtonElement>('button')).filter(notQuickAction)
  return buttons[0] ?? null
}

/**
 * 读取可写的未读集合。
 *
 * @param host - 宿主 `uiSession` 服务的最小可用面。
 * @returns 未读集合；服务缺失或内部字段改名时返回 undefined。
 */
export function unreadSetOf(host: SessionUnreadHost | undefined): Set<string> | undefined {
  if (host === undefined) return undefined
  if (!(host.completionUnread instanceof Set)) return undefined
  if (typeof host.publishStatus !== 'function') return undefined
  return host.completionUnread as Set<string>
}

/**
 * 写入或清除未读标记，并让宿主重算状态。
 *
 * 已经是目标值时直接成功（不重复广播）；广播抛错时回滚集合，避免内存状态与宿主
 * 渲染结果分叉。失败返回 false，调用方不做任何 UI 承诺。
 *
 * @param host - 宿主 `uiSession` 服务的最小可用面。
 * @param sessionId - 目标会话。
 * @param unread - 目标状态。
 * @returns 宿主状态是否已按目标写入。
 */
export function writeSessionUnread(
  host: SessionUnreadHost | undefined,
  sessionId: string,
  unread: boolean,
): boolean {
  const unreadSet = unreadSetOf(host)
  if (unreadSet === undefined || sessionId === '') return false

  const had = unreadSet.has(sessionId)
  if (had === unread) return true

  if (unread) unreadSet.add(sessionId)
  else unreadSet.delete(sessionId)

  try {
    ;(host as { publishStatus: () => void }).publishStatus()
    return true
  } catch {
    if (had) unreadSet.add(sessionId)
    else unreadSet.delete(sessionId)
    return false
  }
}
