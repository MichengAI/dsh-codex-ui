import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HOVER_TIP_SHOW_DELAY_MS } from '../src/client/hover-shell.tsx'
import { clampHoverCardPosition, formatHoverTime, hoverCardAnchor } from '../src/client/hover-tip.ts'
import { shouldCollapseOnSidebarDrag } from '../src/client/sidebar-drag.ts'
import { parseSidebarGrid, slimedSidebarWidth } from '../src/client/sidebar-width.ts'

assert.deepEqual(hoverCardAnchor({ right: 260, top: 120 }), { left: 268, top: 120 })
assert.deepEqual(clampHoverCardPosition(10, 10, 240, 120, 800, 600), { left: 10, top: 10 })
assert.deepEqual(clampHoverCardPosition(700, 560, 240, 120, 800, 600), { left: 552, top: 472 })

const now = 1_700_000_000_000
assert.equal(formatHoverTime(now - 10_000, now), '刚刚')
assert.equal(formatHoverTime(now - 7 * 60_000, now), '7分')
assert.equal(formatHoverTime(now - 2 * 3600_000, now), '2小时')
assert.equal(formatHoverTime(now - 3 * 86400_000, now), '3天')

assert.equal(shouldCollapseOnSidebarDrag(280, 170), true)
assert.equal(shouldCollapseOnSidebarDrag(400, 264), false)
assert.equal(shouldCollapseOnSidebarDrag(280, 264), false)
assert.equal(shouldCollapseOnSidebarDrag(280, 260), false)
assert.equal(shouldCollapseOnSidebarDrag(180, 200), false)

assert.equal(slimedSidebarWidth(56, true), 56)
assert.equal(slimedSidebarWidth(280, false), 240)
assert.equal(slimedSidebarWidth(264, false), 240)
assert.equal(slimedSidebarWidth(360, false), 320)
assert.deepEqual(parseSidebarGrid('280px minmax(0, 1fr) 0px')?.sidebar, 280)

const hoverShell = readFileSync(new URL('../src/client/hover-shell.tsx', import.meta.url), 'utf8')
assert.match(hoverShell, /clearTimeout\(hideTipTimer\.current\)/, '悬停层卸载必须清掉延迟关闭定时器')
assert.match(hoverShell, /HoverValueContext/, '悬停值必须与树的 dispatch 分上下文，避免整树重绘')
assert.equal(HOVER_TIP_SHOW_DELAY_MS, 1000, '划过行必须停满 1 秒才出卡片，避免闪现')
assert.match(hoverShell, /showTipTimer/, '首次悬停必须用独立定时器，离开时取消')
assert.match(hoverShell, /immediate/, '点击文件夹必须能立刻出卡片')

const hoverCard = readFileSync(new URL('../src/client/workspace-hover-card.tsx', import.meta.url), 'utf8')
assert.doesNotMatch(hoverCard, /title=\{hoverTip\.path\}/, '悬停卡片路径不得再套原生 title，避免叠出浏览器 tips')
