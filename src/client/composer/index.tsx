import type { Context } from '@deepseek-ai/cordis'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useMemo } from 'react'
import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'
import { NS } from '../locales.ts'
import { currentSessionId } from '../session-host.ts'
import { registerInputHistory } from './InputHistoryDock.tsx'
import { initializeComposerWidth, observeHeroWidthHandles } from './composer-width.ts'
import { observeComposerToolMenus, COMPOSER_TOOL_MENU_STYLE } from './composer-tool-menus.ts'
import { NewConversationSuggestions } from './NewConversationSuggestions.tsx'
import { NEW_CONVERSATION_STYLE } from './new-conversation-style.ts'
import { prefillNewConversation } from './new-conversation-draft.ts'

export const COMPOSER_ENHANCEMENT_STYLE_ID = 'dcu-composer-enhancements-style'

function browserStorage(): Storage | undefined {
  try { return window.localStorage }
  catch { return undefined }
}

/** 探测宿主 codex-ui-composer 子组件是否处于激活状态 */
export async function checkComposerEnabled(): Promise<boolean> {
  try {
    const response = await fetch(CODEX_UI_API_ENDPOINTS.composer, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return false
    const data = await response.json()
    return data?.enabled === true
  } catch {
    return false
  }
}

/** 注入 Composer 相关增强样式（新会话卡片与工具菜单） */
function installComposerStyles(doc: Document = document): () => void {
  const existing = doc.getElementById(COMPOSER_ENHANCEMENT_STYLE_ID)
  if (existing !== null) return () => { existing.remove() }
  const style = doc.createElement('style')
  style.id = COMPOSER_ENHANCEMENT_STYLE_ID
  style.textContent = `\n${NEW_CONVERSATION_STYLE}\n${COMPOSER_TOOL_MENU_STYLE}\n`
  ;(doc.head ?? doc.documentElement).appendChild(style)
  return () => { if (style.parentNode !== null) style.remove() }
}

/**
 * 启动并管理 Composer 输入框四大增强能力：
 * 1. 终端风格输入历史记录与召回 (↑/↓)
 * 2. 输入框宽度初始化与拖拽手柄
 * 3. 工具菜单优化与即时搜索
 * 4. 新建会话建议卡片
 *
 * 当子插件关闭时，所有增强功能彻底注销并恢复 DSH 官方原生输入区。
 */
export function observeComposerEnhancements(ctx: Context): () => void {
  let disposed = false
  let cleanActive: (() => void) | undefined

  const activate = (): (() => void) => {
    const cleaners: (() => void)[] = []
    const t = ctx.locale.bind(NS)

    // 1. 注入增强样式
    cleaners.push(installComposerStyles(document))

    // 2. 初始化最适输入框宽度
    const storage = browserStorage()
    if (storage) initializeComposerWidth(storage)

    // 3. 首页宽度拖拽手柄
    cleaners.push(observeHeroWidthHandles(t('home.resizeInput')))

    // 4. 输入框工具菜单优化与即时搜索
    cleaners.push(observeComposerToolMenus({
      search: t('home.projectSearch'),
      empty: t('home.projectEmpty'),
    }))

    // 5. 终端风格输入历史 (↑/↓)
    // registerInputHistory 内部管理 conversation.input.dock 插槽
    cleaners.push(registerInputHistory(ctx))

    // 6. 新建会话建议卡片 (挂载于 conversation.input.dock 插槽)
    function SuggestionsDock(props: PropsRuntime<'conversation.input.dock'>) {
      const sessionId = props.session.sessionId ?? currentSessionId(ctx.sessions.list.getSnapshot())
      const binding = sessionId ? ctx.sessions.binding(sessionId) : undefined
      const input = binding ? ctx.conversation.input.for(binding.ctx) : undefined
      const draftSource = useMemo(() => ({
        getSnapshot: () => {
          if (!input) return false
          const s = input.state.getSnapshot()
          return (s?.draft?.trim()?.length ?? 0) > 0 || (s?.attachmentIds?.length ?? 0) > 0
        },
        subscribe: (onChange: () => void) => input?.state.subscribe(onChange) ?? (() => {}),
      }), [input])

      return (
        <NewConversationSuggestions
          t={t}
          prefill={(text: string) => prefillNewConversation(input, text)}
          draftSource={draftSource}
        />
      )
    }

    const unregisterSuggestions = ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
      name: 'conversation.input.dock',
      id: 'codex-ui-home-suggestions',
      order: -100,
      locale: NS,
    }, SuggestionsDock))
    cleaners.push(unregisterSuggestions)

    return () => {
      for (const clean of cleaners.reverse()) {
        try { clean() } catch { /* ignore */ }
      }
      // 深度清理 DOM 中残留的建议卡片与手柄，确保彻底回退
      if (typeof document !== 'undefined') {
        document.querySelectorAll('.dcu-home-suggestions').forEach(el => el.remove())
        document.querySelectorAll('[data-dcu-width-handle]').forEach(el => el.remove())
      }
    }
  }

  const sync = async (): Promise<void> => {
    if (disposed) return
    const enabled = await checkComposerEnabled()
    if (disposed) return
    if (enabled) {
      if (!cleanActive) cleanActive = activate()
    } else {
      cleanActive?.()
      cleanActive = undefined
    }
  }

  void sync()

  // 1. 窗口重新获得焦点时同步
  const onFocus = () => { void sync() }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus)
  }

  // 2. 观察设置弹层的打开或关闭，第一时间响应子组件开关切换
  let observer: MutationObserver | undefined
  if (typeof document !== 'undefined') {
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
            if (node instanceof HTMLElement) {
              if (node.getAttribute('data-shortcut-modal') === 'settings' || node.querySelector?.('[data-shortcut-modal="settings"]')) {
                void sync()
                return
              }
            }
          }
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  // 3. 周期性轻量探活 (2.5 秒)，当窗口处于激活可见状态时静默同步状态
  const pollTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void sync()
    }
  }, 2500)

  return () => {
    disposed = true
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onFocus)
    }
    observer?.disconnect()
    clearInterval(pollTimer)
    cleanActive?.()
    cleanActive = undefined
  }
}
