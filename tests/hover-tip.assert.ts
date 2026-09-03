import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { HOVER_TIP_SHOW_DELAY_MS, WORKSPACE_HOVER_CARD_WIDTH } from '../src/client/hover-shell.tsx'
import { clampHoverCardPosition, formatHoverTime, hoverCardAnchor } from '../src/client/hover-tip.ts'
import { sidebarWidthDuringDrag, shouldCollapseOnSidebarDrag } from '../src/client/sidebar-drag.ts'
import { applySidebarWidth, applySlimSidebar, parseSidebarGrid } from '../src/client/sidebar-width.ts'

assert.deepEqual(hoverCardAnchor({ right: 260, top: 120 }), { left: 268, top: 120 })
assert.deepEqual(clampHoverCardPosition(10, 10, 240, 120, 800, 600), { left: 10, top: 10 })
assert.deepEqual(clampHoverCardPosition(700, 560, 240, 120, 800, 600), { left: 552, top: 472 })

const now = 1_700_000_000_000
const hoverTime = (locale: 'zh' | 'en') => (key: string, params?: Record<string, unknown>): string => {
  const count = String(params?.count ?? '')
  const dictionary = locale === 'zh'
    ? { 'time.justNow': '刚刚', 'time.minutes': `${count}分`, 'time.hours': `${count}小时`, 'time.days': `${count}天` }
    : { 'time.justNow': 'Just now', 'time.minutes': `${count}m`, 'time.hours': `${count}h`, 'time.days': `${count}d` }
  return dictionary[key as keyof typeof dictionary]
}
assert.equal(formatHoverTime(now - 10_000, hoverTime('zh'), now), '刚刚')
assert.equal(formatHoverTime(now - 7 * 60_000, hoverTime('zh'), now), '7分')
assert.equal(formatHoverTime(now - 2 * 3600_000, hoverTime('zh'), now), '2小时')
assert.equal(formatHoverTime(now - 3 * 86400_000, hoverTime('zh'), now), '3天')
assert.equal(formatHoverTime(now - 10_000, hoverTime('en'), now), 'Just now')
assert.equal(formatHoverTime(now - 7 * 60_000, hoverTime('en'), now), '7m')
assert.equal(formatHoverTime(now - 2 * 3600_000, hoverTime('en'), now), '2h')
assert.equal(formatHoverTime(now - 3 * 86400_000, hoverTime('en'), now), '3d')

assert.equal(shouldCollapseOnSidebarDrag(240, 300, 179), true)
assert.equal(shouldCollapseOnSidebarDrag(240, 300, 180), false)
assert.equal(shouldCollapseOnSidebarDrag(520, 520, 259), true)
assert.equal(shouldCollapseOnSidebarDrag(240, 240, 120), false)
assert.equal(sidebarWidthDuringDrag(240, 300, 301), 241, '从默认宽度向右轻拖必须连续增长，不能回弹到宿主下限')
assert.equal(sidebarWidthDuringDrag(240, 300, 299), 240, '从默认宽度向左轻拖必须保持唯一最小宽度')
assert.equal(sidebarWidthDuringDrag(300, 300, 250), 250, '自定义宽度左拖时必须按实际位移连续缩小')

assert.deepEqual(parseSidebarGrid('280px minmax(0, 1fr) 0px')?.sidebar, 280)
assert.deepEqual(parseSidebarGrid('240px minmax(0px, 1fr) 0px')?.sidebar, 240)

const sidebarDom = new JSDOM('<div id="frame" style="grid-template-columns: 360px minmax(0px, 1fr) 0px"><div data-side="sidebar"></div></div>')
const sidebarFrame = sidebarDom.window.document.getElementById('frame') as HTMLElement
const sidebarHandle = sidebarFrame.querySelector<HTMLElement>('[data-side="sidebar"]')
assert.equal(applySlimSidebar(sidebarFrame), true)
assert.equal(sidebarFrame.style.gridTemplateColumns, '240px minmax(0px, 1fr) 0px')
assert.equal(sidebarFrame.hasAttribute('data-dcu-codex-sidebar-initialized'), true)
assert.equal(sidebarHandle?.style.left, '240px')
assert.equal(applySidebarWidth(sidebarFrame, 241), true)
assert.equal(sidebarFrame.style.gridTemplateColumns, '241px minmax(0px, 1fr) 0px')
sidebarFrame.style.gridTemplateColumns = '320px minmax(0px, 1fr) 0px'
assert.equal(applySlimSidebar(sidebarFrame), true)
assert.equal(sidebarFrame.style.gridTemplateColumns, '241px minmax(0px, 1fr) 0px', '宿主重绘后必须恢复当前可见宽度')

const sidebarWidth = readFileSync(new URL('../src/client/sidebar-width.ts', import.meta.url), 'utf8')
assert.doesNotMatch(sidebarWidth, /slimedSidebarWidth|slimedGridTemplate|HOST_SIDEBAR_/, '固定侧边栏宽度不得保留旧的宽度映射逻辑')
assert.doesNotMatch(sidebarWidth, /localStorage|sessionStorage/, '固定侧边栏宽度不得写入浏览器存储')
assert.match(sidebarWidth, /pauseInitialSidebarTransition/, '首次覆盖宿主默认宽度时必须暂停宽度过渡')
assert.match(sidebarWidth, /window\.requestAnimationFrame\(\(\) => window\.requestAnimationFrame\(restoreTransition\)\)/, '首次宽度切换绘制完成后必须恢复正常拖拽过渡')

const hoverShell = readFileSync(new URL('../src/client/hover-shell.tsx', import.meta.url), 'utf8')
assert.match(hoverShell, /clearTimeout\(hideTipTimer\.current\)/, '悬停层卸载必须清掉延迟关闭定时器')
assert.match(hoverShell, /HoverValueContext/, '悬停值必须与树的 dispatch 分上下文，避免整树重绘')
assert.equal(HOVER_TIP_SHOW_DELAY_MS, 1000, '划过行必须停满 1 秒才出卡片，避免闪现')
assert.equal(WORKSPACE_HOVER_CARD_WIDTH, 316, '项目悬浮卡片宽度必须与 Codex 一致')
assert.match(hoverShell, /showTipTimer/, '首次悬停必须用独立定时器，离开时取消')
assert.match(hoverShell, /immediate/, '点击文件夹必须能立刻出卡片')

const hoverCard = readFileSync(new URL('../src/client/workspace-hover-card.tsx', import.meta.url), 'utf8')
assert.doesNotMatch(hoverCard, /title=\{hoverTip\.path\}/, '悬停卡片路径不得再套原生 title，避免叠出浏览器 tips')
assert.match(hoverCard, /dcu-wb-tip-workspace/, '项目悬浮卡片必须使用独立的 Codex 尺寸样式')
assert.match(hoverCard, /dcu-wb-tip-pin/, '项目悬浮卡片右上角必须提供置顶操作')
assert.match(hoverCard, /MessageCircle/, '项目任务摘要必须使用 Codex 对话图标')
assert.match(hoverCard, /IconSettingsOutline16/, '重命名项目必须使用 Codex 设置图标')
assert.doesNotMatch(hoverCard, /<svg/, '项目悬浮卡片不得保留手绘图标')

const workspaceBrowser = readFileSync(new URL('../src/client/CodexWorkspaceBrowser.tsx', import.meta.url), 'utf8')
assert.match(workspaceBrowser, /\.dcu-wb-tip-workspace\{width:316px;/, '项目悬浮卡片必须使用 Codex 的固定宽度')
assert.match(workspaceBrowser, /\.dcu-wb-tip-path-copy\{[^}]*overflow-wrap:anywhere;[^}]*white-space:normal/, '项目路径必须完整换行，不能截断成省略号')
