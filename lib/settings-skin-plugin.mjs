import { t as CODEX_UI_API_ENDPOINTS } from "./business-api-CGqzzmo-.mjs";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
//#region src/settings-skin-plugin.ts
const name = "codex-ui-settings-skin";
const inject = ["webServer"];
/**
* 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true
*/
function isSubPluginDisabledOnDisk(id) {
	try {
		const home = process.env.DSH_HOME ?? join(homedir(), ".dsh");
		const profile = process.env.DSH_PROFILE ?? "desktop";
		const candidatePaths = [
			join(home, "profiles", profile, "cordis.patch.yml"),
			join(home, "profiles", "desktop", "cordis.patch.yml"),
			join(home, "profiles", "web", "cordis.patch.yml")
		];
		for (const patchPath of candidatePaths) {
			if (!existsSync(patchPath)) continue;
			const content = readFileSync(patchPath, "utf8");
			if (new RegExp(`id:\\s*['"]?${id}['"]?\\s*\\n\\s*disabled:\\s*true`, "m").test(content)) return true;
		}
	} catch {}
	return false;
}
/**
* 原生设置皮肤子组件 (Host 侧)
* 挂载时通过 webServer 暴露 /api/dsh-codex-ui/settings-skin 端点；
* 当在 DSH 插件管理中停用此子组件时，此 fiber 被销毁或响应 enabled: false，客户端自动回退至 DSH 原生外观。
*/
function apply(ctx) {
	const endpoint = CODEX_UI_API_ENDPOINTS.settingsSkin;
	ctx.effect(() => {
		const webServer = ctx.get("webServer");
		if (!webServer || typeof webServer.register !== "function") return () => {};
		const dispose = webServer.register({
			kind: "exact",
			path: endpoint,
			handler: (_request, response) => {
				const disabled = isSubPluginDisabledOnDisk("codex-ui-settings-skin");
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
					"cache-control": "no-store"
				});
				response.end(JSON.stringify({ enabled: !disabled }));
			}
		});
		return () => {
			dispose?.();
		};
	}, "michengai-codex-ui: settings skin state");
}
//#endregion
export { apply, inject, name };
