import { Context } from "@deepseek-ai/cordis";
//#region src/session-title-plugin.d.ts
declare const name = "michengai-codex-ui-session-title";
declare const inject: string[];
/** 独立挂到官方 session-title-llm 同级，等标题服务和模型服务就绪后再占 first-prompt 位。 */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, name };