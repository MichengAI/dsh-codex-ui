import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { IconLinkOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { userErrorText } from './user-error.ts'

type SnapshotStore<T> = { getSnapshot: () => T; subscribe: (listener: () => void) => () => void }
type Connector = { name: string; tools: readonly { name: string; description: string }[] }

export type ConnectorsSectionProps = {
  sessionStore: SnapshotStore<SessionListState>
  startPromptSession: (prompt: string) => Promise<void>
  t: TranslateNS<typeof NS>
}

const MCP_CONNECTOR_UI = '/mcp-connector/ui/'
const PROMPT_REQUEST_TYPE = 'mcp-connector:start-session'
const PROMPT_RESULT_TYPE = 'mcp-connector:start-session-result'

const stylesheet = `
.dcu-connectors{color:var(--dsw-alias-label-primary)}.dcu-connectors h2{margin:0;font-size:18px}.dcu-connectors p{margin:6px 0 18px;color:var(--dsw-alias-label-secondary);font-size:12px}.dcu-connector-frame{display:block;width:100%;height:clamp(420px,calc(100vh - 160px),700px);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-base);color-scheme:light dark}.dcu-connector-list{overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:9px}.dcu-connector{padding:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dcu-connector:last-child{border-bottom:0}.dcu-connector-head{display:flex;align-items:center;gap:8px;font-weight:650}.dcu-connector-meta{margin:3px 0 8px;color:var(--dsw-alias-label-tertiary);font-size:11px}.dcu-connector-tool{padding:5px 0 0 24px;color:var(--dsw-alias-label-secondary);font-size:12px}.dcu-connector-tool span{display:block;margin-top:1px;color:var(--dsw-alias-label-tertiary);font-size:11px}.dcu-connector-empty{padding:20px 8px;color:var(--dsw-alias-label-secondary);text-align:center}
`

const frameLightTheme = `:root{color-scheme:light;--bg:#f8f9fb;--card:#fff;--line:#e5e7eb;--text:#111827;--text-2:#4b5563;--muted:#9ca3af;--accent:#4f46e5;--accent-hover:#4338ca;--accent-light:#eef2ff;--ok:#059669;--ok-bg:#ecfdf5;--warn:#d97706;--warn-bg:#fffbeb;--bad:#dc2626;--bad-bg:#fef2f2;--shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06);--shadow-lg:0 10px 25px rgba(0,0,0,.1)}`
const frameDarkTheme = `:root{color-scheme:dark;--bg:#111318;--card:#1b1e25;--line:#30343d;--text:#f3f4f6;--text-2:#c4c8d0;--muted:#8e96a3;--accent:#818cf8;--accent-hover:#6366f1;--accent-light:#252750;--ok:#34d399;--ok-bg:#0d3027;--warn:#fbbf24;--warn-bg:#35280b;--bad:#f87171;--bad-bg:#3b171b;--shadow:0 1px 3px rgba(0,0,0,.35);--shadow-lg:0 16px 35px rgba(0,0,0,.45)}`

function isConnector(value: unknown): value is Connector {
  if (value === null || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.name === 'string' && Array.isArray(item.tools)
    && item.tools.every(tool => tool !== null && typeof tool === 'object'
      && typeof (tool as Record<string, unknown>).name === 'string'
      && typeof (tool as Record<string, unknown>).description === 'string')
}

function isPromptRequest(value: unknown): value is { type: typeof PROMPT_REQUEST_TYPE; requestId: string; prompt: string } {
  if (value === null || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return item.type === PROMPT_REQUEST_TYPE && typeof item.requestId === 'string' && item.requestId !== ''
    && typeof item.prompt === 'string' && item.prompt.trim() !== ''
}

function syncFrameTheme(frame: HTMLIFrameElement | null): void {
  const doc = frame?.contentDocument
  if (doc === null || doc === undefined) return
  let style = doc.head.querySelector<HTMLStyleElement>('style[data-michengai-host-theme]')
  if (style === null) {
    style = doc.createElement('style')
    style.dataset.michengaiHostTheme = 'true'
    doc.head.append(style)
  }
  style.textContent = document.body.hasAttribute('data-ds-dark-theme') ? frameDarkTheme : frameLightTheme
}

function ConnectorMarket({ startPromptSession, t }: Pick<ConnectorsSectionProps, 'startPromptSession' | 't'>) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>): void => {
      const frameWindow = frameRef.current?.contentWindow
      if (event.origin !== window.location.origin || frameWindow === null || frameWindow === undefined || event.source !== frameWindow) return
      if (!isPromptRequest(event.data)) return
      const { requestId, prompt } = event.data
      const reply = (ok: boolean, message: string): void => {
        frameWindow.postMessage({ type: PROMPT_RESULT_TYPE, requestId, ok, message }, window.location.origin)
      }
      void startPromptSession(prompt).then(
        () => { reply(true, t('connectors.promptReady')) },
        error => { reply(false, userErrorText(error, t)) },
      )
    }
    const syncTheme = (): void => { syncFrameTheme(frameRef.current) }
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
    window.addEventListener('message', onMessage)
    return () => {
      observer.disconnect()
      window.removeEventListener('message', onMessage)
    }
  }, [startPromptSession, t])
  return <iframe
    ref={frameRef}
    className="dcu-connector-frame"
    src={MCP_CONNECTOR_UI}
    title={t('connectors.title')}
    onLoad={() => { syncFrameTheme(frameRef.current) }}
  />
}

function NativeConnectorList({ sessionStore, t }: Pick<ConnectorsSectionProps, 'sessionStore' | 't'>) {
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
  if (sessionId === undefined) return <div className="dcu-connector-empty">{t('connectors.openSession')}</div>
  if (state === 'loading') return <div className="dcu-connector-empty">{t('connectors.loading')}</div>
  if (state === 'failed') return <div className="dcu-connector-empty">{t('connectors.failed')}</div>
  return <div className="dcu-connector-list">{connectors.map(connector => <article className="dcu-connector" key={connector.name}><div className="dcu-connector-head"><IconLinkOutline16 size={16} />{connector.name}</div><div className="dcu-connector-meta">{t('connectors.toolCount', { count: connector.tools.length })}</div>{connector.tools.map(tool => <div className="dcu-connector-tool" key={tool.name}>{tool.name}{tool.description !== '' && <span>{tool.description}</span>}</div>)}</article>)}{connectors.length === 0 && <div className="dcu-connector-empty">{t('connectors.empty')}</div>}</div>
}

/** 安装 dsh-mcp-connector 时显示完整市场，否则回退到当前会话的 MCP 工具目录。 */
export function ConnectorsSection({ sessionStore, startPromptSession, t }: ConnectorsSectionProps) {
  const [marketAvailable, setMarketAvailable] = useState<boolean | undefined>()
  useEffect(() => {
    const controller = new AbortController()
    void fetch(MCP_CONNECTOR_UI, { method: 'GET', cache: 'no-store', signal: controller.signal })
      .then(response => {
        void response.body?.cancel().catch(() => {})
        if (!controller.signal.aborted) setMarketAvailable(response.ok)
      })
      .catch(() => { if (!controller.signal.aborted) setMarketAvailable(false) })
    return () => { controller.abort() }
  }, [])
  return <section className="dcu-connectors" aria-label={t('connectors.title')}>
    <style>{stylesheet}</style>
    {marketAvailable === undefined
      ? <div className="dcu-connector-empty">{t('connectors.loading')}</div>
      : marketAvailable
        ? <ConnectorMarket startPromptSession={startPromptSession} t={t} />
        : <><h2>{t('connectors.title')}</h2><p>{t('connectors.description')}</p><NativeConnectorList sessionStore={sessionStore} t={t} /></>}
  </section>
}
