import { describe, expect, test } from 'vitest'
import { en, zh, type CodexUiKey } from '../src/client/locales.ts'
import { HostActionError, installErrorText, userErrorText, UserFacingError } from '../src/client/user-error.ts'
import { WorkspaceGroupError } from '../src/workspace-groups.ts'

function translator(dictionary: Record<CodexUiKey, string>) {
  return ((key: CodexUiKey) => dictionary[key]) as never
}

describe('用户错误本地化', () => {
  test('按稳定错误码映射分组错误，不依赖诊断文案', () => {
    const error = new WorkspaceGroupError('group-missing', '诊断文案已经变化')
    expect(userErrorText(error, translator(zh))).toBe('目标分组不存在。')
    expect(userErrorText(error, translator(en))).toBe('The target group no longer exists.')
  })

  test('按 Host 业务错误码和操作类型提供明确提示', () => {
    const titleInvalid = {
      code: 'session/title-invalid',
      details: { sessionId: 'session-1' },
      isDSHRemoteError: true,
      message: '底层诊断 D:\\secret',
    }
    const forkUnavailable = {
      code: 'session/fork-unavailable',
      details: { sessionId: 'session-1' },
      isDSHRemoteError: true,
      message: 'open turn',
    }
    expect(userErrorText(new HostActionError('rename', titleInvalid), translator(zh))).toBe('会话名称无效，请修改后重试。')
    expect(userErrorText(new HostActionError('fork', { rpcError: forkUnavailable }), translator(en))).toBe('This conversation cannot be continued in a new conversation right now. Try again after the current turn finishes.')
    expect(userErrorText(new HostActionError('delete', {
      code: 'gateway/internal',
      details: {},
      isDSHRemoteError: true,
      message: 'unknown session "session-1" (UNKNOWN_SESSION)',
    }), translator(zh))).toBe('找不到该会话。')
  })

  test('Host 未知错误只显示操作级提示且不泄露诊断信息', () => {
    expect(userErrorText(new HostActionError('archive', new Error('包含本地路径 D:\\secret')), translator(zh))).toBe('暂时无法归档该会话，请稍后重试。')
    expect(userErrorText(new HostActionError('delete', new Error('host exploded')), translator(en))).toBe('The conversation could not be deleted. Try again later.')
  })

  test('循环嵌套的远程错误安全回退为操作级提示', () => {
    const first: { rpcError?: unknown } = {}
    const second: { rpcError?: unknown } = { rpcError: first }
    first.rpcError = second
    expect(userErrorText(new HostActionError('archive', first), translator(zh))).toBe('暂时无法归档该会话，请稍后重试。')
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
