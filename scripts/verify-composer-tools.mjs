/** 验证原菜单条目的定位、搜索、回调保留和作用域隔离。 */
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import ts from 'typescript'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const source = readFileSync('src/client/composer-tool-menus.ts', 'utf8').replaceAll('export ', '')
const script = ts.transpileModule(source + '\nwindow.menuStyle = COMPOSER_TOOL_MENU_STYLE; window.observeMenus = observeComposerToolMenus;', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  // 使用原版宽度约束，验证换肤不再把不同菜单统一锁为 262/320px。
  for (const width of [390, 1280]) for (const kind of ['model', 'project', 'permission']) {
    await page.setViewportSize({ width, height: 800 })
    const model = kind === 'model'
    await page.setContent(`<style>*{box-sizing:border-box}.native-menu{position:fixed;left:12px;top:100px;display:flex;flex-direction:column;padding:4px;${model ? 'width:max-content;min-width:min(240px,calc(100vw - 32px));max-width:min(420px,calc(100vw - 32px))' : 'min-width:218px;max-width:360px'}}.native-menu button{display:flex;min-width:0}.native-menu span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}</style><div role="menu" class="native-menu" data-dcu-tool-menu="portal"><button role="menuitem"><span>短名称</span></button></div>`)
    await page.addScriptTag({ content: script })
    await page.addStyleTag({ content: await page.evaluate(() => window.menuStyle) })
    const menu = page.locator('[role=menu]')
    const short = (await menu.boundingBox()).width
    if (short !== (model ? 240 : 218)) throw new Error(`${kind}: 原版最小宽度被覆盖为 ${short}`)
    await menu.locator('span').evaluate(node => { node.textContent = 'Very-Long-Project-Or-Model-Name-'.repeat(8) })
    const long = (await menu.boundingBox()).width
    const cap = model ? Math.min(420, width - 32) : 360
    if (long <= short || long > cap) throw new Error(`${kind}: 长名称未按原版约束扩展，${short} -> ${long}`)
  }
  // 官方建议外框与输入卡片等宽，listbox 只是内部滚动区；同时覆盖点击与直接键入路径。
  for (const width of [390, 1280]) for (const dark of [false, true]) for (const mode of ['button', '@', '/']) {
    await page.setViewportSize({ width, height: 800 })
    await page.setContent(`<style>*{box-sizing:border-box}[data-composer-card]{position:relative;width:min(640px,calc(100vw - 48px));margin:400px auto 0}[data-trigger-menu]{position:absolute;left:0;right:0;bottom:100%;padding:4px;display:flex;flex-direction:column;border-radius:20px}[role=listbox]{display:flex;flex-direction:column;min-height:0;overflow-y:auto}[role=option]{width:100%}</style><section data-conversation-scroll><div data-composer-card><button aria-haspopup="listbox">指令</button><div contenteditable="true" role="textbox"></div></div></section>`)
    await page.addScriptTag({ content: script })
    await page.addStyleTag({ content: await page.evaluate(() => window.menuStyle) })
    await page.evaluate(() => {
      window.disposeMenus = window.observeMenus({ search: '搜索', empty: '无结果' })
      const open = () => {
        const shell = document.createElement('div')
        shell.dataset.triggerMenu = ''
        shell.innerHTML = '<nav>项目 / 文件夹</nav><div role="listbox"><button role="option">文件.ts</button></div>'
        shell.querySelector('button').onclick = () => { window.chosen = '文件.ts' }
        document.querySelector('[data-composer-card]').append(shell)
      }
      document.querySelector('button').onclick = open
      document.querySelector('[contenteditable]').oninput = open
    })
    if (mode === 'button') await page.getByRole('button', { name: '指令', exact: true }).click()
    else await page.getByRole('textbox').fill(mode)
    await page.evaluate(dark => document.body.toggleAttribute('data-ds-dark-theme', dark), dark)
    const measureSuggestions = () => page.locator('[data-trigger-menu]').evaluate(shell => ({
      outer: shell.getBoundingClientRect().width,
      card: shell.closest('[data-composer-card]').getBoundingClientRect().width,
      inner: shell.querySelector('[role=listbox]').getBoundingClientRect().width,
      marked: shell.querySelector('[data-dcu-tool-menu]') !== null,
      radius: getComputedStyle(shell).borderRadius,
      background: getComputedStyle(shell).backgroundColor,
      font: getComputedStyle(shell.querySelector('[role=option]')).fontSize,
    }))
    const geometry = await measureSuggestions()
    if (geometry.radius !== '18px' || geometry.font !== '13px' || geometry.background !== (dark ? 'rgb(41, 41, 41)' : 'rgb(255, 255, 255)')) throw new Error('建议菜单未恢复 Codex 外观')
    if (geometry.marked || geometry.outer !== geometry.card || geometry.inner !== geometry.outer - 10) throw new Error(`${mode}/${width}: 建议菜单没有铺满输入区`)
    await page.locator('[data-composer-card]').evaluate(card => { card.style.width = '280px' })
    const resized = await measureSuggestions()
    if (resized.outer !== 280 || resized.inner !== 270) throw new Error('建议菜单没有跟随输入框调宽')
    await page.getByRole('option').click()
    if (await page.evaluate(() => window.chosen) !== '文件.ts') throw new Error('建议菜单的原回调失效')
    await page.evaluate(() => window.disposeMenus())
  }
  for (const width of [390, 1280]) for (const dark of [false, true]) {
    await page.setViewportSize({ width, height: 800 })
    await page.setContent(`<style>body{margin:0;--dsw-alias-label-primary:${dark ? '#ddd' : '#222'};--dsw-alias-label-secondary:#888}#bar{position:fixed;bottom:100px;left:24px}#inline{position:relative;display:inline-block}.host_menu{position:fixed;left:24px;top:600px;min-width:218px;background:#333;padding:4px;border-radius:20px}.host_menu [role=menuitem]{min-height:40px;border:0;color:inherit;background:transparent;display:flex;width:100%}.host_viewport{display:flex;flex-direction:column}.host_inline{position:absolute;top:auto;left:auto;bottom:calc(100% + 8px);right:0}</style><div data-conversation-scroll><div id="bar"><div class="host_heroWorkspaceRow"><button id="project">项目</button><button id="mode">模式</button><button id="branch">分支</button></div><div data-composer-card><button id="permission" aria-haspopup="menu">权限</button><span id="inline"><button id="model" aria-haspopup="menu">模型</button></span></div></div></div><button id="unrelated">其他区域</button>`)
    await page.addScriptTag({ content: script })
    await page.addStyleTag({ content: await page.evaluate(() => window.menuStyle) })
    await page.evaluate(dark => {
      document.body.toggleAttribute('data-ds-dark-theme', dark)
      window.disposeMenus = window.observeMenus({ search: '搜索项目', empty: '没有匹配的项目' })
      window.chosen = ''
      document.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
        const menu = document.createElement('div')
        menu.className = button.id === 'model' ? 'host_menu host_inline' : 'host_menu'
        // Git 插件首页使用内联绝对定位，默认向下；不能用 fixed 夹具替代这条路径。
        if (button.id === 'branch') {
          button.parentElement.style.position = 'relative'
          menu.style.cssText = 'position:absolute;top:calc(100% + 4px);bottom:auto;left:0'
          menu.setAttribute('data-gitgraph-popover', 'true')
        }
        menu.setAttribute('role', 'menu')
        menu.innerHTML = '<div class="host_viewport">' + Array.from({ length: 12 }, (_, n) => `<div><button role="menuitem" class="${n === 0 ? 'host_selected' : ''}">项目 ${n}</button></div>`).join('') + '</div><div class="host_footer"><button role="menuitem">添加工作区</button></div>'
        if (button.id === 'mode') {
          menu.querySelector('.host_viewport').innerHTML = Array.from({ length: 3 }, (_, n) => `<div><button role="menuitem" style="min-height:76px">项目 ${n}</button></div>`).join('')
        }
        menu.querySelectorAll('button').forEach(row => row.addEventListener('click', () => { window.chosen = row.textContent; menu.remove() }))
        ;(button.id === 'model' ? document.querySelector('#inline') : button.id === 'branch' ? button.parentElement : document.body).append(menu)
      }))
    }, dark)
    for (const id of ['project', 'mode', 'branch', 'permission', 'model']) {
      await page.locator(`#${id}`).click()
      await page.waitForFunction(() => document.querySelector('[data-dcu-tool-menu]'))
      const box = await page.locator('[data-dcu-tool-menu]').boundingBox()
      const anchor = await page.locator(`#${id}`).boundingBox()
      if (id !== 'model' && box.y + box.height > anchor.y) throw new Error(`${id} 菜单遮挡工具条`)
      if ((box.x < 12 || box.x + box.width > width - 11)) throw new Error(`${id} 菜单超出窗口`)
      if (id === 'mode' && await page.locator('[data-dcu-tool-menu] .host_viewport').evaluate(el => el.scrollHeight > el.clientHeight + 1)) throw new Error('模式菜单有足够空间却仍需滚动')
      if (id === 'mode') {
        await page.setViewportSize({ width, height: 360 })
        await page.waitForFunction(() => {
          const viewport = document.querySelector('[data-dcu-tool-menu] .host_viewport')
          return viewport.scrollHeight > viewport.clientHeight + 1
        })
        const compact = await page.locator('[data-dcu-tool-menu]').boundingBox()
        if (compact.y < 12 || compact.y + compact.height > 348) throw new Error('小窗口模式菜单越界')
        await page.setViewportSize({ width, height: 800 })
      }
      if (id === 'project') {
        if (dark && width === 1280 && process.argv.includes('--screenshot')) await page.screenshot({ path: join(tmpdir(), 'dcu-tool-menu-check.png') })
        await page.getByRole('searchbox').fill('不存在')
        if (!await page.getByText('没有匹配的项目').isVisible()) throw new Error('无搜索结果未显示')
        if (!await page.getByRole('menuitem', { name: '添加工作区' }).isVisible()) throw new Error('搜索隐藏了创建入口')
        await page.getByRole('searchbox').fill('项目 11')
        await page.getByRole('searchbox').press('Enter')
        if (await page.evaluate(() => window.chosen) !== '项目 11') throw new Error('搜索没有调用原条目')
      } else await page.getByRole('menuitem', { name: '项目 0', exact: true }).click()
    }
    await page.locator('#unrelated').click()
    if (await page.locator('[data-dcu-tool-menu]').count()) throw new Error('修改了其他区域的菜单')
    await page.locator('[role=menu]').evaluate(el => el.remove())
    await page.locator('#project').click()
    await page.waitForFunction(() => document.querySelector('[data-dcu-tool-filter]'))
    await page.evaluate(() => window.disposeMenus())
    if (await page.locator('[data-dcu-tool-menu],[data-dcu-tool-filter]').count()) throw new Error('卸载没有恢复菜单')
  }
  // Git 数据异步返回时可能错过观察窗口；方向不能依赖观察器补写属性。
  await page.setContent('<div class="host_heroWorkspaceRow" style="position:fixed;bottom:100px;left:30px"><div style="position:relative"><button>main</button><div data-gitgraph-popover role="listbox" style="position:absolute;top:100%;bottom:auto;width:260px;height:140px">分支</div></div></div>')
  await page.addScriptTag({ content: script })
  await page.addStyleTag({ content: await page.evaluate(() => window.menuStyle) })
  const branch = await page.locator('[data-gitgraph-popover]').boundingBox()
  const trigger = await page.locator('button').boundingBox()
  if (branch.y + branch.height > trigger.y) throw new Error('未被观察器标记的 Git 分支菜单仍向下展开')
  // 比较观察器标记前后的首帧外观，防止菜单先以插件原样式显示再跳变。
  await page.locator('[data-gitgraph-popover]').evaluate(el => el.style.removeProperty('width'))
  const appearance = () => page.locator('[data-gitgraph-popover]').evaluate(el => {
    const s = getComputedStyle(el)
    return [s.width, s.padding, s.borderRadius, s.backgroundColor]
  })
  const initialAppearance = await appearance()
  await page.locator('[data-gitgraph-popover]').evaluate(el => el.setAttribute('data-dcu-tool-menu', 'inline'))
  if (JSON.stringify(initialAppearance) !== JSON.stringify(await appearance())) throw new Error('Git 菜单在观察器标记后改变尺寸或外观，存在首帧闪烁')
  console.log('工具菜单：项目/模式/分支/权限/模型 × 深浅主题 × 两视口，定位、搜索、原回调及隔离清理检查通过。')
} finally { await browser.close() }
