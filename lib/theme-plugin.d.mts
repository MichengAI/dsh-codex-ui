import { Context } from "@deepseek-ai/cordis";
//#region src/theme-plugin.d.ts
declare const name = "codex-ui-theme";
declare const inject: string[];
/**
 * 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true。
 * 与 sidebar / composer / settings-skin 保持一致：停用后端点如实回报，客户端回退官方主题与默认排版。
 */
declare function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean;
/**
 * 主题与外观子组件 (Host 侧)
 * 挂载时通过 webServer 暴露 /api/michengai/dsh-codex-ui/theme；
 * 停用此子组件或端点不可达时，客户端回退官方主题并关闭云母质感。
 */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, isSubPluginDisabledOnDisk, name };