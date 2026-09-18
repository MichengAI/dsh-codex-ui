/** 设置里挂一份官方插件管理页，不改写官方「内置插件」分区。 */
import type { Context } from '@deepseek-ai/cordis'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { bindPluginConfigLocale, createPluginConfigSection, type OfficialPluginPage } from './PluginConfigSection.tsx'
import { NS } from './locales.ts'
import { OFFICIAL_PLUGINS_PANEL_ID } from './settings-navigation.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 官方插件管理页文案；仅在宿主装了 plugin-manager 时存在。 */
    pluginManager: string
  }
}

export const PLUGIN_CONFIG_SECTION_ID = 'plugin-config'
export const PLUGIN_CONFIG_SECTION_ORDER = 16
const OFFICIAL_PLUGIN_MANAGER_NS = 'pluginManager'

function officialPluginsPage(entry: StoredEntry | undefined): OfficialPluginPage | undefined {
  if (entry === undefined || entry.options.key !== OFFICIAL_PLUGINS_PANEL_ID) return undefined
  if (typeof entry.component !== 'function' || typeof entry.inject !== 'function' || entry.locale !== OFFICIAL_PLUGIN_MANAGER_NS) return undefined
  return entry.component as OfficialPluginPage
}

export function registerPluginConfigSection(ctx: Context): void {
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => {
    let current: StoredEntry | undefined
    let remove: (() => void) | undefined
    const refresh = () => {
      const entry = ctx.slots.entriesOfSlot('main').find(item => item.options.key === OFFICIAL_PLUGINS_PANEL_ID)
      if (entry === current) return
      remove?.(); remove = undefined; current = entry
      const Official = officialPluginsPage(entry)
      if (Official === undefined || entry?.inject === undefined || entry.locale !== OFFICIAL_PLUGIN_MANAGER_NS) return
      remove = ctx.slots.register({
        name: 'settings.section',
        id: PLUGIN_CONFIG_SECTION_ID,
        order: PLUGIN_CONFIG_SECTION_ORDER,
        label: () => t('settings.pluginConfig'),
        locale: entry.locale,
        inject: entry.inject,
      }, createPluginConfigSection(Official, () => t('settings.pluginConfig'), ctx.slots, bindPluginConfigLocale(ns => {
        const translate = ctx.locale.bind(ns as never)
        return (key, params) => translate(key as never, params as never)
      })))
    }
    const unsubscribe = ctx.slots.subscribe('main', refresh)
    refresh()
    return () => { unsubscribe(); remove?.() }
  })
}
