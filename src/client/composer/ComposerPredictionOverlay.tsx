import { useEffect, useMemo, useRef, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'
import { NS } from '../locales.ts'
import { findComposer } from './input-history-keyboard.ts'
import { isCaretAtDraftEnd, measureCaretRect } from './caret-position.ts'
import { matchLocalPredictionPrefix } from './prediction-cache.ts'

interface PredictionResponse {
  candidates?: string[]
  reason?: string
}

function hasOpenMenu(): boolean {
  if (typeof document === 'undefined') return false
  const menus = document.querySelectorAll('[role="listbox"], [role="menu"]')
  return Array.from(menus).some(el => (el as HTMLElement).offsetParent !== null)
}

export function ComposerPredictionOverlay({
  ctx,
  t,
  ...props
}: PropsRuntime<'conversation.input.overlay'> & PropsLocale<typeof NS> & { ctx: Context }) {
  const anchorRef = useRef<HTMLSpanElement>(null)

  const sessions = (ctx as unknown as { sessions?: { list?: { getSnapshot?: () => unknown }; binding?: (id: string) => { ctx?: unknown } } }).sessions
  const conversation = (ctx as unknown as {
    conversation?: {
      input?: {
        for?: (c: unknown) => {
          state: {
            getSnapshot: () => { draft?: string; phase?: string; occurrences?: unknown[] }
            subscribe: (fn: () => void) => () => void
          }
          setDraft?: (s: string) => void
        }
      }
    }
  }).conversation

  const sessionId = props.sessionId ?? (props as unknown as { session?: { sessionId?: string; id?: string } })?.session?.sessionId
  const binding = sessionId && typeof sessions?.binding === 'function' ? sessions.binding(sessionId) : undefined
  const input = binding?.ctx && typeof conversation?.input?.for === 'function' ? conversation.input.for(binding.ctx) : undefined

  // 状态维护
  const [candidates, setCandidates] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [baseDraft, setBaseDraft] = useState('')
  const [mode, setMode] = useState<'next' | 'continue'>('next')
  const [caretOffset, setCaretOffset] = useState<{ left: number; top: number; height: number } | null>(null)

  const composingRef = useRef(false)
  const dismissedRef = useRef<string>('')
  const abortRef = useRef<AbortController | null>(null)

  // 实时订阅草稿
  const [inputSnapshot, setInputSnapshot] = useState(() => input?.state?.getSnapshot?.())
  useEffect(() => {
    if (!input?.state?.subscribe) return
    return input.state.subscribe(() => {
      setInputSnapshot(input.state.getSnapshot())
    })
  }, [input])

  const draft = inputSnapshot?.draft ?? ''
  const phase = inputSnapshot?.phase ?? 'plain'
  const isInputBusy = phase === 'submitting' || phase === 'adjudicating'

  // 计算当前幽灵文本
  const rawCandidate = candidates[index] ?? ''
  const remainingText = useMemo(() => {
    if (!rawCandidate) return ''
    if (mode === 'next') return rawCandidate
    return matchLocalPredictionPrefix(rawCandidate, baseDraft, draft) ?? ''
  }, [rawCandidate, mode, baseDraft, draft])

  const visible = !isInputBusy && remainingText.length > 0 && draft !== dismissedRef.current

  // 调度预测请求
  useEffect(() => {
    if (!sessionId || isInputBusy) {
      setCandidates([])
      return
    }

    // 1. 如果当前草稿为空，尝试预测下一句
    if (draft.trim() === '') {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const timer = setTimeout(async () => {
        try {
          const res = await fetch(CODEX_UI_API_ENDPOINTS.composerPrediction, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId, mode: 'next', draft: '' }),
            signal: controller.signal,
          })
          if (!res.ok) return
          const data: PredictionResponse = await res.json()
          if (!controller.signal.aborted && Array.isArray(data.candidates) && data.candidates.length > 0) {
            setCandidates(data.candidates)
            setIndex(0)
            setBaseDraft('')
            setMode('next')
          }
        } catch {
          // 忽略中断
        }
      }, 400)

      return () => {
        clearTimeout(timer)
        controller.abort()
      }
    }

    // 2. 如果当前有打字且本地前缀完全命中，复用本地缓存
    if (rawCandidate && matchLocalPredictionPrefix(rawCandidate, baseDraft, draft) !== null) {
      return
    }

    // 3. 用户打字且未命中本地前缀：打字停顿防抖请求续写
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(async () => {
      const editor = anchorRef.current ? findComposer(anchorRef.current) : undefined
      if (!editor || !isCaretAtDraftEnd(editor, draft)) return

      try {
        const res = await fetch(CODEX_UI_API_ENDPOINTS.composerPrediction, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId, mode: 'continue', draft }),
          signal: controller.signal,
        })
        if (!res.ok) return
        const data: PredictionResponse = await res.json()
        if (!controller.signal.aborted && Array.isArray(data.candidates) && data.candidates.length > 0) {
          setCandidates(data.candidates)
          setIndex(0)
          setBaseDraft(draft)
          setMode('continue')
          const rect = measureCaretRect(editor)
          if (rect) setCaretOffset(rect)
        }
      } catch {
        // 忽略中断
      }
    }, 450)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [sessionId, draft, isInputBusy])

  // 监听键盘按键交互
  useEffect(() => {
    const editor = anchorRef.current ? findComposer(anchorRef.current) : undefined
    if (!editor) return

    const onCompStart = () => { composingRef.current = true }
    const onCompEnd = () => { composingRef.current = false }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || composingRef.current || e.isComposing || e.keyCode === 229) return
      if (hasOpenMenu()) return

      // Esc: 忽略本次建议
      if (e.key === 'Escape' && visible) {
        e.preventDefault()
        e.stopPropagation()
        dismissedRef.current = draft
        setCandidates([])
        return
      }

      // Alt+↓ / Alt+↑: 轮换候选
      if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && visible && candidates.length > 1) {
        e.preventDefault()
        e.stopPropagation()
        const delta = e.key === 'ArrowDown' ? 1 : -1
        setIndex(prev => (prev + delta + candidates.length) % candidates.length)
        return
      }

      // Tab: 采纳建议
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && visible) {
        e.preventDefault()
        e.stopPropagation()

        const finalDraft = mode === 'next' ? remainingText : draft + remainingText
        dismissedRef.current = finalDraft
        setCandidates([])
        input?.setDraft?.(finalDraft)
      }
    }

    editor.addEventListener('compositionstart', onCompStart)
    editor.addEventListener('compositionend', onCompEnd)
    editor.addEventListener('keydown', onKeyDown, true)

    return () => {
      editor.removeEventListener('compositionstart', onCompStart)
      editor.removeEventListener('compositionend', onCompEnd)
      editor.removeEventListener('keydown', onKeyDown, true)
    }
  }, [visible, candidates.length, remainingText, draft, mode, input])

  return (
    <>
      <span ref={anchorRef} hidden data-codex-ui-prediction-anchor />
      {visible && (
        <div
          data-codex-ui-prediction-ghost=""
          title={t('input.prediction.dismiss')}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 10,
            color: 'var(--dsw-alias-label-caption, rgba(140, 140, 140, 0.7))',
            fontSize: '13px',
            lineHeight: '20px',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            top: mode === 'continue' && caretOffset ? `${caretOffset.top}px` : '8px',
            left: mode === 'continue' && caretOffset ? `${caretOffset.left}px` : '14px',
            maxWidth: 'calc(100% - 32px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{remainingText}</span>
          <kbd
            title={t('input.prediction.tab')}
            style={{
              padding: '1px 5px',
              border: '1px solid currentColor',
              borderRadius: '4px',
              fontSize: '10px',
              lineHeight: '14px',
              opacity: 0.8,
              fontFamily: 'inherit',
            }}
          >
            Tab
          </kbd>
          {candidates.length > 1 && (
            <span title={t('input.prediction.more')} style={{ fontSize: '11px', opacity: 0.6 }}>
              {index + 1}/{candidates.length} Alt+↓
            </span>
          )}
        </div>
      )}
    </>
  )
}
