// @vitest-environment jsdom
import { expect, test } from 'vitest'
import { fitFlyoutIntoColumn, isColumnVisible } from '../src/client/sidebar/flyout-fit.ts'

/** 抽屉列：x 0..280，整屏高度 */
const column = { left: 0, top: 12, right: 280, bottom: 812 }

test('常驻展开的侧栏（无列矩形）时不做任何夹取', () => {
  const panel = { left: 300, top: 40, width: 160, height: 200 }
  expect(fitFlyoutIntoColumn(panel, null)).toEqual({ left: 300, top: 40, width: 160, shrunk: false })
})

test('抽屉收起（列在屏幕外）时也不能夹取，否则会把面板推出屏幕', () => {
  const hidden = { left: -268, top: 12, right: 12, bottom: 812 }
  expect(isColumnVisible(hidden)).toBe(false)
  const panel = { left: 158, top: 46, width: 152, height: 110 }
  expect(fitFlyoutIntoColumn(panel, hidden)).toEqual({ left: 158, top: 46, width: 152, shrunk: false })
})

test('面板伸出抽屉列右边界时压缩宽度，保证指针不越出列（宿主 2s linger 会因此收起抽屉）', () => {
  // 父菜单右边缘 160 → 面板 left=162，列右边界 280-6=274，可用 112
  const fitted = fitFlyoutIntoColumn({ left: 162, top: 46, width: 152, height: 110 }, column)
  expect(fitted.shrunk).toBe(true)
  expect(fitted.left).toBe(162)
  expect(fitted.width).toBe(112)
  expect(fitted.left + fitted.width).toBeLessThanOrEqual(274)
})

test('并排放不下（可用宽度过窄）时右对齐进列内，哪怕压住父菜单一部分', () => {
  // 父菜单右边缘 250 → 可用只有 24px，压不动就直接右对齐
  const fitted = fitFlyoutIntoColumn({ left: 252, top: 46, width: 152, height: 110 }, column)
  expect(fitted.shrunk).toBe(false)
  expect(fitted.left).toBe(274 - 152)
  expect(fitted.left).toBeGreaterThanOrEqual(6)
})

test('竖直方向也夹进列内：面板底部越出列底时上移', () => {
  const fitted = fitFlyoutIntoColumn({ left: 162, top: 700, width: 152, height: 110 }, column)
  expect(fitted.top + 110).toBeLessThanOrEqual(812 - 6)
  expect(fitted.top).toBeGreaterThanOrEqual(12 + 6)
})

test('完全放得下时一个字节都不改', () => {
  const panel = { left: 40, top: 60, width: 120, height: 200 }
  expect(fitFlyoutIntoColumn(panel, column)).toEqual({ left: 40, top: 60, width: 120, shrunk: false })
})
