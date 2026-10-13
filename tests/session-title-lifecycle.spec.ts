import { expect, test, vi } from 'vitest'
import { apply } from '../src/session-title-plugin.ts'
import { startSessionTitleLifecycle } from '../src/session-title-lifecycle.ts'
import { SESSION_TITLE_PROVIDER_ID } from '../src/session-title-provider.ts'

// 忠实模拟官方 SessionTitleService 类及其原型方法与 registration 状态
class MockSessionTitleService {
  registration?: { provider: { id: string }; closing: boolean }
  events: string[] = []
  register(provider: { id: string }) {
    if (this.registration !== undefined && !this.registration.closing) {
      throw new Error(`session-title provider "${this.registration.provider.id}" is already registered`)
    }
    this.events.push(`register:${provider.id}`)
    const reg = { provider, closing: false }
    this.registration = reg
    return async () => {
      reg.closing = true
      this.events.push(`dispose:${provider.id}`)
      if (this.registration === reg) this.registration = undefined
    }
  }
}

function fixture(disabled?: boolean | null, targetName: string = '@deepseek-ai/dsh-session-title-first-prompt-llm', targetId: string = 'session-title-llm') {
  const service = new MockSessionTitleService()
  if (!disabled) {
    service.registration = { provider: { id: 'official' }, closing: false }
  }
  const release = vi.fn(async () => {
    service.events.push('official:dispose')
    if (service.registration?.provider.id === 'official') {
      service.registration = undefined
    }
  })
  const options = { id: targetId, name: targetName, ...(disabled === undefined ? {} : { disabled }) }
  const entry = {
    options,
    get disabled() { return !!options.disabled },
    fiber: disabled ? undefined : { dispose: release },
    update: vi.fn(async (patch: { disabled: boolean | null }) => {
      if (patch.disabled === null) delete options.disabled
      else options.disabled = patch.disabled
      if (options.disabled) {
        void entry.fiber?.dispose()
        entry.fiber = undefined
      } else {
        service.events.push('official:restore')
        // 官方插件重新挂载时会调用 register
        entry.fiber = { dispose: release }
        service.register({ id: 'official' })
      }
    }),
  }
  const entries = [entry]
  const loader = { entries: () => entries.values(), update: vi.fn(() => { throw Error('disk write forbidden') }) }
  const disposers: (() => unknown)[] = []
  const ctx = {
    loader,
    get: (name: string) => ({ sessionTitle: service, llm: { async *stream() {} } }[name]),
    logger: { warn: vi.fn() },
    effect: (fn: () => () => unknown) => { disposers.push(fn()) }
  }
  return {
    ctx,
    entry,
    options,
    entries,
    events: service.events,
    service,
    loader,
    disposers,
    slot: () => service.registration?.provider.id
  }
}

test('takes the official single slot in memory and restores only after Codex disposal', async () => {
  const f = fixture(false)
  await apply(f.ctx as never)
  expect(f.slot()).toBe(SESSION_TITLE_PROVIDER_ID)
  expect(f.options.disabled).toBe(true)
  await f.disposers[0]!()
  expect(f.slot()).toBe('official')
  expect(f.options.disabled).toBe(false)
  expect(f.events).toEqual(['official:dispose', 'official:dispose', `register:${SESSION_TITLE_PROVIDER_ID}`, `dispose:${SESSION_TITLE_PROVIDER_ID}`, 'official:restore', 'register:official'])
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
  const register = f.service.register.bind(f.service); vi.spyOn(f.service, 'register')
  vi.spyOn(f.service, 'register').mockImplementationOnce(provider => {
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
  expect(f.service.events.filter(e => e === `register:${SESSION_TITLE_PROVIDER_ID}`)).toEqual([])
  await lifecycle.dispose()
  expect(f.options.disabled).toBe(true)
})

test('a loader without entry enumeration cannot safely take even a vacant slot', async () => {
  const f = fixture(true)
  const host = { ...f.ctx, loader: {} }
  const lifecycle = startSessionTitleLifecycle(host)
  await lifecycle.ready
  expect(f.service.events.filter(e => e === `register:${SESSION_TITLE_PROVIDER_ID}`)).toEqual([])
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
    expect(f.events.filter(event => event === `dispose:${SESSION_TITLE_PROVIDER_ID}`)).toHaveLength(1)
  })
}

test('an originally disabled official entry remains disabled', async () => {
  const f = fixture(true)
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  await lifecycle.ready
  await lifecycle.dispose()
  expect(f.options.disabled).toBe(true)
  expect(f.entry.update).not.toHaveBeenCalled()
  expect(f.service.events.filter(e => e === `register:${SESSION_TITLE_PROVIDER_ID}`)).toEqual([])
})

test('ambiguous official entries are untouched', async () => {
  const f = fixture(false)
  f.entries.push(fixture(false).entry)
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  await lifecycle.ready
  await lifecycle.dispose()
  expect(f.entry.update).not.toHaveBeenCalled()
  expect(f.service.events.filter(e => e === `register:${SESSION_TITLE_PROVIDER_ID}`)).toEqual([])
})

test('registration failure restores the official provider', async () => {
  const f = fixture(false)
  vi.spyOn(f.service, 'register').mockImplementationOnce(() => { throw Error('registration failed') })
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
  expect(f.service.events.filter(e => e === `register:${SESSION_TITLE_PROVIDER_ID}`)).toEqual([])
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


test('dispose does not mark foreign registration closing or delete it', async () => {
  const f = fixture(false)
  const foreignReg = { provider: { id: 'foreign-plugin' }, closing: false }
  f.service.registration = foreignReg
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  await lifecycle.dispose()
  expect(f.service.registration).toBe(foreignReg)
  expect(foreignReg.closing).toBe(false)
})

test('restore failure still restores prototype guard in finally block', async () => {
  const f = fixture(false)
  const proto = Object.getPrototypeOf(f.service)
  const originalRegister = proto.register
  const lifecycle = startSessionTitleLifecycle(f.ctx)
  await lifecycle.ready
  f.entry.update.mockRejectedValueOnce(new Error('restore network error'))
  await expect(lifecycle.dispose()).rejects.toThrow('restore network error')
  expect(proto.register).toBe(originalRegister)
})
