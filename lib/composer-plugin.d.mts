import { Context } from "@deepseek-ai/cordis";
//#region src/composer-plugin.d.ts
declare const name = "codex-ui-composer";
declare const inject: string[];
declare function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean;
type ComposerPluginConfig = {
  /**
   * 是否允许智能输入预测（ghost 行内建议）。
   *
   * 这是**站点级**开关：置为 `false` 后，Host 不注册预测引擎，客户端状态端点回报
   * `prediction: false`，设置页的用户开关随之置灰。用户级开关（客户端 localStorage）
   * 只能在此为 `true` 时才生效——与主题子插件的 fail-closed 语义一致。
   *
   * @default true
   */
  prediction?: boolean;
};
/** 严格读取配置：只有显式 `false` 才关闭，其余（含未声明、类型错误）一律视为开启。 */
declare function resolvePredictionAllowed(config: ComposerPluginConfig | undefined): boolean;
/**
 * Composer 输入框增强子组件 (Host 侧)
 * 1. 暴露 /api/michengai/dsh-codex-ui/composer (启停状态 + 预测开关状态)
 * 2. 暴露 /composer/prediction 与 /composer/prediction/stream (流式预测)
 */
declare function apply(ctx: Context, config?: ComposerPluginConfig): void;
//#endregion
export { ComposerPluginConfig, apply, inject, isSubPluginDisabledOnDisk, name, resolvePredictionAllowed };