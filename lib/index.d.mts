import { Context } from "@deepseek-ai/cordis";
//#region src/host-services.d.ts
type HttpRequest = {
  method?: string;
  url?: string;
  /** Node 原生请求头（小写键名），用于跨站请求判定。 */
  headers?: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>;
};
type ConnectionServiceLike = {
  requestRejection?: (request: {
    headers?: HttpRequest['headers'];
  }) => 401 | 403 | undefined;
  admit?: (request: {
    headers?: HttpRequest['headers'];
  }) => {
    rejection?: 401 | 403 | 503;
    peer?: unknown;
  } | undefined;
};
//#endregion
//#region src/index.d.ts
/**
 * composer 子插件被停用时，由主插件补一个只读状态兜底端点。
 *
 * 客户端以「探活 → 启停输入框增强」驱动 UI：子插件在 cordis.patch.yml 里被停用后，
 * 它自己注册的 `/composer` 端点随之消失，探活只能拿到 404，DevTools 里就会持续报错。
 * 这里在磁盘配置确认停用时接管同一路径，返回 `enabled: false`，客户端据此立即收敛。
 * 子插件启用时不注册，避免与 composer 子插件的同名路由冲突（同一时刻只应有一个注册者）。
 *
 * @returns 路由注销函数；未注册时返回 undefined。
 */
declare function registerComposerStatusFallback(ctx: Context): (() => void) | undefined;
type HostRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>;
};
/** 把安装错误收成可给浏览器看的文案：我们自己的中文说明保留，带本地路径的底层错误脱敏。 */
declare function publicDependencyError(error: unknown): string;
declare class RequestBodyTooLargeError extends Error {}
/** 有界读取 Node HTTP body；偏好接口只接受很小的 JSON。 */
declare function readRequestBody(request: HostRequest, maxBytes?: number): Promise<string>;
type HostResponse = {
  writeHead(status: number, headers?: Record<string, string>): void;
  end(body?: string): void;
};
type AuthenticationStatus = 401 | 403 | 503;
type AuthenticationErrorBody = (status: AuthenticationStatus, message: string) => Record<string, unknown>;
/**
 * 解析可用于校验业务请求的连接服务。
 *
 * @internal 仅供用例直接验收宿主契约，不属于本包的公开 API。
 */
declare function resolveConnectionService(ctx: Context, injectedConn?: ConnectionServiceLike): ConnectionServiceLike | undefined;
/**
 * 所有业务 REST 依赖 connection >=0.1.2-rc.1 的 Host/Origin/Fetch Metadata 与登录检查。
 * 必须在读取请求体及执行副作用前调用；不得将 undefined 以外的拒绝结果当作放行。
 * 发布包信任边界由 tests/business-rest-auth.assert.ts 的真实宿主契约用例验证。
 *
 * @internal 仅供用例直接验收宿主契约，不属于本包的公开 API。
 */
declare function authenticateBusinessRequest(ctx: Context, request: HostRequest, response: HostResponse, errorBody?: AuthenticationErrorBody, peer?: unknown, localConnection?: ConnectionServiceLike): boolean;
declare const inject: string[];
/** 提供不泄露地址、命令和凭证的连接器目录。 */
declare function apply(ctx: Context): void;
//#endregion
export { type ConnectionServiceLike, RequestBodyTooLargeError, apply, authenticateBusinessRequest, inject, publicDependencyError, readRequestBody, registerComposerStatusFallback, resolveConnectionService };