import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import { isSubPluginDisabledOnDisk as checkDisabledOnDisk } from './profile-resolver.ts'
import { apply as applyPredictions } from './composer-prediction.ts'

export const name = 'codex-ui-composer'
export const inject = ['webServer']

export function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean {
  return checkDisabledOnDisk(id, homeDir, ctx)
}

export type ComposerPluginConfig = {
  /**
   * 是否允许智能输入预测（ghost 行内建议）。
   *
   * 这是**站点级**开关：置为 `false` 后，Host 不注册预测引擎，客户端状态端点回报
   * `prediction: false`，设置页的用户开关随之置灰。用户级开关（客户端 localStorage）
   * 只能在此为 `true` 时才生效——与主题子插件的 fail-closed 语义一致。
   *
   * @default true
   */
  prediction?: boolean
}

/** 严格读取配置：只有显式 `false` 才关闭，其余（含未声明、类型错误）一律视为开启。 */
export function resolvePredictionAllowed(config: ComposerPluginConfig | undefined): boolean {
  if (config === null || typeof config !== 'object') return true
  return config.prediction !== false
}

/**
 * Composer 输入框增强子组件 (Host 侧)
 * 1. 暴露 /api/michengai/dsh-codex-ui/composer (启停状态 + 预测开关状态)
 * 2. 暴露 /composer/prediction 与 /composer/prediction/stream (流式预测)
 */
export function apply(ctx: Context, config?: ComposerPluginConfig): void {
  const statusEndpoint = CODEX_UI_API_ENDPOINTS.composer
  const predictionAllowed = resolvePredictionAllowed(config)

  // 1. 注册标准预测引擎（对齐成熟参考插件）；站点级关闭时完全不注册，也就不可能产生模型调用
  ctx.effect(() => {
    const disabled = isSubPluginDisabledOnDisk('codex-ui-composer', undefined, ctx)
    if (disabled || !predictionAllowed) return () => {}
    applyPredictions(ctx)
    return () => {}
  }, 'michengai-codex-ui: composer predictions engine')

  // 2. 状态端点
  ctx.effect(() => {
    const webServer = (ctx as any).webServer ?? (ctx as any).get?.('webServer')
    if (!webServer || typeof webServer.register !== 'function') return () => {}

    const disposeStatus = webServer.register({
      kind: 'exact',
      path: statusEndpoint,
      handler: (_request: any, response: any) => {
        const disabled = isSubPluginDisabledOnDisk('codex-ui-composer', undefined, ctx)
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        })
        response.end(JSON.stringify({ enabled: !disabled, prediction: predictionAllowed }))
      },
    })

    return () => {
      disposeStatus?.()
    }
  }, 'michengai-codex-ui: composer state')
}
