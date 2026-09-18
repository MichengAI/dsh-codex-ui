/** 隔离宿主上检查 Codex 侧栏、标题提供方产物，以及会话移动菜单与接口。
 *  菜单入口和真正 POST 的必须是同一 session id。
 *  优先使用当前会话；若 current 被清掉，则回退到 visual 工作区里已有的会话。
 *  单独跑时没有这两处之一会失败——通常接在 verify-compat-host.mjs 之后。 */
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const target = process.env.DCU_DSH_URL
const workspace = process.env.DCU_E2E_WORKSPACE
if (!target || !workspace) throw new Error('需要 DCU_DSH_URL 和隔离的 DCU_E2E_WORKSPACE')

const browser = await chromium.launch()
const page = await browser.newPage({ locale: 'zh-CN', viewport: { width: 1440, height: 960 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const checks = []
try {
  await page.goto(target)
  await page.waitForFunction(() => !!window.__dcuE2E)
  for (let i = 0; i < 3; i++) {
    for (const name of ['继续', '稍后配置']) {
      const button = page.getByRole('button', { name, exact: true })
      if (await button.isVisible()) await button.click({ timeout: 2000 }).catch(() => {})
    }
    await page.waitForTimeout(200)
  }
  for (let i = 0; i < 3; i++) await page.keyboard.press('Escape')
  await page.locator('.dcu-wb').waitFor()
  checks.push('Codex 工作区树已接管侧栏')

  const targetDir = `${workspace}/move-target`
  await mkdir(targetDir, { recursive: true })
  const ids = await page.evaluate(async targetDir => {
    const ctx = window.__dcuE2E.ctx
    const items = ctx.workspaces.list.getSnapshot().items ?? []
    const visual = items.find(item => (item.path ?? '').replaceAll('\\', '/').endsWith('/visual'))
    const list = ctx.sessions.list.getSnapshot()
    const current = typeof list.current === 'string' && list.current !== ''
      ? list.current
      : Object.values(list.byId ?? {}).find(session => (session.retainedBy?.mainView ?? 0) > 0)?.id
    const visualIds = (visual?.sessionIds ?? []).map(String)
    const sessionId = typeof current === 'string' && current !== '' ? current : visualIds[0]
    if (typeof sessionId !== 'string' || sessionId === '') {
      throw new Error('隔离宿主没有可移动会话。请先跑 verify-compat-host.mjs，且 verify-settings-exit 不得清掉 current 或 visual 工作区会话。')
    }
    const destination = await ctx.workspaces.create({ path: targetDir })
    ctx.get('uiWorkspace').openSession(sessionId)
    return { sessionId, targetId: destination.workspaceId, targetTitle: destination.title || destination.workspaceId }
  }, targetDir)
  const session = page.locator('.dcu-wb-session[aria-selected="true"]')
  await session.waitFor()
  assert.equal(await session.getAttribute('data-dcu-session'), ids.sessionId, '当前选中行必须是即将移动的会话，不能只靠标题猜')
  await page.keyboard.press('Escape')
  checks.push('隔离宿主已有可移动会话，并创建了目标项目')

  await session.locator('button.dcu-wb-context-anchor').evaluate(button => button.click())
  const moveLabel = await page.evaluate(() => window.__dcuE2E.ctx.locale.bind('michengai.codexUi')('sessions.moveWorkspace'))
  const moveItem = page.getByRole('menuitem', { name: moveLabel, exact: true })
  await moveItem.waitFor()
  assert.equal(await moveItem.getAttribute('aria-disabled'), null, '有第二个项目时移动入口必须可用')
  await page.keyboard.press('Escape')
  checks.push('会话菜单暴露可用的项目移动入口')

  const moved = await page.evaluate(async ({ sessionId, targetWorkspaceId }) => {
    const response = await fetch('/api/dsh-codex-ui/session-move', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, targetWorkspaceId }),
    })
    return { status: response.status, body: await response.json() }
  }, { sessionId: ids.sessionId, targetWorkspaceId: ids.targetId })
  assert.equal(moved.status, 200, `会话移动接口应成功：${JSON.stringify(moved)}`)
  assert.equal(moved.body?.ok, true, `会话移动接口应返回 ok：${JSON.stringify(moved)}`)
  assert.equal(moved.body?.result?.toWorkspaceId, ids.targetId, `会话应落到目标项目：${JSON.stringify(moved)}`)
  assert.equal(moved.body?.result?.sessionId, ids.sessionId, `移动的必须是菜单对应的会话：${JSON.stringify(moved)}`)

  await page.waitForFunction(({ sessionId, targetId }) => {
    const items = window.__dcuE2E.ctx.workspaces.list.getSnapshot().items ?? []
    const destination = items.find(item => item.workspaceId === targetId)
    return destination?.sessionIds?.map(String).includes(sessionId) === true
  }, { sessionId: ids.sessionId, targetId: ids.targetId })
  checks.push('会话移动接口把会话归到目标项目')

  assert.deepEqual(errors, [], '页面不得产生未捕获异常')
  console.log(JSON.stringify({ version: process.env.DCU_E2E_VERSION, checks, pageErrors: errors }, null, 2))
} catch (error) {
  if (process.env.DCU_E2E_SCREENSHOT) {
    await page.screenshot({ path: process.env.DCU_E2E_SCREENSHOT.replace(/\.png$/, '-session-features.png'), fullPage: true }).catch(() => {})
  }
  throw error
} finally {
  await browser.close()
}
