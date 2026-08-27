import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  dsh?: { client?: { inject?: string[] } }
}
const bundle = readFileSync(new URL('../dist/client.js', import.meta.url), 'utf8')
const runtimeRequires = [...new Set([...bundle.matchAll(/\brequire\("([^"]+)"\)/g)].map(match => match[1]))].sort()
const staticWebModules = [
  '@deepseek-ai/dsh-client-ui-primitives',
  'react',
  'react/jsx-runtime',
].sort()

assert.deepEqual(runtimeRequires, staticWebModules, '客户端 bundle 只能要求 DSH Web 启动器稳定提供的静态模块')
assert.equal(manifest.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-ui-primitives'), false, '静态模块不应误写成信息性的 dsh.client.inject 边')
assert.equal(manifest.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-ui-slots'), false, '仅类型导入不得产生运行时模块声明')
