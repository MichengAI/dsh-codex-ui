//#region src/business-api.ts
const CODEX_UI_API_BASE = "/api/michengai/dsh-codex-ui";
const CODEX_UI_API_ENDPOINTS = Object.freeze({
	dependencies: `${CODEX_UI_API_BASE}/dependencies`,
	settingsSkin: `${CODEX_UI_API_BASE}/settings-skin`,
	composer: `${CODEX_UI_API_BASE}/composer`,
	sidebar: `${CODEX_UI_API_BASE}/sidebar`,
	theme: `${CODEX_UI_API_BASE}/theme`
});
//#endregion
export { CODEX_UI_API_ENDPOINTS as t };
