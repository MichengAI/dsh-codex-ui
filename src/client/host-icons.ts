import React, { type ComponentType } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

/** 宿主图标组件。只声明调用方实际传入的属性。 */
export type HostIcon = ComponentType<{ size?: number; className?: string }>

/**
 * 宿主通用矢量安全兜底图标（坚决禁止在模块顶层抛出硬异常导致整个客户端猝死）
 */
function createFallbackIcon(pathData: string): HostIcon {
  return function FallbackIcon(props: { size?: number; className?: string }) {
    return React.createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: props.size ?? 16,
        height: props.size ?? 16,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className: props.className,
      },
      React.createElement('path', { d: pathData })
    )
  }
}

const FALLBACK_CHECK = createFallbackIcon('M3 8.5l3.5 3.5 6.5-7')
const FALLBACK_DOWNLOAD = createFallbackIcon('M8 2v9m0 0l-3-3m3 3l3-3M3 13h10')
const FALLBACK_LIST_PEN = createFallbackIcon('M3 4h10M3 8h6M3 12h4m6-3l2 2-5 5H9v-2l5-5z')
const FALLBACK_LOADING = createFallbackIcon('M8 2a6 6 0 1 0 6 6')
const FALLBACK_REFRESH = createFallbackIcon('M2.5 8a5.5 5.5 0 1 0 1.2-3.4M2.5 3v3h3')

/**
 * 跨宿主版本图标安全解析器：
 * 优先匹配 modern，次优匹配 legacy，若提供 fallback 则安全回退，未提供且均缺失时才抛错（单测保护）。
 */
export function resolveHostIcon(
  icons: Record<string, HostIcon | undefined>,
  modern: string,
  legacy: string,
  fallback?: HostIcon
): HostIcon {
  const icon = icons[modern] ?? icons[legacy]
  if (icon) return icon
  if (fallback) return fallback
  throw new Error(`宿主缺少图标 ${modern}`)
}

function hostIcon(modern: string, legacy: string, fallback: HostIcon): HostIcon {
  const candidates = [modern, legacy, modern.replace('Medium', 'Regular'), modern.replace('OutlineMedium', 'OutlineRegular')]
  const icons = primitives as unknown as Record<string, HostIcon | undefined>
  for (const name of candidates) {
    if (icons[name]) return icons[name]!
  }
  return fallback
}

export const IconCheckOutlineMedium = hostIcon('IconCheckOutlineMedium', 'IconCheckOutline16', FALLBACK_CHECK)
export const IconDownloadOutlineMedium = hostIcon('IconDownloadOutlineMedium', 'IconDownloadOutline16', FALLBACK_DOWNLOAD)
export const IconListPenOutlineMedium = hostIcon('IconListPenOutlineMedium', 'IconListPenOutline16', FALLBACK_LIST_PEN)
export const IconLoadingOutlineMedium = hostIcon('IconLoadingOutlineMedium', 'IconLoadingOutline16', FALLBACK_LOADING)
export const IconRefreshOutlineMedium = hostIcon('IconRefreshOutlineMedium', 'IconRefreshOutline16', FALLBACK_REFRESH)
