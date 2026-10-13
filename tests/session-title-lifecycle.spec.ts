import { expect, test, vi } from 'vitest'
import { apply } from '../src/session-title-plugin.ts'
import { startSessionTitleLifecycle } from '../src/session-title-lifecycle.ts'
import { SESSION_TITLE_PROVIDER_ID } from '../src/session-title-provider.ts'

// 忠实模拟已发布服务契约：所有提供方共用单槽，不按 id 分槽。
function fixture(disabled?: boolean | null, targetName: string = '@deepseek-ai/dsh-session-title-first-prompt-llm', targetId: string = 'session-title-llm') {
  let slot: string | undefined = disabled ? undefined : 'official'
  const events: string[] = []
  const release = vi.fn(async () => { events.push('official:dispose'); slot = undefined })
  const options = { id: targetId, name: targetName, ...(disabled === undefined ? {} : { disabled }) }
  const entry = {
    options,
    get disabled() { return !!options.disabled },
    fiber: disabled ? undefined : { dispose: release },
    update: vi.fn(async (patch: { disabled: boolean | null }) => {
      if (patch.disabled === null) delete options.disabled
      else options.disabled = patch.disabled
      if (options.disabled) { void entry.fiber?.dispose(); entry.fiber = undefined }
      else { events.push('official:restore'); if (slot) throw Error('occupied'); slot = 'official'; entry.fiber = { dispose: release } }
    }),
  }
  const service = { register: vi.fn((provider: { id: string }) => {
    if (slot) throw Error(`provider ${slot} already registered`)
    events.push('codex:register'); slot = provider.id
    return async () => { events.push('codex:dispose'); slot = undefined }
  }) }
  const entries = [entry]
  const loader = { entries: () => entries.values(), update: vi.fn(() => { throw Error('disk write forbidden') }) }
  const disposers: (() => unknown)[] = []
  const ctx = { loader, get: (name: string) => ({ sessionTitle: service, llm: { async *stream() {} } }[name]), logger: { warn: vi.fn() }, effect: (fn: () => () => unknown) => { disposers.push(fn()) } }
  return { ctx, entry, options, entries, events, service, loader, disposers, slot: () => slot }
}

test('takes the official single slot in memory and restores only after Codex disposal', async () => {
  const f = fixture(false)
  await apply(f.ctx as never)
  expect(f.slot()).toBe(SESSION_TITLE_PROVIDER_ID)
  expect(f.options.disabled).toBe(true)
  await f.disposers[0]!()
  expect(f.slot()).toBe('official')
  expect(f.options.disabled).toBe(false)
  expect(f.events).toEqual(['official:dispose', 'official:dispose', 'codex:register', 'codex:dispose', 'official:restore'])
  expect(f.loader.update).not.toHaveBeenCalled()
})

test('takes optional-session-title-all-prompts and restores it safely', async () => {
  const f = fixture(false, '@deepseek-ai/dsh-session-title-all-prompts-llm', 'optional-session-title-all-prompts')
  await apply(f.ctx as never)
  expect(f.slot()).toBe(SESSION_TITLE_PROVIDER_ID)
  expect(f.options.disabled).toBe(true)
  await f.disposers[0]!()
  expect(f.slot()).toBe('official')
  expect(f.options.disabled).toBe(false)
  expect(f.loader.update).not.toHaveBeenCalled()
})

test('a failed entry update rolls its memory state back', async () => {
  const f = fixture(false)
  const update = f.entry.update.getMockImplementation()!
  f.entry.update.mockImplementationOnce(async patch => { await update(patch); throw Error('entry update failed') })
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  await expect(lifecycle.ready).rejects.toThrow('entry update failed')
  expect(f.options.disabled).toBe(false)
  expect(f.slot()).toBe('official')
  await expect(lifecycle.dispose()).resolves.toBeUndefined()
})

test('restart waits for previous async Codex cleanup before taking the slot', async () => {
  const f = fixture(false)
  let unblock!: () => void
  const gate = new Promise<void>(resolve => { unblock = resolve })
  const register = f.service.register.getMockImplementation()!
  f.service.register.mockImplementationOnce(provider => {
    const release = register(provider)
    return async () => { await gate; await release() }
  })
  const first = startSessionTitleLifecycle(f.ctx)
  await first.ready
  const stopped = first.dispose()
  const second = startSessionTitleLifecycle(f.ctx)
  unblock()
  await stopped
  await second.ready
  expect(f.slot()).toBe(SESSION_TITLE_PROVIDER_ID)
  await second.dispose()
  expect(f.slot()).toBe('official')
})

test('identity change while the official fiber drains cancels takeover', async () => {
  const f = fixture(false)
  let unblock!: () => void
  const gate = new Promise<void>(resolve => { unblock = resolve })
  const release = f.entry.fiber!.dispose
  f.entry.fiber!.dispose = vi.fn(async () => { await gate; await release() })
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  f.options.name = 'replacement'
  unblock()
  await lifecycle.ready
  expect(f.service.register).not.toHaveBeenCalled()
  await lifecycle.dispose()
  expect(f.options.disabled).toBe(true)
})

test('a loader without entry enumeration cannot safely take even a vacant slot', async () => {
  const f = fixture(true)
  const host = { ...f.ctx, loader: {} }
  const lifecycle = startSessionTitleLifecycle(host)
  await lifecycle.ready
  expect(f.service.register).not.toHaveBeenCalled()
  await lifecycle.dispose()
})

test('entry update rejection before mutation leaves the official fiber running', async () => {
  const f = fixture(false)
  const release = f.entry.fiber!.dispose
  f.entry.update.mockRejectedValueOnce(Error('rejected before mutation'))
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  await expect(lifecycle.ready).rejects.toThrow('rejected before mutation')
  await lifecycle.dispose()
  expect(release).not.toHaveBeenCalled()
  expect(f.slot()).toBe('official')
})

for (const disabled of [undefined, false, null] as const) {
  test(`restores enabled original ${String(disabled)} using entry.update semantics`, async () => {
    const f = fixture(disabled)
    const lifecycle = startSessionTitleLifecycle(f.ctx)
    await lifecycle.ready
    await lifecycle.dispose()
    expect(f.options.disabled).toBe(disabled ?? undefined)
    expect(f.slot()).toBe('official')
    await lifecycle.dispose()
    expect(f.events.filter(event => event === 'codex:dispose')).toHaveLength(1)
  })
}

test('an originally disabled official entry remains disabled', async () => {
  const f = fixture(true)
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  await lifecycle.ready
  await lifecycle.dispose()
  expect(f.options.disabled).toBe(true)
  expect(f.entry.update).not.toHaveBeenCalled()
  expect(f.service.register).not.toHaveBeenCalled()
})

test('ambiguous official entries are untouched', async () => {
  const f = fixture(false)
  f.entries.push(fixture(false).entry)
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  await lifecycle.ready
  await lifecycle.dispose()
  expect(f.entry.update).not.toHaveBeenCalled()
  expect(f.service.register).not.toHaveBeenCalled()
})

test('registration failure restores the official provider', async () => {
  const f = fixture(false)
  f.service.register.mockImplementationOnce(() => { throw Error('registration failed') })
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  await lifecycle.ready
  expect(f.slot()).toBe('official')
  expect(f.options.disabled).toBe(false)
  await lifecycle.dispose()
  expect(f.events.filter(event => event === 'official:restore')).toHaveLength(1)
})

test('dispose during official draining cancels registration and joins cleanup', async () => {
  const f = fixture(false)
  let unblock!: () => void
  const gate = new Promise<void>(resolve => { unblock = resolve })
  const release = f.entry.fiber!.dispose
  f.entry.fiber!.dispose = vi.fn(async () => { await gate; await release() })
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  const stopped = lifecycle.dispose()
  unblock()
  await stopped
  expect(f.service.register).not.toHaveBeenCalled()
  expect(f.slot()).toBe('official')
  expect(f.options.disabled).toBe(false)
})

for (const change of ['disabled', 'identity', 'removed', 'options'] as const) {
  test(`does not overwrite concurrent ${change} changes at restoration`, async () => {
    const f = fixture(false)
    const lifecycle = startSessionTitleLifecycle(f.ctx)
    await lifecycle.ready
    if (change === 'disabled') f.options.disabled = false
    if (change === 'identity') f.options.name = 'replacement'
    if (change === 'removed') f.entries.length = 0
    if (change === 'options') f.entry.options = { ...f.options }
    await lifecycle.dispose()
    expect(f.entry.update).toHaveBeenCalledTimes(1)
  })
}

