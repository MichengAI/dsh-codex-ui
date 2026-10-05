import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { DirectoryFlowOwnerProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { WorkspaceShortcutSource } from './workspace-shortcuts.ts'

export function WorkspaceShortcutBridge({ source, openSearch, startSession, renderDirectoryFlow, t }: {
  source: WorkspaceShortcutSource
  openSearch: () => void
  startSession: (id: string) => void
  renderDirectoryFlow: (owner: DirectoryFlowOwnerProps) => ReactNode
  t: (key: 'workspace.addFailed' | 'sessions.close') => string
}) {
  const { searchRequest, addRequested, bindings } = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot)
  const seenSearch = useRef(searchRequest)
  const openSearchRef = useRef(openSearch)
  openSearchRef.current = openSearch
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const mounted = useRef(true)
  const pending = useRef(false)
  const currentBindings = useRef(bindings)
  currentBindings.current = bindings
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { pending.current = false; setBusy(false); setError(undefined) }, [bindings])
  useEffect(() => {
    if (searchRequest === seenSearch.current) return
    seenSearch.current = searchRequest
    bindings?.closeAddWorkspace()
    openSearchRef.current()
  }, [searchRequest, bindings])
  useEffect(() => {
    bindings?.setDirectoryBusy(addRequested || busy || error !== undefined)
    return () => { bindings?.setDirectoryBusy(false) }
  }, [bindings, addRequested, busy, error])
  const fail = (message: string): void => { bindings?.closeAddWorkspace(); setError(message) }
  const isCurrent = (): boolean => mounted.current && source.getSnapshot().bindings === bindings && currentBindings.current === bindings
  return <>
    {renderDirectoryFlow({
      open: addRequested, busy,
      onCancel: () => { bindings?.closeAddWorkspace() },
      onError: fail,
      onPicked: path => {
        if (!bindings || pending.current) return
        pending.current = true
        setBusy(true)
        void bindings.createWorkspace({ path }).then(workspace => {
          if (!isCurrent()) return
          bindings.closeAddWorkspace()
          startSession(workspace.workspaceId)
        }).catch(reason => {
          if (isCurrent()) fail(reason instanceof Error ? reason.message : String(reason))
        }).finally(() => {
          if (isCurrent()) { pending.current = false; setBusy(false) }
        })
      },
    })}
    <Modal open={error !== undefined} onClose={() => { setError(undefined) }} title={t('workspace.addFailed')}
      closeLabel={t('sessions.close')} footer={<Button onClick={() => { setError(undefined) }}>{t('sessions.close')}</Button>}>
      <p role="alert">{error}</p>
    </Modal>
  </>
}
