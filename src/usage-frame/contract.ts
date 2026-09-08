/** 同源费用承载页与宿主之间的最小能力桥；不暴露 Context 或远程服务全集。 */
export const USAGE_FRAME_PATH = '/api/dsh-codex-ui/usage/frame'
export const BILLING_ENTRY_ID = 'usage-billing'
export interface UsageFrameBridge {
  getSnapshot: () => unknown
  subscribe: (listener: () => void) => () => void
  actions: Record<string, (...args: unknown[]) => unknown>
  translate: (key: string, values?: Record<string, unknown>) => string
  checkModels: () => Promise<unknown>
  publishCosts: (costs: { todayCost: number; monthCost: number }) => void
  close: () => void
  ready: () => void
  failed: (message: string) => void
}
export type UsageFrameWindow = Window & { dcuUsageHost?: UsageFrameBridge }
