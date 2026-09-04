import { afterEach, expect, test, vi } from 'vitest'
import { observePermissionLabels } from '../src/client/permission-labels.ts'

afterEach(() => {
  document.documentElement.lang = ''
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

test('语言服务不可用且 lang 为空时使用浏览器中文语言', () => {
  document.documentElement.lang = ''
  document.body.innerHTML = '<button><span>Read Only</span></button>'
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh-CN')

  const stop = observePermissionLabels({})
  expect(document.querySelector('button')?.textContent).toBe('只读')
  stop()
})
