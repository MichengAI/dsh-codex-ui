import { describe, expect, it } from 'vitest'
import { matchLocalPredictionPrefix } from '../src/client/composer/prediction-cache.ts'

describe('composer-prediction-prefix: 本地前缀裁剪算法', () => {
  it('当用户输入与候选完全前缀匹配时，本地直接裁剪并返回剩余文本', () => {
    // 续写模式下，模型返回的候选文本是光标后的待补全增量
    const candidate = '运行测试并检查是否有报错'
    // 用户基于最初的草稿已经多敲了几个字
    const baseDraft = '请帮我'
    const currentDraft = '请帮我运行测试'

    const result = matchLocalPredictionPrefix(candidate, baseDraft, currentDraft)
    expect(result).toBe('并检查是否有报错')
  })

  it('当用户输入的内容与候选不匹配时，返回 null 表明本地前缀失效', () => {
    const candidate = '请帮我运行测试'
    const baseDraft = '请帮我'
    const currentDraft = '请帮我修改代码' // 用户敲了不一样的字

    const result = matchLocalPredictionPrefix(candidate, baseDraft, currentDraft)
    expect(result).toBeNull()
  })

  it('如果用户已经完全敲完了候选的所有字，返回 null', () => {
    const candidate = '运行测试'
    const baseDraft = ''
    const currentDraft = '运行测试'

    const result = matchLocalPredictionPrefix(candidate, baseDraft, currentDraft)
    expect(result).toBeNull()
  })

  it('草稿为空且候选不为空时，匹配出完整候选', () => {
    const candidate = '继续下一步'
    const baseDraft = ''
    const currentDraft = ''

    const result = matchLocalPredictionPrefix(candidate, baseDraft, currentDraft)
    expect(result).toBe('继续下一步')
  })
})
