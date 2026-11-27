type Listener = () => void

let sidebarEnabled = false
const sidebarEnabledListeners = new Set<Listener>()

export function getSidebarEnabled(): boolean {
  return sidebarEnabled
}

export function setSidebarEnabled(next: boolean): void {
  if (sidebarEnabled === next) return
  sidebarEnabled = next
  for (const listener of sidebarEnabledListeners) listener()
}

export function subscribeSidebarEnabled(listener: Listener): () => void {
  sidebarEnabledListeners.add(listener)
  return () => {
    sidebarEnabledListeners.delete(listener)
  }
}

let sessionActionDeclared = false
const sessionActionListeners = new Set<Listener>()

export function getSessionActionDeclared(): boolean {
  return sessionActionDeclared
}

export function setSessionActionDeclared(next: boolean): void {
  if (sessionActionDeclared === next) return
  sessionActionDeclared = next
  for (const listener of sessionActionListeners) listener()
}

export function subscribeSessionActionDeclared(listener: Listener): () => void {
  sessionActionListeners.add(listener)
  return () => {
    sessionActionListeners.delete(listener)
  }
}
