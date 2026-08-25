import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import {
  ABOUT_SETTINGS_NAV_ORDER,
  applySettingsNavIcons,
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
assert.equal(settingsNavIconId('关于'), 'about', '关于必须使用问号圆环图标，而不是通用齿轮')
assert.equal(settingsNavIconId('已归档'), 'archive')
assert.equal(settingsNavIconId('Archived'), 'archive')
assert.equal(SETTINGS_NAV_ICON_HTML.experts.includes('M11.0307 5.46369'), true, '专家必须使用侧栏用户图标')
assert.equal(SETTINGS_NAV_ICON_HTML.skills.includes('M12.5113 15.4067'), true, '技能必须使用侧栏技能图标')
assert.equal(SETTINGS_NAV_ICON_HTML.plugins.includes('translate(1.292 1.3)'), true, '插件必须使用侧栏个性化图标')
assert.equal(SETTINGS_NAV_ICON_HTML.connectors.includes('M9.94133 6.50173'), true, '连接器必须使用侧栏链接图标')
assert.equal(SETTINGS_NAV_ICON_HTML.schedule.includes('M8 1.15A6.85'), true, '定时任务必须使用侧栏时钟图标')
assert.equal(SETTINGS_NAV_ICON_HTML.assistant.includes('M2.15 2.9h11.7v8.2'), true, 'IM 必须使用侧栏气泡图标')
assert.equal(SETTINGS_NAV_ICON_HTML.archive.includes('M15.8659 2.05975'), true, '已归档必须使用归档盒图标')
assert.equal(SETTINGS_NAV_ICON_HTML.about.includes('M12.5757 7.00012'), true, '关于必须使用官方问号圆环图标')

const fixture = new JSDOM(`
  <div role="dialog">
    <nav><div>
      <button><svg></svg><span>关于</span></button>
      <button><svg></svg><span>侧边卡片</span></button>
    </div></nav>
  </div>
`)
const [aboutButton, sideCardButton] = fixture.window.document.querySelectorAll<HTMLButtonElement>('button')
assert.equal(applySettingsNavIcons(fixture.window.document), 1, '关于导航必须同时应用图标与置底规则')
assert.equal(aboutButton?.hasAttribute('data-dcu-settings-about-last'), true, '关于导航必须带稳定置底标记')
assert.equal(aboutButton?.style.getPropertyValue('order'), ABOUT_SETTINGS_NAV_ORDER, '关于导航必须使用 CSS 最大层级排在末尾')
assert.equal(aboutButton?.style.getPropertyPriority('order'), 'important', '置底规则必须覆盖外部插件样式')
assert.equal(sideCardButton?.style.getPropertyValue('order'), '', '不得改变其他插件设置入口的顺序')
assert.equal(applySettingsNavIcons(fixture.window.document), 0, '重复观察设置导航时不得产生额外修改')

const observer = readFileSync(new URL('../src/client/settings-nav-icons.ts', import.meta.url), 'utf8')
assert.match(observer, /requestAnimationFrame/, '设置导航观察必须按帧合并，与其他观察器一致')
assert.match(observer, /cancelAnimationFrame/, '卸载时必须取消挂起的设置导航帧')
