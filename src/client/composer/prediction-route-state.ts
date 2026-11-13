export interface PredictionRouteChoice {
  provider: string
  model: string
  reasoningEffort?: string
}

export const PREDICTION_ROUTE_STORAGE_KEY = 'codex-ui.composer.prediction-route'

let currentRouteChoice: PredictionRouteChoice | null = (() => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PREDICTION_ROUTE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && typeof parsed.provider === 'string' && typeof parsed.model === 'string' && parsed.provider && parsed.model) {
      return {
        provider: parsed.provider.trim(),
        model: parsed.model.trim(),
        ...(typeof parsed.reasoningEffort === 'string' && parsed.reasoningEffort.trim() !== ''
          ? { reasoningEffort: parsed.reasoningEffort.trim() }
          : {}),
      }
    }
    return null
  } catch {
    return null
  }
})()

const listeners = new Set<() => void>()

export function getPredictionRoute(): PredictionRouteChoice | null {
  return currentRouteChoice
}

export function setPredictionRoute(choice: PredictionRouteChoice | null): void {
  currentRouteChoice = choice
  if (typeof window !== 'undefined') {
    try {
      if (choice && choice.provider && choice.model) {
        window.localStorage.setItem(PREDICTION_ROUTE_STORAGE_KEY, JSON.stringify(choice))
      } else {
        window.localStorage.removeItem(PREDICTION_ROUTE_STORAGE_KEY)
      }
    } catch {
      // 容错忽略
    }
  }
  listeners.forEach(fn => {
    try { fn() } catch { /* ignore */ }
  })
}

export function subscribePredictionRoute(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
