// 服务端候选与客户端流式预览共用预测协议，避免提示词短暂进入输入框。
export type PredictionMode = 'next' | 'continue'

export const PREDICTION_CUES = {
  next: "Predict the user's next message.",
  continue: 'Write only the continuation text.',
} as const

export const PREDICTION_LABELS = {
  conversation: 'Conversation tail (oldest first):',
  tools: 'Recent tool activity (oldest first):',
  draft: 'Draft text ending at the caret:',
} as const

export const NO_PREDICTION = 'NONE'

export function isNoPrediction(text: string): boolean {
  return text.trim().toUpperCase() === NO_PREDICTION
}

export function predictionLineIdentity(text: string): string {
  return text.replace(/[.:!?]+$/u, '').trim().toLocaleLowerCase()
}

const LABEL_IDENTITIES = Object.values(PREDICTION_LABELS).map(predictionLineIdentity)
const NO_PREDICTION_IDENTITY = predictionLineIdentity(NO_PREDICTION)

/** 只对未结束的末行暂缓显示可能还在输出中的控制文本。 */
export function isPredictionPromptEcho(identity: string, cueIdentity: string, partial = false): boolean {
  if (identity === '') return true
  const matches = (marker: string) => identity === marker
    || (identity.startsWith(marker) && /[ .:!?]/u.test(identity.charAt(marker.length)))
    || (partial && marker.startsWith(identity))

  return (cueIdentity !== '' && matches(cueIdentity))
    || LABEL_IDENTITIES.some(matches)
    || (partial && NO_PREDICTION_IDENTITY.startsWith(identity))
}
