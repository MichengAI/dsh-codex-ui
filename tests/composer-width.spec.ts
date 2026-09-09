import { describe, expect, it } from 'vitest'
import { initializeComposerWidth } from '../src/client/composer-width.ts'

describe('输入区初始宽度', () => {
  for (const initial of [null, '', 'invalid', '-1']) {
    it(`为未设置或无效偏好 ${initial} 初始化最窄宽度`, () => {
      let saved = initial
      initializeComposerWidth({ getItem: () => saved, setItem: (_, value) => { saved = value } })
      expect(saved).toBe('640')
    })
  }
  it('保留用户拖拽后的宽度，重复启动也不重置', () => {
    let saved = '860'
    const storage = { getItem: () => saved, setItem: (_: string, value: string) => { saved = value } }
    initializeComposerWidth(storage)
    initializeComposerWidth(storage)
    expect(saved).toBe('860')
  })
})
