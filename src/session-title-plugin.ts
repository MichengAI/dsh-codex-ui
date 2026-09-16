import { registerSessionTitleProvider, type SessionTitleHost } from './session-title-provider.ts'

export const name = 'michengai-codex-ui-session-title'
export const inject = ['sessionTitle', 'llm']

/** 独立挂到官方 session-title-llm 同级，等标题服务和模型服务就绪后再占 first-prompt 位。 */
export function apply(ctx: SessionTitleHost): void {
  registerSessionTitleProvider(ctx)
}
