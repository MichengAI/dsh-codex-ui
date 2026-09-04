import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import {
  decorateConversationTitle,
  decorateSessionLogDownload,
  HEADER_PROJECT_TIP_EVENT,
  HEADER_SESSION_MENU_EVENT,
  placeConversationTabs,
  syncTabSlider,
} from '../src/client/conversation-header.ts'

const header = readFileSync(new URL('../src/client/conversation-header.ts', import.meta.url), 'utf8')
const client = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')

// 宿主 React 会记录每个节点的父级；跨父级搬移节点会让宿主 removeChild 抛 NotFoundError 导致白屏。
assert.doesNotMatch(header, /actions\.after\(tabs\)/, '不得物理搬移宿主页签节点')
assert.doesNotMatch(header, /\.append\(title\)/, '不得把宿主标题节点搬进插件容器')
assert.match(header, /display:contents/, '必须用 CSS 展开标题行，而不是搬移 DOM')
assert.match(header, /\[class\*="headerActions"\]\{order:2/, '操作区必须排在面包屑后')
assert.match(header, /header \[data-dcu-inline-tabs\]\{[^}]*order:3/, '对话轨迹页签必须排到操作区后面')
assert.match(header, /\[class\*="headerUtilities"\]\{order:4/, '扩展区必须排到页签后面')
assert.match(header, /requestAnimationFrame/, '会话顶栏观察必须按帧节流')
assert.match(header, /tabs\.removeEventListener\('click', onClick\)/, '页签点击监听必须随插件停用清理')
assert.match(header, /stopWatchingTabs\?\.\(\)/, '页签 MutationObserver 必须随宿主重建或插件停用清理')
assert.match(header, /data-dcu-inline-tabs/, '内联页签必须带稳定标记')
assert.match(header, /data-dcu-title-folder/, '会话标题必须加上文件夹图标')
assert.match(client, /observeConversationHeader/, '会话顶栏观察必须接入客户端')
assert.match(header, /data-dcu-title-more/, '会话标题右侧必须有三点菜单')
assert.match(header, /HEADER_PROJECT_TIP_EVENT/, '顶栏文件夹必须复用项目悬停卡片')
assert.match(header, /HEADER_SESSION_MENU_EVENT/, '顶栏三点必须复用会话菜单')
assert.match(header, /\[role=tab\]:after/, '对话轨迹页签必须去掉下划线')
assert.match(header, /aria-selected=true/, '选中页签必须能识别当前项')
assert.match(header, /data-dcu-tab-slider/, '对话轨迹必须使用滑动选中块')
assert.match(header, /button-info-fill/, '选中页签必须使用原来的蓝色')
assert.match(header, /min-height:34px[^}]*padding-top:3px;padding-bottom:3px/, '紧凑顶栏必须给 28px 控件保留上下各 3px 空间')
assert.match(header, /header:has\(\[data-dcu-inline-tabs\]\):after\{display:none;content:none\}/, '紧凑顶栏必须移除宿主分割线')
assert.doesNotMatch(header, /padding-top:0/, '顶栏控件不得再次贴到窗口上边缘')
assert.match(header, /header:has\(\[data-dcu-inline-tabs\]\)\{[^}]*border-bottom:0/, '紧凑顶栏必须彻底移除宿主底部分割线')
assert.match(header, /\[data-dcu-inline-tabs\]\{box-sizing:border-box;[^}]*gap:0[^}]*height:28px[^}]*border:1px[^}]*border-radius:8px/, '方案 1 外框必须是包含边框在内的 28px 分段控件')
assert.match(header, /\[data-dcu-tab-slider\]\{[^}]*height:26px/, '分段滑块必须适配 28px 外框的内部高度')
assert.match(header, /\[role=tab\]\{[^}]*height:26px[^}]*padding:3px 10px/, '分段页签必须适配 28px 外框的内部高度')
assert.match(header, /\[role=tab\]\+\[role=tab\]\{border-left:1px/, '分段控件内部必须保留轻量分隔')
assert.match(header, /slider\.style\.width = `\$\{Math\.max\(0, tabBox\.width\)\}px`/, '选中背景必须覆盖当前文字分段')
assert.doesNotMatch(header, /toggle-cluster.*\.(after|append|insertBefore)|translateY\(14/, '不得物理搬移或位移外部插件按钮')
assert.match(header, /body\[data-dsh-sidebar-collapsed\]:has\(\[data-dcu-inline-tabs\]\) \[data-dsh-toggle-cluster\]\{[^}]*top:calc\(3px \+ env\(safe-area-inset-top\)\)/, '紧凑顶栏收起时必须把开关组扣回 3px，对冲 better-sidebar 0.18.0 的 14px')
assert.match(header, /body\[data-dsh-sidebar-collapsed\]\[data-dsh-title-bar-compat\]:has\(\[data-dcu-inline-tabs\]\) \[data-dsh-toggle-cluster\]\{[^}]*top:calc\(var\(--dsh-title-bar-strip, 40px\) \+ 3px\)/, '标题栏兼容收起时必须保留 caption 偏移并仍用 3px')
assert.doesNotMatch(header, /data-dsh-toggle-cluster\]\{[^}]*14px/, '紧凑顶栏不得再跟随官方 DSH 的 14px 折叠偏移')
assert.match(header, /data-dcu-session-log-download/, 'Session log 必须改成紧凑下载按钮')
assert.match(header, /clip:rect\(0 0 0 0\)/, 'Session log 文本必须仅视觉隐藏并保留无障碍名称')
assert.match(header, /width="16" height="16"/, '顶栏文件夹必须和侧栏一样是 16px')
assert.match(header, /getRect/, '三点菜单必须按按钮位置取锚点')
assert.match(header, /toggle: true/, '再次点击顶栏文件夹必须关闭卡片')
assert.doesNotMatch(header, /mouseenter/, '顶栏文件夹不得再用悬停打开卡片')
assert.match(header, /translate\(1.5 2.429\)/, '顶栏文件夹必须使用官方 IconFolderClose16 路径')
assert.doesNotMatch(header, /decorateUserBubbles|ensureUserBubbleStyle/, '会话观察不得再把用户气泡改成 Codex 卡片')
assert.match(header, /restoreOfficialUserBubbles/, '会话观察启动时必须撤回旧版用户卡片')

/** 复刻宿主 ConversationSessionHeader 的 DOM 结构（类名后缀与 CSS modules 一致）。 */
const HOST_HEADER_HTML = `
<header>
  <div class="wSkVaW_titleRow">
    <div class="wSkVaW_titleCluster">
      <nav class="wSkVaW_crumbs" aria-label="会话层级">
        <span class="wSkVaW_crumbSeg"><button type="button" class="wSkVaW_crumb wSkVaW_crumbCurrent" disabled>会话标题</button></span>
      </nav>
      <div class="wSkVaW_headerActions"></div>
    </div>
    <div class="wSkVaW_headerUtilities"><button type="button" class="nL4_yW_sessionLogButton"><span>Session log</span><svg aria-hidden="true"></svg></button></div>
  </div>
  <div class="wSkVaW_tabs" role="tablist"><button type="button" role="tab" aria-selected="true">对话</button><button type="button" role="tab">轨迹</button><button type="button" role="tab">上下文</button></div>
</header>`

// 全文件共用一个 JSDOM（每个实例的元素类属于不同 realm），并让源码里的 instanceof 与 CustomEvent 对齐
const dom = new JSDOM('<body></body>')
const globals = globalThis as { HTMLElement?: unknown; CustomEvent?: unknown }
globals.HTMLElement = dom.window.HTMLElement
globals.CustomEvent = dom.window.CustomEvent
const doc = dom.window.document
const mount = (): HTMLElement => {
  doc.body.innerHTML = HOST_HEADER_HTML
  return doc.body.firstElementChild as HTMLElement
}

// 行为验证：Session log 仅改成图标外观，原文本仍留在 DOM 并补齐无障碍名称与提示。
{
  mount()
  const button = doc.querySelector('.nL4_yW_sessionLogButton') as HTMLButtonElement
  assert.equal(decorateSessionLogDownload(doc), true, 'Session log 按钮必须被标记')
  assert.equal(button.dataset.dcuSessionLogDownload, '', '下载按钮必须带稳定样式标记')
  assert.equal(button.getAttribute('aria-label'), 'Session log', '图标按钮必须有无障碍名称')
  assert.equal(button.getAttribute('title'), 'Session log', '图标按钮必须保留悬停提示')
  assert.equal(button.querySelector('span')?.textContent, 'Session log', '不得删除宿主文本节点')
  assert.equal(decorateSessionLogDownload(doc), false, '重复标记必须幂等')
}

// 行为验证：页签只打标记，不离开宿主父节点
{
  mount()
  const tabs = doc.querySelector('[role=tablist]') as HTMLElement
  const host = tabs.parentElement
  assert.equal(placeConversationTabs(doc), true, '页签必须被打上内联标记')
  assert.equal(tabs.dataset.dcuInlineTabs, '', '标记必须落在 dataset 上')
  assert.equal(tabs.parentElement, host, '页签必须留在宿主 header 内，不得搬移')
  assert.equal(placeConversationTabs(doc), false, '重复执行必须幂等')
}

// 回归验证：监听器以 tablist 自身为同步根节点时，滑块也必须跟随 aria-selected 切换。
{
  mount()
  const tabs = doc.querySelector('[role=tablist]') as HTMLElement
  const [chat, trace] = [...tabs.querySelectorAll<HTMLElement>('[role=tab]')]
  const rect = (left: number, width: number): DOMRect => ({
    x: left,
    y: 0,
    left,
    top: 0,
    right: left + width,
    bottom: 26,
    width,
    height: 26,
    toJSON: () => ({}),
  })
  tabs.getBoundingClientRect = () => rect(100, 150)
  chat!.getBoundingClientRect = () => rect(100, 50)
  trace!.getBoundingClientRect = () => rect(150, 50)

  syncTabSlider(tabs)
  const slider = tabs.querySelector<HTMLElement>('[data-dcu-tab-slider]')
  assert.equal(slider?.style.transform, 'translateX(0px)', '初始滑块必须位于对话页签')

  chat!.setAttribute('aria-selected', 'false')
  trace!.setAttribute('aria-selected', 'true')
  syncTabSlider(tabs)
  assert.equal(slider?.style.transform, 'translateX(50px)', '选中轨迹后滑块必须移动到第二段')
}

// 行为验证：标题装饰以兄弟节点插入，不搬移标题，且事件可派发
{
  mount()
  const title = doc.querySelector('.wSkVaW_crumbCurrent') as HTMLElement
  const crumbSeg = title.parentElement
  assert.equal(decorateConversationTitle(doc), true, '标题必须被装饰')
  assert.equal(title.parentElement, crumbSeg, '标题必须留在宿主面包屑内，不得搬移')
  assert.ok(title.previousElementSibling?.hasAttribute('data-dcu-title-folder'), '文件夹按钮必须插在标题前')
  assert.ok(title.nextElementSibling?.hasAttribute('data-dcu-title-more'), '三点按钮必须插在标题后')
  assert.equal(decorateConversationTitle(doc), false, '重复装饰必须幂等')

  const events: string[] = []
  dom.window.addEventListener(HEADER_PROJECT_TIP_EVENT, () => events.push('project'))
  dom.window.addEventListener(HEADER_SESSION_MENU_EVENT, () => events.push('menu'))
  title.previousElementSibling?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  title.nextElementSibling?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  assert.deepEqual(events, ['project', 'menu'], '文件夹与三点按钮必须派发对应事件')
}

// 行为验证：宿主重建标题节点后，旧按钮不得残留成重复图标
{
  mount()
  const oldTitle = doc.querySelector('.wSkVaW_crumbCurrent') as HTMLElement
  assert.equal(decorateConversationTitle(doc), true)
  oldTitle.remove()
  const seg = doc.createElement('span')
  seg.className = 'wSkVaW_crumbSeg'
  const fresh = doc.createElement('button')
  fresh.className = 'wSkVaW_crumbCurrent'
  fresh.textContent = '新会话'
  seg.append(fresh)
  doc.querySelector('.wSkVaW_crumbs')?.append(seg)
  assert.equal(decorateConversationTitle(doc), true, '新标题必须被重新装饰')
  assert.equal(doc.querySelectorAll('[data-dcu-title-folder]').length, 1, '旧文件夹按钮必须被清理')
  assert.equal(doc.querySelectorAll('[data-dcu-title-more]').length, 1, '旧三点按钮必须被清理')
  assert.ok(fresh.previousElementSibling?.hasAttribute('data-dcu-title-folder'), '新标题前必须有文件夹按钮')
}
