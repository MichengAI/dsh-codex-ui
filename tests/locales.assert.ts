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
const used = source.replace(locales, '')

for (const [key, value] of Object.entries(en)) {
  assert.doesNotMatch(value, CJK, `英文词典 ${key} 不得残留中日韩字符`)
}

const dead: string[] = []
for (const key of Object.keys(zh)) {
  if (used.includes(`'${key}'`) || used.includes(`"${key}"`)) continue
  if (key.startsWith('search.') && used.includes('search.${')) continue
  if (key.startsWith('permission.') && used.includes('permission.${')) continue
  if (key.startsWith('about.dependency.') && used.includes('about.dependency.${')) continue
  dead.push(key)
}
assert.deepEqual(dead, [], `词典不得保留未被引用的键：${dead.join(', ')}`)
