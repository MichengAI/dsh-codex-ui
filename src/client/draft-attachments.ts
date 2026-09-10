/** 统一旧版图片草稿与 0.1.5 的通用附件草稿，保护已有附件不被历史召回覆盖。 */
export function hasDraftAttachments(state: { attachmentIds?: readonly unknown[]; imageIds?: readonly unknown[] }): boolean {
  return (state.attachmentIds?.length ?? 0) > 0 || (state.imageIds?.length ?? 0) > 0
}
