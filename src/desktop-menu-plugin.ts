import type { Context } from '@deepseek-ai/cordis'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'
import { isSubPluginDisabledOnDisk as checkDisabledOnDisk } from './profile-resolver.ts'
import { createDesktopMenuHandler, type RouteRequest, type RouteResponse } from './desktop-menu-route.ts'

export const name = 'codex-ui-desktop-menu'
export const inject = ['webServer']

/** 子组件自身在 profile 配置里的 id。 */
const SUB_PLUGIN_ID = 'codex-ui-desktop-menu'

/**
 * 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true。
 */
export function isSubPluginDisabledOnDisk(id: string, homeDir?: string, ctx?: Context): boolean {
  return checkDisabledOnDisk(id, homeDir, ctx)
}

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
export function apply(ctx: Context): void {
  const endpoint = CODEX_UI_API_ENDPOINTS.desktopMenu
  const handler = createDesktopMenuHandler({
    isDisabled: () => isSubPluginDisabledOnDisk(SUB_PLUGIN_ID, undefined, ctx),
  })

  ctx.effect(() => {
    const webServer = ctx.get('webServer') as {
      register: (options: {
        kind: 'exact' | 'prefix'
        path: string
        handler: (req: RouteRequest, res: RouteResponse) => void | Promise<void>
      }) => (() => void) | undefined
    } | undefined
    if (!webServer || typeof webServer.register !== 'function') return () => {}
    const dispose = webServer.register({
      // 用 prefix 而非 exact：同一个端点要同时吃 `?action=status` 与 `?action=restart`
      kind: 'prefix',
      path: endpoint,
      handler,
    })
    return () => {
      dispose?.()
    }
  }, 'michengai-codex-ui: desktop menu state')
}
