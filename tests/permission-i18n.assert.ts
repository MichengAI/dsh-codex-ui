import assert from 'node:assert/strict'
import { isFullAccessPermission, PERMISSION_RISK_STYLE } from '../src/client/permission-i18n.ts'

assert.equal(isFullAccessPermission('Full access'), true)
assert.equal(isFullAccessPermission('完全访问权限'), true)
assert.equal(isFullAccessPermission('完全访问'), true)
assert.equal(isFullAccessPermission('帮我批准'), false)
assert.equal(isFullAccessPermission('请求批准'), false)
assert.equal(isFullAccessPermission('自定义'), false)

assert.match(PERMISSION_RISK_STYLE, /danger-full-access/, '完全访问必须使用警示色')
assert.match(PERMISSION_RISK_STYLE, /#e3942a/, '完全访问警示色必须接近 Codex 橙色')
assert.doesNotMatch(PERMISSION_RISK_STYLE, /min-height|padding|font-size/, '不得再修改官方权限菜单布局')
