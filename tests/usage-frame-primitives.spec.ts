import { expect, test } from 'vitest'
import '../src/usage-frame/index.tsx'

test('费用 iframe 把 chevron 同时挂到新旧导出名', () => {
  const loader = (window as Window & {
    __ModuleLoader__?: { load: (handoff: { factory: (require: (id: string) => Record<string, unknown>) => unknown }) => void }
  }).__ModuleLoader__
  expect(loader).toBeDefined()
  let primitives: Record<string, unknown> | undefined
  loader!.load({ factory(require) {
    primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    return { UsageBilling: () => null }
  } })
  expect(primitives?.IconChevronDownOutline14).toBeTypeOf('function')
  expect(primitives?.IconChevronDownOutlineMedium).toBe(primitives?.IconChevronDownOutline14)
})
