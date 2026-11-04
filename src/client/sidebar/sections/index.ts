/**
 * 工作区分区（Codex 式）在宿主导航树上的落地层。
 *
 * 分工：
 * - **模型**（`./model.ts`）决定归属与顺序，纯函数、可单测；
 * - **本层**只做三件宿主侧的事：把分区标题插进原生列表、把归属翻译成宿主顺序（`workspaces.insertBefore`）、
 *   在项目行的 `···` 菜单里追加「分区 ›」入口。
 *
 * 不变量：永不移动、替换或删除宿主自己的行节点；标题只作为兄弟节点插在分组块之间，
 * 宿主重渲染后按需重新归位（位置一致时零写入）。
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { createElement } from 'react'
import { flushSync, render, unmountComponentAtNode } from 'react-dom'
import {
  DEFAULT_SECTION_ID,
  PINNED_SECTION_ID,
  assignWorkspace,
  createSection,
  createSectionsState,
  deleteSection,
  flattenSections,
  isBuiltinSection,
  normalizeSections,
  parseSections,
  reconcileHostOrder,
  renameSection,
  sectionOf,
  serializeSections,
  type SectionsState,
} from './model.ts'
import { SectionLayoutMotion } from './motion.ts'
import { planWorkspaceMoves } from './order.ts'
import { flushSectionsSave, loadSectionsDocument, scheduleSectionsSave } from './store.ts'

/** 分区标题行的标记属性，样式与测试都靠它定位。 */
export const SECTION_HEADER_ATTR = 'data-dcu-ws-section'

/** 追加在项目行菜单里的入口标记。 */
export const MENU_ITEM_ATTR = 'data-dcu-ws-section-item'

/** 宿主工作区快照里我们需要的最小形状。 */
interface WorkspaceSnapshotLike {
  items: readonly { workspaceId: string }[]
}

/** 宿主 `ctx.workspaces` 的最小可用面。 */
interface WorkspacesLike {
  list: {
    getSnapshot: () => WorkspaceSnapshotLike
    subscribe: (listener: () => void) => () => void
  }
  insertBefore: (workspaceId: string, beforeWorkspaceId?: string) => Promise<unknown>
}

/** 宿主列表里每个工作区分组块的定位信息。 */
interface ProjectBlock {
  workspaceId: string
  /** 分组块节点；标题要插在它前面。 */
  block: HTMLElement
}

const HEADER_CLASS = 'dcu-ws-section'
const STYLE_ID = 'michengai-codex-ui-sections-styles'

/** 各分区的折叠状态（与本文件的分区数据分键存放）。 */
const COLLAPSED_STORAGE_KEY = 'michengai.codex-ui.workspace-sections-collapsed.v1'

/**
 * 分区标题、菜单与拖拽指示线的样式。
 * 只吃宿主主题变量，随明暗与主题切换自动跟随；宿主变量缺失时回退中性色。
 */
const SECTIONS_CSS = `
.dcu-ws-section{display:flex;align-items:center;gap:4px;height:30px;margin:8px 2px 2px;padding:0 4px 0 var(--dcu-section-lead,6px);font-size:12px;letter-spacing:.2px;color:var(--dsw-alias-label-tertiary,rgba(127,127,127,.95));-webkit-app-region:no-drag;cursor:pointer;border-radius:6px}
.dcu-ws-section:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.10))}
.dcu-ws-section-label{flex:0 0 auto;max-width:70%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 展开/收起三角与宿主项目行同构：16×20 的 slot，里面是 14px 的实心三角，展开旋转 90°。 */
.dcu-ws-section-chevron{display:inline-flex;align-items:center;justify-content:center;flex:none;width:16px;height:20px;color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,#888))}
.dcu-ws-section-chevron svg{display:block;transition:transform .15s var(--ds-ease-in-out,cubic-bezier(.2,0,0,1))}
.dcu-ws-section[data-open='true'] .dcu-ws-section-chevron svg{transform:rotate(90deg)}
.dcu-ws-section-grow{flex:1 1 auto}
.dcu-ws-section-input{flex:1 1 auto;min-width:0;height:22px;padding:0 6px;border-radius:5px;font:inherit;font-size:12.5px;color:var(--dsw-alias-label-primary,inherit);background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.14));border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.4));outline:none}
.dcu-ws-section-editing{margin:4px 2px;padding-left:0}
/* 分区成员不加缩进：项目行以下全是宿主自己的排版（会话行、缩进变量都在里面），
   这里再补 padding 会把整个项目块连同会话一起右移，跟原生不一致。成员标记只用于折叠隐藏。 */
[data-dcu-section-member]{transition:max-height 180ms var(--ds-ease-in-out,cubic-bezier(.2,0,0,1)),opacity 180ms var(--ds-ease-in-out,cubic-bezier(.2,0,0,1))}
[data-dcu-section-hidden='true']{display:none !important}
.dcu-ws-section-actions{display:flex;gap:2px;opacity:.55;transition:opacity .12s ease;flex:none}
.dcu-ws-section:hover .dcu-ws-section-actions,.dcu-ws-section:focus-within .dcu-ws-section-actions{opacity:1}
.dcu-ws-section-action{width:22px;height:22px;border:0;border-radius:50%;background:transparent;color:inherit;font:inherit;font-size:12px;line-height:1;cursor:pointer;display:grid;place-items:center}
.dcu-ws-section-action:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.16))}
[data-sidebar-collapsed='true'] .dcu-ws-section{display:none !important}
/* z-index 取宿主顶级浮层的量级：分区标题 ··· 这条路径把面板挂在 body 上，宿主侧边栏/工作区树自己是
   更大的层级，1000 会让侧边栏的行文字压在面板上（表现为「菜单跑到侧边栏后面」）。
   面板本体由宿主 MenuSurface 原语渲染（表面 + material 磨砂层），这里只补壳外的几何与文字颜色，
   不碰填充与模糊——否则会和宿主的 material 叠加成双层，并把它的模糊打成惰性。 */
.dcu-ws-section-menu{position:fixed;z-index:2147483000;min-width:144px;max-width:360px;overflow:visible;padding:4px;display:flex;flex-direction:column;gap:0;border:none;border-radius:var(--dsw-radius-lg,14px);box-shadow:var(--dsw-elevation-prominent,0 6px 20px rgba(0,0,0,.45));color:var(--dsw-alias-label-primary,#ededed);isolation:isolate}
/* 滚动搬进内层：面板自身必须 overflow:visible，否则下面的 8px 透明桥会被横向裁掉 */
.dcu-ws-section-menu-scroll{display:flex;flex-direction:column;gap:0;min-height:0;flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;max-height:inherit}
/* 父菜单与二级菜单之间有一小段空隙：铺一条透明桥，指针穿过去时不会触发离开事件。 */
.dcu-ws-section-menu[data-flyout='true']::before{content:'';position:absolute;top:0;bottom:0;left:-6px;width:8px}
/* 行样式一律交由宿主类名（克隆行自带），这里不再覆盖 button 的 padding / 圆角 / 字号，
   否则二级菜单的行与一级菜单的行会出现可见差异。 */
.dcu-ws-section[data-dcu-section-fixed='true']{cursor:default}
/* 跨分区拖拽拦截时以 CSS 隐藏宿主落点线，绝不侵入修改宿主 React 的 DOM className；移回合法区自然恢复 */
body[data-dcu-drag-blocked='true'] [class*="workspaceDropBefore"]::before,
body[data-dcu-drag-blocked='true'] [class*="workspaceDropAfter"]::after,
body[data-dcu-drag-blocked='true'] [class*="dropBefore"]::before,
body[data-dcu-drag-blocked='true'] [class*="dropAfter"]::after{display:none !important}

`

/** 注入分区样式；已存在时复用（样式与组件生命周期解耦，卸载不摘除）。 */
function injectStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = SECTIONS_CSS
  document.head.appendChild(style)
}

/** 内置分区的显示名走本地化；用户改过名则用用户的名字。 */
function localizeBuiltinName(
  sectionId: string,
  storedName: string,
  text: (key: string, fallback: string) => string,
): string {
  // 内置分区一律按 id 取本地化名，不再信任存储里的名字（老数据可能被改过名）。
  if (sectionId === PINNED_SECTION_ID) return text('sections.pinned', '置顶')
  if (sectionId === DEFAULT_SECTION_ID) return text('sections.default', '项目')
  return storedName
}

const MENU_CLASS = 'dcu-ws-section-menu'

/** 从行节点上读出工作区 id：`data-row-key="workspace:<id>"`，未分组桶为空串。 */
function workspaceIdOfRow(row: Element): string | undefined {
  const key = row.getAttribute('data-row-key')
  if (key === null || !key.startsWith('workspace:')) return undefined
  const id = key.slice('workspace:'.length)
  return id === '' ? undefined : id
}

/**
 * 列表是否属于侧栏的「工作区」区块。
 *
 * 频道、定时等页签下也会出现树形列表，只有同时满足下面三条才算工作区，避免把分区标题塞进别的列表：
 * 不在 rail（侧栏收起）形态里、同一区域的区块标题带有多颗操作按钮、列表里确有项目行。
 */
export function isWorkspaceRegion(list: HTMLElement): boolean {
  // 不用 class 里带 rail 的元素来排除「侧栏收起」：宿主把整条侧栏的外壳也命名成 shell-rail，
  // 一撞就把真正的工作区树排除了。收起态由 CSS 隐藏标题，这里只管「是不是工作区这一块」。
  if (list.querySelector('[data-row-key^="workspace:"]') === null) return false
  // 区块标题与列表之间还隔着 treeBody，需要向上找几层才能跨到同一个浏览器区块。
  let node: HTMLElement | null = list.parentElement
  for (let level = 0; level < 4 && node !== null; level += 1) {
    const header = node.querySelector<HTMLElement>('[class*="sectionHeader"]')
    if (header !== null) {
      const actions = header.querySelector<HTMLElement>('[class*="headerActions"]')
      if (actions !== null && actions.querySelectorAll('button').length >= 2) return true
    }
    node = node.parentElement
  }
  return false
}

/** 收集原生列表里的项目分组块，按 DOM 顺序。 */
export function collectProjectBlocks(root: ParentNode, list?: HTMLElement): ProjectBlock[] {
  const container = list ?? findWorkspaceList(root)
  if (container === undefined) return []
  const blocks: ProjectBlock[] = []
  for (const row of Array.from(root.querySelectorAll('[data-row-key^="workspace:"]'))) {
    const workspaceId = workspaceIdOfRow(row)
    if (workspaceId === undefined) continue
    const block = blockOf(row, container)
    if (block !== null) blocks.push({ workspaceId, block })
  }
  return blocks
}

/**
 * 找到承载全部项目行的滚动列表。
 *
 * 宿主结构是 `div[role=tree].list > div.groupSection > span > div[data-row-key]`，
 * 直接取 `row.parentElement.parentElement` 只会拿到第一个分组块内部，标题就会全挤在最上面。
 * 这里改成语义判定：从第一行向上找到「同时包含所有行」的祖先。
 */
export function findWorkspaceList(root: ParentNode): HTMLElement | undefined {
  const rows = Array.from(root.querySelectorAll('[data-row-key^="workspace:"]')).filter(
    row => workspaceIdOfRow(row) !== undefined,
  )
  if (rows.length === 0) return undefined
  const first = rows[0]!
  const last = rows[rows.length - 1]!
  // 只有一行时，它的父节点也「包含全部行」，所以不能一碰到就返回：
  // 一路向上找最外层候选，优先取 role=tree 的那一个（宿主的 .list）。
  let node: HTMLElement | null = first.parentElement
  let treeCandidate: HTMLElement | undefined
  let anyCandidate: HTMLElement | undefined
  while (node !== null) {
    if (node.contains(last) && isWorkspaceRegion(node)) {
      if (node.getAttribute('role') === 'tree') treeCandidate = node
      else anyCandidate = node
    }
    node = node.parentElement
  }
  return treeCandidate ?? anyCandidate
}

/** 行所属的分组块：行到列表之间、父节点就是列表的那一层。 */
function blockOf(row: Element, list: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = row instanceof HTMLElement ? row : null
  while (node !== null && node.parentElement !== list) node = node.parentElement
  return node
}

/**
 * 观察并驱动工作区分区。
 *
 * @param ctx - 客户端根 Context。
 * @returns 释放函数；卸载后标题、监听与在途写入全部撤销。
 */
let activeInstance: (() => void) | undefined

export function observeWorkspaceSections(
  ctx: ClientContext,
  translate?: (key: string, fallback?: string) => string,
): () => void {
  if (typeof document === 'undefined') return () => {}
  const text = (key: string, fallback: string): string => {
    try {
      const value = translate?.(key, fallback)
      return value === undefined || value === '' ? fallback : value
    } catch {
      return fallback
    }
  }
  injectStyles()

  // 重挂载（HMR / 重复 activate）时旧实例的监听还在同一个标题节点上：
  // 一次点击会被两套 toggle 各处理一次，表现成「展开后立刻收回」。这里先停旧的。
  activeInstance?.()
  let disposed = false
  let state = createSectionsState()
  /** 分区文档是否已从宿主导入；未导入前不渲染标题、不做顺序写入。 */
  let sectionsLoaded = false
  let list: HTMLElement | undefined
  let baselineSet = false
  /** 菜单意图排队；一次写入同时等待服务确认与 DOM 到位，不用计帧猜测。 */
  interface SectionsUpdate {
    next: SectionsState
    workspaceIds?: readonly string[]
    rpcDone: boolean
    layoutDone?: boolean
    motionDone?: boolean
    motion?: SectionLayoutMotion
  }
  let activeUpdate: SectionsUpdate | undefined
  let writeGen = 0
  let waitNotice: HTMLElement | undefined
  let noticeTimer: number | undefined

  const clearWriteWait = (): void => {
    writeGen += 1
    if (noticeTimer !== undefined) window.clearTimeout(noticeTimer)
    noticeTimer = undefined
    waitNotice?.remove()
    waitNotice = undefined
  }

  const showAbortedNotice = (): void => {
    if (disposed || list?.parentElement === null || list === undefined) return
    clearWriteWait()
    waitNotice = document.createElement('div')
    waitNotice.setAttribute('data-dcu-sections-wait', 'aborted')
    waitNotice.setAttribute('role', 'alert')
    waitNotice.textContent = text('sections.writeAborted', '工作区移动未完成，已自动撤销。')
    waitNotice.style.cssText = 'padding: 8px 12px; font-size: 12px; color: var(--dsw-alias-text-danger, #ef4444);'
    list.parentElement.insertBefore(waitNotice, list)
    const notice = waitNotice
    noticeTimer = window.setTimeout(() => {
      noticeTimer = undefined
      if (waitNotice === notice) {
        notice.remove()
        waitNotice = undefined
      }
    }, 4000)
  }

  const insertWorkspace = async (service: WorkspacesLike, workspaceId: string, beforeWorkspaceId?: string): Promise<void> => {
    const curGen = ++writeGen
    const timer8s = window.setTimeout(() => {
      if (disposed || writeGen !== curGen || list?.parentElement === null || list === undefined) return
      waitNotice?.remove()
      waitNotice = document.createElement('div')
      waitNotice.setAttribute('data-dcu-sections-wait', '')
      waitNotice.setAttribute('role', 'status')
      waitNotice.textContent = text('sections.writePending', '工作区移动尚未完成，后续操作正在等待宿主响应。')
      waitNotice.style.cssText = 'padding: 8px 12px; font-size: 12px; color: var(--dsw-alias-text-secondary, inherit);'
      list.parentElement.insertBefore(waitNotice, list)
    }, 8000)

    let timer20s: number | undefined
    try {
      await Promise.race([
        service.insertBefore(workspaceId, beforeWorkspaceId),
        new Promise<never>((_, reject) => {
          timer20s = window.setTimeout(() => {
            if (writeGen === curGen) reject(new Error('宿主响应超时 (20s)'))
          }, 20000)
        }),
      ])
    } finally {
      window.clearTimeout(timer8s)
      if (timer20s !== undefined) window.clearTimeout(timer20s)
      if (writeGen === curGen) {
        waitNotice?.remove()
        waitNotice = undefined
      }
    }
  }
  const updates: SectionsUpdate[] = []
  let committedState = state
  let wired = false
  let syncing = false
  let rafId = 0
  let observer: MutationObserver | undefined
  let unsubscribe: (() => void) | undefined
  const headers = new Map<string, HTMLElement>()
  let menuHost: HTMLElement | undefined
  /** 取消「分区」行上待触发的收起定时器：指针移到二级菜单上时由面板侧调用。 */
  let cancelAnchorLeave: (() => void) | undefined
  /** 取消二级菜单自身待触发的收起定时器：指针移回行上时由行侧调用。 */
  let cancelPanelLeave: (() => void) | undefined
  /** 「分区 ›」二级菜单当前是否展开：菜单行会被重新注入，展开态必须按这个标志落到新节点上。 */
  let assignExpanded = false
  /** 当前二级菜单的锚点（「分区」那一行），悬停重复触发时用来去重。 */
  let assignAnchor: HTMLElement | undefined

  const workspaces = (): WorkspacesLike | undefined => {
    const service = (ctx as unknown as { get?: (name: string) => unknown }).get?.('workspaces')
    if (service === undefined || service === null) return undefined
    const candidate = service as WorkspacesLike
    if (typeof candidate.insertBefore !== 'function' || candidate.list === undefined) return undefined
    return candidate
  }

  const knownIds = (): string[] => {
    const service = workspaces()
    if (service === undefined) return []
    try {
      return service.list.getSnapshot().items.map(item => item.workspaceId)
    } catch {
      return []
    }
  }

  const domOrder = (): string[] =>
    collectProjectBlocks(list ?? document, list).map(block => block.workspaceId)

  /**
   * 从宿主导入分区文档。
   *
   * 宿主读不到（接口未就绪、首次运行）时按默认结构启动：只有「置顶 + 项目」两个内置分区，
   * 首次同步会把宿主现有工作区顺序采纳进「项目」，与以前的全新安装行为一致。
   */
  async function loadStateFromHost(): Promise<void> {
    let raw: string | null = null
    try {
      raw = await loadSectionsDocument()
    } catch {
      raw = null
    }
    const parsed = parseSections(raw)
    state = normalizeSections(parsed ?? { sections: [] })
    committedState = state
    sectionsLoaded = true
    scheduleSync()
  }

  /** 分区文档写回宿主；失败不阻塞界面，下一次用户操作会再触发保存。 */
  function persist(value: SectionsState = state): void {
    if (!sectionsLoaded) return
    scheduleSectionsSave(serializeSections(value))
  }

  function commit(next: SectionsState): void {
    commitExplicit(next, [])
  }

  /** 保留显式移动身份；在宿主确认且真实列表到位之前，不提前修改标题和折叠标记。 */
  function commitExplicit(next: SectionsState, workspaceIds?: readonly string[]): void {
    if (disposed) return
    state = next
    updates.push({ next, workspaceIds, rpcDone: false })
    startNextUpdate()
  }

  /* ── 标题渲染 ── */

  function ensureHeader(sectionId: string, name: string): HTMLElement {
    let header = headers.get(sectionId)
    if (header !== undefined && header.isConnected) {
      const label = header.querySelector<HTMLElement>(`.${HEADER_CLASS}-label`)
      const next = localizeBuiltinName(sectionId, name, text)
      if (label !== null && label.textContent !== next) label.textContent = next
      return header
    }
    header = document.createElement('div')
    header.className = HEADER_CLASS
    header.setAttribute(SECTION_HEADER_ATTR, sectionId)
    // 内置分区（置顶、项目）固定位置且不允许改名，因此不可拖动、不给 ··· 菜单。
    const fixed = isBuiltinSection(sectionId)
    if (fixed) header.setAttribute('data-dcu-section-fixed', 'true')
    header.draggable = false
    header.tabIndex = 0
    header.dataset.open = collapsed[sectionId] === true ? 'false' : 'true'

    const label = document.createElement('span')
    label.className = `${HEADER_CLASS}-label`
    label.textContent = localizeBuiltinName(sectionId, name, text)
    header.appendChild(label)

    // 折叠箭头贴在名称右侧（对齐 Codex 的「你好 ›」），展开时朝下、折叠时朝右。
    const chevron = document.createElement('span')
    chevron.className = `${HEADER_CLASS}-chevron`
    chevron.innerHTML = iconChevron()
    header.appendChild(chevron)

    const grow = document.createElement('span')
    grow.className = `${HEADER_CLASS}-grow`
    header.appendChild(grow)

    // 所有分区都留一个 ··· 入口：内置分区只是少了「重命名 / 移除分区」，新建分区仍然从这里到达。
    const actions = document.createElement('span')
    actions.className = `${HEADER_CLASS}-actions`
    actions.appendChild(buildHeaderActionButton(sectionId, name))
    header.appendChild(actions)

    header.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest(`.${HEADER_CLASS}-actions`) !== null) return
      toggleSection(sectionId)
    })
    header.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleSection(sectionId)
      }
    })

    headers.set(sectionId, header)
    return header
  }

  /** 分区标题右侧的 `···`：直接克隆宿主项目行的原生图标按钮，样式与宿主完全一致。 */
  function buildHeaderActionButton(sectionId: string, name: string): HTMLElement {
    const hostButton = document.querySelector<HTMLButtonElement>(
      '[data-row-key^="workspace:"] [class*="rowActions"] button',
    )
    let button: HTMLElement
    if (hostButton !== null) {
      button = hostButton.cloneNode(true) as HTMLElement
      button.removeAttribute('aria-keyshortcuts')
      button.removeAttribute('tabindex')
    } else {
      button = document.createElement('button')
      button.className = `${HEADER_CLASS}-action`
      button.textContent = '···'
    }
    button.setAttribute('type', 'button')
    button.setAttribute('aria-label', `${name} ${text('sections.settings', '分区设置')}`)
    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      openSectionMenu(sectionId, button)
    })
    return button
  }

  function toggleSection(sectionId: string): void {
    const header = headers.get(sectionId)
    // 纯粹以当前 DOM 真实显示状态为准：
    // 若当前是 'false'（收起态），点击 100% 是【展开】（collapse = false）；
    // 绝不能按内存 map 猜测，否则初始状态偏差会导致点击后反而执行收起。
    const currentlyClosed = header?.dataset.open === 'false'
    const collapse = !currentlyClosed
    collapsed[sectionId] = collapse
    persistCollapsed()
    if (header !== undefined) header.dataset.open = collapse ? 'false' : 'true'
    animateSectionMembers(sectionId, collapse)
    scheduleSync()
  }

  /** 正在做折叠动画的分区：这段时间里 placeHeaders 不要改写成员的显示状态。 */
  const animatingSections = new Set<string>()
  /** 每个分区最近一次折叠动画的代号，用来丢弃过期回调。 */
  const animationGeneration = new Map<string, number>()
  const SECTION_ANIM_MS = 180

  /**
   * 折叠/展开动画。
   *
   * 成员是宿主的分组块，不能包容器，所以对块本身做 max-height 过渡（经典稳妥做法）：
   * 先量出当前高度写成具体 px，再过渡到 0；展开反向。用 max-height 而不是 `height:auto`
   * 是因为宿主块内部有自己的布局，auto 插值在逐帧重排时会互相压住（表现为项目文件夹重叠）。
   */
  function animateSectionMembers(sectionId: string, collapse: boolean): void {
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-dcu-section-member="${sectionId}"]`),
    )
    if (blocks.length === 0) return
    const generation = (animationGeneration.get(sectionId) ?? 0) + 1
    animationGeneration.set(sectionId, generation)
    animatingSections.add(sectionId)

    for (const block of blocks) {
      if (!block.isConnected) continue
      if (collapse) {
        block.removeAttribute('data-dcu-section-hidden')
        block.style.overflow = 'hidden'
        const height = block.offsetHeight
        block.style.maxHeight = `${height}px`
        block.style.opacity = '1'
        void block.offsetHeight
        block.style.maxHeight = '0px'
        block.style.opacity = '0'
      } else {
        // 展开动效：从 0px 丝滑过渡拉伸到目标内容高度，透明度淡入
        block.removeAttribute('data-dcu-section-hidden')
        block.style.overflow = 'hidden'
        block.style.maxHeight = '0px'
        block.style.opacity = '0'
        void block.offsetHeight
        const targetHeight = Math.max(block.scrollHeight, block.offsetHeight || 40)
        block.style.maxHeight = `${targetHeight}px`
        block.style.opacity = '1'
      }
    }

    window.setTimeout(() => {
      if (animationGeneration.get(sectionId) !== generation) return
      blocks.forEach(block => {
        if (!block.isConnected) return
        block.style.removeProperty('max-height')
        block.style.removeProperty('overflow')
        block.style.removeProperty('opacity')
        if (collapse) {
          block.setAttribute('data-dcu-section-hidden', 'true')
        } else {
          block.removeAttribute('data-dcu-section-hidden')
        }
      })
      animatingSections.delete(sectionId)
      scheduleSync()
    }, SECTION_ANIM_MS + 30)
  }

  function readCollapsed(): Record<string, boolean> {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_STORAGE_KEY)
      if (raw === null) return {}
      const parsed: unknown = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, boolean>) : {}
    } catch {
      return {}
    }
  }

  function persistCollapsed(): void {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(collapsed))
    } catch {
      // 存储不可用时只在本次会话生效。
    }
  }

  /** 上一次算对齐时的（标题数+列宽）组合，避免每帧量 rect。 */
  let lastAlignKey = ''

  /** 把标题按分区顺序放到各自第一个分组块前面；空分区贴着下一个分区显示。 */
  function placeHeaders(blocks: readonly ProjectBlock[], layoutState: SectionsState = state): void {
    if (blocks.length === 0) {
      // 当全部工作区被删空时，及时清理残留的空置顶标题并复位折叠状态
      const stalePinned = headers.get(PINNED_SECTION_ID)
      if (stalePinned !== undefined) {
        stalePinned.remove()
        headers.delete(PINNED_SECTION_ID)
        if (collapsed[PINNED_SECTION_ID] === true) {
          delete collapsed[PINNED_SECTION_ID]
          persistCollapsed()
        }
      }
      return
    }
    const target = blocks[0]!.block.parentElement
    if (target === null) return

    // 未分组桶是默认分区的末端成员，也可以充当空默认分区的标题锚点。
    const ungrouped = Array.from(list?.querySelectorAll('[data-row-key="workspace:"]') ?? [])
      .map(row => (row instanceof HTMLElement ? blockOf(row, list!) : null))
      .find((block): block is HTMLElement => block !== null)
    const byId = new Map(blocks.map(item => [item.workspaceId, item.block]))
    let reference: Element | null = null
    // 从后向前确定边界：有成员贴自己的首项，空分区贴下一个标题；绝不插到上一区成员之前。
    for (let index = layoutState.sections.length - 1; index >= 0; index -= 1) {
      const section = layoutState.sections[index]!
      const first = section.ids.map(id => byId.get(id)).find(block => block !== undefined)
      if (first !== undefined) reference = first
      else if (section.id === DEFAULT_SECTION_ID && ungrouped !== undefined) reference = ungrouped
      // 「置顶」没有成员时整行不渲染：空的置顶分区只剩一行标题，白占约 40px 高度，
      // 用户也没有任何办法把它收走。自定义空分区必须保留标题（那是新建分区后唯一的可见入口），
      // 所以这条只对内置置顶生效；重新置顶任意项目时标题会自动回到原位。
      if (section.id === PINNED_SECTION_ID && section.ids.length === 0) {
        const stale = headers.get(PINNED_SECTION_ID)
        if (stale !== undefined) {
          stale.remove()
          headers.delete(PINNED_SECTION_ID)
          // 置顶区收起状态下被清空的话，把折叠状态一并复位：下次置顶项目时应当直接可见。
          if (collapsed[PINNED_SECTION_ID] === true) {
            delete collapsed[PINNED_SECTION_ID]
            persistCollapsed()
          }
        }
        continue
      }
      const header = ensureHeader(section.id, section.name)
      if (header.parentElement !== target || header.nextElementSibling !== reference) {
        target.insertBefore(header, reference)
      }
      reference = header
    }

    // 成员块打标记：CSS 据此做缩进（层级）与折叠隐藏。
    const memberOf = new Map<string, string>()
    for (const section of layoutState.sections) {
      for (const id of section.ids) memberOf.set(id, section.id)
    }
    for (const block of blocks) {
      const sectionId = memberOf.get(block.workspaceId)
      if (sectionId === undefined) {
        block.block.removeAttribute('data-dcu-section-member')
        block.block.removeAttribute('data-dcu-section-hidden')
        continue
      }
      block.block.setAttribute('data-dcu-section-member', sectionId)
      if (animatingSections.has(sectionId)) continue
      if (headers.get(sectionId)?.dataset.open === 'false') {
        block.block.setAttribute('data-dcu-section-hidden', 'true')
      } else {
        block.block.removeAttribute('data-dcu-section-hidden')
        // 关键：展开的分区里的成员必须彻底剥离内联高度/隐藏限制！
        // 如果是从收起分区拖过来的，或者带有以前收缩动画的残留样式，
        // 必须立刻清除，这样拖入展开分区后才能【立即自然显示】，无需重新收缩展开！
        block.block.style.removeProperty('max-height')
        block.block.style.removeProperty('overflow')
        block.block.style.removeProperty('opacity')
      }
    }

    // 标题文字与宿主的「工作区」标题左对齐：以宿主标签的左边缘为基准，换主题/换平台都能对齐。
    // 对齐只在与上次不同的宽度/标题数量下重算：每个同步拍都量一次 rect 会在拖动时反复触发布局。
    const alignKey = `${headers.size}:${list?.clientWidth ?? 0}`
    const label = document.querySelector<HTMLElement>('[class*="sectionLabel"]')
    // 置顶分区为空时整行不渲染，这里必须取第一个「真实存在」的标题做基准；
    // 否则会量到空矩形（left=0），把所有标题推到右边去。
    const firstHeader = layoutState.sections
      .map(section => headers.get(section.id))
      .find((header): header is HTMLElement => header !== undefined)
    if (label !== null && firstHeader !== undefined && alignKey !== lastAlignKey) {
      lastAlignKey = alignKey
      const lead = Math.max(0, Math.round(label.getBoundingClientRect().left - firstHeader.getBoundingClientRect().left))
      for (const header of headers.values()) header.style.setProperty('--dcu-section-lead', `${lead}px`)
    }

    // 未分组桶跟随默认分区折叠，但不参与宿主工作区排序。
    if (ungrouped !== undefined) {
      ungrouped.setAttribute('data-dcu-section-member', DEFAULT_SECTION_ID)
      if (!animatingSections.has(DEFAULT_SECTION_ID)) {
        if (headers.get(DEFAULT_SECTION_ID)?.dataset.open === 'false') {
          ungrouped.setAttribute('data-dcu-section-hidden', 'true')
        } else {
          ungrouped.removeAttribute('data-dcu-section-hidden')
          ungrouped.style.removeProperty('max-height')
          ungrouped.style.removeProperty('overflow')
          ungrouped.style.removeProperty('opacity')
        }
      }
    }

    for (const [id, header] of Array.from(headers.entries())) {
      if (!layoutState.sections.some(section => section.id === id)) {
        header.remove()
        headers.delete(id)
      }
    }
  }

  /** 列表不在工作区视图（频道、定时、rail 收起）时摘掉标题，避免串到别的列表里。 */
  function detachHeaders(): void {
    for (const header of headers.values()) header.remove()
    headers.clear()
  }

  /* ── 分区菜单 ── */

  function closeSectionMenu(): void {
    if (menuHost !== undefined) {
      // 先在容器上卸载 React 树，再摘掉容器，避免宿主菜单里残留孤儿节点
      unmountComponentAtNode(menuHost)
      menuHost.remove()
    }
    assignExpanded = false
    assignAnchor?.setAttribute('aria-expanded', 'false')
    // 注意：只清面板自己的收起定时器。cancelAnchorLeave 属于「分区」行上的定时器，
    // 在这里清掉会让「指针移到面板上取消行侧收起」失效（面板 180ms 后自己消失）。
    cancelPanelLeave = undefined
    menuHost = undefined
    assignAnchor = undefined
  }

  /**
   * 分区自己的菜单面板：直接用宿主原语渲染 —— `MenuSurface`（表面 + material 磨砂层）
   * 与 `MenuItemButton`（行）。既不手绘控件，也不依赖「页面上已经开着某个宿主菜单」，
   * 所以冷启动第一次点分区标题的 `···` 同样能弹出来。
   *
   * 嵌套在宿主行菜单里时挂进父菜单内部（outside-click 判定视为菜单内部，指针移入不会关父菜单）；
   * 独立打开时挂到 body。
   */
  function openHostPanel(
    anchor: HTMLElement,
    items: ReadonlyArray<{ label: string; icon: string; onSelect: () => void }>,
    flyoutFrom?: HTMLElement,
  ): void {
    closeSectionMenu()

    const parentMenu =
      flyoutFrom?.isConnected === true ? flyoutFrom : anchor.closest<HTMLElement>('[role="menu"]')
    const { MenuSurface, MenuItemButton } = primitives as unknown as {
      MenuSurface?: (props: Record<string, unknown>) => unknown
      MenuItemButton?: (props: Record<string, unknown>) => unknown
    }
    // 宿主缺原语就不弹（不自绘降级）：0.2.0-rc.1 起两端都已导出，这里只是给未来宿主留的护栏
    if (MenuSurface === undefined || MenuItemButton === undefined) return

    const container = document.createElement('div')
    // inset/margin 显式归零：容器可能被提升到 top layer（popover），UA 默认样式会居中并裁剪
    container.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;z-index:2147483000;' +
      'margin:0;padding:0;border:0;background:transparent;overflow:visible;inset:auto'

    if (parentMenu !== null && parentMenu !== undefined) {
      // 挂进父菜单内部：宿主的 outside-click 判定才会把它当成菜单的一部分
      parentMenu.appendChild(container)
    } else {
      document.body.appendChild(container)
    }
    // 同步渲染：定位要量真实尺寸，异步渲染会让第一次量到 null 而丢掉定位
    flushSync(() => {
      render(
        createElement(
          MenuSurface as never,
          {
            role: 'menu',
            'aria-label': text('sections.menu', '分区'),
            className: MENU_CLASS,
            'data-dcu-menu-surface': 'true',
            ...(parentMenu === null || parentMenu === undefined ? {} : { 'data-flyout': 'true' }),
          },
          createElement('div', { className: `${MENU_CLASS}-scroll` },
            items.map(item =>
              createElement(
                MenuItemButton as never,
                {
                  key: item.label,
                  icon: createElement('span', {
                    style: { display: 'inline-flex' },
                    dangerouslySetInnerHTML: { __html: item.icon },
                  }),
                  onSelect: () => {
                    closeSectionMenu()
                    item.onSelect()
                  },
                },
                item.label,
              ),
            ),
          ),
        ),
        container,
      )
    })

    // 提升到 top layer：宿主侧边栏/工作区树自己的层级可能高于任何 z-index 数字，
    // 仅靠 z-index 会出现「菜单被侧边栏行文字压住」。popover 进入 top layer 后与 z-index 无关，
    // 不支持的引擎靠上面的 z-index 兜底。
    try {
      container.setAttribute('popover', 'manual')
      ;(container as HTMLElement & { showPopover?: () => void }).showPopover?.()
    } catch {
      // 老引擎没有 popover API：保持 z-index 兜底，不阻断菜单
    }

    let leaveTimer: number | undefined
    const cancelLeave = (): void => {
      if (leaveTimer === undefined) return
      window.clearTimeout(leaveTimer)
      leaveTimer = undefined
    }
    cancelPanelLeave = cancelLeave
    container.addEventListener('mouseenter', () => {
      // 指针从「分区」行移到面板上：取消行侧 180ms 收起定时器，否则面板会在 180ms 后自己消失
      cancelAnchorLeave?.()
      cancelLeave()
    })
    container.addEventListener('mouseleave', () => {
      cancelLeave()
      leaveTimer = window.setTimeout(() => {
        leaveTimer = undefined
        closeSectionMenu()
      }, 180)
    })
    container.addEventListener('pointerdown', event => event.stopPropagation())
    container.addEventListener('mousedown', event => event.stopPropagation())

    menuHost = container

    const surface = container.querySelector<HTMLElement>('[data-dcu-menu-surface]')
    if (surface !== null) {
      const rect = anchor.getBoundingClientRect()
      const width = surface.offsetWidth || 196
      const height = surface.offsetHeight || 120
      const maxHeight = Math.max(140, Math.min(360, window.innerHeight - 20))
      surface.style.maxHeight = `${maxHeight}px`
      if (parentMenu !== null && parentMenu !== undefined) {
        const parentRect = parentMenu.getBoundingClientRect()
        let left = parentRect.right + 2
        if (left + width > window.innerWidth - 10) left = Math.max(10, parentRect.left - width - 4)
        let top = rect.top - 4
        if (top + Math.min(height, maxHeight) > window.innerHeight - 10) {
          top = Math.max(10, window.innerHeight - Math.min(height, maxHeight) - 10)
        }
        surface.style.left = `${left}px`
        surface.style.top = `${top}px`
      } else {
        surface.style.left = `${Math.max(8, Math.min(rect.left + 4, window.innerWidth - width - 8))}px`
        surface.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - height - 8))}px`
      }
    }
    container.style.visibility = 'visible'
  }

  function openSectionMenu(sectionId: string, anchor: HTMLElement): void {
    const section = state.sections.find(item => item.id === sectionId)
    if (section === undefined) return
    const builtin = sectionId === PINNED_SECTION_ID || sectionId === DEFAULT_SECTION_ID
    const items: Array<{ label: string; icon: string; onSelect: () => void }> = []
    if (!builtin) {
      items.push({
        label: text('sections.rename', '重命名'),
        icon: iconEdit(),
        onSelect: () => {
          closeSectionMenu()
          startRename(sectionId)
        },
      })
    }
    items.push({
      label: text('sections.new', '新建分区'),
      icon: iconPlus(),
      onSelect: () => {
        closeSectionMenu()
        startCreateSection()
      },
    })
    if (!builtin) {
      items.push({
        label: text('sections.remove', '移除分区'),
        icon: iconClose(),
        onSelect: () => {
          closeSectionMenu()
          // 同步移除 DOM 标题节点并清理映射，点击当场立刻消失，绝不等待下一帧
          const header = headers.get(sectionId)
          header?.remove()
          headers.delete(sectionId)
          commitExplicit(deleteSection(state, sectionId), section.ids)
        },
      })
    }
    openHostPanel(anchor, items)
  }

  /** 标题原地改名：只把标签换成输入框，不碰宿主节点。 */
  let editingInput: HTMLInputElement | undefined

  function startRename(sectionId: string): void {
    const header = headers.get(sectionId)
    const label = header?.querySelector<HTMLElement>(`.${HEADER_CLASS}-label`)
    if (header === undefined || label === null || label === undefined) return
    const section = state.sections.find(item => item.id === sectionId)
    if (section === undefined) return
    label.style.display = 'none'
    const input = document.createElement('input')
    input.className = `${HEADER_CLASS}-input`
    input.value = section.name
    input.maxLength = 24
    header.insertBefore(input, label)
    input.focus()
    input.select()
    editingInput = input
    const finish = (commitValue: boolean): void => {
      if (editingInput !== input) return
      editingInput = undefined
      const value = input.value.trim()
      input.remove()
      label.style.display = ''
      if (commitValue && value !== '') commit(renameSection(state, sectionId, value))
    }
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        finish(true)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        finish(false)
      }
    })
    input.addEventListener('blur', () => finish(true))
  }

  /** 新建分区：在列表里插一行输入框，回车创建（宿主 web 里 window.prompt 被禁用，所以不用 prompt）。 */
  function startCreateSection(workspaceId?: string): void {
    const host = findWorkspaceList(document)
    if (host === undefined) return
    const row = document.createElement('div')
    row.className = `${HEADER_CLASS} ${HEADER_CLASS}-editing`
    const input = document.createElement('input')
    input.className = `${HEADER_CLASS}-input`
    input.placeholder = text('sections.newName', '新分区名称')
    input.maxLength = 24
    row.appendChild(input)

    const lastHeader = Array.from(headers.values()).at(-1)
    if (lastHeader !== undefined && lastHeader.parentElement === host) {
      host.insertBefore(row, lastHeader.nextSibling)
    } else {
      host.insertBefore(row, host.firstChild)
    }
    input.focus()

    let done = false
    const finish = (commitValue: boolean): void => {
      if (done) return
      done = true
      const value = input.value.trim()
      row.remove()
      if (!commitValue || value === '') return
      const id = `s${Date.now().toString(36)}`
      const created = createSection(state, id, value)
      if (workspaceId === undefined) commit(created)
      else commitExplicit(assignWorkspace(created, workspaceId, id), [workspaceId])
    }
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        finish(true)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        finish(false)
      }
    })
    input.addEventListener('blur', () => finish(true))
  }

  function onKeydownToCloseSectionMenu(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || menuHost === undefined) return
    closeSectionMenu()
  }

  function onPointerdownToCloseSectionMenu(event: PointerEvent): void {
    if (menuHost === undefined) return
    if (event.target instanceof Node && menuHost.contains(event.target)) return
    closeSectionMenu()
  }

  document.addEventListener('keydown', onKeydownToCloseSectionMenu, true)
  document.addEventListener('pointerdown', onPointerdownToCloseSectionMenu, true)

  /**
   * 保留项目之间的原生拖拽排序，同时严格禁止跨分区拖拽（跨分区转移全靠菜单操作）。
   *
   * 1. 同分区内部：完全放行宿主原生的拖拽排序事件，顺序变化由 reconcileHostOrder 自动持久化。
   * 2. 跨分区或分区标题：在捕获阶段拦截 dragover 与 drop，显示禁止符号，阻止跨分区落点。
   */
  let draggingWorkspaceId: string | undefined
  let draggingSectionId: string | undefined

  /**
   * 跨分区拖拽拦截时切换 body 标记。
   * 由 CSS 控制宿主伪元素显隐，完全不触碰宿主 DOM className，
   * 移回同分区时落点线瞬时自然恢复，且避免 60Hz 遍历整个 DOM 树。
   */
  function setDragBlocked(blocked: boolean): void {
    if (blocked) {
      if (!document.body.hasAttribute('data-dcu-drag-blocked')) {
        document.body.setAttribute('data-dcu-drag-blocked', 'true')
      }
    } else {
      if (document.body.hasAttribute('data-dcu-drag-blocked')) {
        document.body.removeAttribute('data-dcu-drag-blocked')
      }
    }
  }

  function onWorkspaceDragStart(event: DragEvent): void {
    setDragBlocked(false)
    const target = event.target
    if (!(target instanceof Element)) return
    const row = target.closest<HTMLElement>('[data-row-key^="workspace:"]')
    if (row === null) return
    const key = row.getAttribute('data-row-key') ?? ''
    const workspaceId = key.slice('workspace:'.length)
    if (!workspaceId) return

    draggingWorkspaceId = workspaceId
    draggingSectionId = sectionOf(state, workspaceId)
    // 注意：不阻止 dragstart！保留宿主原生的同分区项目拖拽排序功能！
  }

  function onWorkspaceDragOver(event: DragEvent): void {
    if (draggingWorkspaceId === undefined || draggingSectionId === undefined) return
    const target = event.target
    if (!(target instanceof Element)) return

    // 1. 悬停在分区标题上：禁止作为落点。
    if (target.closest(`.${HEADER_CLASS}`) !== null) {
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'
      setDragBlocked(true)
      event.stopPropagation()
      return
    }

    // 2. 识别目标工作区（直接命中项目行，或命中项目内部展开的会话/间隙）
    let targetWorkspaceId: string | undefined
    const targetRow = target.closest<HTMLElement>('[data-row-key^="workspace:"]')
    if (targetRow !== null) {
      const key = targetRow.getAttribute('data-row-key') ?? ''
      targetWorkspaceId = key.slice('workspace:'.length)
    } else {
      const groupSection = target.closest<HTMLElement>('[class*="groupSection"]')
      const rowInGroup = groupSection?.querySelector<HTMLElement>('[data-row-key^="workspace:"]')
      if (rowInGroup) {
        const key = rowInGroup.getAttribute('data-row-key') ?? ''
        targetWorkspaceId = key.slice('workspace:'.length)
      }
    }

    if (targetWorkspaceId !== undefined && targetWorkspaceId !== '') {
      const targetSectionId = sectionOf(state, targetWorkspaceId)
      if (targetSectionId !== draggingSectionId) {
        // 跨分区：禁止作为落点（跨分区移动全靠菜单操作）
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'
        setDragBlocked(true)
        event.stopPropagation()
      } else {
        // 同分区合法排序区：主动 preventDefault 并设 move，彻底消灭怪异禁止图标 🚫！
        event.preventDefault()
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
        setDragBlocked(false)
      }
    }
  }

  function onWorkspaceDrop(event: DragEvent): void {
    setDragBlocked(false)
    if (draggingWorkspaceId === undefined || draggingSectionId === undefined) return
    const target = event.target
    if (!(target instanceof Element)) return

    // 落在分区标题上：直接丢弃拦截
    if (target.closest(`.${HEADER_CLASS}`) !== null) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    // 落在不同分区的项目行上：直接丢弃拦截
    const targetRow = target.closest<HTMLElement>('[data-row-key^="workspace:"]')
    if (targetRow !== null) {
      const key = targetRow.getAttribute('data-row-key') ?? ''
      const targetWorkspaceId = key.slice('workspace:'.length)
      const targetSectionId = sectionOf(state, targetWorkspaceId)
      if (targetSectionId !== draggingSectionId) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
  }

  function onWorkspaceDragEnd(): void {
    setDragBlocked(false)
    draggingWorkspaceId = undefined
    draggingSectionId = undefined
  }

  document.addEventListener('dragstart', onWorkspaceDragStart, true)
  document.addEventListener('dragover', onWorkspaceDragOver, true)
  document.addEventListener('drop', onWorkspaceDrop, true)
  document.addEventListener('dragend', onWorkspaceDragEnd, true)

  /* ── 项目菜单扩展 ── */

  /**
   * 对齐归档管理器规范：从行内操作区精准定位“···”操作菜单触发按钮。
   * 优先匹配 aria-haspopup="menu"，排除星标按钮与新建会话按钮，避免行内按钮顺序变化时误判。
   */
  function isStarButton(btn: HTMLButtonElement): boolean {
    const className = btn.getAttribute('class') ?? ''
    if (className.includes('dsham_rowStar') || className.includes('star')) return true
    if (typeof btn.closest === 'function' && Boolean(btn.closest('.dsham_starSlot'))) return true
    return false
  }

  function findRowMenuButton(row: Element): HTMLButtonElement | null {
    const actions = row.querySelector<HTMLElement>('[class*="rowActions"]')
    if (!actions) return null
    const buttons = Array.from(actions.querySelectorAll<HTMLButtonElement>('button'))
    if (buttons.length === 0) return null

    const actionBtn = buttons.find(btn => {
      if (isStarButton(btn)) return false
      if (btn.getAttribute('aria-haspopup') === 'menu') return true
      const label = (btn.getAttribute('aria-label') ?? btn.getAttribute('title') ?? '').toLowerCase()
      if (/new|create|新建|add|\+|созда/.test(label)) return false
      return /action|操作|действи|more|更多|选项|options|menu/.test(label)
    })
    return actionBtn ?? buttons[0] ?? null
  }

  function isRowMenuButton(button: HTMLButtonElement, row: Element): boolean {
    const menuBtn = findRowMenuButton(row)
    if (menuBtn === button) return true
    const label = (button.getAttribute('aria-label') ?? button.getAttribute('title') ?? '').toLowerCase()
    if (/new|create|新建|add|\+|созда/.test(label)) return false
    return /action|操作|действи|more|更多|选项|options|menu/.test(label)
  }

  /**
   * 从触发目标元素反查对应的工作区行节点，严格过滤会话行与菜单内部元素。
   */
  function projectRowOfMenuButton(target: Element): Element | null {
    const row = target.closest<HTMLElement>('[data-row-key]')
    if (row === null) return null
    const key = row.getAttribute('data-row-key') ?? ''
    if (!key.startsWith('workspace:')) return null

    const button = target.closest('button')
    if (button !== null) {
      // 若点击了按钮，必须是合法的操作菜单按钮（排除新建会话等功能按钮）
      return isRowMenuButton(button, row) ? row : null
    }
    return row
  }

  /**
   * 项目行 `···` 一按下就记下目标工作区。
   *
   * 宿主的菜单在 **pointerdown** 阶段就挂载（不是 click），等到 click 再注入必然晚一帧以上，
   * 用户看到的就是「菜单先出来，置顶/分区过一会儿才冒出来」。
   * 键盘回车没有 pointerdown，所以保留 click 兜底。
   */
  function prepareMenuInjection(target: Element): void {
    // 如果点击的是菜单内部（如在菜单里点击「分区」或「置顶」），保留当前工作区 ID，绝不清空！
    if (target.closest('[role="menu"]') !== null) return

    // 若点击的是会话行的操作按钮或其它非工作区元素，立刻清空目标，绝对不误注入会话菜单！
    if (target.closest('[data-row-key^="session:"]') !== null) {
      assigningWorkspaceId = undefined
      return
    }
    const row = projectRowOfMenuButton(target)
    if (row === null) {
      // 点击处不是工作区操作按钮或工作区行，清空目标
      assigningWorkspaceId = undefined
      return
    }
    const id = workspaceIdOfRow(row)
    assigningWorkspaceId = id
    // 菜单可能已经挂上了（pointerdown 与 click 之间），立刻同步试一次；没有就交给 body 观察器。
    injectMenuEntry()
  }

  function onPointerdownToPrepareMenu(event: PointerEvent): void {
    if (event.target instanceof Element) prepareMenuInjection(event.target)
  }

  function onClickToPrepareMenu(event: MouseEvent): void {
    if (event.target instanceof Element) prepareMenuInjection(event.target)
  }

  /** 对齐归档管理器规范：支持在工作区行上右键直接唤起操作菜单与分区入口 */
  function onContextMenuToPrepareMenu(event: MouseEvent): void {
    const target = event.target as Element | null
    if (!target) return
    if (target.closest("input, textarea, [contenteditable='true']")) return

    const row = target.closest<HTMLElement>('[data-row-key^="workspace:"]')
    if (!row) return

    const clickedButton = target.closest<HTMLButtonElement>('button')
    if (clickedButton && !isRowMenuButton(clickedButton, row)) {
      return
    }

    const menuBtn = findRowMenuButton(row)
    if (!menuBtn) return

    const id = workspaceIdOfRow(row)
    if (id) {
      assigningWorkspaceId = id
      injectMenuEntry()
    }
  }

  document.addEventListener('pointerdown', onPointerdownToPrepareMenu, true)
  document.addEventListener('click', onClickToPrepareMenu, true)
  document.addEventListener('contextmenu', onContextMenuToPrepareMenu, true)

  /**
   * 用宿主自己的图标组件渲染出静态 SVG。
   * 手绘图标在描边粗细、圆角与视觉重心上永远差一档，直接复用宿主原语才能和原生菜单项完全同源。
   */
  const iconCache = new Map<string, string>()
  function hostIconMarkup(name: string, size = 16): string {
    const cached = iconCache.get(name)
    if (cached !== undefined) return cached
    const Component = (primitives as unknown as Record<string, unknown>)[name]
    if (typeof Component !== 'function') {
      iconCache.set(name, '')
      return ''
    }
    let markup = ''
    const host = document.createElement('div')
    try {
      render(createElement(Component as never, { size, 'aria-hidden': true } as never), host)
      markup = host.innerHTML
    } catch {
      markup = ''
    } finally {
      unmountComponentAtNode(host)
    }
    iconCache.set(name, markup)
    return markup
  }

  /**
   * 图标全部取自宿主 primitives（RC 版本就有这些名字，别再自己画、也别依赖 sprite）：
   * `IconPinOutlineRegular` / `IconPinFillRegular` / `IconChecklistOutlineRegular` /
   * `IconCheckOutlineRegular` / `IconPlusOutlineRegular` / `IconEditOutlineRegular` /
   * `IconCloseOutlineRegular` / `IconTriangleRightFillRegular`。
   */
  const iconPin = (): string => hostIconMarkup('IconPinOutlineRegular')
  const iconPinned = (): string => hostIconMarkup('IconPinFillRegular')
  const iconSection = (): string => hostIconMarkup('IconChecklistOutlineRegular')
  const iconCheck = (): string => hostIconMarkup('IconCheckOutlineRegular')
  const iconPlus = (): string => hostIconMarkup('IconPlusOutlineRegular')
  /** 分区展开箭头：和宿主项目行同一颗 `IconTriangleRightFillRegular`，展开时旋转 90°。 */
  const iconChevron = (): string => hostIconMarkup('IconTriangleRightFillRegular')
  const iconEdit = (): string => hostIconMarkup('IconEditOutlineRegular')
  const iconClose = (): string => hostIconMarkup('IconCloseOutlineRegular')

  /**
   * 按宿主菜单项的行结构复制一行，保证图标槽、字号、悬停与危险态样式完全一致。
   * 宿主一行是 `div > button[role=menuitem](span 图标 + span 文案)`，因此克隆整行最稳。
   */
  function buildMenuRow(
    reference: HTMLButtonElement | undefined,
    icon: string,
    label: string,
    attribute: string,
    template?: HTMLElement,
    tailIcon?: string,
  ): HTMLElement | null {
    const wrapper = template ?? reference?.parentElement
    if (wrapper === undefined || wrapper === null) return null
    const row = wrapper.cloneNode(true) as HTMLElement
    row.querySelectorAll('button').forEach(button => {
      if (button !== row.querySelector('button')) button.remove()
    })
    const button = row.querySelector('button')
    if (button === null) return null
    button.removeAttribute('disabled')
    button.style.opacity = ''
    button.style.cursor = ''
    if (attribute !== '') button.setAttribute(attribute, 'true')
    // 宿主菜单项若包含快捷键槽（如 [class*="shortcut"]），克隆时必须先移除，
    // 否则最后一个 span 会是快捷键槽（带 margin-left: auto），导致真正的文案残留变成“设置 [空白] 置顶”！
    button.querySelectorAll('[class*="shortcut"], [aria-keyshortcuts]').forEach(el => el.remove())
    const spans = Array.from(button.querySelectorAll(':scope > span'))
    const iconSlot = spans[0]
    // 优先取宿主标准的 itemLabel，不存在时退化取除 icon 外的文本 span
    const labelSlot =
      button.querySelector<HTMLElement>('[class*="itemLabel"], [class*="label"]') ??
      spans.slice(1).find(span => span.children.length === 0 || span.textContent !== '') ??
      spans[spans.length - 1]
    if (iconSlot === undefined || labelSlot === undefined || iconSlot === labelSlot) return null
    // 清理除 iconSlot 和 labelSlot 之外的任何多余 span 残留
    spans.forEach(span => {
      if (span !== iconSlot && span !== labelSlot) span.remove()
    })
    iconSlot.innerHTML = icon
    labelSlot.textContent = label
    if (tailIcon !== undefined && tailIcon !== '') {
      const tail = document.createElement('span')
      tail.style.marginLeft = 'auto'
      tail.style.opacity = '0.65'
      tail.style.display = 'inline-flex'
      tail.style.alignItems = 'center'
      tail.innerHTML = tailIcon
      button.appendChild(tail)
    }
    return row
  }

  function injectMenuEntry(attempt = 0): void {
    if (disposed) return
    if (assigningWorkspaceId === undefined) return
    if (document.querySelector(`[${MENU_ITEM_ATTR}]`) !== null) return
    // 任意一个已渲染出行的菜单都算候选；宿主把菜单外壳与菜单项分两拍挂上来，
    // 所以「外壳在、行还没渲染」也要能用缓存模板立刻注入，否则用户会看到菜单先出来、置顶晚到。
    const menus = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]')).filter(
      item => !isOwnPanel(item),
    )
    const rendered = menus.filter(menu => menu.querySelector('button[role="menuitem"]') !== null)
    const menu = rendered[rendered.length - 1] ?? (hostMenuRowTemplate === undefined ? undefined : menus[menus.length - 1])
    if (menu === undefined) {
      if (attempt < 6) window.setTimeout(() => injectMenuEntry(attempt + 1), 20)
      return
    }

    // 严密防线：若候选菜单包含「置顶会话」「分叉会话」「删除会话」「Session ID」等会话特有操作，
    // 判定为会话菜单，绝对不注入置顶与分区！此选项专属项目文件夹。
    const menuItemsText = Array.from(menu.querySelectorAll('button[role="menuitem"]'))
      .map(b => b.textContent ?? '')
      .join(' ')
    if (
      menuItemsText.includes('置顶会话') ||
      menuItemsText.includes('分叉会话') ||
      menuItemsText.includes('删除会话') ||
      menuItemsText.includes('Session ID') ||
      menuItemsText.includes('移动到工作区')
    ) {
      assigningWorkspaceId = undefined
      return
    }
    const reference = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')).find(
      button => button.closest('[role="menu"]') === menu,
    )
    // 有缓存模板时不必等当前菜单渲染出行：直接插到菜单内容容器顶部。
    const template = hostMenuRowTemplate
    let container: HTMLElement | null | undefined = reference?.parentElement?.parentElement
    if (container === undefined || container === null) {
      if (template === undefined) return
      container = (menu.firstElementChild as HTMLElement | null) ?? menu
    }
    if (reference !== undefined && template === undefined) {
      // 首次打开菜单：顺便把宿主菜单的模板记下来，后续就有了缓存。
      // 面板改用宿主 MenuSurface 原语渲染，这里只缓存行结构
    }
    if (reference !== undefined && hostMenuRowTemplate === undefined && !isOwnPanel(reference)) {
      hostMenuRowTemplate = reference.parentElement?.cloneNode(true) as HTMLElement | undefined
    }

    const workspaceId = assigningWorkspaceId
    if (workspaceId === undefined) return
    const pinned = sectionOf(state, workspaceId) === PINNED_SECTION_ID

    const pinRow = buildMenuRow(reference, pinned ? iconPinned() : iconPin(), text(pinned ? 'sections.unpin' : 'sections.pin', pinned ? '取消置顶' : '置顶'), MENU_ITEM_ATTR, hostMenuRowTemplate)
    const sectionRow = buildMenuRow(reference, iconSection(), text('sections.menu', '分区'), MENU_ITEM_ATTR, hostMenuRowTemplate, '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 12L10 8L6 4"/></svg>')

    /**
     * 插到宿主菜单行所在的同一个父亲里、紧挨在第一条宿主行之前。
     *
     * 归档插件就是这么做的：先拿到宿主行的外层 wrapper，再把克隆行插进「wrapper 的父亲」。
     * 这样我们的行和宿主的行是亲兄弟，共用同一块菜单表面；换成自己猜容器的话，
     * 某些布局下（桌面端）拿到的会是外壳层，行就被渲染成一个独立浮层。
     */
    const hostWrap = reference?.parentElement ?? null
    const hostParent = hostWrap?.parentElement ?? container
    const insertBeforeNode = hostWrap !== null && hostWrap.parentElement === hostParent ? hostWrap : container.firstChild
    if (pinRow !== null) {
      const button = pinRow.querySelector('button')
      button?.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        closeMenusByEscape()
        commitExplicit(assignWorkspace(state, workspaceId, pinned ? DEFAULT_SECTION_ID : PINNED_SECTION_ID), [workspaceId])
      })
      hostParent.insertBefore(pinRow, insertBeforeNode)
    }
    if (sectionRow !== null) {
      const button = sectionRow.querySelector('button')
      const anchorButton = button
      if (anchorButton !== null) {
        // 宿主 MenuItemButton 不透传 aria-haspopup/aria-expanded，这里按等价语义补齐，
        // 让读屏知道这一行会展开二级菜单（与归档插件的做法一致）。
        anchorButton.setAttribute('aria-haspopup', 'menu')
        anchorButton.setAttribute('aria-expanded', assignExpanded ? 'true' : 'false')
        let hoverTimer: number | undefined
        const cancelHover = (): void => {
          if (hoverTimer === undefined) return
          window.clearTimeout(hoverTimer)
          hoverTimer = undefined
        }
        cancelAnchorLeave = cancelHover
        anchorButton.addEventListener('mouseenter', () => {
          cancelHover()
          // 指针从二级菜单移回本行：取消面板已排期的收起
          cancelPanelLeave?.()
          // 悬停即展开（和 Codex 的「移动到项目」一样），留 90ms 防误触。
          hoverTimer = window.setTimeout(() => {
            hoverTimer = undefined
            if (menuHost !== undefined && assignAnchor === anchorButton) return
            openAssignMenu(anchorButton, menu)
          }, 90)
        })
        anchorButton.addEventListener('mouseleave', () => {
          cancelHover()
          // 指针往右穿过空隙去二级菜单时不该收：留 180ms 宽限，二级菜单自己会续期。
          hoverTimer = window.setTimeout(() => {
            hoverTimer = undefined
            if (assignAnchor === anchorButton) closeSectionMenu()
          }, 180)
        })
        anchorButton.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()
          cancelHover()
          openAssignMenu(anchorButton, menu)
        })
      }
      // 插在「置顶」后面，保证顺序是 置顶 → 分区 → 宿主自己的项。
      hostParent.insertBefore(sectionRow, pinRow?.nextSibling ?? insertBeforeNode)
    }
  }

  /** 让宿主菜单按它自己的 Escape 语义关闭，避免我们自己猜关闭逻辑。 */
  function closeMenusByEscape(): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
  }

  let assigningWorkspaceId: string | undefined
  /** 宿主菜单表面与菜单行的克隆模板：分区菜单复用它们，样式才与原生一致。 */
  let hostMenuRowTemplate: HTMLElement | undefined
  /** 宿主菜单的外壳与内容容器：真正的底色/模糊画在 viewport 上，必须整层复用。 */
  let collapsed: Record<string, boolean> = readCollapsed()

  function openAssignMenu(anchor: HTMLElement, parentMenu?: HTMLElement): void {
    const workspaceId = assigningWorkspaceId
    if (workspaceId === undefined) return
    const current = sectionOf(state, workspaceId)
    /**
     * 只列「能移动过去」的目标：
     * - 当前所在的分区不列（移到自己那儿没意义）；
     * - 置顶也不列——父菜单里已经有独立的一行「置顶 / 取消置顶」，重复出现只会让人犹豫。
     */
    const items: Array<{ label: string; icon: string; onSelect: () => void }> = state.sections
      .filter(section => section.id !== current && section.id !== PINNED_SECTION_ID)
      .map(section => ({
        label: section.name,
        icon: iconSection(),
        onSelect: () => {
          closeSectionMenu()
          closeMenusByEscape()
          commitExplicit(assignWorkspace(state, workspaceId, section.id), [workspaceId])
        },
      }))
    items.push({
      label: text('sections.new', '新建分区'),
      icon: iconPlus(),
      onSelect: () => {
        closeSectionMenu()
        closeMenusByEscape()
        startCreateSection(workspaceId)
      },
    })
    openHostPanel(anchor, items, parentMenu)
    // 展开态在面板建立之后再落标记：openHostPanel 开头会 closeSectionMenu() 清标志，
    // 先设会被自己清掉（这也是菜单行重新注入后 aria-expanded 回退的原因）。
    if (menuHost !== undefined) {
      assignAnchor = anchor
      assignExpanded = true
      anchor.setAttribute('aria-expanded', 'true')
    }
  }

  /* ── 顺序同步 ── */

  /** 新增项目进入默认分区，删除项目及时裁剪；不改变既有成员的显式归属。 */
  function withHostWorkspaces(value: SectionsState, ids: readonly string[]): SectionsState {
    let next = normalizeSections(value, ids)
    for (const id of ids) {
      if (sectionOf(next, id) === undefined) next = assignWorkspace(next, id, DEFAULT_SECTION_ID)
    }
    return next
  }

  /** 一次只执行一个确定的计划；请求未结束时绝不超时重发同一条写入。 */
  function startNextUpdate(): void {
    if (disposed || activeUpdate !== undefined) return
    const update = updates.shift()
    if (update === undefined) return
    update.next = withHostWorkspaces(update.next, knownIds())
    if (updates.length === 0) state = update.next
    activeUpdate = update
    if (list !== undefined) update.motion = new SectionLayoutMotion(list)
    const service = workspaces()
    const write = async (): Promise<void> => {
      if (service === undefined) throw new Error('工作区服务未就绪')
      const desired = flattenSections(update.next)
      for (const move of planWorkspaceMoves(knownIds(), desired, update.workspaceIds)) {
        if (disposed || activeUpdate !== update) return
        await insertWorkspace(service, move.workspaceId, move.beforeWorkspaceId)
      }
      if (disposed || activeUpdate !== update) return
      update.rpcDone = true
      syncNow()
    }
    void write().catch(() => {
      if (disposed || activeUpdate !== update) return
      // 不把失败意图保存，也不无限重试；后续菜单操作可从最后确认的归属重新开始。
      console.warn('[codex-ui:sections] 工作区移动失败，已撤销未确认的分区操作。')
      showAbortedNotice()
      updates.length = 0
      update.motion?.dispose()
      activeUpdate = undefined
      state = committedState
      scheduleSync()
    })
    scheduleSync()
  }

  function scheduleSync(): void {
    if (disposed || rafId !== 0) return
    rafId = window.requestAnimationFrame(() => {
      rafId = 0
      syncNow()
    })
  }

  /** 缓存宿主菜单的表面类名与行结构，供分区菜单复用（任意宿主菜单都可以当模板）。 */
  /** 是不是我们自己画的面板（分区菜单）。宿主菜单模板绝不能取自它。 */
  function isOwnPanel(element: Element | null | undefined): boolean {
    return element instanceof Element && element.closest(`.${MENU_CLASS}`) !== null
  }

  function cacheHostMenuTemplate(): void {
    if (hostMenuRowTemplate !== undefined && hostMenuRowTemplate.isConnected) {
      // 已缓存的模板就是新鲜节点，不必重取。
      return
    }
    const menu = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]')).find(
      item =>
        item.querySelector('button[role="menuitem"]') !== null &&
        !isOwnPanel(item) &&
        item.closest('[data-shortcut-modal="settings"]') === null,
    )
    const reference = menu?.querySelector<HTMLButtonElement>('button[role="menuitem"]')
    const wrapper = reference?.parentElement
    if (menu === undefined || reference === undefined || wrapper === undefined || wrapper === null) return
    hostMenuRowTemplate = wrapper.cloneNode(true) as HTMLElement
  }

  function syncNow(): void {
    if (disposed || syncing) return
    cacheHostMenuTemplate()
    if (!sectionsLoaded) return
    const next = findWorkspaceList(document)
    if (next === undefined) {
      detachHeaders()
      return
    }
    list = next
    if (!wired) {
      wired = true
      subscribeWorkspaces()
      startObserver()
    }
    syncing = true
    try {
      const order = domOrder()
      const ids = knownIds()
      const update = activeUpdate
      if (update !== undefined) {
        if (update.rpcDone && sameVisibleOrder(ids, order)) {
          const normalized = withHostWorkspaces(update.next, ids)
          if (!sameOrder(flattenSections(normalized), flattenSections(update.next))) {
            const original = new Set(flattenSections(update.next))
            update.next = reconcileHostOrder(normalized, ids).state
            state = withHostWorkspaces(state, ids)
            update.motion?.dispose()
            update.motion = undefined
            update.layoutDone = false
            const additions = ids.filter(id => !original.has(id))
            const moves = planWorkspaceMoves(ids, flattenSections(update.next), additions)
            if (moves.length > 0) {
              const service = workspaces()
              if (service === undefined) throw new Error('工作区服务未就绪')
              update.rpcDone = false
              void (async () => {
                for (const move of moves) await insertWorkspace(service, move.workspaceId, move.beforeWorkspaceId)
                if (activeUpdate !== update || disposed) return
                update.rpcDone = true
                scheduleSync()
              })().catch(() => {
                console.warn('[codex-ui:sections] 同步新工作区顺序失败。')
                if (activeUpdate !== update || disposed) return
                updates.length = 0
                activeUpdate = undefined
                state = committedState
                scheduleSync()
              })
              return
            }
          }
        }
        const desired = flattenSections(update.next)
        // 服务快照与 DOM 必须同时追平。中间序列不参与标题定位，也不反向覆盖菜单意图。
        if (!sameOrder(ids, desired) || !sameVisibleOrder(desired, order)) return
        if (!update.layoutDone) {
          update.layoutDone = true
          const layout = (): void => placeHeaders(collectProjectBlocks(list!, list), update.next)
          const finished = update.motion?.play(layout)
          if (finished === undefined) layout()
          void (finished ?? Promise.resolve()).then(() => {
            if (disposed || activeUpdate !== update) return
            update.motionDone = true
            syncNow()
          })
        }
        if (update.rpcDone && update.motionDone) {
          committedState = update.next
          state = update.next
          persist(committedState)
          activeUpdate = undefined
          startNextUpdate()
        }
        return
      }
      // React 还没提交快照对应的行时保持当前布局，等 MutationObserver 再来。
      if (!sameVisibleOrder(ids, order) || order.length === 0) return
      const before = serializeSections(state)
      state = normalizeSections(state, ids)
      if (!baselineSet) {
        baselineSet = true
        for (const id of ids) {
          if (sectionOf(state, id) === undefined) state = assignWorkspace(state, id, DEFAULT_SECTION_ID)
        }
        committedState = state
        if (!sameOrder(flattenSections(state), ids)) {
          commitExplicit(state)
          return
        }
      } else {
        // 空闲时只采纳宿主的分区内顺序；原生拖拽不需要再写一次宿主。
        state = reconcileHostOrder(state, ids).state
      }
      committedState = state
      if (serializeSections(state) !== before) persist()
      placeHeaders(collectProjectBlocks(list, list))
    } finally {
      syncing = false
    }
  }

  /** 可见行必须是快照的有序子集；未渲染的项目仍由完整快照维护。 */
  function sameVisibleOrder(all: readonly string[], visible: readonly string[]): boolean {
    const shown = new Set(visible)
    return shown.size === visible.length && sameOrder(all.filter(id => shown.has(id)), visible)
  }

  /** 两个顺序是否逐项一致。 */
  function sameOrder(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((id, index) => id === right[index])
  }

  function startObserver(): void {
    observer = new MutationObserver(mutations => {
      if (disposed) return
      // 宿主菜单刚挂上：同一微任务里同步插入「置顶 / 分区」，和原生菜单项同帧出现。
      if (assigningWorkspaceId !== undefined && document.querySelector(`[${MENU_ITEM_ATTR}]`) === null) {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof Element && (node.matches('[role="menu"]') || node.querySelector('[role="menu"]') !== null)) {
              injectMenuEntry()
              return
            }
          }
        }
      }
      let touched = false
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof Element && node.closest(`.${HEADER_CLASS}`) !== null) continue
          touched = true
          break
        }
        if (touched) break
        if (mutation.type === 'childList') {
          touched = true
          break
        }
      }
      if (touched) {
        // 宿主已提交 DOM 时在绘制前完成分区布局，不能再晚一帧补标题。
        if (activeUpdate !== undefined) syncNow()
        else scheduleSync()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  function subscribeWorkspaces(): void {
    const service = workspaces()
    if (service === undefined) return
    try {
      unsubscribe = service.list.subscribe(() => scheduleSync())
    } catch {
      unsubscribe = undefined
    }
  }

  // 首轮：等宿主把树挂上来（可能晚于插件激活）。
  const boot = window.setInterval(() => {
    if (disposed) return
    if (findWorkspaceList(document) === undefined) return
    window.clearInterval(boot)
    scheduleSync()
  }, 200)
  void loadStateFromHost()
  scheduleSync()

  const dispose = (): void => {
    if (disposed) return
    disposed = true
    if (activeInstance === dispose) activeInstance = undefined
    window.clearInterval(boot)
    if (rafId !== 0) window.cancelAnimationFrame(rafId)
    observer?.disconnect()
    clearWriteWait()
    updates.length = 0
    activeUpdate?.motion?.dispose()
    activeUpdate = undefined
    document.removeEventListener('dragstart', onWorkspaceDragStart, true)
    document.removeEventListener('dragover', onWorkspaceDragOver, true)
    document.removeEventListener('drop', onWorkspaceDrop, true)
    document.removeEventListener('dragend', onWorkspaceDragEnd, true)
    document.removeEventListener('keydown', onKeydownToCloseSectionMenu, true)
    document.removeEventListener('pointerdown', onPointerdownToCloseSectionMenu, true)
    document.removeEventListener('pointerdown', onPointerdownToPrepareMenu, true)
    document.removeEventListener('click', onClickToPrepareMenu, true)
    document.removeEventListener('contextmenu', onContextMenuToPrepareMenu, true)
    unsubscribe?.()

    closeSectionMenu()
    void flushSectionsSave()
    for (const header of headers.values()) header.remove()
    headers.clear()
    document.body.removeAttribute('data-dcu-dragging-section-target')
    document.body.removeAttribute('data-dcu-drag-blocked')
    for (const block of Array.from(document.querySelectorAll<HTMLElement>('[data-dcu-section-member]'))) {
      block.removeAttribute('data-dcu-section-member')
      block.removeAttribute('data-dcu-section-hidden')
    }
  }
  activeInstance = dispose
  return dispose
}
