import { expect, test } from 'vitest'
import { isInstallProgress } from '../src/client/AboutSection.tsx'

const completeProgress = {
  active: true,
  target: 'dshmarket@1.38.1',
  seconds: 2,
  lastLine: 'Progress: resolved 12, added 3',
  phase: 'linking',
  done: 2,
  total: 3,
  percent: 67,
  currentPackage: 'dshmarket',
}

test('安装进度守卫接受完整快照', () => {
  expect(isInstallProgress(completeProgress)).toBe(true)
})

test('安装进度守卫拒绝缺失或未知阶段', () => {
  expect(isInstallProgress({ ...completeProgress, phase: undefined })).toBe(false)
  expect(isInstallProgress({ ...completeProgress, phase: 'unknown' })).toBe(false)
})

test('安装进度守卫拒绝与运行时类型不一致的字段', () => {
  expect(isInstallProgress({ ...completeProgress, done: '2' })).toBe(false)
  expect(isInstallProgress({ ...completeProgress, percent: '67' })).toBe(false)
  expect(isInstallProgress({ ...completeProgress, currentPackage: undefined })).toBe(false)
})
