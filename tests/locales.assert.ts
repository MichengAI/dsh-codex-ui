import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { en, zh } from '../src/client/locales.ts'

const CJK = /[㐀-鿿]/
const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../src')

function collectSource(dir: string): string {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return [collectSource(path)]
    return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [readFileSync(path, 'utf8')] : []
  }).join('\n')
}

const source = collectSource(srcRoot)
const locales = readFileSync(join(srcRoot, 'client/locales.ts'), 'utf8')
const channelBrowser = readFileSync(join(srcRoot, 'client/ChannelBrowser.tsx'), 'utf8')
const connectorsSection = readFileSync(join(srcRoot, 'client/ConnectorsSection.tsx'), 'utf8')
const clientIndex = readFileSync(join(srcRoot, 'client/index.ts'), 'utf8')
const aboutSection = readFileSync(join(srcRoot, 'client/AboutSection.tsx'), 'utf8')
const used = source.replace(locales, '')

for (const [key, value] of Object.entries(en)) {
  assert.doesNotMatch(value, CJK, `英文词典 ${key} 不得残留中日韩字符`)
  const zhParams = [...zh[key as keyof typeof zh].matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort()
  const enParams = [...value.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort()
  assert.deepEqual(enParams, zhParams, `中英文词典 ${key} 的占位符必须一致`)
}

assert.equal(en['channel.weixin'], 'WeChat')
assert.equal(en['channel.wecom'], 'WeCom')
assert.match(channelBrowser, /const CHANNEL_LOCALE_KEYS =/)
assert.match(channelBrowser, /title=\{label\}/, '频道文件夹名必须使用 Codex UI 的 locale 字典')
assert.doesNotMatch(connectorsSection, /已带入新会话|title="MCP连接器"/, '连接器市场的可见文案不得硬编码中文')
assert.match(connectorsSection, /t\('connectors\.promptReady'\)/, '连接器成功回执必须使用 locale 字典')
assert.doesNotMatch(clientIndex, /throw new Error\('[^']*[㐀-鿿][^']*'\)/, '示例 Prompt 错误不得硬编码中文')
assert.doesNotMatch(aboutSection, /return message !== '' \? message/, '关于页不得直接显示 Host 返回的未本地化错误')

const dead: string[] = []
for (const key of Object.keys(zh)) {
  if (used.includes(`'${key}'`) || used.includes(`"${key}"`)) continue
  if (key.startsWith('search.') && used.includes('search.${')) continue
  if (key.startsWith('permission.') && used.includes('permission.${')) continue
  if (key.startsWith('about.dependency.') && used.includes('about.dependency.${')) continue
  if (key.startsWith('about.progress.') && used.includes('about.progress.${')) continue
  dead.push(key)
}
assert.deepEqual(dead, [], `词典不得保留未被引用的键：${dead.join(', ')}`)
