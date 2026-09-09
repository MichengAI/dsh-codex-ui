/** 使用生产 iframe 构建物验证加载、关闭与键盘协议；测试插件仅模拟公开组件合约。 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const assets = new Map([
  ['/api/dsh-codex-ui/usage/frame', ['text/html', readFileSync('assets/usage-frame.html', 'utf8')]],
  ['/api/dsh-codex-ui/usage/frame.js', ['text/javascript', readFileSync('lib/usage-frame.js', 'utf8')]],
  ['/api/dsh-codex-ui/usage/frame.css', ['text/css', readFileSync('lib/usage-frame.css', 'utf8')]],
])
const plugin = `window.__ModuleLoader__.load({factory(require){const R=require('react'),{Modal}=require('@deepseek-ai/dsh-client-ui-primitives');const h=R.createElement;return {UsageBilling:function P(props){const [open,setOpen]=R.useState(false),[nested,setNested]=R.useState(false),[menu,setMenu]=R.useState(false),[crashed,setCrashed]=R.useState(false);R.useEffect(()=>{if(!menu)return;const close=e=>{if(e.key==='Escape')setMenu(false)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[menu]);R.useEffect(()=>props.registerOpen(()=>setOpen(true)),[]);if(crashed)throw new Error('test render crash');return h(Modal,{open,onClose:()=>setOpen(false),className:'dsh-billing-modal',headless:true,title:'Dashboard'},h('div',{'data-testid':'billing-dashboard'},h('button',{id:'first',onClick:()=>setNested(true)},'Nested'),h('button',{id:'dismiss',onClick:()=>setOpen(false)},'Close panel'),h('button',{id:'menu-open',onClick:()=>setMenu(true)},'Menu'),menu&&h('div',{role:'menu',id:'menu'},h('button',{},'Option')),h('button',{id:'crash',onClick:()=>setCrashed(true)},'Crash'),h('button',{id:'last'},'Last'),h(Modal,{open:nested,onClose:()=>setNested(false),title:'Nested'},h('button',{id:'nested'},'Inner'))))}}}})`
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  let missing = false, requested = 0
  await page.route('http://usage.test/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/dsh-codex-ui/usage/plugin.js') {
      requested++
      return route.fulfill({ status: missing ? 404 : 200, contentType: 'text/javascript', body: missing ? '' : plugin })
    }
    if (assets.has(path)) { const [contentType, body] = assets.get(path); return route.fulfill({ contentType, body }) }
    return route.fulfill({ contentType: 'text/html', body: `<button id="before">Before</button><iframe src="/api/dsh-codex-ui/usage/frame" style="width:900px;height:650px"></iframe><button id="after">After</button><script>window.events=[];window.connect=()=>{const w=document.querySelector('iframe').contentWindow;w.dcuUsageHost={getSnapshot:()=>null,subscribe:()=>()=>{},actions:{},translate:k=>k,checkModels:async()=>[],publishCosts:()=>{},ready:()=>events.push('ready'),dismissed:()=>events.push('dismissed'),close:()=>events.push('close'),failed:m=>events.push('failed'),focusOutside:back=>document.querySelector(back?'#before':'#after').focus()};w.postMessage({type:'dcu-usage-init'},location.origin)}</script>` })
  })
  await page.goto('http://usage.test/')
  assert.equal(requested, 0, '桥接前不加载费用插件，避免丢失早期错误')
  await page.evaluate(() => window.connect())
  await page.waitForFunction(() => window.events.includes('ready'))
  const frame = page.frameLocator('iframe')
  await frame.locator('#first').click()
  await frame.locator('#nested').focus()
  await page.keyboard.press('Escape')
  await frame.locator('#nested').waitFor({ state: 'hidden' })
  assert.equal(await frame.locator('[data-testid=billing-dashboard]').count(), 1)
  assert.deepEqual(await page.evaluate(() => window.events), ['ready'])
  await frame.locator('#menu-open').click()
  await page.keyboard.press('Escape')
  await frame.locator('#menu').waitFor({ state: 'hidden' })
  assert.equal(await frame.locator('[data-testid=billing-dashboard]').count(), 1)
  assert.deepEqual(await page.evaluate(() => window.events), ['ready'])
  await frame.locator('#first').focus()
  await page.keyboard.press('Shift+Tab')
  assert.equal(await page.locator('#before').evaluate(el => el === document.activeElement), true)
  await frame.locator('#last').focus()
  await page.keyboard.press('Tab')
  assert.equal(await page.locator('#after').evaluate(el => el === document.activeElement), true)
  await frame.locator('#last').focus()
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => window.events.filter(e => e === 'close').length), 1)
  await frame.locator('#dismiss').click()
  await page.waitForFunction(() => window.events.includes('dismissed'))
  assert.equal(await page.evaluate(() => window.events.filter(e => e === 'close').length), 1)
  await page.reload()
  await page.evaluate(() => window.connect())
  await page.waitForFunction(() => window.events.includes('ready'))
  await frame.locator('#crash').click()
  await page.waitForFunction(() => window.events.includes('failed'))
  await frame.locator('[data-testid=billing-dashboard]').waitFor({ state: 'detached' })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())))
  const crashEvents = await page.evaluate(() => window.events)
  assert.equal(crashEvents.includes('dismissed'), false, '渲染崩溃不得报告为主动关闭')
  assert.equal(crashEvents.at(-1), 'failed')
  missing = true
  await page.reload()
  await page.evaluate(() => window.connect())
  await page.waitForFunction(() => window.events.includes('failed'), { timeout: 2000 })
  assert.equal(await page.evaluate(() => window.events.includes('ready')), false)
  console.log('生产费用 iframe：握手后加载、资源404即时反馈、内层Escape、显式退出、面板关闭、就绪后崩溃及Tab返回通过。')
} finally { await browser.close() }
