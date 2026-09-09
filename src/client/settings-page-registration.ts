import type { Context } from '@deepseek-ai/cordis'
import { CodexGeneralSettings, CodexSettingsPage, type SettingsSource } from './CodexSettingsPage.tsx'
import { NS } from './locales.ts'
import type { SettingsRow } from './settings-page-model.ts'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { createElement } from 'react'
import { Settings } from 'lucide-react'
import { SettingsDocumentAction } from './SettingsDocumentAction.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'settings.general.footer': { kind: 'list'; scope: 'root'; owner: {} }
  }
}

/** 用公开插槽替换设置壳，保留宿主的设置写入、连接恢复和首次使用引导。 */
export function registerSettingsPage(ctx: Context): void {
  const children = ['settings.trigger', 'settings.header', 'settings.action', 'settings.close', 'settings.section', 'settings.onboarding', 'settings.general.item']
  const occupied = () => ctx.slots.entriesOfSlot('sidebar.settings').length > 0 || children.some(name => ctx.slots.snapshot(name).length > 0)
  const warn = () => console.warn('[michengai-codex-ui] 已存在设置外壳，保留宿主设置；独立设置页需要 bundle patch 停用 ui-settings-general。')
  if (occupied()) { warn(); return }
  let owned = false
  const t = ctx.locale.bind(NS)
  // Host 和 Client 共享服务名；当前入口读取的是浏览器连接外观。
  const service: unknown = ctx.get('connection')
  const connection = service as ConnectionHandle
  const source = (name: 'settings.section' | 'settings.onboarding' | 'settings.general.item'): SettingsSource<SettingsRow> => {
    let revision = ''
    let cached: readonly SettingsRow[] = []
    return {
      getSnapshot: () => {
        const next = `${ctx.slots.getVersion(name)}:${ctx.locale.getSnapshot().revision}`
        if (revision !== next) {
          revision = next
          // 标签合约是字符串或惰性函数，避免为这个投影新增宿主静态模块依赖。
          cached = ctx.slots.entriesOfSlot(name).map(entry => ({ id: entry.options.id ?? '', order: entry.options.order ?? 0, label: (typeof entry.options.label === 'function' ? entry.options.label() : entry.options.label) ?? '' })).sort((a, b) => a.order - b.order)
        }
        return cached
      },
      subscribe: listener => {
        const offSlots = ctx.slots.subscribe(name, listener)
        const offLocale = ctx.locale.subscribe(listener)
        return () => { offSlots(); offLocale() }
      },
    }
  }
  const sections = source('settings.section')
  const onboarding = source('settings.onboarding')
  const items = source('settings.general.item')
  ctx.slots.inject('settings.trigger', () => !owned ? () => {} : ctx.slots.register({ name: 'settings.trigger', locale: NS },
    ({ wide }) => createElement('span', { className: 'dcu-settings-trigger-content' }, createElement(Settings, { size: 16, strokeWidth: 1.6 }), wide ? createElement('span', null, t('settings.title')) : null)))
  ctx.slots.inject('settings.close', () => !owned ? () => {} : ctx.slots.register({ name: 'settings.close', locale: NS }, () => t('settings.back')))
  ctx.inject(['settingsScope', 'remote.settings'], settingsCtx => {
    const service: unknown = settingsCtx.get('remote')
    const remote = service as { $host: { isLoopback: boolean }; settings: { openSettingsDocument: () => Promise<{ ok: boolean }> } }
    if (!remote.$host.isLoopback) return
    const describe = settingsCtx.settingsScope.describe()
    settingsCtx.slots.inject('settings.general.footer', () => !owned ? () => {} : settingsCtx.slots.register({
      name: 'settings.general.footer', id: 'open-document', locale: NS,
      inject: () => ({ describe, openDocument: () => remote.settings.openSettingsDocument() }),
    }, SettingsDocumentAction))
  })
  ctx.slots.inject('sidebar.settings', () => {
    if (occupied()) { warn(); return () => {} }
    owned = true
    const remove = ctx.slots.register({
      name: 'sidebar.settings', priority: -1, locale: NS,
      children: {
        'settings.trigger': { kind: 'single', scope: 'root' },
        'settings.header': { kind: 'single', scope: 'root' },
        'settings.action': { kind: 'list', scope: 'root' },
        'settings.close': { kind: 'single', scope: 'root' },
        'settings.section': { kind: 'list', scope: 'root' },
        'settings.onboarding': { kind: 'list', scope: 'root' },
      },
      inject: () => ({ sections, onboarding, connectionState: connection.state, reconnect: () => { connection.reconnect() } }),
    }, CodexSettingsPage)
    return () => { owned = false; remove() }
  })
  ctx.slots.inject('settings.section', () => !owned ? () => {} : ctx.slots.register({
    name: 'settings.section', id: 'general', priority: -1, order: 0, locale: NS, label: () => t('settings.general'),
    children: { 'settings.general.item': { kind: 'list', scope: 'root' }, 'settings.general.footer': { kind: 'list', scope: 'root' } },
    inject: () => ({ items }),
  }, CodexGeneralSettings))
}
