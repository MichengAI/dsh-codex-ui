import { chromium } from 'playwright'
import { readFileSync } from 'fs'

async function run() {
  const logContent = readFileSync('C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/dsh_web.log', 'utf8')
  const lines = logContent.split('\n')
  const dshLine = lines.find((l) => l.includes('dsh web:'))
  if (!dshLine) throw new Error('未能从 dsh_web.log 中提取到 URL')
  const url = dshLine.replace('dsh web:', '').trim()
  console.log('连接 URL:', url)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // 打开设置
  const userBtn = page.getByRole('button', { name: /用户|设置|账号/ }).or(page.locator('button:has(img)'))
  if (await userBtn.count() > 0) {
    await userBtn.first().click()
    await page.waitForTimeout(600)
  }

  const settingsItem = page.getByRole('menuitem', { name: /设置/ }).or(page.getByText('设置', { exact: true }))
  if (await settingsItem.count() > 0) {
    await settingsItem.first().click()
  } else {
    await page.keyboard.press('Control+,')
  }

  const modal = page.locator('[data-shortcut-modal="settings"]')
  await modal.waitFor({ timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(1000)

  // 点击 Codex UI
  const codexNav = page.locator('[data-shortcut-modal="settings"] nav').getByText('Codex UI', { exact: true })
  if (await codexNav.count() > 0) {
    console.log('点击 Codex UI 项...')
    await codexNav.first().scrollIntoViewIfNeeded()
    await codexNav.first().click()
    await page.waitForTimeout(1000)
  }

  // 截取右侧工作区卡片
  const themeCard = page.locator('.dcu-theme-settings')
  if (await themeCard.count() > 0) {
    console.log('找到 .dcu-theme-settings 卡片，正在截图...')
    await themeCard.first().scrollIntoViewIfNeeded()
    await themeCard.first().screenshot({ path: 'C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/theme-settings-card.png' })
    console.log('卡片截图已保存至 scratch/theme-settings-card.png')
  } else {
    console.log('未找到 .dcu-theme-settings，截取全屏...')
    await page.screenshot({ path: 'C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/theme-settings-card.png' })
  }

  await browser.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
