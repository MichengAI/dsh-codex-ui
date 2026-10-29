import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
//#region src/business-api.ts
const CODEX_UI_API_BASE = "/api/michengai/dsh-codex-ui";
const CODEX_UI_API_ENDPOINTS = Object.freeze({
	dependencies: `${CODEX_UI_API_BASE}/dependencies`,
	settingsSkin: `${CODEX_UI_API_BASE}/settings-skin`,
	composer: `${CODEX_UI_API_BASE}/composer`,
	sidebar: `${CODEX_UI_API_BASE}/sidebar`,
	sections: `${CODEX_UI_API_BASE}/sections`,
	theme: `${CODEX_UI_API_BASE}/theme`
});
//#endregion
//#region src/profile-resolver.ts
/**
* 健壮解析当前 DSH 实例的 Profile 信息：
* 优先级：
* 1. Cordis 服务 profileContext（官方运行时注入，最权威）
* 2. 环境变量 DSH_PROFILE_DIR
* 3. 命令行参数 --profile <name>
* 4. 环境变量 DSH_PROFILE
* 5. 兜底默认值 'web'
*/
function resolveCurrentProfile(ctx, customHomeDir) {
	const homeDir = customHomeDir ?? process.env.DSH_HOME ?? join(homedir(), ".dsh");
	let profileName;
	let profileDir;
	try {
		const launched = ctx?.get?.("profileContext");
		if (typeof launched?.name === "string" && launched.name.trim()) profileName = launched.name.trim();
		if (typeof launched?.dir === "string" && isAbsolute(launched.dir)) profileDir = resolve(launched.dir);
	} catch {}
	if (!profileDir && process.env.DSH_PROFILE_DIR) try {
		profileDir = resolve(process.env.DSH_PROFILE_DIR);
		if (!profileName) profileName = basename(profileDir);
	} catch {}
	if (!profileName && typeof process !== "undefined" && Array.isArray(process.argv)) {
		const argv = process.argv;
		for (let i = 0; i < argv.length; i++) {
			const arg = argv[i];
			if (arg === "--profile" && argv[i + 1]) {
				profileName = argv[i + 1].trim();
				break;
			}
			if (typeof arg === "string" && arg.startsWith("--profile=")) {
				profileName = arg.slice(10).trim();
				break;
			}
		}
	}
	if (!profileName && process.env.DSH_PROFILE) profileName = process.env.DSH_PROFILE.trim();
	if (!profileName) profileName = "web";
	if (!profileDir) profileDir = join(homeDir, "profiles", profileName);
	return {
		profileName,
		profileDir,
		homeDir
	};
}
/**
* 严格基于当前 Profile 检查 cordis.patch.yml 中是否显式配置了 disabled: true。
* 杜绝跨 Profile 串读（绝不扫描非当前 Profile 的目录）。
*/
function isSubPluginDisabledOnDisk(id, homeDir, ctx) {
	try {
		const { profileDir } = resolveCurrentProfile(ctx, homeDir);
		const patchPath = join(profileDir, "cordis.patch.yml");
		if (existsSync(patchPath)) {
			const itemBlocks = readFileSync(patchPath, "utf8").split(/(?:\r?\n)(?=-\s+)/);
			for (let i = itemBlocks.length - 1; i >= 0; i--) {
				const block = itemBlocks[i];
				if (new RegExp(`(?:^|\\s)id:\\s*['"]?${id}['"]?(?:\\s|$)`, "m").test(block)) {
					if (/(?:^|\s)disabled:\s*true(?:\s|$)/m.test(block)) return true;
					if (/(?:^|\s)disabled:\s*false(?:\\s|$)/m.test(block)) return false;
					return false;
				}
			}
		}
	} catch {}
	return false;
}
//#endregion
export { resolveCurrentProfile as n, CODEX_UI_API_ENDPOINTS as r, isSubPluginDisabledOnDisk as t };
