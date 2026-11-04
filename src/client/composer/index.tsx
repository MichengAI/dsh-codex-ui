import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useMemo, useSyncExternalStore } from 'react'
import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'
import { NS } from '../locales.ts'
import { registerInputHistory } from './InputHistoryDock.tsx'

function currentSessionId(state?: { current?: string; byId?: Record<string, { id?: string; retainedBy?: { mainView?: number } }> }): string | undefined {
  if (!state) return undefined
  if (typeof state.current === 'string' && state.current !== '') return state.current
  const byId = state.byId ?? {}
  for (const [id, row] of Object.entries(byId)) {
    if (row && (row.retainedBy?.mainView ?? 0) > 0) return row.id?.trim() || id
  }
  return undefined
}
import { initializeComposerWidth, observeHeroWidthHandles } from './composer-width.ts'
import { NewConversationSuggestions } from './NewConversationSuggestions.tsx'
import { ComposerPredictionOverlay } from './ComposerPredictionOverlay.tsx'
import {
  getPredictionSettingsState,
  observePredictionSettings,
  setHostPredictionAllowed,
  subscribePredictionSettings,
} from './prediction-state.ts'
import { NEW_CONVERSATION_STYLE } from './new-conversation-style.ts'
import { prefillNewConversation } from './new-conversation-draft.ts'

export const COMPOSER_ENHANCEMENT_STYLE_ID = 'dcu-composer-enhancements-style'

function browserStorage(): Storage | undefined {
  try { return window.localStorage }
  catch { return undefined }
}

/** 探测宿主 codex-ui-composer 子组件是否处于激活状态（遵循 fail-closed 契约） */
export async function checkComposerEnabled(): Promise<boolean> {
  const status = await fetchComposerStatus()
  return status.enabled
}

/**
 * 读取 Host 状态：子插件是否启用，以及站点级是否允许预测。
 * 网络/解析失败一律返回“全部关闭”，避免在宿主不可达时仍然悄悄花 token。
 */
export async function fetchComposerStatus(): Promise<{ enabled: boolean; prediction: boolean }> {
  try {
    const response = await fetch(CODEX_UI_API_ENDPOINTS.composer, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return { enabled: false, prediction: false }
    const data = await response.json()
    const enabled = data?.enabled === true
    // 旧版 Host 不返回 prediction 字段：此时按允许处理，不因升级不同步而丢掉用户已有的能力
    return { enabled, prediction: enabled && data?.prediction !== false }
  } catch {
    return { enabled: false, prediction: false }
  }
}

/** 注入 Composer 相关增强样式（新会话建议卡片） */
function installComposerStyles(doc: Document = document): () => void {
  const existing = doc.getElementById(COMPOSER_ENHANCEMENT_STYLE_ID)
  if (existing !== null) return () => { existing.remove() }
  const style = doc.createElement('style')
  style.id = COMPOSER_ENHANCEMENT_STYLE_ID
  style.textContent = `\n${NEW_CONVERSATION_STYLE}\n`
  ;(doc.head ?? doc.documentElement).appendChild(style)
  return () => { if (style.parentNode !== null) style.remove() }
}

/**
 * 启动并管理 Composer 输入框核心增强能力：
 * 1. 终端风格输入历史记录与召回 (↑/↓)
 * 2. 输入框宽度初始化与拖拽手柄
 * 3. 新建会话建议卡片
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

    // 4. 终端风格输入历史 (↑/↓)
    // registerInputHistory 内部管理 conversation.input.dock 插槽
    cleaners.push(registerInputHistory(ctx))

    // 5. 新建会话建议卡片 (挂载于 conversation.input.dock 插槽)
    function SuggestionsDock(props: PropsRuntime<'conversation.input.dock'>) {
      const rawSession = props?.session as { sessionId?: string; id?: string } | undefined
      const sessions = (ctx as unknown as { sessions?: { list?: { getSnapshot?: () => unknown }; binding?: (id: string) => { ctx?: unknown } } }).sessions
      const conversation = (ctx as unknown as { conversation?: { input?: { for?: (c: unknown) => { state: { getSnapshot: () => { draft?: string; attachmentIds?: unknown[] }; subscribe: (fn: () => void) => () => void }; setDraft?: (s: string) => void } } } }).conversation
      const sessionId = rawSession?.sessionId ?? rawSession?.id ?? currentSessionId(sessions?.list?.getSnapshot?.() as Parameters<typeof currentSessionId>[0])
      const binding = sessionId && typeof sessions?.binding === 'function' ? sessions.binding(sessionId) : undefined
      const input = binding?.ctx && typeof conversation?.input?.for === 'function' ? conversation.input.for(binding.ctx) : undefined
      const draftSource = useMemo(() => ({
        getSnapshot: () => {
          if (!input) return false
          const s = input.state?.getSnapshot?.()
          return (s?.draft?.trim()?.length ?? 0) > 0 || (s?.attachmentIds?.length ?? 0) > 0
        },
        subscribe: (onChange: () => void) => input?.state?.subscribe?.(onChange) ?? (() => {}),
      }), [input])

      return (
        <NewConversationSuggestions
          t={t}
          prefill={(text: string) => prefillNewConversation(input as unknown as Parameters<typeof prefillNewConversation>[0], text)}
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

    // 6. 智能输入预测与行内续写 (挂载于 conversation.input.overlay 插槽)
    // `enabled` 由设置页开关与 Host 站点级配置共同决定；关闭时 overlay 自身中止请求并清空 ghost，
    // 这里保留插槽注册以避免反复装卸 React 子树造成输入框抖动。
    function PredictionSlot(props: PropsRuntime<'conversation.input.overlay'>) {
      const prediction = useSyncExternalStore(subscribePredictionSettings, getPredictionSettingsState, getPredictionSettingsState)
      return <ComposerPredictionOverlay {...props} enabled={prediction.enabled} ctx={ctx} t={t} />
    }
    const unregisterPrediction = ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
      name: 'conversation.input.overlay',
      id: 'codex-ui-composer-prediction',
      order: 50,
      locale: NS,
    }, PredictionSlot))
    cleaners.push(unregisterPrediction)
    cleaners.push(observePredictionSettings())

    return () => {
      for (const clean of cleaners.reverse()) {
        try { clean() } catch { /* ignore */ }
      }
      // 深度清理 DOM 中自建的原生手柄，确保彻底回退
      // 注意：.dcu-home-suggestions 是 React Portal 挂载的节点，其生命周期由 React 完全托管。
      // unregisterSuggestions() 会触发 React 卸载 portal，严禁在此手动 el.remove()，
      // 否则会导致 React 在提交卸载阶段因 parentNode 为空而抛出 NotFoundError (Issue #74)。
      if (typeof document !== 'undefined') {
        document.querySelectorAll('[data-dcu-width-handle]').forEach(el => el.remove())
      }
    }
  }

  const sync = async (): Promise<void> => {
    if (disposed) return
    const status = await fetchComposerStatus()
    if (disposed) return
    // 站点级配置先行落地：用户开关只能在其为真时生效
    setHostPredictionAllowed(status.prediction)
    if (status.enabled) {
      if (!cleanActive) cleanActive = activate()
    } else {
      cleanActive?.()
      cleanActive = undefined
    }
  }

  // 首帧立即同步激活，确保输入框美化样式与能力零延迟常驻，不出现未美化闪烁
  cleanActive = activate()
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

  // 3. 周期性轻量探活 (15 秒)，当窗口处于激活可见状态时静默同步状态
  const pollTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void sync()
    }
  }, 15000)

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
