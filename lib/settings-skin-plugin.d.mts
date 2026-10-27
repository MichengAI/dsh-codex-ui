import { Context } from "@deepseek-ai/cordis";
//#region src/settings-skin-plugin.d.ts
declare const name = "codex-ui-settings-skin";
declare const inject: string[];
/**
 * 原生设置皮肤子组件 (Host 侧)
 * 挂载时通过 webServer 暴露 /api/dsh-codex-ui/settings-skin 端点；
 * 当在 DSH 插件管理中停用此子组件时，此 fiber 被销毁或响应 enabled: false，客户端自动回退至 DSH 原生外观。
 */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, name };