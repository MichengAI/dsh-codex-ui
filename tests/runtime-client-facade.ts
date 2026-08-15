import { createRequire } from 'node:module'
import type {
  ConversationEventRegistry as ConversationEventRegistryType,
  ConversationViewRegistry as ConversationViewRegistryType,
  EMPTY_CHAT_SNAPSHOT as EmptyChatSnapshotType,
  EMPTY_CONVERSATION_VIEWS as EmptyConversationViewsType,
  SessionProvideChannel as SessionProvideChannelType,
  SlotRegistry as SlotRegistryType,
  createScope as CreateScopeType,
  createSnapshotStore as CreateSnapshotStoreType,
  scopeOf as ScopeOfType,
} from '@deepseek-ai/dsh-client-runtime/client'

type ClientBundle = { id: string; factory: (require: NodeRequire) => Record<string, unknown> }
const modules = new Map<string, Record<string, unknown>>()
const require = createRequire(import.meta.url)

declare global {
  interface Window {
    __ModuleLoader__?: { load: (handoff: ClientBundle) => void }
  }
}

window.__ModuleLoader__ = {
  load: ({ id, factory }: ClientBundle) => { modules.set(id, factory(require)) },
}

await import('@dsh-runtime-client-bundle')
const runtime = modules.get('@deepseek-ai/dsh-client-runtime')
if (runtime === undefined) throw new Error('未加载 DSH 客户端运行时测试模块')

export const ConversationEventRegistry = runtime.ConversationEventRegistry as typeof ConversationEventRegistryType
export const ConversationViewRegistry = runtime.ConversationViewRegistry as typeof ConversationViewRegistryType
export const EMPTY_CHAT_SNAPSHOT = runtime.EMPTY_CHAT_SNAPSHOT as typeof EmptyChatSnapshotType
export const EMPTY_CONVERSATION_VIEWS = runtime.EMPTY_CONVERSATION_VIEWS as typeof EmptyConversationViewsType
export const SessionProvideChannel = runtime.SessionProvideChannel as typeof SessionProvideChannelType
export const SlotRegistry = runtime.SlotRegistry as typeof SlotRegistryType
export const createScope = runtime.createScope as typeof CreateScopeType
export const createSnapshotStore = runtime.createSnapshotStore as typeof CreateSnapshotStoreType
export const scopeOf = runtime.scopeOf as typeof ScopeOfType
