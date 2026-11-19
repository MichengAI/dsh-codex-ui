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
 * 宿主未读服务是否具备可写能力（未读集合有效且广播方法存在）。
 */
export function canMarkSession(host: SessionUnreadHost | undefined): boolean {
  return unreadSetOf(host) !== undefined
}

/**
 * 目标会话是否处于已归档状态。
 */
export function isSessionArchived(archivedSessionIds: readonly string[] | undefined, sessionId: string): boolean {
  return archivedSessionIds?.includes(sessionId) === true
}

/**
 * 目标会话是否正在主视图中打开。
 */
export function isSessionOpenInMainView(sessionItem: { retainedBy?: { mainView?: number } } | undefined): boolean {
  return (sessionItem?.retainedBy?.mainView ?? 0) > 0
}

/**
 * 目标会话是否处于忙碌态（运行中或等待交互）。
 */
export function isSessionBusy(
  status: { running?: boolean; pendingInteraction?: unknown } | undefined,
  sessionItem?: { running?: boolean },
): boolean {
  return status?.running === true || status?.pendingInteraction !== undefined || sessionItem?.running === true
}

/**
 * 综合判断是否应向用户展示未读/已读切换菜单项。
 *
 * - 宿主契约漂移不可写时：不展示（fail-closed，杜绝点击静默无效）；
 * - 已归档会话：不展示；
 * - 当前处于已读态，但在主视图打开中或忙碌中：不展示（标记后会被宿主重算冲掉）；
 * - 当前处于未读态：始终展示「标记为已读」。
 */
export function shouldShowSessionUnreadAction(params: {
  canWrite: boolean
  isUnread: boolean
  isArchived: boolean
  isOpenInMainView: boolean
  isBusy: boolean
}): boolean {
  if (!params.canWrite) return false
  if (params.isArchived) return false
  if (!params.isUnread && (params.isOpenInMainView || params.isBusy)) return false
  return true
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
