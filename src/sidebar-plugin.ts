import type { Context } from '@deepseek-ai/cordis'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { CODEX_UI_API_ENDPOINTS } from './business-api.ts'

export const name = 'codex-ui-sidebar'
export const inject = ['webServer']

/** 子组件自身在 profile 配置里的 id。 */
const SUB_PLUGIN_ID = 'codex-ui-sidebar'

/**
 * 检查 profile 的 cordis.patch.yml 中是否显式配置了 disabled: true。
 * 与 composer / settings-skin 保持一致：停用后端点如实回报，客户端回退官方侧栏。
 */
export function isSubPluginDisabledOnDisk(id: string, homeDir?: string): boolean {
  try {
    const home = homeDir ?? process.env.DSH_HOME ?? join(homedir(), '.dsh')
    const profile = process.env.DSH_PROFILE ?? 'desktop'
    const patchPath = join(home, 'profiles', profile, 'cordis.patch.yml')
    if (existsSync(patchPath)) {
      const content = readFileSync(patchPath, 'utf8')
      const regex = new RegExp(`id:\\s*['"]?${id}['"]?\\s*\\n\\s*disabled:\\s*true`, 'm')
      if (regex.test(content)) return true
    }
  } catch {
    // 读取失败时保持启用，避免因临时 IO 问题让用户侧栏变回原生却没有任何提示。
  }
  return false
}

/**
 * 侧栏导航子组件 (Host 侧)
 * 挂载时通过 webServer 暴露 /api/dsh-codex-ui/sidebar；
 * 停用此子组件或端点不可达时，客户端关闭增强并回退 DSH 官方侧栏。
 */
export function apply(ctx: Context): void {
  const endpoint = CODEX_UI_API_ENDPOINTS.sidebar
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
        const disabled = isSubPluginDisabledOnDisk(SUB_PLUGIN_ID)
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
  }, 'michengai-codex-ui: sidebar state')
}
