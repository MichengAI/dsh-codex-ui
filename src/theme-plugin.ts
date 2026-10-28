import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import { isSubPluginDisabledOnDisk as checkDisabledOnDisk } from './profile-resolver.ts'

export const name = 'codex-ui-theme'
export const inject = ['webServer']

/** 子组件自身在 profile 配置里的 id。 */
const SUB_PLUGIN_ID = 'codex-ui-theme'

/**
 * 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true。
 * 与 sidebar / composer / settings-skin 保持一致：停用后端点如实回报，客户端回退官方主题与默认排版。
 */
export function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean {
  return checkDisabledOnDisk(id, homeDir, ctx)
}

/**
 * 主题与外观子组件 (Host 侧)
 * 挂载时通过 webServer 暴露 /api/michengai/dsh-codex-ui/theme；
 * 停用此子组件或端点不可达时，客户端回退官方主题并关闭云母质感。
 */
export function apply(ctx: Context): void {
  const endpoint = CODEX_UI_API_ENDPOINTS.theme
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
        const disabled = isSubPluginDisabledOnDisk(SUB_PLUGIN_ID, undefined, ctx)
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
  }, 'michengai-codex-ui: theme state')
}
