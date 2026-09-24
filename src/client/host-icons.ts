import type { ComponentType } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

/** 宿主图标组件。只声明调用方实际传入的属性。 */
export type HostIcon = ComponentType<{ size?: number; className?: string }>

/**
 * 优先使用 0.1.7 的 Medium 导出名，0.1.5 只有旧尺寸名时回退。
 * 必须动态读取，不能写成静态属性访问，否则旧宿主一加载客户端就会拿到 undefined。
 */
export function resolveHostIcon(icons: Record<string, HostIcon | undefined>, modern: string, legacy: string): HostIcon {
  const icon = icons[modern] ?? icons[legacy]
  if (!icon) throw new Error(`宿主缺少图标 ${modern}`)
  return icon
}

function hostIcon(modern: string, legacy: string): HostIcon {
  return resolveHostIcon(primitives as unknown as Record<string, HostIcon | undefined>, modern, legacy)
}

export const IconArchiveOutlineMedium = hostIcon('IconArchiveOutlineMedium', 'IconArchiveOutline20')
export const IconBranchOutlineMedium = hostIcon('IconBranchOutlineMedium', 'IconBranchOutline16')
export const IconCheckOutlineMedium = hostIcon('IconCheckOutlineMedium', 'IconCheckOutline16')
export const IconChevronDownOutlineMedium = hostIcon('IconChevronDownOutlineMedium', 'IconChevronDownOutline14')
export const IconChevronRightOutlineMedium = hostIcon('IconChevronRightOutlineMedium', 'IconChevronRightOutline14')
export const IconCopyOutlineMedium = hostIcon('IconCopyOutlineMedium', 'IconCopyOutline16')
export const IconDownloadOutlineMedium = hostIcon('IconDownloadOutlineMedium', 'IconDownloadOutline16')
export const IconEditOutlineMedium = hostIcon('IconEditOutlineMedium', 'IconEditOutline16')
export const IconEllipsisOutlineMedium = hostIcon('IconEllipsisOutlineMedium', 'IconEllipsisOutline16')
export const IconEnhanceOutlineMedium = hostIcon('IconEnhanceOutlineMedium', 'IconEnhanceOutline16')
export const IconFolderCloseMedium = hostIcon('IconFolderCloseMedium', 'IconFolderClose16')
export const IconFolderOpenMedium = hostIcon('IconFolderOpenMedium', 'IconFolderOpen16')
export const IconFolderOpenOutlineMedium = hostIcon('IconFolderOpenOutlineMedium', 'IconFolderOpenOutline16')
export const IconLinkOutlineMedium = hostIcon('IconLinkOutlineMedium', 'IconLinkOutline16')
export const IconListPenOutlineMedium = hostIcon('IconListPenOutlineMedium', 'IconListPenOutline16')
export const IconLoadingOutlineMedium = hostIcon('IconLoadingOutlineMedium', 'IconLoadingOutline16')
export const IconNewChatOutlineMedium = hostIcon('IconNewChatOutlineMedium', 'IconNewChatOutline16')
export const IconPanelLeftOutlineMedium = hostIcon('IconPanelLeftOutlineMedium', 'IconPanelLeftOutline16')
export const IconPersonalizationOutlineMedium = hostIcon('IconPersonalizationOutlineMedium', 'IconPersonalizationOutline16')
export const IconProjectAddOutlineMedium = hostIcon('IconProjectAddOutlineMedium', 'IconProjectAddOutline16')
export const IconSearchOutlineMedium = hostIcon('IconSearchOutlineMedium', 'IconSearchOutline16')
export const IconSettingsOutlineMedium = hostIcon('IconSettingsOutlineMedium', 'IconSettingsOutline16')
export const IconSkillOutlineMedium = hostIcon('IconSkillOutlineMedium', 'IconSkillOutline16')
export const IconTrashOutlineMedium = hostIcon('IconTrashOutlineMedium', 'IconTrashOutline16')
export const IconUserOutlineMedium = hostIcon('IconUserOutlineMedium', 'IconUserOutline16')
