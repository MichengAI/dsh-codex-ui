import { useCallback, useEffect, useState } from 'react'
import { IconCheckOutline16, IconDownloadOutline16, IconLoadingOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ManagedDependencyId } from '../dependencies.ts'
import { NS } from './locales.ts'

type DependencyStatus = { id: ManagedDependencyId; packageName: string; installed: boolean; version?: string; latestVersion?: string; updateAvailable: boolean }
type LoadState = 'loading' | 'ready' | 'failed'

const endpoint = '/api/michengai/codex-ui/dependencies'

const stylesheet = `
.dcu-about{color:var(--dsw-alias-label-primary)}.dcu-about h2{margin:0;font-size:20px;line-height:28px}.dcu-about-intro{margin:6px 0 22px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}.dcu-about h3{margin:24px 0 8px;font-size:14px;line-height:20px}.dcu-about-features{margin:0;padding-left:20px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:24px}.dcu-about-dependencies{overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:10px}.dcu-about-dependency{display:flex;align-items:center;gap:12px;min-height:64px;padding:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dcu-about-dependency:last-child{border-bottom:0}.dcu-about-copy{min-width:0;flex:1}.dcu-about-name{font-size:13px;font-weight:600}.dcu-about-package{overflow:hidden;margin-top:2px;color:var(--dsw-alias-label-tertiary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.dcu-about-status{display:flex;align-items:center;gap:5px;font-size:12px}.dcu-about-status[data-installed=true]{color:var(--dsw-alias-state-success-primary)}.dcu-about-status[data-installed=false]{color:var(--dsw-alias-state-error-primary)}.dcu-about-status[data-update=true]{color:var(--dsw-alias-state-warning-primary)}.dcu-about-install{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:6px 9px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}.dcu-about-install:hover:not(:disabled){background:var(--dsw-specific-menu-item-hover)}.dcu-about-install:disabled{cursor:wait;opacity:.65}.dcu-about-message{margin:10px 0 0;border-radius:8px;padding:9px 10px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.dcu-about-message[data-error=true]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}
`

function isDependencyStatus(value: unknown): value is DependencyStatus {
  if (value === null || typeof value !== 'object') return false
  const status = value as Record<string, unknown>
  return (status.id === 'experts' || status.id === 'skills' || status.id === 'archive')
    && typeof status.packageName === 'string' && typeof status.installed === 'boolean' && typeof status.updateAvailable === 'boolean'
}

/** Codex UI 的功能说明、配套管理插件状态与受限安装入口。 */
export function AboutSection({ t }: { t: TranslateNS<typeof NS> }) {
  const [dependencies, setDependencies] = useState<readonly DependencyStatus[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [installing, setInstalling] = useState<ManagedDependencyId>()
  const [message, setMessage] = useState<{ error: boolean; text: string }>()
  const load = useCallback(async () => {
    setState('loading')
    try {
      const response = await fetch(endpoint, { cache: 'no-store' })
      const payload = await response.json() as { dependencies?: unknown }
      if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error()
      setDependencies(payload.dependencies)
      setState('ready')
    } catch {
      setState('failed')
    }
  }, [])
  useEffect(() => { void load() }, [load])
  const install = async (id: ManagedDependencyId): Promise<void> => {
    setInstalling(id)
    setMessage(undefined)
    try {
      const response = await fetch(`${endpoint}?dependency=${encodeURIComponent(id)}`, { method: 'POST' })
      const payload = await response.json() as { dependencies?: unknown; error?: unknown }
      if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error(typeof payload.error === 'string' ? payload.error : t('about.installFailed'))
      setDependencies(payload.dependencies)
      setState('ready')
      setMessage({ error: false, text: t('about.restartRequired') })
    } catch (error) {
      setMessage({ error: true, text: error instanceof Error ? error.message : t('about.installFailed') })
    } finally {
      setInstalling(undefined)
    }
  }
  const title = (id: ManagedDependencyId): string => t(`about.dependency.${id}`)
  return <section className="dcu-about" aria-label={t('about.nav')}>
    <style>{stylesheet}</style>
    <h2>{t('about.title')}</h2>
    <p className="dcu-about-intro">{t('about.description')}</p>
    <h3>{t('about.features')}</h3>
    <ul className="dcu-about-features"><li>{t('about.feature.sidebar')}</li><li>{t('about.feature.search')}</li><li>{t('about.feature.workspace')}</li><li>{t('about.feature.sessions')}</li><li>{t('about.feature.conversation')}</li><li>{t('about.feature.navigator')}</li></ul>
    <h3>{t('about.dependencies')}</h3>
    <p className="dcu-about-intro">{t('about.dependenciesDescription')}</p>
    {state === 'loading' ? <div className="dcu-about-message">{t('about.loading')}</div>
      : state === 'failed' ? <div className="dcu-about-message" data-error="true">{t('about.statusFailed')}</div>
        : <div className="dcu-about-dependencies">{dependencies.map(dependency => <article className="dcu-about-dependency" key={dependency.id}><div className="dcu-about-copy"><div className="dcu-about-name">{title(dependency.id)}</div><div className="dcu-about-package">{dependency.packageName}{dependency.version === undefined ? '' : ` · ${dependency.version}`}{dependency.updateAvailable && dependency.latestVersion !== undefined ? ` → ${dependency.latestVersion}` : ''}</div></div><div className="dcu-about-status" data-installed={dependency.installed} data-update={dependency.updateAvailable}>{dependency.installed && !dependency.updateAvailable && <IconCheckOutline16 size={14} />}{dependency.updateAvailable ? t('about.updateAvailable') : dependency.installed ? t('about.installed') : t('about.missing')}</div>{(!dependency.installed || dependency.updateAvailable) && <button className="dcu-about-install" type="button" disabled={installing === dependency.id} onClick={() => { void install(dependency.id) }}>{installing === dependency.id ? <IconLoadingOutline16 size={14} /> : <IconDownloadOutline16 size={14} />}{installing === dependency.id ? t('about.installing') : dependency.updateAvailable ? t('about.update') : t('about.install')}</button>}</article>)}</div>}
    {message !== undefined && <div className="dcu-about-message" data-error={message.error}>{message.text}</div>}
  </section>
}
