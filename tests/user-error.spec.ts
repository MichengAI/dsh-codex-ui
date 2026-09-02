import { describe, expect, test } from 'vitest'
import { en, zh, type CodexUiKey } from '../src/client/locales.ts'
import { installErrorText, userErrorText, UserFacingError } from '../src/client/user-error.ts'

function translator(dictionary: Record<CodexUiKey, string>) {
  return ((key: CodexUiKey) => dictionary[key]) as never
}

describe('用户错误本地化', () => {
  test('将已知分组错误映射到当前语言', () => {
    expect(userErrorText(new Error('目标分组不存在。'), translator(zh))).toBe('目标分组不存在。')
    expect(userErrorText(new Error('目标分组不存在。'), translator(en))).toBe('The target group no longer exists.')
  })

  test('未知底层错误不直接进入界面', () => {
    expect(userErrorText(new Error('包含本地路径 D:\\secret 的底层错误'), translator(zh))).toBe('操作未完成，请重试。')
    expect(userErrorText(new Error('host exploded'), translator(en))).toBe('The action could not be completed. Try again.')
  })

  test('保留已经本地化的明确业务提示', () => {
    expect(userErrorText(new UserFacingError('The new conversation is not ready yet.'), translator(en))).toBe('The new conversation is not ready yet.')
  })

  test('安装错误保留可操作分类并跟随语言', () => {
    const error = new Error('无法覆盖正在运行的插件文件。请先完全退出桌面端，再重新打开后更新。')
    expect(installErrorText(error, translator(zh))).toBe('请先完全退出 DSH Desktop，再重新打开后更新。')
    expect(installErrorText(error, translator(en))).toBe('Quit DSH Desktop completely, reopen it, and try the update again.')
    expect(installErrorText(new Error('unknown host detail'), translator(en))).toBe('Dependency installation failed. Try again later.')
  })
})
