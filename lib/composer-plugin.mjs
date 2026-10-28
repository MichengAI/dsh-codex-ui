import { t as CODEX_UI_API_ENDPOINTS } from "./business-api-CSNUY-u5.mjs";
import { t as isSubPluginDisabledOnDisk$1 } from "./profile-resolver-BdxX4BOB.mjs";
//#region src/composer-plugin.ts
const name = "codex-ui-composer";
const inject = ["webServer"];
/**
* 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true
* 避免在 DSH 桌面端未开启 HMR 或未重启时，内存 fiber 依然错误响应 enabled: true。
*/
function isSubPluginDisabledOnDisk(id, homeDir, ctx) {
	return isSubPluginDisabledOnDisk$1(id, ctx, homeDir);
}
/**
* Composer 输入框增强子组件 (Host 侧)
* 挂载时通过 webServer 暴露 /api/michengai/dsh-codex-ui/composer 端点；
* 当在 DSH 插件管理中停用此子组件时，此 fiber 被销毁或在此端点响应 enabled: false，客户端自动回退至 DSH 原生输入区。
*/
function apply(ctx) {
	const endpoint = CODEX_UI_API_ENDPOINTS.composer;
	ctx.effect(() => {
		const webServer = ctx.get("webServer");
		if (!webServer || typeof webServer.register !== "function") return () => {};
		const dispose = webServer.register({
			kind: "exact",
			path: endpoint,
			handler: (_request, response) => {
				const disabled = isSubPluginDisabledOnDisk("codex-ui-composer", void 0, ctx);
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
	}, "michengai-codex-ui: composer state");
}
//#endregion
export { apply, inject, isSubPluginDisabledOnDisk, name };
