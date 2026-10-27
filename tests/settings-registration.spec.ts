import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Context } from '@deepseek-ai/cordis'
import { SlotCore, type PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { expect, test, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({ ConnectionIndicator: () => null }))
const require = createRequire(import.meta.url)

function officialSettings(): { apply: (ctx: Context) => void } {
  let official: { apply: (ctx: Context) => void } | undefined
  const code = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-settings-general/client'), 'utf8')
  new Function('window', code)({ __ModuleLoader__: { load: ({ factory }: { factory: (require: (id: string) => unknown) => typeof official }) => {
    official = factory(id => id === '@deepseek-ai/dsh-client-ui-primitives' ? {} : require(id))
  } } })
  return official!
}

/** 用真实 SlotCore 执行声明约束；仅服务和声明生命周期适配为测试环境。 */
function setup() {
  const slots = new SlotCore()
  const disposers: Array<() => void> = []
  const inject = (key: string, callback: () => () => void) => {
    let active: (() => void) | undefined
    const reconcile = () => { active?.(); active = slots.specDynamic(key) ? callback() : undefined }
    const off = slots.subscribeDeclaration(key, reconcile)
    reconcile()
    const dispose = () => { off(); active?.() }
    disposers.push(dispose)
    return dispose
  }
  const ctx = {
    slots: new Proxy(slots, { get: (target, key) => key === 'inject' ? inject : typeof Reflect.get(target, key) === 'function' ? Reflect.get(target, key).bind(target) : Reflect.get(target, key) }),
    locale: { bind: () => (key: string) => key, register: () => () => {}, getSnapshot: () => ({ revision: 0 }), subscribe: () => () => {} },
    shortcuts: { register: () => () => {} },
    get: () => ({ state: { getSnapshot: () => 'connected', subscribe: () => () => {} } }),
    remote: { $host: { isLoopback: false } },
    inject: () => () => {},
    effect: (callback: () => () => void) => { const off = callback(); disposers.push(off); return off },
  } as unknown as Context
  let officialInstalled = false
  const declare = (withOfficial = true) => {
    const removeRoot = slots.register({ name: 'root', children: { 'sidebar.settings': { kind: 'single', scope: 'root' } } }, (_props: PropsRenderSlots<'sidebar.settings'>) => null)
    if (withOfficial && !officialInstalled) {
      officialInstalled = true
      officialSettings().apply(ctx)
    }
    return removeRoot
  }
  return { slots, ctx, declare, disposers, dispose: () => disposers.reverse().forEach(off => off()) }
}

async function flushSlotWave(): Promise<void> {
  for (let i = 0; i < 4; i += 1) await new Promise(resolve => queueMicrotask(() => resolve(undefined)))
}

test('设置皮肤不得替换官方根组件或分离快捷键持有的 store', async () => {
  const { slots, ctx, declare, dispose } = setup()
  const removeRoot = declare()
  const original = slots.entriesOfSlot('sidebar.settings')[0]!
  await flushSlotWave()
  try {
    expect(slots.entriesOfSlot('sidebar.settings')[0]).toBe(original)
    expect(slots.entries('sidebar.settings')).toHaveLength(1)
  } finally { dispose(); removeRoot() }
})


test('发布补丁不静态停用官方首消息标题 LLM', () => {
  const patch = readFileSync('cordis.patch.yml', 'utf8')
  expect(patch).not.toMatch(/id: session-title-llm\s+disabled: true/)
  expect(patch).not.toMatch(/id: session-title\s*\n\s+disabled: true/)
  const plugin = readFileSync('src/session-title-plugin.ts', 'utf8')
  expect(plugin).toMatch(/export const name = 'codex-ui-session-title'/)
  expect(plugin).toMatch(/export const inject = \['sessionTitle', 'llm', 'loader'\]/)
  expect(plugin).toMatch(/startSessionTitleLifecycle/)
  expect(patch).toMatch(/id: codex-ui-session-title\s+name: '@michengai\/dsh-codex-ui\/session-title'/)
  expect(readFileSync('src/index.ts', 'utf8')).not.toMatch(/registerSessionTitleProvider/)
  expect(readFileSync('src/session-title-provider.ts', 'utf8')).not.toMatch(/titleDiag|DCU_TITLE_LOG|session-title-diag|Reflect\.get/)
  expect(readFileSync('src/session-title-plugin.ts', 'utf8')).toMatch(/ctx\.effect\(\(\) => lifecycle\.dispose/)
})

