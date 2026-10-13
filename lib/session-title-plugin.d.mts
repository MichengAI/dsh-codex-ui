import { Context } from "@deepseek-ai/cordis";
//#region src/session-title-plugin.d.ts
declare const name = "michengai-codex-ui-session-title";
declare const inject: string[];
/** Register teardown before asynchronous official-provider draining. */
declare function apply(ctx: Context): Promise<void>;
//#endregion
export { apply, inject, name };