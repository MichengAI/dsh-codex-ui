import { Context } from "@deepseek-ai/cordis";
//#region src/composer-plugin.d.ts
declare const name = "codex-ui-composer";
declare const inject: string[];
/**
 * 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true
 * 避免在 DSH 桌面端未开启 HMR 或未重启时，内存 fiber 依然错误响应 enabled: true。
 */
declare function isSubPluginDisabledOnDisk(id: string, homeDir?: string): boolean;
/**
 * Composer 输入框增强子组件 (Host 侧)
 * 挂载时通过 webServer 暴露 /api/michengai/dsh-codex-ui/composer 端点；
 * 当在 DSH 插件管理中停用此子组件时，此 fiber 被销毁或在此端点响应 enabled: false，客户端自动回退至 DSH 原生输入区。
 */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, isSubPluginDisabledOnDisk, name };