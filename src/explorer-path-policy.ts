import { win32 } from 'node:path'

function normalizedWindowsPath(path: string): string | undefined {
  if (!win32.isAbsolute(path)) return undefined
  const normalized = win32.normalize(path.trim()).replace(/[\\/]+$/, '')
  const root = win32.parse(normalized).root
  if (root.startsWith('\\\\') || normalized.toLocaleLowerCase('en-US') === root.replace(/[\\/]+$/, '').toLocaleLowerCase('en-US')) {
    return undefined
  }
  return normalized
}

/**
 * 仅允许打开注册表中已有的工作区根目录。
 * 不接受子目录、盘符根或 UNC，避免同源页面把 Host 端点当成任意路径启动器。
 */
export function authorizedExplorerWorkspacePath(path: string, workspaceRoots: readonly string[]): string | undefined {
  const target = normalizedWindowsPath(path)
  if (target === undefined) return undefined
  const targetKey = target.toLocaleLowerCase('en-US')
  for (const root of workspaceRoots) {
    const normalizedRoot = normalizedWindowsPath(root)
    if (normalizedRoot !== undefined && normalizedRoot.toLocaleLowerCase('en-US') === targetKey) return normalizedRoot
  }
  return undefined
}
