import { useState, useEffect } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from '../locales.ts'

export type SettingsSearchListener = (query: string) => void

let isSkinEnabled = true
const skinStateListeners = new Set<(enabled: boolean) => void>()

export function setSkinEnabledState(enabled: boolean): void {
  if (isSkinEnabled !== enabled) {
    isSkinEnabled = enabled
    skinStateListeners.forEach(fn => fn(enabled))
  }
}

export function subscribeSkinEnabledState(fn: (enabled: boolean) => void): () => void {
  skinStateListeners.add(fn)
  return () => { skinStateListeners.delete(fn) }
}

let currentQuery = ''
const listeners = new Set<SettingsSearchListener>()

export function getNavSearchQuery(): string {
  return currentQuery
}

export function setNavSearchQuery(query: string): void {
  currentQuery = query
  listeners.forEach(fn => fn(query))
}

export function subscribeNavSearch(fn: SettingsSearchListener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function SettingsNavHeader({ t }: PropsRuntime<'settings.header'> & PropsLocale<typeof NS>) {
  const [enabled, setEnabled] = useState(isSkinEnabled)
  const [query, setQuery] = useState(currentQuery)

  useEffect(() => {
    return subscribeSkinEnabledState(state => setEnabled(state))
  }, [])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setNavSearchQuery(val)
  }

  const handleClose = () => {
    const dialog = document.querySelector('[data-shortcut-modal="settings"]')
    const closeBtn = dialog?.querySelector<HTMLButtonElement>('button[class*="close"]')
    if (closeBtn) {
      closeBtn.click()
    } else {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))
    }
  }

  // 当原生设置皮肤子组件被关闭时，100% 回退至宿主官方纯文本标题外观，绝不插入任何返回按钮或搜索框！
  if (!enabled) {
    return <>{t('settings.title')}</>
  }

  return (
    <div className="dcu-settings-nav-header-root">
      <div className="dcu-settings-nav-header-top">
        <button
          type="button"
          className="dcu-settings-back-btn"
          onClick={handleClose}
          aria-label={t('settings.back')}
          title={t('settings.back')}
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <span className="dcu-settings-nav-header-title">{t('settings.title')}</span>
      </div>
      <div className="dcu-settings-search-wrapper">
        <Search size={14} className="dcu-settings-search-icon" aria-hidden="true" />
        <input
          type="search"
          className="dcu-settings-search-input"
          placeholder={t('settings.search')}
          aria-label={t('settings.search')}
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
        />
        {query ? (
          <button
            type="button"
            className="dcu-settings-search-clear"
            aria-label="清除搜索"
            onClick={() => handleQueryChange('')}
          >
            <X size={12} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
