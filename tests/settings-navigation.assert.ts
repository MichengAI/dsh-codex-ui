import assert from 'node:assert/strict'
import { pickSettingsSectionButton } from '../src/client/settings-navigation.ts'

const plugins = { textContent: '插件' }
const market = { textContent: '插件市场' }
const about = { textContent: ' 关于 ' }

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