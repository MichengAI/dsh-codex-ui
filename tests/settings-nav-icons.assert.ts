import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import {
  ABOUT_SETTINGS_NAV_ORDER,
  applySettingsNavIcons,
  observeSettingsNavIcons,
  settingsNavIconId,
  SETTINGS_NAV_ICON_HTML,
} from '../src/client/settings-nav-icons.ts'

assert.equal(settingsNavIconId('专家'), 'experts')
assert.equal(settingsNavIconId('Experts'), 'experts')
assert.equal(settingsNavIconId('技能'), 'skills')
assert.equal(settingsNavIconId('Skills'), 'skills')
assert.equal(settingsNavIconId('插件'), 'plugins')
assert.equal(settingsNavIconId('Plugins'), 'plugins')
assert.equal(settingsNavIconId('连接器'), 'connectors')
assert.equal(settingsNavIconId('Connectors'), 'connectors')
assert.equal(settingsNavIconId('定时任务'), 'schedule')
assert.equal(settingsNavIconId('Scheduled tasks'), 'schedule')
assert.equal(settingsNavIconId('IM助理'), 'assistant')
assert.equal(settingsNavIconId('IM Assistant'), 'assistant')
assert.equal(settingsNavIconId('插件市场'), 'plugins', '插件市场必须复用首页插件图标')
assert.equal(settingsNavIconId('Plugin Market'), 'plugins')
assert.equal(settingsNavIconId('内置插件'), 'plugins', '官方内置插件设置必须复用首页插件图标')
assert.equal(settingsNavIconId('Built-in plugins'), 'plugins')
assert.equal(settingsNavIconId('插件管理'), 'plugins', '设置里的插件管理必须复用首页插件图标')
assert.equal(settingsNavIconId('Plugin manager'), 'plugins')
assert.equal(settingsNavIconId('Codex UI'), 'about', 'Codex UI 必须使用问号圆环图标，而不是通用齿轮')
assert.equal(settingsNavIconId('关于'), undefined, '旧中文入口不再识别为 Codex UI')
assert.equal(settingsNavIconId('About'), undefined, '旧英文入口不再识别为 Codex UI')
assert.equal(settingsNavIconId('已归档'), 'archive')
assert.equal(settingsNavIconId('Archived'), 'archive')
assert.equal(settingsNavIconId('归档会话'), 'archive')
assert.equal(settingsNavIconId('Archived sessions'), 'archive')
assert.equal(SETTINGS_NAV_ICON_HTML.experts.includes('M11.0307 5.46369'), true, '专家必须使用侧栏用户图标')
assert.equal(SETTINGS_NAV_ICON_HTML.skills.includes('M12.5113 15.4067'), true, '技能必须使用侧栏技能图标')
assert.equal(SETTINGS_NAV_ICON_HTML.plugins.includes('translate(1.292 1.3)'), true, '插件必须使用侧栏个性化图标')
assert.equal(SETTINGS_NAV_ICON_HTML.connectors.includes('M9.94133 6.50173'), true, '连接器必须使用侧栏链接图标')
assert.equal(SETTINGS_NAV_ICON_HTML.schedule.includes('M8 1.15A6.85'), true, '定时任务必须使用侧栏时钟图标')
assert.equal(SETTINGS_NAV_ICON_HTML.assistant.includes('M2.15 2.9h11.7v8.2'), true, 'IM 必须使用侧栏气泡图标')
assert.equal(SETTINGS_NAV_ICON_HTML.archive.includes('M15.8659 2.05975'), true, '已归档必须使用归档盒图标')
assert.equal(SETTINGS_NAV_ICON_HTML.about.includes('M12.5757 7.00012'), true, 'Codex UI 必须使用官方问号圆环图标')

const fixture = new JSDOM(`
  <div role="dialog">
    <nav><div>
      <button><svg></svg><span>Codex UI</span></button>
      <button><svg></svg><span>侧边卡片</span></button>
      <button><span><svg></svg></span><span>定时任务</span></button>
    </div></nav>
  </div>
`)
const [aboutButton, sideCardButton, wrappedIconButton] = fixture.window.document.querySelectorAll<HTMLButtonElement>('button')
assert.equal(applySettingsNavIcons(fixture.window.document), 1, 'Codex UI 导航必须同时应用图标与置底规则')
assert.equal(aboutButton?.hasAttribute('data-dcu-settings-about-last'), true, 'Codex UI 导航必须带稳定置底标记')
assert.equal(aboutButton?.style.getPropertyValue('order'), ABOUT_SETTINGS_NAV_ORDER, 'Codex UI 导航必须使用 CSS 最大层级排在末尾')
assert.equal(aboutButton?.style.getPropertyPriority('order'), 'important', '置底规则必须覆盖外部插件样式')
assert.equal(sideCardButton?.style.getPropertyValue('order'), '', '不得改变其他插件设置入口的顺序')
assert.equal(wrappedIconButton?.hasAttribute('data-dcu-nav-icon'), false, '包裹型图标不能被当成宿主直出图标')
assert.equal(wrappedIconButton?.querySelector('.dcu-settings-nav-icon'), null, '包裹型图标不应注入额外 mask')
assert.equal(aboutButton?.getAttribute('data-dcu-nav-icon'), 'about', '导航按钮必须带插件图标 marker')
assert.equal(aboutButton?.querySelector('svg')?.innerHTML, '', '不得改写宿主 svg 内容')
assert.equal(aboutButton?.children.length, 2, '禁止向 button 插入任何真实 DOM 节点')
assert.match(aboutButton?.style.getPropertyValue('--dcu-settings-nav-icon-mask') ?? '', /^url\("data:image\/svg\+xml,/, '导航图标必须使用独立 mask')
assert.equal(applySettingsNavIcons(fixture.window.document), 0, '重复观察设置导航时不得产生额外修改')

const observer = readFileSync(new URL('../src/client/settings-nav-icons.ts', import.meta.url), 'utf8')
assert.match(observer, /requestAnimationFrame/, '设置导航观察必须按帧合并，与其他观察器一致')
assert.match(observer, /cancelAnimationFrame/, '卸载时必须取消挂起的设置导航帧')

const cleanupDom = new JSDOM(
  '<div role="dialog"><nav><button><svg></svg><span>Codex UI</span></button></nav></div>',
  { pretendToBeVisual: true },
)
const savedGlobals: Record<string, PropertyDescriptor | undefined> = {}
for (const key of ['document', 'window', 'MutationObserver']) savedGlobals[key] = Object.getOwnPropertyDescriptor(globalThis, key)
Object.defineProperties(globalThis, {
  document: { configurable: true, writable: true, value: cleanupDom.window.document },
  window: { configurable: true, writable: true, value: cleanupDom.window },
  MutationObserver: { configurable: true, writable: true, value: cleanupDom.window.MutationObserver },
})
try {
  const dispose = observeSettingsNavIcons()
  const button = cleanupDom.window.document.querySelector<HTMLButtonElement>('[role="dialog"] nav button')
  assert.equal(button?.getAttribute('data-dcu-nav-icon'), 'about', '观察器必须装饰设置导航按钮')
  assert.notEqual(cleanupDom.window.document.getElementById('dcu-settings-nav-icon-style'), null, '观察器必须注入图标样式')
  dispose()
  assert.equal(button?.hasAttribute('data-dcu-nav-icon'), false, '卸载时必须移除导航图标 marker')
  assert.equal(cleanupDom.window.document.getElementById('dcu-settings-nav-icon-style'), null, '卸载时必须移除注入样式')
} finally {
  for (const [key, descriptor] of Object.entries(savedGlobals)) {
    if (descriptor === undefined) delete (globalThis as Record<string, unknown>)[key]
    else Object.defineProperty(globalThis, key, descriptor)
  }
}
