export const CODEX_UI_API_BASE = '/api/michengai/dsh-codex-ui'

/** 请求重启时携带一次性令牌的请求头（客户端与 Host 共用）。 */
export const CODEX_UI_RESTART_HEADER = 'x-dcu-restart-key'

export const CODEX_UI_API_ENDPOINTS = Object.freeze({
  dependencies: `${CODEX_UI_API_BASE}/dependencies`,
  settingsSkin: `${CODEX_UI_API_BASE}/settings-skin`,
  composer: `${CODEX_UI_API_BASE}/composer`,
  composerPrediction: `${CODEX_UI_API_BASE}/composer/prediction`,
  sidebar: `${CODEX_UI_API_BASE}/sidebar`,
  sections: `${CODEX_UI_API_BASE}/sections`,
  theme: `${CODEX_UI_API_BASE}/theme`,
  desktopMenu: `${CODEX_UI_API_BASE}/desktop-menu`,
})
