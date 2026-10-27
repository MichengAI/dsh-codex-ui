import { t as CODEX_UI_API_ENDPOINTS } from "./business-api-BMsgDoG6.mjs";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readFile, rm, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
//#region src/npm-downloads.ts
/** 关于页使用的 npm 累计下载量；历史不完整时返回 undefined，不把局部统计当总量。 */
const cache = /* @__PURE__ */ new Map();
const pending = /* @__PURE__ */ new Map();
const QUERY_LIMIT = 4;
let activeQueries = 0;
const queryWaiters = [];
function acquireQuery() {
	if (activeQueries < QUERY_LIMIT) {
		activeQueries += 1;
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		queryWaiters.push(resolve);
	});
}
function releaseQuery() {
	const next = queryWaiters.shift();
	if (next !== void 0) next();
	else activeQueries -= 1;
}
function npmTotalDownloads(packageName) {
	const hit = cache.get(packageName);
	if (hit !== void 0 && hit.expires > Date.now()) return Promise.resolve(hit.value);
	const active = pending.get(packageName);
	if (active !== void 0) return active;
	const request = (async () => {
		await acquireQuery();
		try {
			return await query(packageName);
		} finally {
			releaseQuery();
		}
	})().then((value) => {
		cache.set(packageName, {
			value,
			expires: Date.now() + (value === void 0 ? 3e5 : 216e5)
		});
		return value;
	}).finally(() => {
		pending.delete(packageName);
	});
	pending.set(packageName, request);
	return request;
}
async function query(packageName) {
	try {
		const encoded = encodeURIComponent(packageName);
		const metadata = await fetch(`https://registry.npmjs.org/${encoded}`, { signal: AbortSignal.timeout(5e3) });
		if (!metadata.ok) return void 0;
		const created = (await metadata.json())?.time?.created;
		if (typeof created !== "string") return void 0;
		const createdAt = Date.parse(created);
		if (!Number.isFinite(createdAt) || createdAt < Date.parse("2015-01-10T00:00:00Z") || createdAt > Date.now()) return void 0;
		const day = 864e5;
		const start = Math.floor(createdAt / day) * day;
		const end = Math.floor(Date.now() / day) * day - day;
		if (start > end) return 0;
		const ranges = [];
		for (let from = start; from <= end; from += 365 * day) ranges.push({
			start: new Date(from).toISOString().slice(0, 10),
			end: new Date(Math.min(from + 364 * day, end)).toISOString().slice(0, 10)
		});
		const values = await Promise.all(ranges.map(async (range) => {
			const response = await fetch(`https://api.npmjs.org/downloads/point/${range.start}:${range.end}/${encoded}`, { signal: AbortSignal.timeout(5e3) });
			if (!response.ok) return void 0;
			const data = await response.json();
			if (data === null || typeof data !== "object") return void 0;
			const { package: name, downloads, start, end } = data;
			return name === packageName && start === range.start && end === range.end && typeof downloads === "number" && Number.isSafeInteger(downloads) && downloads >= 0 ? downloads : void 0;
		}));
		if (values.some((value) => value === void 0)) return void 0;
		const total = values.reduce((sum, value) => sum + value, 0);
		return Number.isSafeInteger(total) ? total : void 0;
	} catch {
		return;
	}
}
//#endregion
//#region src/dependencies.ts
const SUITE_PACKAGE = "@michengai/dsh-codex-suite";
const SUITE_MEMBER_PACKAGES = [
	"@michengai/dsh-archive-manager",
	"@michengai/dsh-codex-ui",
	"@michengai/dsh-skills-manager",
	"@michengai/dsh-agency-agents",
	"@michengai/dsh-im-connect",
	"@michengai/dsh-automation"
];
const MANAGED_DEPENDENCIES = [
	{
		id: "ui",
		packageName: "@michengai/dsh-codex-ui"
	},
	{
		id: "experts",
		packageName: "@michengai/dsh-agency-agents"
	},
	{
		id: "skills",
		packageName: "@michengai/dsh-skills-manager"
	},
	{
		id: "archive",
		packageName: "@michengai/dsh-archive-manager"
	},
	{
		id: "im",
		packageName: "@michengai/dsh-im-connect"
	},
	{
		id: "schedule",
		packageName: "@michengai/dsh-automation"
	},
	{
		id: "btw",
		packageName: "@michengai/dsh-btw"
	},
	{
		id: "simplify",
		packageName: "@michengai/dsh-simplify"
	},
	{
		id: "pua",
		packageName: "@michengai/dsh-pua"
	},
	{
		id: "review",
		packageName: "@michengai/dsh-code-review"
	},
	{
		id: "pet",
		packageName: "@michengai/dsh-codex-pet"
	},
	{
		id: "market",
		packageName: "dshmarket"
	}
];
function managedDependency(id) {
	return MANAGED_DEPENDENCIES.find((dependency) => dependency.id === id);
}
//#endregion
//#region src/dependency-manager.ts
const PROFILE_PENDING_UPDATES_FILE = ".dsh-pending-updates.json";
const APPLY_PLUGIN_UPDATES_IPC = "apply-plugin-updates";
const PLUGIN_INSTALL_TIMEOUT_MS = 6e5;
const PLUGIN_MOUNT_TIMEOUT_MS = 15e3;
function optionalService(ctx, name) {
	if (ctx === void 0) return void 0;
	return typeof ctx.get === "function" ? ctx.get(name) : ctx[name];
}
function validProfileName(value) {
	return typeof value === "string" && value !== "" && value !== "." && value !== ".." && value !== "node_modules" && !value.includes("/") && !value.includes("\\") && !/[\0-\x1f\x7f]/.test(value);
}
function profileNameFromArgv(argv) {
	for (let index = 2; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "--profile") return argv[index + 1];
		if (argument?.startsWith("--profile=")) return argument.slice(10);
	}
	return argv[2] === "web" ? "web" : void 0;
}
/**
* Desktop 通过可选 Host service 暴露当前 profile；普通 Web/CLI 继续使用
* DSH_PROFILE_DIR、命令行 profile 与默认 web profile。
*/
function resolveDependencyRuntime(ctx, options = {}) {
	const env = options.env ?? process.env;
	const argv = options.argv ?? process.argv;
	const cwd = options.cwd ?? process.cwd();
	const home = options.homeDir ?? homedir();
	const profiles = optionalService(ctx, "desktopProfiles");
	const desktopPnpm = optionalService(ctx, "desktopPnpm");
	if (profiles === void 0 && desktopPnpm !== void 0) throw new Error("DSH Desktop Profile 服务尚未就绪，请重启 Desktop 后重试。");
	if (profiles !== void 0) {
		const current = profiles.current;
		if (!validProfileName(current?.name) || typeof current.dir !== "string" || !isAbsolute(current.dir)) throw new Error("DSH Desktop 当前 Profile 信息无效，请重启 Desktop 后重试。");
		if (typeof desktopPnpm?.runPlugin !== "function") throw new Error("DSH Desktop 包管理服务尚未就绪，请重启 Desktop 后重试。");
		const profileDir = resolve(current.dir);
		const runtimeRoots = typeof env.DSH_RUNTIME_DIR === "string" && isAbsolute(env.DSH_RUNTIME_DIR) ? [resolve(env.DSH_RUNTIME_DIR)] : [];
		return {
			environmentKind: "desktop",
			profileName: current.name,
			profileDir,
			runtimeRoots,
			desktopPnpm
		};
	}
	const launched = optionalService(ctx, "profileContext");
	const launchedDir = typeof launched?.dir === "string" && isAbsolute(launched.dir) ? resolve(launched.dir) : void 0;
	const launchedName = validProfileName(launched?.name) ? launched.name : void 0;
	const hostProfileDir = isOfficialDesktopHostEntry(argv[1]) && existsSync(resolve(cwd, "package.json")) ? resolve(cwd) : void 0;
	const profileDir = launchedDir ?? hostProfileDir ?? resolve(env.DSH_PROFILE_DIR ?? resolve(home, ".dsh", "profiles", "web"));
	const selected = profileNameFromArgv(argv);
	const profileName = launchedName ?? (validProfileName(selected) ? selected : validProfileName(basename(profileDir)) ? basename(profileDir) : "web");
	const cliEntry = resolveCliFromInstallAnchor(launched?.installAnchor) ?? resolveCliBesideDesktopHost(argv[1]);
	const cliRuntimeRoot = argv[1] === void 0 ? void 0 : resolveDshRuntimeRoot(argv[1], cwd);
	const anchorRoot = cliEntry === void 0 ? void 0 : resolveDshRuntimeRoot(cliEntry);
	const runtimeRoots = [
		env.DSH_RUNTIME_DIR,
		anchorRoot,
		cliRuntimeRoot
	].filter((root) => root !== void 0 && root !== "");
	const pluginEnv = stringEnvironment(launched?.packageManager?.env);
	const packageManager = profilePackageManager(launched?.packageManager) ?? desktopPackageManagerFromArgv(argv);
	return {
		environmentKind: "cli",
		profileName,
		profileDir,
		runtimeRoots,
		...cliEntry === void 0 ? {} : { cliEntry },
		...pluginEnv === void 0 ? {} : { pluginEnv },
		...packageManager === void 0 ? {} : { packageManager }
	};
}
function profilePackageManager(value) {
	if (typeof value?.command !== "string" || value.command === "") return void 0;
	if (!Array.isArray(value.args) || !value.args.every((item) => typeof item === "string")) return void 0;
	const env = stringEnvironment(value.env);
	return {
		command: value.command,
		args: value.args,
		...env === void 0 ? {} : { env }
	};
}
/** 官方 Desktop Host 把 pnpm 入口放在 argv[5]，bin 放在 argv[6]，不提供 desktopPnpm。 */
function desktopPackageManagerFromArgv(argv, command = process.execPath) {
	if (!isOfficialDesktopHostEntry(argv[1])) return void 0;
	const pnpm = argv[5];
	if (typeof pnpm !== "string" || !isAbsolute(pnpm) || !existsSync(pnpm)) return void 0;
	const bin = argv[6];
	const path = typeof bin === "string" && bin !== "" ? `${bin}${delimiter}${process.env.PATH ?? ""}` : process.env.PATH;
	return {
		command,
		args: ["--expose-internals", pnpm],
		env: {
			ELECTRON_RUN_AS_NODE: "1",
			...typeof path === "string" && path !== "" ? { PATH: path } : {}
		}
	};
}
function stringEnvironment(value) {
	if (value === null || typeof value !== "object") return void 0;
	const env = {};
	for (const [key, item] of Object.entries(value)) if (typeof item === "string") env[key] = item;
	return Object.keys(env).length === 0 ? void 0 : env;
}
/** 从公开 profileContext.installAnchor 读出 dsh bin，不把 Desktop Host 入口当成 CLI。 */
function resolveCliFromInstallAnchor(anchor) {
	if (typeof anchor !== "string" || anchor === "" || !isAbsolute(anchor)) return void 0;
	try {
		const bin = JSON.parse(readFileSync(anchor, "utf8")).bin;
		const relative = typeof bin === "string" ? bin : bin !== null && typeof bin === "object" && typeof bin.dsh === "string" ? bin.dsh : void 0;
		if (relative === void 0 || relative === "") return void 0;
		const entry = resolve(dirname(anchor), relative);
		return existsSync(entry) ? entry : void 0;
	} catch {
		return;
	}
}
/** 官方 Desktop Host 是 Electron 的 IPC 子进程；父进程只接受带 type 的事件。 */
function isOfficialDesktopHostEntry(entry = process.argv[1]) {
	if (entry === void 0 || entry === "") return false;
	return entry.replaceAll("\\", "/").includes("/dsh-desktop-host/");
}
/** 从公开包布局定位同一次安装里的 dsh CLI，不读取 launcher 私有 service。 */
function resolveCliBesideDesktopHost(entry = process.argv[1]) {
	if (!isOfficialDesktopHostEntry(entry)) return void 0;
	const index = entry.replaceAll("\\", "/").toLowerCase().lastIndexOf("/node_modules/@deepseek-ai/dsh-desktop-host/");
	if (index < 0) return void 0;
	return resolveCliFromInstallAnchor(resolve(entry.slice(0, index), "node_modules", "@deepseek-ai", "dsh", "package.json"));
}
function profileDirectory(runtime) {
	return runtime.profileDir;
}
async function readProfileManifest(runtime) {
	try {
		return JSON.parse(await readFile(resolve(profileDirectory(runtime), "package.json"), "utf8"));
	} catch (error) {
		if (error.code === "ENOENT") return {};
		throw error;
	}
}
async function declaredPluginNames(runtime) {
	const manifest = await readProfileManifest(runtime);
	return [.../* @__PURE__ */ new Set([...Object.keys({
		...manifest.devDependencies,
		...manifest.dependencies
	}), ...manifest.dsh?.profile?.bundles ?? []])];
}
/** 真正挂进 Profile 的插件名单；残留 node_modules 或仅写在 dependencies 里都不算。 */
async function profileBundleNames(runtime) {
	return (await readProfileManifest(runtime)).dsh?.profile?.bundles ?? [];
}
/** 安装缺失插件前移除卸载遗留的目录或 Junction；已挂载插件绝不触碰。 */
async function removeUnmountedPackagePath(packageName, runtime) {
	if (!MANAGED_DEPENDENCIES.some((dependency) => dependency.packageName === packageName)) throw new Error("不支持清理该依赖。");
	if (isManagedPackageDeclared(packageName, await profileBundleNames(runtime))) return;
	const packagePath = resolve(profileDirectory(runtime), "node_modules", ...packageName.split("/"));
	await rm(packagePath, {
		recursive: true,
		force: true,
		maxRetries: 2,
		retryDelay: 50
	});
}
/** 单独更新子插件时先卸套件，避免两套 patch 冲突。 */
function pluginsToRemoveBeforeInstall(declared, installing) {
	if (SUITE_MEMBER_PACKAGES.includes(installing) && declared.includes("@michengai/dsh-codex-suite")) return [SUITE_PACKAGE];
	if (installing === "@michengai/dsh-codex-suite") return SUITE_MEMBER_PACKAGES.filter((name) => declared.includes(name));
	return [];
}
/** 点击哪个包就更新哪个包，不再把子插件重定向到套件。 */
function resolveDshPluginTarget(installing, _declared = []) {
	return installing;
}
function isOfficialRuntimePackage(packageName) {
	return packageName === "@deepseek-ai/dsh" || packageName.startsWith("@deepseek-ai/dsh-");
}
/** 从全局 npm 安装的 dsh CLI 入口反推出包含 node_modules 的运行时目录；源码启动不匹配该目录结构。 */
function resolveDshRuntimeRoot(entry = process.argv[1], cwd = process.cwd()) {
	if (entry === void 0 || entry === "") return void 0;
	const cliEntry = resolveDshCliEntry(entry, cwd);
	const marker = [
		"node_modules",
		"@deepseek-ai",
		"dsh"
	].join(sep);
	const index = cliEntry.toLowerCase().lastIndexOf(marker.toLowerCase());
	if (index === -1) return void 0;
	const end = index + marker.length;
	if (end !== cliEntry.length && cliEntry[end] !== sep) return void 0;
	const root = cliEntry.slice(0, index);
	return root.endsWith(sep) ? root.slice(0, -1) : root;
}
function packageLookupRoots(packageName, runtime) {
	if (!isOfficialRuntimePackage(packageName)) return [profileDirectory(runtime)];
	return [.../* @__PURE__ */ new Set([...runtime.runtimeRoots, profileDirectory(runtime)])];
}
async function installedPackageVersion(packageName, runtime) {
	for (const root of packageLookupRoots(packageName, runtime)) try {
		const manifest = JSON.parse(await readFile(resolve(root, "node_modules", ...packageName.split("/"), "package.json"), "utf8"));
		if (typeof manifest.version === "string" && manifest.version !== "") return manifest.version;
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
}
/** 磁盘有包且仍在 profile 声明里，才算已安装。卸载后残留的 node_modules 不算。 */
function isManagedPackageInstalled(input) {
	return input.declared && input.installedVersion !== void 0 && input.installedVersion !== "";
}
/** 旧 Suite 对其六个成员拥有声明权；迁移成直接依赖前也应显示真实安装版本。 */
function isManagedPackageDeclared(packageName, declared) {
	return declared.includes(packageName) || declared.includes("@michengai/dsh-codex-suite") && SUITE_MEMBER_PACKAGES.includes(packageName);
}
/** 更新旧 Suite 中任一成员时，必须一次提升全部成员，避免移除 Suite 后只剩一个插件。 */
function directPackagesForInstall(requested, declared) {
	const migrateSuite = declared.includes("@michengai/dsh-codex-suite") && requested.some((packageName) => SUITE_MEMBER_PACKAGES.includes(packageName));
	return [...new Set(migrateSuite ? [...SUITE_MEMBER_PACKAGES, ...requested] : requested)];
}
/** npm latest 查询缓存有效期：避免每次打开“关于”页都打 7 个 registry 请求。 */
const LATEST_CACHE_TTL_MS = 3e5;
const latestCache = /* @__PURE__ */ new Map();
function cacheKey(packageName, tag) {
	return packageName + "@" + tag;
}
async function npmTaggedVersion(packageName, tag) {
	const key = cacheKey(packageName, tag);
	const hit = latestCache.get(key);
	if (hit !== void 0 && Date.now() - hit.at < LATEST_CACHE_TTL_MS) return hit.version;
	try {
		const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${tag}`, { signal: AbortSignal.timeout(5e3) });
		if (!response.ok) return void 0;
		const manifest = await response.json();
		if (typeof manifest.version !== "string") return void 0;
		latestCache.set(key, {
			version: manifest.version,
			at: Date.now()
		});
		return manifest.version;
	} catch {
		return;
	}
}
async function npmLatestVersion(packageName) {
	if (isOfficialRuntimePackage(packageName)) return await npmTaggedVersion(packageName, "next") ?? await npmTaggedVersion(packageName, "latest");
	return npmTaggedVersion(packageName, "latest");
}
/**
* pnpm 11 会在首次解析带 install script 的传递依赖时中止并写入占位值。
* 这些依赖的运行时不需要 postinstall，因此在调用 DSH plugin add 之前显式
* 记录拒绝执行，保证“关于”页单独安装和 Suite Installer 行为一致。
*/
function applyRequiredBuildPolicies(source) {
	const eol = source.includes("\r\n") ? "\r\n" : "\n";
	const lines = source.split(/\r?\n/);
	const start = lines.findIndex((line) => line === "allowBuilds:");
	if (start === -1) return `${source}${source === "" || source.endsWith("\n") ? "" : eol}allowBuilds:${eol}  protobufjs: false${eol}  koffi: false${eol}`;
	let end = start + 1;
	while (end < lines.length && (lines[end] === "" || /^\s/.test(lines[end]))) end += 1;
	const body = lines.slice(start + 1, end).filter((line) => !/^\s{2}(?:protobufjs|koffi):/.test(line));
	lines.splice(start + 1, end - start - 1, "  protobufjs: false", "  koffi: false", ...body);
	return lines.join(eol);
}
async function ensureRequiredBuildPolicies(runtime) {
	const path = resolve(profileDirectory(runtime), "pnpm-workspace.yaml");
	let source;
	try {
		source = await readFile(path, "utf8");
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
		source = "";
	}
	const next = applyRequiredBuildPolicies(source);
	if (next !== source) await writeFile(path, next, "utf8");
}
function parseSemver(version) {
	const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
	if (match === null) return void 0;
	return {
		core: [
			Number(match[1]),
			Number(match[2]),
			Number(match[3])
		],
		prerelease: match[4] === void 0 ? [] : match[4].split(".")
	};
}
function comparePrerelease(left, right) {
	if (left.length === 0 || right.length === 0) return left.length === right.length ? 0 : left.length === 0 ? 1 : -1;
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index += 1) {
		const a = left[index];
		const b = right[index];
		if (a === void 0 || b === void 0) return a === b ? 0 : a === void 0 ? -1 : 1;
		if (a === b) continue;
		const aNumeric = /^\d+$/.test(a);
		const bNumeric = /^\d+$/.test(b);
		if (aNumeric && bNumeric) return Number(a) > Number(b) ? 1 : -1;
		if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
		return a > b ? 1 : -1;
	}
	return 0;
}
function newerVersion(installed, latest) {
	const current = parseSemver(installed);
	const candidate = parseSemver(latest);
	if (current === void 0 || candidate === void 0) return false;
	for (let index = 0; index < current.core.length; index += 1) if (candidate.core[index] !== current.core[index]) return candidate.core[index] > current.core[index];
	return comparePrerelease(candidate.prerelease, current.prerelease) > 0;
}
const OFFICIAL_TURN_NAVIGATOR_MIN_VERSION = "0.1.2-alpha.2";
/** 官方轮次导航从 DSH alpha.2 起成为运行时能力；版本判断不依赖其私有 DOM。 */
function supportsOfficialTurnNavigator(version) {
	return version === OFFICIAL_TURN_NAVIGATOR_MIN_VERSION || newerVersion(OFFICIAL_TURN_NAVIGATOR_MIN_VERSION, version);
}
/** 只读取本地运行时清单，不访问 npm registry。 */
async function runtimeSupportsOfficialTurnNavigator(runtime = resolveDependencyRuntime()) {
	const version = await installedPackageVersion("@deepseek-ai/dsh", runtime);
	return version !== void 0 && supportsOfficialTurnNavigator(version);
}
/** 返回当前 profile 中固定管理插件的实际安装版本与 npm latest 状态。 */
async function dependencyStatuses(runtime = resolveDependencyRuntime()) {
	const bundleNames = await profileBundleNames(runtime);
	return Promise.all(MANAGED_DEPENDENCIES.map(async (entry) => {
		const [status, totalDownloads] = await Promise.all([readStatus(entry), npmTotalDownloads(entry.packageName)]);
		return {
			...status,
			totalDownloads
		};
	}));
	async function readStatus(dependency) {
		const version = await installedPackageVersion(dependency.packageName, runtime);
		if (version === void 0 && runtime.environmentKind === "desktop" && isOfficialRuntimePackage(dependency.packageName)) return {
			...dependency,
			installed: true,
			updateAvailable: false
		};
		const declared = isOfficialRuntimePackage(dependency.packageName) || isManagedPackageDeclared(dependency.packageName, bundleNames);
		if (version === void 0 || !isManagedPackageInstalled({
			installedVersion: version,
			declared
		})) return {
			...dependency,
			installed: false,
			updateAvailable: false
		};
		const latestVersion = await npmLatestVersion(dependency.packageName);
		return {
			...dependency,
			installed: true,
			version,
			latestVersion,
			updateAvailable: latestVersion !== void 0 && newerVersion(version, latestVersion)
		};
	}
}
/**
* 把当前进程的 CLI 入口收成绝对路径。源码启动时 argv[1] 常是相对路径，
* 若再把 cwd 切到 dirname(entry)，子进程会去错误目录找 bin.ts。
*/
function resolveDshCliEntry(entry = process.argv[1], cwd = process.cwd()) {
	if (entry === void 0 || entry === "") throw new Error("无法定位 DSH CLI。请从 DSH 命令启动 Web 服务后重试。");
	if (entry.startsWith("file:")) return fileURLToPath(entry);
	return resolve(cwd, entry);
}
function requestDesktopHotUpdate(send = process.send) {
	if (typeof send !== "function") return false;
	try {
		if (send === process.send) {
			if (process.connected !== true) return false;
			process.send?.(APPLY_PLUGIN_UPDATES_IPC);
		} else send(APPLY_PLUGIN_UPDATES_IPC);
		return true;
	} catch {
		return false;
	}
}
/** Desktop 的包管理服务会自行安排重载；只有父进程能识别该消息的独立 Web 子进程才通知。 */
function canRequestParentReload(runtime, send = process.send, entry = process.argv[1]) {
	return runtime.environmentKind === "cli" && !isOfficialDesktopHostEntry(entry) && typeof send === "function" && (send !== process.send || process.connected === true);
}
/** 响应已经发出后再通知父进程；通知失败不能变成未捕获异常。 */
function scheduleParentPluginReload(delayMs = 150) {
	setTimeout(() => {
		try {
			requestDesktopHotUpdate();
		} catch {}
	}, delayMs).unref?.();
}
async function recordPendingUpdate(packageName, version, runtime) {
	const pendingPath = resolve(profileDirectory(runtime), PROFILE_PENDING_UPDATES_FILE);
	let packages = [];
	try {
		const parsed = JSON.parse(await readFile(pendingPath, "utf8"));
		if (Array.isArray(parsed.packages)) packages = parsed.packages.flatMap((item) => {
			if (item === null || typeof item !== "object") return [];
			const record = item;
			if (typeof record.packageName !== "string" || typeof record.version !== "string") return [];
			return [{
				packageName: record.packageName,
				version: record.version
			}];
		});
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	packages = packages.filter((item) => item.packageName !== packageName);
	packages.push({
		packageName,
		version
	});
	await writeFile(pendingPath, `${JSON.stringify({ packages }, void 0, 2)}\n`, "utf8");
}
async function removePendingUpdate(packageName, runtime) {
	const pendingPath = resolve(profileDirectory(runtime), PROFILE_PENDING_UPDATES_FILE);
	try {
		const parsed = JSON.parse(await readFile(pendingPath, "utf8"));
		if (!Array.isArray(parsed.packages)) return;
		const packages = parsed.packages.filter((item) => item === null || typeof item !== "object" || item.packageName !== packageName);
		if (packages.length === parsed.packages.length) return;
		if (packages.length === 0) {
			await unlink(pendingPath);
			return;
		}
		await writeFile(pendingPath, `${JSON.stringify({ packages }, void 0, 2)}\n`, "utf8");
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
}
/** pnpm add 不会写 bundles。官方 Desktop 直接调宿主 pnpm 时，要自己把插件挂进 profile。 */
async function declareProfileBundle(packageName, runtime) {
	if (isOfficialRuntimePackage(packageName)) return;
	const manifestPath = resolve(profileDirectory(runtime), "package.json");
	let manifest;
	try {
		manifest = JSON.parse(await readFile(manifestPath, "utf8"));
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
		manifest = {};
	}
	const bundles = manifest.dsh?.profile?.bundles ?? [];
	if (bundles.includes(packageName)) return;
	manifest.dsh = {
		...manifest.dsh,
		profile: {
			...manifest.dsh?.profile,
			bundles: [...bundles, packageName]
		}
	};
	await writeFile(manifestPath, `${JSON.stringify(manifest, void 0, 2)}\n`, "utf8");
}
async function recordDeclaredVersion(packageName, version, runtime) {
	const manifestPath = resolve(profileDirectory(runtime), "package.json");
	let manifest;
	try {
		manifest = JSON.parse(await readFile(manifestPath, "utf8"));
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
		manifest = {};
	}
	manifest.dependencies = {
		...manifest.dependencies,
		[packageName]: version
	};
	await writeFile(manifestPath, `${JSON.stringify(manifest, void 0, 2)}\n`, "utf8");
}
const progressState = {
	active: false,
	target: "",
	seconds: 0,
	lastLine: "",
	phase: null,
	done: 0,
	total: null,
	percent: null,
	currentPackage: null,
	leftover: "",
	startedAt: 0
};
function beginInstallProgress(target) {
	progressState.active = true;
	progressState.target = target;
	progressState.startedAt = Date.now();
	progressState.seconds = 0;
	progressState.lastLine = "";
	progressState.phase = null;
	progressState.done = 0;
	progressState.total = null;
	progressState.percent = null;
	progressState.currentPackage = null;
	progressState.leftover = "";
}
function endInstallProgress() {
	if (progressState.leftover !== "") applyProgressLine(progressState.leftover.trim());
	progressState.active = false;
	progressState.leftover = "";
}
function installProgressSnapshot() {
	return {
		active: progressState.active,
		target: progressState.target,
		seconds: progressState.active && progressState.startedAt > 0 ? Math.max(0, Math.round((Date.now() - progressState.startedAt) / 1e3)) : 0,
		lastLine: progressState.lastLine,
		phase: progressState.phase,
		done: progressState.done,
		total: progressState.total,
		percent: progressState.percent,
		currentPackage: progressState.currentPackage
	};
}
function applyProgressLine(line) {
	if (line === "") return;
	const human = /Progress:\s*resolved\s+(\d+),\s*reused\s+(\d+),\s*downloaded\s+(\d+),\s*added\s+(\d+)/.exec(line);
	if (human !== null) {
		const resolved = Number(human[1]);
		const added = Number(human[4]);
		progressState.lastLine = line.slice(0, 200);
		progressState.total = resolved;
		progressState.done = added;
		progressState.percent = resolved > 0 ? Math.max(1, Math.min(/done/i.test(line) ? 100 : 99, Math.round(added / resolved * 100))) : null;
		if (added > 0) progressState.phase = "linking";
		else if (Number(human[3]) > 0) progressState.phase = "downloading";
		else progressState.phase = "resolving";
		return;
	}
	if (/^Done in /i.test(line)) {
		progressState.lastLine = line.slice(0, 200);
		if (progressState.percent !== null) progressState.percent = 100;
		progressState.phase = "linking";
		return;
	}
	if (line.startsWith("{")) {
		try {
			const event = JSON.parse(line);
			if (typeof event.name !== "string" || !event.name.startsWith("pnpm:")) return;
			if (event.name === "pnpm:stage" && typeof event.stage === "string") {
				if (event.stage.includes("resolution")) progressState.phase = "resolving";
				else if (event.stage.includes("import")) progressState.phase = "linking";
				else if (event.stage.includes("build")) progressState.phase = "building";
			}
			if (event.name === "pnpm:progress" && typeof event.packageId === "string" && event.packageId !== "") {
				progressState.currentPackage = event.packageId.split(">")[0] ?? event.packageId;
				if (event.status === "fetched") progressState.phase = "downloading";
			}
		} catch {
			return;
		}
		return;
	}
	progressState.lastLine = line.slice(0, 200);
}
/** 把 pnpm / dsh plugin 的输出收成关于页可轮询的进度。 */
function noteInstallOutput(chunk) {
	if (!progressState.active) return;
	const lines = `${progressState.leftover}${chunk}`.split(/\r?\n/);
	progressState.leftover = lines.pop() ?? "";
	for (const line of lines) applyProgressLine(line.trim());
}
function pluginUnchangedError() {
	return /* @__PURE__ */ new Error("安装命令已结束，但插件没有进入当前 Profile。请重试。");
}
async function waitUntilPluginMounted(packageName, version, runtime, timeoutMs = PLUGIN_MOUNT_TIMEOUT_MS) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() <= deadline) {
		const bundles = await profileBundleNames(runtime);
		const inBundles = isOfficialRuntimePackage(packageName) || isManagedPackageDeclared(packageName, bundles);
		const installed = await installedPackageVersion(packageName, runtime);
		if (inBundles && installed === version) return;
		await new Promise((resolve) => setTimeout(resolve, 80));
	}
	throw pluginUnchangedError();
}
function pluginCommandError(stderr, environmentKind = "desktop") {
	const detail = stderr.replace(/\s+/g, " ").trim();
	const isWeb = environmentKind === "cli";
	if (/EPERM|EBUSY|EACCES|unable to unlink|ERR_PNPM_LOCKED|Lock/i.test(detail)) return /* @__PURE__ */ new Error(isWeb ? "无法覆盖正在运行的插件文件。请停止当前 DSH Web 后，在终端更新插件，再重新启动 DSH Web。" : "无法覆盖正在运行的插件文件。请先完全退出桌面端，再重新打开后更新。");
	if (/UNEXPECTED_STORE|Unexpected store location/i.test(detail)) return /* @__PURE__ */ new Error(isWeb ? "插件目录与 pnpm 仓库不一致。请停止当前 DSH Web 后重试；仍失败时重新安装该 Profile 的依赖。" : "插件目录和 pnpm 仓库不一致。请完全退出桌面端后再更新。");
	if (/ERR_PNPM_IGNORED_BUILDS|Ignored build scripts/i.test(detail)) return /* @__PURE__ */ new Error("插件依赖的 pnpm 构建脚本策略尚未确认。请更新 Profile 的 allowBuilds 配置后重试。");
	if (/pnpm not found|未找到 pnpm/i.test(detail)) return /* @__PURE__ */ new Error("当前环境找不到 pnpm。请确认已安装 pnpm 后重启 DSH 再试。");
	return /* @__PURE__ */ new Error(isWeb ? "插件更新失败。请查看 DSH Web 终端输出后重试。" : "无法在应用运行时更新插件。请先完全退出桌面端，再重新打开后更新。");
}
/**
* 图形界面或桌面启动往往没有 shell PATH。把 pnpm 常见安装目录补进去，
* 让 `dsh plugin add` 能找到本机已有的 pnpm，而不是直接启动它。
*/
function pluginToolSearchDirs(platform = process.platform, env = process.env, home = homedir(), nodeDir = dirname(process.execPath)) {
	const dirs = [];
	const pnpmHome = (env.PNPM_HOME ?? "").trim();
	if (pnpmHome !== "") dirs.push(pnpmHome);
	if (platform === "win32") {
		const local = (env.LOCALAPPDATA ?? "").trim();
		const roaming = (env.APPDATA ?? "").trim();
		if (local !== "") dirs.push(join(local, "pnpm"));
		if (roaming !== "") dirs.push(join(roaming, "npm"));
	} else dirs.push("/opt/homebrew/bin", "/usr/local/bin", join(home, ".local", "bin"), join(home, ".local", "share", "pnpm"));
	if (nodeDir.trim() !== "") dirs.push(nodeDir);
	return [...new Set(dirs.filter((dir) => dir.trim() !== ""))];
}
function pluginSpawnEnv(env = process.env, platform = process.platform, home = homedir(), nodeDir = dirname(process.execPath)) {
	const separator = platform === "win32" ? ";" : ":";
	const parts = (env.PATH ?? env.Path ?? "").split(separator).filter((part) => part !== "");
	for (const dir of pluginToolSearchDirs(platform, env, home, nodeDir)) if (!parts.includes(dir)) parts.push(dir);
	return {
		...env,
		CI: "true",
		PATH: parts.join(separator)
	};
}
/** Desktop 桥接在 Web 下不会设置 DSH_PNPM_ENTRY；补上 Node 自带的 corepack pnpm。 */
function ensurePnpmEntry(env = process.env, nodeDir = dirname(process.execPath)) {
	const existing = (env.DSH_PNPM_ENTRY ?? "").trim();
	if (existing !== "") return existing;
	const candidate = join(nodeDir, "node_modules", "corepack", "dist", "pnpm.js");
	if (!existsSync(candidate)) return void 0;
	return candidate;
}
/** Desktop 桥接当前从 process.env 同步读取 pnpm 入口；调用结束后立即恢复，避免污染后续子进程。 */
function withPnpmEntry(callback, env = process.env, nodeDir = dirname(process.execPath)) {
	const entry = ensurePnpmEntry(env, nodeDir);
	if (entry === void 0) return callback();
	const hadEntry = Object.prototype.hasOwnProperty.call(env, "DSH_PNPM_ENTRY");
	const previous = env.DSH_PNPM_ENTRY;
	env.DSH_PNPM_ENTRY = entry;
	try {
		return callback();
	} finally {
		if (hadEntry) env.DSH_PNPM_ENTRY = previous;
		else delete env.DSH_PNPM_ENTRY;
	}
}
/**
* 复用启动当前服务的 DSH CLI：它会通过 pnpm 从 npm 安装或更新，并自动维护
* dsh.profile.bundles，避免浏览器端直接管理 profile 文件。
*/
function pluginExecArgv(args = process.execArgv) {
	return args.filter((arg) => !/^--(?:inspect|inspect-brk|debug|debug-brk)(?:=|$)/.test(arg));
}
const activePluginChildren = /* @__PURE__ */ new Set();
const activeDesktopPluginHandles = /* @__PURE__ */ new Set();
function terminatePluginChild(child) {
	if (child.exitCode !== null || child.killed) return;
	if (process.platform === "win32" && child.pid !== void 0) {
		const killer = spawn("taskkill", [
			"/pid",
			String(child.pid),
			"/T",
			"/F"
		], {
			windowsHide: true,
			stdio: "ignore"
		});
		killer.once("error", () => {
			child.kill("SIGTERM");
		});
		killer.unref();
		return;
	}
	child.kill("SIGTERM");
}
/** 插件停用时终止仍在运行的安装进程，避免热更新后遗留 pnpm。 */
function disposeDependencyInstaller() {
	for (const child of activePluginChildren) terminatePluginChild(child);
	for (const handle of activeDesktopPluginHandles) handle.cancel();
}
function monitorPluginChild(child, timeoutMs = PLUGIN_INSTALL_TIMEOUT_MS, environmentKind = "cli") {
	return new Promise((resolvePromise, reject) => {
		activePluginChildren.add(child);
		let output = "";
		let settled = false;
		const collect = (chunk) => {
			const text = String(chunk);
			output = `${output}${text}`.slice(-65536);
			noteInstallOutput(text);
		};
		const finish = (error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			activePluginChildren.delete(child);
			error === void 0 ? resolvePromise() : reject(error);
		};
		child.stdout?.on("data", collect);
		child.stderr?.on("data", collect);
		child.once("error", () => {
			finish(/* @__PURE__ */ new Error("无法启动 DSH 插件安装命令。请确认 Node.js 与 pnpm 可用后重试。"));
		});
		child.once("exit", (code) => {
			finish(code === 0 ? void 0 : pluginCommandError(output, environmentKind));
		});
		const timeout = setTimeout(() => {
			terminatePluginChild(child);
			finish(/* @__PURE__ */ new Error("插件安装超时，已终止安装进程。请检查网络后重试。"));
		}, timeoutMs);
		timeout.unref?.();
	});
}
function monitorDesktopPlugin(handle, timeoutMs = PLUGIN_INSTALL_TIMEOUT_MS) {
	return new Promise((resolvePromise, reject) => {
		activeDesktopPluginHandles.add(handle);
		let output = "";
		let settled = false;
		const collect = (chunk) => {
			const text = String(chunk);
			output = `${output}${text}`.slice(-65536);
			noteInstallOutput(text);
		};
		const finish = (error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			activeDesktopPluginHandles.delete(handle);
			error === void 0 ? resolvePromise() : reject(error);
		};
		handle.stdout?.on("data", collect);
		handle.stderr?.on("data", collect);
		handle.stdout?.once("error", () => {
			handle.cancel();
			finish(/* @__PURE__ */ new Error("无法读取 DSH Desktop 插件安装输出。"));
		});
		handle.stderr?.once("error", () => {
			handle.cancel();
			finish(/* @__PURE__ */ new Error("无法读取 DSH Desktop 插件安装输出。"));
		});
		handle.done.then((outcome) => {
			finish(outcome.exitCode === 0 && outcome.signal === null ? void 0 : pluginCommandError(output, "desktop"));
		}, () => {
			finish(pluginCommandError(output, "desktop"));
		});
		const timeout = setTimeout(() => {
			handle.cancel();
			finish(/* @__PURE__ */ new Error("插件安装超时，已终止安装进程。请检查网络后重试。"));
		}, timeoutMs);
		timeout.unref?.();
	});
}
function runDshPlugin(args, runtime = resolveDependencyRuntime(), timeoutMs = PLUGIN_INSTALL_TIMEOUT_MS) {
	const desktopPnpm = runtime.desktopPnpm;
	if (desktopPnpm !== void 0) return monitorDesktopPlugin(withPnpmEntry(() => desktopPnpm.runPlugin(args, runtime.profileDir)), timeoutMs);
	const packageManager = runtime.packageManager;
	if (packageManager !== void 0) return monitorPluginChild(spawn(packageManager.command, [...packageManager.args, ...args], {
		cwd: runtime.profileDir,
		env: {
			...pluginSpawnEnv(),
			...runtime.pluginEnv,
			...packageManager.env
		},
		windowsHide: true,
		stdio: [
			"ignore",
			"pipe",
			"pipe"
		]
	}), timeoutMs, "desktop");
	const entry = runtime.cliEntry ?? resolveDshCliEntry();
	if (isOfficialDesktopHostEntry(entry)) throw new Error("无法定位 DSH CLI。请从 DSH 命令启动 Web 服务后重试。");
	return monitorPluginChild(spawn(process.execPath, [
		...pluginExecArgv(),
		entry,
		"plugin",
		"--profile",
		runtime.profileName,
		...args
	], {
		cwd: process.cwd(),
		env: {
			...pluginSpawnEnv(),
			...runtime.pluginEnv
		},
		windowsHide: true,
		stdio: [
			"ignore",
			"pipe",
			"pipe"
		]
	}), timeoutMs, runtime.environmentKind);
}
/** 并发安装互斥：pnpm 锁文件竞争会触发 EPERM/EBUSY，同一时间只允许一个安装进程。 */
let installing = false;
/** 仅允许安装固定依赖，避免把浏览器输入转成任意命令。 */
async function installDependency(id, requestHotUpdate = requestDesktopHotUpdate, runtime = resolveDependencyRuntime()) {
	if (installing) throw new Error("已有依赖安装正在进行，请等待完成后再试。");
	installing = true;
	try {
		return await installDependenciesLocked([id], requestHotUpdate, runtime);
	} finally {
		installing = false;
	}
}
/** 顶部批量操作同时安装缺失插件并更新落后版本。 */
function updatableDependencyIds(statuses) {
	return statuses.filter((status) => !status.installed || status.updateAvailable).map((status) => status.id);
}
/** 把所有待安装/更新版本一次写入清单，最后只请求一次桌面热更新。 */
async function updateAllDependencies(requestHotUpdate = requestDesktopHotUpdate, runtime = resolveDependencyRuntime()) {
	if (installing) throw new Error("已有依赖安装正在进行，请等待完成后再试。");
	installing = true;
	try {
		const current = await dependencyStatuses(runtime);
		const ids = updatableDependencyIds(current);
		if (ids.length === 0) return {
			dependencies: current,
			updatedCount: 0
		};
		return {
			dependencies: await installDependenciesLocked(ids, requestHotUpdate, runtime),
			updatedCount: ids.length
		};
	} finally {
		installing = false;
	}
}
async function installDependenciesLocked(ids, requestHotUpdate, runtime) {
	const dependencies = [...new Set(ids)].map((id) => {
		const dependency = managedDependency(id);
		if (dependency === void 0) throw new Error("不支持安装该依赖。");
		return dependency;
	});
	const declared = await declaredPluginNames(runtime);
	const requestedTargets = await Promise.all(dependencies.map(async (dependency) => {
		const latestVersion = await npmLatestVersion(dependency.packageName);
		if (latestVersion === void 0) throw new Error("无法获取 npm 最新版本，请检查网络或 npm registry 后重试。");
		const packageName = resolveDshPluginTarget(dependency.packageName, declared);
		const version = packageName === dependency.packageName ? latestVersion : await npmLatestVersion(packageName);
		if (version === void 0) throw new Error("无法获取 npm 最新版本，请检查网络或 npm registry 后重试。");
		return {
			packageName,
			version
		};
	}));
	const requestedVersions = new Map(requestedTargets.map((target) => [target.packageName, target.version]));
	const targetPackages = directPackagesForInstall(requestedTargets.map((target) => target.packageName), declared);
	const targets = await Promise.all(targetPackages.map(async (packageName) => {
		const requestedVersion = requestedVersions.get(packageName);
		if (requestedVersion !== void 0) return {
			packageName,
			version: requestedVersion
		};
		const version = await installedPackageVersion(packageName, runtime) ?? await npmLatestVersion(packageName);
		if (version === void 0) throw new Error("无法读取 Suite 成员版本，请检查 npm 安装后重试。");
		return {
			packageName,
			version
		};
	}));
	beginInstallProgress(targets.map((target) => `${target.packageName}@${target.version}`).join(", "));
	try {
		const remove = [...new Set(targets.flatMap((target) => pluginsToRemoveBeforeInstall(declared, target.packageName)))];
		await ensureRequiredBuildPolicies(runtime);
		for (const target of targets) {
			if (!isOfficialRuntimePackage(target.packageName)) await removeUnmountedPackagePath(target.packageName, runtime);
			await recordPendingUpdate(target.packageName, target.version, runtime);
		}
		if (remove.length > 0) await runDshPlugin(["remove", ...remove], runtime);
		if (runtime.desktopPnpm === void 0 && requestHotUpdate()) {
			for (const target of targets) if (!isOfficialRuntimePackage(target.packageName)) await recordDeclaredVersion(target.packageName, target.version, runtime);
			return dependencyStatuses(runtime);
		}
		const officialTargets = targets.filter((target) => isOfficialRuntimePackage(target.packageName));
		const communityTargets = targets.filter((target) => !isOfficialRuntimePackage(target.packageName));
		const batches = [...officialTargets.map((target) => [target]), ...communityTargets.length === 0 ? [] : [communityTargets]];
		for (const batch of batches) {
			await runDshPlugin([
				"add",
				"--config.minimumReleaseAge=0",
				...batch.map((target) => `${target.packageName}@${target.version}`),
				"--registry=https://registry.npmjs.org/"
			], runtime);
			for (const target of batch) {
				if (runtime.packageManager !== void 0) await declareProfileBundle(target.packageName, runtime);
				await waitUntilPluginMounted(target.packageName, target.version, runtime);
				if (!isOfficialRuntimePackage(target.packageName)) await recordDeclaredVersion(target.packageName, target.version, runtime);
				await removePendingUpdate(target.packageName, runtime);
			}
		}
		return dependencyStatuses(runtime);
	} finally {
		endInstallProgress();
	}
}
//#endregion
//#region src/host-services.ts
function requireService(ctx, key, method) {
	const service = ctx.get(key);
	if (service === null || typeof service !== "object" || typeof service[method] !== "function") throw new Error(`michengai-codex-ui 需要宿主服务 “${key}.${String(method)}”`);
	return service;
}
/** 在唯一的宿主边界校验服务能力；宿主 API 变更时立即失败，不会静默返回 503。 */
function hostServices(ctx) {
	return { webServer: requireService(ctx, "webServer", "register") };
}
//#endregion
//#region src/index.ts
const dependenciesEndpoint = CODEX_UI_API_ENDPOINTS.dependencies;
function headerValue(headers, name) {
	const value = headers[name];
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value[0];
}
/** 把安装错误收成可给浏览器看的文案：我们自己的中文说明保留，带本地路径的底层错误脱敏。 */
function publicDependencyError(error) {
	const message = error instanceof Error ? error.message : "依赖管理暂不可用。";
	if (/[A-Za-z]:[\\/]|\/(?:home|root|Users|var|tmp)\//.test(message)) return "依赖管理暂不可用，请查看服务端日志。";
	return message;
}
var RequestBodyTooLargeError = class extends Error {};
/** 有界读取 Node HTTP body；偏好接口只接受很小的 JSON。 */
async function readRequestBody(request, maxBytes = 32768) {
	const declared = Number(headerValue(request.headers ?? {}, "content-length"));
	if (Number.isFinite(declared) && declared > maxBytes) throw new RequestBodyTooLargeError("请求体过大。");
	if (request[Symbol.asyncIterator] === void 0) return "";
	const chunks = [];
	let length = 0;
	for await (const chunk of request) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		length += buffer.length;
		if (length > maxBytes) throw new RequestBodyTooLargeError("请求体过大。");
		chunks.push(buffer);
	}
	return Buffer.concat(chunks).toString("utf8");
}
/**
* 所有业务 REST 依赖 connection >=0.1.2-rc.1 的 Host/Origin/Fetch Metadata 与登录检查。
* 必须在读取请求体及执行副作用前调用；不得将 undefined 以外的拒绝结果当作放行。
* 发布包信任边界由 tests/business-rest-auth.assert.ts 的真实宿主契约用例验证。
*/
function authenticateBusinessRequest(ctx, request, response, errorBody = (_status, message) => ({ error: message })) {
	const reject = (status, message) => {
		response.writeHead(status, {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store"
		});
		response.end(JSON.stringify(errorBody(status, message)));
		return false;
	};
	try {
		const connection = ctx.get("connection");
		if (typeof connection?.requestRejection !== "function") {
			ctx.logger.warn("Codex UI 业务 REST 认证不可用：缺少 connection.requestRejection。");
			return reject(503, "宿主认证服务暂不可用。");
		}
		const rejection = connection.requestRejection(request);
		if (rejection !== void 0) return reject(rejection, rejection === 401 ? "请先登录 DSH。" : "已拒绝不可信或跨站请求。");
		return true;
	} catch (error) {
		const reason = error instanceof Error ? `${error.name}: ${error.message}` : typeof error;
		ctx.logger.warn("Codex UI 业务 REST 认证调用失败：%s", reason);
		return reject(503, "宿主认证服务暂不可用。");
	}
}
const inject = ["webServer"];
/** 提供不泄露地址、命令和凭证的连接器目录。 */
function apply(ctx) {
	const host = hostServices(ctx);
	ctx.effect(() => {
		const disposeDependencies = host.webServer.register({
			kind: "exact",
			path: dependenciesEndpoint,
			handler: async (request, response) => {
				if (!authenticateBusinessRequest(ctx, request, response)) return;
				const url = new URL(request.url ?? "/", "http://localhost");
				try {
					if (request.method === "GET") {
						if (url.searchParams.get("action") === "capabilities") {
							const capabilities = { officialTurnNavigator: await runtimeSupportsOfficialTurnNavigator(resolveDependencyRuntime(ctx)) };
							response.writeHead(200, {
								"content-type": "application/json; charset=utf-8",
								"cache-control": "no-store"
							});
							response.end(JSON.stringify({ capabilities }));
							return;
						}
						if (url.searchParams.get("action") === "progress") {
							response.writeHead(200, {
								"content-type": "application/json; charset=utf-8",
								"cache-control": "no-store"
							});
							response.end(JSON.stringify({ progress: installProgressSnapshot() }));
							return;
						}
						const dependencies = await dependencyStatuses(resolveDependencyRuntime(ctx));
						response.writeHead(200, {
							"content-type": "application/json; charset=utf-8",
							"cache-control": "no-store"
						});
						response.end(JSON.stringify({ dependencies }));
						return;
					}
					if (request.method === "POST") {
						if (url.searchParams.get("action") === "update-all") {
							const runtime = resolveDependencyRuntime(ctx);
							const notifyParent = canRequestParentReload(runtime);
							const autoReload = runtime.environmentKind === "desktop" || notifyParent;
							let restartAfterResponse = false;
							const { dependencies, updatedCount } = await updateAllDependencies(() => {
								restartAfterResponse = notifyParent;
								return restartAfterResponse;
							}, runtime);
							response.writeHead(200, {
								"content-type": "application/json; charset=utf-8",
								"cache-control": "no-store"
							});
							response.end(JSON.stringify({
								dependencies,
								restartRequired: updatedCount > 0,
								autoReload
							}));
							if (restartAfterResponse) scheduleParentPluginReload();
							return;
						}
						const runtime = resolveDependencyRuntime(ctx);
						const notifyParent = canRequestParentReload(runtime);
						const autoReload = runtime.environmentKind === "desktop" || notifyParent;
						let restartAfterResponse = false;
						const dependencies = await installDependency(url.searchParams.get("dependency"), () => {
							restartAfterResponse = notifyParent;
							return restartAfterResponse;
						}, runtime);
						response.writeHead(200, {
							"content-type": "application/json; charset=utf-8",
							"cache-control": "no-store"
						});
						response.end(JSON.stringify({
							dependencies,
							restartRequired: true,
							autoReload
						}));
						if (restartAfterResponse) scheduleParentPluginReload();
						return;
					}
					response.writeHead(405);
					response.end();
				} catch (error) {
					ctx.logger.warn("dependencies endpoint failed: %s", error);
					response.writeHead(503, {
						"content-type": "application/json; charset=utf-8",
						"cache-control": "no-store"
					});
					response.end(JSON.stringify({ error: publicDependencyError(error) }));
				}
			}
		});
		return () => {
			disposeDependencyInstaller();
			disposeDependencies();
		};
	}, "michengai-codex-ui: catalogs");
}
//#endregion
export { RequestBodyTooLargeError, apply, inject, publicDependencyError, readRequestBody };
