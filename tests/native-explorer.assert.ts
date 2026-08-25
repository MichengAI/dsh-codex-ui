import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { ForegroundExplorer, type ExplorerHelperProcess, type ExplorerSpawn } from '../src/native-explorer.ts'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/native-explorer.ts', import.meta.url), 'utf8')
assert.match(source, /ShowWindowAsync\(\$handle, 3\)/, '资源管理器必须最大化后再切到前台')

function helperProcess(): ExplorerHelperProcess & { stdin: PassThrough, stdout: PassThrough, emit: EventEmitter['emit'] } {
  const events = new EventEmitter()
  const stdin = new PassThrough()
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  return {
    stdin,
    stdout,
    once: events.once.bind(events) as ExplorerHelperProcess['once'],
    emit: events.emit.bind(events),
    kill: () => true,
  }
}

const child = helperProcess()
let invocation: { file?: string, args?: readonly string[], windowsHide?: boolean } = {}
let spawnCount = 0
const run = ((file, args, options) => {
  spawnCount += 1
  invocation = { file, args, windowsHide: options.windowsHide }
  return child
}) satisfies ExplorerSpawn

const explorer = new ForegroundExplorer(run, 'win32')
const warming = explorer.warmup()
assert.equal(spawnCount, 1, '预热应在点击前启动一次辅助进程')
assert.equal(invocation.file, 'powershell.exe')
assert.deepEqual(invocation.args?.slice(0, 3), ['-NoLogo', '-NoProfile', '-NonInteractive'])
assert.equal(invocation.windowsHide, true, '辅助进程不得弹出 PowerShell 窗口')
child.stdout.write('READY\r\n')
await warming

let requestLine = ''
child.stdin.once('data', chunk => { requestLine = String(chunk) })
const opening = explorer.open('D:\\Repository\\project with spaces')
await new Promise(resolve => setImmediate(resolve))
assert.equal(spawnCount, 1, '点击打开时必须复用预热进程，不能再次启动 PowerShell')
const [requestId, encodedPath] = requestLine.trim().split('\t')
assert.equal(Buffer.from(encodedPath, 'base64').toString('utf8'), 'D:\\Repository\\project with spaces', '目录路径应使用 Base64 数据通道传递')
child.stdout.write(`OK\t${requestId}\r\n`)
await opening

await assert.rejects(explorer.open('relative'), /must be absolute/)
await assert.rejects(new ForegroundExplorer(run, 'linux').open('/tmp/project'), /only available on Windows/)
explorer.dispose()
