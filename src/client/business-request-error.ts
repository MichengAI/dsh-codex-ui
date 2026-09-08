/** 业务 REST 的状态错误；先判断 HTTP 状态，避免空响应体掩盖认证失败。 */
import type { CodexUiKey } from './locales.ts'

export class BusinessRequestError extends Error {
  constructor(readonly status: number) {
    super(`业务请求失败：HTTP ${status}`)
    this.name = 'BusinessRequestError'
  }
}

export function businessRequestErrorKey(error: unknown): CodexUiKey | undefined {
  if (!(error instanceof BusinessRequestError)) return undefined
  if (error.status === 401) return 'errors.unauthorized'
  if (error.status === 403) return 'errors.forbidden'
  if (error.status === 503) return 'errors.serviceUnavailable'
  return undefined
}
