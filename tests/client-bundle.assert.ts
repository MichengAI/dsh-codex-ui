import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const bundle = readFileSync(new URL('../dist/client.js', import.meta.url), 'utf8')

assert.match(bundle, /require\(["']react["']\)/, '客户端 bundle 必须复用宿主 React 实例')
assert.match(bundle, /renderSlot\("sidebar\.workspaces"/, '会话区域必须渲染工作区插槽')
assert.match(bundle, /workspace\.pinnedEmpty/, '客户端 bundle 必须包含自定义工作区树')
