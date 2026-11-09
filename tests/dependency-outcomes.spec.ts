import { describe, it, expect, vi } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { installDependency, updateAllDependencies } from '../src/dependency-manager.ts'

describe('official dependency outcomes', () => {
  it('does not turn a structured host failure into success', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dcu-outcome-'))
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ version: '1.0.0' })))
    try {
      await writeFile(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }))
      const result = await installDependency('schedule', { environmentKind: 'cli', profileName: 'test', profileDir: dir, runtimeRoots: [], pluginManager: { installBundle: async () => ({ changed: false, application: 'failed', stage: 'install', target: 'test', error: { code: 'operation-error' } }) } })
      expect(result.application).toBe('failed')
    } finally { fetchMock.mockRestore(); await rm(dir, { recursive: true, force: true }) }
  })
})

it('HTTP reports the host restart outcome instead of assuming restart', async () => {
  const { apply } = await import('../src/index.ts')
  const { CODEX_UI_API_ENDPOINTS } = await import('../src/business-api.ts')
  const dir = await mkdtemp(join(tmpdir(), 'dcu-http-'))
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ version: '1.0.0' })))
  const routes = new Map<string, any>()
  const services: Record<string, unknown> = {
    webServer: { register: (route: any) => { routes.set(route.path, route); return () => {} } },
    profileContext: { name: 'test', dir }, connection: { requestRejection: () => undefined },
    pluginManager: { installBundle: async () => ({ changed: true, application: 'applied', stage: 'enable', target: 'test' }) },
  }
  try {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }))
    apply({ get: (key: string) => services[key], effect: (fn: () => unknown) => fn(), logger: { warn: () => {} } } as never)
    let body = ''
    await routes.get(CODEX_UI_API_ENDPOINTS.dependencies).handler({ method: 'POST', url: '?dependency=schedule' }, { writeHead: () => {}, end: (value: string) => { body = value } })
    expect(JSON.parse(body)).toMatchObject({ application: 'applied', restartRequired: false, autoReload: false })
  } finally { fetchMock.mockRestore(); await rm(dir, { recursive: true, force: true }) }
})

it.each(['applied', 'restart-required', 'overridden', 'cancelled'] as const)('preserves %s outcome', async application => {
  const dir = await mkdtemp(join(tmpdir(), 'dcu-outcome-'))
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ version: '1.0.0' })))
  try {
    await writeFile(join(dir, 'package.json'), '{}')
    const result = await installDependency('schedule', { environmentKind: 'cli', profileName: 'test', profileDir: dir, runtimeRoots: [], pluginManager: { installBundle: async () => ({ changed: application !== 'cancelled', application, stage: 'enable', target: 'test', restartReason: 'no-hmr' }) } })
    expect(result.application).toBe(application)
  } finally { fetchMock.mockRestore(); await rm(dir, { recursive: true, force: true }) }
})

it('stops a batch at an intermediate failure and preserves completed outcomes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dcu-batch-'))
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ version: '1.0.0' })))
  let calls = 0
  try {
    await writeFile(join(dir, 'package.json'), '{}')
    const result = await updateAllDependencies({ environmentKind: 'cli', profileName: 'test', profileDir: dir, runtimeRoots: [], pluginManager: { installBundle: async () => ({ changed: ++calls === 1, application: calls === 1 ? 'restart-required' : 'failed', stage: 'install', target: 'test', restartReason: 'no-hmr' }) } })
    expect(calls).toBe(2)
    expect(result.application).toBe('failed')
    expect(result.updatedCount).toBe(1)
    expect(result.results.map(r => r.application)).toEqual(['restart-required', 'failed'])
  } finally { fetchMock.mockRestore(); await rm(dir, { recursive: true, force: true }) }
})

it('旧套件成员不能触发未经验证的隐式批量迁移', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dcu-suite-'))
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ version: '1.0.0' })))
  const installBundle = vi.fn(async () => ({ changed: true, application: 'applied', stage: 'install', target: 'test' }))
  try {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dependencies: { '@michengai/dsh-codex-suite': '1.0.0' }, dsh: { profile: { bundles: ['@michengai/dsh-codex-suite'] } } }))
    await expect(installDependency('schedule', { environmentKind: 'cli', profileName: 'test', profileDir: dir, runtimeRoots: [], pluginManager: { installBundle } })).rejects.toThrow(/套件/)
    expect(installBundle).not.toHaveBeenCalled()
  } finally { fetchMock.mockRestore(); await rm(dir, { recursive: true, force: true }) }
})

it('preserves update restore outcome on failure', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dcu-update-'))
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ version: '2.0.0' })))
  try {
    const name = '@michengai/dsh-automation'
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dependencies: { [name]: '1.0.0' }, dsh: { profile: { bundles: [name] } } }))
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(dir, 'node_modules', '@michengai', 'dsh-automation'), { recursive: true })
    await writeFile(join(dir, 'node_modules', '@michengai', 'dsh-automation', 'package.json'), JSON.stringify({ version: '1.0.0' }))
    const change = (application: string, changed: boolean) => ({ application, changed, stage: 'install', target: name })
    const result = await installDependency('schedule', { environmentKind: 'cli', profileName: 'test', profileDir: dir, runtimeRoots: [], pluginManager: { installBundle: async () => { throw Error('wrong branch') }, updateBundle: async () => ({ from: '1.0.0', to: '2.0.0', step: 'install', result: change('failed', false), restore: change('restart-required', true) }) } })
    expect(result.application).toBe('failed')
    expect(result.results[0]?.restore).toEqual({ application: 'restart-required', changed: true })
  } finally { fetchMock.mockRestore(); await rm(dir, { recursive: true, force: true }) }
})

it('preserves diagnostic error info on failure and names failing package in HTTP error', async () => {
  const { apply } = await import('../src/index.ts')
  const { CODEX_UI_API_ENDPOINTS } = await import('../src/business-api.ts')
  const dir = await mkdtemp(join(tmpdir(), 'dcu-diag-'))
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ version: '1.0.0' })))
  const routes = new Map<string, any>()
  const services: Record<string, unknown> = {
    webServer: { register: (route: any) => { routes.set(route.path, route); return () => {} } },
    profileContext: { name: 'test', dir }, connection: { requestRejection: () => undefined },
    pluginManager: {
      installBundle: async () => ({
        changed: false,
        application: 'failed',
        stage: 'install',
        target: '@michengai/dsh-automation',
        error: { code: 'operation-error', message: 'connection timeout' },
        packageResult: { kind: 'timeout' },
      }),
    },
  }
  try {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }))
    apply({ get: (key: string) => services[key], effect: (fn: () => unknown) => fn(), logger: { warn: () => {} } } as never)
    let status = 0
    let body = ''
    await routes.get(CODEX_UI_API_ENDPOINTS.dependencies).handler(
      { method: 'POST', url: '?dependency=schedule' },
      { writeHead: (code: number) => { status = code }, end: (value: string) => { body = value } },
    )
    expect(status).toBe(503)
    const parsed = JSON.parse(body)
    expect(parsed.application).toBe('failed')
    expect(parsed.results[0].error).toMatchObject({ code: 'operation-error', kind: 'timeout' })
    expect(parsed.error).toContain('@michengai/dsh-automation')
    expect(parsed.error).toMatch(/超时|timeout|失败/i)
  } finally { fetchMock.mockRestore(); await rm(dir, { recursive: true, force: true }) }
})
