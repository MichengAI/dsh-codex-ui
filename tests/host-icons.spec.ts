import { expect, test } from 'vitest'
import { resolveHostIcon, type HostIcon } from '../src/client/host-icons.ts'

const modern = (() => null) as HostIcon
const legacy = (() => null) as HostIcon

test('宿主同时提供新旧图标时使用当前名称', () => {
  expect(resolveHostIcon({ IconSearchOutlineMedium: modern, IconSearchOutline16: legacy }, 'IconSearchOutlineMedium', 'IconSearchOutline16')).toBe(modern)
})

test('0.1.5 只有旧图标名时回退，避免侧栏渲染 undefined', () => {
  expect(resolveHostIcon({ IconSearchOutline16: legacy }, 'IconSearchOutlineMedium', 'IconSearchOutline16')).toBe(legacy)
})

test('新旧图标都不存在时明确失败', () => {
  expect(() => resolveHostIcon({}, 'IconSearchOutlineMedium', 'IconSearchOutline16')).toThrow(/IconSearchOutlineMedium/)
})
