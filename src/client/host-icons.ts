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

export const IconCheckOutlineMedium = hostIcon('IconCheckOutlineMedium', 'IconCheckOutline16')
export const IconDownloadOutlineMedium = hostIcon('IconDownloadOutlineMedium', 'IconDownloadOutline16')
export const IconListPenOutlineMedium = hostIcon('IconListPenOutlineMedium', 'IconListPenOutline16')
export const IconLoadingOutlineMedium = hostIcon('IconLoadingOutlineMedium', 'IconLoadingOutline16')
export const IconRefreshOutlineMedium = hostIcon('IconRefreshOutlineMedium', 'IconRefreshOutline16')
