import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
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
		for (let i = 0; i < argv.length; i++) if (argv[i] === "--profile" && argv[i + 1]) {
			profileName = argv[i + 1].trim();
			break;
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
function isSubPluginDisabledOnDisk(id, ctx, customHomeDir) {
	try {
		const { profileDir } = resolveCurrentProfile(ctx, customHomeDir);
		const patchPath = join(profileDir, "cordis.patch.yml");
		if (existsSync(patchPath)) {
			const content = readFileSync(patchPath, "utf8");
			if (new RegExp(`id:\\s*['"]?${id}['"]?\\s*\\n\\s*disabled:\\s*true`, "m").test(content)) return true;
		}
	} catch {}
	return false;
}
//#endregion
export { isSubPluginDisabledOnDisk as t };
