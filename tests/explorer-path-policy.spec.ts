import { describe, expect, it } from 'vitest'
import { authorizedExplorerWorkspacePath } from '../src/explorer-path-policy.ts'

describe('Explorer workspace authorization', () => {
  const roots = ['C:\\Users\\Yuji\\Project', 'D:\\Repository\\Demo']

  it('allows only a registered workspace root, ignoring Windows path casing and trailing separators', () => {
    expect(authorizedExplorerWorkspacePath('c:\\users\\yuji\\project\\', roots)).toBe('C:\\Users\\Yuji\\Project')
  })

  it.each([
    'D:\\Repository\\Demo\\child',
    'D:\\Repository\\Other',
    'D:\\',
    '\\\\server\\share',
    'relative\\path',
  ])('rejects an unregistered or unsafe path: %s', path => {
    expect(authorizedExplorerWorkspacePath(path, roots)).toBeUndefined()
  })
})
