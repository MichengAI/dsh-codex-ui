import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import { expect, test, vi } from 'vitest'
import { loadClientBundle } from './client-module-loader.ts'

const require = createRequire(import.meta.url)
const React = require('react') as typeof import('react')
type Face = { renderSlot: (key: string, owner?: object, options?: object) => import('react').ReactNode }
async function api() {
  const path = '../src/client/slot-mirror.tsx'
  const module = await import(/* @vite-ignore */ path).catch(() => ({}))
  expect(module.mirrorSlot, 'mirrorSlot must exist').toBeTypeOf('function')
  return module as typeof import('../src/client/slot-mirror.tsx')
}
function resolveGlobalAlphaRenderer(): { pkgPath: string; clientPath: string } | null {
  const customBin = process.env.DCU_DSH_BIN
  if (customBin) {
    try {
      const cliReq = createRequire(customBin)
      const pkgPath = cliReq.resolve('@deepseek-ai/dsh-client-ui-renderer/package.json')
      const clientPath = cliReq.resolve('@deepseek-ai/dsh-client-ui-renderer/lib/client.js')
      if (existsSync(pkgPath) && existsSync(clientPath)) return { pkgPath, clientPath }
    } catch {}
  }
  const defaultGlobalPkg = 'D:/Tools/nodejs/node_global/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-renderer/package.json'
  const defaultGlobalClient = 'D:/Tools/nodejs/node_global/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-renderer/lib/client.js'
  if (existsSync(defaultGlobalPkg) && existsSync(defaultGlobalClient)) {
    return { pkgPath: defaultGlobalPkg, clientPath: defaultGlobalClient }
  }
  return null
}

const globalAlphaPaths = resolveGlobalAlphaRenderer()

function runtime(global = false) {
  let bundle: Record<string, any>
  if (global) {
    if (!globalAlphaPaths) throw new Error('Global alpha renderer is not available in this environment')
    const globalRequire = createRequire(globalAlphaPaths.pkgPath)
    // 使用该发行版的 SlotCore，同时让测试树共用 React/Cordis runtime。
    const alphaRequire = ((id: string) => id === '@deepseek-ai/dsh-client-ui-slots' ? globalRequire(id) : require(id)) as NodeRequire
    window.__ModuleLoader__ = { load: ({ factory }) => { bundle = factory(alphaRequire) } }
    new Function('window', readFileSync(globalAlphaPaths.clientPath, 'utf8'))(window)
  } else bundle = loadClientBundle('@deepseek-ai/dsh-client-ui-renderer/client')
  const ctx = new Context()
  const dispose = ctx.effect(() => {
    bundle!.apply(ctx)
    ctx.slots.installScope('session', { current: { getSnapshot: () => undefined, subscribe: () => () => {} }, bindingSource: () => ({ getSnapshot: () => undefined, subscribe: () => () => {} }), subscribeRelease: () => () => {} } as never)
    return () => {}
  })
  const container = document.createElement('div')
  document.body.append(container)
  return { ctx, container, mount: () => (ctx as any).uiRenderer.mount(container), clean: async () => { container.remove(); dispose() } }
}
const single = { kind: 'single', scope: 'root' } as const

test('real renderer denies undeclared shared children even though the registry contains them', async () => {
  const r = runtime()
  const errors: unknown[] = []
  r.ctx.slots.onEntryError((_key, _entry, error) => errors.push(error))
  r.ctx.slots.register({ name: 'root', children: { shared: single, alias: single } } as never,
    ((p: Face) => p.renderSlot('alias')) as never)
  r.ctx.slots.register({ name: 'shared' } as never, (() => React.createElement('span', null, 'shared content')) as never)
  r.ctx.slots.register({ name: 'alias', children: {} } as never, ((p: Face) => p.renderSlot('shared')) as never)
  const suppressExpected = (event: ErrorEvent) => { if (event.error?.constructor.name === 'SlotOwnershipError') event.preventDefault() }
  window.addEventListener('error', suppressExpected)
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  const unmount = r.mount()
  expect(errors.some(e => (e as Error).constructor.name === 'SlotOwnershipError')).toBe(true)
  expect(r.container.textContent).not.toContain('shared content')
  unmount(); consoleError.mockRestore(); window.removeEventListener('error', suppressExpected); await r.clean()
})

test.each([false, true])('legal nested aliases render through the real renderer (global alpha=%s)', async global => {
  if (global && !globalAlphaPaths) return
  const { mirrorSlot, withSlotAliases } = await api()
  const r = runtime(global)
  const errors: unknown[] = []
  r.ctx.slots.onEntryError((_key, _entry, error) => errors.push(error))
  const Root = withSlotAliases((p: Face) => p.renderSlot('shared'), { shared: 'alias' })
  r.ctx.slots.register({ name: 'root', children: { shared: single, alias: single } } as never, Root as never)
  r.ctx.slots.register({ name: 'shared', children: { 'shared.child': single } } as never,
    ((p: Face) => React.createElement('section', null, p.renderSlot('shared.child'))) as never)
  r.ctx.slots.register({ name: 'shared.child' } as never, (() => React.createElement('span', null, 'nested contribution')) as never)
  const original = r.ctx.slots.entriesOfSlot('shared' as never)[0]
  const stop = mirrorSlot(r.ctx, 'shared', 'alias')
  const unmount = r.mount()
  expect(r.container.textContent).toBe('nested contribution')
  expect(errors).toEqual([])
  expect(r.ctx.slots.entriesOfSlot('shared' as never)[0]).toBe(original)
  stop(); unmount(); await r.clean()
})

 test('rejects mirror-to-mirror cycles before subscribing', async () => {
  const { mirrorSlot } = await api()
  const r = runtime()
  r.ctx.slots.register({ name: 'root', children: { a: single, b: single } } as never, (() => null) as never)
  const stop = mirrorSlot(r.ctx, 'a', 'b')
  expect(() => mirrorSlot(r.ctx, 'b', 'a')).toThrow(/recursive/)
  stop(); await r.clean()
})

test('owning effect unload cancels all mirror subscriptions', async () => {
  const { mirrorSlot } = await api()
  const r = runtime()
  r.ctx.slots.register({ name: 'root', children: { a: single, b: single } } as never, (() => null) as never)
  r.ctx.slots.register({ name: 'a' } as never, (() => null) as never)
  const unload = r.ctx.effect(() => mirrorSlot(r.ctx, 'a', 'b'))
  expect(r.ctx.slots.entriesOfSlot('b' as never)).toHaveLength(1)
  unload()
  expect(r.ctx.slots.entriesOfSlot('b' as never)).toHaveLength(0)
  r.ctx.slots.register({ name: 'a', priority: -1 } as never, (() => null) as never)
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(r.ctx.slots.entriesOfSlot('b' as never)).toHaveLength(0)
  await r.clean()
})

const wave = () => new Promise(resolve => setTimeout(resolve, 0))
test.each(['list', 'keyed'] as const)('dynamic %s winners preserve options, remove contributions and clean nested declarations', async kind => {
  const { mirrorSlot } = await api()
  const r = runtime()
  const spec = { kind, scope: 'root' }
  const removeRoot = r.ctx.slots.register({ name: 'root', children: { a: spec, b: spec } } as never, (() => null) as never)
  const cell = kind === 'list' ? { id: 'cell', order: 7 } : { key: 'cell' }
  const remove = r.ctx.slots.register({ name: 'a', ...cell, children: { 'child/%': single } } as never, (() => null) as never)
  r.ctx.slots.register({ name: 'child/%' } as never, (() => null) as never)
  const stop = mirrorSlot(r.ctx, 'a', 'b')
  expect(r.ctx.slots.entriesOfSlot('b' as never)[0]?.options).toMatchObject(cell)
  expect(r.ctx.slots.spec('b.child%2F%25' as never)).toEqual(single)
  const stable = r.ctx.slots.entriesOfSlot('b' as never)[0]
  r.ctx.slots.register({ name: 'a', ...(kind === 'list' ? { id: 'second' } : { key: 'second' }) } as never, (() => null) as never)
  await wave()
  expect(r.ctx.slots.entriesOfSlot('b' as never)).toHaveLength(2)
  expect(r.ctx.slots.entriesOfSlot('b' as never).find(e => kind === 'list' ? e.options.id === 'cell' : e.options.key === 'cell')).toBe(stable)
  const removeShadow = r.ctx.slots.register({ name: 'a', ...cell, priority: -1 } as never, (() => null) as never)
  await wave()
  expect(r.ctx.slots.entriesOfSlot('b' as never)[0]?.options.priority).toBe(-1)
  expect(r.ctx.slots.spec('b.child%2F%25' as never)).toBeUndefined()
  removeShadow(); await wave()
  expect(r.ctx.slots.spec('b.child%2F%25' as never)).toEqual(single)
  remove(); await wave()
  expect(r.ctx.slots.entriesOfSlot('b' as never)).toHaveLength(1)
  removeRoot(); await wave()
  stop(); stop()
  expect(r.ctx.slots.entriesOfSlot('b' as never)).toHaveLength(0)
  await r.clean()
})

test('real renderer retains locale, inject, shared store actions and component hooks', async () => {
  const { mirrorSlot, withSlotAliases } = await api()
  const r = runtime()
  r.ctx.slots.installLocale({ bind: (ns: string) => (key: string) => `${ns}:${key}`, getSnapshot: () => ({ revision: 0 }), subscribe: () => () => {} } as never)
  const snapshot = { count: 3 }
  const actions = { marker: 'action' }
  const instance = { getSnapshot: () => snapshot, subscribe: () => () => {}, actions }
  const store = { create: () => instance }
  const inject = () => ({ marker: 'injected' })
  let received: any
  const Contribution = (props: any) => {
    const [local] = React.useState('hook')
    received = props
    return React.createElement('span', null, `${props.t('label')}/${props.marker}/${props.useStore((s: any) => s.count)}/${local}`)
  }
  r.ctx.slots.register({ name: 'root', children: { a: single, b: single } } as never, withSlotAliases((p: Face) => p.renderSlot('a'), { a: 'b' }) as never)
  r.ctx.slots.register({ name: 'a', locale: 'demo', inject, store } as never, Contribution as never)
  const stop = mirrorSlot(r.ctx, 'a', 'b')
  const entry = r.ctx.slots.entriesOfSlot('b' as never)[0]!
  expect(entry.locale).toBe('demo'); expect(entry.inject).toBe(inject); expect(entry.store).toBe(store)
  const unmount = r.mount()
  expect(r.container.textContent).toBe('demo:label/injected/3/hook')
  expect(received.actions).toBe(actions)
  expect(withSlotAliases(Contribution, { a: 'b' })).toBe(withSlotAliases(Contribution, { a: 'b' }))
  stop(); unmount(); await r.clean()
})

test('rejects unsupported kinds/scopes, mismatches and child alias collisions transactionally', async () => {
  const { mirrorSlot } = await api()
  const r = runtime()
  r.ctx.slots.register({ name: 'root', children: { a: single, b: single, list: { kind: 'list', scope: 'root' }, chain: { kind: 'chain', scope: 'root' }, session: { kind: 'single', scope: 'session' }, 'b.child': single } } as never, (() => null) as never)
  expect(() => mirrorSlot(r.ctx, 'a', 'chain')).toThrow(/root single/)
  expect(() => mirrorSlot(r.ctx, 'a', 'session')).toThrow(/root single/)
  expect(() => mirrorSlot(r.ctx, 'a', 'list')).toThrow(/kind mismatch/)
  expect(() => mirrorSlot(r.ctx, 'a', 'absent')).toThrow(/must be declared/)
  expect(() => mirrorSlot(r.ctx, 'a', 'a')).toThrow(/recursive/)
  const remove = r.ctx.slots.register({ name: 'a', children: { child: single } } as never, (() => null) as never)
  expect(() => mirrorSlot(r.ctx, 'a', 'b')).toThrow(/already declared/)
  expect(r.ctx.slots.entriesOfSlot('b' as never)).toEqual([])
  expect(r.ctx.slots.spec('child' as never)).toEqual(single)
  remove()
  await r.clean()
})

test('real renderer follows late nested contributions and their unregister without remounting the parent', async () => {
  const { mirrorSlot, withSlotAliases } = await api()
  const r = runtime()
  const mounts = vi.fn()
  const Parent = (p: Face) => {
    React.useEffect(() => { mounts() }, [])
    return React.createElement('main', null, p.renderSlot('child'))
  }
  r.ctx.slots.register({ name: 'root', children: { a: single, b: single } } as never, withSlotAliases((p: Face) => p.renderSlot('a'), { a: 'b' }) as never)
  r.ctx.slots.register({ name: 'a', children: { child: single } } as never, Parent as never)
  const stop = mirrorSlot(r.ctx, 'a', 'b')
  const unmount = r.mount()
  const remove = r.ctx.slots.register({ name: 'child' } as never, (() => React.createElement('span', null, 'late')) as never)
  await vi.waitFor(() => expect(r.container.textContent).toBe('late'))
  expect(mounts).toHaveBeenCalledTimes(1)
  remove()
  await vi.waitFor(() => expect(r.container.textContent).toBe(''))
  expect(mounts).toHaveBeenCalledTimes(1)
  stop(); unmount(); await r.clean()
})

