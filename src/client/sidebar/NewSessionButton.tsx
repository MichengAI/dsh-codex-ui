import type { Context as ClientContext } from '@deepseek-ai/cordis'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { MessageSquarePlus } from 'lucide-react'
import { isValidElement, useCallback, useEffect, useMemo, useState, type FC, type ReactNode } from 'react'

const IconNewChat =
  ((primitives as Record<string, unknown>).IconNewChatOutlineMedium as FC<{ size?: number }>) ??
  ((primitives as Record<string, unknown>).IconNewChatOutlineRegular as FC<{ size?: number }>) ??
  MessageSquarePlus

const Tooltip = (primitives as Record<string, unknown>).Tooltip as
  | FC<{
      label: string
      shortcutKeys?: string[]
      side?: 'right' | 'top' | 'bottom' | 'left'
      delayMs?: number
      disabled?: boolean
      children: React.ReactElement
    }>
  | undefined

const ShortcutKeys = (primitives as Record<string, unknown>).ShortcutKeys as
  | FC<{
      keys: string[]
      variant?: 'plain' | 'solid'
    }>
  | undefined

export interface NewSessionShortcut {
  aria?: string
  keys?: string[]
}

interface ShortcutCatalogEntryLike {
  id?: string
  aria?: string
  keys?: readonly string[]
}

interface ShortcutCatalogLike {
  getSnapshot?: () => readonly ShortcutCatalogEntryLike[]
  subscribe?: (listener: () => void) => () => void
}

function parseAriaShortcutKeys(aria: string): string[] {
  return aria.split('+').map(k => {
    const lower = k.trim().toLowerCase()
    if (lower === 'control') return 'Ctrl'
    if (lower === 'alt') return 'Alt'
    if (lower === 'shift') return 'Shift'
    if (lower === 'meta' || lower === 'command') return '⌘'
    return k.trim()
  })
}

export function extractAriaKeyshortcuts(node: ReactNode): string | undefined {
  if (!isValidElement(node)) return undefined
  const props = node.props as { 'aria-keyshortcuts'?: unknown; children?: ReactNode } | undefined
  if (typeof props?.['aria-keyshortcuts'] === 'string' && props['aria-keyshortcuts'] !== '') {
    return props['aria-keyshortcuts']
  }
  return extractAriaKeyshortcuts(props?.children)
}

export function getNewSessionShortcut(ariaHint?: string): NewSessionShortcut {
  const domAria =
    typeof document !== 'undefined'
      ? document.querySelector('button[class*="newSession"]')?.getAttribute('aria-keyshortcuts') || undefined
      : undefined
  const aria = ariaHint || domAria
  if (!aria) {
    const isMac =
      typeof navigator !== 'undefined' &&
      /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent)
    return isMac
      ? { aria: '⌥⌘N', keys: ['⌥', '⌘', 'N'] }
      : { aria: 'Ctrl+Alt+N', keys: ['Ctrl', 'Alt', 'N'] }
  }
  return { aria, keys: parseAriaShortcutKeys(aria) }
}

function readShortcutFromCatalog(ctx: ClientContext): NewSessionShortcut | undefined {
  try {
    const shortcuts = ctx.get?.('shortcuts') as { catalog?: ShortcutCatalogLike } | undefined
    const rows = shortcuts?.catalog?.getSnapshot?.()
    const entry = rows?.find(row => row.id === 'session.new')
    if (entry && (entry.aria || (entry.keys && entry.keys.length > 0))) {
      return {
        aria: entry.aria,
        keys: entry.keys ? [...entry.keys] : undefined,
      }
    }
  } catch {
    // 忽略未就绪服务
  }
  return undefined
}

export interface NewSessionButtonProps {
  ctx: ClientContext
  label: string
  ariaHint?: string
}

/** 解析宿主 uiWorkspace.startSession；供 HOC 闸门与降级点击共用。 */
export function resolveStartSession(ctx: ClientContext): (() => Promise<void> | void) | undefined {
  try {
    const uiWorkspace = (ctx.get?.('uiWorkspace') ?? (ctx as unknown as { uiWorkspace?: unknown })?.uiWorkspace) as {
      startSession?: () => Promise<void> | void
    } | undefined
    return typeof uiWorkspace?.startSession === 'function'
      ? () => uiWorkspace.startSession!()
      : undefined
  } catch {
    return undefined
  }
}

/** Codex 风格扁平「新会话」行按钮，复用于 sidebar.session.action HOC 与旧宿主降级模式。 */
export const NewSessionButton: FC<NewSessionButtonProps> = ({ ctx, label, ariaHint }) => {
  const [startingSession, setStartingSession] = useState(false)
  const [catalogShortcut, setCatalogShortcut] = useState<NewSessionShortcut | undefined>(() =>
    readShortcutFromCatalog(ctx),
  )

  useEffect(() => {
    setCatalogShortcut(readShortcutFromCatalog(ctx))
    try {
      const shortcuts = ctx.get?.('shortcuts') as { catalog?: ShortcutCatalogLike } | undefined
      return shortcuts?.catalog?.subscribe?.(() => {
        setCatalogShortcut(readShortcutFromCatalog(ctx))
      })
    } catch {
      return undefined
    }
  }, [ctx])

  const shortcut = useMemo(
    () => catalogShortcut ?? getNewSessionShortcut(ariaHint),
    [catalogShortcut, ariaHint],
  )

  const handleStartSession = useCallback(async () => {
    if (startingSession) return
    setStartingSession(true)
    try {
      const startSession = resolveStartSession(ctx)
      if (startSession) {
        await Promise.resolve(startSession())
      } else {
        // 命名约束：本组件自身 class 为 dcu-sb-new-session-row（带连字符），绝不能包含驼峰 newSession，避免自点击递归
        const nativeNewSession = document.querySelector('button[class*="newSession"]') as HTMLButtonElement | null
        nativeNewSession?.click()
      }
    } catch (err) {
      console.warn('startSession failed:', err)
    } finally {
      setStartingSession(false)
    }
  }, [ctx, startingSession])

  const button = (
    <button
      type="button"
      className="dcu-sb-row dcu-sb-new-session-row"
      aria-label={label}
      aria-keyshortcuts={shortcut.aria}
      aria-disabled={startingSession}
      onClick={handleStartSession}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          void handleStartSession()
        }
      }}
    >
      <span className="dcu-sb-glyph" aria-hidden="true">
        <IconNewChat size={16} />
      </span>
      <span className="dcu-sb-title">{label}</span>
      {ShortcutKeys && shortcut.keys && shortcut.keys.length > 0 && (
        <span className="dcu-sb-shortcut" aria-hidden="true">
          <ShortcutKeys keys={shortcut.keys} />
        </span>
      )}
    </button>
  )

  return Tooltip ? (
    <Tooltip label={label} shortcutKeys={shortcut.keys} delayMs={500} side="right">
      {button}
    </Tooltip>
  ) : (
    button
  )
}
