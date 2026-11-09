import { n as resolveCurrentProfile, r as CODEX_UI_API_ENDPOINTS } from "./profile-resolver-BkTv7lmZ.mjs";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
* 运行时解析：优先通过宿主 service 提取当前 Profile 与官方 pluginManager 服务，
* 不再自建 CLI 探测与包管理 spawn。
*/
function resolveDependencyRuntime(ctx, options = {}) {
	const env = options.env ?? process.env;
	const argv = options.argv ?? process.argv;
	const home = options.homeDir ?? homedir();
	const profiles = optionalService(ctx, "desktopProfiles");
	const pluginManager = optionalService(ctx, "pluginManager");
	if (profiles !== void 0) {
		const current = profiles.current;
		if (!validProfileName(current?.name) || typeof current.dir !== "string" || !isAbsolute(current.dir)) throw new Error("DSH Desktop 当前 Profile 信息无效，请重启 Desktop 后重试。");
		const profileDir = resolve(current.dir);
		const runtimeRoots = typeof env.DSH_RUNTIME_DIR === "string" && isAbsolute(env.DSH_RUNTIME_DIR) ? [resolve(env.DSH_RUNTIME_DIR)] : [];
		return {
			environmentKind: "desktop",
			profileName: current.name,
			profileDir,
			runtimeRoots,
			...pluginManager === void 0 ? {} : { pluginManager }
		};
	}
	const launched = optionalService(ctx, "profileContext");
	const launchedDir = typeof launched?.dir === "string" && isAbsolute(launched.dir) ? resolve(launched.dir) : void 0;
	const launchedName = validProfileName(launched?.name) ? launched.name : void 0;
	const profileDir = launchedDir ?? resolve(env.DSH_PROFILE_DIR ?? resolve(home, ".dsh", "profiles", "web"));
	const selected = profileNameFromArgv(argv);
	return {
		environmentKind: "cli",
		profileName: launchedName ?? (validProfileName(selected) ? selected : validProfileName(basename(profileDir)) ? basename(profileDir) : "web"),
		profileDir,
		runtimeRoots: [env.DSH_RUNTIME_DIR].filter((root) => root !== void 0 && root !== ""),
		...pluginManager === void 0 ? {} : { pluginManager }
	};
}
function profileDirectory(runtime) {
	return runtime.profileDir;
}
function isOfficialRuntimePackage(packageName) {
	return packageName === "@deepseek-ai/dsh";
}
/** 卸载后残留的 node_modules 在 bundles 清除后不得继续标为已安装。 */
function isManagedPackageInstalled(input) {
	return input.declared && input.installedVersion !== void 0;
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
function parseSemver(version) {
	const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version.trim());
	if (!match) return void 0;
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: match[4] ?? ""
	};
}
function comparePrerelease(a, b) {
	if (a === "" && b === "") return 0;
	if (a === "") return 1;
	if (b === "") return -1;
	const partsA = a.split(".");
	const partsB = b.split(".");
	const len = Math.max(partsA.length, partsB.length);
	for (let i = 0; i < len; i += 1) {
		const itemA = partsA[i];
		const itemB = partsB[i];
		if (itemA === void 0) return -1;
		if (itemB === void 0) return 1;
		const isNumA = /^\d+$/.test(itemA);
		const isNumB = /^\d+$/.test(itemB);
		if (isNumA && isNumB) {
			const numA = Number(itemA);
			const numB = Number(itemB);
			if (numA !== numB) return numA > numB ? 1 : -1;
			continue;
		}
		if (isNumA && !isNumB) return -1;
		if (!isNumA && isNumB) return 1;
		if (itemA !== itemB) return itemA > itemB ? 1 : -1;
	}
	return 0;
}
function newerVersion(installed, latest) {
	const parsedInstalled = parseSemver(installed);
	const parsedLatest = parseSemver(latest);
	if (!parsedInstalled || !parsedLatest) return false;
	if (parsedLatest.major !== parsedInstalled.major) return parsedLatest.major > parsedInstalled.major;
	if (parsedLatest.minor !== parsedInstalled.minor) return parsedLatest.minor > parsedInstalled.minor;
	if (parsedLatest.patch !== parsedInstalled.patch) return parsedLatest.patch > parsedInstalled.patch;
	return comparePrerelease(parsedLatest.prerelease, parsedInstalled.prerelease) > 0;
}
async function npmLatestVersion(packageName) {
	const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;
	try {
		const response = await fetch(url, {
			headers: { accept: "application/json" },
			signal: AbortSignal.timeout(5e3)
		});
		if (!response.ok) return void 0;
		const data = await response.json();
		return typeof data.version === "string" && data.version !== "" ? data.version : void 0;
	} catch {
		return;
	}
}
async function profileBundleNames(runtime) {
	const directory = profileDirectory(runtime);
	const manifestPath = join(directory, "package.json");
	if (!existsSync(manifestPath)) return [];
	try {
		const bundles = JSON.parse(await readFile(manifestPath, "utf8")).dsh?.profile?.bundles;
		return Array.isArray(bundles) && bundles.every((b) => typeof b === "string") ? bundles : [];
	} catch {
		return [];
	}
}
async function declaredPluginNames(runtime) {
	const bundles = await profileBundleNames(runtime);
	const directory = profileDirectory(runtime);
	const manifestPath = join(directory, "package.json");
	if (!existsSync(manifestPath)) return bundles;
	try {
		const deps = JSON.parse(await readFile(manifestPath, "utf8")).dependencies;
		const names = deps !== null && typeof deps === "object" ? Object.keys(deps) : [];
		return [.../* @__PURE__ */ new Set([...bundles, ...names])];
	} catch {
		return bundles;
	}
}
async function installedPackageVersion(packageName, runtime) {
	const directory = profileDirectory(runtime);
	const candidate = join(directory, "node_modules", ...packageName.split("/"), "package.json");
	if (existsSync(candidate)) try {
		const manifest = JSON.parse(await readFile(candidate, "utf8"));
		if (typeof manifest.version === "string" && manifest.version !== "") return manifest.version;
	} catch {}
}
async function dependencyStatuses(runtime = resolveDependencyRuntime()) {
	const bundles = await profileBundleNames(runtime);
	return Promise.all(MANAGED_DEPENDENCIES.map(async (item) => {
		const [installedVersion, latestVersion, totalDownloads] = await Promise.all([
			installedPackageVersion(item.packageName, runtime),
			npmLatestVersion(item.packageName),
			npmTotalDownloads(item.packageName)
		]);
		const installed = isManagedPackageInstalled({
			installedVersion,
			declared: isManagedPackageDeclared(item.packageName, bundles)
		});
		const updateAvailable = installed && installedVersion !== void 0 && latestVersion !== void 0 ? newerVersion(installedVersion, latestVersion) : false;
		return {
			id: item.id,
			packageName: item.packageName,
			installed,
			version: installed ? installedVersion : void 0,
			latestVersion,
			totalDownloads,
			updateAvailable
		};
	}));
}
const progressState = {
	active: false,
	target: "",
	startedAt: 0,
	seconds: 0,
	lastLine: "",
	phase: null,
	done: 0,
	total: null,
	percent: null,
	currentPackage: null
};
function beginInstallProgress(target) {
	progressState.active = true;
	progressState.target = target;
	progressState.startedAt = Date.now();
	progressState.seconds = 0;
	progressState.lastLine = "";
	progressState.phase = "resolving";
	progressState.done = 0;
	progressState.total = null;
	progressState.percent = null;
	progressState.currentPackage = null;
}
function endInstallProgress() {
	progressState.active = false;
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
/** 接收宿主官方 plugin-manager/install-state 广播事件，对齐官方安装进度阶段。 */
function noteHostInstallState(event) {
	if (event === null || typeof event !== "object") return;
	const data = event;
	if (typeof data.phase === "string") {
		if (data.phase === "resolving" || data.phase === "downloading" || data.phase === "linking" || data.phase === "building") progressState.phase = data.phase;
	}
}
function noteInstallOutput(chunk) {
	if (chunk === "") return;
	const trimmed = chunk.trim();
	if (trimmed !== "") progressState.lastLine = trimmed.slice(0, 200);
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
let installing = false;
async function installDependency(id, runtime = resolveDependencyRuntime()) {
	if (installing) throw new Error("已有依赖安装正在进行，请等待完成后再试。");
	installing = true;
	try {
		return await installDependenciesLocked([id], runtime);
	} finally {
		installing = false;
	}
}
/** 顶部批量操作同时安装缺失插件并更新落后版本。 */
function updatableDependencyIds(statuses) {
	return statuses.filter((status) => !status.installed || status.updateAvailable).map((status) => status.id);
}
async function updateAllDependencies(runtime = resolveDependencyRuntime()) {
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
			dependencies: await installDependenciesLocked(ids, runtime),
			updatedCount: ids.length
		};
	} finally {
		installing = false;
	}
}
async function resolveHostPluginOperations(runtime) {
	if (runtime.runtimeRoots.length === 0) return void 0;
	const candidates = [
		...runtime.runtimeRoots.map((root) => resolve(root, "..")),
		dirname(process.execPath),
		resolve(dirname(process.execPath), ".."),
		"D:/Tools/nodejs/node_global/node_modules/@deepseek-ai/dsh",
		"C:/Tools/nodejs/node_global/node_modules/@deepseek-ai/dsh"
	];
	for (const candidate of candidates) {
		const file = resolve(candidate, "node_modules", "@deepseek-ai", "dsh-plugin-manager", "lib", "types", "operations.js");
		if (existsSync(file)) try {
			const mod = await import(pathToFileURL(file).href);
			if (typeof mod.runPluginCommand === "function") return mod;
		} catch {}
	}
}
async function installDependenciesLocked(ids, runtime) {
	const ops = await resolveHostPluginOperations(runtime);
	if (typeof runtime.pluginManager?.installBundle !== "function" && typeof ops?.runPluginCommand !== "function") throw new Error("DSH 宿主插件管理服务尚未就绪，请重启 DSH 后重试。");
	const dependencies = [...new Set(ids)].map((id) => {
		const dependency = managedDependency(id);
		if (dependency === void 0) throw new Error("不支持安装该依赖。");
		return dependency;
	});
	const declared = await declaredPluginNames(runtime);
	const requestedTargets = await Promise.all(dependencies.map(async (dependency) => {
		const latestVersion = await npmLatestVersion(dependency.packageName);
		if (latestVersion === void 0) throw new Error("无法获取 npm 最新版本，请检查网络或 npm registry 后重试。");
		return {
			packageName: dependency.packageName,
			version: latestVersion
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
		if (version === void 0) throw new Error("无法读取成员版本，请检查 npm 安装后重试。");
		return {
			packageName,
			version
		};
	}));
	beginInstallProgress(targets.map((target) => `${target.packageName}@${target.version}`).join(", "));
	try {
		if (typeof runtime.pluginManager?.installBundle === "function") {
			for (const target of targets) {
				noteInstallOutput(`dsh: delegating ${target.packageName}@${target.version} to host pluginManager\n`);
				if (typeof runtime.pluginManager.updateBundle === "function" && isManagedPackageDeclared(target.packageName, declared)) await runtime.pluginManager.updateBundle(target.packageName, target.version);
				else await runtime.pluginManager.installBundle(`${target.packageName}@${target.version}`);
				await waitUntilPluginMounted(target.packageName, target.version, runtime);
			}
			return dependencyStatuses(runtime);
		}
		if (typeof ops?.runPluginCommand === "function") {
			const context = {
				profile: runtime.profileName,
				dir: runtime.profileDir,
				cwd: runtime.profileDir,
				installAnchor: runtime.runtimeRoots[0] ?? resolve(runtime.profileDir, "package.json")
			};
			const options = {
				execution: "service",
				outputBytes: 16384,
				activateNewBundles: true,
				onOutput: (text) => noteInstallOutput(text)
			};
			for (const target of targets) {
				noteInstallOutput(`dsh: installing ${target.packageName}@${target.version} via official runPluginCommand\n`);
				const res = await ops.runPluginCommand(context, ["add", `${target.packageName}@${target.version}`], options);
				if (res.exitCode !== 0) throw new Error(res.output || "官方插件安装命令执行失败。");
				await waitUntilPluginMounted(target.packageName, target.version, runtime);
			}
			return dependencyStatuses(runtime);
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
//#region src/sections-store.ts
/**
* 工作区分区的宿主侧存储。
*
* 对齐 Codex 的分层：分区结构与成员归属属于**用户数据**，由宿主落盘
* （Codex 是 `~/.codex/state_5.sqlite` 里的 `thread_sections` + `threads.thread_section_id`），
* 浏览器只负责折叠、展开这类视图偏好。
*
* 这里把文档写到当前 DSH profile 的 `plugin-data/<app>/` 下：换浏览器、清缓存都不会丢，
* 也不会和宿主自己的配置混在一起。写入走「临时文件 + rename」，避免进程中断留下半截 JSON。
*/
/** 单个分区文档的体积上限：这是结构数据，超过就说明客户端出了问题。 */
const SECTIONS_STORE_MAX_BYTES = 65536;
/** 单个分区内成员上限。 */
const SECTIONS_STORE_MAX_MEMBERS = 2e3;
/** 非法文档：调用方据此回 400，且绝不覆盖已存在的合法文件。 */
var SectionsDocumentError = class extends Error {};
/**
* 解析分区文档的落盘路径。
*
* @param ctx - 宿主 Context，可从中读到当前 profile。
* @returns 绝对路径：`<profileDir>/plugin-data/michengai.dsh-codex-ui/workspace-sections.json`。
*/
function resolveSectionsStorePath(ctx) {
	const { profileDir, homeDir } = resolveCurrentProfile(ctx);
	return join(profileDir !== "" ? profileDir : homeDir, "plugin-data", "michengai.dsh-codex-ui", "workspace-sections.json");
}
/** 校验并规范化分区文档；不合法时抛 {@link SectionsDocumentError}。 */
function validateSectionsDocument(value) {
	if (typeof value !== "object" || value === null) throw new SectionsDocumentError("分区数据必须是对象。");
	const raw = value;
	if (!Array.isArray(raw.sections)) throw new SectionsDocumentError("分区数据缺少 sections 数组。");
	if (raw.sections.length > 100) throw new SectionsDocumentError(`分区数量超过上限 100。`);
	const seenSections = /* @__PURE__ */ new Set();
	const seenWorkspaces = /* @__PURE__ */ new Set();
	const sections = raw.sections.map((item, index) => {
		if (typeof item !== "object" || item === null) throw new SectionsDocumentError(`第 ${index + 1} 个分区不是对象。`);
		const section = item;
		if (typeof section.id !== "string" || section.id.trim() === "" || section.id.length > 64) throw new SectionsDocumentError(`第 ${index + 1} 个分区的 id 不合法。`);
		if (seenSections.has(section.id)) throw new SectionsDocumentError(`分区 id 重复：${section.id}。`);
		seenSections.add(section.id);
		const name = typeof section.name === "string" ? section.name.trim() : "";
		if (name === "" || name.length > 64) throw new SectionsDocumentError(`分区「${section.id}」的名称不合法。`);
		if (!Array.isArray(section.ids)) throw new SectionsDocumentError(`分区「${section.id}」缺少 ids 数组。`);
		if (section.ids.length > 2e3) throw new SectionsDocumentError(`分区「${section.id}」成员数量超过上限 ${SECTIONS_STORE_MAX_MEMBERS}。`);
		const ids = section.ids.map((member) => {
			if (typeof member !== "string" || member === "" || member.length > 128) throw new SectionsDocumentError(`分区「${section.id}」存在不合法的成员 id。`);
			if (seenWorkspaces.has(member)) throw new SectionsDocumentError(`同一个工作区出现在多个分区：${member}。`);
			seenWorkspaces.add(member);
			return member;
		});
		return {
			id: section.id,
			name,
			ids
		};
	});
	return {
		version: typeof raw.version === "number" && Number.isFinite(raw.version) ? Math.trunc(raw.version) : 1,
		sections
	};
}
/**
* 读取分区文档。
*
* @param ctx - 宿主 Context。
* @returns 文档；文件不存在或内容损坏时返回 `undefined`（损坏内容不会被删除，便于排查）。
*/
function readSectionsDocument(ctx) {
	const path = resolveSectionsStorePath(ctx);
	if (!existsSync(path)) return void 0;
	try {
		const text = readFileSync(path, "utf8");
		if (text.length > 65536) return void 0;
		return validateSectionsDocument(JSON.parse(text));
	} catch {
		return;
	}
}
/**
* 原子写入分区文档。
*
* @param ctx - 宿主 Context。
* @param document - 已校验的文档。
*/
function writeSectionsDocument(ctx, document) {
	const path = resolveSectionsStorePath(ctx);
	const payload = JSON.stringify(validateSectionsDocument(document), null, 2);
	if (Buffer.byteLength(payload, "utf8") > 65536) throw new SectionsDocumentError("分区数据过大。");
	mkdirSync(dirname(path), { recursive: true });
	const temporary = `${path}.${process.pid}.tmp`;
	try {
		writeFileSync(temporary, payload, "utf8");
		renameSync(temporary, path);
	} catch (error) {
		try {
			if (existsSync(temporary)) unlinkSync(temporary);
		} catch {}
		throw error;
	}
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
		if (typeof ctx.on !== "function") return () => {};
		return ctx.on("plugin-manager/install-state", (event) => {
			noteHostInstallState(event);
		});
	}, "codex-ui: host plugin-manager install state");
	ctx.effect(() => {
		const disposeDependencies = host.webServer.register({
			kind: "exact",
			path: dependenciesEndpoint,
			handler: async (request, response) => {
				if (!authenticateBusinessRequest(ctx, request, response)) return;
				const url = new URL(request.url ?? "/", "http://localhost");
				try {
					if (request.method === "GET") {
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
							const { dependencies, updatedCount } = await updateAllDependencies(resolveDependencyRuntime(ctx));
							response.writeHead(200, {
								"content-type": "application/json; charset=utf-8",
								"cache-control": "no-store"
							});
							response.end(JSON.stringify({
								dependencies,
								restartRequired: updatedCount > 0,
								autoReload: true
							}));
							return;
						}
						const runtime = resolveDependencyRuntime(ctx);
						const dependencies = await installDependency(url.searchParams.get("dependency"), runtime);
						response.writeHead(200, {
							"content-type": "application/json; charset=utf-8",
							"cache-control": "no-store"
						});
						response.end(JSON.stringify({
							dependencies,
							restartRequired: true,
							autoReload: true
						}));
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
		/**
		* 工作区分区：结构与归属由宿主落盘（当前 profile 的 plugin-data 下），浏览器只留折叠这类视图偏好。
		* 对齐 Codex：`thread_sections` + `threads.thread_section_id` 在宿主，折叠状态在客户端。
		*/
		const disposeSections = host.webServer.register({
			kind: "exact",
			path: CODEX_UI_API_ENDPOINTS.sections,
			handler: async (request, response) => {
				if (!authenticateBusinessRequest(ctx, request, response)) return;
				const json = (status, body) => {
					response.writeHead(status, {
						"content-type": "application/json; charset=utf-8",
						"cache-control": "no-store"
					});
					response.end(JSON.stringify(body));
				};
				try {
					if (request.method === "GET") {
						json(200, readSectionsDocument(ctx) ?? {
							version: 1,
							sections: []
						});
						return;
					}
					if (request.method !== "POST" && request.method !== "PUT") {
						response.writeHead(405);
						response.end();
						return;
					}
					const body = await readRequestBody(request, SECTIONS_STORE_MAX_BYTES);
					if (body.trim() === "") {
						json(400, { error: "缺少分区数据。" });
						return;
					}
					let parsed;
					try {
						parsed = JSON.parse(body);
					} catch {
						json(400, { error: "分区数据不是合法 JSON。" });
						return;
					}
					const document = validateSectionsDocument(parsed);
					writeSectionsDocument(ctx, document);
					json(200, {
						ok: true,
						sections: document.sections.length
					});
				} catch (error) {
					if (error instanceof SectionsDocumentError) {
						json(400, { error: error.message });
						return;
					}
					if (error instanceof RequestBodyTooLargeError) {
						json(413, { error: "分区数据过大。" });
						return;
					}
					ctx.logger.warn("sections endpoint failed: %s", error);
					json(503, { error: "分区存储暂不可用。" });
				}
			}
		});
		return () => {
			disposeDependencies();
			disposeSections?.();
		};
	}, "michengai-codex-ui: catalogs");
}
//#endregion
export { RequestBodyTooLargeError, apply, inject, publicDependencyError, readRequestBody };
