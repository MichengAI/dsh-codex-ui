import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import { isSubPluginDisabledOnDisk as checkDisabledOnDisk } from './profile-resolver.ts'
import { registerComposerPredictions } from './composer-prediction.ts'

export const name = 'codex-ui-composer'
export const inject = ['webServer', 'connection', 'llm', 'sessions']

export function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean {
  return checkDisabledOnDisk(id, homeDir, ctx)
}

/**
 * Composer 输入框增强子组件 (Host 侧)
 * 1. 暴露 /api/michengai/dsh-codex-ui/composer (启停状态)
 * 2. 暴露 /composer-prediction 与 /composer-prediction/v2 (参考插件标准流式预测)
 */
export function apply(ctx: Context): void {
  const statusEndpoint = CODEX_UI_API_ENDPOINTS.composer

  // 1. 注册标准预测引擎（对齐成熟参考插件）
  ctx.effect(() => {
    const disabled = isSubPluginDisabledOnDisk('codex-ui-composer', undefined, ctx)
    if (disabled) return () => {}
    return registerComposerPredictions(ctx)
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
        response.end(JSON.stringify({ enabled: !disabled }))
      },
    })

    return () => {
      disposeStatus?.()
    }
  }, 'michengai-codex-ui: composer state')
}
