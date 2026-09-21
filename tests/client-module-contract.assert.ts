import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  main?: string
  types?: string
  packageManager?: string
  engines?: { node?: string }
  exports?: Record<string, unknown>
  files?: string[]
  dsh?: { client?: { inject?: string[] } }
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, unknown>
  devDependencies?: Record<string, string>
}
const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const runtimeRequires = [...new Set([...bundle.matchAll(/\brequire\("([^"]+)"\)/g)].map(match => match[1]))].sort()
const staticWebModules = [
  '@deepseek-ai/dsh-client-ui-primitives',
  'react',
  // DSH Web 启动器静态表包含 react-dom；新建页 portal 复用同一宿主渲染器。
  'react-dom',
  'react/jsx-runtime',
].sort()

assert.deepEqual(runtimeRequires, staticWebModules, '客户端 bundle 只能要求 DSH Web 启动器稳定提供的静态模块')
assert.equal(manifest.packageManager, 'pnpm@11.22.0', '仓库固定使用统一 pnpm 版本')
assert.equal(manifest.engines?.node, '^22.19.0 || >=24.0.0', '仓库使用统一 Node LTS 基线')
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
assert.deepEqual(manifest.exports?.['./session-title'], {
  types: './lib/session-title-plugin.d.mts',
  default: './lib/session-title-plugin.mjs',
}, '会话标题提供方必须作为独立宿主入口发布')
assert.equal(manifest.files?.includes('lib'), true, '发布文件必须包含 lib 目录')
assert.equal(manifest.files?.includes('dist'), false, '发布文件不得继续包含旧 dist 目录')
assert.equal(manifest.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-ui-primitives'), false, '静态模块不应误写成信息性的 dsh.client.inject 边')
assert.equal(manifest.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-ui-slots'), false, '仅类型导入不得产生运行时模块声明')

const supportedDshRange = '>=0.1.0-rc.5 <0.2.0 || 0.1.5-rc.1 || 0.1.5-rc.2 || 0.1.6-alpha.1 || 0.1.6-alpha.2'
const hostDevDshVersion = '0.1.6-alpha.2'
const highestPublishedClientRuntime = '0.1.1-rc.2'
const versionedClientPackages = [
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-conversation',
  '@deepseek-ai/dsh-client-ui-input-trigger',
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
  assert.equal(manifest.devDependencies?.[packageName], hostDevDshVersion, `${packageName} 必须钉在当前宿主开发版本`)
}
assert.equal(manifest.peerDependencies?.['@deepseek-ai/dsh-client-runtime'], '>=0.1.0-rc.5 <0.2.0 || 0.1.1-rc.2', '客户端运行时必须覆盖自己钉住的 0.1.1-rc.2')
assert.equal(manifest.devDependencies?.['@deepseek-ai/dsh-client-runtime'], highestPublishedClientRuntime, '客户端运行时没有 0.1.6 包，必须使用其已发布最高版本')
for (const [packageName, version] of Object.entries(manifest.devDependencies ?? {})) {
  if (!packageName.startsWith('@deepseek-ai/dsh-')) continue
  if (packageName === '@deepseek-ai/dsh-client-runtime') continue
  assert.equal(version, hostDevDshVersion, `${packageName} 必须钉在当前宿主开发版本`)
}
assert.equal(manifest.peerDependencies?.['@deepseek-ai/cordis'], '>=4.0.2 <5.0.0', 'Cordis 必须覆盖宿主认证服务的兼容范围')
assert.equal(manifest.peerDependencies?.['@deepseek-ai/dsh-client-connection'], '>=0.1.2-rc.1 <0.2.0 || 0.1.5-rc.1 || 0.1.5-rc.2 || 0.1.6-alpha.1 || 0.1.6-alpha.2', '业务 REST 必须声明提供 requestRejection 的最低宿主版本')
assert.equal(manifest.devDependencies?.['@deepseek-ai/cordis'], '4.0.2', 'Cordis 编译版本必须对齐当前 DSH 开发依赖')
assert.equal(manifest.peerDependencies?.['@michengai/dsh-agency-agents'], undefined, '不得把专家插件写成 Codex UI 的 peer')
assert.equal(manifest.peerDependencies?.['@michengai/dsh-skills-manager'], undefined, '不得把技能插件写成 Codex UI 的 peer')
assert.equal(manifest.peerDependenciesMeta, undefined, '自研配套插件不再需要 optional peer 元数据')
