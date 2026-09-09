export type PrefillResult = 'ready' | 'workspace' | 'draft' | 'busy'
export type DraftPresenceSource = { getSnapshot: () => boolean; subscribe: (listener: () => void) => () => void }
type DraftState = { getSnapshot: () => { draft: string }; subscribe: (listener: () => void) => () => void }

/** 跟随当前会话的原草稿状态，覆盖输入、粘贴、历史召回和任务预填。 */
export function createDraftPresenceSource(selection: Pick<DraftState, 'subscribe'>, resolve: () => DraftState | undefined): DraftPresenceSource {
  return {
    getSnapshot: () => (resolve()?.getSnapshot().draft.length ?? 0) > 0,
    subscribe: listener => {
      let current: DraftState | undefined
      let offInput = () => {}
      const bind = () => {
        const next = resolve()
        if (next !== current) {
          offInput()
          current = next
          offInput = next?.subscribe(listener) ?? (() => {})
        }
        listener()
      }
      const offSelection = selection.subscribe(bind)
      bind()
      return () => { offSelection(); offInput() }
    },
  }
}
type DraftInput = {
  state: { getSnapshot: () => { phase: string; draft: string; imageIds: readonly unknown[]; occurrences: readonly unknown[] } }
  setDraft: (text: string) => void
}

/** 任务建议只能填入空闲且空白的草稿，不覆盖附件、提及或正在提交的内容。 */
export function prefillNewConversation(input: DraftInput | undefined, text: string): PrefillResult {
  if (input === undefined) return 'workspace'
  const state = input.state.getSnapshot()
  if (state.phase !== 'plain') return 'busy'
  if (state.draft.trim() !== '' || state.imageIds.length > 0 || state.occurrences.length > 0) return 'draft'
  input.setDraft(text)
  return 'ready'
}
