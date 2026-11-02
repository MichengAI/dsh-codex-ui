/**
 * 桌面应用重启：平台识别、重启计划与脱离进程的助手生成。
 *
 * 为什么需要这一层：DSH 桌面端的 Host 只是 Electron 主进程的子进程，
 * 插件拿不到 `app.relaunch()`，也没有 IPC 能让主进程重启。所以「重启应用」
 * 只能从外部完成：先让应用**正常退出**，再由一个脱离进程的助手把它拉起来。
 *
 * 这里刻意不做强杀：Windows 发 WM_CLOSE、macOS 走 AppleScript quit、Linux 发 SIGTERM，
 * 应用没退（多半是用户在官方退出确认框里点了取消）就当作本次重启作废，
 * 绝不补刀——补刀会让新旧两个实例抢同一个端口。
 *
 * 参考社区成熟实现（dsh-refresh-restart / dsh-restart-now）的做法，但代码为自研。
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/** 退出后重新拉起的方式，决定助手脚本走哪条分支。 */
export type RestartKind = 'win' | 'mac' | 'linux' | 'node'

/** 当前进程所属的桌面应用，以及它能否被重启。 */
export interface AppTarget {
  readonly platform: string
  readonly kind: RestartKind
  readonly appPath: string
  readonly execPath: string
  readonly imageName: string
  readonly canRestart: boolean
}

/** macOS 上 DeepSeek Harness 桌面版的 bundle id。 */
const MAC_BUNDLE_ID = 'com.deepseek.dsh'

/** 取路径最后一段（同时兼容 Windows 反斜杠）。 */
function baseName(value: string): string {
  const parts = String(value).split(/[\\/]/)
  return parts[parts.length - 1] ?? ''
}

/**
 * 判断当前进程是不是「桌面应用本体」，并给出重启需要的路径。
 *
 * - macOS：从 `process.execPath` 里找 `.app/Contents/MacOS/`。
 * - Windows：可执行文件是 `.exe` 且不是 `node.exe` / `electron.exe`。
 * - Linux：优先用 AppImage 自带的 `APPIMAGE`；否则 execPath 不是 node/electron 就当桌面程序。
 * - 纯 `dsh web`（execPath 是 node）一律不可重启，`canRestart=false`。
 */
export function detectApp(input: {
  platform?: string
  execPath?: string
  env?: Record<string, string | undefined>
} = {}): AppTarget {
  const platform = typeof input.platform === 'string' ? input.platform : process.platform
  const execPath = typeof input.execPath === 'string' ? input.execPath : process.execPath
  const env = input.env ?? process.env

  if (platform === 'darwin') {
    const marker = '.app/Contents/MacOS/'
    const index = execPath.indexOf(marker)
    const appPath = index === -1 ? '' : execPath.slice(0, index + '.app'.length)
    return {
      platform,
      kind: appPath === '' ? 'node' : 'mac',
      appPath,
      execPath,
      imageName: baseName(execPath),
      canRestart: appPath !== '',
    }
  }

  if (platform === 'win32') {
    const name = baseName(execPath)
    const lower = name.toLowerCase()
    const isApp = lower.endsWith('.exe') && lower !== 'node.exe' && lower !== 'electron.exe'
    return {
      platform,
      kind: isApp ? 'win' : 'node',
      appPath: isApp ? execPath : '',
      execPath,
      imageName: name,
      canRestart: isApp,
    }
  }

  const appImage = typeof env.APPIMAGE === 'string' ? env.APPIMAGE.trim() : ''
  const resolved = appImage !== '' ? appImage : execPath
  const lower = baseName(resolved).toLowerCase()
  const runtime = lower === '' || lower === 'node' || lower === 'node.exe' || lower === 'electron' || lower === 'electron.exe'
  return {
    platform,
    kind: runtime ? 'node' : 'linux',
    appPath: runtime ? '' : resolved,
    execPath: resolved,
    imageName: baseName(resolved),
    canRestart: !runtime,
  }
}

/** 助手脚本执行时要的一切，序列化后塞进脚本本身。 */
export interface RestartPlan {
  readonly platform: string
  readonly kind: RestartKind
  readonly appPath: string
  readonly imageName: string
  readonly appId: string
  /** 进程扫描用的命令行特征（macOS/Linux）。 */
  readonly match: string
  readonly logPath: string
  readonly statePath: string
  /** Electron 主进程 PID（Host 的父进程）；Windows 上要结束的就是它。 */
  readonly mainPid: number
  /** 本插件所在的 Host 进程 PID；主进程死后它可能变成孤儿，需要显式清理。 */
  readonly hostPid: number
  /** 本次 Host 启动的标识，用来丢弃上一次运行留下的状态文件。 */
  readonly bootId: string
  readonly quitTimeoutMs: number
  readonly openDelayMs: number
}

/** 默认给用户的等待上限：超过就算了，不补刀。 */
const DEFAULT_QUIT_TIMEOUT_MS = 20_000
const DEFAULT_OPEN_DELAY_MS = 800

/** 把平台差异拍成一份纯数据计划。 */
export function buildPlan(app: AppTarget, options: {
  logPath: string
  statePath?: string
  mainPid?: number
  hostPid?: number
  bootId?: string
  quitTimeoutMs?: number
  openDelayMs?: number
}): RestartPlan {
  return {
    platform: app.platform,
    kind: app.kind,
    appPath: app.appPath,
    imageName: app.imageName,
    appId: MAC_BUNDLE_ID,
    match: app.kind === 'mac' ? `${app.appPath}/Contents/` : app.execPath,
    logPath: options.logPath,
    statePath: options.statePath ?? '',
    mainPid: options.mainPid ?? 0,
    hostPid: options.hostPid ?? 0,
    bootId: options.bootId ?? '',
    quitTimeoutMs: options.quitTimeoutMs ?? DEFAULT_QUIT_TIMEOUT_MS,
    openDelayMs: options.openDelayMs ?? DEFAULT_OPEN_DELAY_MS,
  }
}

/**
 * 生成助手脚本（CommonJS，交给 Electron 自带的 Node 执行）。
 *
 * 为什么不写成 bat / ps1：三个平台用同一套逻辑最省事，而 `process.execPath` +
 * `ELECTRON_RUN_AS_NODE=1` 可以借用应用自带的 Node，用户机器上不需要另装 Node。
 */
export function helperSource(plan: RestartPlan): string {
  return `'use strict'
// DeepSeek Harness 重启助手（由 codex-ui 生成，放在临时目录，可随时删除）
const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')

const plan = ${JSON.stringify(plan, null, 2)}
const SELF = process.pid

function stamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function log(message) {
  try { fs.appendFileSync(plan.logPath, '[' + stamp() + '] codex-ui restart: ' + message + '\\n') } catch {}
}

function writeState(phase, detail) {
  if (!plan.statePath) return
  try {
    fs.writeFileSync(plan.statePath, JSON.stringify({
      phase: phase, detail: detail || '', at: Date.now(), helper: SELF,
      platform: plan.platform, bootId: plan.bootId
    }), 'utf8')
  } catch (error) {
    log('写状态失败: ' + (error && error.message ? error.message : String(error)))
  }
}

// 重开时必须摘掉「把 Electron 当 Node 用」的开关，否则新实例只有进程没有窗口。
const childEnv = (function () {
  const env = {}
  for (const key of Object.keys(process.env)) {
    if (key.indexOf('ELECTRON_') === 0) continue
    if (key === 'NODE_OPTIONS' || key === 'NODE_PATH') continue
    env[key] = process.env[key]
  }
  return env
})()

function run(command, args) {
  try {
    return spawnSync(command, args, { encoding: 'utf8', timeout: 20000, windowsHide: true, env: childEnv })
  } catch (error) {
    log('spawn 失败 ' + command + ': ' + (error && error.message ? error.message : String(error)))
    return { status: -1, stdout: '', stderr: '' }
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function alive(pid) {
  try { process.kill(pid, 0); return true } catch { return false }
}

/** 还活着的应用进程（永远排除助手自己）。 */
function appPids() {
  const pids = []
  if (plan.platform === 'win32') {
    const result = run('tasklist', ['/FI', 'IMAGENAME eq ' + plan.imageName, '/NH', '/FO', 'CSV'])
    const text = String(result.stdout || '').trim()
    if (text === '' || /^INFO:/i.test(text)) return pids
    for (const line of text.split(/\\r?\\n/)) {
      const match = line.match(/^"([^"]+)","(\\d+)"/)
      if (match) pids.push(Number(match[2]))
    }
  } else {
    const result = run('ps', ['-Ao', 'pid=,command='])
    const needle = plan.match || plan.appPath
    for (const line of String(result.stdout || '').split('\\n')) {
      const match = line.match(/^\\s*(\\d+)\\s+(.*)$/)
      if (!match) continue
      if (needle !== '' && match[2].indexOf(needle) === -1) continue
      pids.push(Number(match[1]))
    }
  }
  return pids.filter(function (pid) { return pid !== SELF })
}

function waitUntil(predicate, ms) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (predicate()) return true
    sleep(250)
  }
  return predicate()
}

/** Windows 的 tasklist 看不到命令行参数，只能退回「进程在就算起来了」。 */
function windowSeen(ms) {
  if (plan.platform === 'win32') return true
  return waitUntil(function () {
    const result = run('ps', ['-Ao', 'pid=,command='])
    const needle = plan.match || plan.appPath
    return String(result.stdout || '').split('\\n').some(function (line) {
      return line.indexOf('--type=renderer') !== -1 && (needle === '' || line.indexOf(needle) !== -1)
    })
  }, ms)
}

/**
 * 让应用退出。
 *
 * Windows 只能结束 Electron 主进程：安装版宿主的 window.on('close') 是无条件
 * preventDefault + hideMainWindow（收进托盘），所以 WM_CLOSE / CloseMainWindow 永远不会
 * 让应用退出。结束主进程后 Host 会因 IPC 断开自行优雅退出，会话日志照常落盘。
 * 刻意不带 /T：带 /T 会把刚起的助手自己一起杀掉。
 */
function requestQuit() {
  if (plan.kind === 'win') {
    if (!plan.mainPid) {
      log('缺少主进程 PID，放弃重启')
      return false
    }
    const result = run('taskkill', ['/PID', String(plan.mainPid), '/F'])
    log('taskkill main pid=' + plan.mainPid + ' status=' + result.status)
    return true
  }
  if (plan.kind === 'mac') {
    const result = run('osascript', ['-e', 'tell application id "' + plan.appId + '" to quit'])
    log('osascript quit status=' + result.status)
    return result.status === 0
  }
  let sent = 0
  for (const pid of appPids()) {
    try { process.kill(pid, 'SIGTERM'); sent += 1 } catch {}
  }
  log('SIGTERM 发送给 ' + sent + ' 个进程')
  return sent > 0
}

function launch() {
  try {
    if (plan.kind === 'mac') {
      const first = run('open', ['-a', plan.appPath])
      if (first.status !== 0) {
        log('open -a 失败: ' + (first.stderr || first.status))
        const second = run('open', ['-b', plan.appId])
        if (second.status !== 0) return false
      }
      return waitUntil(function () { return appPids().some(alive) }, 20000) && windowSeen(20000)
    }
    const child = spawn(plan.appPath, [], {
      detached: true,
      stdio: 'ignore',
      cwd: plan.appPath.replace(/[\\\\/][^\\\\/]+$/, '') || undefined,
      env: childEnv,
      windowsHide: false,
    })
    child.once('error', function () {})
    child.unref()
    return waitUntil(function () { return appPids().some(alive) }, 20000)
  } catch (error) {
    log('重新打开失败: ' + (error && error.message ? error.message : String(error)))
    return false
  }
}

function main() {
  log('helper start pid=' + SELF + ' kind=' + plan.kind + ' platform=' + plan.platform)
  writeState('starting', '')
  sleep(1000)

  writeState('quitting', '')
  requestQuit()

  // Windows 上判断「应用已退出」以 Electron 主进程为准：它才是窗口与托盘的所有者。
  const targetGone = function () {
    return plan.platform !== 'win32' ? appPids().filter(alive).length === 0 : !alive(plan.mainPid)
  }
  if (!waitUntil(targetGone, plan.quitTimeoutMs)) {
    // 主进程没死：不补刀，否则可能留下两个实例抢同一个端口。
    log('主进程仍在运行，本次重启作废，不动进程')
    writeState('cancelled', '应用没有退出')
    return
  }
  log('主进程已退出')

  // 主进程一死，旧 Host 就只剩失去 IPC 的孤儿进程；它握着单实例锁和端口，
  // 不清掉的话新实例起不来。它是我们自己的进程，直接按 PID 结束。
  if (plan.platform === 'win32' && plan.hostPid && alive(plan.hostPid)) {
    run('taskkill', ['/PID', String(plan.hostPid), '/F'])
    log('清理遗留 Host pid=' + plan.hostPid)
    waitUntil(function () { return !alive(plan.hostPid) }, 5000)
  }
  // 等旧实例的渲染进程等散场，再拉新的。
  waitUntil(function () { return appPids().filter(alive).length === 0 }, 5000)

  sleep(Math.max(0, plan.openDelayMs))
  if (launch()) {
    writeState('relaunched', '')
    log('应用已重新打开')
  } else {
    writeState('launch-failed', '')
    log('重开失败：请手动打开 DeepSeek Harness')
  }
}

try { main() } catch (error) {
  log('helper 异常: ' + (error && error.stack ? error.stack : String(error)))
} finally {
  try { fs.unlinkSync(process.argv[1]) } catch {}
}
`
}


/** 把助手脚本写进临时目录并交给 Electron 的 Node 跑起来（脱离本进程）。 */
export function spawnHelper(plan: RestartPlan): { ok: boolean; error?: string; scriptPath?: string } {
  try {
    const scriptPath = join(tmpdir(), `dcu-restart-${Date.now().toString(36)}.cjs`)
    writeFileSync(scriptPath, helperSource(plan), 'utf8')
    const child = spawn(process.execPath, [scriptPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      cwd: dirname(scriptPath),
    })
    child.once('error', () => {})
    child.unref()
    return { ok: true, scriptPath }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** 默认日志与状态文件位置。 */
export function defaultPaths(): { logPath: string; statePath: string } {
  const base = join(tmpdir(), 'dsh-codex-ui-restart')
  return { logPath: join(base, 'restart.log'), statePath: join(base, 'state.json') }
}
