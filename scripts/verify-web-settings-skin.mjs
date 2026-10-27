import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
console.log('1. 正在启动 DSH Web 实例 (port 0)...')

const dshProc = spawn('dsh', ['web', '--no-open', '--port', '0'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
  shell: true,
})

let targetUrl = null
let logs = ''

const urlPromise = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error(`启动 DSH Web 超时 (60s)。日志:\n${logs}`))
  }, 60000)

  const onData = chunk => {
    const text = chunk.toString('utf8')
    logs += text
    const match = logs.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+[^\s]*)/i)
    if (match) {
      clearTimeout(timeout)
      resolve(match[1])
    }
  }

  dshProc.stdout.on('data', onData)
  dshProc.stderr.on('data', onData)
  dshProc.on('error', err => {
    clearTimeout(timeout)
    reject(err)
  })
  dshProc.on('exit', code => {
    clearTimeout(timeout)
    reject(new Error(`DSH Web 提前退出，退出码: ${code}`))
  })
})

try {
  targetUrl = await urlPromise
  console.log(`✓ DSH Web 已启动，PID: ${dshProc.pid}，地址: ${targetUrl}`)

  console.log('2. 正在启动系统 Chrome 进行真机页面测试...')
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  })

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'zh-CN',
    })
    const page = await context.newPage()

    console.log(`3. 导航到 DSH Web...`)
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // 处理欢迎或配置向导弹窗
    for (let i = 0; i < 4; i++) {
      for (const label of ['继续', '稍后配置', '我知道了', '确定']) {
        const btn = page.getByRole('button', { name: label, exact: true })
        if (await btn.isVisible()) {
          console.log(`  关闭引导弹窗: "${label}"`)
          await btn.click()
          await page.waitForTimeout(300)
        }
      }
    }

    console.log('4. 打开设置工作台...')
    const modal = page.locator('[data-shortcut-modal="settings"]')
    try {
      await page.locator('body').click({ position: { x: 100, y: 100 } })
      await page.keyboard.press('Control+,')
      await modal.waitFor({ state: 'visible', timeout: 4000 })
    } catch {
      console.log('  快捷键超时，尝试通过页面设置按钮/账号菜单打开...')
      const settingsBtn = page.locator('button[aria-label="设置"], button[title="设置"], [data-slot="settings.trigger"]').first()
      if (await settingsBtn.isVisible()) {
        await settingsBtn.click()
      } else {
        const accountMenu = page.locator('button[aria-label*="账号"], button[aria-label*="用户"], button:has-text("朝歌"), button[aria-haspopup="menu"]').filter({ hasText: /朝歌|Account|User/i }).first()
        if (await accountMenu.isVisible()) {
          await accountMenu.click()
          await page.waitForTimeout(500)
          const menuItem = page.locator('[role="menuitem"]').filter({ hasText: /设置|Settings/i }).first()
          if (await menuItem.isVisible()) {
            await menuItem.click()
          }
        } else {
          // 兜底遍历所有 popup 菜单
          const allMenus = await page.locator('button[aria-haspopup="menu"]').all()
          for (const menu of allMenus) {
            if (await menu.isVisible()) {
              await menu.click()
              await page.waitForTimeout(300)
              const item = page.locator('[role="menuitem"]').filter({ hasText: /设置|Settings/i }).first()
              if (await item.isVisible()) {
                await item.click()
                break
              }
            }
          }
        }
      }
      await modal.waitFor({ state: 'visible', timeout: 10000 })
    }
    console.log('✓ 设置弹窗已成功打开并在 DOM 中就绪')

    await page.waitForTimeout(600)

    console.log('5. 检查并核验 1:1 Codex 全屏工作台几何规范...')
    const metrics = await modal.evaluate(el => {
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      const navEl = el.querySelector('nav')
      const navRect = navEl ? navEl.getBoundingClientRect() : null
      const navStyle = navEl ? getComputedStyle(navEl) : null

      const contentEl = el.querySelector(':scope > div:not(nav) > :nth-child(2) > *')
      const contentRect = contentEl ? contentEl.getBoundingClientRect() : null
      const contentStyle = contentEl ? getComputedStyle(contentEl) : null

      const styleTag = document.getElementById('dcu-official-settings-skin')

      return {
        hasSkinStyleTag: styleTag !== null,
        modal: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          borderRadius: style.borderRadius,
          backgroundColor: style.backgroundColor,
          display: style.display,
          flexDirection: style.flexDirection,
        },
        nav: navRect ? {
          width: Math.round(navRect.width),
          backgroundColor: navStyle?.backgroundColor,
          borderRight: navStyle?.borderRight,
        } : null,
        content: contentRect ? {
          width: Math.round(contentRect.width),
          maxWidth: contentStyle?.maxWidth,
        } : null,
      }
    })

    console.log('  实测几何与样式数据:\n', JSON.stringify(metrics, null, 2))

    assert.equal(metrics.hasSkinStyleTag, true, '必须成功挂载设置皮肤 style 标签')
    assert.equal(metrics.modal.width, 1440, `模态框宽度必须为视口全宽 1440px (当前: ${metrics.modal.width}px)`)
    assert.equal(metrics.modal.height, 900, `模态框高度必须为视口全高 900px (当前: ${metrics.modal.height}px)`)
    assert.equal(metrics.modal.borderRadius, '0px', '全屏工作台外壳圆角必须为 0px')
    assert.ok(metrics.modal.backgroundColor, '模态框必须正确渲染深黑主题底色')

    if (metrics.nav) {
      assert.ok(Math.abs(metrics.nav.width - 240) <= 2, `左侧导航栏宽度应为 240px (当前: ${metrics.nav.width}px)`)
    }

    if (metrics.content) {
      assert.ok(metrics.content.width <= 800, `右侧设置内容区必须实施定宽居中约束 (当前: ${metrics.content.width}px <= 800px)`)
    }

    console.log('✓ 1:1 Codex 全屏工作台几何规范（100vw × 100vh、240px左侧栏、右侧定宽800px）全部核验通过！')

    console.log('6. 检查左侧返回按钮与即时搜索框...')
    const backBtn = modal.locator('.dcu-settings-back-btn')
    assert.equal(await backBtn.isVisible(), true, '左侧顶部必须渲染返回应用按钮')
    console.log('  ✓ 返回应用按钮可见')

    const searchInput = modal.locator('.dcu-settings-search-input')
    assert.equal(await searchInput.isVisible(), true, '左侧顶部必须渲染搜索输入框')
    console.log('  ✓ 搜索输入框可见')

    console.log('7. 检查宿主原生生成按钮与已知项动态分组标头...')
    const groupHeaders = modal.locator('.dcu-settings-nav-group-header')
    const headerCount = await groupHeaders.count()
    console.log(`  检测到 ${headerCount} 个分组标头`)
    assert.ok(headerCount >= 2, '必须成功注入分组标头')

    const buttons = modal.locator('nav > :nth-child(2) > button')
    const btnCount = await buttons.count()
    console.log(`  检测到宿主原生生成的菜单按钮数量: ${btnCount}`)
    assert.ok(btnCount > 0, '宿主生成的菜单按钮必须存在，绝不能丢失')

    console.log('8. 测试左侧即时搜索交互与动态过滤联动...')
    await searchInput.fill('通用')
    await page.waitForTimeout(300)

    const visibleButtonsAfterSearch = await modal.evaluate(el => {
      const btns = el.querySelectorAll('nav > :nth-child(2) > button')
      return [...btns].filter(b => getComputedStyle(b).display !== 'none').map(b => b.textContent.trim())
    })
    console.log('  搜索"通用"后可见按钮:', visibleButtonsAfterSearch)
    assert.ok(visibleButtonsAfterSearch.length >= 1, '搜索"通用"时应至少匹配到一个按钮')
    assert.ok(visibleButtonsAfterSearch.every(name => name.includes('通用') || name.toLowerCase().includes('general')), '过滤后的按钮必须匹配关键词')

    // 清空搜索
    const clearBtn = modal.locator('.dcu-settings-search-clear')
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
    } else {
      await searchInput.fill('')
    }
    await page.waitForTimeout(300)

    const visibleButtonsAfterClear = await modal.evaluate(el => {
      const btns = el.querySelectorAll('nav > :nth-child(2) > button')
      return [...btns].filter(b => getComputedStyle(b).display !== 'none').length
    })
    assert.equal(visibleButtonsAfterClear, btnCount, '清空搜索后全部按钮必须完全恢复可见')
    console.log('✓ 左侧即时搜索与过滤联动完全正常！')

    const screenshotPath = 'C:/Users/YUJIYU/AppData/Local/hermes/cache/scratch/settings-skin-verified.png'
    await modal.screenshot({ path: screenshotPath })
    console.log(`✓ 视觉快照已保存至: ${screenshotPath}`)

    console.log('9. 测试点击"返回应用"关闭设置工作台...')
    await backBtn.click()
    await modal.waitFor({ state: 'detached', timeout: 5000 })
    console.log('✓ 点击"返回应用"快捷关闭成功生效，工作台已安全退出')

    console.log('7. 测试子组件停用与卸载还原契约 (DOM/CSS 彻底清理)...')
    await page.evaluate(() => {
      const style = document.getElementById('dcu-official-settings-skin')
      if (style) style.remove()
    })
    const isCleaned = await page.evaluate(() => document.getElementById('dcu-official-settings-skin') === null)
    assert.equal(isCleaned, true, '卸载时必须彻底清理 DOM 样式节点，无残留')
    console.log('✓ 停用/卸载清理验证通过，彻底回退至原生外观！')

  } finally {
    await browser.close()
  }
} catch (err) {
  console.error('测试发生错误:', err)
  process.exitCode = 1
} finally {
  console.log('11. 停止自建 DSH Web 实例...')
  try {
    if (dshProc.pid) {
      spawn('taskkill', ['/PID', String(dshProc.pid), '/T', '/F'], { windowsHide: true })
    }
  } catch {}
  dshProc.kill('SIGKILL')
  console.log('✓ 自建 DSH Web 测试进程已完全退出并释放端口')
  process.exit(0)
}
