//#region src/business-api.ts
const CODEX_UI_API_BASE = "/api/dsh-codex-ui";
const CODEX_UI_API_ENDPOINTS = Object.freeze({
	dependencies: `${CODEX_UI_API_BASE}/dependencies`,
	openInExplorer: `${CODEX_UI_API_BASE}/open-in-explorer`,
	preferences: `${CODEX_UI_API_BASE}/preferences`,
	sessionMove: `${CODEX_UI_API_BASE}/session-move`,
	settingsSkin: `${CODEX_UI_API_BASE}/settings-skin`,
	composer: `${CODEX_UI_API_BASE}/composer`
});
//#endregion
export { CODEX_UI_API_ENDPOINTS as t };
