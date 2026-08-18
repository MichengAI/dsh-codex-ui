import assert from 'node:assert/strict'
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
