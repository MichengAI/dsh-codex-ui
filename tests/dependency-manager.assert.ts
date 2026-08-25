import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
import { applyReleaseExclude, directPackagesForInstall, isManagedPackageDeclared, isManagedPackageInstalled, isOfficialRuntimePackage, isRestartableInstallError, monitorPluginChild, newerVersion, pluginCommandError, pluginExecArgv, requestDesktopHotUpdate, pluginsToRemoveBeforeInstall, resolveDshPluginTarget, resolveDshCliEntry, resolveDshRuntimeRoot, updatableDependencyIds } from '../src/dependency-manager.ts'
import { crossSiteRequest, publicDependencyError } from '../src/index.ts'

assert.equal(
  resolveDshCliEntry('apps/cli/src/bin.ts', 'D:\\Repository\\deepseek-harness'),
  'D:\\Repository\\deepseek-harness\\apps\\cli\\src\\bin.ts',
  '源码启动的相对 CLI 入口必须按当前工作目录收成绝对路径',
)
assert.equal(
  resolveDshCliEntry('D:\\Tools\\nodejs\\node_modules\\dsh\\bin.js', 'C:\\Users\\demo'),
  'D:\\Tools\\nodejs\\node_modules\\dsh\\bin.js',
  '已经是绝对路径的已安装 CLI 不得再拼接他人目录',
)
assert.equal(
  resolveDshCliEntry('file:///D:/Repository/deepseek-harness/apps/cli/src/bin.ts', 'C:\\elsewhere'),
  'D:\\Repository\\deepseek-harness\\apps\\cli\\src\\bin.ts',
  'file URL 入口必须转成当前机器的文件系统路径',
)
assert.equal(
  resolveDshRuntimeRoot('C:\\Users\\demo\\AppData\\Roaming\\npm\\node_modules\\@deepseek-ai\\dsh\\dist\\bin.mjs'),
  'C:\\Users\\demo\\AppData\\Roaming\\npm',
  '全局 npm 安装的 DSH 必须能从当前 CLI 入口识别包含 node_modules 的运行时目录',
)
assert.equal(
  resolveDshRuntimeRoot('D:\\Repository\\deepseek-harness\\apps\\cli\\src\\bin.ts'),
  undefined,
  '源码启动不应误判为全局 DSH 运行时',
)

const source = [
  'packages:',
  '  - .',
  '',
  'minimumReleaseAgeExclude:',
  "  - '@michengai/dsh-skills-manager@0.1.8'",
  "  - '@michengai/dsh-archive-manager@0.1.2'",
  '',
].join('\n')

assert.match(
  applyReleaseExclude(source, '@michengai/dsh-skills-manager', '0.1.9'),
  /@michengai\/dsh-skills-manager@0\.1\.8 \|\| 0\.1\.9/,
  '同一包的新确认版本必须合并进已有白名单行',
)
assert.equal(
  applyReleaseExclude(source, '@michengai/dsh-skills-manager', '0.1.8'),
  source,
  '重复确认同一版本时不得改写白名单',
)
assert.match(
  applyReleaseExclude('packages:\n  - .\n', '@michengai/dsh-archive-manager', '0.1.3'),
  /minimumReleaseAgeExclude:\n  - '@michengai\/dsh-archive-manager@0\.1\.3'\n/,
  '没有白名单段时必须新建精确版本例外',
)
assert.throws(
  () => applyReleaseExclude(source, '@michengai/dsh-skills-manager', "0.1.9'evil"),
  /无法识别/,
  '带单引号的版本不得写入 YAML 白名单',
)
assert.match(
  applyReleaseExclude(source, '@michengai/dsh-codex-ui', '0.2.53-rc.1'),
  /@michengai\/dsh-codex-ui@0\.2\.53-rc\.1/,
  '预发布版本仍可写入白名单',
)

// 依赖安装 POST 端点的跨站请求判定：浏览器恶意网页可用表单跨站触发安装，
// 必须按 Sec-Fetch-Site / Origin 与 Host 的比对阻断。
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x?dependency=ui' }),
  false,
  '无 headers 的非浏览器请求必须放行',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'same-origin' } }),
  false,
  '同源 fetch 必须放行',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'none' } }),
  false,
  '地址栏直达等非页面发起的请求必须放行',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'cross-site' } }),
  true,
  '跨站请求必须拦截',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'same-site' } }),
  true,
  '同站不同源端口也必须拦截',
)
assert.equal(
  crossSiteRequest({
    method: 'POST',
    url: '/api/x?dependency=ui',
    headers: { origin: 'http://localhost:3080', host: 'localhost:3080' },
  }),
  false,
  '老浏览器同源 POST（Origin 与 Host 一致）必须放行',
)
assert.equal(
  crossSiteRequest({
    method: 'POST',
    url: '/api/x?dependency=ui',
    headers: { origin: 'https://evil.example', host: 'localhost:3080' },
  }),
  true,
  'Origin 与 Host 不一致的请求必须拦截',
)
assert.equal(
  crossSiteRequest({
    method: 'POST',
    url: '/api/x?dependency=ui',
    headers: { origin: 'null', host: 'localhost:3080' },
  }),
  true,
  'Origin 为 null 的沙盒页面请求必须拦截',
)

assert.equal(
  publicDependencyError(new Error('从 npm 安装或更新依赖失败。请检查网络、npm registry 或发布时间保护后重试。')),
  '从 npm 安装或更新依赖失败。请检查网络、npm registry 或发布时间保护后重试。',
  '安装失败的安全文案必须回给浏览器',
)
assert.equal(
  publicDependencyError(new Error("ENOENT: no such file or directory, open 'C:\\\\Users\\\\demo\\\\.dsh\\\\profiles\\\\web\\\\package.json'")),
  '依赖管理暂不可用，请查看服务端日志。',
  '带本地路径的底层错误不得回传浏览器',
)

assert.equal(
  isManagedPackageInstalled({ installedVersion: '0.2.56', declared: true }),
  true,
  '声明仍在且磁盘有版本，视为已安装',
)
assert.equal(
  isManagedPackageInstalled({ installedVersion: undefined, declared: true }),
  false,
  '声明在但磁盘没有包，视为未安装',
)
assert.equal(
  isManagedPackageInstalled({ installedVersion: '0.1.20', declared: false }),
  false,
  '卸载后残留的 node_modules 不得标已安装',
)

assert.deepEqual(
  pluginsToRemoveBeforeInstall(['@michengai/dsh-codex-suite'], '@michengai/dsh-codex-ui'),
  ['@michengai/dsh-codex-suite'],
  '单独更新子插件前必须卸掉套件，避免两套 patch',
)
assert.deepEqual(
  pluginsToRemoveBeforeInstall(['@michengai/dsh-codex-ui'], '@michengai/dsh-codex-ui'),
  [],
  '只装子插件时无需先卸载',
)
assert.deepEqual(
  resolveDshPluginTarget('@michengai/dsh-codex-ui', ['@michengai/dsh-codex-suite']),
  '@michengai/dsh-codex-ui',
  '已装套件时仍更新用户点的那个子插件',
)
assert.deepEqual(
  resolveDshPluginTarget('dshmarket', ['@michengai/dsh-codex-suite']),
  'dshmarket',
  '插件市场不在套件内，仍单独安装',
)
assert.deepEqual(
  resolveDshPluginTarget('dsh-find-plugin', ['@michengai/dsh-codex-suite']),
  'dsh-find-plugin',
  '插件发现不在套件内，仍单独安装',
)
assert.equal(
  isManagedPackageDeclared('@michengai/dsh-skills-manager', ['@michengai/dsh-codex-suite']),
  true,
  '旧 Suite 声明存在时，其成员必须显示真实安装状态以便迁移',
)
assert.equal(
  isManagedPackageDeclared('@michengai/dsh-skills-manager', []),
  false,
  '无直接声明也无 Suite 所有权时不得把残留包算作已声明',
)
assert.deepEqual(
  directPackagesForInstall(['@michengai/dsh-codex-ui'], ['@michengai/dsh-codex-suite']),
  [
    '@michengai/dsh-archive-manager',
    '@michengai/dsh-codex-ui',
    '@michengai/dsh-skills-manager',
    '@michengai/dsh-agency-agents',
    '@michengai/dsh-im-connect',
    '@michengai/dsh-automation',
  ],
  '更新旧 Suite 中任一成员时必须把整套成员提升为直接依赖',
)
assert.deepEqual(
  directPackagesForInstall(['@michengai/dsh-codex-ui'], []),
  ['@michengai/dsh-codex-ui'],
  '普通独立安装不得隐式安装其他成员',
)
assert.deepEqual(
  updatableDependencyIds([
    { id: 'ui', packageName: '@michengai/dsh-codex-ui', installed: true, version: '0.2.79', latestVersion: '0.2.80', updateAvailable: true },
    { id: 'skills', packageName: '@michengai/dsh-skills-manager', installed: true, version: '0.1.24', latestVersion: '0.1.24', updateAvailable: false },
    { id: 'archive', packageName: '@michengai/dsh-archive-manager', installed: false, latestVersion: '0.1.14', updateAvailable: true },
  ]),
  ['ui'],
  '一键更新只应包含已安装且存在新版本的插件，不得顺带安装缺失插件',
)
assert.match(
  pluginCommandError('EPERM: unlink failed').message,
  /完全退出桌面端/,
  '文件占用必须提示先退出桌面端',
)
assert.match(
  pluginCommandError('ERR_PNPM_UNEXPECTED_STORE Unexpected store location').message,
  /pnpm 仓库不一致/,
  'store 不一致必须给出明确原因',
)
assert.equal(isRestartableInstallError(new Error('无法覆盖正在运行的插件文件。请先完全退出桌面端，再重新打开后更新。')), true)

assert.equal(requestDesktopHotUpdate(undefined), false)
let sent
assert.equal(requestDesktopHotUpdate((message) => { sent = message; return true }), true)
assert.equal(sent, 'apply-plugin-updates')


assert.equal(isOfficialRuntimePackage('@deepseek-ai/dsh'), true)
assert.equal(isOfficialRuntimePackage('@michengai/dsh-codex-ui'), false)
assert.equal(newerVersion('0.1.0-rc.7', '0.1.0-rc.8'), true, '同号 rc 必须能看出可升级')
assert.equal(newerVersion('0.1.0-rc.8', '0.1.0-rc.7'), false, '不得把更旧的 rc 当成升级')
assert.equal(newerVersion('0.1.0-beta.1', '0.1.0-beta.2'), true, '同号 beta 必须能看出可升级')
assert.equal(newerVersion('0.1.0-alpha.9', '0.1.0-beta.1'), true, '预发布标识必须按 SemVer 比较')
assert.equal(newerVersion('0.1.0-rc.1', '0.1.0'), true, '正式版必须高于同号预发布版')
assert.equal(newerVersion('0.1.0', '0.1.0-rc.1'), false, '不得把同号预发布版推荐给正式版用户')
assert.equal(newerVersion('0.1.0+build.1', '0.1.0+build.2'), false, '构建元数据不得影响版本先后')
assert.deepEqual(pluginExecArgv(['--inspect=9229', '--trace-warnings', '--inspect-brk']), ['--trace-warnings'], '安装子进程不得继承调试端口参数')

function fakeChild(): ChildProcess & { killedSignal?: NodeJS.Signals | number } {
  const child = new EventEmitter() as ChildProcess & { killedSignal?: NodeJS.Signals | number }
  Object.assign(child, {
    stdout: null,
    stderr: null,
    exitCode: null,
    killed: false,
    kill(signal: NodeJS.Signals | number = 'SIGTERM') {
      child.killedSignal = signal
      ;(child as unknown as { killed: boolean }).killed = true
      return true
    },
  })
  return child
}

{
  const child = fakeChild()
  const keepAlive = setTimeout(() => {}, 50)
  await assert.rejects(monitorPluginChild(child, 5), /安装超时/, '安装子进程超时必须拒绝并释放互斥流程')
  clearTimeout(keepAlive)
  assert.equal(child.killedSignal, 'SIGTERM', '超时必须终止子进程')
}
{
  const child = fakeChild()
  const result = monitorPluginChild(child, 1_000)
  child.emit('error', new Error('spawn failed'))
  child.emit('exit', 1, null)
  await assert.rejects(result, /无法启动 DSH/, 'error 与 exit 连续到达时 Promise 只能由首个错误结算')
}
