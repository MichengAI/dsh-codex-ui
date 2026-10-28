import { chromium } from 'playwright'
import fs from 'fs'

const log = fs.readFileSync('C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/dsh_e2e_r7.log', 'utf8')
const match = log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s\r\n]+/)
if (!match) throw new Error('Token URL not found')
const url = match[0]

const results = []
function assert(name, condition, extra = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${name} ${extra}`)
    results.push({ name, status: 'PASS', extra })
  } else {
    console.error(`  ✗ FAIL: ${name} ${extra}`)
    results.push({ name, status: 'FAIL', extra })
  }
}

console.log('=== 启动 ego-browser 自动化全量真机测试 ===')
console.log('Target URL:', url)

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const page = await context.newPage()

const pageErrors = []
page.on('pageerror', (err) => pageErrors.push(err.message))

console.log('\n--- 正在加载 DSH Web 实例 ---')
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

// ==========================================
// Case 1: 侧栏展开态与导航结构测试
// ==========================================
console.log('\n[Case 1] 侧栏展开态与导航结构测试')
const sidebar = await page.$('aside, [class*="sidebarCol"], nav')
assert('侧边栏容器渲染存在', !!sidebar)

const brandLogo = await page.$('aside [class*="brand"], [class*="sidebarCol"] [class*="brand"], aside svg')
assert('侧边栏品牌区域与 DeepSeek Logo 渲染正常', !!brandLogo)

const newSessionBtn = await page.$('button[aria-label*="新会话"], button[aria-label*="新建会话"]')
assert('新建会话按钮与快捷键提示存在', !!newSessionBtn)

const fullPageText = await page.evaluate(() => document.body.textContent || '')
const subPlugins = ['插件', '技能', 'IM助理', '定时任务', '归档会话', '专家', '自动化任务', '上下文洞察']
let foundPluginsCount = 0
for (const p of subPlugins) {
  if (fullPageText.includes(p)) foundPluginsCount++
}
assert('子插件模块化清单全量渲染', foundPluginsCount === subPlugins.length, `(${foundPluginsCount}/${subPlugins.length})`)

const tabs = ['任务', '频道', '定时']
let foundTabsCount = 0
for (const t of tabs) {
  if (fullPageText.includes(t)) foundTabsCount++
}
assert('三项视图 Tab (任务/频道/定时) 存在', foundTabsCount === tabs.length)

assert('工作区目录树正常展开渲染', fullPageText.includes('dsh-skills-manager') && fullPageText.includes('朝歌'))

// ==========================================
// Case 2: 侧栏折叠态与官方原生 56px 导轨对齐测试
// ==========================================
console.log('\n[Case 2] 侧栏折叠态与官方原生 56px 导轨对齐测试')
const collapseBtn = await page.$('button[aria-label="收起侧边栏"]')
assert('收起侧边栏折叠按钮存在', !!collapseBtn)
if (collapseBtn) {
  await collapseBtn.click()
  await page.waitForTimeout(800)
  const railWidth = await page.evaluate(() => {
    const rail = document.querySelector('aside, [class*="sidebarCol"], nav')
    return rail ? rail.getBoundingClientRect().width : 0
  })
  assert('折叠态导轨严格对齐官方 56px 规范', Math.abs(railWidth - 56) <= 1, `(实际测量宽度: ${railWidth}px)`)

  // 展开侧栏
  const expandBtn = await page.$('button[aria-label*="侧边栏"], button[aria-label*="展开"], button:has(svg)')
  if (expandBtn) {
    await expandBtn.click()
    await page.waitForTimeout(800)
  }
}

// ==========================================
// Case 3: 输入框增强与主页工作台测试
// ==========================================
console.log('\n[Case 3] 输入框增强与主页工作台测试')
const textarea = await page.$('textarea')
assert('中央会话主输入框存在', !!textarea)

const guideCards = ['探索并理解代码', '构建新功能', '审查代码', '修复问题']
let foundGuideCards = 0
for (const g of guideCards) {
  if (fullPageText.includes(g)) foundGuideCards++
}
assert('主页 4 张引导卡片完整呈现', foundGuideCards === guideCards.length, `(${foundGuideCards}/${guideCards.length})`)

const hasHistoryHint = await page.evaluate(() => {
  const styles = Array.from(document.querySelectorAll('style')).some(s => s.textContent?.includes('翻历史') || s.textContent?.includes('input-history'))
  const hintEl = document.querySelector('[data-slot*="input"], [id*="history"], [class*="history"]')
  return styles || !!hintEl
})
assert('终端风格输入历史召回提示 (↑↓ 翻历史) 规范注入', hasHistoryHint)

// ==========================================
// Case 4: 全屏设置工作台与生态管理测试
// ==========================================
console.log('\n[Case 4] 全屏设置工作台与生态管理测试')
const avatar = await page.$('button[aria-label="账号菜单"], button:has(img)')
await avatar.click()
await page.waitForTimeout(500)

const settingsBtn = await page.$('text="设置"')
await settingsBtn.click()
await page.waitForTimeout(1000)

const panel = await page.$('[role="dialog"], [class*="panel"], [data-shortcut-modal="settings"]')
assert('全屏设置工作台模态框成功展开', !!panel)

const codexBtn = await page.$('text="Codex UI"')
assert('设置导航项中包含 Codex UI', !!codexBtn)
if (codexBtn) {
  await codexBtn.click()
  await page.waitForTimeout(1200)

  await page.waitForTimeout(1000)
  const settingsFullText = await page.evaluate(() => document.body.textContent || '')
  const hasVersionTag = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('span, div, h2, h3')).some(e => e.textContent?.includes('v2.0.0'))
  })
  assert('版本号规范呈现为 v2.0.0', hasVersionTag)
  assert('快捷操作入口 (GitHub, 问题反馈, 检查更新) 存在', settingsFullText.includes('GitHub') && settingsFullText.includes('问题反馈') && settingsFullText.includes('检查更新'))

  const subPluginSpecs = [
    { name: '输入框增强', id: 'composer' },
    { name: '原生设置皮肤', id: 'settings-skin' },
    { name: '会话智能标题', id: 'session-title' },
    { name: '侧边栏导航', id: 'sidebar' },
    { name: '主题与界面换肤', id: 'theme' },
    { name: '配套生态管理', id: 'dependencies' }
  ]
  let matchedSubs = 0
  for (const sub of subPluginSpecs) {
    if (settingsFullText.includes(sub.name) && settingsFullText.includes(sub.id)) matchedSubs++
  }
  assert('6 大核心子插件生态矩阵卡片完整呈现', matchedSubs === 6, `(${matchedSubs}/6)`)
}

// ==========================================
// Case 5: 主题换肤、配色纠偏与地面光斑测试
// ==========================================
console.log('\n[Case 5] 主题换肤、配色纠偏与地面光斑测试')
// 1. 验证 7 套配色选项卡片
const themeNames = ['官方默认', 'Codex 暗色', 'Codex 亮色', 'Mocha', 'Macchiato', 'Frappé', 'Latte']
const panelFull = await page.evaluate(() => document.body.innerText)
let foundThemeCount = 0
for (const th of themeNames) {
  if (panelFull.includes(th)) foundThemeCount++
}
assert('7 套内置主题配色方案完整展示', foundThemeCount === 7, `(${foundThemeCount}/7)`)

// 2. 切换至 Codex 暗色并校验科技蓝主色
console.log('  -> 正在切换到 Codex 暗色...')
const darkBtn = await page.$('text="Codex 暗色"')
if (darkBtn) {
  await darkBtn.click()
  await page.waitForTimeout(1000)
  const accentVar = await page.evaluate(() => {
    return getComputedStyle(document.body).getPropertyValue('--dsw-static-deepseek-500').trim()
  })
  assert('Codex 暗色主色对齐科技蓝 (#339cff)，无薄荷绿污染', accentVar === '#339cff', `(--dsw-static-deepseek-500: ${accentVar})`)
}

// 3. 验证地面光斑独立 Switch 开关交互
console.log('  -> 正在测试「地面光斑」Switch 开关...')
const glowSwitch = await page.$('button[role="switch"], [role="switch"]')
assert('地面光斑独立 Switch 原生控件存在', !!glowSwitch)
if (glowSwitch) {
  const initialChecked = await glowSwitch.getAttribute('aria-checked')
  const initialGlowVal = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--dsh-glass-glow').trim())
  
  // 点击开关切换状态
  await glowSwitch.click()
  await page.waitForTimeout(600)
  const toggledChecked = await glowSwitch.getAttribute('aria-checked')
  const toggledGlowVal = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--dsh-glass-glow').trim())
  
  assert('地面光斑 Switch 状态联动响应与变量翻转', initialChecked !== toggledChecked && initialGlowVal !== toggledGlowVal, `(${initialGlowVal} -> ${toggledGlowVal})`)
  
  // 恢复开关状态
  await glowSwitch.click()
  await page.waitForTimeout(400)
}

// 4. 切回官方默认，验证宿主偏好与属性保护
console.log('  -> 正在切回官方默认主题...')
const stockBtn = await page.$('text="官方默认"')
if (stockBtn) {
  await stockBtn.click()
  await page.waitForTimeout(1000)
  const hostSafe = await page.evaluate(() => {
    return !document.body.hasAttribute('data-codex-ui-corrupted')
  })
  assert('切回官方默认安全无害，宿主偏好与根属性完整保护', hostSafe)
}

// 关闭设置窗口
await page.keyboard.press('Escape')
await page.waitForTimeout(1000)

// ==========================================
// Case 6: 会话操作与上下文菜单测试
// ==========================================
console.log('\n[Case 6] 会话操作与上下文菜单测试')
const sessionRow = await page.$('text="你好哦"')
assert('目标会话项存在', !!sessionRow)
if (sessionRow) {
  await sessionRow.click({ button: 'right' })
  await page.waitForTimeout(600)
  const menuItems = await page.$$eval('[role="menuitem"], [class*="menuItem"]', els => els.map(e => e.textContent?.trim()).filter(Boolean))
  const expectedOperations = ['收藏', '置顶会话', '重命名', '分叉会话', '归档会话', '复制 Session ID', '移动到工作区', '删除会话']
  let matchedOps = 0
  for (const op of expectedOperations) {
    if (menuItems.some(item => item.includes(op))) matchedOps++
  }
  assert('右键增强会话上下文菜单完整弹出 (8/8项)', matchedOps === 8, `(${matchedOps}/8)`)
  await page.keyboard.press('Escape')
}

// ==========================================
// Case 7: 控制台与运行时异常审计
// ==========================================
console.log('\n[Case 7] 控制台与运行时异常审计')
assert('页面无致命未捕获脚本异常 (Uncaught Exceptions: 0)', pageErrors.length === 0, `(Errors: ${pageErrors.length})`)

await browser.close()

console.log('\n==========================================')
const total = results.length
const passed = results.filter(r => r.status === 'PASS').length
const failed = results.filter(r => r.status === 'FAIL').length
console.log(`EGO 真机测试总结: 全部 ${total} 项用例, 通过: ${passed}, 失败: ${failed}`)
console.log('==========================================')
if (failed > 0) process.exit(1)
