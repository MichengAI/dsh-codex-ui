import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-13T12:00:00Z'))
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

function mockNpm(created = '2026-08-16T01:00:00Z', downloads: unknown = 1234, mismatch = false) {
  const fetcher = vi.fn(async (url: string) => {
    if (url.startsWith('https://registry.npmjs.org/')) return { ok: true, json: async () => ({ time: { created } }) }
    const match = /point\/([^:]+):([^/]+)\/(.+)$/.exec(url)!
    return { ok: true, json: async () => ({ package: decodeURIComponent(match[3]!), downloads, start: mismatch ? '2026-09-01' : match[1], end: match[2] }) }
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

test('从创建日至昨日累计，保留零值并合并并发请求', async () => {
  const fetcher = mockNpm(undefined, 0)
  const { npmTotalDownloads } = await import('../src/npm-downloads.ts')
  expect(await Promise.all([npmTotalDownloads('@michengai/dsh-pua'), npmTotalDownloads('@michengai/dsh-pua')])).toEqual([0, 0])
  expect(await npmTotalDownloads('@michengai/dsh-pua')).toBe(0)
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls[1]?.[0]).toBe('https://api.npmjs.org/downloads/point/2026-08-16:2026-09-12/%40michengai%2Fdsh-pua')
})

test('跨年分段无重叠、无缺日，含闰日并汇总所有段', async () => {
  const fetcher = mockNpm('2024-01-01T00:00:00Z', 100)
  const { npmTotalDownloads } = await import('../src/npm-downloads.ts')
  expect(await npmTotalDownloads('dshmarket')).toBe(300)
  expect(fetcher.mock.calls.slice(1).map(([url]) => url)).toEqual([
    'https://api.npmjs.org/downloads/point/2024-01-01:2024-12-30/dshmarket',
    'https://api.npmjs.org/downloads/point/2024-12-31:2025-12-30/dshmarket',
    'https://api.npmjs.org/downloads/point/2025-12-31:2026-09-12/dshmarket',
  ])
})

test.each([-1, 1.5, '123', null, Number.MAX_SAFE_INTEGER + 1])('拒绝无效下载量 %s', async downloads => {
  mockNpm(undefined, downloads)
  const { npmTotalDownloads } = await import('../src/npm-downloads.ts')
  expect(await npmTotalDownloads('dshmarket')).toBeUndefined()
})

test('拒绝 npm 静默截短的统计区间', async () => {
  mockNpm(undefined, 100, true)
  const { npmTotalDownloads } = await import('../src/npm-downloads.ts')
  expect(await npmTotalDownloads('dshmarket')).toBeUndefined()
})

test.each(['invalid', '2014-01-01', '2027-01-01'])('无法证明完整历史时不显示总量：%s', async created => {
  const fetcher = mockNpm(created)
  const { npmTotalDownloads } = await import('../src/npm-downloads.ts')
  expect(await npmTotalDownloads('dshmarket')).toBeUndefined()
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('任何一段失败不得返回部分总量，并短暂缓存失败', async () => {
  const fetcher = mockNpm('2024-01-01T00:00:00Z')
  fetcher.mockImplementationOnce(async () => ({ ok: true, json: async () => ({ time: { created: '2024-01-01T00:00:00Z' } }) }))
  fetcher.mockImplementationOnce(async () => { throw new Error('offline') })
  const { npmTotalDownloads } = await import('../src/npm-downloads.ts')
  expect(await npmTotalDownloads('dshmarket')).toBeUndefined()
  expect(await npmTotalDownloads('dshmarket')).toBeUndefined()
  expect(fetcher).toHaveBeenCalledTimes(4)
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60_000)
  expect(await npmTotalDownloads('dshmarket')).toBe(3702)
})

test('成功数据六小时后重新查询', async () => {
  const fetcher = mockNpm()
  const { npmTotalDownloads } = await import('../src/npm-downloads.ts')
  expect(await npmTotalDownloads('dshmarket')).toBe(1234)
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60 * 60_000 + 1)
  await npmTotalDownloads('dshmarket')
  expect(fetcher).toHaveBeenCalledTimes(4)
})
