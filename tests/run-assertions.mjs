import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(directory).filter(name => name.endsWith('.assert.ts')).sort()

for (const name of files) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', resolve(directory, name)], {
    cwd: resolve(directory, '..'),
    stdio: 'inherit',
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(`✓ ${files.length} assertion scripts passed`)
