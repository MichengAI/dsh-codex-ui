import { t as CODEX_UI_API_ENDPOINTS } from "./business-api-CSNUY-u5.mjs";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
//#region src/sidebar-plugin.ts
const name = "codex-ui-sidebar";
const inject = ["webServer"];
/** 子组件自身在 profile 配置里的 id。 */
const SUB_PLUGIN_ID = "codex-ui-sidebar";
/**
* 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true。
* 与 composer / settings-skin 保持一致：停用后端点如实回报，客户端回退官方侧栏。
*/
function isSubPluginDisabledOnDisk(id, homeDir) {
	try {
		const home = homeDir ?? process.env.DSH_HOME ?? join(homedir(), ".dsh");
		const profile = process.env.DSH_PROFILE ?? "desktop";
		const patchPath = join(home, "profiles", profile, "cordis.patch.yml");
		if (existsSync(patchPath)) {
			const content = readFileSync(patchPath, "utf8");
			if (new RegExp(`id:\\s*['"]?${id}['"]?\\s*\\n\\s*disabled:\\s*true`, "m").test(content)) return true;
		}
	} catch {}
	return false;
}
/**
* 侧栏导航子组件 (Host 侧)
* 挂载时通过 webServer 暴露 /api/michengai/dsh-codex-ui/sidebar；
* 停用此子组件或端点不可达时，客户端关闭增强并回退 DSH 官方侧栏。
*/
function apply(ctx) {
	const endpoint = CODEX_UI_API_ENDPOINTS.sidebar;
	ctx.effect(() => {
		const webServer = ctx.get("webServer");
		if (!webServer || typeof webServer.register !== "function") return () => {};
		const dispose = webServer.register({
			kind: "exact",
			path: endpoint,
			handler: (_request, response) => {
				const disabled = isSubPluginDisabledOnDisk(SUB_PLUGIN_ID);
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
	}, "michengai-codex-ui: sidebar state");
}
//#endregion
export { apply, inject, isSubPluginDisabledOnDisk, name };
