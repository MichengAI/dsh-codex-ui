import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { IconSkillOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'

type SkillGroup = 'builtin' | 'installed'

type SkillEntry = {
  name: string
  description: string
  whenToUse?: string
  modelInvocable: boolean
  group: SkillGroup
}

type SnapshotStore<T> = {
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
}

export type SkillsSettingsSectionProps = {
  sessionStore: SnapshotStore<SessionListState>
  t: TranslateNS<typeof NS>
}

const stylesheet = `
.dcu-settings-skills{min-width:0;color:var(--dsw-alias-label-primary)}.dcu-settings-skills h2{margin:0;font-size:18px}.dcu-settings-skills p{margin:6px 0 18px;color:var(--dsw-alias-label-secondary);font-size:12px}.dcu-settings-tabs{display:flex;gap:18px;border-bottom:1px solid var(--dsw-alias-border-l2);margin-bottom:14px}.dcu-settings-tab{appearance:none;position:relative;padding:8px 1px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}.dcu-settings-tab[data-active]{color:var(--dsw-alias-label-primary);font-weight:650}.dcu-settings-tab[data-active]:after{position:absolute;right:0;bottom:-1px;left:0;height:2px;background:currentColor;content:''}.dcu-settings-search{width:100%;height:36px;margin-bottom:12px;padding:0 10px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-button-floating-fill);color:inherit;font:inherit;outline:0}.dcu-settings-list{overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:9px}.dcu-settings-skill{display:flex;gap:10px;padding:11px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dcu-settings-skill:last-child{border-bottom:0}.dcu-settings-skill-icon{display:grid;place-items:center;flex:0 0 auto;width:30px;height:30px;border-radius:7px;background:var(--dsw-alias-button-floating-fill);color:var(--dsw-alias-label-secondary)}.dcu-settings-skill-main{min-width:0;flex:1}.dcu-settings-skill-name{font-weight:650}.dcu-settings-skill-description{margin-top:2px;color:var(--dsw-alias-label-secondary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-settings-skill-meta{margin-top:4px;color:var(--dsw-alias-label-tertiary);font-size:11px}.dcu-settings-empty{padding:20px 8px;color:var(--dsw-alias-label-secondary);text-align:center}
`

function isSkillEntry(value: unknown): value is SkillEntry {
  if (value === null || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.name === 'string'
    && typeof item.description === 'string'
    && typeof item.modelInvocable === 'boolean'
    && (item.group === 'builtin' || item.group === 'installed')
    && (item.whenToUse === undefined || typeof item.whenToUse === 'string')
}

/** 设置内的技能目录，按当前会话的实际 Agent 作用域读取。 */
export function SkillsSettingsSection({ sessionStore, t }: SkillsSettingsSectionProps) {
  const sessionId = useSyncExternalStore(sessionStore.subscribe, () => sessionStore.getSnapshot().current)
  const [group, setGroup] = useState<SkillGroup>('builtin')
  const [query, setQuery] = useState('')
  const [skills, setSkills] = useState<readonly SkillEntry[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    if (sessionId === undefined) {
      setSkills([])
      setState('ready')
      return
    }
    const controller = new AbortController()
    setState('loading')
    void fetch(`/api/michengai/codex-ui/skills?sessionId=${encodeURIComponent(sessionId)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('技能目录暂不可用。')
        const payload = await response.json() as { skills?: unknown }
        if (!Array.isArray(payload.skills) || !payload.skills.every(isSkillEntry)) throw new Error('技能目录返回格式无效。')
        if (!controller.signal.aborted) {
          setSkills(payload.skills)
          if (!payload.skills.some(skill => skill.group === 'builtin') && payload.skills.some(skill => skill.group === 'installed')) setGroup('installed')
        }
      })
      .then(() => { if (!controller.signal.aborted) setState('ready') })
      .catch(() => { if (!controller.signal.aborted) setState('failed') })
    return () => { controller.abort() }
  }, [sessionId])

  const builtinCount = skills.filter(skill => skill.group === 'builtin').length
  const installedCount = skills.length - builtinCount
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return skills.filter(skill => skill.group === group && (normalized === ''
      || `${skill.name} ${skill.description} ${skill.whenToUse ?? ''}`.toLowerCase().includes(normalized)))
  }, [group, query, skills])

  return <section className="dcu-settings-skills" aria-label={t('skills.title')}>
    <style>{stylesheet}</style>
    <h2>{t('skills.title')}</h2>
    <p>{t('skills.description')}</p>
    <div className="dcu-settings-tabs" role="tablist" aria-label={t('skills.tabs')}>
      <button type="button" className="dcu-settings-tab" role="tab" aria-selected={group === 'builtin'} data-active={group === 'builtin' || undefined} onClick={() => { setGroup('builtin') }}>{t('skills.builtin')} {builtinCount}</button>
      <button type="button" className="dcu-settings-tab" role="tab" aria-selected={group === 'installed'} data-active={group === 'installed' || undefined} onClick={() => { setGroup('installed') }}>{t('skills.installed')} {installedCount}</button>
    </div>
    <input className="dcu-settings-search" value={query} placeholder={t('skills.search')} onChange={event => { setQuery(event.target.value) }} />
    {sessionId === undefined ? <div className="dcu-settings-empty">{t('skills.openSession')}</div>
      : state === 'loading' ? <div className="dcu-settings-empty">{t('skills.loading')}</div>
        : state === 'failed' ? <div className="dcu-settings-empty">{t('skills.failed')}</div>
          : <div className="dcu-settings-list">{filtered.map(skill => <article className="dcu-settings-skill" key={skill.name}><div className="dcu-settings-skill-icon"><IconSkillOutline16 size={16} /></div><div className="dcu-settings-skill-main"><div className="dcu-settings-skill-name">{skill.name}</div><div className="dcu-settings-skill-description" title={skill.description}>{skill.description}</div>{skill.whenToUse !== undefined && <div className="dcu-settings-skill-meta">{t('skills.whenToUse', { value: skill.whenToUse })}</div>}</div></article>)}{filtered.length === 0 && <div className="dcu-settings-empty">{t('skills.empty')}</div>}</div>}
  </section>
}
