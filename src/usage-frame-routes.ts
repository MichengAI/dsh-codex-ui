/** 提供经过宿主认证的同源费用承载资源；只读取固定文件，不代理计费 API。 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { USAGE_FRAME_PATH } from './usage-frame/contract.ts'
export const USAGE_FRAME_ROUTES = [USAGE_FRAME_PATH, `${USAGE_FRAME_PATH}.js`, `${USAGE_FRAME_PATH}.css`, '/api/dsh-codex-ui/usage/plugin.js'] as const
export async function usageFrameAsset(path: string, profileDir: string): Promise<{ contentType: string; body: string }> {
  const files: Record<string, [string, string]> = {
    [USAGE_FRAME_PATH]: ['text/html; charset=utf-8', fileURLToPath(new URL('../assets/usage-frame.html', import.meta.url))],
    [`${USAGE_FRAME_PATH}.js`]: ['text/javascript; charset=utf-8', fileURLToPath(new URL('./usage-frame.js', import.meta.url))],
    [`${USAGE_FRAME_PATH}.css`]: ['text/css; charset=utf-8', fileURLToPath(new URL('./usage-frame.css', import.meta.url))],
    '/api/dsh-codex-ui/usage/plugin.js': ['text/javascript; charset=utf-8', resolve(profileDir, 'node_modules', '@kenz1117', 'dsh-ui-usage-billing', 'lib', 'client.js')],
  }
  const file = files[path]
  if (!file) throw new Error('未知费用资源')
  return { contentType: file[0], body: await readFile(file[1], 'utf8') }
}
