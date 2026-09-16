import { describe, expect, test } from 'vitest'
import {
  SESSION_TITLE_EMOJI,
  alignThemeToMessage,
  assembleSessionTitle,
  parseTypeAndTheme,
  resolveSessionTitleLocale,
  shouldSkipAutoTitle,
} from '../src/session-title.ts'

describe('parseTypeAndTheme', () => {
  test('接受规范的类型和主题', () => {
    expect(parseTypeAndTheme('优化｜批次文字显示')).toEqual({ type: 'optimize', theme: '批次文字显示' })
  })

  test('去掉引号和首尾空白', () => {
    expect(parseTypeAndTheme('  "修复｜登录失败"  ')).toEqual({ type: 'fix', theme: '登录失败' })
  })

  test('类型不在名单或缺少主题时放弃', () => {
    expect(parseTypeAndTheme('未知｜主题')).toBeUndefined()
    expect(parseTypeAndTheme('优化｜')).toBeUndefined()
    expect(parseTypeAndTheme('优化')).toBeUndefined()
  })

  test('ASCII 竖线和细竖线当成规范分隔符', () => {
    expect(parseTypeAndTheme('优化|批次文字显示')).toEqual({ type: 'optimize', theme: '批次文字显示' })
    expect(parseTypeAndTheme('修复│登录失败')).toEqual({ type: 'fix', theme: '登录失败' })
  })

  test('只取类型和第一段主题，丢掉重复段、日期和模型自带表情', () => {
    expect(parseTypeAndTheme('研究｜核对顶代码｜核对顶代码')).toEqual({ type: 'research', theme: '核对顶代码' })
    expect(parseTypeAndTheme('0909｜研究｜核对顶代码')).toEqual({ type: 'research', theme: '核对顶代码' })
    expect(parseTypeAndTheme('🔬 研究｜核对顶代码')).toEqual({ type: 'research', theme: '核对顶代码' })
    expect(parseTypeAndTheme('🔬｜研究｜核对顶代码')).toEqual({ type: 'research', theme: '核对顶代码' })
  })
})

describe('assembleSessionTitle', () => {
  test('拼出 emoji + 类型｜主题，不写日期', () => {
    expect(assembleSessionTitle('优化', '批次文字显示')).toBe(`${SESSION_TITLE_EMOJI.optimize} 优化｜批次文字显示`)
    expect(assembleSessionTitle('研究', '核对顶代码')).toBe(`${SESSION_TITLE_EMOJI.research} 研究｜核对顶代码`)
  })

  test('英文 locale 使用英文类型标签', () => {
    expect(assembleSessionTitle('Optimize', 'batch text', 'en')).toBe(`${SESSION_TITLE_EMOJI.optimize} Optimize｜batch text`)
    expect(assembleSessionTitle('优化', '批次文字显示', 'en')).toBe(`${SESSION_TITLE_EMOJI.optimize} Optimize｜批次文字显示`)
  })

  test('接受中英文类型名', () => {
    expect(parseTypeAndTheme('Optimize｜batch text')).toEqual({ type: 'optimize', theme: 'batch text' })
    expect(parseTypeAndTheme('Docs｜readme')).toEqual({ type: 'docs', theme: 'readme' })
  })

  test('主题只是复述类型时只保留表情和分类', () => {
    expect(assembleSessionTitle('功能', '功能')).toBe(`${SESSION_TITLE_EMOJI.feature} 功能`)
    expect(assembleSessionTitle('功能', '功能功能')).toBe(`${SESSION_TITLE_EMOJI.feature} 功能`)
    expect(assembleSessionTitle('功能', '功能类型')).toBe(`${SESSION_TITLE_EMOJI.feature} 功能`)
    expect(assembleSessionTitle('Feature', 'Feature type', 'en')).toBe(`${SESSION_TITLE_EMOJI.feature} Feature`)
  })

  test('超过宿主字节上限或类型无效时保留原名', () => {
    expect(assembleSessionTitle('未知', '主题')).toBeUndefined()
    expect(assembleSessionTitle('优化', '这是一段会超过八十字节上限的特别长主题用于验证截断前直接放弃')).toBeUndefined()
  })
})

describe('alignThemeToMessage', () => {
  test('主题语言和用户消息不一致时改用消息原文', () => {
    expect(alignThemeToMessage('Bug修复', 'fix bug')).toBe('fix bug')
    expect(alignThemeToMessage('project review', '评估一下项目')).toBe('评估一下项目')
  })

  test('主题和用户消息语言一致时保留模型主题', () => {
    expect(alignThemeToMessage('login timeout', 'the login request timed out')).toBe('login timeout')
    expect(alignThemeToMessage('登录超时', '登录请求超时了')).toBe('登录超时')
  })
})

describe('resolveSessionTitleLocale', () => {
  test('宿主 settings 的 locale.preference 优先于用户消息语言', () => {
    expect(resolveSessionTitleLocale({ preference: 'en' }, '评估一下项目')).toBe('en')
    expect(resolveSessionTitleLocale({ preference: 'zh-CN' }, 'review the login timeout')).toBe('zh')
  })
})

describe('shouldSkipAutoTitle', () => {
  test('跳过定时、频道、子代理和 fork', () => {
    expect(shouldSkipAutoTitle({ id: 'dsh-automation-session-1' })).toBe(true)
    expect(shouldSkipAutoTitle({ id: 'im:telegram:dm:1:x' })).toBe(true)
    expect(shouldSkipAutoTitle({ id: 'child', origin: 'subagent' })).toBe(true)
    expect(shouldSkipAutoTitle({ id: 'child', header: { parentSession: 'parent' } })).toBe(true)
  })

  test('普通新会话可以自动命名', () => {
    expect(shouldSkipAutoTitle({ id: 'session-1' })).toBe(false)
  })
})
