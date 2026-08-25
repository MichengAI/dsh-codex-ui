import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { localizePermissionLabels } from '../src/client/permission-labels.ts'

const fixture = new JSDOM(`
  <main>
    <button><svg></svg><span>Read Only</span></button>
    <button><span>preset.workspaceWrite</span><svg></svg></button>
    <div role="menuitem"><span>Full access</span></div>
    <p>Read Only</p>
  </main>
`)

const document = fixture.window.document
assert.equal(localizePermissionLabels(document, 'zh-CN'), 3)
const interactive = [...document.querySelectorAll('button, [role="menuitem"]')]
assert.deepEqual(interactive.map(item => item.textContent?.trim()), ['只读', '工作区写入', '完全访问'])
assert.equal(document.querySelector('p')?.textContent, 'Read Only', '正文不得被权限控件兼容逻辑修改')
assert.equal(document.querySelectorAll('svg').length, 2, '替换文案时必须保留图标')

assert.equal(localizePermissionLabels(document, 'en'), 3, '切回英文时应恢复官方英文文案')
assert.deepEqual(interactive.map(item => item.textContent?.trim()), ['Read Only', 'Workspace Write', 'Full access'])

const custom = document.createElement('button')
custom.textContent = '安全审阅'
document.body.append(custom)
assert.equal(localizePermissionLabels(custom, 'zh'), 0, '自定义权限名称必须原样保留')
