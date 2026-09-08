/** 使用真实 Chromium 验证侧栏动画布局与宽度监听收敛。 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { chromium } from 'playwright'

const source = readFileSync('src/client/CodexSidebar.tsx', 'utf8')
const stylesheet = source.match(/const stylesheet = `([\s\S]*?)`/)?.[1]
assert.ok(stylesheet)
const implementation = ts.transpileModule(readFileSync('src/client/sidebar-width.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText.replace(/^export /gm, '')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent('<style>*{box-sizing:border-box}</style><div id="frame" style="display:grid;height:700px;grid-template-columns:320px minmax(0px, 1fr) 0px"><div style="min-width:0;overflow:hidden"><aside class="dcu-root"><div class="dcu-expanded-shell"><nav class="dcu-menu"><button>扩展管理专家技能插件连接器</button></nav></div><div class="dcu-foot">设置与账户余额</div></aside></div><main></main><div></div><div data-side="sidebar"></div></div>')
  await page.addStyleTag({ content: stylesheet })
  await page.addScriptTag({ content: implementation })
  const result = await page.evaluate(async () => {
    const frame = document.getElementById('frame')
    const root = frame.querySelector('.dcu-root')
    const shell = root.querySelector('.dcu-expanded-shell')
    const foot = root.querySelector('.dcu-foot')
    const nextFrame = () => new Promise(requestAnimationFrame)
    const dispose = observeSlimSidebar()
    for (let i = 0; i < 8; i++) await nextFrame()
    let mutations = 0
    const observer = new MutationObserver(records => { mutations += records.length })
    observer.observe(frame, { attributes: true, subtree: true })
    for (let i = 0; i < 8; i++) await nextFrame()
    const idleMutations = mutations
    const samples = []
    for (const width of [240, 360, 520]) {
      applySidebarWidth(frame, width)
      const expected = shell.getBoundingClientRect().width
      frame.setAttribute('data-sidebar-collapsed', '')
      root.classList.add('dcu-collapsing')
      for (const track of [width, 180, 80, 56]) {
        frame.style.gridTemplateColumns = `${track}px minmax(0px, 1fr) 0px`
        await nextFrame()
        samples.push({ width, track, expected, shell: shell.getBoundingClientRect().width, foot: foot.getBoundingClientRect().width })
      }
      root.classList.add('dcu-compact')
      if (getComputedStyle(shell).display !== 'none') throw new Error('窄轨仍显示宽态菜单')
      root.classList.remove('dcu-compact', 'dcu-collapsing')
      frame.removeAttribute('data-sidebar-collapsed')
      applySidebarWidth(frame, width)
      await nextFrame()
    }
    observer.disconnect()
    dispose()
    // 不依赖宿主主题 token，验证真实过渡包含连续中间帧，而不只检查终态。
    frame.style.transition = ''
    frame.style.gridTemplateColumns = '240px minmax(0px, 1fr) 0px'
    await new Promise(resolve => setTimeout(resolve, 550))
    const motion = []
    for (const target of [56, 240]) {
      const start = parseFloat(getComputedStyle(frame).gridTemplateColumns)
      frame.style.gridTemplateColumns = `${target}px minmax(0px, 1fr) 0px`
      const values = []
      const began = performance.now()
      while (performance.now() - began < 550) {
        await nextFrame()
        values.push(parseFloat(getComputedStyle(frame).gridTemplateColumns))
      }
      motion.push({ start, target, values, duration: getComputedStyle(frame).transitionDuration })
    }
    frame.setAttribute('data-dragging', '')
    const draggingDuration = getComputedStyle(frame).transitionDuration
    return { idleMutations, samples, motion, draggingDuration }
  })
  assert.equal(result.idleMutations, 0, '静止后不应继续写入 DOM 或调度宽度修正')
  for (const sample of result.samples) {
    assert.equal(sample.shell, sample.expected, `动画中菜单被压窄：${JSON.stringify(sample)}`)
    assert.equal(sample.foot, sample.expected, `动画中页脚被压窄：${JSON.stringify(sample)}`)
  }
  for (const { start, target, values, duration } of result.motion) {
    assert.equal(duration, '0.5s', '侧栏宽度必须使用明确的 0.5 秒过渡')
    assert.ok(values.filter(value => value > Math.min(start, target) + 1 && value < Math.max(start, target) - 1).length >= 3, '展开和收起都必须有多个中间帧')
    assert.ok(Math.abs(values.at(-1) - target) < 0.1, '动画结束必须到达目标宽度')
  }
  assert.equal(result.draggingDuration, '0s', '手动拖拽必须立即跟手')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.evaluate(() => { document.getElementById('frame').removeAttribute('data-dragging'); return getComputedStyle(document.getElementById('frame')).transitionDuration }), '0s', '减少动态效果时必须禁用过渡')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  // 复现 desktop 的 dsh-better-sidebar 0.18.0 高优先级布局样式，且让其后加载。
  await page.evaluate(() => {
    const host = document.createElement('div')
    host.id = 'root'
    host.innerHTML = '<div data-slot="root"></div>'
    document.body.append(host)
    host.firstElementChild.append(document.getElementById('frame'))
  })
  await page.addStyleTag({ content: `
    #root{--ds-transition-duration-slow:.3s;--ds-ease-in-out:cubic-bezier(.4,0,.2,1)}
    #root [data-dsh-frame],#root > [data-slot="root"] > div{padding-right:var(--dsh-sidebar-width,0px);transition:padding-right var(--ds-transition-duration-slow) var(--ds-ease-in-out)}
    body[data-dsh-sidebar-dragging] #root [data-dsh-frame],body[data-dsh-sidebar-dragging] #root > [data-slot="root"] > div{transition:none}
  ` })
  const compatible = await page.evaluate(async () => {
    const frame = document.getElementById('frame')
    const transition = getComputedStyle(frame).transitionProperty
    frame.style.gridTemplateColumns = '56px minmax(0px, 1fr) 0px'
    const widths = []
    const start = performance.now()
    while (performance.now() - start < 550) {
      await new Promise(requestAnimationFrame)
      widths.push(parseFloat(getComputedStyle(frame).gridTemplateColumns))
    }
    frame.setAttribute('data-dragging', '')
    const leftDrag = getComputedStyle(frame).transitionDuration
    frame.removeAttribute('data-dragging')
    document.body.setAttribute('data-dsh-sidebar-dragging', '')
    const rightDrag = getComputedStyle(frame).transitionDuration
    document.body.removeAttribute('data-dsh-sidebar-dragging')
    return { transition, widths, leftDrag, rightDrag }
  })
  assert.ok(compatible.transition.includes('grid-template-columns'), '伴随插件不能覆盖左侧栏宽度过渡')
  assert.ok(compatible.transition.includes('padding-right'), '必须保留伴随插件右侧面板过渡')
  assert.ok(compatible.widths.filter(width => width > 57 && width < 239).length >= 3, '组合布局中必须存在连续收缩帧')
  assert.equal(compatible.leftDrag, '0s')
  assert.equal(compatible.rightDrag, '0s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('frame')).transitionDuration), '0s')
  console.log(`侧栏过渡：${result.samples.length} 组布局检查通过，空闲 DOM 更新为 0。`)
} finally {
  await browser.close()
}
