import { Context } from "@deepseek-ai/cordis";
//#region src/composer-plugin.d.ts
declare const name = "codex-ui-composer";
declare const inject: string[];
declare function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean;
/**
 * Composer 输入框增强子组件 (Host 侧)
 * 1. 暴露 /api/michengai/dsh-codex-ui/composer (启停状态)
 * 2. 暴露 /api/michengai/dsh-codex-ui/composer/prediction (输入预测与续写)
 */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, isSubPluginDisabledOnDisk, name };