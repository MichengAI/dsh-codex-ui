import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const logContent = readFileSync('C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/dsh_web.log', 'utf8')
const match = logContent.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s\r\n]+)/)
if (!match) throw new Error('未能从 dsh_web.log 中提取到 URL')

const url = match[1]
console.log('连接 URL:', url)

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ locale: 'zh-CN' })
  await page.goto(url)
  await page.waitForTimeout(2000)

  // 点击左下角头像/昵称
  const userBtn = page.getByText('朝歌')
  if (await userBtn.isVisible()) {
    console.log('点击用户头像区')
    await userBtn.click()
    await page.waitForTimeout(600)
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

  const modal = page.locator('[data-shortcut-modal="settings"]')
  await modal.waitFor({ timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(1000)

  // 点击 Codex UI
  const codexNav = page.getByRole('button', { name: 'Codex UI' }).or(page.getByText('Codex UI', { exact: true }))
  if (await codexNav.count() > 0) {
    await codexNav.first().click()
    await page.waitForTimeout(600)
  }

  // 1. 检查设置弹窗的 DOM 树结构与样式
  const settingsDomInfo = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]') || document.querySelector('[data-shortcut-modal="settings"]')
    if (!dialog) return { found: false }

    const aside = dialog.querySelector('aside') || dialog.querySelector('nav')?.closest('div')
    const asideStyle = aside ? getComputedStyle(aside) : null
    const dialogStyle = getComputedStyle(dialog)

    // 检查 body 上的所有 inline 变量
    const bodyInlineStyle = document.body.getAttribute('style') || ''
    const bodyComputedBg = getComputedStyle(document.body).backgroundColor

    return {
      found: true,
      dialogClass: dialog.className,
      dialogBg: dialogStyle.backgroundColor,
      dialogBackdrop: dialogStyle.backdropFilter,
      asideClass: aside?.className,
      asideBg: asideStyle?.backgroundColor,
      bodyInlineVariablesCount: (bodyInlineStyle.match(/--dsw-/g) || []).length,
      bodyComputedBg,
      bodyDataTheme: document.body.getAttribute('data-ds-dark-theme'),
      htmlDataTheme: document.documentElement.getAttribute('data-ds-theme-source'),
    }
  })

  console.log('设置弹窗与页面主题信息:', JSON.stringify(settingsDomInfo, null, 2))

  const themeCard = page.locator('.dcu-theme-settings')
  if (await themeCard.isVisible()) {
    // 1. 开启玻璃质感
    const glassSwitch = themeCard.getByRole('switch', { name: /玻璃质感/ })
    if (await glassSwitch.isVisible()) {
      const isChecked = await glassSwitch.isChecked()
      if (!isChecked) {
        console.log('开启玻璃质感...')
        await glassSwitch.click()
        await page.waitForTimeout(600)
      }
    }

    // 2. 点击 Codex 暗色
    const codexDarkBtn = themeCard.getByRole('button', { name: /Codex 暗色/ })
    if (await codexDarkBtn.isVisible()) {
      console.log('点击 Codex 暗色...')
      await codexDarkBtn.click()
      await page.waitForTimeout(600)
    }

    // 检查设置页面侧边栏的 backdrop-filter 与 background
    const navGlassEvaluation = await page.evaluate(() => {
      const modal = document.querySelector('[data-shortcut-modal="settings"]')
      const nav = modal ? modal.querySelector('nav') : null
      return {
        modalBackdropFilter: modal ? getComputedStyle(modal).backdropFilter : null,
        modalBackground: modal ? getComputedStyle(modal).backgroundColor : null,
        navBackdropFilter: nav ? getComputedStyle(nav).backdropFilter : null,
        navBackground: nav ? getComputedStyle(nav).backgroundColor : null,
        bodyBgBase: getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base'),
      }
    })
    console.log('设置面板侧栏与底板玻璃化实测结果:', JSON.stringify(navGlassEvaluation, null, 2))

    // 3. 截图证明设置页面侧边栏毛玻璃效果
    await page.screenshot({ path: 'C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/settings-sidebar-glass.png' })
    console.log('测试截图已保存至 scratch/settings-sidebar-glass.png')

    // 4. 关闭设置面板看主界面侧栏与背景
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/main-interface-glass.png' })
    console.log('主界面截图已保存至 scratch/main-interface-glass.png')
  }

} finally {
  await browser.close()
}
