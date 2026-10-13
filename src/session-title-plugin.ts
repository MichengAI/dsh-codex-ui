import type { Context } from '@deepseek-ai/cordis'
import { startSessionTitleLifecycle } from './session-title-lifecycle.ts'

export const name = 'michengai-codex-ui-session-title'
export const inject = ['sessionTitle', 'llm', 'loader']

/** Register teardown before asynchronous official-provider draining. */
export function apply(ctx: Context): Promise<void> {
  const lifecycle = startSessionTitleLifecycle(ctx)
  ctx.effect(() => lifecycle.dispose, 'michengai-codex-ui: session title')
  return lifecycle.ready
}
