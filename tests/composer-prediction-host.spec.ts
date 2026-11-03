import { describe, expect, it } from 'vitest'
import {
  normalizeCandidates,
  boundSuggestion,
  buildPrompt,
  extractToolResultText,
} from '../src/composer-prediction.ts'

describe('composer-prediction: 生产候选清洗与规范化', () => {
  it('正确剔除列表符号、序号、引号并剥离前缀', () => {
    const raw = `
1. 请帮我检查代码缺陷
- 运行一下测试
* “查看当前 git 状态”
"hello world"
none
    `
    const candidates = normalizeCandidates(raw, 5, '')
    expect(candidates).toContain('请帮我检查代码缺陷')
    expect(candidates).toContain('运行一下测试')
    expect(candidates).toContain('查看当前 git 状态')
    expect(candidates).toContain('hello world')
    expect(candidates).not.toContain('none')
  })

  it('continue 模式下若模型复述了草稿前缀，准确剥离前缀', () => {
    const draft = '请帮我检查'
    const raw = '请帮我检查 dsh-pua 目录下的代码是否有问题'
    const candidates = normalizeCandidates(raw, 3, draft)
    expect(candidates[0]).toBe(' dsh-pua 目录下的代码是否有问题')
  })

  it('限制候选长度并保留边界', () => {
    const longText = 'a'.repeat(300)
    const bounded = boundSuggestion(longText)
    expect(bounded.length).toBeLessThanOrEqual(240)
  })
})

describe('composer-prediction: 宿主工具结果文本提取', () => {
  it('正确从标准 ToolResultBlock 的 content 数组中提取 text 块文本', () => {
    const toolResultBlock = {
      type: 'tool-result',
      toolCallId: 'call_1',
      content: [
        { type: 'text', text: 'Tests passed: 319' },
        { type: 'image', data: '...' },
      ],
      isError: false,
    }
    expect(extractToolResultText(toolResultBlock)).toBe('Tests passed: 319')
  })

  it('兼容 content 为字符串或对象直接包含 text/result 属性', () => {
    expect(extractToolResultText({ content: 'plain string content' })).toBe('plain string content')
    expect(extractToolResultText({ text: 'text property' })).toBe('text property')
    expect(extractToolResultText({ result: 'result property' })).toBe('result property')
    expect(extractToolResultText(null)).toBe('')
  })
})

describe('composer-prediction: 真实 buildPrompt 上下文组装', () => {
  it('正确将工具调用与工具失败结果（含正文）格式化注入 prompt', () => {
    const mockSession = {
      deriveMessages: () => [
        {
          role: 'user',
          content: [{ type: 'text', text: '请运行测试' }],
        },
        {
          role: 'assistant',
          content: [
            { type: 'tool-call', id: 'call_bash', name: 'bash', arguments: '{"cmd":"pnpm test"}' },
          ],
        },
        {
          role: 'user',
          source: { kind: 'tool' },
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_bash',
              content: [{ type: 'text', text: 'FAILED tests/foo.spec.ts' }],
              isError: true,
            },
          ],
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: '测试失败了，发现 1 个用例报错' }],
        },
      ],
    }

    const prompt = buildPrompt(
      mockSession,
      { maxMessages: 10, maxChars: 8000, maxToolNotes: 5 },
      'continue',
      '现在请帮我',
    )

    expect(prompt).not.toBeNull()
    // 断言工具活动中既包含 failed 状态，又包含提取出的真实失败文本
    expect(prompt).toContain('Recent tool activity (oldest first):')
    expect(prompt).toContain('- bash({"cmd":"pnpm test"}) -> failed result="FAILED tests/foo.spec.ts"')
    expect(prompt).toContain('Draft text ending at the caret:')
    expect(prompt).toContain('"现在请帮我"')
  })

  it('next 模式在末尾是 assistant 时正常组装提示词', () => {
    const mockSession = {
      deriveMessages: () => [
        { role: 'user', content: [{ type: 'text', text: '你好' }] },
        { role: 'assistant', content: [{ type: 'text', text: '你好！有什么可以帮你的？' }] },
      ],
    }

    const prompt = buildPrompt(
      mockSession,
      { maxMessages: 10, maxChars: 8000, maxToolNotes: 5 },
      'next',
      '',
    )

    expect(prompt).not.toBeNull()
    expect(prompt).toContain("Predict the user's next message.")
  })
})
