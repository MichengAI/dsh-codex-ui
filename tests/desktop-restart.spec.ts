import assert from 'node:assert/strict'
import { test, describe, afterAll } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { rmSync } from 'node:fs'
import { CODEX_UI_RESTART_HEADER } from '../src/business-api.ts'
import { buildPlan, detectApp, helperSource } from '../src/restart.ts'
import {
  createDesktopMenuHandler,
  hostIsLoopback,
  tokenMatches,
  type RouteRequest,
  type RouteResponse,
} from '../src/desktop-menu-route.ts'

/** 测试创建的临时目录集合，跑完测试后集中清理干净。 */
const createdTestDirs = new Set<string>()

afterAll(() => {
  for (const dir of createdTestDirs) {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
  createdTestDirs.clear()
})

/** 造一个只会记录结果的假响应。 */
function fakeResponse(): RouteResponse & { status?: number; body?: string } {
  const response = {
    status: undefined as number | undefined,
    body: undefined as string | undefined,
    writeHead(status: number) { response.status = status; return response },
    end(body?: string) { response.body = body; return response },
  }
  return response
}

function request(overrides: Partial<RouteRequest> = {}): RouteRequest {
  return {
    method: 'GET',
    url: '/api/michengai/dsh-codex-ui/desktop-menu',
    headers: { host: '127.0.0.1:4584' },
    ...overrides,
  }
}

/** 测试用的临时路径：不存在的状态文件 → 路由读不到阶段。 */
function testPaths() {
  const dir = join(tmpdir(), `dcu-route-test-${Math.random().toString(36).slice(2)}`)
  createdTestDirs.add(dir)
  return { logPath: join(dir, 'restart.log'), statePath: join(dir, 'state.json') }
}

describe('restart: 平台识别', () => {
  test('Windows 打包后的 exe 可以重启，node.exe 不行', () => {
    const app = detectApp({ platform: 'win32', execPath: 'C:\\Tools\\DeepSeek Harness\\DeepSeek Harness.exe', env: {} })
    assert.equal(app.kind, 'win')
    assert.equal(app.canRestart, true)
    assert.equal(app.imageName, 'DeepSeek Harness.exe')

    const cli = detectApp({ platform: 'win32', execPath: 'C:\\Program Files\\nodejs\\node.exe', env: {} })
    assert.equal(cli.kind, 'node')
    assert.equal(cli.canRestart, false)
  })

  test('macOS 从 .app 路径反推应用位置', () => {
    const app = detectApp({
      platform: 'darwin',
      execPath: '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness',
      env: {},
    })
    assert.equal(app.kind, 'mac')
    assert.equal(app.appPath, '/Applications/DeepSeek Harness.app')
    assert.equal(app.canRestart, true)
  })

  test('Linux 优先用 AppImage 路径，纯 node 视为不可重启', () => {
    const appImage = detectApp({
      platform: 'linux',
      execPath: '/tmp/.mount_x/dsh',
      env: { APPIMAGE: '/home/u/dsh.AppImage' },
    })
    assert.equal(appImage.kind, 'linux')
    assert.equal(appImage.appPath, '/home/u/dsh.AppImage')

    const cli = detectApp({ platform: 'linux', execPath: '/usr/bin/node', env: {} })
    assert.equal(cli.kind, 'node')
    assert.equal(cli.canRestart, false)
  })
})

describe('restart: 计划与助手脚本', () => {
  const paths = testPaths()

  test('macOS 的进程匹配只认这个 .app，避免误伤别的应用', () => {
    const app = detectApp({
      platform: 'darwin',
      execPath: '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness',
      env: {},
    })
    const plan = buildPlan(app, paths)
    assert.equal(plan.match, '/Applications/DeepSeek Harness.app/Contents/')
    assert.equal(plan.appId, 'com.deepseek.dsh')

    const withIds = buildPlan(app, { ...paths, mainPid: 4242, bootId: 'boot-1' })
    assert.equal(withIds.mainPid, 4242, 'Windows 要靠 mainPid 结束主进程')
    assert.equal(withIds.bootId, 'boot-1', '状态文件要能被按启动轮次过滤')
  })

  test('助手脚本按平台退出：Windows 结束主进程，macOS/Linux 优雅退出', () => {
    // 安装版宿主的 window.on('close') 是无条件 preventDefault + 隐藏到托盘，
    // 所以 Windows 只能结束 Electron 主进程；WM_CLOSE 永远退不了应用。
    const win = helperSource(buildPlan(detectApp({ platform: 'win32', execPath: 'C:\\a\\DeepSeek Harness.exe', env: {} }), paths))
    assert.match(win, /taskkill/, 'Windows 必须结束主进程')
    assert.match(win, /'\/PID'/, '必须按 PID 结束，不能按映像名（会连坐助手自己）')
    assert.doesNotMatch(win, /'\/T'/, '不能带 /T：会连坐刚起的助手进程')
    assert.doesNotMatch(win, /CloseMainWindow\(/, 'WM_CLOSE 只会把窗口收进托盘，必须不再调用')

    const mac = helperSource(buildPlan(detectApp({ platform: 'darwin', execPath: '/A/DeepSeek Harness.app/Contents/MacOS/x', env: {} }), paths))
    assert.match(mac, /osascript/, 'macOS 必须走 AppleScript quit')

    const linux = helperSource(buildPlan(detectApp({ platform: 'linux', execPath: '/opt/dsh', env: {} }), paths))
    assert.match(linux, /SIGTERM/, 'Linux 必须发 SIGTERM')
  })

  test('生成的助手脚本语法合法（模板拼错会让重启静默失败）', () => {
    const cases = [
      detectApp({ platform: 'win32', execPath: 'C:\\a\\DeepSeek Harness.exe', env: {} }),
      detectApp({ platform: 'darwin', execPath: '/A/DeepSeek Harness.app/Contents/MacOS/x', env: {} }),
      detectApp({ platform: 'linux', execPath: '/opt/dsh', env: {} }),
    ]
    for (const app of cases) {
      const source = helperSource(buildPlan(app, paths))
      assert.doesNotThrow(() => new Function(source), `${app.platform} 助手脚本必须能通过语法解析`)
      assert.match(source, /indexOf\('ELECTRON_'\)/, '必须摘掉 ELECTRON_* 环境变量，否则新实例只有进程没有窗口')
      assert.match(source, /pid !== SELF/, '扫描进程时必须排除助手自己，否则永远等不到「已退出」')
      assert.match(source, /cancelled/, '应用没退出时必须报告 cancelled 而不是补刀')
    }
  })
})

describe('restart: 路由鉴权', () => {
  test('只认环回 Host 头', () => {
    assert.equal(hostIsLoopback('127.0.0.1:4584'), true)
    assert.equal(hostIsLoopback('localhost:4584'), true)
    assert.equal(hostIsLoopback('[::1]:4584'), true)
    assert.equal(hostIsLoopback('10.0.0.5:4584'), false)
    assert.equal(hostIsLoopback(undefined), false)
  })

  test('令牌必须是等长常数时间比较', () => {
    assert.equal(tokenMatches('abcdef', 'abcdef'), true)
    assert.equal(tokenMatches('abcdef', 'abcde'), false)
    assert.equal(tokenMatches('abcdef', ''), false)
    assert.equal(tokenMatches('abcdef', undefined), false)
  })

  test('非环回请求一律 403', async () => {
    const handler = createDesktopMenuHandler({ isDisabled: () => false, paths: testPaths() })
    const response = fakeResponse()
    await handler(request({ headers: { host: 'evil.example:80' } }), response)
    assert.equal(response.status, 403)
  })

  test('无 action 时保持旧契约 { enabled }', async () => {
    const handler = createDesktopMenuHandler({ isDisabled: () => true, paths: testPaths() })
    const response = fakeResponse()
    await handler(request(), response)
    assert.equal(response.status, 200)
    assert.deepEqual(JSON.parse(String(response.body)), { enabled: false })
  })

  test('status 返回能力与令牌', async () => {
    const handler = createDesktopMenuHandler({
      isDisabled: () => false,
      token: 'T0KEN',
      platform: 'win32',
      execPath: 'C:\\Tools\\DeepSeek Harness.exe',
      paths: testPaths(),
    })
    const response = fakeResponse()
    await handler(request({ url: '/api/michengai/dsh-codex-ui/desktop-menu?action=status' }), response)
    const payload = JSON.parse(String(response.body))
    assert.equal(response.status, 200)
    assert.equal(payload.canRestart, true)
    assert.equal(payload.token, 'T0KEN')
    assert.equal(payload.kind, 'win')
  })

  test('不带令牌或令牌错误的 restart 被拒绝，且不会真的排程', async () => {
    let spawned = 0
    const handler = createDesktopMenuHandler({
      isDisabled: () => false,
      token: 'T0KEN',
      platform: 'win32',
      execPath: 'C:\\Tools\\DeepSeek Harness.exe',
      paths: testPaths(),
      spawn: () => { spawned += 1; return { ok: true } },
    })

    const noToken = fakeResponse()
    await handler(request({ method: 'POST', url: '/api/michengai/dsh-codex-ui/desktop-menu?action=restart' }), noToken)
    assert.equal(noToken.status, 403)

    const wrong = fakeResponse()
    await handler(request({
      method: 'POST',
      url: '/api/michengai/dsh-codex-ui/desktop-menu?action=restart',
      headers: { host: '127.0.0.1:4584', [CODEX_UI_RESTART_HEADER]: 'nope' },
    }), wrong)
    assert.equal(wrong.status, 403)
    assert.equal(spawned, 0)
  })

  test('排程前会把状态/日志目录建出来（否则 ENOENT 被静默吞掉）', async () => {
    const { existsSync } = await import('node:fs')
    const paths = testPaths()
    createDesktopMenuHandler({
      isDisabled: () => false,
      token: 'T0KEN',
      platform: 'win32',
      execPath: 'C:\Tools\DeepSeek Harness.exe',
      paths,
      spawn: () => ({ ok: true }),
    })
    assert.equal(existsSync(paths.statePath), false)
    assert.notEqual(await import('node:fs').then(m => m.existsSync(paths.statePath.replace(/state\.json$/, ''))), false,
      '状态目录必须存在')
  })

  test('上次运行留下的状态不会再被当成这次的结果', async () => {
    const { writeFileSync } = await import('node:fs')
    const paths = testPaths()
    const handler = createDesktopMenuHandler({
      isDisabled: () => false,
      token: 'T0KEN',
      platform: 'win32',
      execPath: 'C:\Tools\DeepSeek Harness.exe',
      paths,
    })
    // 伪造一份「别的启动轮次」写的 relaunched
    writeFileSync(paths.statePath, JSON.stringify({ phase: 'relaunched', bootId: 'some-old-boot' }), 'utf8')
    const response = fakeResponse()
    await handler(request({ url: '/api/michengai/dsh-codex-ui/desktop-menu?action=status' }), response)
    assert.equal(JSON.parse(String(response.body)).phase, undefined, '陈旧状态必须被丢弃')
  })

  test('合法请求只排程一次，重复请求返回 busy', async () => {
    let spawned = 0
    const handler = createDesktopMenuHandler({
      isDisabled: () => false,
      token: 'T0KEN',
      platform: 'win32',
      execPath: 'C:\\Tools\\DeepSeek Harness.exe',
      paths: testPaths(),
      spawn: () => { spawned += 1; return { ok: true } },
    })
    const headers = { host: '127.0.0.1:4584', [CODEX_UI_RESTART_HEADER]: 'T0KEN' }
    const url = '/api/michengai/dsh-codex-ui/desktop-menu?action=restart'

    const first = fakeResponse()
    await handler(request({ method: 'POST', url, headers }), first)
    assert.equal(first.status, 200)
    assert.equal(spawned, 1)

    const second = fakeResponse()
    await handler(request({ method: 'POST', url, headers }), second)
    assert.equal(second.status, 409)
    assert.equal(JSON.parse(String(second.body)).error, 'busy')
  })

  test('主进程死后会清理遗留 Host，避免新实例抢不到端口', () => {
    const local = testPaths()
    const source = helperSource(buildPlan(
      detectApp({ platform: 'win32', execPath: 'C:\\a\\DeepSeek Harness.exe', env: {} }),
      { ...local, mainPid: 111, hostPid: 222 },
    ))
    assert.match(source, /plan\.hostPid/, '助手必须知道旧 Host 的 PID')
    assert.match(source, /兜底清理|自退出/, '主进程退出后要等待自退或兜底结束孤儿 Host')
  })

  test('排程时把 mainPid/hostPid 交给助手', async () => {
    let seen: { mainPid?: number; hostPid?: number; bootId?: string } | undefined
    const handler = createDesktopMenuHandler({
      isDisabled: () => false,
      token: 'T0KEN',
      platform: 'win32',
      execPath: 'C:\\Tools\\DeepSeek Harness.exe',
      paths: testPaths(),
      mainPid: 4321,
      hostPid: 8765,
      spawn: (plan) => { seen = plan; return { ok: true } },
    })
    const response = fakeResponse()
    await handler(request({
      method: 'POST',
      url: '/api/michengai/dsh-codex-ui/desktop-menu?action=restart',
      headers: { host: '127.0.0.1:4584', [CODEX_UI_RESTART_HEADER]: 'T0KEN' },
    }), response)
    assert.equal(response.status, 200)
    assert.equal(seen?.mainPid, 4321)
    assert.equal(seen?.hostPid, 8765)
    assert.ok(typeof seen?.bootId === 'string' && seen.bootId.length > 0, '状态文件要带上本次启动标识')
  })

  test('非桌面环境（node 运行时）报告不可重启', async () => {
    let spawned = 0
    const handler = createDesktopMenuHandler({
      isDisabled: () => false,
      token: 'T0KEN',
      platform: 'linux',
      execPath: '/usr/bin/node',
      paths: testPaths(),
      spawn: () => { spawned += 1; return { ok: true } },
    })
    const status = fakeResponse()
    await handler(request({ url: '/api/michengai/dsh-codex-ui/desktop-menu?action=status', headers: { host: '127.0.0.1:4584' } }), status)
    const payload = JSON.parse(String(status.body))
    assert.equal(payload.canRestart, false)
    assert.equal(payload.reason, 'missing-app', '不可重启时回机器码，文案由客户端翻译')

    const restart = fakeResponse()
    await handler(request({
      method: 'POST',
      url: '/api/michengai/dsh-codex-ui/desktop-menu?action=restart',
      headers: { host: '127.0.0.1:4584', [CODEX_UI_RESTART_HEADER]: 'T0KEN' },
    }), restart)
    assert.equal(restart.status, 409)
    assert.equal(spawned, 0)
  })
})
