import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const aboutPath = new URL('../src/client/AboutSection.tsx', import.meta.url)
assert.equal(existsSync(aboutPath), true, '必须提供设置内的关于页面')

const client = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('../src/client/CodexSidebar.tsx', import.meta.url), 'utf8')
const host = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')
const dependencies = readFileSync(new URL('../src/dependencies.ts', import.meta.url), 'utf8')

assert.match(client, /id: 'about'/, '关于页必须注册为最后的设置分区')
assert.match(client, /order: 100/, '关于页必须排在管理插件设置之后')
assert.match(dependencies, /@michengai\/dsh-agency-agents/, '关于页必须声明专家插件依赖')
assert.match(dependencies, /@michengai\/dsh-skills-manager/, '关于页必须声明技能插件依赖')
assert.match(dependencies, /@michengai\/dsh-archive-manager/, '关于页必须声明归档插件依赖')
assert.match(host, /dependenciesEndpoint/, 'Host 必须提供依赖状态接口')
assert.match(host, /installDependency/, 'Host 必须提供受限的依赖安装操作')
assert.match(readFileSync(new URL('../src/dependency-manager.ts', import.meta.url), 'utf8'), /bundles/, '安装后必须将依赖加入 DSH profile 加载列表')
assert.match(sidebar, /selectSection\(t\('about\.nav'\)\)/, '缺失依赖的侧栏入口必须跳转关于页面')
