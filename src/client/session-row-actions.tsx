import { useEffect, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Modal, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import { NS } from './locales.ts'
import { readSessionIds, SESSION_PINS_STORAGE_KEY, SESSION_UNREAD_STORAGE_KEY, toggleSessionId, writeSessionIds } from './session-manager.ts'
import { copySessionLink, SessionHoverCard } from './session-tree.tsx'
import { useHoverDispatch, useHoverValue } from './hover-shell.tsx'
import { browserStorage } from './tree-expansion.ts'
import { userErrorText } from './user-error.ts'

export type DialogTarget = { id: string; title: string }

type SessionActions = {
  archiveSession: (sessionId: SessionId) => Promise<void>
  deleteSession: (sessionId: SessionId) => Promise<void>
  forkSession: (sessionId: SessionId) => Promise<void>
  renameSession: (sessionId: SessionId, title: string) => Promise<void>
}

function storage(): Storage | undefined {
  return browserStorage()
}

/** 频道/定时共用的本地置顶与未读标记。 */
export function useSessionFlags(current?: string) {
  const [pinnedSessionIds, setPinnedSessionIds] = useState(() => readSessionIds(storage(), SESSION_PINS_STORAGE_KEY))
  const [unreadSessionIds, setUnreadSessionIds] = useState(() => readSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY))
  useEffect(() => { writeSessionIds(storage(), SESSION_PINS_STORAGE_KEY, pinnedSessionIds) }, [pinnedSessionIds])
  useEffect(() => { writeSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY, unreadSessionIds) }, [unreadSessionIds])
  useEffect(() => {
    if (current !== undefined) setUnreadSessionIds(ids => ids.filter(id => id !== current))
  }, [current])
  return { pinnedSessionIds, setPinnedSessionIds, unreadSessionIds, setUnreadSessionIds }
}

export function SessionHoverCardLayer() {
  const tip = useHoverValue()
  const { keepTip, hideTip } = useHoverDispatch()
  if (tip === undefined) return null
  return <SessionHoverCard tip={tip} onEnter={keepTip} onLeave={hideTip} />
}

export function useBusyAction(t: TranslateNS<typeof NS>, onSuccess?: () => void) {
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const busyRef = useRef<string>()
  const run = async (key: string, action: () => Promise<unknown>): Promise<void> => {
    if (busyRef.current !== undefined) return
    busyRef.current = key
    setBusy(key)
    setError(undefined)
    try { await action(); onSuccess?.() } catch (reason) { setError(userErrorText(reason, t)) } finally { busyRef.current = undefined; setBusy(undefined) }
  }
  return { busy, error, setError, run }
}

/** 频道/定时共用的重命名、删除对话框与菜单动作分派。 */
export function useSessionDialogs(actions: SessionActions, flags: ReturnType<typeof useSessionFlags>, run: (key: string, action: () => Promise<unknown>) => Promise<void>, closeMenu: () => void) {
  const [renameTarget, setRenameTarget] = useState<DialogTarget>()
  const [deleteTarget, setDeleteTarget] = useState<DialogTarget>()
  const [renameDraft, setRenameDraft] = useState('')
  const submitRename = (): void => {
    if (renameTarget === undefined || renameDraft.trim() === '') return
    void run('rename', async () => {
      await actions.renameSession(renameTarget.id as SessionId, renameDraft.trim())
      setRenameTarget(undefined)
    })
  }
  const submitDelete = (): void => {
    if (deleteTarget === undefined) return
    const target = deleteTarget
    void run('delete', async () => {
      await actions.deleteSession(target.id as SessionId)
      flags.setPinnedSessionIds(ids => ids.filter(id => id !== target.id))
      flags.setUnreadSessionIds(ids => ids.filter(id => id !== target.id))
      setDeleteTarget(undefined)
    })
  }
  const handleAction = (action: string, id: string, title: string): void => {
    if (action === 'rename') { setRenameTarget({ id, title }); setRenameDraft(title); closeMenu() }
    if (action === 'pin') { flags.setPinnedSessionIds(ids => toggleSessionId(ids, id)); closeMenu() }
    if (action === 'unread') { flags.setUnreadSessionIds(ids => toggleSessionId(ids, id)); closeMenu() }
    if (action === 'archive') void run('archive', () => actions.archiveSession(id as SessionId))
    if (action === 'delete') { setDeleteTarget({ id, title }); closeMenu() }
    if (action === 'fork') void run('fork', () => actions.forkSession(id as SessionId))
    if (action === 'copyTitle') void run('copy', async () => { await writeClipboard(title) })
    if (action === 'copyId') void run('copy', async () => { await writeClipboard(id) })
    if (action === 'copyLink') void run('copy', async () => { await writeClipboard(copySessionLink(id)) })
  }
  return { renameTarget, deleteTarget, renameDraft, setRenameDraft, setRenameTarget, setDeleteTarget, submitRename, submitDelete, handleAction }
}

type SessionModalsProps = {
  t: TranslateNS<typeof NS>
  busy?: string
  error?: string
  renameTarget?: DialogTarget
  deleteTarget?: DialogTarget
  renameDraft: string
  setRenameDraft: (value: string) => void
  setRenameTarget: (value: DialogTarget | undefined) => void
  setDeleteTarget: (value: DialogTarget | undefined) => void
  setError: (value: string | undefined) => void
  submitRename: () => void
  submitDelete: () => void
}

export function SessionModals({ t, busy, error, renameTarget, deleteTarget, renameDraft, setRenameDraft, setRenameTarget, setDeleteTarget, setError, submitRename, submitDelete }: SessionModalsProps) {
  const deleting = busy === 'delete'
  return <>
    <Modal open={renameTarget !== undefined} onClose={() => { setRenameTarget(undefined); setError(undefined) }} closeLabel={t('sessions.close')} title={t('sessions.rename')} description={t('sessions.renameDescription')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" onClick={() => { setRenameTarget(undefined) }}>{t('sessions.cancel')}</Button><Button variant="primary" disabled={busy !== undefined || renameDraft.trim() === ''} onClick={submitRename}>{t('sessions.save')}</Button></div>}>
      <input className="dcu-wb-rename-input" aria-label={t('sessions.rename')} value={renameDraft} autoFocus onFocus={event => { event.target.select() }} onChange={event => { setRenameDraft(event.target.value); setError(undefined) }} onKeyDown={event => { if (event.key === 'Enter') submitRename() }} />
      {error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}
    </Modal>
    <Modal open={deleteTarget !== undefined} onClose={() => { if (!deleting) { setDeleteTarget(undefined); setError(undefined) } }} closeLabel={t('sessions.close')} title={t('sessions.delete')} footer={<div className="dcu-wb-rename-actions"><Button variant="outline" disabled={deleting} onClick={() => { setDeleteTarget(undefined); setError(undefined) }}>{t('sessions.cancel')}</Button><Button variant="outline" className="dcu-wb-delete-button" disabled={deleting} onClick={submitDelete}>{t('sessions.delete')}</Button></div>}>
      <p className="dcu-wb-delete-copy">{deleteTarget === undefined ? '' : t('sessions.deleteDescription', { name: deleteTarget.title })}</p>
      {deleting && <div className="dcu-wb-error" role="status">{t('sessions.deletePending')}</div>}
      {error !== undefined && <div className="dcu-wb-error" role="alert">{t('sessions.failed', { message: error })}</div>}
    </Modal>
  </>
}
