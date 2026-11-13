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
 * 采用双通道快速探测（sessionController 优先，llm 并发回退），带并发限制与 1.5s 超时。
 */
export async function collectModelCatalog(ctx: Context): Promise<ProviderCatalogEntry[]> {
  const now = Date.now()
  if (catalogCache !== undefined && catalogCache.expiresAt > now) {
    return catalogCache.data
  }

  // 通道 1：如果宿主暴露了 sessionController.modelCatalog()，直接毫秒级提取
  try {
    const sessionController = (ctx as any).sessionController ?? (ctx as any).get?.('sessionController')
    if (sessionController && typeof sessionController.modelCatalog === 'function') {
      const cat = await sessionController.modelCatalog()
      if (cat && Array.isArray(cat.groups) && cat.groups.length > 0) {
        const providers: ProviderCatalogEntry[] = cat.groups.map((g: any) => ({
          id: String(g.id || '').trim(),
          name: String(g.name || g.id || '').trim(),
          models: (g.models || []).map((m: any) => ({
            id: String(m.id || '').trim(),
            name: m.name ? String(m.name) : String(m.id || ''),
            description: m.description ? String(m.description) : undefined,
            reasoning: m.reasoning && Array.isArray(m.reasoning.efforts) && m.reasoning.efforts.length > 0 ? {
              efforts: m.reasoning.efforts.map((e: any) => ({
                id: String(e.id || ''),
                name: e.name ? String(e.name) : undefined,
                description: e.description ? String(e.description) : undefined,
              })).filter((e: any) => e.id !== ''),
              defaultEffort: m.reasoning.defaultEffort ? String(m.reasoning.defaultEffort) : undefined,
            } : null,
          })).filter((m: any) => m.id !== ''),
        })).filter((p: any) => p.id !== '' && p.models.length > 0)

        if (providers.length > 0) {
          providers.sort((a, b) => {
            const rankA = a.id === 'deepseek-account' ? 0 : a.id === 'deepseek-official' ? 1 : 2
            const rankB = b.id === 'deepseek-account' ? 0 : b.id === 'deepseek-official' ? 1 : 2
            if (rankA !== rankB) return rankA - rankB
            return a.name.localeCompare(b.name)
          })
          catalogCache = { expiresAt: now + CATALOG_TTL_MS, data: providers }
          return providers
        }
      }
    }
  } catch {
    // 降级走通道 2
  }

  // 通道 2：通过 llm 服务并发拉取
  const llm = (ctx as any).llm ?? (ctx as any).get?.('llm')
  if (!llm || typeof llm.listProviders !== 'function') {
    return []
  }

  let rawProviders: any[] = []
  try {
    rawProviders = llm.listProviders() ?? []
  } catch {
    rawProviders = []
  }

  const providerTasks = rawProviders.map(async (item) => {
    const providerId = String(item.id ?? item.provider ?? '').trim()
    if (!providerId) return null
    const providerName = String(item.name ?? providerId)

    let modelsRaw: any[] = []
    try {
      if (typeof llm.listModels === 'function') {
        modelsRaw = (await llm.listModels(providerId)) ?? []
      }
    } catch {
      modelsRaw = []
    }

    const modelTasks = modelsRaw.map(async (m) => {
      const modelId = String(m?.id ?? '').trim()
      if (!modelId) return null
      let reasoning: ModelCatalogEntry['reasoning'] = null

      try {
        if (typeof llm.resolveModelInfo === 'function') {
          const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
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
        }
      } catch {
        reasoning = null
      }

      return {
        id: modelId,
        name: m.name ? String(m.name) : modelId,
        description: m.description ? String(m.description) : undefined,
        reasoning,
      } as ModelCatalogEntry
    })

    const models = (await Promise.all(modelTasks)).filter(Boolean) as ModelCatalogEntry[]
    if (models.length === 0) return null

    return {
      id: providerId,
      name: providerName,
      models,
    } as ProviderCatalogEntry
  })

  const providers = (await Promise.all(providerTasks)).filter(Boolean) as ProviderCatalogEntry[]

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
