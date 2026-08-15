import { useEffect, useState, useSyncExternalStore } from 'react'
import { IconLinkOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'

type SnapshotStore<T> = { getSnapshot: () => T; subscribe: (listener: () => void) => () => void }
type Connector = { name: string; tools: readonly { name: string; description: string }[] }

export type ConnectorsSectionProps = { sessionStore: SnapshotStore<SessionListState>; t: TranslateNS<typeof NS> }

const stylesheet = `
.dcu-connectors{color:var(--dsw-alias-label-primary)}.dcu-connectors h2{margin:0;font-size:18px}.dcu-connectors p{margin:6px 0 18px;color:var(--dsw-alias-label-secondary);font-size:12px}.dcu-connector-list{overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:9px}.dcu-connector{padding:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dcu-connector:last-child{border-bottom:0}.dcu-connector-head{display:flex;align-items:center;gap:8px;font-weight:650}.dcu-connector-meta{margin:3px 0 8px;color:var(--dsw-alias-label-tertiary);font-size:11px}.dcu-connector-tool{padding:5px 0 0 24px;color:var(--dsw-alias-label-secondary);font-size:12px}.dcu-connector-tool span{display:block;margin-top:1px;color:var(--dsw-alias-label-tertiary);font-size:11px}.dcu-connector-empty{padding:20px 8px;color:var(--dsw-alias-label-secondary);text-align:center}
`

function isConnector(value: unknown): value is Connector {
  if (value === null || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.name === 'string' && Array.isArray(item.tools)
    && item.tools.every(tool => tool !== null && typeof tool === 'object'
      && typeof (tool as Record<string, unknown>).name === 'string'
      && typeof (tool as Record<string, unknown>).description === 'string')
}

/** 设置内的 MCP 连接器目录，只暴露名称、工具数和工具说明。 */
export function ConnectorsSection({ sessionStore, t }: ConnectorsSectionProps) {
  const sessionId = useSyncExternalStore(sessionStore.subscribe, () => sessionStore.getSnapshot().current)
  const [connectors, setConnectors] = useState<readonly Connector[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  useEffect(() => {
    if (sessionId === undefined) { setConnectors([]); setState('ready'); return }
    const controller = new AbortController()
    setState('loading')
    void fetch(`/api/michengai/codex-ui/connectors?sessionId=${encodeURIComponent(sessionId)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('连接器目录暂不可用。')
        const payload = await response.json() as { connectors?: unknown }
        if (!Array.isArray(payload.connectors) || !payload.connectors.every(isConnector)) throw new Error('连接器目录返回格式无效。')
        if (!controller.signal.aborted) setConnectors(payload.connectors)
      })
      .then(() => { if (!controller.signal.aborted) setState('ready') })
      .catch(() => { if (!controller.signal.aborted) setState('failed') })
    return () => { controller.abort() }
  }, [sessionId])
  return <section className="dcu-connectors" aria-label={t('connectors.title')}>
    <style>{stylesheet}</style>
    <h2>{t('connectors.title')}</h2>
    <p>{t('connectors.description')}</p>
    {sessionId === undefined ? <div className="dcu-connector-empty">{t('connectors.openSession')}</div>
      : state === 'loading' ? <div className="dcu-connector-empty">{t('connectors.loading')}</div>
        : state === 'failed' ? <div className="dcu-connector-empty">{t('connectors.failed')}</div>
          : <div className="dcu-connector-list">{connectors.map(connector => <article className="dcu-connector" key={connector.name}><div className="dcu-connector-head"><IconLinkOutline16 size={16} />{connector.name}</div><div className="dcu-connector-meta">{t('connectors.toolCount', { count: connector.tools.length })}</div>{connector.tools.map(tool => <div className="dcu-connector-tool" key={tool.name}>{tool.name}{tool.description !== '' && <span>{tool.description}</span>}</div>)}</article>)}{connectors.length === 0 && <div className="dcu-connector-empty">{t('connectors.empty')}</div>}</div>}
  </section>
}
