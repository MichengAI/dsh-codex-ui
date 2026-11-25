//#region src/host-services.ts
/** 新宿主的 admit 会访问关联认证服务；仅此子作用域依赖它，旧宿主不受启动门控。 */
function captureScopedConnection(ctx) {
	let connection;
	ctx.inject?.(["connection", "connection.authentication"], (authCtx) => {
		authCtx.effect(() => {
			connection = authCtx.get("connection");
			return () => {
				connection = void 0;
			};
		});
	});
	return () => connection;
}
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
export { hostServices as n, captureScopedConnection as t };
