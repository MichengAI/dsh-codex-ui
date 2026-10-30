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
import { render, unmountComponentAtNode } from 'react-dom'
import {
  DEFAULT_SECTION_ID,
  PINNED_SECTION_ID,
  assignWorkspace,
  createSection,
  createSectionsState,
  deleteSection,
  findMovedItem,
  flattenSections,
  isBuiltinSection,
  moveSection,
  normalizeSections,
  parseSections,
  reconcileHostOrder,
  renameSection,
  sortSectionMembers,
  sectionOf,
  serializeSections,
  type SectionsState,
} from './model.ts'
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
.dcu-ws-section.dcu-dragging{opacity:.4}
[data-sidebar-collapsed='true'] .dcu-ws-section{display:none !important}
/* 宿主自身的落点线和顶线全部隐藏，由插件以 z-index: 9999 自绘唯一、瞬时（0ms）、不重叠的落点线 */
[class*="workspaceDropBefore"]::before,
[class*="workspaceDropAfter"]::after,
[class*="dropBefore"]::before,
[class*="dropAfter"]::after,
[class*="listTopDropIndicator"]{display:none !important}
.dcu-ws-section-drop{position:fixed;height:12px;pointer-events:none;z-index:9999;background:linear-gradient(55deg,transparent calc(50% - 1px),var(--dsw-alias-state-business-primary,#4f8cff) calc(50% - 1px) calc(50% + 1px),transparent calc(50% + 1px)) 0 0 / 5px 7px no-repeat,linear-gradient(125deg,transparent calc(50% - 1px),var(--dsw-alias-state-business-primary,#4f8cff) calc(50% - 1px) calc(50% + 1px),transparent calc(50% + 1px)) 0 5px / 5px 7px no-repeat,linear-gradient(var(--dsw-alias-state-business-primary,#4f8cff) 0 0) 4px 5px / calc(100% - 4px) 2px no-repeat}
.dcu-ws-section-menu{position:fixed;z-index:1000;min-width:184px;max-width:280px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:4px;display:flex;flex-direction:column;gap:2px;border:none;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-menu-surface-fill,var(--dsw-alias-surface-overlay,#1e1e22));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(40px) saturate(150%));-webkit-backdrop-filter:var(--dsw-menu-backdrop-filter,blur(40px) saturate(150%));box-shadow:var(--dsw-elevation-prominent,0 6px 20px rgba(0,0,0,.45));color:var(--dsw-alias-label-primary,#ededed)}
/* 父菜单与二级菜单之间有一小段空隙：铺一条透明桥，指针穿过去时不会触发离开事件。 */
.dcu-ws-section-menu[data-flyout='true']::before{content:'';position:absolute;top:0;bottom:0;left:-6px;width:8px}
.dcu-ws-section-menu button{display:flex;align-items:center;gap:8px;width:100%;min-height:28px;padding:6px 10px;text-align:left;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;font-size:13px;line-height:20px;cursor:pointer;transition:background-color .12s ease}
.dcu-ws-section-menu .dcu-ws-section-menu-icon{display:grid;place-items:center;width:16px;height:16px;flex:none;color:var(--dsw-alias-label-secondary,#a1a1a6)}
.dcu-ws-section-menu .dcu-ws-section-menu-icon:empty{display:none}
.dcu-ws-section-menu .dcu-ws-section-menu-label{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcu-ws-section-menu button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}
.dcu-ws-section-menu button[aria-current='true']{color:var(--dsw-alias-state-business-primary,#4176e6)}
.dcu-ws-section[data-dcu-section-fixed='true']{cursor:default}
.dcu-ws-section[data-dcu-drop-target='true']{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.18));color:var(--dsw-alias-label-primary,inherit)}

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
  let applying = false
  let baselineSet = false
  let pendingOrder: string[] | undefined
  let queuedOrder: string[] | undefined
  /** 本次批量写入的起始时间：卡死时用来兜底解封。 */
  let applyingSince = 0
  let suppressReconcile = 0
  /** 用户显式操作的权威顺序；宿主顺序追平后清空。 */
  let intentOrder: string[] | undefined
  let wired = false
  let syncing = false
  let rafId = 0
  let observer: MutationObserver | undefined
  let unsubscribe: (() => void) | undefined
  const headers = new Map<string, HTMLElement>()
  let menuHost: HTMLElement | undefined
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
    sectionsLoaded = true
    scheduleSync()
  }

  /** 分区文档写回宿主；失败不阻塞界面，下一次用户操作会再触发保存。 */
  function persist(): void {
    if (!sectionsLoaded) return
    scheduleSectionsSave(serializeSections(state))
  }

  function commit(next: SectionsState): void {
    state = next
    persist()
    scheduleSync()
  }

  /**
   * 用户显式改归属（菜单选分区、拖动落位）后的提交。
   *
   * 只 persist + scheduleSync 是不够的：下一拍同步看到 DOM 还是老顺序，
   * `reconcileHostOrder` 会按位置把归属反推回去，用户看到的就是「点了没反应」。
   * 这里直接把目标顺序记成意图，等宿主追平之前不做反推。
   */
  function commitExplicit(next: SectionsState): void {
    state = next
    persist()
    const desired = flattenSections(next)
    intentOrder = desired
    suppressReconcile = 6
    void applyOrder(desired)
    scheduleSync()
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
    header.draggable = !fixed
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

    header.addEventListener('dragstart', event => {
      if (isBuiltinSection(sectionId)) {
        event.preventDefault()
        return
      }
      draggingSection = sectionId
      header?.classList.add('dcu-dragging')
      try {
        event.dataTransfer?.setData('text/plain', `section:${sectionId}`)
        if (event.dataTransfer !== null) {
          event.dataTransfer.effectAllowed = 'move'
          // 与宿主拖动工作区一样，拎起一张带底色的卡片作预览，而不是浏览器默认的半透明截图。
          const ghost = document.createElement('div')
          ghost.className = `${HEADER_CLASS} dcu-drag-ghost`
          ghost.textContent = localizeBuiltinName(sectionId, name, text)
          ghost.style.cssText = [
            'position:absolute',
            'top:-9999px',
            'left:-9999px',
            `width:${Math.max(120, header?.offsetWidth ?? 160)}px`,
            'padding:6px 10px',
            'border-radius:8px',
            'font-size:12px',
            'font-weight:500',
            'color:var(--dsw-alias-label-primary,#eee)',
            'background:var(--dsw-alias-bg-layer-3,rgba(40,40,44,.96))',
            'box-shadow:0 8px 24px rgba(0,0,0,.28)',
          ].join(';')
          document.body.appendChild(ghost)
          event.dataTransfer.setDragImage(ghost, 16, 14)
          window.setTimeout(() => ghost.remove(), 0)
        }
      } catch {
        // 某些环境下不可写 dataTransfer，拖拽仍能靠内部状态完成。
      }
    })
    header.addEventListener('dragend', () => {
      draggingSection = undefined
      header?.classList.remove('dcu-dragging')
      clearDropLine()
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
        // 展开：直接解除 hidden 并剥离所有限制，内容自然呈现，
        // 彻底根除因高度测量不准、动画竞态或过期回调导致的「自动回弹/收起」。
        block.removeAttribute('data-dcu-section-hidden')
        block.style.removeProperty('max-height')
        block.style.removeProperty('overflow')
        block.style.removeProperty('opacity')
      }
    }

    if (!collapse) {
      animatingSections.delete(sectionId)
      scheduleSync()
      return
    }

    window.setTimeout(() => {
      if (animationGeneration.get(sectionId) !== generation) return
      blocks.forEach(block => {
        if (!block.isConnected) return
        block.style.removeProperty('max-height')
        block.style.removeProperty('overflow')
        block.style.removeProperty('opacity')
        block.setAttribute('data-dcu-section-hidden', 'true')
      })
      animatingSections.delete(sectionId)
      scheduleSync()
    }, SECTION_ANIM_MS + 20)
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
  let draggingSection: string | undefined
  let draggingProject: string | undefined
  /** 项目落点：落在某一行上下半区，或直接落在某个分区标题上（空分区只能走这条）。 */
  type ProjectDrop =
    | { kind: 'workspace'; id: string; before: boolean }
    | { kind: 'section'; sectionId: string }
  let projectDrop: ProjectDrop | undefined
  /** 记录最后一次悬停的项目行及落点方位，供释放时执行同步乐观 DOM 移动，杜绝回弹。 */
  let projectRowHover: { targetId: string; row: HTMLElement; before: boolean } | undefined
  let dropLine: HTMLElement | undefined

  function ensureDropLine(): HTMLElement {
    if (dropLine && dropLine.isConnected) return dropLine
    const line = document.createElement('div')
    line.className = 'dcu-ws-section-drop'
    line.style.display = 'none'
    document.body.appendChild(line)
    dropLine = line
    return line
  }

  function showDropLine(target: HTMLElement, before: boolean): void {
    const rect = target.getBoundingClientRect()
    const line = ensureDropLine()
    line.style.display = 'block'
    line.style.top = `${(before ? rect.top : rect.bottom) - 6}px`
    line.style.left = `${rect.left}px`
    line.style.width = `${rect.width}px`
  }

  function clearDropLine(): void {
    if (dropLine) dropLine.style.display = 'none'
    for (const header of headers.values()) header.removeAttribute('data-dcu-drop-target')
  }

  function showSectionDrop(header: HTMLElement): void {
    clearDropLine()
    header.setAttribute('data-dcu-drop-target', 'true')
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[class*="workspaceDropBefore"],[class*="workspaceDropAfter"]'))) {
      el.className = el.className.replace(/\b[a-zA-Z0-9_]*workspaceDrop(Before|After)\b/g, '').trim()
    }
  }

  /** 把标题按分区顺序放到各自第一个分组块前面；空分区贴着下一个分区显示。 */
  function placeHeaders(blocks: readonly ProjectBlock[]): void {
    if (blocks.length === 0) return
    const target = blocks[0]!.block.parentElement
    if (target === null) return

    const entries = state.sections.map(section => {
      const firstId = section.ids.find(id => blocks.some(block => block.workspaceId === id))
      const block = firstId === undefined ? undefined : blocks.find(item => item.workspaceId === firstId)?.block
      return { id: section.id, name: section.name, block }
    })

    // 从后往前插：后面的分区先就位，前面的分区就能把「下一个分区标题」当作参照点，
    // 空分区也不会被挤到列表末尾。
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index]!
      const header = ensureHeader(entry.id, entry.name)
      let reference: Node | null = entry.block ?? null
      if (reference === null) {
        for (let ahead = index + 1; ahead < entries.length; ahead += 1) {
          const laterHeader = headers.get(entries[ahead]!.id)
          if (laterHeader !== undefined && laterHeader.isConnected) {
            reference = laterHeader
            break
          }
          const laterBlock = entries[ahead]!.block
          if (laterBlock !== undefined) {
            reference = laterBlock
            break
          }
        }
      }
      if (reference === null) {
        if (header.parentElement !== target) target.appendChild(header)
      } else if (header.nextElementSibling !== reference) {
        target.insertBefore(header, reference)
      }
    }

    // 成员块打标记：CSS 据此做缩进（层级）与折叠隐藏。
    const memberOf = new Map<string, string>()
    for (const section of state.sections) {
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
    const firstHeader = headers.get(state.sections[0]?.id ?? PINNED_SECTION_ID)
    if (label !== null && firstHeader !== undefined && alignKey !== lastAlignKey) {
      lastAlignKey = alignKey
      const lead = Math.max(0, Math.round(label.getBoundingClientRect().left - firstHeader.getBoundingClientRect().left))
      for (const header of headers.values()) header.style.setProperty('--dcu-section-lead', `${lead}px`)
    }

    // 未分组桶（`data-row-key="workspace:"`）属于「项目」分区：跟着缩进、跟着折叠，但不参与顺序写入。
    const ungrouped = Array.from(list?.querySelectorAll('[data-row-key="workspace:"]') ?? [])
      .map(row => (row instanceof HTMLElement ? blockOf(row, list!) : null))
      .find((block): block is HTMLElement => block !== null)
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

    // 标题顺序必须等于分区顺序：宿主顺序与本地状态短暂不一致时（首次加载、外部拖动），
    // 「标题放在自己第一个成员前」会让置顶跑到项目后面。这里只移动标题、不动宿主分组块。
    let cursor: Element | null = null
    for (const section of state.sections) {
      const header = headers.get(section.id)
      if (header === undefined || !header.isConnected) continue
      if (cursor === null) {
        if (target.firstElementChild !== header) target.insertBefore(header, target.firstElementChild)
      } else if ((cursor.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING) === 0) {
        target.insertBefore(header, cursor.nextSibling)
      }
      cursor = header
    }

    for (const [id, header] of Array.from(headers.entries())) {
      if (!state.sections.some(section => section.id === id)) {
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
    menuHost?.remove()
    menuHost = undefined
    assignAnchor = undefined
  }

  /**
   * 分区自己的菜单面板。
   * 宿主菜单的底色画在它内部的 viewport 上、外壳是全透明的，克隆外壳拿不到样式；
   * 这里直接用宿主主题令牌画一张同风格的菜单，图标仍用宿主图标组件渲染。
   */
  function openHostPanel(
    anchor: HTMLElement,
    items: ReadonlyArray<{ label: string; icon: string; onSelect: () => void }>,
    flyoutFrom?: HTMLElement,
  ): void {
    closeSectionMenu()
    const panel = document.createElement('div')
    panel.className = MENU_CLASS
    panel.setAttribute('role', 'menu')

    for (const item of items) {
      const button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('role', 'menuitem')
      const icon = document.createElement('span')
      icon.className = `${MENU_CLASS}-icon`
      icon.innerHTML = item.icon
      const label = document.createElement('span')
      label.className = `${MENU_CLASS}-label`
      label.textContent = item.label
      button.append(icon, label)
      button.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        item.onSelect()
      })
      panel.appendChild(button)
    }

    let leaveTimer: number | undefined
    const cancelLeave = (): void => {
      if (leaveTimer === undefined) return
      window.clearTimeout(leaveTimer)
      leaveTimer = undefined
    }
    panel.addEventListener('mouseenter', cancelLeave)
    panel.addEventListener('mouseleave', () => {
      cancelLeave()
      leaveTimer = window.setTimeout(() => {
        leaveTimer = undefined
        closeSectionMenu()
      }, 180)
    })

    document.body.appendChild(panel)
    // 先变成 fixed 再量尺寸：块级 div 挂在 body 下会撑满整行，量出来的宽度没有意义。
    panel.style.left = '0px'
    panel.style.top = '0px'
    const rect = anchor.getBoundingClientRect()
    const width = panel.offsetWidth || 196
    const height = panel.offsetHeight || 120
    const parentMenu =
      flyoutFrom?.isConnected === true ? flyoutFrom : anchor.closest<HTMLElement>('[role="menu"]')
    if (parentMenu !== null && parentMenu !== undefined) {
      // 二级菜单：贴着父菜单右侧、与所点那一行顶部对齐；右侧不够就翻到左边。
      panel.dataset.flyout = 'true'
      const parentRect = parentMenu.getBoundingClientRect()
      let left = parentRect.right + 2
      if (left + width > window.innerWidth - 10) left = Math.max(10, parentRect.left - width - 4)
      const maxHeight = Math.max(140, Math.min(360, window.innerHeight - 20))
      panel.style.maxHeight = `${maxHeight}px`
      let top = rect.top - 4
      if (top + Math.min(height, maxHeight) > window.innerHeight - 10) {
        top = Math.max(10, window.innerHeight - Math.min(height, maxHeight) - 10)
      }
      panel.style.left = `${left}px`
      panel.style.top = `${top}px`
    } else {
      // 独立菜单（分区标题的 ···）：和宿主自己的行菜单一致——左边缘贴在触发按钮上、向右展开。
      panel.style.left = `${Math.max(8, Math.min(rect.left + 4, window.innerWidth - width - 8))}px`
      panel.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - height - 8))}px`
    }
    menuHost = panel
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
          commitExplicit(deleteSection(state, sectionId))
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
      else commitExplicit(assignWorkspace(created, workspaceId, id))
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

  document.addEventListener(
    'keydown',
    event => {
      if (event.key !== 'Escape' || menuHost === undefined) return
      closeSectionMenu()
    },
    true,
  )

  document.addEventListener(
    'pointerdown',
    event => {
      if (menuHost === undefined) return
      if (event.target instanceof Node && menuHost.contains(event.target)) return
      closeSectionMenu()
    },
    true,
  )

  /* ── 分区拖拽 ── */

  function rowFromEvent(event: DragEvent): HTMLElement | null {
    const target = event.target
    if (!(target instanceof Element)) return null
    return target.closest<HTMLElement>('[data-row-key^="workspace:"]')
  }

  function onProjectDragStart(event: DragEvent): void {
    const row = rowFromEvent(event)
    if (row === null) return
    const id = workspaceIdOfRow(row)
    if (id === undefined) return
    draggingProject = id
  }

  function finishProjectDrag(): void {
    draggingProject = undefined
    projectDrop = undefined
    projectRowHover = undefined
    clearDropLine()
  }

  function headerFromEvent(event: DragEvent): HTMLElement | null {
    const target = event.target
    if (!(target instanceof Element)) return null
    return target.closest<HTMLElement>(`.${HEADER_CLASS}`)
  }

  /**
   * 全局拖拽监听（极简高性能版）：
   * - 拖动项目行经过其他项目行：插件 100% 不干预、不查 DOM、不量 rect，宿主原生以 60fps 流畅处理；
   * - 拖动项目行悬停到【分区标题】：插件接管为分区投放目标，标题高亮并清除行残留线；
   * - 拖动分区标题：在分区标题之间计算落点线。
   */
  function onDragOver(event: DragEvent): void {
    if (draggingProject !== undefined) {
      // 1. 悬停在分区标题上：标题高亮，清除指示横线
      const header = headerFromEvent(event)
      const sectionId = header?.getAttribute(SECTION_HEADER_ATTR)
      if (header !== null && sectionId !== null && sectionId !== undefined) {
        event.preventDefault()
        if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'move'
        projectDrop = { kind: 'section', sectionId }
        projectRowHover = undefined
        showSectionDrop(header)
        return
      }

      // 2. 悬停在项目行上：瞬时（0ms）显示落点指示横线
      const row = rowFromEvent(event)
      if (row !== null) {
        const id = workspaceIdOfRow(row)
        if (id !== undefined && id !== draggingProject) {
          event.preventDefault()
          if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'move'
          projectDrop = undefined
          const rect = row.getBoundingClientRect()
          const before = event.clientY < rect.top + rect.height / 2
          projectRowHover = { targetId: id, row, before }
          showDropLine(row, before)
          return
        }
      }

      if (projectDrop !== undefined || projectRowHover !== undefined) {
        projectDrop = undefined
        projectRowHover = undefined
        clearDropLine()
      }
      return
    }

    if (draggingSection !== undefined) {
      const header = event.target instanceof Element ? event.target.closest<HTMLElement>(`.${HEADER_CLASS}`) : null
      if (header === null) return
      event.preventDefault()
      const rect = header.getBoundingClientRect()
      showDropLine(header, event.clientY < rect.top + rect.height / 2)
    }
  }

  function onDrop(event: DragEvent): void {
    if (draggingProject !== undefined) {
      const moving = draggingProject
      clearDropLine()

      // ── 场景 1：投放到分区标题上（包括空分区） ──
      if (projectDrop?.kind === 'section') {
        const targetSectionId = projectDrop.sectionId
        finishProjectDrag()
        event.preventDefault()
        event.stopPropagation()

        // 1. 同步更新状态与本地存储
        const assigned = assignWorkspace(state, moving, targetSectionId)
        state = assigned
        persist()

        // 2. 同步执行乐观 DOM 移动
        const targetHeader = headers.get(targetSectionId)
        const container = list ?? targetHeader?.parentElement
        const allBlocks = collectProjectBlocks(container ?? document, container as HTMLElement)
        const movedBlock = allBlocks.find(b => b.workspaceId === moving)?.block

        if (movedBlock && targetHeader && container) {
          const nextHeader = (() => {
            const index = state.sections.findIndex(s => s.id === targetSectionId)
            for (let i = index + 1; i < state.sections.length; i += 1) {
              const h = headers.get(state.sections[i]!.id)
              if (h && h.isConnected) return h
            }
            return null
          })()
          const memberBlocks = allBlocks.filter(
            b => state.sections.find(s => s.id === targetSectionId)?.ids.includes(b.workspaceId) && b.workspaceId !== moving,
          )
          const insertAnchor = memberBlocks.length > 0
            ? memberBlocks[memberBlocks.length - 1]!.block.nextSibling
            : (nextHeader ?? targetHeader.nextSibling)
          container.insertBefore(movedBlock, insertAnchor)

          movedBlock.setAttribute('data-dcu-section-member', targetSectionId)
          if (targetHeader.dataset.open === 'false') {
            movedBlock.setAttribute('data-dcu-section-hidden', 'true')
          } else {
            movedBlock.removeAttribute('data-dcu-section-hidden')
            movedBlock.style.removeProperty('max-height')
            movedBlock.style.removeProperty('overflow')
            movedBlock.style.removeProperty('opacity')
          }
        }

        // 3. 驱动宿主持久化顺序
        const desired = flattenSections(state)
        intentOrder = desired
        suppressReconcile = 10
        void applyOrder(desired)
        scheduleSync()
        return
      }

      // ── 场景 2：投放到具体项目行之间 ──
      if (projectRowHover !== undefined) {
        const hover = projectRowHover
        finishProjectDrag()
        event.preventDefault()
        event.stopPropagation()

        const targetSectionId = sectionOf(state, hover.targetId) ?? DEFAULT_SECTION_ID
        const targetSection = state.sections.find(s => s.id === targetSectionId)
        const targetIdx = targetSection ? targetSection.ids.indexOf(hover.targetId) : -1
        const insertIdx = targetIdx === -1 ? undefined : (hover.before ? targetIdx : targetIdx + 1)

        // 1. 同步更新状态并落盘
        const assigned = assignWorkspace(state, moving, targetSectionId, insertIdx)
        state = assigned
        persist()

        // 2. 同步执行乐观 DOM 移动
        const container = list ?? hover.row.closest<HTMLElement>('.list') ?? undefined
        const allBlocks = collectProjectBlocks(container ?? document, container)
        const movingBlock = allBlocks.find(b => b.workspaceId === moving)?.block
        const targetBlock = allBlocks.find(b => b.workspaceId === hover.targetId)?.block

        if (movingBlock && targetBlock && targetBlock.parentElement) {
          const anchor = hover.before ? targetBlock : targetBlock.nextSibling
          if (anchor !== movingBlock) {
            targetBlock.parentElement.insertBefore(movingBlock, anchor)
          }
          movingBlock.setAttribute('data-dcu-section-member', targetSectionId)
          const th = headers.get(targetSectionId)
          if (th?.dataset.open === 'false') {
            movingBlock.setAttribute('data-dcu-section-hidden', 'true')
          } else {
            movingBlock.removeAttribute('data-dcu-section-hidden')
            movingBlock.style.removeProperty('max-height')
            movingBlock.style.removeProperty('overflow')
            movingBlock.style.removeProperty('opacity')
          }
        }

        // 3. 驱动宿主持久化顺序
        const desired = flattenSections(state)
        intentOrder = desired
        suppressReconcile = 10
        void applyOrder(desired)
        scheduleSync()
        return
      }

      finishProjectDrag()
      return
    }

    if (draggingSection !== undefined) {
      const header = event.target instanceof Element ? event.target.closest<HTMLElement>(`.${HEADER_CLASS}`) : null
      const moving = draggingSection
      clearDropLine()
      draggingSection = undefined
      if (header === null) return
      event.preventDefault()
      const targetId = header.getAttribute(SECTION_HEADER_ATTR)
      if (targetId === null || targetId === moving) return
      const rect = header.getBoundingClientRect()
      const before = event.clientY < rect.top + rect.height / 2
      const next = before ? moveSection(state, moving, targetId) : moveSectionNext(state, moving, targetId)
      if (next !== state) commit(next)
    }
  }

  function moveSectionNext(current: SectionsState, moving: string, targetId: string): SectionsState {
    const index = current.sections.findIndex(section => section.id === targetId)
    const after = current.sections[index + 1]
    return moveSection(current, moving, after === undefined ? null : after.id)
  }

  document.addEventListener('dragstart', onProjectDragStart, true)
  document.addEventListener('dragend', finishProjectDrag, true)
  document.addEventListener('dragover', onDragOver, true)
  document.addEventListener('drop', onDrop, true)

  /* ── 项目菜单扩展 ── */

  /**
   * 项目行 `···` 按钮：宿主的行内操作区里**第一颗**按钮。
   * 操作区还有一颗「新建会话」按钮，且两颗按钮的 aria-label 都随语言变化，
   * 所以按位置（`rowActions` 容器的第一个 button）识别，不依赖文案。
   */
  function projectRowOfMenuButton(target: Element): Element | null {
    const button = target.closest('button')
    if (button === null) return null
    const row = button.closest('[data-row-key^="workspace:"]')
    if (row === null) return null
    const actions = row.querySelector('[class*="rowActions"]')
    if (actions === null || !actions.contains(button)) return null
    return actions.querySelector('button') === button ? row : null
  }

  /**
   * 项目行 `···` 一按下就记下目标工作区。
   *
   * 宿主的菜单在 **pointerdown** 阶段就挂载（不是 click），等到 click 再注入必然晚一帧以上，
   * 用户看到的就是「菜单先出来，置顶/分区过一会儿才冒出来」。
   * 键盘回车没有 pointerdown，所以保留 click 兜底。
   */
  function prepareMenuInjection(target: Element): void {
    const row = projectRowOfMenuButton(target)
    if (row === null) return
    const id = workspaceIdOfRow(row)
    if (id !== undefined) assigningWorkspaceId = id
    // 菜单可能已经挂上了（pointerdown 与 click 之间），立刻同步试一次；没有就交给 body 观察器。
    injectMenuEntry()
  }

  document.addEventListener('pointerdown', event => {
    if (event.target instanceof Element) prepareMenuInjection(event.target)
  }, true)
  document.addEventListener('click', event => {
    if (event.target instanceof Element) prepareMenuInjection(event.target)
  }, true)

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
    const spans = Array.from(button.querySelectorAll(':scope > span'))
    const iconSlot = spans[0]
    const labelSlot = spans[spans.length - 1]
    if (iconSlot === undefined || labelSlot === undefined || iconSlot === labelSlot) return null
    iconSlot.innerHTML = icon
    labelSlot.textContent = label
    return row
  }

  function injectMenuEntry(attempt = 0): void {
    if (disposed) return
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
      hostMenuSurface = menu
      hostMenuClassName = menu.className
      hostMenuShellTemplate = menu.cloneNode(false) as HTMLElement
      const viewport = reference.parentElement?.parentElement
      hostMenuViewportTemplate =
        viewport === undefined || viewport === null ? undefined : (viewport.cloneNode(false) as HTMLElement)
    }
    if (reference !== undefined && hostMenuRowTemplate === undefined && !isOwnPanel(reference)) {
      hostMenuRowTemplate = reference.parentElement?.cloneNode(true) as HTMLElement | undefined
      hostMenuSurface = menu
      hostMenuClassName = menu.className
      hostMenuShellTemplate = menu.cloneNode(false) as HTMLElement
      const viewport = reference.parentElement?.parentElement
      hostMenuViewportTemplate =
        viewport === undefined || viewport === null ? undefined : (viewport.cloneNode(false) as HTMLElement)
    }

    const workspaceId = assigningWorkspaceId
    if (workspaceId === undefined) return
    const pinned = sectionOf(state, workspaceId) === PINNED_SECTION_ID

    const pinRow = buildMenuRow(reference, pinned ? iconPinned() : iconPin(), text(pinned ? 'sections.unpin' : 'sections.pin', pinned ? '取消置顶' : '置顶'), MENU_ITEM_ATTR, hostMenuRowTemplate)
    const sectionRow = buildMenuRow(reference, iconSection(), text('sections.menu', '分区'), MENU_ITEM_ATTR, hostMenuRowTemplate)

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
        commitExplicit(assignWorkspace(state, workspaceId, pinned ? DEFAULT_SECTION_ID : PINNED_SECTION_ID))
      })
      hostParent.insertBefore(pinRow, insertBeforeNode)
    }
    if (sectionRow !== null) {
      const button = sectionRow.querySelector('button')
      const anchorButton = button
      if (anchorButton !== null) {
        let hoverTimer: number | undefined
        const cancelHover = (): void => {
          if (hoverTimer === undefined) return
          window.clearTimeout(hoverTimer)
          hoverTimer = undefined
        }
        anchorButton.addEventListener('mouseenter', () => {
          cancelHover()
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
  let hostMenuSurface: HTMLElement | undefined
  /** 宿主菜单表面与菜单行的克隆模板：分区菜单复用它们，样式才与原生一致。 */
  let hostMenuClassName: string | undefined
  let hostMenuRowTemplate: HTMLElement | undefined
  /** 宿主菜单的外壳与内容容器：真正的底色/模糊画在 viewport 上，必须整层复用。 */
  let hostMenuShellTemplate: HTMLElement | undefined
  let hostMenuViewportTemplate: HTMLElement | undefined
  let collapsed: Record<string, boolean> = readCollapsed()

  function openAssignMenu(anchor: HTMLElement, parentMenu?: HTMLElement): void {
    assignAnchor = anchor
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
        icon: '',
        onSelect: () => {
          closeSectionMenu()
          closeMenusByEscape()
          commitExplicit(assignWorkspace(state, workspaceId, section.id))
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
  }

  /* ── 顺序同步 ── */

  async function applyOrder(desired: readonly string[]): Promise<void> {
    const service = workspaces()
    if (service === undefined) return
    if (applying) {
      // 已有一次写入在飞：排队，等它写完再补一次，避免两次批量写入互相打断。
      queuedOrder = desired.slice()
      return
    }
    applying = true
    applyingSince = Date.now()
    pendingOrder = desired.slice()
    try {
      /**
       * 一次只挪一项。
       *
       * 以前是把整张表从后往前重写（N 次 insertBefore），宿主就重排 N 次：
       * 每次都触发一次列表重渲染，拖动/选分区时表现为明显卡顿，FLIP 动画也被打断。
       * 现在只找第一处错位，把那一项插到它的下一个锚点之前；宿主的乐观更新会立刻重排，
       * 拿到的是和用户自己拖动一模一样的一次移动，动画也就正常了。
       */
      const deadline = Date.now() + 4000
      for (let pass = 0; pass < desired.length && Date.now() < deadline; pass += 1) {
        const hostOrder = (): string[] => {
          const listIds = knownIds()
          return listIds.length > 0 ? listIds : domOrder()
        }
        const current = hostOrder()
        if (sameOrder(current, desired)) break

        // 单次移动最常见：直接找出被移动的那一项，一次 insertBefore 就够（宿主只重排一次，FLIP 动画正常）。
        const moved = findMovedItem(current, desired)
        let moving: string | undefined
        let anchor: string | undefined
        if (moved !== undefined) {
          moving = moved
          const target = desired.indexOf(moved)
          anchor = desired[target + 1]
        } else {
          // 多处同时变化（例如删除分区后成员并入兜底）：取第一处错位，把目标项插到当前占位项之前。
          let at = -1
          for (let i = 0; i < desired.length; i += 1) {
            if (current[i] !== desired[i]) {
              at = i
              break
            }
          }
          moving = desired[at]
          anchor = current[at]
        }
        if (moving === undefined) break

        await Promise.race([
          Promise.resolve(service.insertBefore(moving, anchor)),
          new Promise<void>(resolve => window.setTimeout(resolve, 800)),
        ])
        // 等宿主把这一次重排真正渲染到 DOM（最多 12 帧），
        // 否则会在宿主还没重排时误判「仍然错位」而重复写同一项。
        for (let frame = 0; frame < 12; frame += 1) {
          await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
          if (hostOrder().indexOf(moving) === desired.indexOf(moving)) break
        }
      }
    } catch {
      // 宿主拒绝（工作区被并发删除等）时保持现状，下一次同步会重试。
    } finally {
      applying = false
      pendingOrder = undefined
      const queued = queuedOrder
      queuedOrder = undefined
      if (queued !== undefined && !sameOrder(queued, desired)) void applyOrder(queued)
    }
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
      item => item.querySelector('button[role="menuitem"]') !== null && !isOwnPanel(item),
    )
    const reference = menu?.querySelector<HTMLButtonElement>('button[role="menuitem"]')
    const wrapper = reference?.parentElement
    if (menu === undefined || reference === undefined || wrapper === undefined || wrapper === null) return
    hostMenuClassName = menu.className
    hostMenuRowTemplate = wrapper.cloneNode(true) as HTMLElement
    hostMenuShellTemplate = menu.cloneNode(false) as HTMLElement
    const viewport = wrapper.parentElement
    hostMenuViewportTemplate =
      viewport === null ? undefined : (viewport.cloneNode(false) as HTMLElement)
  }

  function syncNow(): void {
    if (disposed || syncing) return
    cacheHostMenuTemplate()
    if (!sectionsLoaded) return
    if (applying) {
      // 看门狗：写入理论上有时限，万一仍被卡住，超过 12 秒就强解，别让整个插件永久哑掉。
      if (Date.now() - applyingSince > 12000) {
        applying = false
        queuedOrder = undefined
        pendingOrder = undefined
      } else {
        // 正在写宿主顺序：这一拍什么都别判，等写完再同步，避免在途状态被误读。
        return
      }
    }
    const next = findWorkspaceList(document)
    if (next === undefined) {
      detachHeaders()
      return
    }
    list = next
    // 首次找到列表就立刻接上订阅与观察器，不等轮询：拖拽与重渲染都要实时感知。
    if (!wired) {
      wired = true
      subscribeWorkspaces()
      startObserver()
    }
    syncing = true
    try {
      const ids = knownIds()
      if (ids.length > 0) state = normalizeSections(state, ids)

      const order = domOrder()
      if (order.length === 0) {
        placeHeaders(collectProjectBlocks(list, list))
        return
      }

      // 正在把顺序写回宿主：等宿主重排完成再判定，避免把在途写入误判成用户拖动。
      if (pendingOrder !== undefined) {
        if (!sameOrder(order, pendingOrder)) {
          placeHeaders(collectProjectBlocks(list, list))
          return
        }
        pendingOrder = undefined
      }

      if (!baselineSet) {
        // 首次同步：本地分类是权威，宿主的旧顺序不能把用户的归属冲掉；
        // 全新安装（本地没有任何成员）时则采纳宿主顺序，全部落进兜底分区。
        baselineSet = true
        if (flattenSections(state).length === 0) {
          const { state: adopted } = reconcileHostOrder(state, order)
          state = adopted
          persist()
        } else if (!sameOrder(flattenSections(state), order)) {
          if (!applying) void applyOrder(flattenSections(state))
        }
      } else if (intentOrder !== undefined) {
        // 用户刚显式指定过归属：以意图为准，宿主没追平就继续写，绝不反推。
        if (sameOrder(order, intentOrder)) intentOrder = undefined
        else if (!applying) void applyOrder(intentOrder)
      } else if (suppressReconcile > 0) {
        // 刚写完宿主，给宿主一到两拍把重渲染补齐；这段窗口里不把差异当成用户拖动。
        suppressReconcile -= 1
      } else if (!applying) {
        // 之后的顺序变化一定来自用户拖动：只重判被拖动那一项，再把顺序对齐。
        const { state: reconciled, changed } = reconcileHostOrder(state, order)
        if (changed) {
          state = reconciled
          persist()
        }
        const desired = flattenSections(state)
        if (!sameOrder(desired, order)) void applyOrder(desired)
      }

      placeHeaders(collectProjectBlocks(list, list))
    } finally {
      syncing = false
    }
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
      if (touched) scheduleSync()
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
  // 预热图标缓存：菜单项图标由宿主原语渲染，首次渲染要几十毫秒；提前渲染好，
  // 用户点开菜单时就只剩拼 DOM 的成本。
  for (const name of [
    'IconPinOutlineRegular',
    'IconPinFillRegular',
    'IconChecklistOutlineRegular',
    'IconTriangleRightFill14',
    'IconEditOutlineRegular',
    'IconCloseOutlineRegular',
    'IconPlusOutlineRegular',
    'IconCheckOutlineRegular',
  ]) {
  }
  void loadStateFromHost()
  scheduleSync()

  const dispose = (): void => {
    if (disposed) return
    disposed = true
    if (activeInstance === dispose) activeInstance = undefined
    window.clearInterval(boot)
    if (rafId !== 0) window.cancelAnimationFrame(rafId)
    observer?.disconnect()
    unsubscribe?.()
    document.removeEventListener('dragstart', onProjectDragStart, true)
    document.removeEventListener('dragend', finishProjectDrag, true)
    document.removeEventListener('dragover', onDragOver, true)
    document.removeEventListener('drop', onDrop, true)
    closeSectionMenu()
    clearDropLine()
    void flushSectionsSave()
    for (const header of headers.values()) header.remove()
    headers.clear()
    document.body.removeAttribute('data-dcu-dragging-section-target')
    for (const block of Array.from(document.querySelectorAll<HTMLElement>('[data-dcu-section-member]'))) {
      block.removeAttribute('data-dcu-section-member')
      block.removeAttribute('data-dcu-section-hidden')
    }
  }
  activeInstance = dispose
  return dispose
}
