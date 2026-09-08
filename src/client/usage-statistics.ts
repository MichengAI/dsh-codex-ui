/** 复用原费用入口声明的 store handle，保证侧栏和 iframe 共用预算状态。 */
import type { Context } from '@deepseek-ai/cordis'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import { UsageStatisticsSection } from './UsageStatisticsSection.tsx'
import type { UsageFrameBridge } from '../usage-frame/contract.ts'
import { BILLING_ENTRY_ID } from '../usage-frame/contract.ts'
import { NS } from './locales.ts'
import { openSettingsSection } from './settings-navigation.ts'
export function registerUsageStatistics(ctx: Context): void {
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => {
    let current: StoredEntry | undefined
    let remove: (() => void) | undefined
    const refresh = () => {
      const entry = ctx.slots.entriesOfSlot('sidebar.footer.action').find(item => item.options.id === BILLING_ENTRY_ID)
      if (entry === current) return
      remove?.(); remove = undefined; current = entry
      if (!entry?.store || typeof entry.store === 'function' || !entry.locale || !entry.inject) return
      const face = (entry.inject as () => Record<string, unknown>)()
      if (typeof face.checkModels !== 'function' || typeof face.publishCosts !== 'function') return
      const billing = { translate: ctx.locale.bind(entry.locale), checkModels: face.checkModels, publishCosts: face.publishCosts } as Pick<UsageFrameBridge, 'translate' | 'checkModels' | 'publishCosts'>
      remove = ctx.slots.register({ name: 'settings.section', id: 'usage-statistics', order: 90, label: () => t('usage.title'), locale: NS, store: entry.store,
        inject: () => ({ billing, openOriginal: () => { const metrics = ctx.get('billingMetrics') as { openDashboard?: () => void } | undefined; metrics?.openDashboard?.() } }),
      }, UsageStatisticsSection)
    }
    const unsubscribe = ctx.slots.subscribe('sidebar.footer.action', refresh)
    refresh()
    return () => { unsubscribe(); remove?.() }
  })
  ctx.effect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.dcu-footer-actions [data-testid="billing-trigger"],.dcu-footer-actions [data-testid="billing-rail-button"]')) return
      if (!ctx.slots.entriesOfSlot('settings.section').some(entry => entry.options.id === 'usage-statistics')) return
      const seat = document.querySelector<HTMLElement>('.dcu-settings-seat')
      if (!seat?.querySelector('[data-dcu-settings-trigger]')) return
      event.preventDefault(); event.stopPropagation()
      openSettingsSection(seat, t('usage.title'))
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, 'michengai-codex-ui: usage navigation')
}
