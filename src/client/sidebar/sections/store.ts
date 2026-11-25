/**
 * 工作区分区的客户端存取层。
 *
 * 分区结构与成员归属存在**宿主**（`/api/michengai/dsh-codex-ui/sections`），
 * 浏览器只用 localStorage 记折叠、展开这类视图偏好——与 Codex 的分层一致
 * （宿主 DB 存 `thread_sections` / `thread_section_id`，Electron atom state 存折叠与顺序偏好）。
 */
import { CODEX_UI_API_ENDPOINTS } from '../../../business-api.ts'

/** 存取通道：默认走宿主 HTTP 接口，单测注入内存实现。 */
export interface SectionsTransport {
  /** @returns 宿主里的原始文档文本；没有文档时返回 `null`。暂不可用时抛出异常。 */
  load: () => Promise<string | null>
  /** @param body - 完整文档 JSON。 @returns 是否写入成功。 */
  save: (body: string) => Promise<boolean>
}

/** 保留失败状态，让侧栏区分访问被拒绝和宿主暂时不可用。 */
export class SectionsLoadError extends Error {
  constructor(readonly status: number) {
    super(`Sections store unavailable: HTTP ${status}`)
  }
}

export const httpTransport: SectionsTransport = {
  async load(): Promise<string | null> {
    const response = await fetch(CODEX_UI_API_ENDPOINTS.sections, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
    // 路由未注册的 404 不代表文档为空，否则侧栏可能用默认分区覆盖已有数据。
    if (!response.ok) throw new SectionsLoadError(response.status)
    const text = await response.text()
    return text.trim() === '' ? null : text
  },
  async save(body: string): Promise<boolean> {
    try {
      const response = await fetch(CODEX_UI_API_ENDPOINTS.sections, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body,
      })
      return response.ok
    } catch {
      return false
    }
  },
}

let transport: SectionsTransport = httpTransport

/**
 * 替换存取通道（仅测试使用）。
 *
 * @param next - 新的通道；省略时恢复默认 HTTP 通道。
 */
export function setSectionsTransport(next?: SectionsTransport): void {
  transport = next ?? httpTransport
}

/**
 * 读取宿主里的分区文档。
 *
 * @returns 原始 JSON 文本；仅成功读取空内容时返回 `null`，读取失败时抛出异常。
 */
export async function loadSectionsDocument(): Promise<string | null> {
  return transport.load()
}

let pending: string | undefined
let timer: number | undefined
let inFlight: Promise<void> | undefined
let retried = false

async function flush(): Promise<void> {
  const body = pending
  pending = undefined
  if (body === undefined) return
  const ok = await transport.save(body)
  // 写失败时留一份最新内容重试一次：多半是宿主正忙，用户的下一次操作也会再触发保存。
  if (!ok && !retried && pending === undefined) {
    retried = true
    pending = body
    scheduleSave()
  } else {
    // 写入成功，或已重试过一次依然失败（放弃重试避免死循环），或新内容已排队（pending !== undefined）
    retried = false
  }
}

/** 立刻把待写内容发出去（切换页面、卸载时使用）。 */
export async function flushSectionsSave(): Promise<void> {
  if (timer !== undefined) {
    window.clearTimeout(timer)
    timer = undefined
  }
  inFlight = flush()
  await inFlight
  inFlight = undefined
}

function scheduleSave(): void {
  if (timer !== undefined) window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    timer = undefined
    if (inFlight !== undefined) return
    inFlight = flush().finally(() => {
      inFlight = undefined
    })
  }, 350)
}

/**
 * 排队保存分区文档（350ms 合并连续操作，避免拖动时每次移动都打一次请求）。
 *
 * @param body - 完整文档 JSON。
 */
export function scheduleSectionsSave(body: string): void {
  pending = body
  retried = false
  scheduleSave()
}
