import { useState, useSyncExternalStore } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'

export type DeveloperToolsHandle = {
  enabled: {
    getSnapshot: () => boolean
    subscribe: (listener: () => void) => () => void
  }
  setEnabled: (enabled: boolean) => Promise<void>
}

export function DeveloperToolsRow({ developerTools, t }: PropsLocale<typeof NS> & {
  developerTools: DeveloperToolsHandle
}) {
  const enabled = useSyncExternalStore(developerTools.enabled.subscribe, developerTools.enabled.getSnapshot)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const toggle = (next: boolean) => {
    setFailed(false)
    setBusy(true)
    void developerTools.setEnabled(next).catch(() => {
      setFailed(true)
    }).finally(() => {
      setBusy(false)
    })
  }

  return (
    <div className="dcu-settings-developer-tools">
      <div className="dcu-settings-developer-tools-copy">
        <div className="dcu-settings-developer-tools-title">{t('settings.developerTools.title')}</div>
        <div className="dcu-settings-developer-tools-description">{t('settings.developerTools.description')}</div>
        {failed && <div className="dcu-settings-developer-tools-error" role="alert">{t('settings.developerTools.error')}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t('settings.developerTools.title')}
        disabled={busy}
        className="dcu-settings-switch"
        onClick={() => { toggle(!enabled) }}
      >
        <span className="dcu-settings-switch-thumb" />
      </button>
    </div>
  )
}
