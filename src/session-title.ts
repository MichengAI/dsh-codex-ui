import { de, en, es, fr, ja, pt, ru, zh, type CodexUiKey } from './client/locales.ts'

const AUTOMATION_SESSION_PREFIX = 'dsh-automation-session-'
const CHANNEL_SESSION_PREFIX = 'im:'

export const SESSION_TITLE_KINDS = ['feature', 'design', 'fix', 'optimize', 'release', 'explore', 'docs', 'research'] as const
export type SessionTitleKind = (typeof SESSION_TITLE_KINDS)[number]

export const SUPPORTED_SESSION_TITLE_LOCALES = ['zh', 'en', 'ja', 'es', 'fr', 'de', 'ru', 'pt'] as const
export type SessionTitleLocale = (typeof SUPPORTED_SESSION_TITLE_LOCALES)[number]

export const SESSION_TITLE_LOCALES: Record<SessionTitleLocale, Record<CodexUiKey, string>> = {
  zh,
  en,
  ja,
  es,
  fr,
  de,
  ru,
  pt,
}

export const SESSION_TITLE_SEPARATOR = '｜'
export const SESSION_TITLE_MAX_BYTES = 80
export const SESSION_TITLE_EMOJI = {
  feature: '✨',
  design: '🎨',
  fix: '🐛',
  optimize: '⚡',
  release: '🚀',
  explore: '🔍',
  docs: '📝',
  research: '🔬',
} as const

const TYPE_KEYS = {
  feature: 'sessionTitle.type.feature',
  design: 'sessionTitle.type.design',
  fix: 'sessionTitle.type.fix',
  optimize: 'sessionTitle.type.optimize',
  release: 'sessionTitle.type.release',
  explore: 'sessionTitle.type.explore',
  docs: 'sessionTitle.type.docs',
  research: 'sessionTitle.type.research',
} as const satisfies Record<SessionTitleKind, CodexUiKey>

const GENERIC_THEME_SUFFIXES = [
  '类型', '分类', '相关', '需求', '问题', '会话', '标题', '主题', '内容',
  'type', 'category', 'related', 'request', 'issue', 'session', 'title', 'topic', 'content',
]
const LEADING_EMOJI = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)+\s*/u
const TITLE_SEPARATORS = /[|｜│]/g

export type SessionTitleParts = {
  type: SessionTitleKind
  theme: string
}

export type SessionTitleTarget = {
  id: string
  origin?: string
  header?: {
    createdAt?: number
    parentSession?: string
    origin?: string
  }
}

function typeLabel(kind: SessionTitleKind, locale: SessionTitleLocale): string {
  const key = TYPE_KEYS[kind]
  const dict = SESSION_TITLE_LOCALES[locale] ?? zh
  return dict[key]
}

function typeAliasMap(): Map<string, SessionTitleKind> {
  const aliases = new Map<string, SessionTitleKind>()
  for (const kind of SESSION_TITLE_KINDS) {
    aliases.set(kind, kind)
    for (const locale of SUPPORTED_SESSION_TITLE_LOCALES) {
      const dict = SESSION_TITLE_LOCALES[locale]
      const label = dict[TYPE_KEYS[kind]]
      aliases.set(label, kind)
      aliases.set(label.toLowerCase(), kind)
    }
  }
  return aliases
}

const TYPE_ALIASES = typeAliasMap()

function resolveKind(raw: string): SessionTitleKind | undefined {
  return TYPE_ALIASES.get(raw) ?? TYPE_ALIASES.get(raw.toLowerCase())
}

export function sessionTitleTypeLabels(locale: SessionTitleLocale): string {
  const separator = locale === 'zh' || locale === 'ja' ? '、' : ', '
  return SESSION_TITLE_KINDS.map(kind => typeLabel(kind, locale)).join(separator)
}

export function sessionTitlePrompt(locale: SessionTitleLocale): { system: string; userFrame: string } {
  const dict = SESSION_TITLE_LOCALES[locale] ?? zh
  const types = sessionTitleTypeLabels(locale)
  return {
    system: dict['sessionTitle.system'].replaceAll('{types}', types),
    userFrame: dict['sessionTitle.userFrame'],
  }
}

function localeFromTag(tag: string): SessionTitleLocale | undefined {
  const lower = tag.trim().toLowerCase()
  if (lower === '' || lower === 'c' || lower === 'posix') return undefined
  if (lower === 'zh' || lower.startsWith('zh-')) return 'zh'
  if (lower === 'en' || lower.startsWith('en-')) return 'en'
  if (lower === 'ja' || lower.startsWith('ja-')) return 'ja'
  if (lower === 'es' || lower.startsWith('es-')) return 'es'
  if (lower === 'fr' || lower.startsWith('fr-')) return 'fr'
  if (lower === 'de' || lower.startsWith('de-')) return 'de'
  if (lower === 'ru' || lower.startsWith('ru-')) return 'ru'
  if (lower === 'pt' || lower.startsWith('pt-')) return 'pt'
  return undefined
}

export function parseLocaleValue(value: unknown): SessionTitleLocale | undefined {
  if (typeof value === 'string') return localeFromTag(value)
  if (value === null || typeof value !== 'object') return undefined
  const row = value as { getSnapshot?: () => unknown; locale?: unknown; lang?: unknown; language?: unknown; current?: unknown; preference?: unknown; active?: unknown }
  if (typeof row.getSnapshot === 'function') return parseLocaleValue(row.getSnapshot())
  for (const key of ['locale', 'lang', 'language', 'current', 'preference', 'active'] as const) {
    const parsed = parseLocaleValue(row[key])
    if (parsed !== undefined) return parsed
  }
  return undefined
}

function inferLocaleFromMessage(text: string | undefined): SessionTitleLocale | undefined {
  if (text === undefined || text.trim() === '') return undefined
  if (/[\u3040-\u30ff]/.test(text)) return 'ja'
  if (/[\u0400-\u04ff]/.test(text)) return 'ru'
  if (/[㐀-鿿]/.test(text)) return 'zh'
  if (/[A-Za-z]/.test(text)) return 'en'
  return undefined
}

function compactMessageTheme(message: string): string {
  const line = message.replace(/\s+/g, ' ').trim()
  if (Buffer.byteLength(line, 'utf8') <= 40) return line
  let used = 0
  let output = ''
  for (const character of line) {
    const bytes = Buffer.byteLength(character, 'utf8')
    if (used + bytes > 40) break
    output += character
    used += bytes
  }
  return output.trimEnd()
}

/** 主题必须跟用户消息同一语言；模型串语言时改用消息原文。 */
export function alignThemeToMessage(theme: string, message: string): string {
  const messageLocale = inferLocaleFromMessage(message)
  const themeLocale = inferLocaleFromMessage(theme)
  if (messageLocale === undefined || themeLocale === undefined || messageLocale === themeLocale) return theme
  const fallback = compactMessageTheme(message)
  return fallback === '' ? theme : fallback
}

export function resolveSessionTitleLocale(source: unknown, message?: string, fallbackSource?: unknown): SessionTitleLocale {
  return parseLocaleValue(source) ?? parseLocaleValue(fallbackSource) ?? inferLocaleFromMessage(message) ?? 'zh'
}

function inferLocaleFromTypeToken(token: string): SessionTitleLocale {
  const lower = token.toLowerCase()
  for (const locale of SUPPORTED_SESSION_TITLE_LOCALES) {
    const dict = SESSION_TITLE_LOCALES[locale]
    for (const kind of SESSION_TITLE_KINDS) {
      const val = dict[TYPE_KEYS[kind]]
      if (val === token || val.toLowerCase() === lower) return locale
    }
  }
  return 'zh'
}

function stripLeadingNoise(part: string): string {
  const trimmed = part.trim()
  if (/^\d{4}$/.test(trimmed)) return ''
  return trimmed.replace(/^\d{4}\s*/, '').replace(LEADING_EMOJI, '').trim()
}

export function parseTypeAndTheme(raw: string): SessionTitleParts | undefined {
  const cleaned = raw.trim().replace(/^["'`]+|["'`]+$/g, '').trim().replace(TITLE_SEPARATORS, SESSION_TITLE_SEPARATOR)
  const parts = cleaned.split(SESSION_TITLE_SEPARATOR).map(stripLeadingNoise).filter(part => part !== '')
  const type = parts[0]
  const theme = parts[1]
  if (type === undefined || theme === undefined) return undefined
  const kind = resolveKind(type)
  if (kind === undefined) return undefined
  return { type: kind, theme }
}

function compactToken(value: string): string {
  return value.replace(/[\s·.\-_/]/g, '')
}

function isRedundantAgainst(type: string, theme: string): boolean {
  const normalized = compactToken(theme)
  const typeNorm = compactToken(type)
  if (normalized === '' || typeNorm === '') return false
  if (normalized.toLowerCase() === typeNorm.toLowerCase()) return true
  if (normalized.toLowerCase() === `新${typeNorm}`.toLowerCase()) return true
  if (normalized.toLowerCase() === `new${typeNorm}`.toLowerCase()) return true
  if (typeNorm !== '' && normalized.length >= typeNorm.length * 2 && normalized.length % typeNorm.length === 0 && normalized.toLowerCase() === typeNorm.repeat(normalized.length / typeNorm.length).toLowerCase()) return true
  return GENERIC_THEME_SUFFIXES.some(suffix => {
    const compactSuffix = compactToken(suffix)
    return normalized.toLowerCase() === compactSuffix.toLowerCase()
      || normalized.toLowerCase() === `${typeNorm}${compactSuffix}`.toLowerCase()
  })
}

export function isRedundantTheme(type: string, theme: string): boolean {
  const kind = resolveKind(type)
  const labels = kind === undefined ? [type] : [
    ...SUPPORTED_SESSION_TITLE_LOCALES.map(loc => typeLabel(kind, loc)),
    kind,
  ]
  return labels.some(label => isRedundantAgainst(label, theme))
}

export function assembleSessionTitle(type: string, theme: string, locale?: SessionTitleLocale): string | undefined {
  const parsed = parseTypeAndTheme(`${type}${SESSION_TITLE_SEPARATOR}${theme}`)
  if (parsed === undefined) return undefined
  const displayLocale = locale ?? inferLocaleFromTypeToken(type)
  const label = typeLabel(parsed.type, displayLocale)
  const title = isRedundantTheme(parsed.type, parsed.theme)
    ? `${SESSION_TITLE_EMOJI[parsed.type]} ${label}`
    : `${SESSION_TITLE_EMOJI[parsed.type]} ${label}${SESSION_TITLE_SEPARATOR}${parsed.theme}`
  if (Buffer.byteLength(title, 'utf8') > SESSION_TITLE_MAX_BYTES) return undefined
  return title
}

export function shouldSkipAutoTitle(session: SessionTitleTarget): boolean {
  const origin = session.origin ?? session.header?.origin
  return session.id.startsWith(AUTOMATION_SESSION_PREFIX)
    || session.id.startsWith(CHANNEL_SESSION_PREFIX)
    || origin === 'subagent'
    || (session.header?.parentSession !== undefined && session.header.parentSession !== '')
}
