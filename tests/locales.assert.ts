import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { de, en, es, fr, ja, pt, ru, zh } from '../src/client/locales.ts'

const CJK = /[㐀-鿿]/
const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../src')

function collectSource(dir: string): string {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'locales') return []
      return [collectSource(path)]
    }
    return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [readFileSync(path, 'utf8')] : []
  }).join('\n')
}

const source = collectSource(srcRoot)
const locales = readFileSync(join(srcRoot, 'client/locales.ts'), 'utf8')
const clientIndex = readFileSync(join(srcRoot, 'client/index.ts'), 'utf8')
const aboutSection = readFileSync(join(srcRoot, 'client/AboutSection.tsx'), 'utf8')
const used = source.replace(locales, '')

const allLanguages = { en, ja, es, fr, de, ru, pt } as const

for (const [lang, dict] of Object.entries(allLanguages)) {
  const missingInLang = Object.keys(zh).filter(k => !(k in dict))
  const extraInLang = Object.keys(dict).filter(k => !(k in zh))
  assert.deepEqual(missingInLang, [], `${lang} 词典缺失键：${missingInLang.join(', ')}`)
  assert.deepEqual(extraInLang, [], `${lang} 词典多余键：${extraInLang.join(', ')}`)

  for (const [key, value] of Object.entries(dict)) {
    assert.ok(typeof value === 'string' && value.trim() !== '', `${lang} 词典 ${key} 不得为空`)
    if (lang !== 'ja') {
      assert.doesNotMatch(value, CJK, `${lang} 词典 ${key} 不得残留中日韩汉字字符`)
    }
    const zhParams = [...zh[key as keyof typeof zh].matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort()
    const langParams = [...value.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort()
    assert.deepEqual(langParams, zhParams, `${lang} 词典 ${key} 的占位符必须与中文一致`)
  }
}

assert.doesNotMatch(clientIndex, /throw new Error\('[^']*[㐀-鿿][^']*'\)/, '示例 Prompt 错误不得硬编码中文')
const sessionTitleProvider = readFileSync(join(srcRoot, 'session-title-provider.ts'), 'utf8')
assert.doesNotMatch(sessionTitleProvider, /SYSTEM_PROMPT|类型必须是其中一个|根据这条用户消息/, '会话自动命名提示词不得硬编码中文，必须走 locale 词典')
assert.match(source, /sessionTitle\.system/, '会话自动命名必须使用 locale 系统提示词')
assert.match(source, /sessionTitle\.type\.feature/, '会话自动命名类型必须使用 locale 词典')
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

const tMatches = [...used.matchAll(/\bt\(['"]([a-zA-Z0-9_.-]+)['"]\)/g)].map(m => m[1])
const undefinedKeys = tMatches.filter(k => !(k in zh) && !k.startsWith('search.') && !k.startsWith('permission.') && !k.startsWith('about.dependency.') && !k.startsWith('about.progress.'))
assert.deepEqual([...new Set(undefinedKeys)], [], `源码使用了词典中未定义的键：${[...new Set(undefinedKeys)].join(', ')}`)
