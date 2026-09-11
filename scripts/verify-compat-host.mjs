/** 对真实 DSH 宿主执行兼容性端到端检查；配套 fixture 仅用于隔离环境。 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const target = process.env.DCU_DSH_URL
const workspace = process.env.DCU_E2E_WORKSPACE
if (!target || !workspace) throw new Error('需要 DCU_DSH_URL 和隔离的 DCU_E2E_WORKSPACE')
await mkdir(workspace, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ locale: 'zh-CN', viewport: { width: 1440, height: 960 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const checks = []
try {
  await page.addInitScript(workspace => localStorage.setItem('michengai.codex-ui.input-history.v1', JSON.stringify({ [workspace]: ['兼容性历史消息'] })), workspace)
  await page.goto(target)
  await page.waitForFunction(() => !!window.__dcuE2E)
  assert.match(await page.evaluate(() => window.__dcuE2E.ctx.locale.getSnapshot().active), /^zh/i, '本脚本明确验收中文环境')
  // 首次安装的官方引导通过页面按钮正常完成，不配置真实密钥。
  for (let i = 0; i < 3; i++) {
    for (const name of ['继续', '稍后配置']) {
      const button = page.getByRole('button', { name, exact: true })
      if (await button.isVisible()) await button.click()
    }
    await page.waitForTimeout(200)
  }
  const id = await page.evaluate(async workspace => {
    const ctx = window.__dcuE2E.ctx
    const item = await ctx.workspaces.create({ path: workspace })
    const id = await ctx.get('uiWorkspace').connectWorkspace(item.workspaceId)
    ctx.get('uiWorkspace').openSession(id)
    return id
  }, workspace)
  const editor = page.locator('[data-composer-input=true]')
  await editor.waitFor()
  const waitDraft = text => page.waitForFunction(text => {
    const c = window.__dcuE2E.ctx
    return c.conversation.input.for(c.sessions.binding(c.sessions.list.getSnapshot().current).ctx).state.getSnapshot().draft === text
  }, text)
  const clearEditor = async () => {
    await editor.click()
    await editor.press('ControlOrMeta+A')
    await editor.press('Backspace')
    await waitDraft('')
  }
  await clearEditor()
  await editor.press('ArrowUp')
  await page.waitForFunction(() => document.querySelector('[data-composer-input=true]')?.textContent === '兼容性历史消息')
  await waitDraft('兼容性历史消息')
  await clearEditor()
  await page.getByRole('button', { name: '探索并理解代码', exact: true }).click()
  await page.getByRole('button', { name: '了解项目结构', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[data-composer-input=true]')?.textContent.length > 0)
  const draft = await editor.innerText()
  assert.ok(draft.length > 0)
  checks.push('真实会话空白草稿建议预填')

  await page.getByRole('button', { name: '兼容测试面板', exact: true }).click()
  await page.locator('[data-e2e-panel]').waitFor()
  assert.equal(await page.locator('.dcu-menu [aria-label="兼容测试面板"]').getAttribute('aria-current'), 'page')
  await page.getByRole('button', { name: '任务', exact: true }).click()
  await editor.waitFor()
  assert.equal(await editor.innerText(), draft)
  assert.equal(await page.evaluate(() => window.__dcuE2E.ctx.sessions.list.getSnapshot().current), id)
  checks.push('全局面板切换、选中反馈、返回原会话并保留草稿')
  await page.getByRole('button', { name: '收缩侧边栏', exact: true }).click()
  await page.waitForTimeout(350)
  await page.locator('.dcu-compact-nav').getByRole('button', { name: '兼容测试面板', exact: true }).click()
  await page.locator('[data-e2e-panel]').waitFor()
  await page.locator('.dcu-compact-nav').getByRole('button', { name: '任务', exact: true }).click()
  await editor.waitFor()
  await page.getByRole('button', { name: '展开侧边栏', exact: true }).click()
  await page.waitForTimeout(350)
  await page.evaluate(() => window.__dcuE2E.remove())
  assert.equal(await page.locator('[aria-label="兼容测试面板"]').count(), 0)
  await page.evaluate(() => window.__dcuE2E.add())
  await page.getByRole('button', { name: '兼容测试面板', exact: true }).waitFor()
  checks.push('紧凑侧栏导航、动态注销与重新注册')

  await clearEditor()
  // 使用真实宿主建议菜单核对全宽与官方翻译，不改写宿主 DOM。
  for (const trigger of ['/', '@']) {
    await editor.click()
    await editor.pressSequentially(trigger)
    const menu = page.locator('[data-trigger-menu]')
    await menu.waitFor()
    const widths = await menu.evaluate(node => ({ outer: node.getBoundingClientRect().width, inner: node.querySelector('[role=listbox]')?.getBoundingClientRect().width }))
    assert.ok(widths.outer > 0 && Math.abs(widths.inner - (widths.outer - 10)) < 1, '建议列表应铺满外框')
    await page.keyboard.press('Escape')
    await clearEditor()
  }
  checks.push('真实 @ 与指令建议列表全宽')
  await page.locator('input[type=file]').setInputFiles({ name: 'compat.txt', mimeType: 'text/plain', buffer: Buffer.from('compatibility fixture') })
  await page.waitForFunction(() => {
    const c = window.__dcuE2E.ctx
    const binding = c.sessions.binding(c.sessions.list.getSnapshot().current)
    return c.conversation.input.for(binding.ctx).state.getSnapshot().attachmentIds.length > 0
  })
  await editor.press('ArrowUp')
  assert.equal((await editor.innerText()).trim(), '')
  await page.getByRole('button', { name: '探索并理解代码', exact: true }).click()
  await page.getByRole('button', { name: '了解项目结构', exact: true }).click()
  assert.equal((await editor.innerText()).trim(), '')
  await page.locator('input[type=file]').setInputFiles({ name: 'compat.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64') })
  await page.waitForFunction(() => {
    const c = window.__dcuE2E.ctx
    return c.conversation.input.for(c.sessions.binding(c.sessions.list.getSnapshot().current).ctx).state.getSnapshot().attachmentIds.length === 2
  })
  await editor.press('ArrowUp')
  assert.equal((await editor.innerText()).trim(), '')
  checks.push('普通文件真实上传及附件草稿的历史召回保护')
  const attachmentGap = await page.locator('[data-composer-card]').evaluate(card => {
    const thumbnails = [...card.querySelectorAll('[data-slot="conversation.input.attachments"] button[class$="_thumbnail"]')]
    const input = card.querySelector('[data-input-scroll]')
    if (!thumbnails.length || !input) throw new Error('真实附件缩略图或正文区域未找到')
    return input.getBoundingClientRect().top - Math.max(...thumbnails.map(node => node.getBoundingClientRect().bottom))
  })
  assert.equal(attachmentGap, 6, `真实附件缩略图与正文间距应为 6px，实际 ${attachmentGap}`)
  checks.push(`真实附件缩略图到正文的间距 ${attachmentGap}px`)

  await page.locator('[data-dcu-settings-trigger]').click()
  await page.locator('[data-dcu-settings-page]').waitFor()
  await page.keyboard.press('Escape')
  await page.locator('[data-dcu-settings-page]').waitFor({ state: 'detached' })
  assert.equal(await page.locator('[data-dcu-settings-trigger]').evaluate(node => node === document.activeElement), true)
  checks.push('设置页打开、Escape 关闭与焦点恢复')
  const visualWorkspace = `${workspace}/visual`
  await mkdir(visualWorkspace, { recursive: true })
  await page.evaluate(async path => {
    const ctx = window.__dcuE2E.ctx
    const item = await ctx.workspaces.create({ path })
    const visualId = await ctx.get('uiWorkspace').connectWorkspace(item.workspaceId)
    ctx.get('uiWorkspace').openSession(visualId)
  }, visualWorkspace)
  const rail = page.locator('[data-dcu-official-turn-navigator]')
  await rail.waitFor()
  await rail.hover()
  const tip = rail.getByRole('tooltip')
  await tip.waitFor()
  const previewGeometry = await tip.evaluate(node => ({
    x: node.getBoundingClientRect().left, railRight: node.closest('nav').getBoundingClientRect().right,
    animation: getComputedStyle(node).animationName,
  }))
  assert.ok(previewGeometry.x >= previewGeometry.railRight, '真实预览应朝聊天内容区展开')
  assert.notEqual(previewGeometry.animation, 'none', '官方预览动画应保留')
  assert.equal(await page.locator('[data-dcu-expandable-user-bubble],#dcu-user-bubble-expand-style').count(), 0)
  checks.push('真实长消息无展开覆盖、官方轮次导航预览向右并保留动画')
  await page.mouse.move(700, 100)
  const more = page.getByRole('button', { name: '更多操作', exact: true })
  await more.click()
  const download = page.getByRole('menuitem', { name: '下载 Session 日志', exact: true })
  await download.waitFor()
  const downloadEvent = page.waitForEvent('download')
  await download.click()
  await downloadEvent
  const closeResult = page.getByRole('button', { name: '关闭', exact: true }).filter({ hasText: /^关闭$/ })
  if (await closeResult.isVisible()) await closeResult.click()
  checks.push('官方更多操作入口及 Session ZIP 下载')
  await page.setViewportSize({ width: 900, height: 720 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForTimeout(300)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  if (process.env.DCU_E2E_SCREENSHOT) await page.screenshot({ path: process.env.DCU_E2E_SCREENSHOT, fullPage: true })
  assert.deepEqual(errors, [], '页面不得产生未捕获异常')
  console.log(JSON.stringify({ version: process.env.DCU_E2E_VERSION, checks, pageErrors: errors }, null, 2))
} finally { await browser.close() }
