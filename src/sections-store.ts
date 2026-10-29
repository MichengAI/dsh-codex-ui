/**
 * 工作区分区的宿主侧存储。
 *
 * 对齐 Codex 的分层：分区结构与成员归属属于**用户数据**，由宿主落盘
 * （Codex 是 `~/.codex/state_5.sqlite` 里的 `thread_sections` + `threads.thread_section_id`），
 * 浏览器只负责折叠、展开这类视图偏好。
 *
 * 这里把文档写到当前 DSH profile 的 `plugin-data/<app>/` 下：换浏览器、清缓存都不会丢，
 * 也不会和宿主自己的配置混在一起。写入走「临时文件 + rename」，避免进程中断留下半截 JSON。
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { resolveCurrentProfile } from './profile-resolver.ts'

/** 单个分区文档的体积上限：这是结构数据，超过就说明客户端出了问题。 */
export const SECTIONS_STORE_MAX_BYTES = 64 * 1024
/** 分区数量上限。 */
export const SECTIONS_STORE_MAX_SECTIONS = 100
/** 单个分区内成员上限。 */
export const SECTIONS_STORE_MAX_MEMBERS = 2000

/** 落盘的分区文档；`sections` 的顺序即分区顺序，`ids` 的顺序即区内位置（等价 Codex 的 section_position）。 */
export interface SectionsDocument {
  version: number
  sections: Array<{ id: string; name: string; ids: string[] }>
}

/** 非法文档：调用方据此回 400，且绝不覆盖已存在的合法文件。 */
export class SectionsDocumentError extends Error {}

/**
 * 解析分区文档的落盘路径。
 *
 * @param ctx - 宿主 Context，可从中读到当前 profile。
 * @returns 绝对路径：`<profileDir>/plugin-data/michengai.dsh-codex-ui/workspace-sections.json`。
 */
export function resolveSectionsStorePath(ctx?: Context): string {
  const { profileDir, homeDir } = resolveCurrentProfile(ctx)
  const base = profileDir !== '' ? profileDir : homeDir
  return join(base, 'plugin-data', 'michengai.dsh-codex-ui', 'workspace-sections.json')
}

/** 校验并规范化分区文档；不合法时抛 {@link SectionsDocumentError}。 */
export function validateSectionsDocument(value: unknown): SectionsDocument {
  if (typeof value !== 'object' || value === null) throw new SectionsDocumentError('分区数据必须是对象。')
  const raw = value as { version?: unknown; sections?: unknown }
  if (!Array.isArray(raw.sections)) throw new SectionsDocumentError('分区数据缺少 sections 数组。')
  if (raw.sections.length > SECTIONS_STORE_MAX_SECTIONS) {
    throw new SectionsDocumentError(`分区数量超过上限 ${SECTIONS_STORE_MAX_SECTIONS}。`)
  }

  const seenSections = new Set<string>()
  const seenWorkspaces = new Set<string>()
  const sections = raw.sections.map((item, index) => {
    if (typeof item !== 'object' || item === null) throw new SectionsDocumentError(`第 ${index + 1} 个分区不是对象。`)
    const section = item as { id?: unknown; name?: unknown; ids?: unknown }
    if (typeof section.id !== 'string' || section.id.trim() === '' || section.id.length > 64) {
      throw new SectionsDocumentError(`第 ${index + 1} 个分区的 id 不合法。`)
    }
    if (seenSections.has(section.id)) throw new SectionsDocumentError(`分区 id 重复：${section.id}。`)
    seenSections.add(section.id)

    const name = typeof section.name === 'string' ? section.name.trim() : ''
    if (name === '' || name.length > 64) throw new SectionsDocumentError(`分区「${section.id}」的名称不合法。`)
    if (!Array.isArray(section.ids)) throw new SectionsDocumentError(`分区「${section.id}」缺少 ids 数组。`)
    if (section.ids.length > SECTIONS_STORE_MAX_MEMBERS) {
      throw new SectionsDocumentError(`分区「${section.id}」成员数量超过上限 ${SECTIONS_STORE_MAX_MEMBERS}。`)
    }
    const ids = section.ids.map(member => {
      if (typeof member !== 'string' || member === '' || member.length > 128) {
        throw new SectionsDocumentError(`分区「${section.id}」存在不合法的成员 id。`)
      }
      if (seenWorkspaces.has(member)) throw new SectionsDocumentError(`同一个工作区出现在多个分区：${member}。`)
      seenWorkspaces.add(member)
      return member
    })
    return { id: section.id, name, ids }
  })

  const version = typeof raw.version === 'number' && Number.isFinite(raw.version) ? Math.trunc(raw.version) : 1
  return { version, sections }
}

/**
 * 读取分区文档。
 *
 * @param ctx - 宿主 Context。
 * @returns 文档；文件不存在或内容损坏时返回 `undefined`（损坏内容不会被删除，便于排查）。
 */
export function readSectionsDocument(ctx?: Context): SectionsDocument | undefined {
  const path = resolveSectionsStorePath(ctx)
  if (!existsSync(path)) return undefined
  try {
    const text = readFileSync(path, 'utf8')
    if (text.length > SECTIONS_STORE_MAX_BYTES) return undefined
    return validateSectionsDocument(JSON.parse(text))
  } catch {
    return undefined
  }
}

/**
 * 原子写入分区文档。
 *
 * @param ctx - 宿主 Context。
 * @param document - 已校验的文档。
 */
export function writeSectionsDocument(ctx: Context | undefined, document: SectionsDocument): void {
  const path = resolveSectionsStorePath(ctx)
  const payload = JSON.stringify(validateSectionsDocument(document), null, 2)
  if (Buffer.byteLength(payload, 'utf8') > SECTIONS_STORE_MAX_BYTES) {
    throw new SectionsDocumentError('分区数据过大。')
  }
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(temporary, payload, 'utf8')
    renameSync(temporary, path)
  } catch (error) {
    // 写临时文件失败时不留垃圾；rename 失败也可能是跨设备，直接抛给调用方回 503。
    try {
      if (existsSync(temporary)) unlinkSync(temporary)
    } catch {
      // 清理失败不影响结论
    }
    throw error
  }
}
