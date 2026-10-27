import { describe, expect, test } from 'vitest'
import { en, zh, type CodexUiKey } from '../src/client/locales.ts'
import { installErrorText, userErrorText, UserFacingError } from '../src/client/user-error.ts'

function translator(dictionary: Record<CodexUiKey, string>) {
  return ((key: CodexUiKey) => dictionary[key]) as never
}

describe('用户错误本地化', () => {
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
    const webError = new Error('无法覆盖正在运行的插件文件。请停止当前 DSH Web 后，在终端更新插件，再重新启动 DSH Web。')
    expect(installErrorText(webError, translator(zh))).toBe('无法覆盖正在运行的插件文件。请停止当前 DSH Web 后，在终端更新插件，再重新启动 DSH Web。')
    expect(installErrorText(webError, translator(en))).toBe('Running plugin files cannot be replaced. Stop the current DSH Web host, update the plugin from a terminal, then restart DSH Web.')
    const webFailure = new Error('插件更新失败。请查看 DSH Web 终端输出后重试。')
    expect(installErrorText(webFailure, translator(zh))).toBe('插件更新失败。请查看 DSH Web 终端输出后重试。')
    const webStoreError = new Error('插件目录与 pnpm 仓库不一致。请停止当前 DSH Web 后重试；仍失败时重新安装该 Profile 的依赖。')
    expect(installErrorText(webStoreError, translator(zh))).toBe('插件目录与 pnpm 仓库不一致。请停止当前 DSH Web 后重试；仍失败时重新安装该 Profile 的依赖。')
    expect(installErrorText(webStoreError, translator(en))).toBe("The plugin directory and pnpm store do not match. Stop the current DSH Web host and try again; if it persists, reinstall this Profile's dependencies.")
    expect(installErrorText(new Error('unknown host detail'), translator(en))).toBe('Dependency installation failed. Try again later.')
  })
})
