import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  main?: string
  types?: string
  exports?: Record<string, unknown>
  files?: string[]
  dsh?: { client?: { inject?: string[] } }
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const runtimeRequires = [...new Set([...bundle.matchAll(/\brequire\("([^"]+)"\)/g)].map(match => match[1]))].sort()
const staticWebModules = [
  '@deepseek-ai/dsh-client-ui-primitives',
  'react',
  'react/jsx-runtime',
].sort()

assert.deepEqual(runtimeRequires, staticWebModules, '客户端 bundle 只能要求 DSH Web 启动器稳定提供的静态模块')
assert.doesNotMatch(bundle, /createLucideIcon\("alarm-clock"/, '客户端 bundle 不得包含未使用的 Lucide 图标')
assert.equal(manifest.main, 'lib/index.mjs', '服务端入口必须从 lib 发布目录加载')
assert.equal(manifest.types, 'lib/index.d.mts', '类型声明必须从 lib 发布目录加载')
assert.deepEqual(manifest.exports?.['.'], {
  types: './lib/index.d.mts',
  default: './lib/index.mjs',
}, '包根导出必须从 lib 发布目录加载')
assert.deepEqual(manifest.exports?.['./client'], {
  default: './lib/client.js',
}, '客户端导出必须从 lib 发布目录加载')
assert.equal(manifest.files?.includes('lib'), true, '发布文件必须包含 lib 目录')
assert.equal(manifest.files?.includes('dist'), false, '发布文件不得继续包含旧 dist 目录')
assert.equal(manifest.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-ui-primitives'), false, '静态模块不应误写成信息性的 dsh.client.inject 边')
assert.equal(manifest.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-ui-slots'), false, '仅类型导入不得产生运行时模块声明')

const supportedDshRange = '>=0.1.0-rc.5 <0.2.0'
const latestSupportedDshVersion = '0.1.2-rc.1'
const versionedClientPackages = [
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-conversation',
  '@deepseek-ai/dsh-client-ui-layout',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-settings',
  '@deepseek-ai/dsh-client-ui-settings-general',
  '@deepseek-ai/dsh-client-ui-sidebar',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-workspace',
]

for (const packageName of versionedClientPackages) {
  assert.equal(manifest.peerDependencies?.[packageName], supportedDshRange, `${packageName} 必须使用统一的 DSH Peer 范围`)
  assert.equal(manifest.devDependencies?.[packageName], latestSupportedDshVersion, `${packageName} 必须使用最高支持版本编译验证`)
}
assert.equal(manifest.peerDependencies?.['@deepseek-ai/dsh-client-runtime'], supportedDshRange, '客户端运行时必须声明统一的 DSH 兼容范围')
assert.equal(manifest.devDependencies?.['@deepseek-ai/dsh-client-runtime'], '0.1.1-rc.2', '客户端运行时必须使用其已发布最高版本')
assert.equal(manifest.devDependencies?.['@deepseek-ai/dsh-client-test-runtime'], latestSupportedDshVersion, '客户端测试运行时必须对齐最高支持版本')
assert.equal(manifest.devDependencies?.['@deepseek-ai/dsh-client-ui-renderer'], latestSupportedDshVersion, '客户端测试渲染器必须对齐最高支持版本')
assert.equal(manifest.peerDependencies?.['@deepseek-ai/cordis'], '>=4.0.1 <5.0.0', 'Cordis 必须覆盖声明的 DSH 兼容范围')
assert.equal(manifest.devDependencies?.['@deepseek-ai/cordis'], '4.0.2', 'Cordis 编译版本必须对齐当前 DSH 开发依赖')
