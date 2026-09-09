import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { SettingsDescribeFace } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'

/** 通过宿主公开接口打开配置文件，沿用共享元数据和路径无关的操作。 */
export function SettingsDocumentAction({ describe, openDocument, t }: PropsLocale<typeof NS> & {
  describe: SettingsDescribeFace
  openDocument: () => Promise<{ ok: boolean }>
}) {
  const snapshot = useSyncExternalStore(listener => describe.subscribe(listener), () => describe.getSnapshot())
  const busy = useRef(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    setError(false)
    void describe.ensure().catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [describe])
  if (!snapshot.view?.hasDocument) return error ? <span role="alert">{t('settings.openDocumentError')}</span> : null
  const open = async () => {
    if (busy.current) return
    busy.current = true
    setOpening(true)
    setError(false)
    try { setError(!(await openDocument()).ok) }
    catch { setError(true) }
    finally { busy.current = false; setOpening(false) }
  }
  return <section className="dcu-settings-general-group">
    <h2>{t('settings.advanced')}</h2>
    <div className="dcu-settings-card">
      <div className="dcu-settings-document">
        <div className="dcu-settings-document-copy"><div>{t('settings.documentTitle')}</div><p>{t('settings.documentDescription')}</p>{error && <p role="alert">{t('settings.openDocumentError')}</p>}</div>
        <button type="button" aria-label={t('settings.openDocument')} aria-busy={opening} disabled={opening} onClick={() => { void open() }}>{t(opening ? 'settings.documentOpening' : 'settings.documentOpen')}</button>
      </div>
    </div>
  </section>
}
