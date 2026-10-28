import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import { isSubPluginDisabledOnDisk } from './profile-resolver.ts'

export const name = 'codex-ui-settings-skin'
export const inject = ['webServer']

/**
 * 原生设置皮肤子组件 (Host 侧)
 * 挂载时通过 webServer 暴露 /api/michengai/dsh-codex-ui/settings-skin 端点；
 * 当在 DSH 插件管理中停用此子组件时，此 fiber 被销毁或响应 enabled: false，客户端自动回退至 DSH 原生外观。
 */
export function apply(ctx: Context): void {
  const endpoint = CODEX_UI_API_ENDPOINTS.settingsSkin
  ctx.effect(() => {
    const webServer = ctx.get('webServer') as {
      register: (options: {
        kind: 'exact'
        path: string
        handler: (req: unknown, res: { writeHead: (status: number, headers?: Record<string, string>) => void; end: (body?: string) => void }) => void | Promise<void>
      }) => (() => void) | undefined
    } | undefined
    if (!webServer || typeof webServer.register !== 'function') return () => {}
    const dispose = webServer.register({
      kind: 'exact',
      path: endpoint,
      handler: (_request, response) => {
        const disabled = isSubPluginDisabledOnDisk('codex-ui-settings-skin', undefined, ctx)
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        })
        response.end(JSON.stringify({ enabled: !disabled }))
      },
    })
    return () => {
      dispose?.()
    }
  }, 'michengai-codex-ui: settings skin state')
}
