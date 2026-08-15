import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sidebar = readFileSync(new URL('../src/client/CodexSidebar.tsx', import.meta.url), 'utf8')
const client = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
const pinnedWorkspaces = readFileSync(new URL('../src/client/PinnedWorkspaces.tsx', import.meta.url), 'utf8')
const visualSources = [
  sidebar,
  pinnedWorkspaces,
  readFileSync(new URL('../src/client/SettingsSkillsSection.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../src/client/ConnectorsSection.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../src/client/ArchivedSessionsSection.tsx', import.meta.url), 'utf8'),
].join('\n')

assert.match(client, /'settings\.section'/, '技能页必须注册为设置分区')
assert.match(client, /'connectors'/, '连接器必须注册为设置分区')
assert.match(sidebar, /sidebar\.newTask/, '侧栏必须显示新建任务')
assert.match(sidebar, /sidebar\.extensions/, '侧栏必须显示扩展管理分组')
assert.match(sidebar, /sidebar\.expertKit/, '扩展管理首项必须预留专家套件')
assert.match(sidebar, /sidebar\.schedule/, '侧栏必须显示定时任务占位入口')
assert.match(sidebar, /sidebar\.assistant/, '侧栏必须显示个人助理入口')
assert.match(sidebar, /selectSection\(t\('sidebar\.skills'\)\)/, '技能菜单必须直达设置内的技能页')
assert.match(sidebar, /selectSection\(t\('sidebar\.plugins'\)\)/, '插件菜单必须直达设置内的插件页')
assert.match(sidebar, /selectSection\(t\('sidebar\.connectors'\)\)/, '连接器菜单必须直达设置内的连接器页')
assert.doesNotMatch(sidebar, />归档会话<\/button>/, '底部不得保留独立归档会话按钮')
assert.match(sidebar, /openSettingsSection/, '设置跳转必须经过集中兼容层')
assert.match(client, /'sidebar\.workspaces'/, '侧栏必须声明 DSH 原生工作区插槽')
assert.match(client, /'sidebar\.footer\.action'/, '侧栏必须声明 DSH footer action 插槽')
assert.match(sidebar, /renderSlot\('sidebar\.workspaces'/, '会话区域必须复用 DSH 原生会话功能')
assert.match(pinnedWorkspaces, /pinned\.title/, '侧栏必须保留置顶项目快捷区')
assert.match(pinnedWorkspaces, /pinned\.manage/, '置顶项目必须提供管理入口')
assert.match(pinnedWorkspaces, /document\.addEventListener\('pointerdown'/, '点击置顶管理窗口外部必须自动关闭')
assert.doesNotMatch(sidebar, /WorkspaceSections/, '插件不得重新实现原生会话列表')
assert.doesNotMatch(visualSources, /--dsw-alias-text-l[123]/, '不得使用宿主未提供的文字色令牌')
assert.match(visualSources, /--dsw-alias-label-primary/, '界面主文字必须使用宿主已提供的语义令牌')
assert.match(sidebar, /font:14px\//, '桌面侧栏基础字号必须达到 14px')
assert.match(sidebar, /place-items:center start/, '导航图标必须左对齐到设置图标列')
assert.match(sidebar, /padding:0 6px/, '导航图标必须左移至设置图标列')
assert.doesNotMatch(client, /as never|as unknown as/, '客户端插槽注册不得绕过官方类型')
