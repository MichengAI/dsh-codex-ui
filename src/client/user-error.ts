import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS, type CodexUiKey } from './locales.ts'
import { businessRequestErrorKey } from './business-request-error.ts'

type Translator = TranslateNS<typeof NS>

/** 仅显式构造的本地化错误允许原样进入界面。 */
export class UserFacingError extends Error {}

/** 将业务错误映射为当前语言，未知底层错误统一脱敏。 */
export function userErrorText(error: unknown, t: Translator): string {
  const requestKey = businessRequestErrorKey(error)
  if (requestKey !== undefined) return t(requestKey)
  if (error instanceof UserFacingError) return error.message
  return t('errors.generic')
}

const INSTALL_ERROR_KEYS: readonly [RegExp, CodexUiKey][] = [
  [/没有进入当前 Profile|did not enter this profile/i, 'about.installUnchanged'],
  [/pnpm 仓库不一致.*停止当前 DSH Web|pnpm store do not match.*stop the current DSH Web/i, 'about.installStoreMismatchWeb'],
  [/停止当前 DSH Web|stop the current DSH Web/i, 'about.installExitWeb'],
  [/完全退出桌面端|无法覆盖正在运行的插件文件|running plugin files|quit DSH Desktop/i, 'about.installExitDesktop'],
  [/DSH Web 终端输出|DSH Web terminal/i, 'about.installWebFailed'],
  [/pnpm 仓库不一致|pnpm store do not match/i, 'about.installStoreMismatch'],
  [/构建脚本策略|build-script policy/i, 'about.installBuildPolicy'],
  [/找不到 pnpm|pnpm (?:is )?not (?:available|found)/i, 'about.installPnpmMissing'],
  [/安装超时|installation timed out/i, 'about.installTimeout'],
  [/服务尚未就绪|Profile 信息无效|dependency service is not ready/i, 'about.installServiceUnavailable'],
]

/** 安装错误保留用户可执行的处理建议，但不直接展示 Host 原文。 */
export function installErrorText(error: unknown, t: Translator): string {
  const requestKey = businessRequestErrorKey(error)
  if (requestKey !== undefined) return t(requestKey)
  const message = error instanceof Error ? error.message : String(error)
  const match = INSTALL_ERROR_KEYS.find(([pattern]) => pattern.test(message))
  return t(match?.[1] ?? 'about.installFailed')
}
