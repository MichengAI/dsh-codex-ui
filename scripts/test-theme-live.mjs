import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const logContent = readFileSync('C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/dsh_web.log', 'utf8')
const match = logContent.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s\r\n]+)/)
if (!match) {
  throw new Error('未能从 dsh_web.log 中提取到 URL，请确认 dsh web 正在运行。')
}

const url = match[1]
console.log('目标 URL 提取成功，准备通过 Playwright 连接...')

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ locale: 'zh-CN' })
  
  const consoleMessages = []
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => consoleMessages.push(`[PAGE_ERROR] ${err.message}`))

  await page.goto(url)
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/initial-page.png' })
  console.log('初始页面截图已保存至 scratch/initial-page.png')
  console.log('当前页面标题:', await page.title())
  console.log('Console 输出:\n', consoleMessages.join('\n'))

  // 点击左下角头像/昵称
  const userBtn = page.getByText('朝歌')
  if (await userBtn.isVisible()) {
    console.log('点击用户头像区')
    await userBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/user-menu.png' })
  }

  // 尝试打开设置
  const settingsItem = page.getByRole('menuitem', { name: /设置/ }).or(page.getByText('设置', { exact: true }))
  if (await settingsItem.count() > 0) {
    console.log('点击设置菜单项')
    await settingsItem.first().click()
  } else {
    console.log('尝试键盘快捷键 Control+,')
    await page.keyboard.press('Control+,')
  }

  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/settings-opened.png' })

  // 寻找设置弹窗中的导航
  const codexNav = page.getByRole('button', { name: 'Codex UI' }).or(page.getByText('Codex UI', { exact: true }))
  console.log('Codex UI 导航按钮 count:', await codexNav.count())
  if (await codexNav.count() > 0) {
    await codexNav.first().click()
    console.log('已点击 Codex UI 导航')
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/codex-ui-settings.png' })
  }

  // 检查在真机页面上，window 下 Cordis context 和 theme 的真实状态！
  const themeDiagnostics = await page.evaluate(() => {
    const html = document.documentElement
    const body = document.body
    return {
      htmlAttrs: Array.from(html.attributes).map(a => `${a.name}="${a.value}"`),
      bodyStyle: body.getAttribute('style') || '',
      bgBase: getComputedStyle(body).getPropertyValue('--dsw-alias-bg-base'),
      primaryText: getComputedStyle(body).getPropertyValue('--dsw-alias-label-primary'),
      themeCardFound: !!document.querySelector('.dcu-theme-settings'),
      themeButtons: Array.from(document.querySelectorAll('.dcu-theme-palette-grid button')).map(b => b.textContent?.trim()),
    }
  })

  console.log('主题状态诊断:', JSON.stringify(themeDiagnostics, null, 2))

  // 如果找到主题卡片中的按钮，真实点击测试！
  const themeCard = page.locator('.dcu-theme-settings')
  if (await themeCard.isVisible()) {
    console.log('\n--- 开始执行真机换肤测试 ---')
    // 1. 点击 Codex 暗色
    const codexDarkBtn = themeCard.getByRole('button', { name: /Codex 暗色/ })
    if (await codexDarkBtn.isVisible()) {
      console.log('点击 Codex 暗色按钮...')
      await codexDarkBtn.click()
      await page.waitForTimeout(600)
      const afterDark = await page.evaluate(() => ({
        bgBase: getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base'),
        bodyStyle: document.body.getAttribute('style') || '',
      }))
      console.log('点击 Codex 暗色后的 body 变量:', afterDark)
    }

    // 2. 点击玻璃质感开关
    const glassSwitch = themeCard.getByRole('switch', { name: /玻璃质感/ })
    if (await glassSwitch.isVisible()) {
      console.log('点击玻璃质感开关...')
      await glassSwitch.click()
      await page.waitForTimeout(600)
      const afterGlass = await page.evaluate(() => ({
        htmlGlass: document.documentElement.hasAttribute('data-dsh-glass'),
        htmlFloat: document.documentElement.hasAttribute('data-dsh-glass-float'),
        styleTagExists: !!document.getElementById('dsh-codex-ui-glass-style'),
        blurValue: document.documentElement.style.getPropertyValue('--dsh-glass-blur'),
      }))
      console.log('点击玻璃质感后的属性:', afterGlass)
    }

    await page.screenshot({ path: 'C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/theme-after-click.png' })
    console.log('点击后的截图已保存至 scratch/theme-after-click.png')
  }

} finally {
  await browser.close()
}
