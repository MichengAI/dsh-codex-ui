import { CHANNEL_SESSION_PREFIX } from './client/channel-api.ts'
import { AUTOMATION_SESSION_PREFIX } from './client/schedule-sessions.ts'

export const SESSION_TITLE_TYPES = ['功能', '设计', '修复', '优化', '发布', '探索', '文档', '研究'] as const
export const SESSION_TITLE_SEPARATOR = '｜'
export const SESSION_TITLE_MAX_BYTES = 80
export const SESSION_TITLE_EMOJI = {
  功能: '✨',
  设计: '🎨',
  修复: '🐛',
  优化: '⚡',
  发布: '🚀',
  探索: '🔍',
  文档: '📝',
  研究: '🔬',
} as const

const TITLE_TYPES = new Set<string>(SESSION_TITLE_TYPES)
const LEADING_EMOJI = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)+\s*/u
const TITLE_SEPARATORS = /[|｜│]/g
const GENERIC_THEME_SUFFIXES = ['类型', '分类', '相关', '需求', '问题', '会话', '标题', '主题', '内容']

export type SessionTitleKind = (typeof SESSION_TITLE_TYPES)[number]

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
  if (type === undefined || theme === undefined || !TITLE_TYPES.has(type)) return undefined
  return { type: type as SessionTitleKind, theme }
}

export function isRedundantTheme(type: string, theme: string): boolean {
  const normalized = theme.replace(/[\s·.\-_/]/g, '')
  if (normalized === type || normalized === `新${type}`) return true
  if (type !== '' && normalized.length >= type.length * 2 && normalized.length % type.length === 0 && normalized === type.repeat(normalized.length / type.length)) return true
  return GENERIC_THEME_SUFFIXES.some(suffix => normalized === suffix || normalized === `${type}${suffix}`)
}

export function assembleSessionTitle(type: string, theme: string): string | undefined {
  const parsed = parseTypeAndTheme(`${type}${SESSION_TITLE_SEPARATOR}${theme}`)
  if (parsed === undefined) return undefined
  const title = isRedundantTheme(parsed.type, parsed.theme)
    ? `${SESSION_TITLE_EMOJI[parsed.type]} ${parsed.type}`
    : `${SESSION_TITLE_EMOJI[parsed.type]} ${parsed.type}${SESSION_TITLE_SEPARATOR}${parsed.theme}`
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
