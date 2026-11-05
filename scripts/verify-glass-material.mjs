/**
 * 玻璃材质「计算样式」校验：在真实 Chromium 里把样式注入 fixture 页面，
 * 读取 dock 伪元素 / 输入卡片伪元素 / 顶栏的实际 backdrop-filter。
 *
 * 为什么需要它：单测里对 GLASS_CSS_TEXT 的字符串包含断言只能证明「规则还在」，
 * 证明不了「规则命中了正确的模式」。曾经就出现过 12px 模糊下限的选择器写成
 * [data-dsh-glass]（两种模式都命中），把 compat + clear 预设本该是 0 的模糊
 * 悄悄抬到 12px —— 这套断言就是为这类「范围泄漏」兜底的。
 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import ts from 'typescript'

/** 把 TS 源码里的常量取出来（去掉 import，避免依赖其它模块），返回可在页面里 eval 的脚本 */
function moduleToScript(path, extraExports = '') {
  const source = readFileSync(path, 'utf8')
    .replace(/^import[\s\S]*?from .*$/gm, '')
    .replaceAll('export ', '')
  const script = ts.transpileModule(source + '\n' + extraExports, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
      removeComments: false,
    },
  }).outputText
  return script
}

const seamScript = moduleToScript('src/client/theme/glass-seams.ts')
const glassScript = moduleToScript(
  'src/client/theme/glass.ts',
  'window.__glass = { applyGlassSettings };',
)
const genScript = moduleToScript(
  'src/client/theme/glass-css.gen.ts',
  'window.__gen = { GLASS_CSS_TEXT };',
)

const FIXTURE = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; height: 100vh; }
  [data-phase] { position: relative; height: 100vh; }
  [data-dsh-glass-inputbar] { position: absolute; bottom: 0; left: 0; right: 0; height: 80px; }
  .dock { position: relative; height: 40px; }
  header { height: 85px; margin: 12px 46px 0; }
  [data-composer-card] { position: relative; height: 60px; margin: 0 46px; }
</style></head><body>
<div data-phase="active">
  <header><span>标题</span></header>
  <div data-composer-card><span>输入</span></div>
  <div data-dsh-glass-inputbar><div class="dock"><span>统计</span></div></div>
</div>
</body></html>`

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.route('http://glass.test/', route =>
    route.fulfill({ contentType: 'text/html', body: FIXTURE }),
  )
  await page.goto('http://glass.test/')
  await page.addScriptTag({ content: genScript })
  await page.addScriptTag({ content: seamScript })
  await page.addScriptTag({ content: glassScript })

  /** 按模式 + 预设渲染，并读回三段计算样式 */
  const render = (mode, preset) =>
    page.evaluate(({ mode, preset }) => {
      const { applyGlassSettings } = window.__glass
      document.body.setAttribute('data-ds-dark-theme', '')
      applyGlassSettings({ enabled: true, mode, preset })
      const filterOf = (selector, pseudo) => {
        const el = document.querySelector(selector)
        if (el === null) return 'MISSING'
        return getComputedStyle(el, pseudo).backdropFilter
      }
      return {
        dock: filterOf('.dock', '::before'),
        card: filterOf('[data-dcu-glass-composer-surface]', null),
        header: filterOf('header', null),
        fadeCss: /\[data-dsh-glass-fade\]/.test(window.__gen.GLASS_CSS_TEXT),
      }
    }, { mode, preset })

  const rows = []
  const check = (label, actual, predicate, expectation) => {
    rows.push({ label, actual, ok: predicate(actual) })
    assert.ok(predicate(actual), `${label}：期望 ${expectation}，实际 ${actual}`)
  }

  // 1. 云母 + standard(14px)：三处都应等于预设值（12px 下限不改变 14px）
  const micaStandard = await render('mica', 'standard')
  check('云母·standard dock 模糊', micaStandard.dock, v => v === 'blur(14px)', 'blur(14px)')
  check('云母·standard 卡片模糊', micaStandard.card, v => v === 'blur(14px)', 'blur(14px)')
  check('云母·standard 顶栏模糊', micaStandard.header, v => v === 'blur(14px)', 'blur(14px)')

  // 2. 云母 + frosted(20px)：预设更高时不得被下限压回去
  const micaFrosted = await render('mica', 'frosted')
  check('云母·frosted dock 模糊', micaFrosted.dock, v => v === 'blur(20px)', 'blur(20px)')
  check('云母·frosted 顶栏模糊', micaFrosted.header, v => v === 'blur(20px)', 'blur(20px)')

  // 3. 云母 + clear(0px)：下限兜底生效（这正是「防漏字」的意图）
  const micaClear = await render('mica', 'clear')
  check('云母·clear dock 下限', micaClear.dock, v => v === 'blur(12px)', 'blur(12px)')
  check('云母·clear 卡片下限', micaClear.card, v => v === 'blur(12px)', 'blur(12px)')
  check('云母·clear 顶栏下限', micaClear.header, v => v === 'blur(12px)', 'blur(12px)')

  // 4. compat + clear(0px)：模糊必须交还上游，绝不能被下限抬到 12px（回归守卫）
  const compatClear = await render('compat', 'clear')
  check(
    'compat·clear dock 不得被下限抬高',
    compatClear.dock,
    v => v === 'none' || v === 'blur(0px)',
    'none 或 blur(0px)',
  )
  check('compat·clear 卡片沿用上游 12px', compatClear.card, v => v === 'blur(12px)', 'blur(12px)')
  check('compat·clear 顶栏不得加模糊下限', compatClear.header, v => v === 'none', 'none')

  // 5. compat + frosted(20px)：卡片仍是上游固定的 12px（不被预设带成 20px）
  const compatFrosted = await render('compat', 'frosted')
  check('compat·frosted 卡片固定 12px', compatFrosted.card, v => v === 'blur(12px)', 'blur(12px)')
  check(
    'compat·frosted dock 跟随上游预设',
    compatFrosted.dock,
    v => v === 'blur(20px)',
    'blur(20px)',
  )

  // 模拟任意外扩装饰，而不是针对某个皮肤写特判。
  await page.addStyleTag({ content: `
    body { --dsw-alias-bg-layer-1: #203050; }
    body[data-test-decoration] [data-composer-card]::before {
      content: ''; position: absolute; inset: -20px -14px -18px; z-index: 1;
      border: 3px solid red;
    }
    [data-composer-card]::after { content: ''; position: absolute; inset: 0; border: 1px dashed blue; }
  ` })
  await page.evaluate(() => document.body.setAttribute('data-test-decoration', ''))
  for (const mode of ['mica', 'compat']) {
    for (const preset of ['clear', 'standard', 'frosted']) {
      const state = await page.evaluate(({ mode, preset }) => {
        window.__glass.applyGlassSettings({ enabled: true, mode, preset })
        const card = document.querySelector('[data-composer-card]')
        const before = getComputedStyle(card, '::before')
        const after = getComputedStyle(card, '::after')
        const surface = card.querySelector('[data-dcu-glass-composer-surface]')
        const glass = getComputedStyle(surface)
        const bounds = card.getBoundingClientRect()
        const layer = surface.getBoundingClientRect()
        return {
          before: { background: before.backgroundColor, filter: before.backdropFilter, inset: before.inset, z: before.zIndex, border: before.borderTopStyle },
          after: after.borderTopStyle,
          surface: { filter: glass.backdropFilter, background: glass.backgroundColor, z: glass.zIndex, pointer: glass.pointerEvents, width: layer.width, height: layer.height },
          card: { width: bounds.width, height: bounds.height },
        }
      }, { mode, preset })
      assert.equal(state.before.background, 'rgba(0, 0, 0, 0)', `${mode}/${preset} 装饰不得被玻璃底色覆盖`)
      assert.equal(state.before.filter, 'none', `${mode}/${preset} 装饰不得被磨砂覆盖`)
      assert.equal(state.before.inset, '-20px -14px -18px')
      assert.equal(state.before.z, '1')
      assert.equal(state.before.border, 'solid')
      assert.equal(state.after, 'dashed')
      assert.equal(state.surface.filter, mode === 'compat' ? 'blur(12px)' : preset === 'frosted' ? 'blur(20px)' : preset === 'standard' ? 'blur(14px)' : 'blur(12px)')
      assert.notEqual(state.surface.background, 'rgba(0, 0, 0, 0)')
      assert.equal(state.surface.z, '-1')
      assert.equal(state.surface.pointer, 'none')
      assert.ok(Math.abs(state.surface.width - state.card.width) <= 2)
      assert.ok(Math.abs(state.surface.height - state.card.height) <= 2)
    }
  }
  console.log('通用外扩装饰与玻璃层共存：两种模式、三种预设均通过')
  console.log('玻璃材质计算样式校验：')
  for (const row of rows) {
    console.log(`  ${row.ok ? '✓' : '×'} ${row.label} = ${row.actual}`)
  }
  console.log(`共 ${rows.length} 项断言通过`)
} finally {
  await browser.close()
}
