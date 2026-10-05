/** Verify the retained rail against the installed host's actual frame CSS. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { chromium } from 'playwright'
const sidebar = readFileSync('src/client/CodexSidebar.tsx', 'utf8')
const stylesheet = sidebar.match(/const stylesheet = `([\s\S]*?)`/)?.[1]
const captionStyle = readFileSync('src/client/DesktopNavigationControls.tsx', 'utf8').match(/CONTROLS_STYLE = `([\s\S]*?)`/)?.[1]
const host = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js', 'utf8')
const hostStyle = host.match(/const css = ("(?:[^"\\]|\\.)*");/)
assert.ok(stylesheet)
assert.ok(captionStyle)
assert.ok(hostStyle)
const css = JSON.parse(hostStyle[1])
const classOf = suffix => css.match(new RegExp('\\.([A-Za-z0-9_]+_' + suffix + ')\\{'))?.[1]
const implementation = ts.transpileModule(readFileSync('src/client/sidebar-width.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText.replace(/^export /gm, '')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const platform of ['web', 'windows', 'darwin']) {
    await page.setContent('<style>html,body{height:100%;margin:0}html{--dsh-windows-titlebar-height:40px}</style><div id="frame" class="' + classOf('frame') + '" style="grid-template-columns:320px minmax(0px, 1fr) minmax(0px, 180px)"><div class="' + classOf('sidebarCol') + '"><aside class="dcu-root dcu-compact"><div class="dcu-compact-shell"><button class="dcu-icon" aria-label="展开侧边栏">☰</button><nav class="dcu-compact-nav"><button class="dcu-icon" aria-label="新建任务">+</button><button class="dcu-icon" aria-label="搜索会话">⌕</button><button class="dcu-icon" aria-label="设置">⚙</button></nav></div></aside></div><main class="' + classOf('centerCol') + '">Conversation</main><div class="' + classOf('rightbarCol') + '"></div></div>')
    await page.addStyleTag({content:css + stylesheet})
    await page.addStyleTag({content:captionStyle})
    await page.evaluate(() => {
      const caption = document.createElement('div')
      caption.className = 'dcu-desktop-navigation'
      caption.innerHTML = '<button aria-label="后退">←</button><button aria-label="前进">→</button>'
      document.querySelector('.dcu-root').append(caption)
    })
    await page.evaluate(platform => {
      document.documentElement.removeAttribute('data-windows-titlebar')
      document.documentElement.removeAttribute('data-platform')
      document.documentElement.removeAttribute('data-fullscreen')
      if (platform === 'windows') document.documentElement.setAttribute('data-windows-titlebar', '')
      if (platform === 'darwin') document.documentElement.setAttribute('data-platform', 'darwin')
    }, platform)
    await page.addScriptTag({content:implementation})
    await page.evaluate(() => {
      window.disposeRail = observeSlimSidebar()
      const frame = document.getElementById('frame')
      applySidebarWidth(frame, 360)
      frame.setAttribute('data-sidebar-collapsed', '')
      frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 180px)'
      document.querySelector('[aria-label="展开侧边栏"]').onclick = () => {
        frame.removeAttribute('data-sidebar-collapsed')
        frame.style.gridTemplateColumns = '280px minmax(0px, 1fr) minmax(0px, 180px)'
        document.querySelector('.dcu-root').classList.remove('dcu-compact')
      }
    })
    await page.evaluate(async () => { for(let i=0;i<4;i++) await new Promise(requestAnimationFrame) })
    assert.equal(await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('frame')).gridTemplateColumns)),56,platform)
    assert.equal(await page.evaluate(() => document.getElementById('frame').style.getPropertyValue('--dcu-sidebar-expanded-width')),'360px')
    const caption = page.getByRole('button', {name:'后退',exact:true})
    assert.equal(await caption.isVisible(),platform === 'windows')
    if (platform === 'windows') {
      assert.deepEqual(await caption.boundingBox(),{x:12,y:6,width:28,height:28})
      assert.ok(await caption.evaluate(el => { const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+14,r.y+14)) }))
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--dsh-windows-menu-start').trim()),'84px')
    }
    for (const name of ['展开侧边栏','新建任务','搜索会话','设置']) {
      const button = page.getByRole('button',{name,exact:true})
      assert.ok(await button.isVisible(),platform + ': ' + name)
      assert.ok(await button.evaluate(el => { const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)) }),platform + ': rail action must be hit-testable')
    }
    await page.evaluate(() => document.documentElement.setAttribute('data-fullscreen',''))
    assert.equal(await caption.isVisible(),false,'Fullscreen retains rail actions without caption overlap')
    if (platform === 'windows') {
      assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--dsh-windows-menu-start').trim()),'84px','Fullscreen must release the plugin menu offset')
    }
    await page.getByRole('button',{name:'展开侧边栏',exact:true}).click()
    await page.evaluate(async () => { for(let i=0;i<4;i++) await new Promise(requestAnimationFrame) })
    assert.equal(await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('frame')).gridTemplateColumns)),360,platform + ': restore resized width')
    await page.evaluate(() => {
      const frame = document.getElementById('frame')
      frame.setAttribute('data-sidebar-collapsed', '')
      frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 180px)'
    })
    await page.evaluate(async () => { for(let i=0;i<4;i++) await new Promise(requestAnimationFrame) })
    assert.equal(await page.evaluate(() => parseFloat(document.getElementById('frame').style.gridTemplateColumns)),56,platform + ': host re-render must retain rail')
    await page.evaluate(() => window.disposeRail())
    assert.equal(await page.evaluate(() => parseFloat(document.getElementById('frame').style.gridTemplateColumns)),platform === 'web' ? 56 : 0,platform + ': unload restores host track')
  }
  console.log('✓ Desktop/Web 56px rail: real host CSS, actions, fullscreen, resized width and rightbar tracks')
} finally { await browser.close() }
