/**
 * Client 侧本地前缀复用与匹配算法：
 * 当用户已经获取了候选预测词，在用户继续敲击键盘输入时：
 * 若当前新输入的文本与候选项的前缀完全吻合，则直接在本地截取剩余后缀，
 * 避免对大模型产生重复的网络与 Token 开销。
 */

/**
 * 匹配本地预测前缀并返回剩余待补全文本
 * @param candidate 预测候选文本（完整预测内容）
 * @param baseDraft 产生该预测时的基础草稿
 * @param currentDraft 用户当前最新的草稿
 * @returns 剩余文本（以幽灵文本渲染），若不匹配或已完全输入则返回 null
 */
export function matchLocalPredictionPrefix(
  candidate: string,
  baseDraft: string,
  currentDraft: string,
): string | null {
  if (!candidate || candidate.trim() === '') return null

  // 如果基础草稿不为空且当前草稿不是以基础草稿开头，说明用户发生了回退或跳跃编辑，失效
  if (baseDraft !== '' && !currentDraft.startsWith(baseDraft)) {
    return null
  }

  // 计算用户自该候选产生后新打出的字符
  const typedDelta = currentDraft.slice(baseDraft.length)

  // 如果用户还没打新字，直接返回完整 candidate
  if (typedDelta === '') {
    return candidate
  }

  // 检查新打出的字符是否与 candidate 的前缀匹配
  if (candidate.startsWith(typedDelta)) {
    const remaining = candidate.slice(typedDelta.length)
    // 如果已经全部敲完了，不再显示预测
    return remaining.length > 0 ? remaining : null
  }

  // 用户敲的内容与候选不吻合，本地缓存失效
  return null
}
