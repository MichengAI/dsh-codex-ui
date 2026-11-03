import { describe, expect, it } from 'vitest'
import {
  cleanPredictionCandidate,
  formatContinuation,
  isCjkCharacter,
  buildPredictionPrompt,
  PredictionCache,
} from '../src/composer-prediction.ts'

describe('composer-prediction: 文本清洗与格式化', () => {
  it('正确剔除各种格式前缀（序号、列表符号、引号）', () => {
    expect(cleanPredictionCandidate('1. 请帮我检查代码缺陷')).toBe('请帮我检查代码缺陷')
    expect(cleanPredictionCandidate('- 运行一下测试')).toBe('运行一下测试')
    expect(cleanPredictionCandidate('* “查看当前 git 状态”')).toBe('查看当前 git 状态')
    expect(cleanPredictionCandidate('"hello world"')).toBe('hello world')
    expect(cleanPredictionCandidate('   ')).toBe('')
    expect(cleanPredictionCandidate('NONE')).toBe('')
    expect(cleanPredictionCandidate('none')).toBe('')
  })

  it('正确识别 CJK 字符', () => {
    expect(isCjkCharacter('中')).toBe(true)
    expect(isCjkCharacter('あ')).toBe(true)
    expect(isCjkCharacter('한')).toBe(true)
    expect(isCjkCharacter('a')).toBe(false)
    expect(isCjkCharacter('1')).toBe(false)
    expect(isCjkCharacter(' ')).toBe(false)
  })

  it('中文续写绝不添加多余空格', () => {
    const draft = '我想在这个项目里'
    const continuation = '增加一个输入预测插件'
    expect(formatContinuation(draft, continuation)).toBe('增加一个输入预测插件')
  })

  it('英文续写在单词间自动补充空格，标点前不加空格', () => {
    expect(formatContinuation('please run', 'tests now')).toBe(' tests now')
    expect(formatContinuation('please run ', 'tests now')).toBe('tests now')
    expect(formatContinuation('is this done', '?')).toBe('?')
  })
})

describe('composer-prediction: 缓存机制', () => {
  it('相同会话、版本和模式能命中缓存', () => {
    const cache = new PredictionCache(50)
    cache.set('session-1', 5, 'next', '', ['继续下一步', '运行测试'])
    
    expect(cache.get('session-1', 5, 'next', '')).toEqual(['继续下一步', '运行测试'])
    // 版本更新失效
    expect(cache.get('session-1', 6, 'next', '')).toBeUndefined()
    // 模式不同失效
    expect(cache.get('session-1', 5, 'continue', '')).toBeUndefined()
  })

  it('continue 模式下根据草稿精确定位缓存', () => {
    const cache = new PredictionCache(50)
    cache.set('session-1', 5, 'continue', 'git sta', ['tus'])
    
    expect(cache.get('session-1', 5, 'continue', 'git sta')).toEqual(['tus'])
    expect(cache.get('session-1', 5, 'continue', 'git diff')).toBeUndefined()
  })
})

describe('composer-prediction: 提示词生成', () => {
  it('正确为 next 模式生成系统与上下文 Prompt', () => {
    const messages = [
      { role: 'user', content: '请帮我写一个测试' },
      { role: 'assistant', content: '测试已写好，在 tests/a.test.ts' },
    ]
    const prompt = buildPredictionPrompt({
      mode: 'next',
      messages,
      draft: '',
      maxSuggestions: 3,
    })

    expect(prompt.system).toContain('Predict the next messages the USER is most likely to send')
    expect(prompt.user).toContain('tests/a.test.ts')
  })

  it('正确为 continue 模式生成续写 Prompt 并包含草稿', () => {
    const messages = [
      { role: 'user', content: '请帮我写一个测试' },
      { role: 'assistant', content: '测试已写好，在 tests/a.test.ts' },
    ]
    const prompt = buildPredictionPrompt({
      mode: 'continue',
      messages,
      draft: '现在请帮我',
      maxSuggestions: 2,
    })

    expect(prompt.system).toContain('You complete the message a USER is drafting')
    expect(prompt.user).toContain('现在请帮我')
  })
})
