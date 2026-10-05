import { Context } from "@deepseek-ai/cordis";
//#region src/index.d.ts
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
declare const inject: string[];
/** 提供不泄露地址、命令和凭证的连接器目录。 */
declare function apply(ctx: Context): void;
//#endregion
export { RequestBodyTooLargeError, apply, inject, publicDependencyError, readRequestBody };