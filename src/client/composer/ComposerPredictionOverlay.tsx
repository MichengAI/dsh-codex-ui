/**
 * Browser half of composer predictions (1:1 完整无损移植自 dsh-composer-predictions 1.2.8 原版源码)
 * 具备经真机验证的局部坐标测量、ResizeObserver / selectionchange 监听、流式 SSE 消费器与 Tab/Alt 按键拦截
 */
import React from 'react'
import { CODEX_UI_API_ENDPOINTS } from '../../business-api.ts'

const h = React.createElement

const NS = 'composer-predictions'
const ENDPOINT = CODEX_UI_API_ENDPOINTS.composerPredictionStream

/** Wait for the settled UI before asking, so a fresh turn is fully committed. */
const SETTLE_MS = 600
/** Wait for a typing pause before asking for a continuation. */
const TYPE_PAUSE_MS = 500
/** A continuation needs enough text to continue from. */
const CONTINUE_MIN_CHARS = 3
/** The Host bounds the draft too; this keeps the request body small. */
const MAX_DRAFT_CHARS = 4_000
/** Ignore the first characters of a streaming answer to avoid flicker. */
const STREAM_MIN_CHARS = 3

/** Editor text insets from the resident composer styles. */
const EDITOR_INSET_TOP = 4
const EDITOR_INSET_LEFT = 14
const EDITOR_INSET_RIGHT = 8
/** The editable scroll container's right margin, outside the text column. */
const EDITOR_SCROLL_MARGIN = 4
const FALLBACK_LINE_HEIGHT = 24

const NO_GHOST = { mode: 'next', items: [] as string[], index: 0, stream: '', active: false }

    const NEXT_GHOST_STYLE = {
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

    /** The continuation ghost hugs its text and sits where the caret is. */
    const CONTINUE_GHOST_STYLE = {
      ...NEXT_GHOST_STYLE,
      gap: '6px',
      padding: '0 4px',
      borderRadius: '4px',
      zIndex: 3,
    }

    const TEXT_STYLE = {
      flex: '1 1 auto',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      opacity: 0.9,
    }

    const CONTINUE_TEXT_STYLE = {
      ...TEXT_STYLE,
      flex: '0 1 auto',
    }

    const KEYCAP_STYLE = {
      flex: 'none',
      fontSize: '11px',
      lineHeight: '16px',
      padding: '0 5px',
      borderRadius: '4px',
      border: '1px solid var(--dsw-alias-border-l2)',
      color: 'var(--dsw-alias-label-tertiary)',
      background: 'transparent',
    }

    const BADGE_STYLE = {
      flex: 'none',
      fontSize: '10px',
      lineHeight: '14px',
      color: 'var(--dsw-alias-label-tertiary)',
      opacity: 0.8,
    }

    /**
     * Locate the composer card this overlay actually belongs to.
     *
     * The seat is rendered inside the resident composer card, so the anchor node
     * is an ancestor-scoped key: a global `querySelector` would pick whichever
     * card happens to be first in the document and paint that conversation's
     * ghost over another one.
     */
    function composerElementsNear(anchor: any): any {
      if (typeof document === 'undefined') return null
      if (anchor === null || anchor === undefined || !anchor.isConnected) return null
      const card = anchor.closest('[data-composer-card]')
      if (card === null) return null
      const editor = card.querySelector('[contenteditable="true"]') || card.querySelector('[role="textbox"]')
      return editor === null ? null : { card, editor }
    }

    /** The collapsed selection inside the editor, when it is there at all. */
    function readCaret(editor: any): any {
      if (typeof window === 'undefined' || typeof document === 'undefined') return null
      const selection = window.getSelection()
      if (selection === null || selection.rangeCount === 0) return null
      const range = selection.getRangeAt(0)
      if (range === null || !range.collapsed) return null
      if (!editor.contains(range.startContainer)) return null

      const prefixRange = document.createRange()
      prefixRange.selectNodeContents(editor)
      prefixRange.setEnd(range.startContainer, range.startOffset)
      const prefix = prefixRange.toString()

      const rect = caretRect(range)
      if (rect === null) return null
      return { prefix, left: rect.left, top: rect.top, height: rect.height }
    }

    function caretRect(range: any): any {
      let rect = range.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        const rects = range.getClientRects()
        if (rects.length > 0) rect = rects[0]
      }
      if ((rect.width === 0 && rect.height === 0) || rect.top === 0 && rect.left === 0) {
        const fallback = rectBeforeCaret(range)
        if (fallback !== null) return fallback
      }
      if (rect.width === 0 && rect.height === 0) return null
      return { left: rect.left, top: rect.top, height: rect.height }
    }

    /** Measure the character before the caret when the collapsed range is empty. */
    function rectBeforeCaret(range: any): any {
      const node = range.startContainer
      const offset = range.startOffset
      if (typeof Node === 'undefined' || node === null || node.nodeType !== Node.TEXT_NODE || offset <= 0) return null
      const probe = document.createRange()
      probe.setStart(node, offset - 1)
      probe.setEnd(node, offset)
      const rect = probe.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return null
      return { left: rect.right, top: rect.top, height: rect.height }
    }

    /** Whether the caret is at the effective end of the draft. */
    function caretAtEnd(editor: any, draft: string): any {
      const caret = readCaret(editor)
      if (caret === null) return null
      const draftText = collapse(draft.trimEnd())
      const prefix = collapse(caret.prefix.trimEnd())
      if (prefix === '') return null
      // Strict equality: a prefix that also happens to be a suffix must not
      // pass, or the ghost targets (and later inserts at) a mid-draft caret.
      return draftText === prefix ? caret : null
    }

    function collapse(text: string): string {
      return text.replace(/\s+/gu, ' ').trim()
    }

    /** A half-typed `/command` or `@reference` is not a message continuation. */
    function isTriggerToken(draft: string): boolean {
      return /(?:^|\s)\/[^\s]*$/u.test(draft) || /(?:^|\s)@"?[^\s]*$/u.test(draft)
    }

    /** Show the model's first line while it is still streaming. */
    function streamingCandidate(stream: string): string {
      if (stream.trim().length < STREAM_MIN_CHARS) return ''
      for (const raw of stream.split(/\r?\n/u)) {
        let line = raw.trim()
        if (line === '') continue
        if (/^none$/iu.test(line)) return ''
        line = cleanLine(line)
        if (line === '') continue
        return line.length > 240 ? line.slice(0, 240) : line
      }
      return ''
    }

    function cleanLine(line: string): string {
      return line
        .replace(/^(?:[-*•]|\d+[.)])\s+/u, '')
        .replace(/^["'`\u201c\u201d]+|["'`\u201c\u201d]+$/gu, '')
        .replace(/\s+/gu, ' ')
        .trim()
    }

    /**
     * Join a continuation onto the draft without gluing words together.
     * Avoid repeating a separator already present in the exact draft.
     */
    function joinContinuation(draft: string, value: string) {
      if (draft === '' || value === '') return value
      if (/\s$/u.test(draft)) return value.replace(/^\s+/u, '')
      if (/^\s/u.test(value)) return value
      const last = draft.slice(-1)
      const first = value.slice(0, 1)
      // CJK text does not use a word separator; never invent one there.
      if (isCjk(last) || isCjk(first)) return value
      if (/[([{/\-—"'`]$/u.test(last)) return value
      if (/^[,.;:!?)\]}%]/u.test(first)) return value
      return ` ${value}`
    }

    function isCjk(character: string): boolean {
      return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(character)
    }

    function sameBox(left: any, right: any): boolean {
      return (
        left !== null &&
        left !== undefined &&
        left.top === right.top &&
        left.left === right.left &&
        left.height === right.height &&
        left.right === right.right &&
        left.maxWidth === right.maxWidth
      )
    }

    /** Parse a fully buffered SSE body, for shells that cannot stream fetch bodies. */
    function parseSseText(text: string): any[] {
      const events = []
      for (const frame of text.split('\n\n')) {
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '') continue
          try {
            events.push(JSON.parse(payload))
          } catch {
            // Ignore a malformed frame.
          }
        }
      }
      return events
    }

    /** Read one SSE body and hand every `data:` payload to the callback. */
    async function consumeStream(body: any, signal: AbortSignal, onEvent: (ev: any) => void): Promise<boolean> {
      const reader = body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let terminal = false
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (signal.aborted) break
          buffer += decoder.decode(value, { stream: true })
          let boundary = buffer.indexOf('\n\n')
          while (boundary >= 0) {
            const frame = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            for (const line of frame.split('\n')) {
              if (!line.startsWith('data:')) continue
              const payload = line.slice(5).trim()
              if (payload === '') continue
              try {
                const event = JSON.parse(payload)
                if (event.type === 'done' || event.type === 'error') terminal = true
                onEvent(event)
              } catch {
                // A malformed frame is ignored; the draft keeps working.
              }
            }
            boundary = buffer.indexOf('\n\n')
          }
        }
        return terminal
      } finally {
        if (signal.aborted) {
          try {
            await reader.cancel()
          } catch {
            // Cancelling a finished stream is harmless.
          }
        }
        reader.releaseLock()
      }
    }

    export function ComposerPredictionOverlay(props: any) {
      const { sessionId, useSession, useInput, useSessionStatus, inputActions, t } = props
      const predictionsEnabled = true
      const draft = useInput ? useInput((state: any) => (state === undefined ? '' : state.draft || '')) : ''
      const running = useSession
        ? useSession((state: any) => state?.running === true)
        : (useSessionStatus ? useSessionStatus((state: any) => (state === undefined ? false : state.get(sessionId)?.running === true)) : false)
      const [ghost, setGhost] = React.useState(NO_GHOST)
      const [box, setBox] = React.useState<any>(null)
      const [compositionEnd, setCompositionEnd] = React.useState(0)

      const anchorRef = React.useRef(null)
      const elements = () => composerElementsNear(anchorRef.current)
      const abortRef = React.useRef<AbortController | null>(null)
      const composingRef = React.useRef(false)
      const dismissedRef = React.useRef<any>(null)
      const acceptRef = React.useRef<(() => void) | null>(null)
      const cycleRef = React.useRef<((d: number) => void) | null>(null)
      const currentRef = React.useRef('')

      const request = React.useCallback(
        async (mode: 'next' | 'continue', draftText: string) => {
          if (sessionId === undefined || sessionId === null) return
          if (typeof document !== 'undefined' && document.hidden) return
          abortRef.current?.abort()
          const controller = new AbortController()
          abortRef.current = controller
          setGhost({ mode, items: [], index: 0, stream: '', active: true })

          const settle = (items: string[]) => {
            if (controller.signal.aborted) return
            setGhost((previous) => {
              if (previous.mode !== mode) return previous
              if (items.length === 0) return NO_GHOST
              return { mode, items, index: 0, stream: '', active: false }
            })
          }

          try {
            const response = await fetch(ENDPOINT, {
              method: 'POST',
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
              // Compatibility path: an older Host answers one JSON prediction.
              const payload = await response.json().catch(() => null)
              const items = Array.isArray(payload?.suggestions)
                ? payload.suggestions.filter((item: any) => typeof item === 'string' && item !== '')
                : typeof payload?.suggestion === 'string' && payload.suggestion !== ''
                  ? [payload.suggestion]
                  : []
              settle(items)
              return
            }

            if (response.body === null) {
              // Some desktop shells buffer the fetch body; parse the whole stream.
              const text = await response.text().catch(() => '')
              const done = parseSseText(text).find((event) => event.type === 'done')
              settle(
                Array.isArray(done?.items)
                  ? done.items.filter((item: any) => typeof item === 'string' && item !== '')
                  : [],
              )
              return
            }

            const terminal = await consumeStream(response.body, controller.signal, (event) => {
              if (controller.signal.aborted) return
              if (event.type === 'delta' && typeof event.text === 'string') {
                setGhost((previous) =>
                  previous.active && previous.mode === mode
                    ? { ...previous, stream: previous.stream + event.text }
                    : previous,
                )
              } else if (event.type === 'done') {
                const items = Array.isArray(event.items)
                  ? event.items.filter((item: any) => typeof item === 'string' && item !== '')
                  : []
                settle(items)
              } else if (event.type === 'error') {
                settle([])
              }
            })
            if (!terminal) settle([])
          } catch {
            // An aborted or failed prediction is silent: the composer keeps working.
            if (!controller.signal.aborted) settle([])
          }
        },
        [sessionId],
      )

      React.useEffect(() => {
        if (predictionsEnabled) return
        abortRef.current?.abort()
        setGhost(NO_GHOST)
        setBox(null)
      }, [predictionsEnabled])

      // IME composition owns the draft until it commits: no prediction work.
      React.useEffect(() => {
        const onCompositionStart = () => {
          composingRef.current = true
          abortRef.current?.abort()
          setGhost(NO_GHOST)
          setBox(null)
        }
        const onCompositionEnd = () => {
          composingRef.current = false
          setCompositionEnd(value => value + 1)
        }
        document.addEventListener('compositionstart', onCompositionStart, true)
        document.addEventListener('compositionend', onCompositionEnd, true)
        return () => {
          document.removeEventListener('compositionstart', onCompositionStart, true)
          document.removeEventListener('compositionend', onCompositionEnd, true)
        }
      }, [])

      // A different Session starts from a clean slate.
      React.useEffect(() => {
        dismissedRef.current = null
        abortRef.current?.abort()
        setGhost(NO_GHOST)
        setBox(null)
        return () => abortRef.current?.abort()
      }, [sessionId])

      // Typing invalidates what was predicted for the previous text.
      React.useEffect(() => {
        abortRef.current?.abort()
        setGhost(NO_GHOST)
        if (dismissedRef.current !== null && dismissedRef.current.draft !== draft) {
          dismissedRef.current = null
        }
      }, [draft])

      // A starting turn drops the ghost and re-arms a dismissed prediction.
      React.useEffect(() => {
        if (!running) return
        abortRef.current?.abort()
        setGhost(NO_GHOST)
        dismissedRef.current = null
      }, [running])

      // `next`: ask once the turn has settled and the composer is empty.
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null) return undefined
        if (!predictionsEnabled || running || draft !== '') return undefined
        if (dismissedRef.current !== null && dismissedRef.current.draft === draft) return undefined
        const timer = setTimeout(() => {
          if (composingRef.current) return
          void request('next', '')
        }, SETTLE_MS)
        return () => clearTimeout(timer)
      }, [sessionId, running, draft, request, predictionsEnabled, compositionEnd])

      // `continue`: ask after a pause, only with the caret at the draft's end.
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null) return undefined
        if (!predictionsEnabled || draft.trim() === '' || draft.length < CONTINUE_MIN_CHARS) return undefined
        if (isTriggerToken(draft)) return undefined
        if (dismissedRef.current !== null && dismissedRef.current.draft === draft) return undefined
        const timer = setTimeout(() => {
          if (composingRef.current) return
          const found = elements()
          if (found === null) return
          if (caretAtEnd(found.editor, draft) === null) return
          void request('continue', draft.slice(-MAX_DRAFT_CHARS))
        }, TYPE_PAUSE_MS)
        return () => clearTimeout(timer)
      }, [sessionId, draft, request, predictionsEnabled, compositionEnd])

      // A prediction skipped while the page was hidden is retried on return.
      React.useEffect(() => {
        const onVisibility = () => {
          if (!predictionsEnabled || document.hidden) return
          if (draft !== '' || running) return
          if (currentRef.current !== '' || dismissedRef.current !== null) return
          if (sessionId === undefined || sessionId === null) return
          void request('next', '')
        }
        document.addEventListener('visibilitychange', onVisibility)
        return () => document.removeEventListener('visibilitychange', onVisibility)
      }, [draft, running, sessionId, request, predictionsEnabled])

      const rawCandidate = ghost.items.length > 0
        ? ghost.items[Math.min(ghost.index, ghost.items.length - 1)] ?? ''
        : streamingCandidate(ghost.stream)
      const current = ghost.mode === 'continue' ? joinContinuation(draft, rawCandidate) : rawCandidate
      currentRef.current = current
      const hasCandidate = current !== ''

      const visible =
        predictionsEnabled &&
        current !== '' &&
        box !== null &&
        (ghost.mode === 'next'
          ? draft === '' && !running
          : draft.trim() !== '' && !isTriggerToken(draft))

      // `next` ghost spans the editor's text column.
      React.useLayoutEffect(() => {
        if (ghost.mode !== 'next') return undefined
        const measure = () => {
          const found = elements()
          if (found === null) {
            setBox((previous: any) => (previous === null ? previous : null))
            return
          }
          const cardRect = found.card.getBoundingClientRect()
          const editorRect = found.editor.getBoundingClientRect()
          if (editorRect.width <= 0 || editorRect.height <= 0) {
            setBox((previous: any) => (previous === null ? previous : null))
            return
          }
          const computed = window.getComputedStyle(found.editor)
          const lineHeight = Number.parseFloat(computed.lineHeight)
          const paddingTop = Number.parseFloat(computed.paddingTop)
          const paddingLeft = Number.parseFloat(computed.paddingLeft)
          const topInset = Number.isFinite(paddingTop) ? paddingTop : EDITOR_INSET_TOP
          const leftInset = Number.isFinite(paddingLeft) ? paddingLeft : EDITOR_INSET_LEFT
          const next = {
            top: Math.max(0, Math.round(editorRect.top - cardRect.top + topInset)),
            left: Math.max(0, Math.round(editorRect.left - cardRect.left + leftInset)),
            right: Math.max(EDITOR_INSET_RIGHT, Math.round(cardRect.right - editorRect.right + EDITOR_SCROLL_MARGIN)),
            height: Number.isFinite(lineHeight) && lineHeight > 0 ? Math.round(lineHeight) : FALLBACK_LINE_HEIGHT,
          }
          setBox((previous: any) => (sameBox(previous, next) ? previous : next))
        }
        measure()
        const found = elements()
        let observer: ResizeObserver | undefined
        if (found !== null && typeof ResizeObserver === 'function') {
          observer = new ResizeObserver(measure)
          observer.observe(found.card)
          observer.observe(found.editor)
        }
        window.addEventListener('resize', measure)
        return () => {
          observer?.disconnect()
          window.removeEventListener('resize', measure)
        }
      }, [ghost.mode, draft, sessionId, running, hasCandidate])

      // `continue` ghost follows the caret.
      React.useLayoutEffect(() => {
        if (ghost.mode !== 'continue') return undefined
        let frame = 0
        const measure = () => {
          frame = 0
          const found = elements()
          if (found === null) {
            setBox((previous: any) => (previous === null ? previous : null))
            return
          }
          const caret = caretAtEnd(found.editor, draft)
          if (caret === null) {
            setBox((previous: any) => (previous === null ? previous : null))
            return
          }
          const editorRect = found.editor.getBoundingClientRect()
          if (editorRect.width <= 0 || editorRect.height <= 0) {
            setBox((previous: any) => (previous === null ? previous : null))
            return
          }
          const cardRect = found.card.getBoundingClientRect()
          const computed = window.getComputedStyle(found.editor)
          const lineHeight = Number.parseFloat(computed.lineHeight)
          const height =
            Number.isFinite(caret.height) && caret.height > 0
              ? Math.round(caret.height)
              : Number.isFinite(lineHeight) && lineHeight > 0
                ? Math.round(lineHeight)
                : FALLBACK_LINE_HEIGHT
          const desired = caret.left - cardRect.left
          const left = Math.max(0, desired)
          const maxWidth = cardRect.right - (cardRect.left + left) - 16
          if (maxWidth < 48) {
            setBox((previous: any) => (previous === null ? previous : null))
            return
          }
          const top = caret.top - cardRect.top
          // A caret scrolled above or below the card has no honest place to draw.
          if (top < 0 || top > cardRect.height - 8) {
            setBox((previous: any) => (previous === null ? previous : null))
            return
          }
          const next = {
            top: Math.round(top),
            left: Math.round(left),
            maxWidth: Math.round(maxWidth),
            height,
          }
          setBox((previous: any) => (sameBox(previous, next) ? previous : next))
        }
        const schedule = () => {
          if (frame === 0) frame = requestAnimationFrame(measure)
        }
        measure()
        document.addEventListener('selectionchange', schedule)
        document.addEventListener('scroll', schedule, true)
        const found = elements()
        window.addEventListener('resize', schedule)
        let observer: ResizeObserver | undefined
        if (found !== null && typeof ResizeObserver === 'function') {
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
          // A refused insertion must never be bypassed by replacing the draft.
          if (inputActions.insertText(value, inputActions.captureInsertion()) !== true) return
        } catch {
          return
        }
        // Accepting leaves an editable draft: hand the keyboard back to the editor.
        try {
          const found = elements()
          if (found !== null && !found.card.contains(document.activeElement)) found.editor.focus()
        } catch {
          // Focus is a courtesy, never a failure.
        }
      }
      acceptRef.current = accept

      const cycle = (delta: number) => {
        setGhost((previous) => {
          if (previous.items.length <= 1) return previous
          const index = (previous.index + delta + previous.items.length) % previous.items.length
          return { ...previous, index }
        })
      }
      cycleRef.current = cycle

      React.useEffect(() => {
        if (!visible) return undefined
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.defaultPrevented) return
          // An IME candidate window owns the keyboard while composing.
          if (event.isComposing === true || event.keyCode === 229) return
          const found = elements()
          if (found === null) return
          const target = typeof Node !== 'undefined' && event.target instanceof Node ? event.target : null
          const inEditor = found.editor.contains(document.activeElement)
          const inCard =
            found.card.contains(document.activeElement) || (target !== null && found.card.contains(target))
          if (!inCard) return
          if (event.key === 'Escape') {
            // Dismiss only this suggestion: keep the gesture away from the
            // composer's own Escape handling (the Esc-Esc stop sequence).
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
          // Tab belongs to the editor only; on composer controls it must keep
          // its normal focus-traversal behavior.
          if (!inEditor || ghost.active) return
          if (ghost.mode === 'continue' && caretAtEnd(found.editor, draft) === null) return
          event.preventDefault()
          event.stopPropagation()
          acceptRef.current?.()
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => document.removeEventListener('keydown', onKeyDown, true)
      }, [visible, draft, ghost.items.length, ghost.active, ghost.mode])

      const anchor = h('span', {
        ref: anchorRef,
        'data-composer-prediction-anchor': '',
        'aria-hidden': 'true',
        style: { display: 'none' },
      })

      if (!visible || box === null) return anchor

      const continuation = ghost.mode === 'continue'
      const style = continuation ? CONTINUE_GHOST_STYLE : NEXT_GHOST_STYLE
      const showKeycap = !ghost.active && (!continuation || (box.maxWidth ?? 0) >= 96)
      const showBadge = ghost.items.length > 1

      return h(React.Fragment, null,
        h('span', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' } }, ghost.active ? '' : (t('input.prediction.dismiss') || current)),
        h('div',
          {
            style: { ...style, ...box },
            'aria-hidden': 'true',
            'data-composer-prediction': ghost.mode,
            title: current,
          },
          h('span', { style: continuation ? CONTINUE_TEXT_STYLE : TEXT_STYLE }, current),
          showBadge ? h('span', { style: BADGE_STYLE, title: t('input.prediction.more') }, `${ghost.index + 1}/${ghost.items.length}`) : null,
          showKeycap ? h('kbd', { style: KEYCAP_STYLE, title: t('input.prediction.tab') }, 'Tab') : null,
        ),
        anchor,
      )
    }

// 导出被单测引用的算法
export { joinContinuation, parseSseText, streamingCandidate, cleanLine, consumeStream }
