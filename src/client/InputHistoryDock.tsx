import { useEffect, useRef } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { InputHistory } from './input-history.ts'
import { hasDraftAttachments } from './draft-attachments.ts'
import { bindHistoryKeys, findComposer } from './input-history-keyboard.ts'
import { NS } from './locales.ts'

export function InputHistoryHint({ t }: PropsLocale<typeof NS>) {
  // 跟随宿主占位元素的显隐和位置，避免占用工具栏或覆盖实际输入。
  return <style>{`
    [data-composer-card] [data-input-scroll]{container:dcu-composer-input / inline-size}
    [data-composer-card] [data-composer-placeholder]{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
    [data-composer-card] [data-composer-placeholder]::after{
      content:${JSON.stringify(t('input.historyHint'))};
      color:var(--dsw-alias-label-caption);font-size:12px;line-height:18px;
      white-space:nowrap;flex:0 0 auto;margin-right:8px;
    }
    @container dcu-composer-input (max-width:560px){
      [data-composer-card] [data-composer-placeholder]::after{display:none}
    }
    @media(max-width:640px){
      [data-composer-card] [data-composer-placeholder]::after{display:none}
    }
  `}</style>
}

type HistoryDockProps = {
  ctx: Context
  sessionId: SessionId
  history: InputHistory
  seen: WeakMap<object, number>
}

/** 隐形输入扩展：使用宿主状态和编辑动作，不替换编辑器或创建旁问界面。 */
export function InputHistoryDock({ ctx, sessionId, history, seen }: HistoryDockProps) {
  const anchor = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const binding = ctx.sessions.binding(sessionId)
    if (binding === undefined) return
    const scope = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd ?? sessionId
    const input = ctx.conversation.input.for(binding.ctx)
    const menu = ctx.inputTriggers.sessionOf(binding.ctx).menu
    // 挂载只建立版本基线，历史窗口和未挂载期间的输入不回灌；多实例共用版本去重。
    seen.set(binding, binding.eventSource.getSnapshot().revision)
    const collect = () => {
      const snapshot = binding.eventSource.getSnapshot()
      // 完整窗口替换可重设版本基线，兼容宿主重建窗口后计数归零；不回灌窗口内容。
      if (snapshot.change.kind !== 'replace' && snapshot.revision <= (seen.get(binding) ?? -1)) return
      seen.set(binding, snapshot.revision)
      if (snapshot.change.kind !== 'append') return
      for (const entry of snapshot.change.entries) {
        if (entry.event.type !== 'user/message' || entry.event.data.source?.kind !== 'user') continue
        const text = entry.event.data.content.filter(block => block.type === 'text').map(block => block.text).join('')
        history.add(scope, text)
      }
    }
    const offEvents = binding.eventSource.subscribe(collect)
    let previous = input.state.getSnapshot()
    const offInput = input.state.subscribe(() => {
      const next = input.state.getSnapshot()
      // 宿主成功提交命令后才清空草稿并回到 plain；失败保留 claimed 和原文。
      if (previous.phase === 'submitting' && next.phase === 'plain' && next.draft === ''
        && !hasDraftAttachments(previous) && previous.occurrences.length === 0) {
        history.add(scope, previous.draft)
      }
      previous = next
    })
    let editor: HTMLElement | undefined
    let offKeys = () => {}
    const connect = () => {
      const next = anchor.current === null ? undefined : findComposer(anchor.current)
      if (next === editor) return
      offKeys()
      editor = next
      if (editor === undefined) return
      offKeys = bindHistoryKeys(editor, {
        draft: () => input.state.getSnapshot().draft,
        entries: () => history.list(scope),
        setDraft: text => input.setDraft(text),
        blocked: () => {
          const state = input.state.getSnapshot()
          return state.phase === 'adjudicating' || state.phase === 'submitting'
            || hasDraftAttachments(state) || state.occurrences.length > 0 || menu.getSnapshot().open
        },
      })
    }
    connect()
    const parent = anchor.current?.parentElement?.parentElement
    const observer = new MutationObserver(connect)
    if (parent !== null && parent !== undefined) observer.observe(parent, { childList: true, subtree: true })
    return () => { observer.disconnect(); offKeys(); offInput(); offEvents() }
  }, [ctx, sessionId, history, seen])
  return <span ref={anchor} hidden />
}

export function registerInputHistory(ctx: Context): void {
  let storage: Storage | undefined
  try { storage = window.localStorage } catch { console.warn('[michengai-codex-ui] 浏览器存储不可用，使用内存输入历史。') }
  const history = new InputHistory(storage)
  const seen = new WeakMap<object, number>()
  function Dock(props: PropsRuntime<'conversation.input.dock'>) {
    return <InputHistoryDock ctx={ctx} sessionId={props.session.sessionId} history={history} seen={seen} />
  }
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock', id: 'codex-ui-input-history', order: -100,
  }, Dock))
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock', id: 'codex-ui-input-history-hint', order: -100, locale: NS,
  }, InputHistoryHint))
}
