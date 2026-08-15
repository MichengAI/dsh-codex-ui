import { useSyncExternalStore } from 'react'
import type { SessionListState, WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'

type SnapshotStore<T> = {
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
}

export type ArchivedSessionsSectionProps = {
  sessionStore: SnapshotStore<SessionListState>
  workspaceStore: SnapshotStore<WorkspaceListState>
  t: TranslateNS<typeof NS>
}

const stylesheet = `
.dcu-archives{color:var(--dsw-alias-label-primary)}.dcu-archives h2{margin:0;font-size:18px}.dcu-archives p{margin:6px 0 18px;color:var(--dsw-alias-label-secondary);font-size:12px}.dcu-archive-list{overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:9px}.dcu-archive-row{padding:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dcu-archive-row:last-child{border-bottom:0}.dcu-archive-title{font-weight:650}.dcu-archive-id{margin-top:3px;color:var(--dsw-alias-label-tertiary);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-archive-empty{padding:20px 8px;color:var(--dsw-alias-label-secondary);text-align:center}
`

/** 展示 DSH 的持久化归档集合；核心目前没有会话永久删除或撤销归档接口。 */
export function ArchivedSessionsSection({ sessionStore, workspaceStore, t }: ArchivedSessionsSectionProps) {
  const sessions = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const archivedIds = useSyncExternalStore(workspaceStore.subscribe, () => workspaceStore.getSnapshot().archivedSessionIds)
  return <section className="dcu-archives" aria-label={t('archives.title')}>
    <style>{stylesheet}</style>
    <h2>{t('archives.title')}</h2>
    <p>{t('archives.description')}</p>
    <div className="dcu-archive-list">{archivedIds.map(id => {
      const session = sessions.byId[id]
      return <article className="dcu-archive-row" key={id}><div className="dcu-archive-title">{session?.displayTitle ?? t('archives.session')}</div><div className="dcu-archive-id">{id}</div></article>
    })}{archivedIds.length === 0 && <div className="dcu-archive-empty">{t('archives.empty')}</div>}</div>
  </section>
}
