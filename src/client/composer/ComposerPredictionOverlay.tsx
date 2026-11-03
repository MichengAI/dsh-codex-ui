import React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from '../locales.ts'

const ENDPOINT = '/composer-prediction/v2'

const SETTLE_MS = 600
const TYPE_PAUSE_MS = 500
const CONTINUE_MIN_CHARS = 3
const MAX_DRAFT_CHARS = 4_000

const EDITOR_INSET_TOP = 4
const EDITOR_INSET_LEFT = 14
const EDITOR_INSET_RIGHT = 8
const EDITOR_SCROLL_MARGIN = 4
const FALLBACK_LINE_HEIGHT = 24

const NO_GHOST = { mode: 'next', items: [] as string[], index: 0, stream: '', active: false }

const NEXT_GHOST_STYLE: React.CSSProperties = {
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  lineHeight: 'inherit',
  color: 'var(--dsw-alias-label-caption)',
  background: 'var(--dsw-specific-input-major)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 2,
}

const CONTINUE_GHOST_STYLE: React.CSSProperties = {
  ...NEXT_GHOST_STYLE,
  gap: '6px',
  padding: '0 4px',
  borderRadius: '4px',
  zIndex: 3,
}

const TEXT_STYLE: React.CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  opacity: 0.9,
}

const CONTINUE_TEXT_STYLE: React.CSSProperties = {
  ...TEXT_STYLE,
  flex: '0 1 auto',
}

const KEYCAP_STYLE: React.CSSProperties = {
  flex: 'none',
  fontSize: '11px',
  lineHeight: '16px',
  padding: '0 5px',
  borderRadius: '4px',
  border: '1px solid var(--dsw-alias-border-l2)',
  color: 'var(--dsw-alias-label-tertiary)',
  background: 'transparent',
}

const BADGE_STYLE: React.CSSProperties = {
  flex: 'none',
  fontSize: '11px',
  lineHeight: '16px',
  color: 'var(--dsw-alias-label-caption)',
  opacity: 0.8,
}

function composerElementsNear(anchor: HTMLElement | null): { card: HTMLElement; editor: HTMLElement } | null {
  if (typeof document === 'undefined' || !anchor || !anchor.isConnected) return null
  const card = anchor.closest<HTMLElement>('[data-composer-card]')
  if (!card) return null
  const editor = card.querySelector<HTMLElement>('[contenteditable="true"]') || card.querySelector<HTMLElement>('[role="textbox"]')
  if (!editor) return null
  return { card, editor }
}

function readCaret(editor: HTMLElement): { prefix: string; left: number; top: number; height: number } | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!range || !range.collapsed) return null
  if (!editor.contains(range.startContainer)) return null

  const prefixRange = document.createRange()
  prefixRange.selectNodeContents(editor)
  prefixRange.setEnd(range.startContainer, range.startOffset)
  const prefix = prefixRange.toString()

  let rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    const rects = range.getClientRects()
    if (rects.length > 0 && rects[0]) rect = rects[0]
  }
  if ((rect.width === 0 && rect.height === 0) || (rect.top === 0 && rect.left === 0)) {
    const node = range.startContainer
    const offset = range.startOffset
    if (node && node.nodeType === Node.TEXT_NODE && offset > 0) {
      const probe = document.createRange()
      probe.setStart(node, offset - 1)
      probe.setEnd(node, offset)
      const pr = probe.getBoundingClientRect()
      if (pr.width > 0 || pr.height > 0) rect = pr
    }
  }
  if (rect.width === 0 && rect.height === 0) return null
  return { prefix, left: rect.left, top: rect.top, height: rect.height }
}

function caretAtEnd(editor: HTMLElement, draft: string) {
  const caret = readCaret(editor)
  if (!caret) return null
  const draftText = draft.trimEnd().replace(/\s+/gu, ' ').trim()
  const prefix = caret.prefix.trimEnd().replace(/\s+/gu, ' ').trim()
  if (prefix === '') return null
  return draftText === prefix ? caret : null
}

function isTriggerToken(draft: string): boolean {
  return /(?:^|\s)\/[^\s]*$/u.test(draft) || /(?:^|\s)@"?[^\s]*$/u.test(draft)
}

function cleanLine(line: string): string {
  return line
    .replace(/^(?:[-*•]|\d+[.)])\s+/u, '')
    .replace(/^["'`\u201c\u201d]+|["'`\u201c\u201d]+$/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
}

function isCjk(char: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(char)
}

function joinContinuation(draft: string, value: string): string {
  if (draft === '' || value === '') return value
  if (/\s$/u.test(draft)) return value.replace(/^\s+/u, '')
  if (/^\s/u.test(value)) return value
  const last = draft.slice(-1)
  const first = value.slice(0, 1)
  if (isCjk(last) || isCjk(first)) return value
  if (/[([{/\-—"'`]$/u.test(last)) return value
  if (/^[,.;:!?\]}%]/u.test(first)) return value
  return ` ${value}`
}

function parseSseText(text: string): any[] {
  const events: any[] = []
  for (const frame of text.split('\n\n')) {
    for (const line of frame.split('\n')) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        events.push(JSON.parse(payload))
      } catch {}
    }
  }
  return events
}

async function consumeStream(body: ReadableStream<Uint8Array>, signal: AbortSignal, onEvent: (ev: any) => void): Promise<boolean> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let terminal = false

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload) continue
          try {
            const ev = JSON.parse(payload)
            onEvent(ev)
            if (ev.type === 'done' || ev.type === 'error') terminal = true
          } catch {}
        }
      }
    }
  } catch {
    return false
  } finally {
    reader.releaseLock()
  }
  return terminal
}

export function ComposerPredictionOverlay({
  ctx,
  t,
  ...slotProps
}: PropsRuntime<'conversation.input.overlay'> & PropsLocale<typeof NS> & { ctx: Context }) {
  const { sessionId, useInput, useSessionStatus, inputActions } = slotProps as any

  const draft = useInput ? useInput((state: any) => state?.draft || '') : ''
  const running = useSessionStatus ? useSessionStatus((state: any) => state?.get?.(sessionId)?.running === true) : false

  const [ghost, setGhost] = React.useState(NO_GHOST)
  const [box, setBox] = React.useState<any>(null)
  const [compositionEnd, setCompositionEnd] = React.useState(0)

  const anchorRef = React.useRef<HTMLSpanElement>(null)
  const elements = () => composerElementsNear(anchorRef.current)
  const abortRef = React.useRef<AbortController | null>(null)
  const composingRef = React.useRef(false)
  const dismissedRef = React.useRef<{ draft: string } | null>(null)
  const acceptRef = React.useRef<(() => void) | null>(null)
  const cycleRef = React.useRef<((d: number) => void) | null>(null)
  const currentRef = React.useRef('')

  const request = React.useCallback(
    async (mode: 'next' | 'continue', draftText: string) => {
      if (!sessionId || (typeof document !== 'undefined' && document.hidden)) return
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setGhost({ mode, items: [], index: 0, stream: '', active: true })

      const settle = (items: string[]) => {
        if (controller.signal.aborted) return
        setGhost((prev) => {
          if (prev.mode !== mode) return prev
          if (items.length === 0) return NO_GHOST
          return { mode, items, index: 0, stream: '', active: false }
        })
      }

      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({ sessionId, mode, draft: draftText }),
          signal: controller.signal,
        })
        if (!response.ok || controller.signal.aborted) {
          settle([])
          return
        }

        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('text/event-stream')) {
          const payload = await response.json().catch(() => null)
          const items = Array.isArray(payload?.suggestions)
            ? payload.suggestions.filter((i: any) => typeof i === 'string' && i)
            : typeof payload?.suggestion === 'string' && payload.suggestion
              ? [payload.suggestion]
              : []
          settle(items)
          return
        }

        if (response.body === null) {
          const text = await response.text().catch(() => '')
          const done = parseSseText(text).find((e) => e.type === 'done')
          settle(Array.isArray(done?.items) ? done.items.filter((i: any) => typeof i === 'string' && i) : [])
          return
        }

        const terminal = await consumeStream(response.body, controller.signal, (ev) => {
          if (controller.signal.aborted) return
          if (ev.type === 'delta' && typeof ev.text === 'string') {
            setGhost((prev) => (prev.active && prev.mode === mode ? { ...prev, stream: prev.stream + ev.text } : prev))
          } else if (ev.type === 'done') {
            settle(Array.isArray(ev.items) ? ev.items.filter((i: any) => typeof i === 'string' && i) : [])
          } else if (ev.type === 'error') {
            settle([])
          }
        })
        if (!terminal) settle([])
      } catch {
        if (!controller.signal.aborted) settle([])
      }
    },
    [sessionId],
  )

  // 输入法组字
  React.useEffect(() => {
    const onCompStart = () => {
      composingRef.current = true
      abortRef.current?.abort()
      setGhost(NO_GHOST)
      setBox(null)
    }
    const onCompEnd = () => {
      composingRef.current = false
      setCompositionEnd((v) => v + 1)
    }
    document.addEventListener('compositionstart', onCompStart, true)
    document.addEventListener('compositionend', onCompEnd, true)
    return () => {
      document.removeEventListener('compositionstart', onCompStart, true)
      document.removeEventListener('compositionend', onCompEnd, true)
    }
  }, [])

  // 换会话重置
  React.useEffect(() => {
    dismissedRef.current = null
    abortRef.current?.abort()
    setGhost(NO_GHOST)
    setBox(null)
    return () => abortRef.current?.abort()
  }, [sessionId])

  // 打字打断
  React.useEffect(() => {
    abortRef.current?.abort()
    setGhost(NO_GHOST)
    if (dismissedRef.current !== null && dismissedRef.current.draft !== draft) {
      dismissedRef.current = null
    }
  }, [draft])

  // 运行中打断
  React.useEffect(() => {
    if (!running) return
    abortRef.current?.abort()
    setGhost(NO_GHOST)
    dismissedRef.current = null
  }, [running])

  // next 模式：对话结算后且草稿为空
  React.useEffect(() => {
    if (!sessionId || running || draft !== '') return undefined
    if (dismissedRef.current !== null && dismissedRef.current.draft === draft) return undefined
    const timer = setTimeout(() => {
      if (composingRef.current) return
      void request('next', '')
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [sessionId, running, draft, request, compositionEnd])

  // continue 模式：打字停顿且光标在末尾
  React.useEffect(() => {
    if (!sessionId || draft.trim() === '' || draft.length < CONTINUE_MIN_CHARS) return undefined
    if (isTriggerToken(draft)) return undefined
    if (dismissedRef.current !== null && dismissedRef.current.draft === draft) return undefined
    const timer = setTimeout(() => {
      if (composingRef.current) return
      const found = elements()
      if (!found || caretAtEnd(found.editor, draft) === null) return
      void request('continue', draft.slice(-MAX_DRAFT_CHARS))
    }, TYPE_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [sessionId, draft, request, compositionEnd])

  const rawCandidate = ghost.items.length > 0
    ? ghost.items[Math.min(ghost.index, ghost.items.length - 1)] ?? ''
    : cleanLine(ghost.stream)
  const current = ghost.mode === 'continue' ? joinContinuation(draft, rawCandidate) : rawCandidate
  currentRef.current = current
  const hasCandidate = current !== ''

  const visible =
    current !== '' &&
    box !== null &&
    (ghost.mode === 'next' ? draft === '' && !running : draft.trim() !== '' && !isTriggerToken(draft))

  // next 定位
  React.useLayoutEffect(() => {
    if (ghost.mode !== 'next') return undefined
    const measure = () => {
      const found = elements()
      if (!found) {
        setBox(null)
        return
      }
      const cardRect = found.card.getBoundingClientRect()
      const editorRect = found.editor.getBoundingClientRect()
      if (editorRect.width <= 0 || editorRect.height <= 0) {
        setBox(null)
        return
      }
      const computed = window.getComputedStyle(found.editor)
      const lineHeight = Number.parseFloat(computed.lineHeight)
      const paddingTop = Number.parseFloat(computed.paddingTop)
      const paddingLeft = Number.parseFloat(computed.paddingLeft)
      const topInset = Number.isFinite(paddingTop) ? paddingTop : EDITOR_INSET_TOP
      const leftInset = Number.isFinite(paddingLeft) ? paddingLeft : EDITOR_INSET_LEFT
      setBox({
        top: Math.max(0, Math.round(editorRect.top - cardRect.top + topInset)),
        left: Math.max(0, Math.round(editorRect.left - cardRect.left + leftInset)),
        right: Math.max(EDITOR_INSET_RIGHT, Math.round(cardRect.right - editorRect.right + EDITOR_SCROLL_MARGIN)),
        height: Number.isFinite(lineHeight) && lineHeight > 0 ? Math.round(lineHeight) : FALLBACK_LINE_HEIGHT,
      })
    }
    measure()
    const found = elements()
    let observer: ResizeObserver | undefined
    if (found && typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(measure)
      observer.observe(found.card)
      observer.observe(found.editor)
    }
    return () => observer?.disconnect()
  }, [ghost.mode, draft, sessionId, running, hasCandidate])

  // continue 定位
  React.useLayoutEffect(() => {
    if (ghost.mode !== 'continue') return undefined
    let frame = 0
    const measure = () => {
      frame = 0
      const found = elements()
      if (!found) {
        setBox(null)
        return
      }
      const caret = caretAtEnd(found.editor, draft)
      if (!caret) {
        setBox(null)
        return
      }
      const cardRect = found.card.getBoundingClientRect()
      const computed = window.getComputedStyle(found.editor)
      const lineHeight = Number.parseFloat(computed.lineHeight)
      const height = Number.isFinite(caret.height) && caret.height > 0 ? Math.round(caret.height) : (Number.isFinite(lineHeight) && lineHeight > 0 ? Math.round(lineHeight) : FALLBACK_LINE_HEIGHT)
      const left = Math.max(0, caret.left - cardRect.left)
      const maxWidth = cardRect.right - (cardRect.left + left) - 16
      if (maxWidth < 48) {
        setBox(null)
        return
      }
      const top = caret.top - cardRect.top
      if (top < 0 || top > cardRect.height - 8) {
        setBox(null)
        return
      }
      setBox({
        top: Math.round(top),
        left: Math.round(left),
        maxWidth: Math.round(maxWidth),
        height,
      })
    }
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure)
    }
    measure()
    document.addEventListener('selectionchange', schedule)
    document.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    const found = elements()
    let observer: ResizeObserver | undefined
    if (found && typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(schedule)
      observer.observe(found.card)
      observer.observe(found.editor)
    }
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      document.removeEventListener('selectionchange', schedule)
      document.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
    }
  }, [ghost.mode, draft, sessionId, running, hasCandidate])

  const accept = () => {
    const value = currentRef.current
    if (value === '' || ghost.active) return
    const expected = ghost.mode === 'continue' ? draft + value : value
    dismissedRef.current = { draft: expected }
    abortRef.current?.abort()
    setGhost(NO_GHOST)
    setBox(null)
    try {
      if (inputActions && typeof inputActions.insertText === 'function') {
        const capture = typeof inputActions.captureInsertion === 'function' ? inputActions.captureInsertion() : undefined
        if (inputActions.insertText(value, capture) !== true) return
      }
    } catch {
      return
    }
    try {
      const found = elements()
      if (found && !found.card.contains(document.activeElement)) found.editor.focus()
    } catch {}
  }
  acceptRef.current = accept

  const cycle = (delta: number) => {
    setGhost((prev) => {
      if (prev.items.length <= 1) return prev
      const idx = (prev.index + delta + prev.items.length) % prev.items.length
      return { ...prev, index: idx }
    })
  }
  cycleRef.current = cycle

  // 键盘拦截
  React.useEffect(() => {
    if (!visible) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return
      const found = elements()
      if (!found) return
      const inEditor = found.editor.contains(document.activeElement)
      const inCard = found.card.contains(document.activeElement)
      if (!inCard) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dismissedRef.current = { draft }
        abortRef.current?.abort()
        setGhost(NO_GHOST)
        setBox(null)
        return
      }

      if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        if (ghost.items.length <= 1) return
        event.preventDefault()
        event.stopPropagation()
        cycleRef.current?.(event.key === 'ArrowDown' ? 1 : -1)
        return
      }

      if (event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
      if (!inEditor || ghost.active) return
      if (ghost.mode === 'continue' && caretAtEnd(found.editor, draft) === null) return
      event.preventDefault()
      event.stopPropagation()
      acceptRef.current?.()
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [visible, draft, ghost.items.length, ghost.active, ghost.mode])

  const anchor = <span ref={anchorRef} data-composer-prediction-anchor="" aria-hidden="true" style={{ display: 'none' }} />

  if (!visible || box === null) return anchor

  const continuation = ghost.mode === 'continue'
  const style = continuation ? CONTINUE_GHOST_STYLE : NEXT_GHOST_STYLE
  const showKeycap = !ghost.active && (!continuation || (box.maxWidth ?? 0) >= 96)
  const showBadge = ghost.items.length > 1

  return (
    <>
      <div
        style={{ ...style, ...box }}
        aria-hidden="true"
        data-composer-prediction={ghost.mode}
        title={t('input.prediction.dismiss')}
      >
        <span style={continuation ? CONTINUE_TEXT_STYLE : TEXT_STYLE}>{current}</span>
        {showBadge && (
          <span style={BADGE_STYLE} title={t('input.prediction.more')}>
            {ghost.index + 1}/{ghost.items.length}
          </span>
        )}
        {showKeycap && (
          <kbd style={KEYCAP_STYLE} title={t('input.prediction.tab')}>
            Tab
          </kbd>
        )}
      </div>
      {anchor}
    </>
  )
}
