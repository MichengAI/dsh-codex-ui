import { Context } from "@deepseek-ai/cordis";
//#region src/desktop-menu-plugin.d.ts
declare const name = "codex-ui-desktop-menu";
declare const inject: string[];
/**
 * 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true。
 */
declare function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean;
/**
 * 桌面端标题栏窗口菜单子组件 (Host 侧)
 *
 * 通过 webServer 暴露 /api/michengai/dsh-codex-ui/desktop-menu：
 * - 无 action：返回子插件启用状态（客户端据此决定是否注入菜单）
 * - ?action=status：重启能力探测 + 一次性令牌 + 当前重启阶段
 * - ?action=restart：请求重启应用（必须带 x-dcu-restart-key）
 *
 * 停用此子组件或端点返回 disabled 时，客户端不注入任何菜单。
 */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, isSubPluginDisabledOnDisk, name };