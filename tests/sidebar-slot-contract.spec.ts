import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { createRequire } from 'node:module'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { expect, it } from 'vitest'

// Execute the real installed sidebar client factory with a real SlotCore. The
// surrounding services are inert: this test concerns declaration ownership.
it('official sidebar root owns its child declarations and releases them on disposal', () => {
  const require = createRequire(import.meta.url)
  const core = new SlotCore()
  core.register({ name: 'root', children: { sidebar: { kind: 'single', scope: 'root' } } } as never, () => null)
  let factory: ((require: NodeRequire) => { apply: (ctx: unknown) => void }) | undefined
  runInNewContext(readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-sidebar/client'), 'utf8'), {
    window: { __ModuleLoader__: { load: (module: { factory: typeof factory }) => { factory = module.factory } } },
  })
  expect(factory).toBeDefined()
  const module = factory!(((id: string) => id === '@deepseek-ai/dsh-client-ui-primitives' ? {} : require(id)) as NodeRequire)
  const registrations: Array<() => void> = []
  const slots = {
    entriesOfSlot: core.entriesOfSlot.bind(core),
    subscribe: core.subscribe.bind(core),
    register: (...args: Parameters<typeof core.register>) => {
      const off = core.register(...args)
      registrations.push(off)
      return off
    },
    inject: (key: string, fn: () => void) => { if (core.specDynamic(key)) fn() },
  }
  module.apply({ slots, get: () => ({}), effect: (fn: () => unknown) => fn(), locale: { register: () => () => {}, subscribe: () => () => {} } })
  const official = core.entriesOfSlot('sidebar')[0]!
  expect(official.children?.['sidebar.workspaces']).toBeDefined()
  expect(official.children?.['sidebar.settings']).toBeDefined()
  expect(() => core.register({ name: 'sidebar', priority: -1, children: official.children } as never, () => null)).toThrow(/already declared/)
  core.register({ name: 'sidebar.workspaces' } as never, () => null)
  expect(core.entriesOfSlot('sidebar.workspaces')).toHaveLength(1)
  registrations[0]!()
  expect(core.specDynamic('sidebar.workspaces')).toBeUndefined()
  expect(core.entriesOfSlot('sidebar.workspaces')).toHaveLength(0)
})
