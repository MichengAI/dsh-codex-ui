/** 关于页使用的 npm 累计下载量；历史不完整时返回 undefined，不把局部统计当总量。 */
const cache = new Map<string, { value: number | undefined; expires: number }>()
const pending = new Map<string, Promise<number | undefined>>()
// 关于页一次查十几个包。不限流时 registry 排队会吃完 5 秒超时，下载量就变成「—」。
const QUERY_LIMIT = 4
let activeQueries = 0
const queryWaiters: Array<() => void> = []

function acquireQuery(): Promise<void> {
  if (activeQueries < QUERY_LIMIT) {
    activeQueries += 1
    return Promise.resolve()
  }
  return new Promise(resolve => { queryWaiters.push(resolve) })
}

function releaseQuery(): void {
  const next = queryWaiters.shift()
  if (next !== undefined) next()
  else activeQueries -= 1
}

export function npmTotalDownloads(packageName: string): Promise<number | undefined> {
  const hit = cache.get(packageName)
  if (hit !== undefined && hit.expires > Date.now()) return Promise.resolve(hit.value)
  const active = pending.get(packageName)
  if (active !== undefined) return active
  const request = (async () => {
    await acquireQuery()
    try {
      return await query(packageName)
    } finally {
      releaseQuery()
    }
  })().then(value => {
    // 失败也短暂缓存，避免不可用时每次进入关于页都重复访问 npm。
    cache.set(packageName, { value, expires: Date.now() + (value === undefined ? 5 * 60_000 : 6 * 60 * 60_000) })
    return value
  }).finally(() => { pending.delete(packageName) })
  pending.set(packageName, request)
  return request
}

async function query(packageName: string): Promise<number | undefined> {
  try {
    const encoded = encodeURIComponent(packageName)
    // 创建日和下载量不能共用一个超时：关于页会并行查十几个包，前面的 registry 排队会把后面的下载请求掐掉。
    const metadata = await fetch(`https://registry.npmjs.org/${encoded}`, { signal: AbortSignal.timeout(5_000) })
    if (!metadata.ok) return undefined
    const manifest = await metadata.json() as { time?: { created?: unknown } } | null
    const created = manifest?.time?.created
    if (typeof created !== 'string') return undefined
    const createdAt = Date.parse(created)
    // npm 的公开下载记录始于 2015-01-10；更早创建的包无法据此证明全历史总量。
    if (!Number.isFinite(createdAt) || createdAt < Date.parse('2015-01-10T00:00:00Z') || createdAt > Date.now()) return undefined
    const day = 86_400_000
    const start = Math.floor(createdAt / day) * day
    const end = Math.floor(Date.now() / day) * day - day
    if (start > end) return 0
    const ranges: Array<{ start: string; end: string }> = []
    // point 接口会静默截短超长区间；每段最多一年且首尾不重叠，并核对响应区间。
    for (let from = start; from <= end; from += 365 * day) {
      ranges.push({ start: new Date(from).toISOString().slice(0, 10), end: new Date(Math.min(from + 364 * day, end)).toISOString().slice(0, 10) })
    }
    const values = await Promise.all(ranges.map(async range => {
      const response = await fetch(`https://api.npmjs.org/downloads/point/${range.start}:${range.end}/${encoded}`, { signal: AbortSignal.timeout(5_000) })
      if (!response.ok) return undefined
      const data: unknown = await response.json()
      if (data === null || typeof data !== 'object') return undefined
      const { package: name, downloads, start, end } = data as Record<string, unknown>
      return name === packageName && start === range.start && end === range.end && typeof downloads === 'number' && Number.isSafeInteger(downloads) && downloads >= 0 ? downloads : undefined
    }))
    if (values.some(value => value === undefined)) return undefined
    const total = values.reduce<number>((sum, value) => sum + value!, 0)
    return Number.isSafeInteger(total) ? total : undefined
  } catch {
    // 超时、离线及无效响应统一表示统计缺失，前端明确显示“暂不可用”。
    return undefined
  }
}
