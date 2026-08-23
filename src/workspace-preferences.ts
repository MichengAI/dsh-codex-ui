import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

export const WORKSPACE_PREFERENCES_FILE = '.dsh-codex-ui-preferences.json'
export const WORKSPACE_PREFERENCES_VERSION = 1
export const MAX_PINNED_WORKSPACE_IDS = 1_000
export const MAX_WORKSPACE_ID_LENGTH = 256

export type WorkspacePreferences = {
  version: typeof WORKSPACE_PREFERENCES_VERSION
  pinnedWorkspaceIds: string[]
}

export type StoredWorkspacePreferences = WorkspacePreferences & { exists: boolean }

/** Desktop 和普通 DSH Web 共用 Profile；服务换端口或重启后目录仍保持稳定。 */
export function workspacePreferencesPath(profileDir = process.env.DSH_PROFILE_DIR ?? resolve(homedir(), '.dsh', 'profiles', 'web')): string {
  return resolve(profileDir, WORKSPACE_PREFERENCES_FILE)
}

/** 严格校验来自 HTTP 或磁盘的数据，避免损坏配置被静默写回。 */
export function parsePinnedWorkspaceIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_PINNED_WORKSPACE_IDS) return undefined
  if (!value.every(id => typeof id === 'string' && id.trim() !== '' && id.length <= MAX_WORKSPACE_ID_LENGTH)) return undefined
  return [...new Set(value)]
}

function parseWorkspacePreferences(value: unknown): WorkspacePreferences | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (record.version !== WORKSPACE_PREFERENCES_VERSION) return undefined
  const pinnedWorkspaceIds = parsePinnedWorkspaceIds(record.pinnedWorkspaceIds)
  return pinnedWorkspaceIds === undefined ? undefined : { version: WORKSPACE_PREFERENCES_VERSION, pinnedWorkspaceIds }
}

export async function readWorkspacePreferences(path = workspacePreferencesPath()): Promise<StoredWorkspacePreferences> {
  try {
    const preferences = parseWorkspacePreferences(JSON.parse(await readFile(path, 'utf8')))
    if (preferences === undefined) throw new Error('置顶偏好文件格式无效。')
    return { ...preferences, exists: true }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: WORKSPACE_PREFERENCES_VERSION, pinnedWorkspaceIds: [], exists: false }
    }
    throw error
  }
}

function temporaryPath(path: string): string {
  return join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`)
}

let writeQueue: Promise<void> = Promise.resolve()

/** 串行、原子保存，避免快速拖动排序产生乱序或半截 JSON。 */
export function writeWorkspacePreferences(pinnedWorkspaceIds: readonly string[], path = workspacePreferencesPath()): Promise<void> {
  const normalized = parsePinnedWorkspaceIds([...pinnedWorkspaceIds])
  if (normalized === undefined) return Promise.reject(new Error('置顶工作区数据无效。'))
  const task = writeQueue.catch(() => undefined).then(async () => {
    await mkdir(dirname(path), { recursive: true })
    const temporary = temporaryPath(path)
    try {
      await writeFile(temporary, `${JSON.stringify({ version: WORKSPACE_PREFERENCES_VERSION, pinnedWorkspaceIds: normalized }, undefined, 2)}\n`, 'utf8')
      await rename(temporary, path)
    } finally {
      await rm(temporary, { force: true }).catch(() => undefined)
    }
  })
  writeQueue = task
  return task
}
