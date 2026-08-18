import assert from 'node:assert/strict'
import { PERMISSION_I18N_STYLE, permissionCopy, permissionIdFromLabel, replaceFullAccessLabel } from '../src/client/permission-i18n.ts'

assert.equal(permissionIdFromLabel('Read Only'), 'read-only')
assert.equal(permissionIdFromLabel('Workspace Write'), 'workspace-write')
assert.equal(permissionIdFromLabel('Full access'), 'danger-full-access')
assert.equal(permissionIdFromLabel('Custom'), 'custom')
assert.equal(permissionIdFromLabel('帮我批准'), 'workspace-write')
assert.equal(permissionIdFromLabel('完全访问 Workspace Write'), 'workspace-write')
assert.equal(permissionIdFromLabel('其他'), undefined)

const dict: Record<string, string> = {
  'permission.read-only.title': '请求批准',
  'permission.read-only.description': '始终询问',
  'permission.read-only.trigger': '请求批准',
  'permission.workspace-write.title': '帮我批准',
  'permission.workspace-write.description': '风险才问',
  'permission.workspace-write.trigger': '帮我批准',
  'permission.danger-full-access.title': '完全访问权限',
  'permission.danger-full-access.description': '不受限制',
  'permission.danger-full-access.trigger': '完全访问',
}
const t = (key: string): string => dict[key] ?? key
assert.deepEqual(permissionCopy('workspace-write', t), {
  title: '帮我批准',
  description: '风险才问',
  trigger: '帮我批准',
})

assert.equal(replaceFullAccessLabel('确认启用 Full access？', '完全访问'), '确认启用 完全访问？')
assert.equal(replaceFullAccessLabel('启用 Full access', '完全访问'), '启用 完全访问')
assert.equal(replaceFullAccessLabel('启用 Full access 后，agent 将减少确认步骤', '完全访问'), '启用 完全访问 后，agent 将减少确认步骤')

assert.match(PERMISSION_I18N_STYLE, /danger-full-access/, '完全访问必须使用警示色')
assert.match(PERMISSION_I18N_STYLE, /#e3942a/, '完全访问警示色必须接近 Codex 橙色')
