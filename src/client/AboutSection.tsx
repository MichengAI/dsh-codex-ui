import { useCallback, useEffect, useRef, useState } from 'react'
import { IconCheckOutline16, IconDownloadOutline16, IconLoadingOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { MANAGED_DEPENDENCIES, type ManagedDependencyId } from '../dependencies.ts'
import { NS } from './locales.ts'

type DependencyStatus = { id: ManagedDependencyId; packageName: string; installed: boolean; version?: string; latestVersion?: string; updateAvailable: boolean }
type LoadState = 'loading' | 'ready' | 'failed'
type InstallTarget = ManagedDependencyId | 'all'
type ProgressPhase = 'resolving' | 'downloading' | 'linking' | 'building'
type InstallProgress = {
  active: boolean
  target: string
  seconds: number
  lastLine: string
  phase: ProgressPhase | null
  done: number
  total: number | null
  percent: number | null
  currentPackage: string | null
}

const endpoint = '/api/michengai/codex-ui/dependencies'

const stylesheet = `
.dcu-about{color:var(--dsw-alias-label-primary)}.dcu-about h2{margin:0;font-size:20px;line-height:28px}.dcu-about-intro{margin:6px 0 22px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}.dcu-about h3{margin:24px 0 8px;font-size:14px;line-height:20px}.dcu-about-features{margin:0;padding-left:20px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:24px}.dcu-about-dependencies-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:24px}.dcu-about-dependencies-heading h3{margin:0}.dcu-about-dependencies-heading+.dcu-about-intro{margin-bottom:14px}.dcu-about-dependencies{overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:10px}.dcu-about-dependency{display:flex;align-items:center;gap:12px;min-height:64px;padding:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dcu-about-dependency:last-child{border-bottom:0}.dcu-about-copy{min-width:0;flex:1}.dcu-about-name{font-size:13px;line-height:20px;font-weight:600}.dcu-about-package{overflow:hidden;margin-top:2px;color:var(--dsw-alias-label-tertiary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.dcu-about-status{display:flex;align-items:center;gap:5px;font-size:12px}.dcu-about-status[data-installed=true]{color:var(--dsw-alias-state-success-primary)}.dcu-about-status[data-installed=false]{color:var(--dsw-alias-state-error-primary)}.dcu-about-status[data-update=true]{color:var(--dsw-alias-state-warning-primary)}.dcu-about-install{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:32px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:6px 9px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}.dcu-about-install:hover:not(:disabled){background:var(--dsw-specific-menu-item-hover)}.dcu-about-install:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.dcu-about-install:disabled{cursor:wait;opacity:.65}.dcu-about-update-all{min-width:92px}.dcu-about-message{margin:10px 0 0;border-radius:8px;padding:9px 10px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.dcu-about-message[data-error=true]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}.dcu-about-progress{display:grid;grid-template-columns:auto 1fr auto;gap:8px 10px;align-items:center;margin-top:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:9px 10px}.dcu-about-progress code{min-width:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-about-progress-pct{color:var(--dsw-alias-label-tertiary);font-size:12px;font-variant-numeric:tabular-nums}.dcu-about-progress-bar{grid-column:1/-1;height:4px;overflow:hidden;border-radius:99px;background:var(--dsw-alias-border-l2)}.dcu-about-progress-fill{height:100%;background:var(--dsw-alias-state-business-primary);transition:width .2s ease}.dcu-about-progress-fill[data-wave=true]{width:28%;animation:dcu-about-progress-wave 1.2s ease-in-out infinite}@keyframes dcu-about-progress-wave{0%{transform:translateX(-60%)}100%{transform:translateX(280%)}}
`

function isDependencyStatus(value: unknown): value is DependencyStatus {
  if (value === null || typeof value !== 'object') return false
  const status = value as Record<string, unknown>
  return MANAGED_DEPENDENCIES.some(dependency => dependency.id === status.id)
    && typeof status.packageName === 'string' && typeof status.installed === 'boolean' && typeof status.updateAvailable === 'boolean'
}

function isInstallProgress(value: unknown): value is InstallProgress {
  if (value === null || typeof value !== 'object') return false
  const progress = value as Record<string, unknown>
  return typeof progress.active === 'boolean' && typeof progress.lastLine === 'string'
}

function installErrorText(error: unknown, t: TranslateNS<typeof NS>): string {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('没有进入当前 Profile') || message.includes('did not enter this profile')) return t('about.installUnchanged')
  return message !== '' ? message : t('about.installFailed')
}

function progressLabel(progress: InstallProgress, t: TranslateNS<typeof NS>): string {
  if (progress.phase !== null) {
    const current = progress.currentPackage === null || progress.currentPackage === '' ? '' : ` · ${progress.currentPackage}`
    const done = progress.done > 0 ? ` · ${t('about.packagesDone').replace('{0}', String(progress.done))}` : ''
    return `${t(`about.progress.${progress.phase}`)}${current}${done}`
  }
  if (progress.lastLine !== '') return `${progress.lastLine}  (${progress.seconds}s)`
  return t('about.progressHint')
}

/** Codex UI 的功能说明、配套管理插件状态与受限安装入口。 */
export function AboutSection({ t }: { t: TranslateNS<typeof NS> }) {
  const [dependencies, setDependencies] = useState<readonly DependencyStatus[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [installing, setInstalling] = useState<InstallTarget>()
  const [progress, setProgress] = useState<InstallProgress>()
  const [message, setMessage] = useState<{ error: boolean; text: string }>()
  const alive = useRef(true)
  const root = useRef<HTMLElement>(null)
  const stateRef = useRef<LoadState>('loading')
  const requestId = useRef(0)
  const installingRef = useRef<InstallTarget>()
  stateRef.current = state
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const load = useCallback(async (signal?: AbortSignal) => {
    const currentRequest = ++requestId.current
    if (stateRef.current !== 'ready') setState('loading')
    try {
      const response = await fetch(endpoint, { cache: 'no-store', signal })
      const payload = await response.json() as { dependencies?: unknown }
      if (signal?.aborted || currentRequest !== requestId.current) return
      if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error()
      setDependencies(payload.dependencies)
      setState('ready')
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError') || currentRequest !== requestId.current) return
      if (stateRef.current !== 'ready') setState('failed')
    }
  }, [])
  useEffect(() => {
    const node = root.current
    const controller = new AbortController()
    const refresh = (): void => { void load(controller.signal) }
    refresh()
    if (node === null || typeof IntersectionObserver === 'undefined') {
      return () => { controller.abort() }
    }
    let initialized = false
    let wasVisible = false
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting)
      if (!initialized) { initialized = true; wasVisible = visible; return }
      if (visible && !wasVisible) refresh()
      wasVisible = visible
    }, { threshold: 0.2 })
    observer.observe(node)
    return () => {
      controller.abort()
      observer.disconnect()
    }
  }, [load])
  useEffect(() => {
    if (installing === undefined) {
      setProgress(undefined)
      return
    }
    let cancelled = false
    const pull = async (): Promise<void> => {
      try {
        const response = await fetch(`${endpoint}?action=progress`, { cache: 'no-store' })
        const payload = await response.json() as { progress?: unknown }
        if (cancelled || !response.ok || !isInstallProgress(payload.progress)) return
        setProgress(payload.progress)
      } catch {
        if (!cancelled) return
      }
    }
    void pull()
    const timer = window.setInterval(() => { void pull() }, 800)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [installing])
  const install = async (id: ManagedDependencyId): Promise<void> => {
    if (installingRef.current !== undefined) return
    installingRef.current = id
    setInstalling(id)
    setMessage(undefined)
    try {
      const response = await fetch(`${endpoint}?dependency=${encodeURIComponent(id)}`, { method: 'POST' })
      const payload = await response.json() as { dependencies?: unknown; error?: unknown; autoReload?: unknown }
      if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error(typeof payload.error === 'string' ? payload.error : t('about.installFailed'))
      if (!alive.current) return
      setDependencies(payload.dependencies)
      setState('ready')
      setMessage({ error: false, text: payload.autoReload === false ? t('about.restartManually') : t('about.restartRequired') })
    } catch (error) {
      if (!alive.current) return
      setMessage({ error: true, text: installErrorText(error, t) })
    } finally {
      installingRef.current = undefined
      if (alive.current) setInstalling(undefined)
    }
  }
  const updateAll = async (): Promise<void> => {
    if (installingRef.current !== undefined) return
    installingRef.current = 'all'
    setInstalling('all')
    setMessage(undefined)
    try {
      const response = await fetch(`${endpoint}?action=update-all`, { method: 'POST' })
      const payload = await response.json() as { dependencies?: unknown; error?: unknown; restartRequired?: unknown; autoReload?: unknown }
      if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error(typeof payload.error === 'string' ? payload.error : t('about.installFailed'))
      if (!alive.current) return
      setDependencies(payload.dependencies)
      setState('ready')
      setMessage({ error: false, text: payload.restartRequired === false
        ? t('about.upToDate')
        : payload.autoReload === false ? t('about.restartManually') : t('about.restartRequired') })
    } catch (error) {
      if (!alive.current) return
      setMessage({ error: true, text: installErrorText(error, t) })
    } finally {
      installingRef.current = undefined
      if (alive.current) setInstalling(undefined)
    }
  }
  const actionableCount = dependencies.filter(dependency => !dependency.installed || dependency.updateAvailable).length
  const title = (id: ManagedDependencyId): string => t(`about.dependency.${id}`)
  return <section ref={root} className="dcu-about" aria-label={t('about.nav')}>
    <style>{stylesheet}</style>
    <h2>{t('about.title')}</h2>
    <p className="dcu-about-intro">{t('about.description')}</p>
    <h3>{t('about.features')}</h3>
    <ul className="dcu-about-features"><li>{t('about.feature.sidebar')}</li><li>{t('about.feature.search')}</li><li>{t('about.feature.workspace')}</li><li>{t('about.feature.sessions')}</li><li>{t('about.feature.conversation')}</li><li>{t('about.feature.navigator')}</li></ul>
    <div className="dcu-about-dependencies-heading"><h3>{t('about.dependencies')}</h3>{state === 'ready' && actionableCount > 0 && <button className="dcu-about-install dcu-about-update-all" type="button" aria-busy={installing === 'all'} disabled={installing !== undefined} onClick={() => { void updateAll() }}>{installing === 'all' ? <IconLoadingOutline16 size={14} /> : <IconDownloadOutline16 size={14} />}{installing === 'all' ? t('about.updatingAll') : t('about.updateAll')}</button>}</div>
    <p className="dcu-about-intro">{t('about.dependenciesDescription')}</p>
    {state === 'loading' ? <div className="dcu-about-message" role="status">{t('about.loading')}</div>
      : state === 'failed' ? <div className="dcu-about-message" data-error="true" role="alert">{t('about.statusFailed')}</div>
        : <div className="dcu-about-dependencies" aria-busy={installing !== undefined}>{dependencies.map(dependency => <article className="dcu-about-dependency" key={dependency.id}><div className="dcu-about-copy"><div className="dcu-about-name">{title(dependency.id)}</div><div className="dcu-about-package">{dependency.packageName}{dependency.version === undefined ? '' : ` · ${dependency.version}`}{dependency.updateAvailable && dependency.latestVersion !== undefined ? ` → ${dependency.latestVersion}` : ''}</div></div><div className="dcu-about-status" data-installed={dependency.installed} data-update={dependency.updateAvailable}>{dependency.installed && !dependency.updateAvailable && <IconCheckOutline16 size={14} />}{dependency.updateAvailable ? t('about.updateAvailable') : dependency.installed ? t('about.installed') : t('about.missing')}</div>{(!dependency.installed || dependency.updateAvailable) && <button className="dcu-about-install" type="button" disabled={installing !== undefined} onClick={() => { void install(dependency.id) }}>{installing === dependency.id ? <IconLoadingOutline16 size={14} /> : <IconDownloadOutline16 size={14} />}{installing === dependency.id ? t('about.installing') : dependency.updateAvailable ? t('about.update') : t('about.install')}</button>}</article>)}</div>}
    {installing !== undefined && <div className="dcu-about-progress" role="status"><span><IconLoadingOutline16 size={14} /></span><code>{progress === undefined ? t('about.progressHint') : progressLabel(progress, t)}</code>{progress?.percent !== null && progress?.percent !== undefined && <span className="dcu-about-progress-pct">{progress.percent}%</span>}<div className="dcu-about-progress-bar"><div className="dcu-about-progress-fill" data-wave={progress?.percent === null || progress?.percent === undefined} style={progress?.percent === null || progress?.percent === undefined ? undefined : { width: `${progress.percent}%` }} /></div></div>}
    {message !== undefined && <div className="dcu-about-message" data-error={message.error} role={message.error ? 'alert' : 'status'}>{message.text}</div>}
  </section>
}
