import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import ts from 'typescript'

function browserScript(path, exportScript) {
  const source = readFileSync(path, 'utf8')
    .replace(/^import[\s\S]*?from .*$/gm, '')
    .replace(/^export /gm, '')
  return ts.transpileModule(source + '\n' + exportScript, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  await page.setContent(`
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <style>
      html, body { margin: 0; height: 100%; }
      .host_frame { position: relative; display: grid; grid-template-rows: minmax(0, 1fr) auto; height: 100%; }
      .host_sidebarCol { position: absolute; z-index: 2; }
      .host_conversation { display: flex; flex-direction: column; min-height: 0; }
      .host_conversation header { flex: 0 0 40px; }
      .host_scrollBody { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: auto; }
      [data-composer-seat] { display: flex; flex-direction: column; }
      .host_composerHero { display: flex; flex-direction: column; }
      .host_heroContent { min-height: 600px; }
      [data-input-scroll] { max-height: 336px; overflow: auto; }
      .host_settings_row { display: flex; align-items: center; gap: 8px; }
      .host_rowText { flex: 1; min-width: 0; }
      .host_permissionControl { width: 172px; flex: none; }
      .host_segmented { display: inline-grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; padding: 4px; }
      .host_segmented button { white-space: nowrap; padding: 0 16px; }
      .host_projectRow [class*="_rowActions"] { display: none; }
      #composer { position: relative; flex: none; padding: 10px; border: 1px solid; }
      #composer [data-composer-input], #query, #settings-input { font-size: 12px; }
      [data-trigger-menu] { position: absolute; bottom: calc(100% + 4px); width: 100%; height: 550px; overflow-y: auto; }
      [data-context-menu] { position: fixed; top: 360px; left: 278px; width: 320px; height: 400px; }
    </style>
    <div id="frame" class="host_frame" data-sidebar-drawer>
      <div data-sidebar-mask></div>
      <div class="host_sidebarCol">
        <div>
          <div id="workspace" class="host_projectRow" data-row-key="workspace:test" aria-expanded="false">
            Project <span class="host_rowActions"><button id="workspace-more">More</button></span>
          </div>
        </div>
        <div class="host_sectionHeader">
          <input id="query" class="host_searchInput"><button class="host_clearButton" id="search-close">Close search</button>
        </div>
      </div>
      <main class="host_conversation" data-phase="hero">
        <header></header>
        <div class="host_scrollBody" data-conversation-scroll>
          <div data-composer-seat>
            <div data-slot="conversation.composer" style="display: contents">
              <div class="host_composerHero">
                <div><div class="host_heroContent">Welcome</div></div>
                <div class="host_heroWorkspaceRow"><button>Choose workspace</button></div>
                <div id="composer" data-composer-card>
                  <div data-input-scroll><div data-composer-input contenteditable="true">Draft</div></div>
                  <button>Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div data-shell-bottom></div>
      <div data-shell-overlay></div>
    </div>
    <div role="presentation">
      <div data-shortcut-modal="settings" role="dialog" aria-modal="true">
        <div class="host_navTitle">
          <div class="dcu-settings-nav-header-root">
            <div class="dcu-settings-nav-header-top">
              <button class="dcu-settings-back-btn">Back</button>
              <span class="dcu-settings-nav-header-title">Settings</span>
            </div>
          </div>
        </div>
        <nav>
          <div class="host_navList">
            <button class="host_navCell" aria-current="true"><span class="host_navLabel">General</span></button>
            <button class="host_navCell"><span class="host_navLabel">Models</span></button>
            <button class="host_navCell"><span class="host_navLabel">Built-in plugins</span></button>
            <button class="host_navCell"><span class="host_navLabel">Agent presets</span></button>
            <button class="host_navCell"><span class="host_navLabel">Plugin Market</span></button>
            <button class="host_navCell"><span class="host_navLabel">Codex UI</span></button>
          </div>
        </nav>
        <div class="host_header"><button>Open configuration file</button><button class="host_close">Close</button></div>
        <div class="host_options">
          <input id="settings-input">
          <div class="host_settings_row">
            <div class="host_rowText">
              <div>Permission</div>
              <div id="permission-help" class="host_desc">Choose the default permission mode for new sessions</div>
            </div>
            <button class="host_permissionControl" id="permission-control">Workspace Write</button>
          </div>
          <div class="dcu-settings-row">
            <div class="dcu-settings-row-label">Suggestions</div>
            <div class="host_segmented" role="tablist">
              <button role="tab">Off</button>
              <button role="tab">Continuation only</button>
              <button role="tab">Prediction &amp; continuation</button>
            </div>
          </div>
          <div style="padding-top: 1050px"><input id="deep-settings-input"></div>
        </div>
      </div>
    </div>
  `)
  await page.addScriptTag({
    content: browserScript('src/client/settings-skin/index.ts', 'window.__settingsSkin = SETTINGS_SKIN_CSS;'),
  })
  await page.addStyleTag({ content: await page.evaluate(() => window.__settingsSkin) })
  await page.addScriptTag({
    content: browserScript('src/client/composer/new-conversation-style.ts', 'window.__newConversationStyle = NEW_CONVERSATION_STYLE;'),
  })
  await page.addStyleTag({ content: await page.evaluate(() => window.__newConversationStyle) })
  await page.addScriptTag({
    content: browserScript('src/client/mobile-web.ts', 'window.__disposeMobile = observeMobileWeb();'),
  })
  const measure = () => page.evaluate(() => {
    const box = selector => {
      const { x, y, width, height, bottom, right } = document.querySelector(selector).getBoundingClientRect()
      return { x, y, width, height, bottom, right }
    }
    return {
      active: document.documentElement.hasAttribute('data-dcu-mobile-web'),
      frame: box('#frame'),
      composer: box('#composer'),
      compact: document.documentElement.hasAttribute('data-dcu-short-viewport'),
      editorMaxHeight: getComputedStyle(document.querySelector('[data-input-scroll]')).maxHeight,
      settings: box('[data-shortcut-modal="settings"]'),
      settingsBack: box('.dcu-settings-back-btn'),
      settingsHeader: box('.host_header'),
      settingsNavigation: box('.host_navList'),
      settingsTab: box('.host_navCell'),
      settingsContent: box('.host_options'),
      settingsContentScroll: document.querySelector('.host_options').scrollWidth,
      settingsTitle: box('.host_navTitle'),
      settingsTabsScroll: document.querySelector('.host_navList').scrollWidth,
      permissionHelp: box('#permission-help'),
      permissionControl: box('#permission-control'),
      workspaceMore: box('#workspace-more'),
      searchClose: box('#search-close'),
      searchFont: getComputedStyle(document.querySelector('#query')).fontSize,
      composerFont: getComputedStyle(document.querySelector('[data-composer-input]')).fontSize,
      settingsFont: getComputedStyle(document.querySelector('#settings-input')).fontSize,
    }
  })
  const initial = await measure()
  assert.equal(initial.active, true)
  assert.equal(initial.compact, false)
  assert.equal(initial.frame.width, 390)
  assert.equal(initial.frame.height, 844)
  assert.equal(initial.settingsContent.width, initial.settings.width)
  assert.ok(initial.settingsHeader.bottom <= initial.settingsNavigation.y)
  assert.ok(initial.settingsBack.y >= initial.settingsTitle.y)
  assert.ok(initial.settingsBack.bottom <= initial.settingsTitle.bottom)
  assert.ok(initial.settingsNavigation.bottom <= initial.settingsContent.y)
  assert.ok(initial.settingsTab.height >= 44)
  assert.ok(initial.settingsTabsScroll > initial.settingsNavigation.width)
  assert.equal(await page.getByRole('button', { name: 'Models', exact: true }).count(), 1)

  await page.setViewportSize({ width: 320, height: 844 })
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--dcu-viewport-width') === '320px')
  const narrow = await measure()
  assert.equal(narrow.settingsContent.width, 320)
  assert.equal(narrow.settingsContentScroll, 320)
  assert.ok(narrow.settingsBack.y >= narrow.settingsTitle.y)
  assert.ok(narrow.settingsBack.bottom <= narrow.settingsTitle.bottom)
  assert.ok(narrow.permissionHelp.width >= 160, JSON.stringify(narrow.permissionHelp))
  assert.ok(narrow.permissionControl.y >= narrow.permissionHelp.bottom)
  // Verify coarse pointer branch on landscape / tablet viewports where max-width: 767px is false
  await page.setViewportSize({ width: 844, height: 390 })
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--dcu-viewport-width') === '844px')
  const landscape = await measure()
  assert.equal(landscape.active, true, 'Coarse pointer viewport (844px wide) must activate mobile-web mode')
  assert.equal(landscape.frame.width, 844)
  assert.equal(landscape.frame.height, 390)
  assert.equal(await page.evaluate(() => window.matchMedia('(max-width: 767px)').matches), false)
  assert.equal(await page.evaluate(() => window.matchMedia('(max-width: 1023px) and (pointer: coarse)').matches), true)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--dcu-viewport-width') === '390px')
  for (const name of ['settingsBack', 'workspaceMore', 'searchClose']) {
    const { width, height } = initial[name]
    assert.ok(width >= 44 && height >= 44, `${name}: ${width}x${height}`)
  }
  assert.deepEqual([initial.searchFont, initial.composerFont, initial.settingsFont], ['16px', '16px', '16px'])

  // Chromium's CDP does not show an actual OS keyboard. Publish a panned visual
  // viewport and dispatch its normal events while leaving the layout size alone.
  await page.evaluate(() => {
    const viewport = window.visualViewport
    Object.defineProperties(viewport, {
      offsetLeft: { configurable: true, value: 0 },
      offsetTop: { configurable: true, value: 32 },
      width: { configurable: true, value: 390 },
      height: { configurable: true, value: 420 },
    })
    viewport.dispatchEvent(new Event('resize'))
    const commands = document.createElement('div')
    commands.setAttribute('data-trigger-menu', '')
    commands.style.maxHeight = '400px'
    commands.innerHTML = '<div role="listbox"><button role="option">Command</button></div>'
    document.querySelector('#composer').append(commands)
    const tools = document.createElement('div')
    tools.setAttribute('data-context-menu', '')
    // Host omits role="menu" during transition phases; verify fitPopup still matches without role
    tools.innerHTML = '<button role="menuitem">Workspace tool</button>'
    document.body.append(tools)
  })
  await page.waitForFunction(() => document.querySelectorAll('[data-dcu-viewport-menu]').length === 2)
  const keyboard = await measure()
  assert.equal(keyboard.frame.y, 32)
  assert.equal(keyboard.frame.height, 420)
  assert.equal(keyboard.settings.y, 32)
  assert.equal(keyboard.settings.height, 420)
  assert.ok(keyboard.settingsHeader.bottom <= keyboard.settingsNavigation.y)
  assert.ok(keyboard.settingsNavigation.bottom <= keyboard.settingsContent.y)
  assert.ok(keyboard.settingsContent.height > 200)
  await page.locator('#deep-settings-input').scrollIntoViewIfNeeded()
  await page.locator('#deep-settings-input').focus()
  const scrolled = await measure()
  assert.deepEqual(scrolled.settingsHeader, keyboard.settingsHeader)
  assert.deepEqual(scrolled.settingsBack, keyboard.settingsBack)
  assert.ok(await page.locator('.host_options').evaluate(el => el.scrollTop) > 0)
  assert.equal(await page.locator('[data-shortcut-modal="settings"]').evaluate(el => el.scrollTop), 0)
  assert.equal(keyboard.compact, true)
  assert.ok(keyboard.composer.bottom < 452, JSON.stringify(keyboard.composer))
  assert.equal(keyboard.editorMaxHeight, '240px')
  const contextAction = await page.locator('[data-context-menu] [role="menuitem"]').boundingBox()
  assert.ok(contextAction.height >= 44)
  const menuBoxes = await page.evaluate(() => [...document.querySelectorAll('[data-dcu-viewport-menu]')].map(menu => {
    const { left, right, top, bottom } = menu.getBoundingClientRect()
    return { left, right, top, bottom }
  }))
  for (const box of menuBoxes) {
    assert.ok(box.left >= 8 && box.right <= 382, JSON.stringify(box))
    assert.ok(box.top >= 40 && box.bottom <= 444, JSON.stringify(box))
  }
  const menuGap = keyboard.composer.y - menuBoxes[0].bottom
  assert.ok(menuGap >= 0 && menuGap <= 8, `Command menu gap: ${menuGap}px`)

  await page.evaluate(() => {
    const viewport = window.visualViewport
    Object.defineProperties(viewport, {
      scale: { configurable: true, value: 2 },
      offsetLeft: { configurable: true, value: 54 },
      width: { configurable: true, value: 195 },
      height: { configurable: true, value: 300 },
    })
    viewport.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--dcu-viewport-width') === '195px')
  const zoomed = await measure()
  assert.equal(zoomed.compact, false)
  assert.equal(zoomed.frame.x, 0)
  assert.equal(zoomed.frame.y, 0)
  assert.equal(zoomed.frame.width, 390)
  assert.equal(zoomed.frame.height, 844)
  assert.equal(zoomed.settings.x, 54)
  assert.equal(zoomed.settings.width, 195)

  await page.evaluate(() => document.documentElement.setAttribute('data-windows-titlebar', ''))
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-dcu-mobile-web'))
  assert.equal(await page.locator('[data-dcu-viewport-menu]').count(), 0)
  await page.evaluate(() => document.documentElement.removeAttribute('data-windows-titlebar'))
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-dcu-mobile-web'))
  await page.evaluate(() => window.__disposeMobile())
  assert.equal(await page.locator('[data-dcu-mobile-web], [data-dcu-short-viewport], [data-dcu-viewport-menu]').count(), 0)
  assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--dcu-viewport-height')), '')
} finally {
  await browser.close()
}

console.log('Mobile web geometry passed')
