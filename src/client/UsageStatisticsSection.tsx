/** 设置中的费用原面板承载区；不重建图表、计费或原面板的业务逻辑。 */
import { useEffect, useRef, useState } from 'react'
import type { UsageFrameBridge, UsageFrameWindow } from '../usage-frame/contract.ts'
import { USAGE_FRAME_PATH } from '../usage-frame/contract.ts'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
export interface UsageStatisticsProps {
  useStore: (selector: (state: unknown) => unknown) => unknown
  actions: UsageFrameBridge['actions']
  billing: Pick<UsageFrameBridge, 'translate' | 'checkModels' | 'publishCosts'>
  close: () => void
  openOriginal: () => void
  t: TranslateNS<typeof NS>
}
export function UsageStatisticsSection({ useStore, actions, billing, close, openOriginal, t }: UsageStatisticsProps) {
  const snapshot = useStore(state => state)
  const latest = useRef(snapshot)
  const listeners = useRef(new Set<() => void>())
  const frame = useRef<HTMLIFrameElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const disposeTheme = useRef<() => void>(() => {})
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => { latest.current = snapshot; listeners.current.forEach(listener => listener()) }, [snapshot])
  useEffect(() => {
    setState('loading')
    timer.current = setTimeout(() => { setState('failed') }, 15000)
    return () => { clearTimeout(timer.current); disposeTheme.current(); listeners.current.clear() }
  }, [attempt])
  const connect = () => {
    const target = frame.current?.contentWindow as UsageFrameWindow | null
    if (!target) return
    try {
      if (target.location.origin !== location.origin || target.location.pathname !== USAGE_FRAME_PATH) throw new Error('费用承载页地址不匹配')
      const document = target.document
      if (!document.getElementById('billing-root')) throw new Error('费用承载页未正确加载')
      const sync = () => {
        document.body.toggleAttribute('data-ds-dark-theme', window.document.body.hasAttribute('data-ds-dark-theme'))
        document.documentElement.lang = window.document.documentElement.lang
        const tokens = getComputedStyle(window.document.body)
        for (const key of tokens) if (key.startsWith('--dsw-')) document.body.style.setProperty(key, tokens.getPropertyValue(key))
      }
      sync(); disposeTheme.current()
      const observer = new MutationObserver(sync)
      observer.observe(window.document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme', 'class', 'style'] })
      disposeTheme.current = () => observer.disconnect()
      target.dcuUsageHost = { getSnapshot: () => latest.current, subscribe: listener => { listeners.current.add(listener); return () => { listeners.current.delete(listener) } },
        actions, ...billing, close, ready: () => { clearTimeout(timer.current); setState('ready') },
        failed: message => { console.warn('[michengai-codex-ui] 费用承载失败：%s', message); clearTimeout(timer.current); setState('failed') } }
      target.postMessage({ type: 'dcu-usage-init' }, location.origin)
    } catch (error) { console.warn('[michengai-codex-ui] 无法连接费用承载页', error); clearTimeout(timer.current); setState('failed') }
  }
  return <section className="dcu-usage-section" aria-label={t('usage.title')}>
    <h1>{t('usage.title')}</h1>
    <div className="dcu-usage-stage" aria-busy={state === 'loading'}>
      {state === 'loading' && <p className="dcu-usage-loading" role="status">{t('usage.loading')}</p>}
      {state === 'failed' && <div role="alert"><p>{t('usage.failed')}</p><button onClick={() => { setAttempt(value => value + 1) }}>{t('usage.retry')}</button><button onClick={() => { close(); requestAnimationFrame(openOriginal) }}>{t('usage.original')}</button></div>}
      <iframe key={attempt} ref={frame} title={t('usage.title')} src={USAGE_FRAME_PATH} onLoad={connect} aria-hidden={state !== 'ready'} tabIndex={state === 'ready' ? 0 : -1} style={{ visibility: state === 'ready' ? 'visible' : 'hidden' }} className="dcu-usage-frame"/>
    </div>
  </section>
}
