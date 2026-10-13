import type { Context } from '@deepseek-ai/cordis'
import { CodexGeneralSettings, CodexSettingsPage, type SettingsSource } from './CodexSettingsPage.tsx'
import { NS } from './locales.ts'
import type { SettingsRow } from './settings-page-model.ts'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsDescribeFace } from '@deepseek-ai/dsh-client-ui-settings/client'
import { createElement } from 'react'
import { Settings } from 'lucide-react'
import { SettingsDocumentAction } from './SettingsDocumentAction.tsx'
import { DeveloperToolsRow, type DeveloperToolsHandle } from './DeveloperToolsRow.tsx'
import { registerAfterOfficialWave } from './official-slot-shadow.ts'
import { mirrorSlot, withSlotAliases } from './slot-mirror.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'settings.general.footer': { kind: 'list'; scope: 'root'; owner: {} }
    'settings.codex.launcher': SlotMap['settings.launcher']
    'settings.codex.trigger': SlotMap['settings.trigger']
    'settings.codex.header': SlotMap['settings.header']
    'settings.codex.action': SlotMap['settings.action']
    'settings.codex.close': SlotMap['settings.close']
    'settings.codex.section': SlotMap['settings.section']
    'settings.codex.onboarding': SlotMap['settings.onboarding']
    'settings.codex.general.item': SlotMap['settings.general.item']
    'settings.codex.general.footer': SlotMap['settings.general.footer']
  }
}

const shellAliases = {
  'settings.launcher': 'settings.codex.launcher',
  'settings.trigger': 'settings.codex.trigger',
  'settings.header': 'settings.codex.header',
  'settings.action': 'settings.codex.action',
  'settings.close': 'settings.codex.close',
  'settings.section': 'settings.codex.section',
  'settings.onboarding': 'settings.codex.onboarding',
}
const shellAliasChildren = {
  'settings.codex.launcher': { kind: 'single' as const, scope: 'root' as const },
  'settings.codex.trigger': { kind: 'single' as const, scope: 'root' as const },
  'settings.codex.header': { kind: 'single' as const, scope: 'root' as const },
  'settings.codex.action': { kind: 'list' as const, scope: 'root' as const },
  'settings.codex.close': { kind: 'single' as const, scope: 'root' as const },
  'settings.codex.section': { kind: 'list' as const, scope: 'root' as const },
  'settings.codex.onboarding': { kind: 'list' as const, scope: 'root' as const },
}
const generalAliases = {
  'settings.general.item': 'settings.codex.general.item',
  'settings.general.footer': 'settings.codex.general.footer',
}
const generalAliasChildren = {
  'settings.codex.general.item': { kind: 'list' as const, scope: 'root' as const },
  'settings.codex.general.footer': { kind: 'list' as const, scope: 'root' as const },
}
const AliasedCodexSettingsPage = withSlotAliases(CodexSettingsPage, shellAliases) as typeof CodexSettingsPage
const AliasedCodexGeneralSettings = withSlotAliases(CodexGeneralSettings, generalAliases) as typeof CodexGeneralSettings

function registerMirrors(ctx: Context, aliases: Readonly<Record<string, string>>, register: () => () => void): () => void {
  const unregister = register()
  const mirrors: (() => void)[] = []
  const getSpec = (ctx.slots as unknown as { spec?: (slot: string) => unknown }).spec
  try {
    for (const [source, target] of Object.entries(aliases)) {
      if (getSpec?.call(ctx.slots, source) !== undefined) mirrors.push(mirrorSlot({ slots: ctx.slots }, source, target))
    }
  } catch (error) {
    for (const dispose of mirrors.reverse()) dispose()
    unregister()
    throw error
  }
  return () => { for (const dispose of mirrors.reverse()) dispose(); unregister() }
}

/** 用更低优先级覆盖设置壳。官方壳仍登记，停用或卸载时撤销本插件登记后恢复。 */
type ShortcutRow = { id: string; keys: readonly string[]; aria?: string }

/** 快捷键服务可能晚于本插件启动。等到它就绪后再读 catalog，避免注册时一次取值把提示永久丢掉。 */
const emptyShortcuts: readonly ShortcutRow[] = []

function liveShortcutCatalog(ctx: Context): SettingsSource<ShortcutRow> {
  const listeners = new Set<() => void>()
  let catalog: SettingsSource<ShortcutRow> | undefined
  const notify = (): void => { for (const listener of listeners) listener() }
  ctx.inject(['shortcuts'], shortcutCtx => {
    catalog = (shortcutCtx as Context & { shortcuts: { catalog: SettingsSource<ShortcutRow> } }).shortcuts.catalog
    const unsubscribe = catalog.subscribe(notify)
    notify()
    return () => { unsubscribe(); catalog = undefined; notify() }
  })
  return {
    getSnapshot: () => catalog?.getSnapshot() ?? emptyShortcuts,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}

function accountLauncherPresence(slots: Context['slots']): { getSnapshot: () => boolean; subscribe: (listener: () => void) => () => void } {
  const read = (): boolean => {
    try { return slots.entriesOfSlot('settings.launcher').length > 0 }
    catch { return false }
  }
  return {
    getSnapshot: read,
    subscribe: listener => {
      try { return slots.subscribe('settings.launcher', listener) }
      catch { return () => {} }
    },
  }
}

export function registerSettingsPage(ctx: Context): void {
  const t = ctx.locale.bind(NS)
  const declared = (name: string): boolean => {
    const spec = ctx.slots.spec as ((this: unknown, key: string) => unknown) | undefined
    return typeof spec === 'function' && spec.call(ctx.slots, name) !== undefined
  }
  const isOurSettingsPage = (entry: { registrant?: string; component?: unknown }): boolean =>
    entry.registrant === 'michengai-codex-ui' || entry.component === CodexSettingsPage || entry.component === AliasedCodexSettingsPage
  const officialSettingsReady = (): boolean => declared('settings.launcher') || ctx.slots.entries('sidebar.settings').some(entry => !isOurSettingsPage(entry))
  // Host 和 Client 共享服务名；当前入口读取的是浏览器连接外观。
  const service: unknown = ctx.get('connection')
  const connection = service as ConnectionHandle
  const shortcuts = liveShortcutCatalog(ctx)
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
  // 与官方设置行共存，停用本插件后仍保留官方开关。
  ctx.inject(['configForms'], configFormsCtx => {
    const configForms = (configFormsCtx as Context & { configForms: { developerTools?: DeveloperToolsHandle } }).configForms
    if (!configForms?.developerTools) return
    const developerTools = configForms.developerTools
    return configFormsCtx.slots.inject('settings.general.item', () => configFormsCtx.slots.register({
      name: 'settings.general.item', id: 'developer-tools', priority: -1, order: 15, locale: NS,
      inject: () => ({ developerTools }),
    }, DeveloperToolsRow))
  })
  ctx.slots.inject('sidebar.settings', () => registerAfterOfficialWave(ctx.slots, 'sidebar.settings', officialSettingsReady, () => {
    return registerMirrors(ctx, shellAliases, () => ctx.slots.register({
      name: 'sidebar.settings', priority: -1, locale: NS, children: shellAliasChildren,
      inject: () => ({ sections, onboarding, connectionState: connection.state, reconnect: () => { connection.reconnect() }, accountLauncher: accountLauncherPresence(ctx.slots), shortcuts }),
    }, AliasedCodexSettingsPage as never))
  }, true))
  ctx.slots.inject('settings.section', () => registerAfterOfficialWave(ctx.slots, 'settings.section', () => declared('settings.general.item'), () => {
    return registerMirrors(ctx, generalAliases, () => ctx.slots.register({
      name: 'settings.section', id: 'general', priority: -1, order: 0, locale: NS, label: () => t('settings.general'),
      children: generalAliasChildren, inject: () => ({ items }),
    }, AliasedCodexGeneralSettings as never))
  }, true))
}
