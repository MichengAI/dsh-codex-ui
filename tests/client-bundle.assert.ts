import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

assert.match(bundle, /require\(["']react["']\)/, '客户端 bundle 必须复用宿主 React 实例')
assert.doesNotMatch(bundle, /renderSlot\(["']sidebar\.workspaces["']\)/, '客户端不得再覆盖官方原生工作区插槽')
assert.match(bundle, /codex-ui/, '客户端 bundle 必须包含 codex-ui 设置分区')
