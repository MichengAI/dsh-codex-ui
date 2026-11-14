import type { Context } from '@deepseek-ai/cordis'

export interface ModelReasoningEffort {
  id: string
  name?: string
  description?: string
}

export interface ModelCatalogEntry {
  id: string
  name?: string
  description?: string
  reasoning?: {
    efforts: ModelReasoningEffort[]
    defaultEffort?: string
  } | null
}

export interface ProviderCatalogEntry {
  id: string
  name: string
  models: ModelCatalogEntry[]
}

let catalogCache: { expiresAt: number; data: ProviderCatalogEntry[] } | undefined
const CATALOG_TTL_MS = 30_000

export function clearModelCatalogCache(): void {
  catalogCache = undefined
}

/**
 * 收集当前宿主已配置的所有可用提供商与模型目录。
 * 遵循与 dsh-automation / dsh-im-connect 一致的提供商排序规范（官方置顶）。
 * 单模型推理信息探测附带超时保护，杜绝外部提供商异常挂死端点。
 */
export async function collectModelCatalog(ctx: Context): Promise<ProviderCatalogEntry[]> {
  const now = Date.now()
  if (catalogCache !== undefined && catalogCache.expiresAt > now) {
    return catalogCache.data
  }

  const llm = (ctx as any).llm ?? (ctx as any).get?.('llm')
  if (!llm || typeof llm.listProviders !== 'function') {
    return []
  }

  let rawProviders: any[] = []
  try {
    rawProviders = llm.listProviders() ?? []
  } catch {
    return []
  }
  const providers: ProviderCatalogEntry[] = []

  for (const item of rawProviders) {
    const providerId = String(item.id ?? item.provider ?? '').trim()
    if (!providerId) continue
    const providerName = String(item.name ?? providerId)

    let modelsRaw: any[] = []
    try {
      if (typeof llm.listModels === 'function') {
        modelsRaw = (await llm.listModels(providerId)) ?? []
      }
    } catch {
      modelsRaw = []
    }

    const models: ModelCatalogEntry[] = []
    for (const m of modelsRaw) {
      const modelId = String(m?.id ?? '').trim()
      if (!modelId) continue
      let reasoning: ModelCatalogEntry['reasoning'] = null

      try {
        if (typeof llm.resolveModelInfo === 'function') {
          let timer: NodeJS.Timeout | undefined
          const timeoutPromise = new Promise<null>((_, reject) => {
            timer = setTimeout(() => reject(new Error('timeout')), 1500)
          })
          try {
            const info = await Promise.race([llm.resolveModelInfo(providerId, modelId), timeoutPromise])
            if (info?.reasoning && Array.isArray(info.reasoning.efforts) && info.reasoning.efforts.length > 0) {
              reasoning = {
                efforts: info.reasoning.efforts.map((e: any) => ({
                  id: String(e.id ?? ''),
                  name: e.name ? String(e.name) : undefined,
                  description: e.description ? String(e.description) : undefined,
                })).filter((e: any) => e.id !== ''),
                defaultEffort: info.reasoning.defaultEffort ? String(info.reasoning.defaultEffort) : undefined,
              }
            }
          } finally {
            if (timer !== undefined) clearTimeout(timer)
          }
        }
      } catch {
        reasoning = null
      }

      models.push({
        id: modelId,
        name: m.name ? String(m.name) : modelId,
        description: m.description ? String(m.description) : undefined,
        reasoning,
      })
    }

    if (models.length > 0) {
      providers.push({
        id: providerId,
        name: providerName,
        models,
      })
    }
  }

  // 排序：官方账号与官方渠道置顶
  providers.sort((a, b) => {
    const rankA = a.id === 'deepseek-account' ? 0 : a.id === 'deepseek-official' ? 1 : 2
    const rankB = b.id === 'deepseek-account' ? 0 : b.id === 'deepseek-official' ? 1 : 2
    if (rankA !== rankB) return rankA - rankB
    return a.name.localeCompare(b.name)
  })

  catalogCache = {
    expiresAt: now + CATALOG_TTL_MS,
    data: providers,
  }

  return providers
}
