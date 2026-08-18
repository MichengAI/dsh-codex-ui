import { afterEach, expect, test } from 'vitest'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '../src/client/index.ts'

let runtime: SlotTestRuntime | undefined

afterEach(async () => { await runtime?.dispose() })

test('侧栏替换以更低优先级接管工作区树，并保留 footer action 子插槽', async () => {
  runtime = await SlotTestRuntime.create()
  runtime.provide('layout', { toggleSidebar: () => {} })
  runtime.provide('locale', {
    register: () => () => {},
    bind: () => (key: string) => key,
  })
  await runtime.root.declare({
    sidebar: { kind: 'single', scope: 'root', owner: { collapsed: false, width: 280 } },
  }, () => null)

  await runtime.mount({ inject, apply })
  expect(runtime.slots.entries('sidebar')).toHaveLength(1)
  expect(runtime.slots.entries('sidebar.workspaces')).toHaveLength(1)
  expect(runtime.slots.entries('sidebar.footer.action')).toHaveLength(0)

  const disposeFooter = runtime.slots.register({
    name: 'sidebar.footer.action', id: 'compatibility-probe', order: 0,
  }, () => null)
  expect(runtime.slots.entries('sidebar.footer.action')).toHaveLength(1)
  disposeFooter()
})

test('未安装 IM 和定时插件时配套插槽没有注册项', async () => {
  runtime = await SlotTestRuntime.create()
  runtime.provide('layout', { toggleSidebar: () => {} })
  runtime.provide('locale', {
    register: () => () => {},
    bind: () => (key: string) => key,
  })
  await runtime.root.declare({
    sidebar: { kind: 'single', scope: 'root', owner: { collapsed: false, width: 280 } },
  }, () => null)

  await runtime.mount({ inject, apply })
  expect(runtime.slots.entries('sidebar.channels')).toHaveLength(0)
  expect(runtime.slots.entries('sidebar.schedule')).toHaveLength(0)
})
