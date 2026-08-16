import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const aboutPath = new URL('../src/client/AboutSection.tsx', import.meta.url)
assert.equal(existsSync(aboutPath), true, '必须提供设置内的关于页面')

const client = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('../src/client/CodexSidebar.tsx', import.meta.url), 'utf8')
const host = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')
const dependencies = readFileSync(new URL('../src/dependencies.ts', import.meta.url), 'utf8')
const about = readFileSync(aboutPath, 'utf8')
const manager = readFileSync(new URL('../src/dependency-manager.ts', import.meta.url), 'utf8')

assert.match(client, /id: 'about'/, '关于页必须注册为最后的设置分区')
assert.match(client, /order: 100/, '关于页必须排在管理插件设置之后')
assert.match(dependencies, /@michengai\/dsh-agency-agents/, '关于页必须声明专家插件依赖')
assert.match(dependencies, /@michengai\/dsh-skills-manager/, '关于页必须声明技能插件依赖')
assert.match(dependencies, /@michengai\/dsh-archive-manager/, '关于页必须声明归档插件依赖')
assert.match(host, /dependenciesEndpoint/, 'Host 必须提供依赖状态接口')
assert.match(host, /installDependency/, 'Host 必须提供受限的依赖安装操作')
assert.match(manager, /process\.execPath/, '安装必须重新调用当前 DSH CLI，而不是直接启动 pnpm')
assert.match(manager, /\[\.\.\.invocation\.args, 'plugin', '--profile', 'web', 'add', packageName\]/, '安装必须通过 dsh plugin add 执行 npm 下载并同步 profile')
assert.doesNotMatch(manager, /runPnpm|pnpm\.cmd/, '不得直接启动 Windows 的 pnpm.cmd')
assert.match(about, /data-installed=false\]\{color:var\(--dsw-alias-state-error-primary\)/, '未安装状态必须使用红色')
assert.match(about, /data-installed=true\]\{color:var\(--dsw-alias-state-success-primary\)/, '已安装状态必须使用绿色')
assert.match(about, /about\.feature\.search/, '关于页必须列出全局搜索能力')
assert.match(about, /about\.feature\.navigator/, '关于页必须列出会话轮次导航能力')
assert.match(sidebar, /selectSection\(t\('about\.nav'\)\)/, '缺失依赖的侧栏入口必须跳转关于页面')
