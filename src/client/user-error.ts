import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS, type CodexUiKey } from './locales.ts'
import { WorkspaceGroupError, type WorkspaceGroupErrorCode } from '../workspace-groups.ts'

type Translator = TranslateNS<typeof NS>

const WORKSPACE_GROUP_ERROR_KEYS: Readonly<Record<WorkspaceGroupErrorCode, CodexUiKey>> = {
  'group-invalid': 'errors.groupInvalid',
  'workspace-invalid': 'errors.workspaceInvalid',
  'group-missing': 'errors.groupMissing',
  'order-anchor-missing': 'errors.orderAnchorMissing',
}

export type HostAction = 'rename' | 'delete' | 'archive' | 'fork'

const HOST_ACTION_DEFAULT_KEYS: Readonly<Record<HostAction, CodexUiKey>> = {
  rename: 'sessions.renameFailed',
  delete: 'sessions.deleteFailed',
  archive: 'sessions.archiveFailed',
  fork: 'sessions.forkFailed',
}

const HOST_ACTION_ERROR_KEYS: Readonly<Record<HostAction, Readonly<Record<string, CodexUiKey>>>> = {
  rename: {
    'session/not-found': 'sessions.unknown',
    'session/title-invalid': 'sessions.renameInvalid',
  },
  delete: { 'session/not-found': 'sessions.unknown' },
  archive: { 'session/not-found': 'sessions.unknown' },
  fork: {
    'session/not-found': 'sessions.unknown',
    'session/fork-unavailable': 'sessions.forkUnavailable',
  },
}

const INSTALL_ERROR_KEYS: readonly [RegExp, CodexUiKey][] = [
  [/没有进入当前 Profile|did not enter this profile/i, 'about.installUnchanged'],
  [/完全退出桌面端|无法覆盖正在运行的插件文件|running plugin files|quit DSH Desktop/i, 'about.installExitDesktop'],
  [/pnpm 仓库不一致|pnpm store do not match/i, 'about.installStoreMismatch'],
  [/构建脚本策略|build-script policy/i, 'about.installBuildPolicy'],
  [/找不到 pnpm|pnpm (?:is )?not (?:available|found)/i, 'about.installPnpmMissing'],
  [/安装超时|installation timed out/i, 'about.installTimeout'],
  [/服务尚未就绪|Profile 信息无效|dependency service is not ready/i, 'about.installServiceUnavailable'],
]

/** 仅显式构造的本地化错误允许原样进入界面。 */
export class UserFacingError extends Error {}

/** 保留 Host 结构化失败及操作语境，界面只消费受控映射。 */
export class HostActionError extends Error {
  readonly name = 'HostActionError'

  constructor(readonly action: HostAction, readonly reason: unknown) {
    super(`Host ${action} 操作失败`)
  }
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

/** DSH 明确要求跨 bundle 按结构标记识别 RemoteFailure，不能使用 instanceof。 */
function remoteFailureCode(value: unknown): string | undefined {
  const seen = new Set<object>()
  let current = value
  while (true) {
    const record = objectRecord(current)
    if (record === undefined || seen.has(record)) return undefined
    seen.add(record)
    if (record.isDSHRemoteError === true && typeof record.code === 'string') return record.code
    current = record.rpcError
  }
}

function diagnosticMessage(value: unknown): string | undefined {
  if (value instanceof Error) return value.message
  const record = objectRecord(value)
  return typeof record?.message === 'string' ? record.message : undefined
}

function hostActionErrorKey(error: HostActionError): CodexUiKey {
  const code = remoteFailureCode(error.reason)
  if (code !== undefined) {
    const key = HOST_ACTION_ERROR_KEYS[error.action][code]
    if (key !== undefined) return key
  }
  // Archive Manager 的旧契约只在诊断文案中提供稳定英文标记；仅识别标记，不展示原文。
  if (error.action === 'delete' && diagnosticMessage(error.reason)?.includes('UNKNOWN_SESSION') === true) return 'sessions.unknown'
  return HOST_ACTION_DEFAULT_KEYS[error.action]
}

/** 将业务错误映射为当前语言，未知底层错误统一脱敏。 */
export function userErrorText(error: unknown, t: Translator): string {
  if (error instanceof UserFacingError) return error.message
  if (error instanceof WorkspaceGroupError) return t(WORKSPACE_GROUP_ERROR_KEYS[error.code])
  if (error instanceof HostActionError) return t(hostActionErrorKey(error))
  return t('errors.generic')
}

/** 安装错误保留用户可执行的处理建议，但不直接展示 Host 原文。 */
export function installErrorText(error: unknown, t: Translator): string {
  const message = error instanceof Error ? error.message : String(error)
  const match = INSTALL_ERROR_KEYS.find(([pattern]) => pattern.test(message))
  return t(match?.[1] ?? 'about.installFailed')
}
