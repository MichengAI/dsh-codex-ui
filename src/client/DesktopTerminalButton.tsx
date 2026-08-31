import { useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'

export type DesktopTerminalRequest = (sessionId: string) => Promise<void>

type DesktopTerminalButtonProps = Pick<
  PropsRuntime<'conversation.session.header.utilities'>,
  'sessionId'
> & PropsLocale<typeof NS> & {
  openTerminal: DesktopTerminalRequest
}

const stylesheet = `
.dcu-session-terminal{display:flex;align-items:center;gap:8px;-webkit-app-region:no-drag}
.dcu-session-terminal-button{display:grid;width:32px;height:32px;place-items:center;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color .16s ease,color .16s ease,opacity .16s ease}
.dcu-session-terminal-button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dcu-session-terminal-button:focus-visible{outline:2px solid var(--dsw-alias-button-info-fill);outline-offset:1px}
.dcu-session-terminal-button:disabled{cursor:default;opacity:.55}
.dcu-session-terminal-button[data-error=true]{color:var(--dsw-alias-state-error-primary)}
.dcu-session-terminal-button[data-busy=true] svg{animation:dcu-terminal-pulse .8s ease-in-out infinite alternate}
.dcu-session-terminal-error{max-width:180px;overflow:hidden;color:var(--dsw-alias-state-error-primary);font:12px/18px var(--dsw-font-family);text-overflow:ellipsis;white-space:nowrap}
@keyframes dcu-terminal-pulse{to{opacity:.35}}
@media (prefers-reduced-motion:reduce){.dcu-session-terminal-button,.dcu-session-terminal-button[data-busy=true] svg{animation:none;transition:none}}
`

function TerminalIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2.25" y="3.25" width="13.5" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="m5.25 7 2 2-2 2M9.25 11h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

/** Codex-style session-header action backed by the bounded Desktop client service. */
export function DesktopTerminalButton({ sessionId, t, openTerminal }: DesktopTerminalButtonProps) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const label = busy ? t('terminal.opening') : failed ? t('terminal.failed') : t('terminal.open')

  const open = (): void => {
    if (busy) return
    setBusy(true)
    setFailed(false)
    void openTerminal(String(sessionId)).then(
      () => { setBusy(false) },
      () => { setBusy(false); setFailed(true) },
    )
  }

  return <div className="dcu-session-terminal">
    <style>{stylesheet}</style>
    <button
      type="button"
      className="dcu-session-terminal-button"
      aria-label={label}
      title={label}
      disabled={busy}
      data-busy={busy}
      data-error={failed}
      onClick={open}
    >
      <TerminalIcon />
    </button>
    {failed && <span className="dcu-session-terminal-error" role="alert">{t('terminal.failed')}</span>}
  </div>
}
