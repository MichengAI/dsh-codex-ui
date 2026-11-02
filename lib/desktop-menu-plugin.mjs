import { r as CODEX_UI_API_ENDPOINTS, t as isSubPluginDisabledOnDisk$1 } from "./profile-resolver-B1VNepo_.mjs";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
//#region src/restart.ts
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
/** macOS 上 DeepSeek Harness 桌面版的 bundle id。 */
const MAC_BUNDLE_ID = "com.deepseek.dsh";
/** 取路径最后一段（同时兼容 Windows 反斜杠）。 */
function baseName(value) {
	const parts = String(value).split(/[\\/]/);
	return parts[parts.length - 1] ?? "";
}
/**
* 判断当前进程是不是「桌面应用本体」，并给出重启需要的路径。
*
* - macOS：从 `process.execPath` 里找 `.app/Contents/MacOS/`。
* - Windows：可执行文件是 `.exe` 且不是 `node.exe` / `electron.exe`。
* - Linux：优先用 AppImage 自带的 `APPIMAGE`；否则 execPath 不是 node/electron 就当桌面程序。
* - 纯 `dsh web`（execPath 是 node）一律不可重启，`canRestart=false`。
*/
function detectApp(input = {}) {
	const platform = typeof input.platform === "string" ? input.platform : process.platform;
	const execPath = typeof input.execPath === "string" ? input.execPath : process.execPath;
	const env = input.env ?? process.env;
	if (platform === "darwin") {
		const index = execPath.indexOf(".app/Contents/MacOS/");
		const appPath = index === -1 ? "" : execPath.slice(0, index + 4);
		return {
			platform,
			kind: appPath === "" ? "node" : "mac",
			appPath,
			execPath,
			imageName: baseName(execPath),
			canRestart: appPath !== ""
		};
	}
	if (platform === "win32") {
		const name = baseName(execPath);
		const lower = name.toLowerCase();
		const isApp = lower.endsWith(".exe") && lower !== "node.exe" && lower !== "electron.exe";
		return {
			platform,
			kind: isApp ? "win" : "node",
			appPath: isApp ? execPath : "",
			execPath,
			imageName: name,
			canRestart: isApp
		};
	}
	const appImage = typeof env.APPIMAGE === "string" ? env.APPIMAGE.trim() : "";
	const resolved = appImage !== "" ? appImage : execPath;
	const lower = baseName(resolved).toLowerCase();
	const runtime = lower === "" || lower === "node" || lower === "node.exe" || lower === "electron" || lower === "electron.exe";
	return {
		platform,
		kind: runtime ? "node" : "linux",
		appPath: runtime ? "" : resolved,
		execPath: resolved,
		imageName: baseName(resolved),
		canRestart: !runtime
	};
}
/** 默认给用户的等待上限：超过就算了，不补刀。 */
const DEFAULT_QUIT_TIMEOUT_MS = 2e4;
const DEFAULT_OPEN_DELAY_MS = 800;
/** 把平台差异拍成一份纯数据计划。 */
function buildPlan(app, options) {
	return {
		platform: app.platform,
		kind: app.kind,
		appPath: app.appPath,
		imageName: app.imageName,
		appId: MAC_BUNDLE_ID,
		match: app.kind === "mac" ? `${app.appPath}/Contents/` : app.execPath,
		logPath: options.logPath,
		statePath: options.statePath ?? "",
		quitTimeoutMs: options.quitTimeoutMs ?? DEFAULT_QUIT_TIMEOUT_MS,
		openDelayMs: options.openDelayMs ?? DEFAULT_OPEN_DELAY_MS
	};
}
/**
* 生成助手脚本（CommonJS，交给 Electron 自带的 Node 执行）。
*
* 为什么不写成 bat / ps1：三个平台用同一套逻辑最省事，而 `process.execPath` +
* `ELECTRON_RUN_AS_NODE=1` 可以借用应用自带的 Node，用户机器上不需要另装 Node。
*/
function helperSource(plan) {
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
      phase: phase, detail: detail || '', at: Date.now(), helper: SELF, platform: plan.platform
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

/** 请求应用自己退出：不杀进程，让官方退出流程走完。 */
function requestQuit() {
  if (plan.kind === 'win') {
    const name = plan.imageName.replace(/\\.exe$/i, '')
    const script = "Get-Process -Name '" + name + "' -ErrorAction SilentlyContinue | ForEach-Object { $_.CloseMainWindow() | Out-Null }"
    const result = run('powershell', ['-NoProfile', '-NonInteractive', '-Command', script])
    log('CloseMainWindow status=' + result.status)
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

  if (!waitUntil(function () { return appPids().filter(alive).length === 0 }, plan.quitTimeoutMs)) {
    // 应用没退出：多半是用户在官方退出确认框里点了取消。此时补刀会让两个实例抢端口。
    log('应用仍在运行，本次重启作废，不动进程')
    writeState('cancelled', '应用没有退出')
    return
  }
  log('应用已退出')

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
}
`;
}
/** 把助手脚本写进临时目录并交给 Electron 的 Node 跑起来（脱离本进程）。 */
function spawnHelper(plan) {
	try {
		const scriptPath = join(tmpdir(), `dcu-restart-${Date.now().toString(36)}.cjs`);
		writeFileSync(scriptPath, helperSource(plan), "utf8");
		const child = spawn(process.execPath, [scriptPath], {
			detached: true,
			stdio: "ignore",
			windowsHide: true,
			env: {
				...process.env,
				ELECTRON_RUN_AS_NODE: "1"
			},
			cwd: dirname(scriptPath)
		});
		child.once("error", () => {});
		child.unref();
		return {
			ok: true,
			scriptPath
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
/** 默认日志与状态文件位置。 */
function defaultPaths() {
	const base = join(tmpdir(), "dsh-codex-ui-restart");
	return {
		logPath: join(base, "restart.log"),
		statePath: join(base, "state.json")
	};
}
//#endregion
//#region src/desktop-menu-route.ts
/**
* 桌面端窗口菜单的 Host 路由。
*
* 三条通道，同一个端点：
*   GET  ?action=status   → 状态文档（含一次性重启令牌与当前重启阶段）
*   POST ?action=restart  → 请求重启（必须带 status 文档里的令牌）
*   GET  （无 action）     → 兼容旧调用方，仅返回 { enabled }
*
* 安全：只接受环回调用（Host 头必须是本机），POST 还必须带令牌。
* 只校验环回没有意义——本机任何进程都能伪造 Host 头，令牌才能证明调用方是读过
* 我们状态文档的那个页面（同一套思路见社区 dsh-refresh-restart）。
*/
function headerValue(headers, key) {
	const value = headers[key];
	if (typeof value === "string") return value;
	if (Array.isArray(value) && typeof value[0] === "string") return value[0];
}
/** `Host` 头是否指向本机。 */
function hostIsLoopback(host) {
	if (typeof host !== "string" || host.trim() === "") return false;
	const value = host.trim().toLowerCase();
	const name = value.startsWith("[") ? value.slice(1, value.indexOf("]")) : value.split(":")[0];
	return name === "127.0.0.1" || name === "localhost" || name === "::1" || name === "[::1]";
}
/** 常数时间比较两个令牌。 */
function tokenMatches(expected, provided) {
	if (typeof provided !== "string" || provided === "") return false;
	const a = Buffer.from(expected);
	const b = Buffer.from(provided);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
function sendJson(response, status, payload) {
	const body = JSON.stringify(payload);
	response.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"content-length": String(Buffer.byteLength(body)),
		"cache-control": "no-store"
	});
	response.end(body);
}
/**
* 创建路由处理器。
* @param deps - 子插件状态、平台信息与可注入的副作用。
*/
function createDesktopMenuHandler(deps) {
	const token = deps.token ?? randomBytes(16).toString("hex");
	const paths = deps.paths ?? defaultPaths();
	const spawnPlan = deps.spawn ?? spawnHelper;
	let scheduled = false;
	const target = () => detectApp({
		platform: deps.platform,
		execPath: deps.execPath,
		env: deps.env
	});
	const readState = () => {
		try {
			return JSON.parse(readFileSync(paths.statePath, "utf8"));
		} catch {
			return {};
		}
	};
	const statusView = () => {
		const app = target();
		const state = readState();
		return {
			enabled: !deps.isDisabled(),
			canRestart: app.canRestart,
			reason: app.canRestart ? void 0 : unsupportedReason(app.platform, app.kind),
			platform: app.platform,
			kind: app.kind,
			appPath: app.appPath,
			token,
			phase: state.phase,
			detail: state.detail
		};
	};
	return async (request, response) => {
		const rawUrl = typeof request.url === "string" ? request.url : "/";
		let url;
		try {
			url = new URL(rawUrl, "http://dsh.internal");
		} catch {
			sendJson(response, 400, {
				ok: false,
				error: "bad-url"
			});
			return;
		}
		if (!hostIsLoopback(headerValue(request.headers, "host"))) {
			sendJson(response, 403, {
				ok: false,
				error: "forbidden"
			});
			return;
		}
		const action = url.searchParams.get("action");
		if (action === null) {
			sendJson(response, 200, { enabled: !deps.isDisabled() });
			return;
		}
		if (action === "status") {
			if (request.method !== "GET" && request.method !== "HEAD") {
				sendJson(response, 405, {
					ok: false,
					error: "method"
				});
				return;
			}
			sendJson(response, 200, statusView());
			return;
		}
		if (action === "restart") {
			if (request.method !== "POST") {
				sendJson(response, 405, {
					ok: false,
					error: "method"
				});
				return;
			}
			if (!tokenMatches(token, headerValue(request.headers, "x-dcu-restart-key"))) {
				sendJson(response, 403, {
					ok: false,
					error: "bad-token"
				});
				return;
			}
			const app = target();
			if (!app.canRestart) {
				sendJson(response, 409, {
					ok: false,
					error: "unsupported",
					reason: unsupportedReason(app.platform, app.kind)
				});
				return;
			}
			if (scheduled) {
				sendJson(response, 409, {
					ok: false,
					error: "busy"
				});
				return;
			}
			scheduled = true;
			const outcome = spawnPlan(buildPlan(app, paths));
			if (!outcome.ok) {
				scheduled = false;
				sendJson(response, 500, {
					ok: false,
					error: "spawn-failed",
					detail: outcome.error
				});
				return;
			}
			sendJson(response, 200, {
				ok: true,
				phase: "starting"
			});
			return;
		}
		sendJson(response, 404, {
			ok: false,
			error: "not-found"
		});
	};
}
/** 平台不支持时给页面看的原因。 */
function unsupportedReason(platform, kind) {
	if (kind !== "node") return "";
	if (platform === "win32") return "找不到 DeepSeek Harness 的可执行文件，无法重启";
	if (platform === "darwin") return "找不到 DeepSeek Harness 的 .app 位置，无法重启";
	if (platform === "linux") return "找不到 DeepSeek Harness 的程序路径，无法重启";
	return "当前不是桌面版，无法重启应用";
}
//#endregion
//#region src/desktop-menu-plugin.ts
const name = "codex-ui-desktop-menu";
const inject = ["webServer"];
/** 子组件自身在 profile 配置里的 id。 */
const SUB_PLUGIN_ID = "codex-ui-desktop-menu";
/**
* 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true。
*/
function isSubPluginDisabledOnDisk(id, homeDir, ctx) {
	return isSubPluginDisabledOnDisk$1(id, homeDir, ctx);
}
/**
* 桌面端标题栏窗口菜单子组件 (Host 侧)
*
* 通过 webServer 暴露 /api/michengai/dsh-codex-ui/desktop-menu：
* - 无 action：返回子插件启用状态（客户端据此决定是否注入菜单）
* - ?action=status：重启能力探测 + 一次性令牌 + 当前重启阶段
* - ?action=restart：请求重启应用（必须带 x-dcu-restart-key）
*
* 停用此子组件或端点返回 disabled 时，客户端不注入任何菜单。
*/
function apply(ctx) {
	const endpoint = CODEX_UI_API_ENDPOINTS.desktopMenu;
	const handler = createDesktopMenuHandler({ isDisabled: () => isSubPluginDisabledOnDisk(SUB_PLUGIN_ID, void 0, ctx) });
	ctx.effect(() => {
		const webServer = ctx.get("webServer");
		if (!webServer || typeof webServer.register !== "function") return () => {};
		const dispose = webServer.register({
			kind: "prefix",
			path: endpoint,
			handler
		});
		return () => {
			dispose?.();
		};
	}, "michengai-codex-ui: desktop menu state");
}
//#endregion
export { apply, inject, isSubPluginDisabledOnDisk, name };
