import type { Context } from '@deepseek-ai/cordis'
import { CodexGeneralSettings, CodexSettingsPage, type SettingsSource } from './CodexSettingsPage.tsx'
import { NS } from './locales.ts'
import type { SettingsRow } from './settings-page-model.ts'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsDescribeFace } from '@deepseek-ai/dsh-client-ui-settings/client'
import { createElement } from 'react'
import { Settings } from 'lucide-react'
import { SettingsDocumentAction } from './SettingsDocumentAction.tsx'
import { registerAfterOfficialWave } from './official-slot-shadow.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'settings.general.footer': { kind: 'list'; scope: 'root'; owner: {} }
  }
}

/** 用更低优先级覆盖设置壳。官方壳仍登记，停用或卸载时撤销本插件登记后恢复。 */
export function registerSettingsPage(ctx: Context): void {
  const t = ctx.locale.bind(NS)
  const declared = (name: string): boolean => {
    const spec = ctx.slots.spec as ((this: unknown, key: string) => unknown) | undefined
    return typeof spec === 'function' && spec.call(ctx.slots, name) !== undefined
  }
  const officialSettingsReady = (): boolean => declared('settings.launcher') || ctx.slots.entries('sidebar.settings').some(entry => entry.component !== CodexSettingsPage)
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
  ctx.slots.inject('settings.trigger', () => ctx.slots.register({ name: 'settings.trigger', priority: -1, locale: NS },
    ({ wide }) => createElement('span', { className: 'dcu-settings-trigger-content' }, createElement(Settings, { size: 16, strokeWidth: 1.6 }), wide ? createElement('span', null, t('settings.title')) : null)))
  ctx.slots.inject('settings.header', () => ctx.slots.register({ name: 'settings.header', priority: -1, locale: NS }, () => null))
  ctx.slots.inject('settings.close', () => ctx.slots.register({ name: 'settings.close', priority: -1, locale: NS }, () => t('settings.back')))
  // 0.1.7 叫 configForms，0.1.5 叫 settingsScope。只等其中一个时，另一版的配置文件入口不会出现。
  let documentBound = false
  const bindSettingsDocument = (settingsCtx: Context, forms: { describe: () => SettingsDescribeFace }) => {
    if (documentBound) return
    const service: unknown = settingsCtx.get('remote')
    const remote = service as { $host: { isLoopback: boolean }; settings: { openSettingsDocument: () => Promise<{ ok: boolean }> } }
    if (!remote.$host.isLoopback) return
    documentBound = true
    const describe = forms.describe()
    const remove = settingsCtx.slots.inject('settings.general.footer', () => settingsCtx.slots.register({
      name: 'settings.general.footer', id: 'open-document', priority: -1, locale: NS,
      inject: () => ({ describe, openDocument: () => remote.settings.openSettingsDocument() }),
    }, SettingsDocumentAction))
    return () => { documentBound = false; remove() }
  }
  ctx.inject(['configForms', 'remote.settings'], settingsCtx => {
    return bindSettingsDocument(settingsCtx, (settingsCtx as Context & { configForms: { describe: () => SettingsDescribeFace } }).configForms)
  })
  ctx.inject(['settingsScope', 'remote.settings'], settingsCtx => {
    return bindSettingsDocument(settingsCtx, (settingsCtx as Context & { settingsScope: { describe: () => SettingsDescribeFace } }).settingsScope)
  })
  const shellChildren = {
    'settings.trigger': { kind: 'single' as const, scope: 'root' as const },
    'settings.header': { kind: 'single' as const, scope: 'root' as const },
    'settings.action': { kind: 'list' as const, scope: 'root' as const },
    'settings.close': { kind: 'single' as const, scope: 'root' as const },
    'settings.section': { kind: 'list' as const, scope: 'root' as const },
    'settings.onboarding': { kind: 'list' as const, scope: 'root' as const },
  }
  ctx.slots.inject('sidebar.settings', () => registerAfterOfficialWave(ctx.slots, 'sidebar.settings', officialSettingsReady, () => {
    const children: Partial<typeof shellChildren> = {}
    if (!officialSettingsReady()) {
      for (const [name, spec] of Object.entries(shellChildren)) {
        if (!declared(name)) Object.assign(children, { [name]: spec })
      }
    }
    return ctx.slots.register({
      name: 'sidebar.settings', priority: -1, locale: NS, children,
      inject: () => ({ sections, onboarding, connectionState: connection.state, reconnect: () => { connection.reconnect() } }),
    }, CodexSettingsPage)
  }))
  ctx.slots.inject('settings.section', () => registerAfterOfficialWave(ctx.slots, 'settings.section', () => declared('settings.general.item'), () => {
    const children: Record<string, { kind: 'list'; scope: 'root' }> = {}
    if (!declared('settings.general.item')) children['settings.general.item'] = { kind: 'list', scope: 'root' }
    if (!declared('settings.general.footer')) children['settings.general.footer'] = { kind: 'list', scope: 'root' }
    return ctx.slots.register({
      name: 'settings.section', id: 'general', priority: -1, order: 0, locale: NS, label: () => t('settings.general'),
      children, inject: () => ({ items }),
    }, CodexGeneralSettings)
  }))
}
