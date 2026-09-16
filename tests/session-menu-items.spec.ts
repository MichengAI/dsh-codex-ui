import { expect, test } from 'vitest'
import { sessionMenuItems } from '../src/client/session-tree.tsx'

const t = ((key: string) => key) as Parameters<typeof sessionMenuItems>[0]

function ids(items: ReturnType<typeof sessionMenuItems>): string[] {
  return items.map(item => item.id)
}

test('允许删除时菜单底部包含删除会话', () => {
  expect(ids(sessionMenuItems(t, { unread: false, canDelete: true }))).toContain('delete')
})

test('未安装归档删除能力时不出现删除会话和删除分隔线', () => {
  const items = sessionMenuItems(t, { unread: false, canDelete: false })
  expect(ids(items)).not.toContain('delete')
  expect(ids(items)).not.toContain('delete-separator')
})
