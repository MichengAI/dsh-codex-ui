import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

/**
 * DSH 发布的客户端入口统一是 `window.__ModuleLoader__.load({ id, factory })` 装配包，
 * 直接 import 只会触发注册、拿不到任何导出。测试要用生产实现，必须先补上装载器，
 * 再读取包文件求值，最后把 factory 交给它自己的 `require` 执行并取回导出。
 */
type ClientBundleModule = Record<string, unknown>

const require = createRequire(import.meta.url)

declare global {
  interface Window {
    __ModuleLoader__?: { load: (handoff: { id: string; factory: (require: NodeRequire) => ClientBundleModule }) => void }
  }
}

/** 每个调用点重新求值一次，避免多个用例共享同一次装配产生的模块状态。 */
export function loadClientBundle(specifier: string): ClientBundleModule {
  let loaded: ClientBundleModule | undefined
  window.__ModuleLoader__ = {
    load: ({ factory }) => { loaded = factory(require) },
  }
  const code = readFileSync(require.resolve(specifier), 'utf8')
  new Function('window', code)(window)
  if (loaded === undefined) throw new Error(`${specifier} 没有通过 __ModuleLoader__ 装配`)
  return loaded
}
