import assert from 'node:assert/strict'
import { pickSettingsSectionButton, routeOptionalSettingsSection } from '../src/client/settings-navigation.ts'

const plugins = { textContent: '插件' }
const market = { textContent: '插件市场' }
const about = { textContent: ' Codex UI ' }

assert.equal(
  pickSettingsSectionButton([plugins, about], ['插件市场', '插件']),
  plugins,
  '未安装市场时必须回退到原生插件管理',
)
assert.equal(
  pickSettingsSectionButton([plugins, market, about], ['插件市场', '插件']),
  market,
  '已安装市场时必须优先进入插件市场',
)
assert.equal(
  pickSettingsSectionButton([about], ['插件市场', '插件']),
  undefined,
  '两个目标分区都不存在时不得误点其他设置页',
)

const unavailableCalls: string[] = []
routeOptionalSettingsSection(
  false,
  () => { unavailableCalls.push('requested') },
  () => { unavailableCalls.push('fallback') },
)
assert.deepEqual(unavailableCalls, ['fallback'], '可选插件未注册时必须同步打开兜底页，不得等待设置导航超时')

const availableCalls: string[] = []
routeOptionalSettingsSection(
  true,
  () => { availableCalls.push('requested') },
  () => { availableCalls.push('fallback') },
)
assert.deepEqual(availableCalls, ['requested'], '可选插件已注册时必须继续打开其设置页')
