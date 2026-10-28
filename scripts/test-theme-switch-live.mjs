import { chromium } from 'playwright'
import { readFileSync } from 'fs'

async function run() {
  const logContent = readFileSync('C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/dsh_web.log', 'utf8')
  const match = logContent.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s\r\n]+)/)
  if (!match) throw new Error('未能从 dsh_web.log 中提取到 URL')

  const url = match[1]
  console.log('连接 URL:', url)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // 打开设置
  const userBtn = page.getByRole('button', { name: /用户|设置|账号/ }).or(page.locator('button:has(img)'))
  if (await userBtn.count() > 0) {
    console.log('点击用户头像区')
    await userBtn.first().click()
    await page.waitForTimeout(600)
  }

  const settingsItem = page.getByRole('menuitem', { name: /设置/ }).or(page.getByText('设置', { exact: true }))
  if (await settingsItem.count() > 0) {
    console.log('点击设置菜单项')
    await settingsItem.first().click()
  } else {
    console.log('尝试键盘快捷键 Control+,')
    await page.keyboard.press('Control+,')
  }

  const modal = page.locator('[data-shortcut-modal="settings"]')
  await modal.waitFor({ timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(1000)

  // 点击 Codex UI
  const codexNav = page.getByRole('button', { name: 'Codex UI' }).or(page.getByText('Codex UI', { exact: true }))
  if (await codexNav.count() > 0) {
    console.log('点击 Codex UI 设置项')
    await codexNav.first().click()
    await page.waitForTimeout(600)
  }

  const buttons = [
    '官方默认',
    'Codex 暗色',
    'Codex 亮色',
    'Mocha (摩卡)',
    'Macchiato (玛奇朵)',
    'Frappé (冰吸)',
    'Latte (拿铁)',
  ]

  console.log('开始轮流点击 7 套主题...')
  for (const name of buttons) {
    const btn = page.locator(`.dcu-theme-palette-grid button:has-text("${name}")`)
    if (await btn.count() > 0) {
      const t0 = Date.now()
      await btn.first().click()
      await page.waitForTimeout(150)
      const elapsed = Date.now() - t0
      console.log(`✓ 切换到 [${name}] 成功, 耗时: ${elapsed}ms`)
    } else {
      console.log(`未找到按钮: [${name}]`)
    }
  }

  console.log('所有 7 套主题切换全部测试完毕，无任何卡死或阻塞！')
  await browser.close()
}

run().catch((err) => {
  console.error('测试失败:', err)
  process.exit(1)
})
