window.__ModuleLoader__.load({
	id: "@michengai/dsh-codex-ui",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		_deepseek_ai_dsh_client_ui_primitives = __toESM(_deepseek_ai_dsh_client_ui_primitives, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region src/client/business-request-error.ts
		var BusinessRequestError = class extends Error {
			status;
			constructor(status) {
				super(`业务请求失败：HTTP ${status}`);
				this.status = status;
				this.name = "BusinessRequestError";
			}
		};
		function businessRequestErrorKey(error) {
			if (!(error instanceof BusinessRequestError)) return void 0;
			if (error.status === 401) return "errors.unauthorized";
			if (error.status === 403) return "errors.forbidden";
			if (error.status === 503) return "errors.serviceUnavailable";
		}
		//#endregion
		//#region src/client/host-icons.ts
		/**
		* 宿主通用矢量安全兜底图标（坚决禁止在模块顶层抛出硬异常导致整个客户端猝死）
		*/
		function createFallbackIcon(pathData) {
			return function FallbackIcon(props) {
				return react.default.createElement("svg", {
					xmlns: "http://www.w3.org/2000/svg",
					width: props.size ?? 16,
					height: props.size ?? 16,
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 1.5,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					className: props.className
				}, react.default.createElement("path", { d: pathData }));
			};
		}
		const FALLBACK_CHECK = createFallbackIcon("M3 8.5l3.5 3.5 6.5-7");
		const FALLBACK_DOWNLOAD = createFallbackIcon("M8 2v9m0 0l-3-3m3 3l3-3M3 13h10");
		const FALLBACK_LIST_PEN = createFallbackIcon("M3 4h10M3 8h6M3 12h4m6-3l2 2-5 5H9v-2l5-5z");
		const FALLBACK_LOADING = createFallbackIcon("M8 2a6 6 0 1 0 6 6");
		const FALLBACK_REFRESH = createFallbackIcon("M2.5 8a5.5 5.5 0 1 0 1.2-3.4M2.5 3v3h3");
		/**
		* 跨宿主版本图标安全解析器：按候选名依次匹配（新版 → 老版 → Medium/Regular 变体），
		* 全部缺失时才回退到给到的 fallback；没有 fallback 就抛错（由单测保护）。
		* 生产路径的 `hostIcon` 也走这里 —— 只有一套候选顺序，避免「测试改的是导出函数、线上走的是另一套」。
		*/
		function resolveHostIcon(icons, candidates, fallback) {
			for (const name of candidates) {
				const icon = icons[name];
				if (icon !== void 0) return icon;
			}
			if (fallback !== void 0) return fallback;
			throw new Error(`宿主缺少图标 ${candidates[0] ?? "(空候选)"}`);
		}
		function hostIcon(modern, legacy, fallback) {
			return resolveHostIcon(_deepseek_ai_dsh_client_ui_primitives, [
				modern,
				legacy,
				modern.replace("Medium", "Regular"),
				modern.replace("OutlineMedium", "OutlineRegular")
			], fallback);
		}
		const IconCheckOutlineMedium = hostIcon("IconCheckOutlineMedium", "IconCheckOutline16", FALLBACK_CHECK);
		const IconDownloadOutlineMedium = hostIcon("IconDownloadOutlineMedium", "IconDownloadOutline16", FALLBACK_DOWNLOAD);
		const IconListPenOutlineMedium = hostIcon("IconListPenOutlineMedium", "IconListPenOutline16", FALLBACK_LIST_PEN);
		const IconLoadingOutlineMedium = hostIcon("IconLoadingOutlineMedium", "IconLoadingOutline16", FALLBACK_LOADING);
		const IconRefreshOutlineMedium = hostIcon("IconRefreshOutlineMedium", "IconRefreshOutline16", FALLBACK_REFRESH);
		//#endregion
		//#region src/business-api.ts
		const CODEX_UI_API_BASE = "/api/michengai/dsh-codex-ui";
		/** 请求重启时携带一次性令牌的请求头（客户端与 Host 共用）。 */
		const CODEX_UI_RESTART_HEADER = "x-dcu-restart-key";
		const CODEX_UI_API_ENDPOINTS = Object.freeze({
			dependencies: `${CODEX_UI_API_BASE}/dependencies`,
			settingsSkin: `${CODEX_UI_API_BASE}/settings-skin`,
			composer: `${CODEX_UI_API_BASE}/composer`,
			composerPrediction: `${CODEX_UI_API_BASE}/composer/prediction`,
			composerPredictionStream: `${CODEX_UI_API_BASE}/composer/prediction/stream`,
			sidebar: `${CODEX_UI_API_BASE}/sidebar`,
			sections: `${CODEX_UI_API_BASE}/sections`,
			theme: `${CODEX_UI_API_BASE}/theme`,
			desktopMenu: `${CODEX_UI_API_BASE}/desktop-menu`
		});
		//#endregion
		//#region src/dependencies.ts
		const MANAGED_DEPENDENCIES = [
			{
				id: "ui",
				packageName: "@michengai/dsh-codex-ui"
			},
			{
				id: "experts",
				packageName: "@michengai/dsh-agency-agents"
			},
			{
				id: "skills",
				packageName: "@michengai/dsh-skills-manager"
			},
			{
				id: "archive",
				packageName: "@michengai/dsh-archive-manager"
			},
			{
				id: "im",
				packageName: "@michengai/dsh-im-connect"
			},
			{
				id: "schedule",
				packageName: "@michengai/dsh-automation"
			},
			{
				id: "btw",
				packageName: "@michengai/dsh-btw"
			},
			{
				id: "simplify",
				packageName: "@michengai/dsh-simplify"
			},
			{
				id: "pua",
				packageName: "@michengai/dsh-pua"
			},
			{
				id: "review",
				packageName: "@michengai/dsh-code-review"
			},
			{
				id: "pet",
				packageName: "@michengai/dsh-codex-pet"
			},
			{
				id: "market",
				packageName: "dshmarket"
			}
		];
		//#endregion
		//#region src/client/user-error.ts
		/** 仅显式构造的本地化错误允许原样进入界面。 */
		var UserFacingError = class extends Error {};
		const INSTALL_ERROR_KEYS = [
			[/没有进入当前 Profile|did not enter this profile/i, "about.installUnchanged"],
			[/pnpm 仓库不一致.*停止当前 DSH Web|pnpm store do not match.*stop the current DSH Web/i, "about.installStoreMismatchWeb"],
			[/停止当前 DSH Web|stop the current DSH Web/i, "about.installExitWeb"],
			[/完全退出桌面端|无法覆盖正在运行的插件文件|running plugin files|quit DSH Desktop/i, "about.installExitDesktop"],
			[/DSH Web 终端输出|DSH Web terminal/i, "about.installWebFailed"],
			[/pnpm 仓库不一致|pnpm store do not match/i, "about.installStoreMismatch"],
			[/构建脚本策略|build-script policy/i, "about.installBuildPolicy"],
			[/找不到 pnpm|pnpm (?:is )?not (?:available|found)/i, "about.installPnpmMissing"],
			[/安装超时|installation timed out/i, "about.installTimeout"],
			[/服务尚未就绪|Profile 信息无效|dependency service is not ready/i, "about.installServiceUnavailable"],
			[/已有依赖安装正在进行|已有安装任务|already in progress/i, "about.installBusy"],
			[/旧套件成员|legacy suite/i, "about.installSuiteUnsupported"]
		];
		/** 安装错误保留用户可执行的处理建议，但不直接展示 Host 原文。 */
		function installErrorText(error, t) {
			const requestKey = businessRequestErrorKey(error);
			if (requestKey !== void 0) return t(requestKey);
			if (error instanceof UserFacingError) return error.message;
			const message = error instanceof Error ? error.message : String(error);
			const match = INSTALL_ERROR_KEYS.find(([pattern]) => pattern.test(message));
			if (match !== void 0) return t(match[1]);
			return t("about.installFailed");
		}
		//#endregion
		//#region src/client/section-card-styles.ts
		/**
		* 设置页卡片的共享结构样式。
		*
		* `AboutSection` 下的每张卡片（如 `ThemeSettingsCard`、`ComposerSettingsCard`）均统一引用本模块，
		* 保证单一事实源，避免重复定义与样式漂移。
		*/
		const SECTION_CARD_CSS = `
.dcu-section-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
  background: var(--dsw-alias-bg-layer-2, #18181b);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  margin-bottom: 16px;
}
body:not([data-ds-dark-theme]) .dcu-section-card {
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  border-color: var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
}
html[data-dsh-glass] .dcu-section-card {
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
html[data-dsh-glass] body:not([data-ds-dark-theme]) .dcu-section-card {
  background: var(--dsw-alias-bg-layer-2, #ffffff) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
.dcu-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.dcu-section-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.dcu-section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: var(--dsw-alias-label-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.dcu-section-desc {
  margin: 0;
  font-size: 13px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
`;
		/** 设置行（左文案 + 右侧控件）。与 `.dcu-theme-row` 同构，命名独立以免互相依赖。 */
		const SETTINGS_ROW_CSS = `
.dcu-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.dcu-settings-row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.dcu-settings-row-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
}
.dcu-settings-row-hint {
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-label-tertiary);
}
`;
		//#endregion
		//#region src/client/theme/glass-css.gen.ts
		/**
		* AUTO-GENERATED by scripts/gen-glass-css.mjs — do not edit by hand.
		* The glass stylesheet text, generated from
		* src/client/glass/glass.module.css on every build. The browser half
		* mounts this text as a <style> tag only while the glass layer is on
		* (item II — lazy CSS), so editing the stylesheet means editing
		* glass.module.css and rebuilding.
		*/
		const GLASS_CSS_TEXT = "[data-dsh-glass] body{--dsh-glass-card:color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(52% * var(--dsh-glass-frost,1)), transparent);--dsh-glass-card-raised:color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(64% * var(--dsh-glass-frost,1)), transparent);--dsh-glass-card-hover:color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(76% * var(--dsh-glass-frost,1)), transparent);--dsh-glass-rim:color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent);--dsh-glass-rim-soft:color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);--dsh-glass-rim-strong:color-mix(in srgb, var(--dsw-alias-label-primary) 30%, transparent);--dsh-glass-edge:inset 0 1px 0 #ffffff6b;--dsh-glass-drop:0 10px 32px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 38%, transparent);--dsh-glass-input-shadow:0 1px 2px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 65%, transparent), 0 8px 24px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 80%, transparent);--dsh-glass-ground:color-mix(in srgb, color-mix(in srgb, var(--dsw-alias-bg-base), #fff calc(var(--dsh-glass-brightness-white,0) * 100%)), #000 calc(var(--dsh-glass-brightness-black,0) * 100%));--dsh-glass-ambience:calc(1 - var(--dsh-glass-brightness-white,0) - var(--dsh-glass-brightness-black,0));--dsh-glass-wash-tint:#fff;--dsh-glass-wash-mix:22%}[data-dsh-glass] body[data-ds-dark-theme]{--dsh-glass-rim:color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent);--dsh-glass-rim-soft:color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent);--dsh-glass-rim-strong:color-mix(in srgb, var(--dsw-alias-label-primary) 30%, transparent);--dsh-glass-edge:inset 0 1px 0 #ffffff14;--dsh-glass-drop:0 10px 32px #02060e73;--dsh-glass-input-shadow:0 1px 2px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 65%, transparent), 0 8px 24px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 80%, transparent);--dsh-glass-wash-tint:var(--dsw-alias-bg-layer-1);--dsh-glass-wash-mix:68%}[data-dsh-glass] body,[data-dsh-glass] [data-dsh-glass-ground-sample]{background:  radial-gradient(calc(58% * var(--dsh-glass-glow-size,1)) calc(46% * var(--dsh-glass-glow-size,1)) at 18% 6%, color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) calc(12% * var(--dsh-glass-ambience) * var(--dsh-glass-glow,0) * var(--dsh-glass-glow-strength,1)), transparent), transparent 68%),  radial-gradient(calc(48% * var(--dsh-glass-glow-size,1)) calc(42% * var(--dsh-glass-glow-size,1)) at 86% 14%, color-mix(in srgb, var(--dsw-alias-state-success-tertiary) calc(10% * var(--dsh-glass-ambience) * var(--dsh-glass-glow,0) * var(--dsh-glass-glow-strength,1)), transparent), transparent 62%),  linear-gradient(165deg, color-mix(in srgb, var(--dsh-glass-ground), var(--dsh-glass-wash-tint) calc(var(--dsh-glass-wash-mix) * var(--dsh-glass-ambience))) 0%, var(--dsh-glass-ground) 55%, color-mix(in srgb, var(--dsh-glass-ground), #000 calc(5% * var(--dsh-glass-ambience))) 100%)}[data-dsh-glass] [data-dsh-glass-frame],[data-dsh-glass] [data-phase],[data-dsh-glass] [data-dsh-glass-details],[data-dsh-glass-float] [data-dsh-glass-frame]>[class*=centerCol]{background:0 0}[data-dsh-glass-float] [data-phase=active] header{z-index:8;position:relative}[data-dsh-glass-float] [class*=banner]{position:static}[data-dsh-glass-float] [data-phase=active] [data-conversation-scroll]{margin-top:-95px;padding-top:107px}[data-dsh-glass] [data-phase] [class*=composerSeat][class*=composerSeat]{background:0 0}[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar]>[class*=dock],[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar]>[data-composer-dock]{position:relative}[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar]>[class*=dock]:before,[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar]>[data-composer-dock]:before{content:\"\";left:calc(-1 * var(--dsh-composer-side-clearance,16px));right:calc(-1 * var(--dsh-composer-side-clearance,16px));z-index:-1;pointer-events:none;background:color-mix(in srgb, color-mix(in srgb, var(--dsh-glass-ground), #000 calc(5% * var(--dsh-glass-ambience))) calc(70% + 10% * var(--dsh-glass-frost,1)), transparent);height:calc(100% + 12px);backdrop-filter:blur(var(--dsh-glass-blur,14px));position:absolute;bottom:-4px;-webkit-mask-image:linear-gradient(#0000 0,#000 18px);mask-image:linear-gradient(#0000 0,#000 18px)}[data-dsh-glass] [data-dsh-glass-fade]{z-index:7;pointer-events:none;backdrop-filter:blur(5px);background:#ffffff2e;height:13px;position:fixed;left:0;right:0}[data-dsh-glass] body[data-ds-dark-theme] [data-dsh-glass-fade]{background:#00000024}[data-dsh-glass] [data-dsh-glass-fade=top]{top:0;-webkit-mask-image:linear-gradient(#000 0%,#0000 100%);mask-image:linear-gradient(#000 0%,#0000 100%)}[data-dsh-glass][data-windows-titlebar] [data-dsh-glass-fade=top]{display:none}[data-dsh-glass] [data-dsh-glass-fade=bottom]{bottom:0;-webkit-mask-image:linear-gradient(#0000 0%,#000 100%);mask-image:linear-gradient(#0000 0%,#000 100%)}[data-dsh-glass-float] [data-menu-material=translucent],[data-dsh-glass-float] [role=menu]:not([data-menu-material]):not([data-menu-material] *),[data-dsh-glass-float] [role=dialog],[data-dsh-glass-float] [role=alert],[data-dsh-glass-float] [data-trigger-menu],[data-dsh-glass-float] [data-dsh-glass-surface]{border-radius:14px}[data-dsh-glass-float] [role=menuitem],[data-dsh-glass-float] [role=tooltip],[data-dsh-glass-float] [class*=pill]{border-radius:8px}[data-dsh-glass-float] button[class*=button]{border-radius:10px}[data-dsh-glass-float] [class*=iconButton],[data-dsh-glass-float] [class*=searchButton]{border-radius:8px}[data-dsh-glass-float] [class*=block]{--dsl-code-block-border-radius:14px;--dsl-diff-radius:14px;--dsl-read-radius:14px;--dsl-terminal-radius:14px;--dsl-web-radius:14px;--dsl-search-radius:14px;border-radius:14px}[data-dsh-glass-float] [data-dsh-glass-add]{background:var(--dsh-glass-card-raised);border:1px solid var(--dsh-glass-rim);box-shadow:var(--dsh-glass-edge);backdrop-filter:blur(var(--dsh-glass-blur,14px))}[data-dsh-glass-float] [data-dsh-glass-add]:hover:not(:disabled){background:var(--dsh-glass-card-hover)}[data-dsh-glass-float] [data-dsh-glass-surface]{background:var(--dsh-glass-card-raised);border:1px solid var(--dsh-glass-rim-soft);box-shadow:var(--dsh-glass-edge);backdrop-filter:blur(var(--dsh-glass-blur,14px))}[data-dsh-glass-float] [data-dsh-glass-surface]:hover:not(:disabled){background:var(--dsh-glass-card-hover)}[data-dsh-glass-float] [data-conversation-scroll] [class*=bubble]{border:1px solid var(--dsh-glass-rim-soft);background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(46% * var(--dsh-glass-frost,1)), transparent);border-radius:14px}[data-dsh-glass-float] [class*=card]{border-radius:14px}[data-dsh-glass-float] [data-reader-reasoning-card]:not([data-overflow=false][data-expanded=false]),[data-dsh-glass-compat] [data-reader-reasoning-card]:not([data-overflow=false][data-expanded=false]){background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) calc(52% * var(--dsh-glass-frost,1)), transparent);border-color:var(--dsh-glass-rim-soft);border-radius:14px}html[data-dsh-glass-float] [data-changed-files],html[data-dsh-glass-float] [data-presented-file]{--changes-fill:var(--dsh-glass-card);--deliverable-fill:var(--dsh-glass-card);border-color:var(--dsh-glass-rim-soft);border-radius:14px}html[data-dsh-glass-float] [data-presented-file],html[data-dsh-glass-float] [data-changed-files]{background:var(--dsh-glass-card)}html[data-dsh-glass-float] [data-changed-files]>:first-child,html[data-dsh-glass-float] [data-changed-files] ul>li>:first-child,html[data-dsh-glass-float] [data-changed-files] ul{background:0 0}html[data-dsh-glass-float] [data-changed-files] ul{border-top:.5px solid var(--dsh-glass-rim-soft)}html[data-dsh-glass-float] [data-changed-files]>:first-child>:first-child,html[data-dsh-glass-float] [data-presented-file]>:first-child{background:var(--dsh-glass-card-raised)}html[data-dsh-glass-float] [data-turn-trigger]{background:var(--dsh-glass-card);border-color:var(--dsh-glass-rim-soft);border-radius:14px}html[data-dsh-glass-float] [data-turn-trigger]:hover{background:var(--dsh-glass-card-hover)}[data-dsh-glass] [data-dsh-glass-settings]{--dsh-glass-settings-raised:calc(38% + 38% * var(--dsh-glass-frost,1));--dsh-glass-settings-soft:calc(30% + 30% * var(--dsh-glass-frost,1));--dsw-alias-bg-module-platform:color-mix(in srgb, var(--dsw-static-neutral-bluish-800) var(--dsh-glass-settings-raised), transparent);--dsw-alias-bg-layer-3:color-mix(in srgb, var(--dsw-static-neutral-bluish-800) var(--dsh-glass-settings-soft), transparent);--dsw-alias-bg-layer-2:color-mix(in srgb, var(--dsw-static-neutral-bluish-850) var(--dsh-glass-settings-raised), transparent);--dsw-alias-bg-layer-1:color-mix(in srgb, var(--dsw-static-neutral-bluish-850) var(--dsh-glass-settings-soft), transparent);--dsw-specific-sidebar-nav-item-active:color-mix(in srgb, var(--dsw-static-neutral-bluish-750) var(--dsh-glass-settings-raised), transparent);--dsw-specific-sidebar-nav-item-hover:color-mix(in srgb, var(--dsw-static-neutral-bluish-850) var(--dsh-glass-settings-soft), transparent)}[data-dsh-glass] body:not([data-ds-dark-theme]) [data-dsh-glass-settings]{--dsw-alias-bg-module-platform:color-mix(in srgb, var(--dsw-static-neutral-bluish-60) var(--dsh-glass-settings-raised), transparent);--dsw-alias-bg-layer-3:color-mix(in srgb, var(--dsw-static-neutral-bluish-00) var(--dsh-glass-settings-soft), transparent);--dsw-alias-bg-layer-2:color-mix(in srgb, var(--dsw-static-neutral-bluish-00) var(--dsh-glass-settings-raised), transparent);--dsw-alias-bg-layer-1:color-mix(in srgb, var(--dsw-static-neutral-bluish-00) var(--dsh-glass-settings-soft), transparent);--dsw-specific-sidebar-nav-item-active:color-mix(in srgb, var(--dsw-static-neutral-bluish-100) var(--dsh-glass-settings-raised), transparent);--dsw-specific-sidebar-nav-item-hover:color-mix(in srgb, var(--dsw-static-neutral-bluish-75) var(--dsh-glass-settings-soft), transparent)}[data-dsh-glass-float] [data-phase] header:not([class*=headerBlank]){width:100%;margin:var(--dsh-glass-gap,12px) auto 0;max-width:min(calc(var(--dsh-chat-user-width,clamp(680px, calc(var(--dsh-conversation-column-width,1500px) * .64), 920px)) + 32px), calc(100% - 32px));border:1px solid var(--dsh-glass-rim);background:var(--dsh-glass-card);box-shadow:var(--dsh-glass-edge), var(--dsh-glass-drop);backdrop-filter:blur(var(--dsh-glass-blur,14px));border-radius:20px;padding:10px 16px 8px}[data-dsh-glass-float] [data-phase] header:not([class*=headerBlank]):after{display:none}[data-dsh-glass-float] [data-dsh-glass-frame][data-sidebar-collapsed] [data-phase] header:not([class*=headerBlank]){width:auto;margin-left:calc(var(--dsh-glass-gap,12px) + 16px);max-width:none;margin-right:16px}[data-dsh-glass-float] [class*=sidebarCol]{--dsw-specific-sidebar-fill:transparent;z-index:9;margin:var(--dsh-glass-gap,12px);border:1px solid var(--dsh-glass-rim-soft);box-shadow:var(--dsh-glass-drop);border-radius:20px;padding:10px 12px 14px;position:relative;overflow:hidden}[data-dsh-glass-float] [class*=sidebarCol]:before{content:\"\";border-radius:inherit;background:var(--dsh-glass-card);box-shadow:var(--dsh-glass-edge);z-index:-1;pointer-events:none;transition:border-radius .15s var(--ds-ease-in-out);position:absolute;inset:0}[data-dsh-glass-float] body{--dsw-specific-sidebar-fill:color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(52% * var(--dsh-glass-frost,1)), color-mix(in srgb, var(--dsh-glass-ground), var(--dsh-glass-wash-tint) calc(var(--dsh-glass-wash-mix) * var(--dsh-glass-ambience))))!important}[data-dsh-glass-float] [data-dsh-glass-frame][data-sidebar-collapsed] [class*=sidebarCol]{margin:var(--dsh-glass-gap,12px) calc(-1 * min(var(--dsh-glass-gap,12px), 16px)) var(--dsh-glass-gap,12px) var(--dsh-glass-gap,12px);transition:margin .15s var(--ds-ease-in-out), border-radius .15s var(--ds-ease-in-out);border-radius:16px;padding:0}[data-dsh-glass-float] [data-dsh-glass-frame]:not([data-sidebar-collapsed]) [data-dsh-glass-sidebar-root]{width:100%!important}[data-dsh-glass-float] [data-dsh-glass-trajectory]{margin:8px auto var(--dsh-glass-gap,12px);width:calc(100% - 32px);max-width:min(calc(var(--dsh-chat-user-width,clamp(680px, calc(var(--dsh-conversation-column-width,1500px) * .64), 920px)) + 32px), calc(100% - 32px));height:calc(100% - 8px - var(--dsh-glass-gap,12px));border:1px solid var(--dsh-glass-rim);background:var(--dsh-glass-card);box-shadow:var(--dsh-glass-edge), var(--dsh-glass-drop);border-radius:20px;overflow:hidden}[data-dsh-glass-float] [data-dsh-glass-trajectory] [role=toolbar],[data-dsh-glass-float] [data-dsh-glass-trajectory] section[aria-label=Trajectory\\ timeline]{background:0 0}[data-dsh-glass-float] [data-composer-card],[data-dsh-glass-float] [data-composer-card]:after{border-radius:24px}[data-dsh-glass-float] [data-composer-card]{z-index:8;isolation:isolate;border:1px solid var(--dsh-glass-rim-strong);box-shadow:var(--dsh-glass-input-shadow);background:0 0;position:relative}[data-dsh-glass-float] [data-composer-card]:before{content:\"\";z-index:-1;border-radius:inherit;background:var(--dsh-glass-card);box-shadow:var(--dsh-glass-edge);backdrop-filter:blur(var(--dsh-glass-blur,14px));pointer-events:none;position:absolute;inset:0}[data-dsh-glass-float] [data-dsh-glass-inputbar]:not([class*=hero]):not(:has([data-dsh-glass-stats])){padding-bottom:var(--dsh-glass-gap,12px)}[data-dsh-glass-float] [role=treeitem][aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}[data-dsh-glass-float] button[class*=button]:hover:not(:disabled),[data-dsh-glass-float] [role=menuitem]:hover:not(:disabled){box-shadow:0 0 12px color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) 20%, transparent)}[data-dsh-glass-float] [data-menu-material=translucent]:not(:focus-visible){--dsw-menu-surface-fill:var(--dsh-glass-card-raised);--dsw-menu-backdrop-filter:blur(var(--dsh-glass-blur,14px))}[data-dsh-glass-float] body[data-ds-dark-theme] [data-menu-material=translucent]:not(:focus-visible){outline:1px solid var(--dsh-glass-rim-soft);outline-offset:-1px}[data-dsh-glass-float] [role=menu]:not([data-menu-material]):not([data-menu-material] *){background:var(--dsh-glass-card-raised);border:1px solid var(--dsh-glass-rim-soft);backdrop-filter:blur(var(--dsh-glass-blur,14px))}[data-dsh-glass-float] [data-menu-material=translucent]:has([role=group]>[role=menuitemradio]){--dsw-menu-surface-fill:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 70%, transparent)}[data-dsh-glass-float] [data-menu-group]:has(>[role=menuitemradio])>[data-menu-group-heading]{background:var(--dsh-glass-card-raised);backdrop-filter:blur(var(--dsh-glass-blur,14px));border-radius:999px;align-items:center;width:fit-content;margin:3px 0 5px 6px;padding:3px 10px;display:inline-flex}[data-dsh-glass-float] [role=presentation]>[role=dialog][aria-modal=true]{isolation:isolate;backdrop-filter:none;border:1px solid var(--dsh-glass-rim);box-shadow:var(--dsh-glass-edge), var(--dsh-glass-drop);background:0 0;border-radius:20px;position:relative}[data-dsh-glass-float] [role=presentation]>[role=dialog][aria-modal=true]:before{content:\"\";z-index:-1;border-radius:inherit;background:var(--dsh-glass-card-raised);backdrop-filter:blur(var(--dsh-glass-blur,14px));pointer-events:none;position:absolute;inset:0}[data-dsh-glass] [data-conversation-scroll]{text-shadow:0 0 1px #ffffff80}[data-dsh-glass] body[data-ds-dark-theme] [data-conversation-scroll]{text-shadow:0 0 1px #0006}[data-dsh-glass-float] [data-dsh-glass-inputbar] [data-slot]{color:var(--dsw-alias-label-secondary)}[data-dsh-glass]{--dsh-glass-entry-scale:1}[data-dsh-glass-compat]{--dsh-glass-entry-scale:0}[data-dsh-glass] [data-testid^=view-]{animation:dsh-glass-in calc(.26s * var(--dsh-glass-entry-scale,1)) var(--ds-ease-in-out)}[data-dsh-glass] [data-tool]{animation:dsh-glass-rise calc(.3s * var(--dsh-glass-entry-scale,1)) var(--ds-ease-in-out) both}[data-dsh-glass] [role=dialog]{animation:dsh-glass-dialog-in calc(.24s * var(--dsh-glass-entry-scale,1)) var(--ds-ease-in-out)}@keyframes dsh-glass-in{0%{opacity:0}}@keyframes dsh-glass-rise{0%{opacity:0;transform:translateY(6px)}}@keyframes dsh-glass-dialog-in{0%{opacity:0}}[data-dsh-glass] :focus-visible{outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) 85%, transparent);outline-offset:1px}[data-dsh-glass] ::selection{background:color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) 35%, transparent)}[data-dsh-glass-compat] [role=menu]:not([data-menu-material]):not([data-menu-material] *),[data-dsh-glass-compat] [class*=popover],[data-dsh-glass-compat] [class*=dropdown]{backdrop-filter:blur(12px)}[data-dsh-glass-compat] [data-menu-material=translucent]:not(:focus-visible){--dsw-menu-surface-fill:var(--dsh-glass-card-raised);--dsw-menu-backdrop-filter:blur(12px)}/* 有意移除：平铺玻璃模式下右侧栏外壳的 backdrop-filter 会在展开/全屏切换时造成背景透出、收起后白屏（df5eb68 修复，勿随上游基线同步带回） */[data-dsh-glass-compat] [role=menu]:not([data-menu-material]):not([data-menu-material] *),[data-dsh-glass-compat] [class*=popover],[data-dsh-glass-compat] [class*=dropdown]{background:var(--dsh-glass-card-raised)}[data-dsh-glass-compat] [data-composer-card]{isolation:isolate;backdrop-filter:none;background:0 0;position:relative}[data-dsh-glass-compat] [data-composer-card]:before{content:\"\";z-index:-1;border-radius:inherit;background:var(--dsh-glass-card-raised);backdrop-filter:blur(12px);pointer-events:none;position:absolute;inset:0}[data-dsh-glass-compat] [role=menu]:not([data-menu-material]):not([data-menu-material] *):not(:focus-visible),[data-dsh-glass-compat] [data-composer-card]:not(:focus-visible),[data-dsh-glass-compat] [class*=popover]:not(:focus-visible),[data-dsh-glass-compat] [class*=dropdown]:not(:focus-visible){outline:1px solid var(--dsh-glass-rim);outline-offset:-1px}[data-dsh-glass-compat] [role=presentation]>[role=dialog][aria-modal=true]{isolation:isolate;backdrop-filter:none;border:1px solid var(--dsh-glass-rim);box-shadow:var(--dsh-glass-edge), var(--dsh-glass-drop);background:0 0;position:relative}[data-dsh-glass-compat] [role=presentation]>[role=dialog][aria-modal=true]:before{content:\"\";z-index:-1;border-radius:inherit;background:var(--dsh-glass-card-raised);backdrop-filter:blur(var(--dsh-glass-blur,12px));pointer-events:none;position:absolute;inset:0}[data-dsh-glass-settings] [role=menu]:not([data-menu-material]):not([data-menu-material] *),[data-dsh-glass-settings] .dsm-select-menu{background:color-mix(in srgb, var(--dsh-glass-ground) 92%, transparent);backdrop-filter:blur(12px);box-shadow:var(--dsh-glass-drop)}[data-dsh-glass-settings] .dsm-panel-head{isolation:isolate;outline:1px solid var(--dsh-glass-rim-soft);outline-offset:-1px;background:0 0;border-radius:14px;padding:6px 12px 4px}[data-dsh-glass-settings] .dsm-panel-head:before{content:\"\";z-index:-1;border-radius:inherit;background:color-mix(in srgb, var(--dsh-glass-ground) 78%, transparent);backdrop-filter:blur(12px);pointer-events:none;position:absolute;inset:0}@media (prefers-reduced-motion:reduce){[data-dsh-glass] [data-testid^=view-],[data-dsh-glass] [data-tool],[data-dsh-glass] [role=dialog]{animation:none}}";
		//#endregion
		//#region src/client/theme/glass-seams.ts
		const SEAMS = [
			{
				attribute: "data-dsh-glass-frame",
				selector: ":has(> [class*=\"sidebarCol\"])"
			},
			{
				attribute: "data-dsh-glass-sidebar-root",
				selector: "[class*=\"sidebarCol\"] [class*=\"root\"]",
				first: true
			},
			{
				attribute: "data-dsh-glass-surface",
				selector: "button[class*=\"newSession\"]"
			},
			{
				attribute: "data-dsh-glass-trajectory",
				selector: "[data-conversation-composer-overlay]"
			},
			{
				attribute: "data-dsh-glass-details",
				selector: "[class*=\"rightbarCol\"] [data-sidebar-right-panel], [class*=\"detailsCol\"] [class*=\"root\"]",
				first: true
			},
			{
				attribute: "data-dsh-glass-inputbar",
				selector: ":has(> [data-composer-card])"
			},
			{
				attribute: "data-dsh-glass-add",
				selector: "[data-composer-card] [class*=\"add\"]"
			},
			{
				attribute: "data-dsh-glass-stats",
				selector: "[data-slot=\"conversation.composer.dock\"] > *, [data-slot=\"conversation.composer.dock\"] [class*=\"root\"]"
			},
			{
				attribute: "data-dsh-glass-settings",
				selector: ":has(> [role=\"dialog\"][aria-modal=\"true\"])"
			}
		];
		function stamp(seam) {
			if (seam.first) {
				const el = document.querySelector(seam.selector);
				if (el !== null && !el.hasAttribute(seam.attribute)) el.setAttribute(seam.attribute, "");
				return;
			}
			for (const el of document.querySelectorAll(seam.selector)) if (!el.hasAttribute(seam.attribute)) el.setAttribute(seam.attribute, "");
		}
		const COMPOSER_SURFACE_ATTRIBUTE = "data-dcu-glass-composer-surface";
		function stampAll() {
			for (const seam of SEAMS) stamp(seam);
			for (const card of document.querySelectorAll("[data-composer-card]")) {
				if (card.querySelector(`:scope > [${COMPOSER_SURFACE_ATTRIBUTE}]`)) continue;
				const surface = document.createElement("div");
				surface.setAttribute(COMPOSER_SURFACE_ATTRIBUTE, "");
				surface.setAttribute("aria-hidden", "true");
				card.prepend(surface);
			}
		}
		/**
		* Stamp the seams once, then keep them stamped as React remounts nodes.
		*
		* The observer callback is debounced through `requestAnimationFrame` (item
		* N): DSH chat streaming mutates the DOM per token, and re-stamping on
		* every single mutation would re-run every selector per token. One frame
		* merges all mutations into one `stampAll()` — a streamed burst of N
		* mutations costs 1 stamp pass, and a frame with no mutations costs
		* nothing (the dirty flag skips the no-op stamp). Stamping stays idempotent
		* and cheap: `stamp()` only sets attributes that are missing.
		*
		* @returns a disposer that disconnects the observer and cancels any
		*  pending frame.
		*/
		function startGlassSeamStamper() {
			stampAll();
			let frame;
			let dirty = false;
			let disposed = false;
			let lastStampTime = Date.now();
			const MIN_THROTTLE_MS = 150;
			const stampFrame = () => {
				frame = void 0;
				if (!dirty) return;
				const now = Date.now();
				if (now - lastStampTime < MIN_THROTTLE_MS) {
					frame = requestAnimationFrame(stampFrame);
					return;
				}
				dirty = false;
				lastStampTime = now;
				stampAll();
			};
			const schedule = () => {
				if (disposed) return;
				dirty = true;
				if (frame !== void 0) return;
				frame = requestAnimationFrame(stampFrame);
			};
			const observer = new MutationObserver(schedule);
			observer.observe(document.documentElement, {
				childList: true,
				subtree: true
			});
			return () => {
				disposed = true;
				observer.disconnect();
				if (frame !== void 0) cancelAnimationFrame(frame);
				frame = void 0;
				dirty = false;
				for (const surface of document.querySelectorAll(`[${COMPOSER_SURFACE_ATTRIBUTE}]`)) surface.remove();
			};
		}
		//#endregion
		//#region src/client/theme/glass.ts
		/**
		* 玻璃质感（Glassmorphism）与云母模式（Mica）生命周期管理
		* 复用 DSH 官方验证的完整 CSS 规则与 Seam Stamper 打桩机制。
		*/
		const GLASS_PRESETS = {
			clear: {
				id: "clear",
				blur: 0,
				frost: 8
			},
			standard: {
				id: "standard",
				blur: 14,
				frost: 25
			},
			frosted: {
				id: "frosted",
				blur: 20,
				frost: 45
			}
		};
		const GLASS_ATTRIBUTE = "data-dsh-glass";
		const GLASS_FLOAT_ATTRIBUTE = "data-dsh-glass-float";
		const GLASS_COMPAT_ATTRIBUTE = "data-dsh-glass-compat";
		const STYLE_TAG_ID = "dsh-codex-ui-glass-style";
		const GLASS_COMPOSER_CSS = GLASS_CSS_TEXT.replaceAll("[data-dsh-glass-float] [data-composer-card]:before", "[data-dsh-glass-float] [data-composer-card] > [data-dcu-glass-composer-surface]").replaceAll("[data-dsh-glass-compat] [data-composer-card]:before", "[data-dsh-glass-compat] [data-composer-card] > [data-dcu-glass-composer-surface]");
		/** 玻璃层追加样式（拼在生成 CSS 之后，同特异性下后者胜出）；导出以便契约测试断言 */
		const GLASS_EXTRA_CSS = `
/* 插件页顶栏色差彻底消除：静止与滚动吸顶均保持底板透明，与全局背景底色与渐变自然融为一体；吸顶时呈现纯净磨砂与细线悬浮效果 */
[data-dsh-glass] [data-plugin-bar]:before,
[data-dsh-glass] [class*="pageBar"]:before {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  transition: background 0.15s ease !important;
}

[data-dsh-glass] [data-plugin-bar][data-scrolled]:before,
[data-dsh-glass] [data-plugin-bar][data-compact]:before,
[data-dsh-glass] [class*="pageBar"][data-scrolled]:before,
[data-dsh-glass] [class*="pageBar"][data-compact]:before {
  background: transparent !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
}

[data-dsh-glass] [data-plugin-bar][data-compact]:after,
[data-dsh-glass] [class*="pageBar"][data-compact]:after,
[data-dsh-glass] [data-plugin-bar][data-scrolled]:after,
[data-dsh-glass] [class*="pageBar"][data-scrolled]:after {
  content: "" !important;
  position: absolute !important;
  inset-inline: 0 !important;
  bottom: 0 !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  pointer-events: none !important;
}

/* 轨迹视图保持 100% 满宽排版，严禁被云母浮动模式缩减为居中窄列与圆角卡片 */
[data-dsh-glass-float] [data-dsh-glass-trajectory],
[data-dsh-glass] [data-dsh-glass-trajectory],
[data-dsh-glass] [data-conversation-composer-overlay] {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

/* 云母浮动顶栏：浮动排版把滚动内容上提 95px，让它从顶栏下方穿过。
   ⚠ 绝对禁止在滚动容器 [data-conversation-scroll] 上使用 mask-image / clip-path 做顶部淡出：
   Chromium 会让被遮罩的元素成为 backdrop root，导致其内部所有 backdrop-filter（输入卡片、
   底部 dock 磨砂幕布）全部失效 —— 实测在真实宿主里把它设成 blur(24px) 后画面几乎没有任何
   变化（拉普拉斯方差仅降 17%），去掉 mask 后同一处方差降 86%，云母输入框恢复正常磨砂。
   这正是「还是透」的真因：兜底模糊一直在，只是被 mask 变成惰性。
   因此顶部遮挡改为与对标插件一致的做法：不给滚动容器加遮罩，只把顶栏自己的磨砂设为下限值，
   让从顶栏背后穿过的正文被磨砂化开。 */
[data-dsh-glass-float] [data-phase] header:not([class*="headerBlank"]) {
  backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
  -webkit-backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
}

/* 对齐平铺风格（Compat）防漏字规范：将云母输入框卡片底色提升为高遮蔽度的 card-raised，
   并锁定至少 12px 高斯磨砂，将底层滚动的历史文字彻底化开为淡淡的柔和色块，杜绝锐利笔画穿透叠字 */
[data-dsh-glass-float] [data-composer-card] > [data-dcu-glass-composer-surface] {
  background: var(--dsh-glass-card-raised) !important;
  backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
  -webkit-backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
}

/* 平铺（compat）模式的卡片材质由上游固定为 12px，这里不再覆盖，避免浓厚预设把 compat 也带成 20px */

/* dock 磨砂幕布同样只给云母浮动模式加 12px 下限：compat 的 blur 完全交给上游，
   否则 clear 预设（blur:0）会被这条下限悄悄抬到 12px，与「平铺保持原版材质」的约定冲突 */
[data-dsh-glass-float] [data-dsh-glass-inputbar] > [class*="dock"]::before,
[data-dsh-glass-float] [data-dsh-glass-inputbar] > [data-composer-dock]::before {
  backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
  -webkit-backdrop-filter: blur(max(var(--dsh-glass-blur, 12px), 12px)) !important;
}

/* 斜杠指令/快捷指令候选面板（[data-trigger-menu] / Issue #72）：
   该菜单悬浮在输入卡片上方、直接压在滚动消息正文与代码块上。
   通用菜单 raised 填充（约 45%~58%）在密集文字流上无法有效阻断文字穿透（幽灵字叠字）。
   对齐参考插件模型菜单加浓规范，将表面材质提浓至 layer-2 @ 88% 并强化磨砂与边缘描边，同时同步渐隐阴影。 */
[data-trigger-menu] {
  --dsw-menu-surface-fill: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e2e) 88%, transparent) !important;
  --dsw-specific-menu: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e2e) 88%, transparent) !important;
  --dsw-menu-backdrop-filter: blur(24px) saturate(140%) !important;
}
[data-dsh-glass] [data-trigger-menu] {
  outline: 1px solid var(--dsh-glass-rim-soft, rgba(255, 255, 255, 0.12));
  outline-offset: -1px;
}
`;
		let styleTag = null;
		let seamDisposer;
		/**
		* 应用玻璃质感、排版模式与材质预设
		*/
		function applyGlassSettings(options) {
			if (typeof document === "undefined") return;
			const { enabled, mode = "mica", preset = "standard", glow = false } = options;
			const root = document.documentElement;
			if (!enabled) {
				disposeGlassMode();
				return;
			}
			if (!styleTag) {
				styleTag = document.getElementById(STYLE_TAG_ID);
				if (!styleTag) {
					styleTag = document.createElement("style");
					styleTag.id = STYLE_TAG_ID;
					styleTag.textContent = GLASS_COMPOSER_CSS + GLASS_EXTRA_CSS;
				}
			}
			if (!styleTag.isConnected) document.head.appendChild(styleTag);
			root.setAttribute(GLASS_ATTRIBUTE, "");
			const isCompat = mode === "compat";
			root.toggleAttribute(GLASS_FLOAT_ATTRIBUTE, !isCompat);
			root.toggleAttribute(GLASS_COMPAT_ATTRIBUTE, isCompat);
			const spec = GLASS_PRESETS[preset] ?? GLASS_PRESETS.standard;
			const knobs = {
				"--dsh-glass-blur": `${spec.blur}px`,
				"--dsh-glass-frost": String(Math.min(spec.frost / 50, 1.4)),
				"--dsh-glass-brightness-black": "0",
				"--dsh-glass-brightness-white": "0",
				"--dsh-glass-glow": glow ? "1" : "0"
			};
			for (const [prop, val] of Object.entries(knobs)) root.style.setProperty(prop, val);
			if (document.body) for (const [prop, val] of Object.entries(knobs)) document.body.style.setProperty(prop, val);
			if (!seamDisposer) seamDisposer = startGlassSeamStamper();
			ensureGlassFade(!isCompat);
		}
		const FADE_ATTRIBUTE = "data-dsh-glass-fade";
		/** 云母模式挂载顶部渐隐条；平铺模式或关闭玻璃时移除 */
		function ensureGlassFade(enabled) {
			if (typeof document === "undefined") return;
			const existing = document.querySelector(`[${FADE_ATTRIBUTE}="top"]`);
			if (!enabled) {
				existing?.remove();
				return;
			}
			if (existing !== null) return;
			const body = document.body;
			if (body === null) return;
			const fade = document.createElement("div");
			fade.setAttribute(FADE_ATTRIBUTE, "top");
			fade.setAttribute("aria-hidden", "true");
			body.appendChild(fade);
		}
		/**
		* 彻底释放玻璃质感、清理 DOM 属性与样式标签
		*/
		function disposeGlassMode() {
			if (typeof document === "undefined") return;
			const root = document.documentElement;
			root.removeAttribute(GLASS_ATTRIBUTE);
			root.removeAttribute(GLASS_FLOAT_ATTRIBUTE);
			root.removeAttribute(GLASS_COMPAT_ATTRIBUTE);
			ensureGlassFade(false);
			const knobs = [
				"--dsh-glass-blur",
				"--dsh-glass-frost",
				"--dsh-glass-brightness-black",
				"--dsh-glass-brightness-white",
				"--dsh-glass-glow"
			];
			for (const prop of knobs) root.style.removeProperty(prop);
			if (document.body) for (const prop of knobs) document.body.style.removeProperty(prop);
			if (seamDisposer) {
				seamDisposer();
				seamDisposer = void 0;
			}
			if (styleTag && styleTag.parentNode) {
				styleTag.remove();
				styleTag = null;
			}
		}
		//#endregion
		//#region src/client/theme/shiki-tokens.ts
		const COMMON_SHIKI_SURFACE = {
			"--shiki-foreground": "var(--dsw-alias-label-primary)",
			"--shiki-background": "var(--dsw-alias-markdown-code-block)"
		};
		const SHIKI_TOKENS_BY_THEME = {
			"codex-dark": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#d19a66",
				"--shiki-token-string": "#98c379",
				"--shiki-token-comment": "#5c6370",
				"--shiki-token-keyword": "#339cff",
				"--shiki-token-parameter": "#e06c75",
				"--shiki-token-function": "#61afef",
				"--shiki-token-string-expression": "#98c379",
				"--shiki-token-punctuation": "#abb2bf",
				"--shiki-token-link": "#339cff"
			},
			"codex-light": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#986801",
				"--shiki-token-string": "#50a14f",
				"--shiki-token-comment": "#a0a1a7",
				"--shiki-token-keyword": "#0169cc",
				"--shiki-token-parameter": "#e45649",
				"--shiki-token-function": "#4078f2",
				"--shiki-token-string-expression": "#50a14f",
				"--shiki-token-punctuation": "#383a42",
				"--shiki-token-link": "#0169cc"
			},
			"claude-dark": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#c397d8",
				"--shiki-token-string": "#78a98b",
				"--shiki-token-comment": "#87867f",
				"--shiki-token-keyword": "#d97757",
				"--shiki-token-parameter": "#e5b567",
				"--shiki-token-function": "#85a7e9",
				"--shiki-token-string-expression": "#78a98b",
				"--shiki-token-punctuation": "#b4b29a",
				"--shiki-token-link": "#d97757"
			},
			"claude-light": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#6b3f94",
				"--shiki-token-string": "#2e6b4d",
				"--shiki-token-comment": "#827d75",
				"--shiki-token-keyword": "#b53a1a",
				"--shiki-token-parameter": "#8a4f00",
				"--shiki-token-function": "#1d5fb0",
				"--shiki-token-string-expression": "#2e6b4d",
				"--shiki-token-punctuation": "#59564f",
				"--shiki-token-link": "#b53a1a"
			},
			"dracula": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#bd93f9",
				"--shiki-token-string": "#f1fa8c",
				"--shiki-token-comment": "#6272a4",
				"--shiki-token-keyword": "#ff79c6",
				"--shiki-token-parameter": "#ffb86c",
				"--shiki-token-function": "#50fa7b",
				"--shiki-token-string-expression": "#f1fa8c",
				"--shiki-token-punctuation": "#f8f8f2",
				"--shiki-token-link": "#8be9fd"
			},
			"solarized-dark": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#d33682",
				"--shiki-token-string": "#2aa198",
				"--shiki-token-comment": "#586e75",
				"--shiki-token-keyword": "#859900",
				"--shiki-token-parameter": "#cb4b16",
				"--shiki-token-function": "#268bd2",
				"--shiki-token-string-expression": "#2aa198",
				"--shiki-token-punctuation": "#93a1a1",
				"--shiki-token-link": "#268bd2"
			},
			"solarized-light": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#d33682",
				"--shiki-token-string": "#2aa198",
				"--shiki-token-comment": "#93a1a1",
				"--shiki-token-keyword": "#859900",
				"--shiki-token-parameter": "#cb4b16",
				"--shiki-token-function": "#268bd2",
				"--shiki-token-string-expression": "#2aa198",
				"--shiki-token-punctuation": "#586e75",
				"--shiki-token-link": "#268bd2"
			},
			"gruvbox-dark": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#d3869b",
				"--shiki-token-string": "#b8bb26",
				"--shiki-token-comment": "#928374",
				"--shiki-token-keyword": "#fb4934",
				"--shiki-token-parameter": "#83a598",
				"--shiki-token-function": "#fabd2f",
				"--shiki-token-string-expression": "#b8bb26",
				"--shiki-token-punctuation": "#ebdbb2",
				"--shiki-token-link": "#8ec07c"
			},
			"gruvbox-light": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#8f3f71",
				"--shiki-token-string": "#79740e",
				"--shiki-token-comment": "#928374",
				"--shiki-token-keyword": "#9d0006",
				"--shiki-token-parameter": "#076678",
				"--shiki-token-function": "#b57614",
				"--shiki-token-string-expression": "#79740e",
				"--shiki-token-punctuation": "#3c3836",
				"--shiki-token-link": "#427b58"
			},
			"catppuccin-latte": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#fe640b",
				"--shiki-token-string": "#40a02b",
				"--shiki-token-comment": "#7c7f93",
				"--shiki-token-keyword": "#8839ef",
				"--shiki-token-parameter": "#e64553",
				"--shiki-token-function": "#1e66f5",
				"--shiki-token-string-expression": "#40a02b",
				"--shiki-token-punctuation": "#7c7f93",
				"--shiki-token-link": "#1e66f5"
			},
			"catppuccin-frappe": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#ef9f76",
				"--shiki-token-string": "#a6d189",
				"--shiki-token-comment": "#949cbb",
				"--shiki-token-keyword": "#ca9ee6",
				"--shiki-token-parameter": "#ea999c",
				"--shiki-token-function": "#8caaee",
				"--shiki-token-string-expression": "#a6d189",
				"--shiki-token-punctuation": "#949cbb",
				"--shiki-token-link": "#8caaee"
			},
			"catppuccin-macchiato": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#f5a97f",
				"--shiki-token-string": "#a6da95",
				"--shiki-token-comment": "#939ab7",
				"--shiki-token-keyword": "#c6a0f6",
				"--shiki-token-parameter": "#ee99a0",
				"--shiki-token-function": "#8aadf4",
				"--shiki-token-string-expression": "#a6da95",
				"--shiki-token-punctuation": "#939ab7",
				"--shiki-token-link": "#8aadf4"
			},
			"catppuccin-mocha": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#fab387",
				"--shiki-token-string": "#a6e3a1",
				"--shiki-token-comment": "#9399b2",
				"--shiki-token-keyword": "#cba6f7",
				"--shiki-token-parameter": "#eba0ac",
				"--shiki-token-function": "#89b4fa",
				"--shiki-token-string-expression": "#a6e3a1",
				"--shiki-token-punctuation": "#9399b2",
				"--shiki-token-link": "#89b4fa"
			},
			"cyberpunk": {
				...COMMON_SHIKI_SURFACE,
				"--shiki-token-constant": "#ffd700",
				"--shiki-token-string": "#8cffb0",
				"--shiki-token-comment": "#20943b",
				"--shiki-token-keyword": "#00ff41",
				"--shiki-token-parameter": "#a6ff4d",
				"--shiki-token-function": "#00ff9d",
				"--shiki-token-string-expression": "#8cffb0",
				"--shiki-token-punctuation": "#00cc34",
				"--shiki-token-link": "#00ff88"
			}
		};
		//#endregion
		//#region src/client/theme/palettes.ts
		const CATPPUCCIN_LATTE_THEME = {
			id: "catppuccin-latte",
			colorScheme: "light",
			tokens: {
				...SHIKI_TOKENS_BY_THEME["catppuccin-latte"],
				"--dsw-static-amber-100": "color-mix(in srgb, #fe640b 20%, #eff1f5)",
				"--dsw-static-amber-400": "color-mix(in srgb, #fe640b 70%, #eff1f5)",
				"--dsw-static-amber-500": "#fe640b",
				"--dsw-static-amber-600": "#fe640b",
				"--dsw-static-amber-900": "color-mix(in srgb, #fe640b 32%, #eff1f5)",
				"--dsw-static-blue-100": "color-mix(in srgb, #1e66f5 22%, #eff1f5)",
				"--dsw-static-blue-300": "color-mix(in srgb, #1e66f5 48%, #eff1f5)",
				"--dsw-static-blue-400": "color-mix(in srgb, #1e66f5 65%, #eff1f5)",
				"--dsw-static-blue-450": "color-mix(in srgb, #1e66f5 82%, #eff1f5)",
				"--dsw-static-blue-500": "#1e66f5",
				"--dsw-static-blue-50": "color-mix(in srgb, #1e66f5 8%, #eff1f5)",
				"--dsw-static-blue-50p": "color-mix(in srgb, #1e66f5 12%, #eff1f5)",
				"--dsw-static-blue-600": "color-mix(in srgb, #1e66f5 82%, #eff1f5)",
				"--dsw-static-blue-75": "color-mix(in srgb, #1e66f5 16%, #eff1f5)",
				"--dsw-static-blue-800": "color-mix(in srgb, #1e66f5 50%, #eff1f5)",
				"--dsw-static-blue-900": "color-mix(in srgb, #1e66f5 30%, #4c4f69)",
				"--dsw-static-blue-950": "color-mix(in srgb, #1e66f5 26%, #eff1f5)",
				"--dsw-static-deepseek-100": "color-mix(in srgb, #1e66f5 22%, #eff1f5)",
				"--dsw-static-deepseek-200": "color-mix(in srgb, #1e66f5 34%, #eff1f5)",
				"--dsw-static-deepseek-300": "color-mix(in srgb, #1e66f5 48%, #eff1f5)",
				"--dsw-static-deepseek-400": "color-mix(in srgb, #1e66f5 65%, #eff1f5)",
				"--dsw-static-deepseek-450": "color-mix(in srgb, #1e66f5 82%, #eff1f5)",
				"--dsw-static-deepseek-500": "#1e66f5",
				"--dsw-static-deepseek-50": "color-mix(in srgb, #1e66f5 8%, #eff1f5)",
				"--dsw-static-deepseek-600": "color-mix(in srgb, #1e66f5 82%, #eff1f5)",
				"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #1e66f5 66%, #eff1f5)",
				"--dsw-static-deepseek-800": "color-mix(in srgb, #1e66f5 50%, #eff1f5)",
				"--dsw-static-deepseek-900": "color-mix(in srgb, #1e66f5 38%, #eff1f5)",
				"--dsw-static-green-100": "color-mix(in srgb, #40a02b 18%, #eff1f5)",
				"--dsw-static-green-400": "color-mix(in srgb, #40a02b 80%, #eff1f5)",
				"--dsw-static-green-500": "#40a02b",
				"--dsw-static-green-500-a08": "color-mix(in srgb, #40a02b 8%, transparent)",
				"--dsw-static-green-500-a12": "color-mix(in srgb, #40a02b 12%, transparent)",
				"--dsw-static-green-900": "color-mix(in srgb, #40a02b 30%, #eff1f5)",
				"--dsw-static-neutral-00": "#eff1f5",
				"--dsw-static-neutral-1000": "#4c4f69",
				"--dsw-static-neutral-100": "#bcc0cc",
				"--dsw-static-neutral-150": "#acb0be",
				"--dsw-static-neutral-200": "#9ca0b0",
				"--dsw-static-neutral-250": "#9ca0b0",
				"--dsw-static-neutral-300": "#8c8fa1",
				"--dsw-static-neutral-400": "#7c7f93",
				"--dsw-static-neutral-500": "#6c6f85",
				"--dsw-static-neutral-50": "#e6e9ef",
				"--dsw-static-neutral-550": "#6c6f85",
				"--dsw-static-neutral-600": "#5c5f77",
				"--dsw-static-neutral-700": "#5c5f77",
				"--dsw-static-neutral-800": "#4c4f69",
				"--dsw-static-neutral-850": "#4c4f69",
				"--dsw-static-neutral-900": "#4c4f69",
				"--dsw-static-neutral-bluish-00": "#eff1f5",
				"--dsw-static-neutral-bluish-1000": "#4c4f69",
				"--dsw-static-neutral-bluish-100": "#bcc0cc",
				"--dsw-static-neutral-bluish-150": "#acb0be",
				"--dsw-static-neutral-bluish-200": "#9ca0b0",
				"--dsw-static-neutral-bluish-300": "#8c8fa1",
				"--dsw-static-neutral-bluish-400": "#7c7f93",
				"--dsw-static-neutral-bluish-500": "#6c6f85",
				"--dsw-static-neutral-bluish-50": "#e6e9ef",
				"--dsw-static-neutral-bluish-600": "#5c5f77",
				"--dsw-static-neutral-bluish-60": "#e6e9ef",
				"--dsw-static-neutral-bluish-700": "#5c5f77",
				"--dsw-static-neutral-bluish-750": "#4c4f69",
				"--dsw-static-neutral-bluish-75": "#ccd0da",
				"--dsw-static-neutral-bluish-800": "#4c4f69",
				"--dsw-static-neutral-bluish-850": "#4c4f69",
				"--dsw-static-neutral-bluish-875": "#4c4f69",
				"--dsw-static-neutral-bluish-900": "#4c4f69",
				"--dsw-static-neutral-bluish-950": "#4c4f69",
				"--dsw-static-red-100": "color-mix(in srgb, #d20f39 20%, #eff1f5)",
				"--dsw-static-red-400": "color-mix(in srgb, #d20f39 70%, #eff1f5)",
				"--dsw-static-red-400-a12": "color-mix(in srgb, #db5371 12%, transparent)",
				"--dsw-static-red-500": "#d20f39",
				"--dsw-static-red-50": "color-mix(in srgb, #d20f39 10%, #eff1f5)",
				"--dsw-static-red-600": "#d20f39",
				"--dsw-static-red-600-a08": "color-mix(in srgb, #d20f39 8%, transparent)",
				"--dsw-static-red-900": "color-mix(in srgb, #d20f39 34%, #eff1f5)",
				"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
				"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-700)",
				"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.24)",
				"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.12)",
				"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
				"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
				"--dsw-alias-bg-mask-drop": "rgba(255, 255, 255, 0.7)",
				"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-60)",
				"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-bluish-60)",
				"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-150)",
				"--dsw-alias-bg-skeleton": "rgba(0, 0, 0, 0.04)",
				"--dsw-alias-border-inverted2": "rgba(0, 0, 0, 0)",
				"--dsw-alias-border-inverted": "rgba(0, 0, 0, 0)",
				"--dsw-alias-border-l1": "rgba(0, 0, 0, 0.04)",
				"--dsw-alias-border-l2-darkmode-thin": "rgba(0, 0, 0, 0.1)",
				"--dsw-alias-border-l2": "rgba(0, 0, 0, 0.1)",
				"--dsw-alias-border-l3": "rgba(0, 0, 0, 0.12)",
				"--dsw-alias-border-l4": "rgba(0, 0, 0, 0.16)",
				"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-1000)",
				"--dsw-alias-brand-primary-new-colorprimary-new-color": "#1e66f5",
				"--dsw-alias-brand-primary": "var(--dsw-static-neutral-bluish-1000)",
				"--dsw-alias-brand-text": "var(--dsw-static-neutral-bluish-1000)",
				"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-700)",
				"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-75)",
				"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-500)",
				"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-100)",
				"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-150)",
				"--dsw-alias-button-info-fill": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-button-info-hover": "var(--dsw-static-deepseek-400)",
				"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-100)",
				"--dsw-alias-button-primary-fill": "var(--dsw-alias-brand-primary)",
				"--dsw-alias-button-primary-hover": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
				"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
				"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
				"--dsw-alias-interactive-bg-active": "rgba(38, 49, 72, 0.1)",
				"--dsw-alias-interactive-bg-hover-accent": "rgba(38, 49, 72, 0.14)",
				"--dsw-alias-interactive-bg-hover-danger": "rgba(236, 19, 19, 0.05)",
				"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-75)",
				"--dsw-alias-interactive-bg-hover": "rgba(38, 49, 72, 0.06)",
				"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-400)",
				"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-500) 70%, var(--dsw-static-blue-950))",
				"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-deepseek-500) 30%, var(--dsw-static-blue-950))",
				"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-200)",
				"--dsw-alias-label-primary-bluish": "var(--dsw-static-blue-900)",
				"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-950)",
				"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-1000)",
				"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-700)",
				"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-1000) 30%, transparent)",
				"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-600)",
				"--dsw-alias-menu-icon": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-link": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-100)",
				"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-75)",
				"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-50)",
				"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-60)",
				"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-75)",
				"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-200)",
				"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-200)",
				"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-300)",
				"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-300)",
				"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-100)",
				"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a08)",
				"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-600-a08)",
				"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a08)",
				"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 4%, transparent)",
				"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
				"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-600-a08)",
				"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 4%, transparent)",
				"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
				"--dsw-alias-state-error-primary": "var(--dsw-static-red-600)",
				"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
				"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-300)",
				"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
				"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
				"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-100)",
				"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
				"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
				"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
				"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-100)",
				"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
				"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-markdown-code-block)",
				"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-hover)",
				"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
				"--dsw-specific-bubble-highlight": "var(--dsw-static-deepseek-200)",
				"--dsw-specific-bubble": "var(--dsw-static-deepseek-50)",
				"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
				"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-60)",
				"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-deepseek-100)",
				"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-100)",
				"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-75)",
				"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-60)",
				"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 58%, transparent)"
			}
		};
		const CATPPUCCIN_FRAPPE_THEME = {
			id: "catppuccin-frappe",
			colorScheme: "dark",
			tokens: {
				...SHIKI_TOKENS_BY_THEME["catppuccin-frappe"],
				"--dsw-static-amber-100": "color-mix(in srgb, #ef9f76 20%, #303446)",
				"--dsw-static-amber-400": "color-mix(in srgb, #ef9f76 70%, #303446)",
				"--dsw-static-amber-500": "#ef9f76",
				"--dsw-static-amber-600": "#ef9f76",
				"--dsw-static-amber-900": "color-mix(in srgb, #ef9f76 18%, #232634)",
				"--dsw-static-blue-100": "color-mix(in srgb, #8caaee 24%, #303446)",
				"--dsw-static-blue-300": "color-mix(in srgb, #8caaee 50%, #303446)",
				"--dsw-static-blue-400": "color-mix(in srgb, #8caaee 66%, #303446)",
				"--dsw-static-blue-450": "color-mix(in srgb, #8caaee 84%, #303446)",
				"--dsw-static-blue-500": "#8caaee",
				"--dsw-static-blue-50": "color-mix(in srgb, #8caaee 10%, #303446)",
				"--dsw-static-blue-50p": "color-mix(in srgb, #8caaee 14%, #303446)",
				"--dsw-static-blue-600": "color-mix(in srgb, #8caaee 84%, #303446)",
				"--dsw-static-blue-75": "color-mix(in srgb, #8caaee 18%, #303446)",
				"--dsw-static-blue-800": "color-mix(in srgb, #8caaee 18%, #232634)",
				"--dsw-static-blue-900": "color-mix(in srgb, #8caaee 14%, #232634)",
				"--dsw-static-blue-950": "color-mix(in srgb, #8caaee 10%, #232634)",
				"--dsw-static-deepseek-100": "color-mix(in srgb, #8caaee 24%, #303446)",
				"--dsw-static-deepseek-200": "color-mix(in srgb, #8caaee 36%, #303446)",
				"--dsw-static-deepseek-300": "color-mix(in srgb, #8caaee 50%, #303446)",
				"--dsw-static-deepseek-400": "color-mix(in srgb, #8caaee 66%, #303446)",
				"--dsw-static-deepseek-450": "color-mix(in srgb, #8caaee 84%, #303446)",
				"--dsw-static-deepseek-500": "#8caaee",
				"--dsw-static-deepseek-50": "color-mix(in srgb, #8caaee 10%, #303446)",
				"--dsw-static-deepseek-600": "color-mix(in srgb, #8caaee 84%, #303446)",
				"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #8caaee 68%, #303446)",
				"--dsw-static-deepseek-800": "color-mix(in srgb, #8caaee 18%, #232634)",
				"--dsw-static-deepseek-900": "color-mix(in srgb, #8caaee 14%, #232634)",
				"--dsw-static-green-100": "color-mix(in srgb, #a6d189 18%, #303446)",
				"--dsw-static-green-400": "color-mix(in srgb, #a6d189 80%, #303446)",
				"--dsw-static-green-500": "#a6d189",
				"--dsw-static-green-500-a08": "color-mix(in srgb, #a6d189 8%, transparent)",
				"--dsw-static-green-500-a12": "color-mix(in srgb, #a6d189 12%, transparent)",
				"--dsw-static-green-900": "color-mix(in srgb, #a6d189 18%, #232634)",
				"--dsw-static-neutral-00": "#c6d0f5",
				"--dsw-static-neutral-1000": "#232634",
				"--dsw-static-neutral-100": "#a5adce",
				"--dsw-static-neutral-150": "#a5adce",
				"--dsw-static-neutral-200": "#949cbb",
				"--dsw-static-neutral-250": "#949cbb",
				"--dsw-static-neutral-300": "#838ba7",
				"--dsw-static-neutral-400": "#737994",
				"--dsw-static-neutral-500": "#626880",
				"--dsw-static-neutral-50": "#c6d0f5",
				"--dsw-static-neutral-550": "#51576d",
				"--dsw-static-neutral-600": "#51576d",
				"--dsw-static-neutral-700": "#414559",
				"--dsw-static-neutral-800": "#414559",
				"--dsw-static-neutral-850": "#303446",
				"--dsw-static-neutral-900": "#292c3c",
				"--dsw-static-neutral-bluish-00": "#c6d0f5",
				"--dsw-static-neutral-bluish-1000": "#232634",
				"--dsw-static-neutral-bluish-100": "#a5adce",
				"--dsw-static-neutral-bluish-150": "#a5adce",
				"--dsw-static-neutral-bluish-200": "#949cbb",
				"--dsw-static-neutral-bluish-300": "#838ba7",
				"--dsw-static-neutral-bluish-400": "#737994",
				"--dsw-static-neutral-bluish-500": "#626880",
				"--dsw-static-neutral-bluish-50": "#c6d0f5",
				"--dsw-static-neutral-bluish-600": "#51576d",
				"--dsw-static-neutral-bluish-60": "#b5bfe2",
				"--dsw-static-neutral-bluish-700": "#414559",
				"--dsw-static-neutral-bluish-750": "#414559",
				"--dsw-static-neutral-bluish-75": "#b5bfe2",
				"--dsw-static-neutral-bluish-800": "#414559",
				"--dsw-static-neutral-bluish-850": "#303446",
				"--dsw-static-neutral-bluish-875": "#292c3c",
				"--dsw-static-neutral-bluish-900": "#292c3c",
				"--dsw-static-neutral-bluish-950": "#232634",
				"--dsw-static-red-100": "color-mix(in srgb, #e78284 20%, #303446)",
				"--dsw-static-red-400": "color-mix(in srgb, #e78284 70%, #303446)",
				"--dsw-static-red-400-a12": "color-mix(in srgb, #b06b71 12%, transparent)",
				"--dsw-static-red-500": "#e78284",
				"--dsw-static-red-50": "color-mix(in srgb, #e78284 10%, #303446)",
				"--dsw-static-red-600": "#e78284",
				"--dsw-static-red-600-a08": "color-mix(in srgb, #e78284 8%, transparent)",
				"--dsw-static-red-900": "color-mix(in srgb, #e78284 34%, #303446)",
				"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-950)",
				"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-950)",
				"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
				"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-300)",
				"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-875)",
				"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.5)",
				"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.2)",
				"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
				"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
				"--dsw-alias-bg-mask-drop": "rgba(39, 39, 48, 0.7)",
				"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
				"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-700)",
				"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.08)",
				"--dsw-alias-border-inverted2": "rgba(255, 255, 255, 0.08)",
				"--dsw-alias-border-inverted": "rgba(255, 255, 255, 0.06)",
				"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.06)",
				"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.06)",
				"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.12)",
				"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.16)",
				"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.2)",
				"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-brand-primary-new-colorprimary-new-color": "#8caaee",
				"--dsw-alias-brand-primary": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-brand-text": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-600)",
				"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
				"--dsw-alias-button-info-fill": "var(--dsw-static-deepseek-400)",
				"--dsw-alias-button-info-hover": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-button-primary-fill": "var(--dsw-alias-brand-primary)",
				"--dsw-alias-button-primary-hover": "var(--dsw-static-neutral-bluish-100)",
				"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
				"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
				"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
				"--dsw-alias-interactive-bg-active": "rgba(255, 255, 255, 0.14)",
				"--dsw-alias-interactive-bg-hover-accent": "rgba(255, 255, 255, 0.24)",
				"--dsw-alias-interactive-bg-hover-danger": "rgba(242, 90, 90, 0.15)",
				"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-interactive-bg-hover": "rgba(255, 255, 255, 0.08)",
				"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-300)",
				"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
				"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
				"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-400)",
				"--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-75)",
				"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
				"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-150)",
				"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
				"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-200)",
				"--dsw-alias-menu-icon": "var(--dsw-alias-label-primary-dimmed)",
				"--dsw-alias-link": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-800)",
				"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
				"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
				"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
				"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
				"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-800)",
				"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a12)",
				"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-400-a12)",
				"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a12)",
				"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 6%, transparent)",
				"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
				"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-400-a12)",
				"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 6%, transparent)",
				"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
				"--dsw-alias-state-error-primary": "var(--dsw-static-red-400)",
				"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
				"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-600)",
				"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
				"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
				"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)",
				"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
				"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
				"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
				"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)",
				"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-400)",
				"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-interactive-bg-hover)",
				"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-active)",
				"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
				"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
				"--dsw-specific-bubble-highlight": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-specific-bubble": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
				"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 45%, transparent)"
			}
		};
		const CATPPUCCIN_MACCHIATO_THEME = {
			id: "catppuccin-macchiato",
			colorScheme: "dark",
			tokens: {
				...SHIKI_TOKENS_BY_THEME["catppuccin-macchiato"],
				"--dsw-static-amber-100": "color-mix(in srgb, #f5a97f 20%, #24273a)",
				"--dsw-static-amber-400": "color-mix(in srgb, #f5a97f 70%, #24273a)",
				"--dsw-static-amber-500": "#f5a97f",
				"--dsw-static-amber-600": "#f5a97f",
				"--dsw-static-amber-900": "color-mix(in srgb, #f5a97f 18%, #181926)",
				"--dsw-static-blue-100": "color-mix(in srgb, #8aadf4 24%, #24273a)",
				"--dsw-static-blue-300": "color-mix(in srgb, #8aadf4 50%, #24273a)",
				"--dsw-static-blue-400": "color-mix(in srgb, #8aadf4 66%, #24273a)",
				"--dsw-static-blue-450": "color-mix(in srgb, #8aadf4 84%, #24273a)",
				"--dsw-static-blue-500": "#8aadf4",
				"--dsw-static-blue-50": "color-mix(in srgb, #8aadf4 10%, #24273a)",
				"--dsw-static-blue-50p": "color-mix(in srgb, #8aadf4 14%, #24273a)",
				"--dsw-static-blue-600": "color-mix(in srgb, #8aadf4 84%, #24273a)",
				"--dsw-static-blue-75": "color-mix(in srgb, #8aadf4 18%, #24273a)",
				"--dsw-static-blue-800": "color-mix(in srgb, #8aadf4 18%, #181926)",
				"--dsw-static-blue-900": "color-mix(in srgb, #8aadf4 14%, #181926)",
				"--dsw-static-blue-950": "color-mix(in srgb, #8aadf4 10%, #181926)",
				"--dsw-static-deepseek-100": "color-mix(in srgb, #8aadf4 24%, #24273a)",
				"--dsw-static-deepseek-200": "color-mix(in srgb, #8aadf4 36%, #24273a)",
				"--dsw-static-deepseek-300": "color-mix(in srgb, #8aadf4 50%, #24273a)",
				"--dsw-static-deepseek-400": "color-mix(in srgb, #8aadf4 66%, #24273a)",
				"--dsw-static-deepseek-450": "color-mix(in srgb, #8aadf4 84%, #24273a)",
				"--dsw-static-deepseek-500": "#8aadf4",
				"--dsw-static-deepseek-50": "color-mix(in srgb, #8aadf4 10%, #24273a)",
				"--dsw-static-deepseek-600": "color-mix(in srgb, #8aadf4 84%, #24273a)",
				"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #8aadf4 68%, #24273a)",
				"--dsw-static-deepseek-800": "color-mix(in srgb, #8aadf4 18%, #181926)",
				"--dsw-static-deepseek-900": "color-mix(in srgb, #8aadf4 14%, #181926)",
				"--dsw-static-green-100": "color-mix(in srgb, #a6da95 18%, #24273a)",
				"--dsw-static-green-400": "color-mix(in srgb, #a6da95 80%, #24273a)",
				"--dsw-static-green-500": "#a6da95",
				"--dsw-static-green-500-a08": "color-mix(in srgb, #a6da95 8%, transparent)",
				"--dsw-static-green-500-a12": "color-mix(in srgb, #a6da95 12%, transparent)",
				"--dsw-static-green-900": "color-mix(in srgb, #a6da95 18%, #181926)",
				"--dsw-static-neutral-00": "#cad3f5",
				"--dsw-static-neutral-1000": "#181926",
				"--dsw-static-neutral-100": "#a5adcb",
				"--dsw-static-neutral-150": "#a5adcb",
				"--dsw-static-neutral-200": "#939ab7",
				"--dsw-static-neutral-250": "#939ab7",
				"--dsw-static-neutral-300": "#8087a2",
				"--dsw-static-neutral-400": "#6e738d",
				"--dsw-static-neutral-500": "#5b6078",
				"--dsw-static-neutral-50": "#cad3f5",
				"--dsw-static-neutral-550": "#494d64",
				"--dsw-static-neutral-600": "#494d64",
				"--dsw-static-neutral-700": "#363a4f",
				"--dsw-static-neutral-800": "#363a4f",
				"--dsw-static-neutral-850": "#24273a",
				"--dsw-static-neutral-900": "#1e2030",
				"--dsw-static-neutral-bluish-00": "#cad3f5",
				"--dsw-static-neutral-bluish-1000": "#181926",
				"--dsw-static-neutral-bluish-100": "#a5adcb",
				"--dsw-static-neutral-bluish-150": "#a5adcb",
				"--dsw-static-neutral-bluish-200": "#939ab7",
				"--dsw-static-neutral-bluish-300": "#8087a2",
				"--dsw-static-neutral-bluish-400": "#6e738d",
				"--dsw-static-neutral-bluish-500": "#5b6078",
				"--dsw-static-neutral-bluish-50": "#cad3f5",
				"--dsw-static-neutral-bluish-600": "#494d64",
				"--dsw-static-neutral-bluish-60": "#b8c0e0",
				"--dsw-static-neutral-bluish-700": "#363a4f",
				"--dsw-static-neutral-bluish-750": "#363a4f",
				"--dsw-static-neutral-bluish-75": "#b8c0e0",
				"--dsw-static-neutral-bluish-800": "#363a4f",
				"--dsw-static-neutral-bluish-850": "#24273a",
				"--dsw-static-neutral-bluish-875": "#1e2030",
				"--dsw-static-neutral-bluish-900": "#1e2030",
				"--dsw-static-neutral-bluish-950": "#181926",
				"--dsw-static-red-100": "color-mix(in srgb, #ed8796 20%, #24273a)",
				"--dsw-static-red-400": "color-mix(in srgb, #ed8796 70%, #24273a)",
				"--dsw-static-red-400-a12": "color-mix(in srgb, #b16a7a 12%, transparent)",
				"--dsw-static-red-500": "#ed8796",
				"--dsw-static-red-50": "color-mix(in srgb, #ed8796 10%, #24273a)",
				"--dsw-static-red-600": "#ed8796",
				"--dsw-static-red-600-a08": "color-mix(in srgb, #ed8796 8%, transparent)",
				"--dsw-static-red-900": "color-mix(in srgb, #ed8796 34%, #24273a)",
				"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-950)",
				"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-950)",
				"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
				"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-300)",
				"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-875)",
				"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.5)",
				"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.2)",
				"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
				"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
				"--dsw-alias-bg-mask-drop": "rgba(39, 39, 48, 0.7)",
				"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
				"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-700)",
				"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.08)",
				"--dsw-alias-border-inverted2": "rgba(255, 255, 255, 0.08)",
				"--dsw-alias-border-inverted": "rgba(255, 255, 255, 0.06)",
				"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.06)",
				"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.06)",
				"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.12)",
				"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.16)",
				"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.2)",
				"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-brand-primary-new-colorprimary-new-color": "#8aadf4",
				"--dsw-alias-brand-primary": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-brand-text": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-600)",
				"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
				"--dsw-alias-button-info-fill": "var(--dsw-static-deepseek-400)",
				"--dsw-alias-button-info-hover": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-button-primary-fill": "var(--dsw-alias-brand-primary)",
				"--dsw-alias-button-primary-hover": "var(--dsw-static-neutral-bluish-100)",
				"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
				"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
				"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
				"--dsw-alias-interactive-bg-active": "rgba(255, 255, 255, 0.14)",
				"--dsw-alias-interactive-bg-hover-accent": "rgba(255, 255, 255, 0.24)",
				"--dsw-alias-interactive-bg-hover-danger": "rgba(242, 90, 90, 0.15)",
				"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-interactive-bg-hover": "rgba(255, 255, 255, 0.08)",
				"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-300)",
				"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
				"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
				"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-400)",
				"--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-75)",
				"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
				"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-150)",
				"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
				"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-200)",
				"--dsw-alias-menu-icon": "var(--dsw-alias-label-primary-dimmed)",
				"--dsw-alias-link": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-800)",
				"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
				"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
				"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
				"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
				"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-800)",
				"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a12)",
				"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-400-a12)",
				"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a12)",
				"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 6%, transparent)",
				"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
				"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-400-a12)",
				"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 6%, transparent)",
				"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
				"--dsw-alias-state-error-primary": "var(--dsw-static-red-400)",
				"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
				"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-600)",
				"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
				"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
				"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)",
				"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
				"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
				"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
				"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)",
				"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-400)",
				"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-interactive-bg-hover)",
				"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-active)",
				"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
				"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
				"--dsw-specific-bubble-highlight": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-specific-bubble": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
				"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 45%, transparent)"
			}
		};
		const CATPPUCCIN_MOCHA_THEME = {
			id: "catppuccin-mocha",
			colorScheme: "dark",
			tokens: {
				...SHIKI_TOKENS_BY_THEME["catppuccin-mocha"],
				"--dsw-static-amber-100": "color-mix(in srgb, #fab387 20%, #1e1e2e)",
				"--dsw-static-amber-400": "color-mix(in srgb, #fab387 70%, #1e1e2e)",
				"--dsw-static-amber-500": "#fab387",
				"--dsw-static-amber-600": "#fab387",
				"--dsw-static-amber-900": "color-mix(in srgb, #fab387 18%, #11111b)",
				"--dsw-static-blue-100": "color-mix(in srgb, #89b4fa 24%, #1e1e2e)",
				"--dsw-static-blue-300": "color-mix(in srgb, #89b4fa 50%, #1e1e2e)",
				"--dsw-static-blue-400": "color-mix(in srgb, #89b4fa 66%, #1e1e2e)",
				"--dsw-static-blue-450": "color-mix(in srgb, #89b4fa 84%, #1e1e2e)",
				"--dsw-static-blue-500": "#89b4fa",
				"--dsw-static-blue-50": "color-mix(in srgb, #89b4fa 10%, #1e1e2e)",
				"--dsw-static-blue-50p": "color-mix(in srgb, #89b4fa 14%, #1e1e2e)",
				"--dsw-static-blue-600": "color-mix(in srgb, #89b4fa 84%, #1e1e2e)",
				"--dsw-static-blue-75": "color-mix(in srgb, #89b4fa 18%, #1e1e2e)",
				"--dsw-static-blue-800": "color-mix(in srgb, #89b4fa 18%, #11111b)",
				"--dsw-static-blue-900": "color-mix(in srgb, #89b4fa 14%, #11111b)",
				"--dsw-static-blue-950": "color-mix(in srgb, #89b4fa 10%, #11111b)",
				"--dsw-static-deepseek-100": "color-mix(in srgb, #89b4fa 24%, #1e1e2e)",
				"--dsw-static-deepseek-200": "color-mix(in srgb, #89b4fa 36%, #1e1e2e)",
				"--dsw-static-deepseek-300": "color-mix(in srgb, #89b4fa 50%, #1e1e2e)",
				"--dsw-static-deepseek-400": "color-mix(in srgb, #89b4fa 66%, #1e1e2e)",
				"--dsw-static-deepseek-450": "color-mix(in srgb, #89b4fa 84%, #1e1e2e)",
				"--dsw-static-deepseek-500": "#89b4fa",
				"--dsw-static-deepseek-50": "color-mix(in srgb, #89b4fa 10%, #1e1e2e)",
				"--dsw-static-deepseek-600": "color-mix(in srgb, #89b4fa 84%, #1e1e2e)",
				"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #89b4fa 68%, #1e1e2e)",
				"--dsw-static-deepseek-800": "color-mix(in srgb, #89b4fa 18%, #11111b)",
				"--dsw-static-deepseek-900": "color-mix(in srgb, #89b4fa 14%, #11111b)",
				"--dsw-static-green-100": "color-mix(in srgb, #a6e3a1 18%, #1e1e2e)",
				"--dsw-static-green-400": "color-mix(in srgb, #a6e3a1 80%, #1e1e2e)",
				"--dsw-static-green-500": "#a6e3a1",
				"--dsw-static-green-500-a08": "color-mix(in srgb, #a6e3a1 8%, transparent)",
				"--dsw-static-green-500-a12": "color-mix(in srgb, #a6e3a1 12%, transparent)",
				"--dsw-static-green-900": "color-mix(in srgb, #a6e3a1 18%, #11111b)",
				"--dsw-static-neutral-00": "#cdd6f4",
				"--dsw-static-neutral-1000": "#11111b",
				"--dsw-static-neutral-100": "#a6adc8",
				"--dsw-static-neutral-150": "#a6adc8",
				"--dsw-static-neutral-200": "#9399b2",
				"--dsw-static-neutral-250": "#9399b2",
				"--dsw-static-neutral-300": "#7f849c",
				"--dsw-static-neutral-400": "#6c7086",
				"--dsw-static-neutral-500": "#585b70",
				"--dsw-static-neutral-50": "#cdd6f4",
				"--dsw-static-neutral-550": "#45475a",
				"--dsw-static-neutral-600": "#45475a",
				"--dsw-static-neutral-700": "#313244",
				"--dsw-static-neutral-800": "#313244",
				"--dsw-static-neutral-850": "#1e1e2e",
				"--dsw-static-neutral-900": "#181825",
				"--dsw-static-neutral-bluish-00": "#cdd6f4",
				"--dsw-static-neutral-bluish-1000": "#11111b",
				"--dsw-static-neutral-bluish-100": "#a6adc8",
				"--dsw-static-neutral-bluish-150": "#a6adc8",
				"--dsw-static-neutral-bluish-200": "#9399b2",
				"--dsw-static-neutral-bluish-300": "#7f849c",
				"--dsw-static-neutral-bluish-400": "#6c7086",
				"--dsw-static-neutral-bluish-500": "#585b70",
				"--dsw-static-neutral-bluish-50": "#cdd6f4",
				"--dsw-static-neutral-bluish-600": "#45475a",
				"--dsw-static-neutral-bluish-60": "#bac2de",
				"--dsw-static-neutral-bluish-700": "#313244",
				"--dsw-static-neutral-bluish-750": "#313244",
				"--dsw-static-neutral-bluish-75": "#bac2de",
				"--dsw-static-neutral-bluish-800": "#313244",
				"--dsw-static-neutral-bluish-850": "#1e1e2e",
				"--dsw-static-neutral-bluish-875": "#181825",
				"--dsw-static-neutral-bluish-900": "#181825",
				"--dsw-static-neutral-bluish-950": "#11111b",
				"--dsw-static-red-100": "color-mix(in srgb, #f38ba8 20%, #1e1e2e)",
				"--dsw-static-red-400": "color-mix(in srgb, #f38ba8 70%, #1e1e2e)",
				"--dsw-static-red-400-a12": "color-mix(in srgb, #b36a83 12%, transparent)",
				"--dsw-static-red-500": "#f38ba8",
				"--dsw-static-red-50": "color-mix(in srgb, #f38ba8 10%, #1e1e2e)",
				"--dsw-static-red-600": "#f38ba8",
				"--dsw-static-red-600-a08": "color-mix(in srgb, #f38ba8 8%, transparent)",
				"--dsw-static-red-900": "color-mix(in srgb, #f38ba8 34%, #1e1e2e)",
				"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-950)",
				"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-950)",
				"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
				"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-300)",
				"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-875)",
				"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.5)",
				"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.2)",
				"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
				"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
				"--dsw-alias-bg-mask-drop": "rgba(39, 39, 48, 0.7)",
				"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
				"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-700)",
				"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.08)",
				"--dsw-alias-border-inverted2": "rgba(255, 255, 255, 0.08)",
				"--dsw-alias-border-inverted": "rgba(255, 255, 255, 0.06)",
				"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.06)",
				"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.06)",
				"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.12)",
				"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.16)",
				"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.2)",
				"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-brand-primary-new-colorprimary-new-color": "#89b4fa",
				"--dsw-alias-brand-primary": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-brand-text": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-600)",
				"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
				"--dsw-alias-button-info-fill": "var(--dsw-static-deepseek-400)",
				"--dsw-alias-button-info-hover": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-button-primary-fill": "var(--dsw-alias-brand-primary)",
				"--dsw-alias-button-primary-hover": "var(--dsw-static-neutral-bluish-100)",
				"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
				"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
				"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
				"--dsw-alias-interactive-bg-active": "rgba(255, 255, 255, 0.14)",
				"--dsw-alias-interactive-bg-hover-accent": "rgba(255, 255, 255, 0.24)",
				"--dsw-alias-interactive-bg-hover-danger": "rgba(242, 90, 90, 0.15)",
				"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-interactive-bg-hover": "rgba(255, 255, 255, 0.08)",
				"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-300)",
				"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
				"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
				"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-400)",
				"--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-75)",
				"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
				"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
				"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-150)",
				"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
				"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-200)",
				"--dsw-alias-menu-icon": "var(--dsw-alias-label-primary-dimmed)",
				"--dsw-alias-link": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-800)",
				"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
				"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
				"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
				"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
				"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
				"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-800)",
				"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a12)",
				"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-400-a12)",
				"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a12)",
				"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 6%, transparent)",
				"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
				"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-400-a12)",
				"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 6%, transparent)",
				"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
				"--dsw-alias-state-error-primary": "var(--dsw-static-red-400)",
				"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
				"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-600)",
				"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
				"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
				"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)",
				"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
				"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
				"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
				"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)",
				"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-400)",
				"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
				"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-interactive-bg-hover)",
				"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-active)",
				"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
				"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
				"--dsw-specific-bubble-highlight": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-specific-bubble": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
				"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-900)",
				"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-750)",
				"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-850)",
				"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-800)",
				"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 45%, transparent)"
			}
		};
		const ALL_BUILTIN_THEMES = [
			{
				id: "codex-dark",
				colorScheme: "dark",
				tokens: {
					...SHIKI_TOKENS_BY_THEME["codex-dark"],
					"--dsw-static-amber-100": "color-mix(in srgb, #f59e0b 20%, #18181b)",
					"--dsw-static-amber-400": "color-mix(in srgb, #f59e0b 70%, #18181b)",
					"--dsw-static-amber-500": "#f59e0b",
					"--dsw-static-amber-600": "#f59e0b",
					"--dsw-static-amber-900": "color-mix(in srgb, #f59e0b 18%, #09090b)",
					"--dsw-static-blue-100": "color-mix(in srgb, #339cff 24%, #18181b)",
					"--dsw-static-blue-300": "color-mix(in srgb, #339cff 50%, #18181b)",
					"--dsw-static-blue-400": "color-mix(in srgb, #339cff 66%, #18181b)",
					"--dsw-static-blue-450": "color-mix(in srgb, #339cff 84%, #18181b)",
					"--dsw-static-blue-500": "#339cff",
					"--dsw-static-blue-50": "color-mix(in srgb, #339cff 10%, #18181b)",
					"--dsw-static-blue-50p": "color-mix(in srgb, #339cff 14%, #18181b)",
					"--dsw-static-blue-600": "color-mix(in srgb, #0169cc 84%, #18181b)",
					"--dsw-static-blue-75": "color-mix(in srgb, #339cff 18%, #18181b)",
					"--dsw-static-blue-800": "color-mix(in srgb, #0169cc 26%, #09090b)",
					"--dsw-static-blue-900": "color-mix(in srgb, #0169cc 18%, #09090b)",
					"--dsw-static-blue-950": "color-mix(in srgb, #0169cc 12%, #09090b)",
					"--dsw-static-deepseek-100": "color-mix(in srgb, #339cff 24%, #18181b)",
					"--dsw-static-deepseek-200": "color-mix(in srgb, #339cff 36%, #18181b)",
					"--dsw-static-deepseek-300": "color-mix(in srgb, #339cff 50%, #18181b)",
					"--dsw-static-deepseek-400": "color-mix(in srgb, #339cff 66%, #18181b)",
					"--dsw-static-deepseek-450": "color-mix(in srgb, #339cff 84%, #18181b)",
					"--dsw-static-deepseek-500": "#339cff",
					"--dsw-static-deepseek-50": "color-mix(in srgb, #339cff 10%, #18181b)",
					"--dsw-static-deepseek-600": "color-mix(in srgb, #0169cc 84%, #18181b)",
					"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #0169cc 68%, #18181b)",
					"--dsw-static-deepseek-800": "color-mix(in srgb, #0169cc 26%, #09090b)",
					"--dsw-static-deepseek-900": "color-mix(in srgb, #0169cc 18%, #09090b)",
					"--dsw-static-green-100": "color-mix(in srgb, #40c977 18%, #18181b)",
					"--dsw-static-green-400": "color-mix(in srgb, #40c977 80%, #18181b)",
					"--dsw-static-green-500": "#40c977",
					"--dsw-static-green-500-a08": "color-mix(in srgb, #40c977 8%, transparent)",
					"--dsw-static-green-500-a12": "color-mix(in srgb, #40c977 12%, transparent)",
					"--dsw-static-green-900": "color-mix(in srgb, #40c977 18%, #09090b)",
					"--dsw-static-neutral-00": "#fafafa",
					"--dsw-static-neutral-1000": "#09090b",
					"--dsw-static-neutral-100": "#e4e4e7",
					"--dsw-static-neutral-150": "#e4e4e7",
					"--dsw-static-neutral-200": "#d4d4d8",
					"--dsw-static-neutral-250": "#d4d4d8",
					"--dsw-static-neutral-300": "#a1a1aa",
					"--dsw-static-neutral-400": "#71717a",
					"--dsw-static-neutral-500": "#52525b",
					"--dsw-static-neutral-50": "#fafafa",
					"--dsw-static-neutral-550": "#3f3f46",
					"--dsw-static-neutral-600": "#3f3f46",
					"--dsw-static-neutral-700": "#27272a",
					"--dsw-static-neutral-800": "#27272a",
					"--dsw-static-neutral-850": "#18181b",
					"--dsw-static-neutral-900": "#121215",
					"--dsw-static-neutral-bluish-00": "#fafafa",
					"--dsw-static-neutral-bluish-1000": "#09090b",
					"--dsw-static-neutral-bluish-100": "#e4e4e7",
					"--dsw-static-neutral-bluish-150": "#e4e4e7",
					"--dsw-static-neutral-bluish-200": "#d4d4d8",
					"--dsw-static-neutral-bluish-300": "#a1a1aa",
					"--dsw-static-neutral-bluish-400": "#71717a",
					"--dsw-static-neutral-bluish-500": "#52525b",
					"--dsw-static-neutral-bluish-50": "#fafafa",
					"--dsw-static-neutral-bluish-600": "#3f3f46",
					"--dsw-static-neutral-bluish-60": "#f4f4f5",
					"--dsw-static-neutral-bluish-700": "#27272a",
					"--dsw-static-neutral-bluish-750": "#27272a",
					"--dsw-static-neutral-bluish-75": "#f4f4f5",
					"--dsw-static-neutral-bluish-800": "#27272a",
					"--dsw-static-neutral-bluish-850": "#18181b",
					"--dsw-static-neutral-bluish-875": "#121215",
					"--dsw-static-neutral-bluish-900": "#121215",
					"--dsw-static-neutral-bluish-950": "#09090b",
					"--dsw-static-red-100": "color-mix(in srgb, #ef4444 20%, #18181b)",
					"--dsw-static-red-400": "color-mix(in srgb, #ef4444 70%, #18181b)",
					"--dsw-static-red-400-a12": "color-mix(in srgb, #b36a83 12%, transparent)",
					"--dsw-static-red-500": "#ef4444",
					"--dsw-static-red-50": "color-mix(in srgb, #ef4444 10%, #18181b)",
					"--dsw-static-red-600": "#ef4444",
					"--dsw-static-red-600-a08": "color-mix(in srgb, #ef4444 8%, transparent)",
					"--dsw-static-red-900": "color-mix(in srgb, #ef4444 34%, #18181b)",
					"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
					"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-875)",
					"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.5)",
					"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.2)",
					"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
					"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
					"--dsw-alias-bg-mask-drop": "rgba(39, 39, 48, 0.7)",
					"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
					"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-border-inverted2": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-border-inverted": "rgba(255, 255, 255, 0.06)",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.06)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.06)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.12)",
					"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.16)",
					"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-brand-primary-new-colorprimary-new-color": "#339cff",
					"--dsw-alias-brand-primary": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-brand-text": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-600)",
					"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-button-info-fill": "var(--dsw-static-deepseek-400)",
					"--dsw-alias-button-info-hover": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-primary-fill": "var(--dsw-alias-brand-primary)",
					"--dsw-alias-button-primary-hover": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
					"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
					"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
					"--dsw-alias-interactive-bg-active": "rgba(255, 255, 255, 0.14)",
					"--dsw-alias-interactive-bg-hover-accent": "rgba(255, 255, 255, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(242, 90, 90, 0.15)",
					"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-interactive-bg-hover": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
					"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
					"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
					"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-menu-icon": "var(--dsw-alias-label-primary-dimmed)",
					"--dsw-alias-link": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-800)",
					"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
					"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
					"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-800)",
					"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 6%, transparent)",
					"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
					"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 6%, transparent)",
					"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
					"--dsw-alias-state-error-primary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-600)",
					"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
					"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
					"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)",
					"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
					"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
					"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
					"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)",
					"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-interactive-bg-hover)",
					"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-active)",
					"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
					"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
					"--dsw-specific-bubble-highlight": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-bubble": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
					"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 45%, transparent)"
				}
			},
			{
				id: "codex-light",
				colorScheme: "light",
				tokens: {
					...SHIKI_TOKENS_BY_THEME["codex-light"],
					"--dsw-static-amber-100": "color-mix(in srgb, #f59e0b 20%, #ffffff)",
					"--dsw-static-amber-400": "color-mix(in srgb, #f59e0b 70%, #ffffff)",
					"--dsw-static-amber-500": "#f59e0b",
					"--dsw-static-amber-600": "#f59e0b",
					"--dsw-static-amber-900": "color-mix(in srgb, #f59e0b 32%, #ffffff)",
					"--dsw-static-blue-100": "color-mix(in srgb, #0169cc 22%, #ffffff)",
					"--dsw-static-blue-300": "color-mix(in srgb, #0169cc 48%, #ffffff)",
					"--dsw-static-blue-400": "color-mix(in srgb, #0169cc 65%, #ffffff)",
					"--dsw-static-blue-450": "color-mix(in srgb, #0169cc 82%, #ffffff)",
					"--dsw-static-blue-500": "#0169cc",
					"--dsw-static-blue-50": "color-mix(in srgb, #0169cc 8%, #ffffff)",
					"--dsw-static-blue-50p": "color-mix(in srgb, #0169cc 12%, #ffffff)",
					"--dsw-static-blue-600": "color-mix(in srgb, #0169cc 82%, #18181b)",
					"--dsw-static-blue-75": "color-mix(in srgb, #0169cc 16%, #ffffff)",
					"--dsw-static-blue-800": "color-mix(in srgb, #0169cc 50%, #18181b)",
					"--dsw-static-blue-900": "color-mix(in srgb, #0169cc 30%, #18181b)",
					"--dsw-static-blue-950": "color-mix(in srgb, #0169cc 16%, #18181b)",
					"--dsw-static-deepseek-100": "color-mix(in srgb, #0169cc 22%, #ffffff)",
					"--dsw-static-deepseek-200": "color-mix(in srgb, #0169cc 34%, #ffffff)",
					"--dsw-static-deepseek-300": "color-mix(in srgb, #0169cc 48%, #ffffff)",
					"--dsw-static-deepseek-400": "color-mix(in srgb, #0169cc 65%, #ffffff)",
					"--dsw-static-deepseek-450": "color-mix(in srgb, #0169cc 82%, #ffffff)",
					"--dsw-static-deepseek-500": "#0169cc",
					"--dsw-static-deepseek-50": "color-mix(in srgb, #0169cc 8%, #ffffff)",
					"--dsw-static-deepseek-600": "color-mix(in srgb, #0169cc 82%, #18181b)",
					"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #0169cc 66%, #18181b)",
					"--dsw-static-deepseek-800": "color-mix(in srgb, #0169cc 50%, #18181b)",
					"--dsw-static-deepseek-900": "color-mix(in srgb, #0169cc 38%, #18181b)",
					"--dsw-static-green-100": "color-mix(in srgb, #00a240 18%, #ffffff)",
					"--dsw-static-green-400": "color-mix(in srgb, #00a240 80%, #ffffff)",
					"--dsw-static-green-500": "#00a240",
					"--dsw-static-green-500-a08": "color-mix(in srgb, #00a240 8%, transparent)",
					"--dsw-static-green-500-a12": "color-mix(in srgb, #00a240 12%, transparent)",
					"--dsw-static-green-900": "color-mix(in srgb, #00a240 30%, #ffffff)",
					"--dsw-static-neutral-00": "#ffffff",
					"--dsw-static-neutral-1000": "#18181b",
					"--dsw-static-neutral-100": "#e4e4e7",
					"--dsw-static-neutral-150": "#d4d4d8",
					"--dsw-static-neutral-200": "#a1a1aa",
					"--dsw-static-neutral-250": "#a1a1aa",
					"--dsw-static-neutral-300": "#71717a",
					"--dsw-static-neutral-400": "#52525b",
					"--dsw-static-neutral-500": "#3f3f46",
					"--dsw-static-neutral-50": "#f8f9fa",
					"--dsw-static-neutral-550": "#3f3f46",
					"--dsw-static-neutral-600": "#27272a",
					"--dsw-static-neutral-700": "#27272a",
					"--dsw-static-neutral-800": "#18181b",
					"--dsw-static-neutral-850": "#18181b",
					"--dsw-static-neutral-900": "#18181b",
					"--dsw-static-neutral-bluish-00": "#ffffff",
					"--dsw-static-neutral-bluish-1000": "#18181b",
					"--dsw-static-neutral-bluish-100": "#e4e4e7",
					"--dsw-static-neutral-bluish-150": "#d4d4d8",
					"--dsw-static-neutral-bluish-200": "#a1a1aa",
					"--dsw-static-neutral-bluish-300": "#71717a",
					"--dsw-static-neutral-bluish-400": "#52525b",
					"--dsw-static-neutral-bluish-500": "#3f3f46",
					"--dsw-static-neutral-bluish-50": "#f8f9fa",
					"--dsw-static-neutral-bluish-600": "#27272a",
					"--dsw-static-neutral-bluish-60": "#f8f9fa",
					"--dsw-static-neutral-bluish-700": "#27272a",
					"--dsw-static-neutral-bluish-750": "#18181b",
					"--dsw-static-neutral-bluish-75": "#f4f4f5",
					"--dsw-static-neutral-bluish-800": "#18181b",
					"--dsw-static-neutral-bluish-850": "#18181b",
					"--dsw-static-neutral-bluish-875": "#18181b",
					"--dsw-static-neutral-bluish-900": "#18181b",
					"--dsw-static-neutral-bluish-950": "#18181b",
					"--dsw-static-red-100": "color-mix(in srgb, #ef4444 20%, #ffffff)",
					"--dsw-static-red-400": "color-mix(in srgb, #ef4444 70%, #ffffff)",
					"--dsw-static-red-400-a12": "color-mix(in srgb, #db5371 12%, transparent)",
					"--dsw-static-red-500": "#ef4444",
					"--dsw-static-red-50": "color-mix(in srgb, #ef4444 10%, #ffffff)",
					"--dsw-static-red-600": "#ef4444",
					"--dsw-static-red-600-a08": "color-mix(in srgb, #ef4444 8%, transparent)",
					"--dsw-static-red-900": "color-mix(in srgb, #ef4444 34%, #ffffff)",
					"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
					"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.24)",
					"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.12)",
					"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
					"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
					"--dsw-alias-bg-mask-drop": "rgba(255, 255, 255, 0.7)",
					"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-bg-skeleton": "rgba(0, 0, 0, 0.04)",
					"--dsw-alias-border-inverted2": "rgba(0, 0, 0, 0)",
					"--dsw-alias-border-inverted": "rgba(0, 0, 0, 0)",
					"--dsw-alias-border-l1": "rgba(0, 0, 0, 0.04)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(0, 0, 0, 0.1)",
					"--dsw-alias-border-l2": "rgba(0, 0, 0, 0.1)",
					"--dsw-alias-border-l3": "rgba(0, 0, 0, 0.12)",
					"--dsw-alias-border-l4": "rgba(0, 0, 0, 0.16)",
					"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-brand-primary-new-colorprimary-new-color": "#0169cc",
					"--dsw-alias-brand-primary": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-brand-text": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-500)",
					"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-button-info-fill": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-button-info-hover": "var(--dsw-static-deepseek-400)",
					"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-button-primary-fill": "var(--dsw-alias-brand-primary)",
					"--dsw-alias-button-primary-hover": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
					"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
					"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
					"--dsw-alias-interactive-bg-active": "rgba(38, 49, 72, 0.1)",
					"--dsw-alias-interactive-bg-hover-accent": "rgba(38, 49, 72, 0.14)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(236, 19, 19, 0.05)",
					"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-interactive-bg-hover": "rgba(38, 49, 72, 0.06)",
					"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-500) 70%, var(--dsw-static-blue-950))",
					"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-deepseek-500) 30%, var(--dsw-static-blue-950))",
					"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-label-primary-bluish": "var(--dsw-static-blue-900)",
					"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-1000) 30%, transparent)",
					"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-600)",
					"--dsw-alias-menu-icon": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-link": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-50)",
					"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-200)",
					"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-200)",
					"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-300)",
					"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-300)",
					"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-100)",
					"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a08)",
					"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-600-a08)",
					"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a08)",
					"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 4%, transparent)",
					"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
					"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-600-a08)",
					"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 4%, transparent)",
					"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
					"--dsw-alias-state-error-primary": "var(--dsw-static-red-600)",
					"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-300)",
					"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
					"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
					"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-100)",
					"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
					"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
					"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
					"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-100)",
					"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
					"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-markdown-code-block)",
					"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-hover)",
					"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
					"--dsw-specific-bubble-highlight": "var(--dsw-static-deepseek-200)",
					"--dsw-specific-bubble": "var(--dsw-static-deepseek-50)",
					"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
					"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-deepseek-100)",
					"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 58%, transparent)"
				}
			},
			{
				id: "claude-dark",
				colorScheme: "dark",
				tokens: {
					...SHIKI_TOKENS_BY_THEME["claude-dark"],
					"--dsw-static-amber-100": "color-mix(in srgb, #d97757 20%, #1f1f1f)",
					"--dsw-static-amber-400": "color-mix(in srgb, #d97757 70%, #1f1f1f)",
					"--dsw-static-amber-500": "#d97757",
					"--dsw-static-amber-600": "#d97757",
					"--dsw-static-amber-900": "color-mix(in srgb, #d97757 18%, #191919)",
					"--dsw-static-blue-100": "color-mix(in srgb, #8ab4f8 24%, #1f1f1f)",
					"--dsw-static-blue-300": "color-mix(in srgb, #8ab4f8 50%, #1f1f1f)",
					"--dsw-static-blue-400": "color-mix(in srgb, #8ab4f8 66%, #1f1f1f)",
					"--dsw-static-blue-450": "color-mix(in srgb, #8ab4f8 84%, #1f1f1f)",
					"--dsw-static-blue-500": "#8ab4f8",
					"--dsw-static-blue-50": "color-mix(in srgb, #8ab4f8 10%, #1f1f1f)",
					"--dsw-static-blue-50p": "color-mix(in srgb, #8ab4f8 14%, #1f1f1f)",
					"--dsw-static-blue-600": "color-mix(in srgb, #5888d4 84%, #1f1f1f)",
					"--dsw-static-blue-75": "color-mix(in srgb, #8ab4f8 18%, #1f1f1f)",
					"--dsw-static-blue-800": "color-mix(in srgb, #5888d4 26%, #191919)",
					"--dsw-static-blue-900": "color-mix(in srgb, #5888d4 18%, #191919)",
					"--dsw-static-blue-950": "color-mix(in srgb, #5888d4 12%, #191919)",
					"--dsw-static-deepseek-100": "color-mix(in srgb, #d97757 24%, #1f1f1f)",
					"--dsw-static-deepseek-200": "color-mix(in srgb, #d97757 36%, #1f1f1f)",
					"--dsw-static-deepseek-300": "color-mix(in srgb, #d97757 50%, #1f1f1f)",
					"--dsw-static-deepseek-400": "color-mix(in srgb, #d97757 66%, #1f1f1f)",
					"--dsw-static-deepseek-450": "color-mix(in srgb, #d97757 84%, #1f1f1f)",
					"--dsw-static-deepseek-500": "#d97757",
					"--dsw-static-deepseek-50": "color-mix(in srgb, #d97757 10%, #1f1f1f)",
					"--dsw-static-deepseek-600": "color-mix(in srgb, #c46343 84%, #1f1f1f)",
					"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #c46343 68%, #1f1f1f)",
					"--dsw-static-deepseek-800": "color-mix(in srgb, #c46343 26%, #191919)",
					"--dsw-static-deepseek-900": "color-mix(in srgb, #c46343 18%, #191919)",
					"--dsw-static-green-100": "color-mix(in srgb, #3d7550 18%, #1f1f1f)",
					"--dsw-static-green-400": "color-mix(in srgb, #3d7550 80%, #1f1f1f)",
					"--dsw-static-green-500": "#3d7550",
					"--dsw-static-green-500-a08": "color-mix(in srgb, #3d7550 8%, transparent)",
					"--dsw-static-green-500-a12": "color-mix(in srgb, #3d7550 12%, transparent)",
					"--dsw-static-green-900": "color-mix(in srgb, #3d7550 18%, #191919)",
					"--dsw-static-neutral-00": "#fdfdfd",
					"--dsw-static-neutral-1000": "#0a0a0a",
					"--dsw-static-neutral-100": "#dedede",
					"--dsw-static-neutral-150": "#dedede",
					"--dsw-static-neutral-200": "#beb6b8",
					"--dsw-static-neutral-250": "#beb6b8",
					"--dsw-static-neutral-300": "#9c9395",
					"--dsw-static-neutral-400": "#776f71",
					"--dsw-static-neutral-500": "#5a5456",
					"--dsw-static-neutral-50": "#f4f4f4",
					"--dsw-static-neutral-550": "#464143",
					"--dsw-static-neutral-600": "#3d383a",
					"--dsw-static-neutral-700": "#323232",
					"--dsw-static-neutral-800": "#262626",
					"--dsw-static-neutral-850": "#212121",
					"--dsw-static-neutral-900": "#191919",
					"--dsw-static-neutral-bluish-00": "#fdfdfd",
					"--dsw-static-neutral-bluish-1000": "#0a0a0a",
					"--dsw-static-neutral-bluish-100": "#dedede",
					"--dsw-static-neutral-bluish-150": "#cfcfcf",
					"--dsw-static-neutral-bluish-200": "#beb6b8",
					"--dsw-static-neutral-bluish-300": "#9c9395",
					"--dsw-static-neutral-bluish-400": "#776f71",
					"--dsw-static-neutral-bluish-500": "#5a5456",
					"--dsw-static-neutral-bluish-50": "#f4f4f4",
					"--dsw-static-neutral-bluish-600": "#3d383a",
					"--dsw-static-neutral-bluish-60": "#e9e9e9",
					"--dsw-static-neutral-bluish-700": "#323232",
					"--dsw-static-neutral-bluish-750": "#2c2c2c",
					"--dsw-static-neutral-bluish-75": "#e0dede",
					"--dsw-static-neutral-bluish-800": "#262626",
					"--dsw-static-neutral-bluish-850": "#212121",
					"--dsw-static-neutral-bluish-875": "#1d1d1d",
					"--dsw-static-neutral-bluish-900": "#191919",
					"--dsw-static-neutral-bluish-950": "#141414",
					"--dsw-static-red-100": "color-mix(in srgb, #c93b2b 20%, #1f1f1f)",
					"--dsw-static-red-400": "color-mix(in srgb, #c93b2b 70%, #1f1f1f)",
					"--dsw-static-red-400-a12": "color-mix(in srgb, #b36a83 12%, transparent)",
					"--dsw-static-red-500": "#c93b2b",
					"--dsw-static-red-50": "color-mix(in srgb, #c93b2b 10%, #1f1f1f)",
					"--dsw-static-red-600": "#c93b2b",
					"--dsw-static-red-600-a08": "color-mix(in srgb, #c93b2b 8%, transparent)",
					"--dsw-static-red-900": "color-mix(in srgb, #c93b2b 34%, #1f1f1f)",
					"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
					"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-875)",
					"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.5)",
					"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.2)",
					"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
					"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
					"--dsw-alias-bg-mask-drop": "rgba(39, 39, 48, 0.7)",
					"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
					"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-border-inverted2": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-border-inverted": "rgba(255, 255, 255, 0.06)",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.09)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.16)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.16)",
					"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.24)",
					"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.32)",
					"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-brand-primary-new-colorprimary-new-color": "#d97757",
					"--dsw-alias-brand-primary": "#d97757",
					"--dsw-alias-brand-text": "#fbfbfb",
					"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-600)",
					"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-button-info-fill": "#d97757",
					"--dsw-alias-button-info-hover": "#eb9170",
					"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-primary-fill": "#d97757",
					"--dsw-alias-button-primary-hover": "#eb9170",
					"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
					"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
					"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
					"--dsw-alias-interactive-bg-active": "rgba(217, 119, 87, 0.3)",
					"--dsw-alias-interactive-bg-hover-accent": "rgba(255, 255, 255, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(242, 90, 90, 0.15)",
					"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-interactive-bg-hover": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
					"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
					"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
					"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-menu-icon": "var(--dsw-alias-label-primary-dimmed)",
					"--dsw-alias-link": "#eaa088",
					"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-800)",
					"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
					"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
					"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-800)",
					"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 6%, transparent)",
					"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
					"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 6%, transparent)",
					"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
					"--dsw-alias-state-error-primary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-600)",
					"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
					"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
					"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)",
					"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
					"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
					"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
					"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)",
					"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-interactive-bg-hover)",
					"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-active)",
					"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
					"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
					"--dsw-specific-bubble-highlight": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-bubble": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
					"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 45%, transparent)"
				}
			},
			{
				id: "claude-light",
				colorScheme: "light",
				tokens: {
					...SHIKI_TOKENS_BY_THEME["claude-light"],
					"--dsw-static-amber-100": "color-mix(in srgb, #d97757 20%, #faf9f5)",
					"--dsw-static-amber-400": "color-mix(in srgb, #d97757 70%, #faf9f5)",
					"--dsw-static-amber-500": "#d97757",
					"--dsw-static-amber-600": "#d97757",
					"--dsw-static-amber-900": "color-mix(in srgb, #d97757 32%, #faf9f5)",
					"--dsw-static-blue-100": "color-mix(in srgb, #184f95 22%, #faf9f5)",
					"--dsw-static-blue-300": "color-mix(in srgb, #184f95 48%, #faf9f5)",
					"--dsw-static-blue-400": "color-mix(in srgb, #184f95 65%, #faf9f5)",
					"--dsw-static-blue-450": "color-mix(in srgb, #184f95 82%, #faf9f5)",
					"--dsw-static-blue-500": "#184f95",
					"--dsw-static-blue-50": "color-mix(in srgb, #184f95 8%, #faf9f5)",
					"--dsw-static-blue-50p": "color-mix(in srgb, #184f95 12%, #faf9f5)",
					"--dsw-static-blue-600": "color-mix(in srgb, #184f95 82%, #1f1e1d)",
					"--dsw-static-blue-75": "color-mix(in srgb, #184f95 16%, #faf9f5)",
					"--dsw-static-blue-800": "color-mix(in srgb, #184f95 50%, #1f1e1d)",
					"--dsw-static-blue-900": "color-mix(in srgb, #184f95 30%, #1f1e1d)",
					"--dsw-static-blue-950": "color-mix(in srgb, #184f95 16%, #1f1e1d)",
					"--dsw-static-deepseek-100": "color-mix(in srgb, #d97757 22%, #faf9f5)",
					"--dsw-static-deepseek-200": "color-mix(in srgb, #d97757 34%, #faf9f5)",
					"--dsw-static-deepseek-300": "color-mix(in srgb, #d97757 48%, #faf9f5)",
					"--dsw-static-deepseek-400": "color-mix(in srgb, #d97757 65%, #faf9f5)",
					"--dsw-static-deepseek-450": "color-mix(in srgb, #d97757 82%, #faf9f5)",
					"--dsw-static-deepseek-500": "#d97757",
					"--dsw-static-deepseek-50": "color-mix(in srgb, #d97757 8%, #faf9f5)",
					"--dsw-static-deepseek-600": "color-mix(in srgb, #d97757 82%, #1f1e1d)",
					"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #d97757 66%, #1f1e1d)",
					"--dsw-static-deepseek-800": "color-mix(in srgb, #d97757 50%, #1f1e1d)",
					"--dsw-static-deepseek-900": "color-mix(in srgb, #d97757 38%, #1f1e1d)",
					"--dsw-static-green-100": "color-mix(in srgb, #00a240 18%, #faf9f5)",
					"--dsw-static-green-400": "color-mix(in srgb, #00a240 80%, #faf9f5)",
					"--dsw-static-green-500": "#00a240",
					"--dsw-static-green-500-a08": "color-mix(in srgb, #00a240 8%, transparent)",
					"--dsw-static-green-500-a12": "color-mix(in srgb, #00a240 12%, transparent)",
					"--dsw-static-green-900": "color-mix(in srgb, #00a240 30%, #faf9f5)",
					"--dsw-static-neutral-00": "#faf9f5",
					"--dsw-static-neutral-1000": "#1f1e1d",
					"--dsw-static-neutral-100": "#e5e1d8",
					"--dsw-static-neutral-150": "#e5e1d8",
					"--dsw-static-neutral-200": "#cbc4b5",
					"--dsw-static-neutral-250": "#cbc4b5",
					"--dsw-static-neutral-300": "#a8a092",
					"--dsw-static-neutral-400": "#8c8477",
					"--dsw-static-neutral-500": "#6f6b63",
					"--dsw-static-neutral-50": "#f5f2eb",
					"--dsw-static-neutral-550": "#645f57",
					"--dsw-static-neutral-600": "#5c5750",
					"--dsw-static-neutral-700": "#47433e",
					"--dsw-static-neutral-800": "#33302c",
					"--dsw-static-neutral-850": "#282623",
					"--dsw-static-neutral-900": "#1f1e1d",
					"--dsw-static-neutral-bluish-00": "#faf9f5",
					"--dsw-static-neutral-bluish-1000": "#1f1e1d",
					"--dsw-static-neutral-bluish-100": "#e5e1d8",
					"--dsw-static-neutral-bluish-150": "#ded8cc",
					"--dsw-static-neutral-bluish-200": "#cbc4b5",
					"--dsw-static-neutral-bluish-300": "#a8a092",
					"--dsw-static-neutral-bluish-400": "#8c8477",
					"--dsw-static-neutral-bluish-500": "#6f6b63",
					"--dsw-static-neutral-bluish-50": "#f5f2eb",
					"--dsw-static-neutral-bluish-600": "#5c5750",
					"--dsw-static-neutral-bluish-60": "#f0ece3",
					"--dsw-static-neutral-bluish-700": "#47433e",
					"--dsw-static-neutral-bluish-750": "#3a3733",
					"--dsw-static-neutral-bluish-75": "#ebe6dc",
					"--dsw-static-neutral-bluish-800": "#33302c",
					"--dsw-static-neutral-bluish-850": "#282623",
					"--dsw-static-neutral-bluish-875": "#242220",
					"--dsw-static-neutral-bluish-900": "#1f1e1d",
					"--dsw-static-neutral-bluish-950": "#141312",
					"--dsw-static-red-100": "color-mix(in srgb, #c93b2b 20%, #faf9f5)",
					"--dsw-static-red-400": "color-mix(in srgb, #c93b2b 70%, #faf9f5)",
					"--dsw-static-red-400-a12": "color-mix(in srgb, #db5371 12%, transparent)",
					"--dsw-static-red-500": "#c93b2b",
					"--dsw-static-red-50": "color-mix(in srgb, #c93b2b 10%, #faf9f5)",
					"--dsw-static-red-600": "#c93b2b",
					"--dsw-static-red-600-a08": "color-mix(in srgb, #c93b2b 8%, transparent)",
					"--dsw-static-red-900": "color-mix(in srgb, #c93b2b 34%, #faf9f5)",
					"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
					"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.24)",
					"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.12)",
					"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
					"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
					"--dsw-alias-bg-mask-drop": "rgba(255, 255, 255, 0.7)",
					"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-bg-skeleton": "rgba(0, 0, 0, 0.04)",
					"--dsw-alias-border-inverted2": "rgba(0, 0, 0, 0)",
					"--dsw-alias-border-inverted": "rgba(0, 0, 0, 0)",
					"--dsw-alias-border-l1": "rgba(31, 30, 29, 0.08)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(31, 30, 29, 0.12)",
					"--dsw-alias-border-l2": "rgba(31, 30, 29, 0.12)",
					"--dsw-alias-border-l3": "rgba(31, 30, 29, 0.18)",
					"--dsw-alias-border-l4": "rgba(31, 30, 29, 0.24)",
					"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-brand-primary-new-colorprimary-new-color": "#d97757",
					"--dsw-alias-brand-primary": "#d97757",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-500)",
					"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-button-info-fill": "#d97757",
					"--dsw-alias-button-info-hover": "#c46343",
					"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-button-primary-fill": "#d97757",
					"--dsw-alias-button-primary-hover": "#c46343",
					"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
					"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
					"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
					"--dsw-alias-interactive-bg-active": "rgba(246, 136, 98, 0.26)",
					"--dsw-alias-interactive-bg-hover-accent": "rgba(38, 49, 72, 0.14)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(236, 19, 19, 0.05)",
					"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-interactive-bg-hover": "rgba(38, 49, 72, 0.06)",
					"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-500) 70%, var(--dsw-static-blue-950))",
					"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-deepseek-500) 30%, var(--dsw-static-blue-950))",
					"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-label-primary-bluish": "var(--dsw-static-blue-900)",
					"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-1000) 30%, transparent)",
					"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-600)",
					"--dsw-alias-menu-icon": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-link": "#bf6446",
					"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-50)",
					"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-200)",
					"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-200)",
					"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-300)",
					"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-300)",
					"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-100)",
					"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a08)",
					"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-600-a08)",
					"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a08)",
					"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 4%, transparent)",
					"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
					"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-600-a08)",
					"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 4%, transparent)",
					"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
					"--dsw-alias-state-error-primary": "var(--dsw-static-red-600)",
					"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-300)",
					"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
					"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
					"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-100)",
					"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
					"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
					"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
					"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-100)",
					"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
					"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-markdown-code-block)",
					"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-hover)",
					"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
					"--dsw-specific-bubble-highlight": "var(--dsw-static-deepseek-200)",
					"--dsw-specific-bubble": "var(--dsw-static-deepseek-50)",
					"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
					"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-deepseek-100)",
					"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 58%, transparent)"
				}
			},
			{
				id: "dracula",
				colorScheme: "dark",
				tokens: {
					...SHIKI_TOKENS_BY_THEME["dracula"],
					"--dsw-static-amber-100": "color-mix(in srgb, #ffb86c 20%, #343746)",
					"--dsw-static-amber-400": "color-mix(in srgb, #ffb86c 70%, #343746)",
					"--dsw-static-amber-500": "#ffb86c",
					"--dsw-static-amber-600": "#ffb86c",
					"--dsw-static-amber-900": "color-mix(in srgb, #ffb86c 18%, #282a36)",
					"--dsw-static-blue-100": "color-mix(in srgb, #8be9fd 24%, #343746)",
					"--dsw-static-blue-300": "color-mix(in srgb, #8be9fd 50%, #343746)",
					"--dsw-static-blue-400": "color-mix(in srgb, #8be9fd 66%, #343746)",
					"--dsw-static-blue-450": "color-mix(in srgb, #8be9fd 84%, #343746)",
					"--dsw-static-blue-500": "#8be9fd",
					"--dsw-static-blue-50": "color-mix(in srgb, #8be9fd 10%, #343746)",
					"--dsw-static-blue-50p": "color-mix(in srgb, #8be9fd 14%, #343746)",
					"--dsw-static-blue-600": "color-mix(in srgb, #6272a4 84%, #343746)",
					"--dsw-static-blue-75": "color-mix(in srgb, #8be9fd 18%, #343746)",
					"--dsw-static-blue-800": "color-mix(in srgb, #6272a4 26%, #282a36)",
					"--dsw-static-blue-900": "color-mix(in srgb, #6272a4 18%, #282a36)",
					"--dsw-static-blue-950": "color-mix(in srgb, #6272a4 12%, #282a36)",
					"--dsw-static-deepseek-100": "color-mix(in srgb, #ff79c6 24%, #343746)",
					"--dsw-static-deepseek-200": "color-mix(in srgb, #ff79c6 36%, #343746)",
					"--dsw-static-deepseek-300": "color-mix(in srgb, #ff79c6 50%, #343746)",
					"--dsw-static-deepseek-400": "color-mix(in srgb, #ff79c6 66%, #343746)",
					"--dsw-static-deepseek-450": "color-mix(in srgb, #ff79c6 84%, #343746)",
					"--dsw-static-deepseek-500": "#ff79c6",
					"--dsw-static-deepseek-50": "color-mix(in srgb, #ff79c6 10%, #343746)",
					"--dsw-static-deepseek-600": "color-mix(in srgb, #bd93f9 84%, #343746)",
					"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #bd93f9 68%, #343746)",
					"--dsw-static-deepseek-800": "color-mix(in srgb, #bd93f9 26%, #282a36)",
					"--dsw-static-deepseek-900": "color-mix(in srgb, #bd93f9 18%, #282a36)",
					"--dsw-static-green-100": "color-mix(in srgb, #50fa7b 18%, #343746)",
					"--dsw-static-green-400": "color-mix(in srgb, #50fa7b 80%, #343746)",
					"--dsw-static-green-500": "#50fa7b",
					"--dsw-static-green-500-a08": "color-mix(in srgb, #50fa7b 8%, transparent)",
					"--dsw-static-green-500-a12": "color-mix(in srgb, #50fa7b 12%, transparent)",
					"--dsw-static-green-900": "color-mix(in srgb, #50fa7b 18%, #282a36)",
					"--dsw-static-neutral-00": "#f8f8f2",
					"--dsw-static-neutral-1000": "#14141a",
					"--dsw-static-neutral-100": "#959dc0",
					"--dsw-static-neutral-150": "#959dc0",
					"--dsw-static-neutral-200": "#6272a4",
					"--dsw-static-neutral-250": "#6272a4",
					"--dsw-static-neutral-300": "#545f85",
					"--dsw-static-neutral-400": "#44475a",
					"--dsw-static-neutral-500": "#383a4c",
					"--dsw-static-neutral-50": "#e2e2dc",
					"--dsw-static-neutral-550": "#343746",
					"--dsw-static-neutral-600": "#2d303e",
					"--dsw-static-neutral-700": "#282a36",
					"--dsw-static-neutral-800": "#21222c",
					"--dsw-static-neutral-850": "#1e1f29",
					"--dsw-static-neutral-900": "#282a36",
					"--dsw-static-neutral-bluish-00": "#f8f8f2",
					"--dsw-static-neutral-bluish-1000": "#14141a",
					"--dsw-static-neutral-bluish-100": "#959dc0",
					"--dsw-static-neutral-bluish-150": "#7a84aa",
					"--dsw-static-neutral-bluish-200": "#6272a4",
					"--dsw-static-neutral-bluish-300": "#545f85",
					"--dsw-static-neutral-bluish-400": "#44475a",
					"--dsw-static-neutral-bluish-500": "#383a4c",
					"--dsw-static-neutral-bluish-50": "#e2e2dc",
					"--dsw-static-neutral-bluish-600": "#2d303e",
					"--dsw-static-neutral-bluish-60": "#d0d0c8",
					"--dsw-static-neutral-bluish-700": "#282a36",
					"--dsw-static-neutral-bluish-750": "#242631",
					"--dsw-static-neutral-bluish-75": "#b8b8b0",
					"--dsw-static-neutral-bluish-800": "#21222c",
					"--dsw-static-neutral-bluish-850": "#1e1f29",
					"--dsw-static-neutral-bluish-875": "#1c1d26",
					"--dsw-static-neutral-bluish-900": "#282a36",
					"--dsw-static-neutral-bluish-950": "#191a21",
					"--dsw-static-red-100": "color-mix(in srgb, #ff5555 20%, #343746)",
					"--dsw-static-red-400": "color-mix(in srgb, #ff5555 70%, #343746)",
					"--dsw-static-red-400-a12": "color-mix(in srgb, #b36a83 12%, transparent)",
					"--dsw-static-red-500": "#ff5555",
					"--dsw-static-red-50": "color-mix(in srgb, #ff5555 10%, #343746)",
					"--dsw-static-red-600": "#ff5555",
					"--dsw-static-red-600-a08": "color-mix(in srgb, #ff5555 8%, transparent)",
					"--dsw-static-red-900": "color-mix(in srgb, #ff5555 34%, #343746)",
					"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
					"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-875)",
					"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.5)",
					"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.2)",
					"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
					"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
					"--dsw-alias-bg-mask-drop": "rgba(39, 39, 48, 0.7)",
					"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
					"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-border-inverted2": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-border-inverted": "rgba(255, 255, 255, 0.06)",
					"--dsw-alias-border-l1": "rgba(255, 121, 198, 0.12)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(98, 114, 164, 0.22)",
					"--dsw-alias-border-l2": "rgba(98, 114, 164, 0.22)",
					"--dsw-alias-border-l3": "rgba(98, 114, 164, 0.32)",
					"--dsw-alias-border-l4": "rgba(98, 114, 164, 0.44)",
					"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-brand-primary-new-colorprimary-new-color": "#ff79c6",
					"--dsw-alias-brand-primary": "#ff79c6",
					"--dsw-alias-brand-text": "#282a36",
					"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-600)",
					"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-button-info-fill": "#ff79c6",
					"--dsw-alias-button-info-hover": "#ff92d0",
					"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-primary-fill": "#ff79c6",
					"--dsw-alias-button-primary-hover": "#ff92d0",
					"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
					"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
					"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
					"--dsw-alias-interactive-bg-active": "rgba(255, 121, 198, 0.28)",
					"--dsw-alias-interactive-bg-hover-accent": "rgba(255, 255, 255, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(242, 90, 90, 0.15)",
					"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-interactive-bg-hover": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
					"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
					"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
					"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-menu-icon": "var(--dsw-alias-label-primary-dimmed)",
					"--dsw-alias-link": "#8be9fd",
					"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-800)",
					"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
					"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
					"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-800)",
					"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 6%, transparent)",
					"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
					"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 6%, transparent)",
					"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
					"--dsw-alias-state-error-primary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-600)",
					"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
					"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
					"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)",
					"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
					"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
					"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
					"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)",
					"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-interactive-bg-hover)",
					"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-active)",
					"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
					"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
					"--dsw-specific-bubble-highlight": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-bubble": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
					"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 45%, transparent)"
				}
			},
			{
				id: "solarized-dark",
				colorScheme: "dark",
				tokens: {
					...SHIKI_TOKENS_BY_THEME["solarized-dark"],
					"--dsw-static-amber-100": "color-mix(in srgb, #b58900 20%, #073642)",
					"--dsw-static-amber-400": "color-mix(in srgb, #b58900 70%, #073642)",
					"--dsw-static-amber-500": "#b58900",
					"--dsw-static-amber-600": "#b58900",
					"--dsw-static-amber-900": "color-mix(in srgb, #b58900 18%, #002b36)",
					"--dsw-static-blue-100": "color-mix(in srgb, #268bd2 24%, #073642)",
					"--dsw-static-blue-300": "color-mix(in srgb, #268bd2 50%, #073642)",
					"--dsw-static-blue-400": "color-mix(in srgb, #268bd2 66%, #073642)",
					"--dsw-static-blue-450": "color-mix(in srgb, #268bd2 84%, #073642)",
					"--dsw-static-blue-500": "#268bd2",
					"--dsw-static-blue-50": "color-mix(in srgb, #268bd2 10%, #073642)",
					"--dsw-static-blue-50p": "color-mix(in srgb, #268bd2 14%, #073642)",
					"--dsw-static-blue-600": "color-mix(in srgb, #2aa198 84%, #073642)",
					"--dsw-static-blue-75": "color-mix(in srgb, #268bd2 18%, #073642)",
					"--dsw-static-blue-800": "color-mix(in srgb, #2aa198 26%, #002b36)",
					"--dsw-static-blue-900": "color-mix(in srgb, #2aa198 18%, #002b36)",
					"--dsw-static-blue-950": "color-mix(in srgb, #2aa198 12%, #002b36)",
					"--dsw-static-deepseek-100": "color-mix(in srgb, #2aa198 24%, #073642)",
					"--dsw-static-deepseek-200": "color-mix(in srgb, #2aa198 36%, #073642)",
					"--dsw-static-deepseek-300": "color-mix(in srgb, #2aa198 50%, #073642)",
					"--dsw-static-deepseek-400": "color-mix(in srgb, #2aa198 66%, #073642)",
					"--dsw-static-deepseek-450": "color-mix(in srgb, #2aa198 84%, #073642)",
					"--dsw-static-deepseek-500": "#2aa198",
					"--dsw-static-deepseek-50": "color-mix(in srgb, #2aa198 10%, #073642)",
					"--dsw-static-deepseek-600": "color-mix(in srgb, #268bd2 84%, #073642)",
					"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #268bd2 68%, #073642)",
					"--dsw-static-deepseek-800": "color-mix(in srgb, #268bd2 26%, #002b36)",
					"--dsw-static-deepseek-900": "color-mix(in srgb, #268bd2 18%, #002b36)",
					"--dsw-static-green-100": "color-mix(in srgb, #859900 18%, #073642)",
					"--dsw-static-green-400": "color-mix(in srgb, #859900 80%, #073642)",
					"--dsw-static-green-500": "#859900",
					"--dsw-static-green-500-a08": "color-mix(in srgb, #859900 8%, transparent)",
					"--dsw-static-green-500-a12": "color-mix(in srgb, #859900 12%, transparent)",
					"--dsw-static-green-900": "color-mix(in srgb, #859900 18%, #002b36)",
					"--dsw-static-neutral-00": "#93a1a1",
					"--dsw-static-neutral-1000": "#001b22",
					"--dsw-static-neutral-100": "#586e75",
					"--dsw-static-neutral-150": "#586e75",
					"--dsw-static-neutral-200": "#364950",
					"--dsw-static-neutral-250": "#364950",
					"--dsw-static-neutral-300": "#243b42",
					"--dsw-static-neutral-400": "#17373f",
					"--dsw-static-neutral-500": "#0f363f",
					"--dsw-static-neutral-50": "#839496",
					"--dsw-static-neutral-550": "#0b3640",
					"--dsw-static-neutral-600": "#073642",
					"--dsw-static-neutral-700": "#05313c",
					"--dsw-static-neutral-800": "#002b36",
					"--dsw-static-neutral-850": "#002731",
					"--dsw-static-neutral-900": "#002b36",
					"--dsw-static-neutral-bluish-00": "#93a1a1",
					"--dsw-static-neutral-bluish-1000": "#001b22",
					"--dsw-static-neutral-bluish-100": "#586e75",
					"--dsw-static-neutral-bluish-150": "#475b62",
					"--dsw-static-neutral-bluish-200": "#364950",
					"--dsw-static-neutral-bluish-300": "#243b42",
					"--dsw-static-neutral-bluish-400": "#17373f",
					"--dsw-static-neutral-bluish-500": "#0f363f",
					"--dsw-static-neutral-bluish-50": "#839496",
					"--dsw-static-neutral-bluish-600": "#073642",
					"--dsw-static-neutral-bluish-60": "#768789",
					"--dsw-static-neutral-bluish-700": "#05313c",
					"--dsw-static-neutral-bluish-750": "#032e39",
					"--dsw-static-neutral-bluish-75": "#6b7d80",
					"--dsw-static-neutral-bluish-800": "#002b36",
					"--dsw-static-neutral-bluish-850": "#002731",
					"--dsw-static-neutral-bluish-875": "#00242d",
					"--dsw-static-neutral-bluish-900": "#002b36",
					"--dsw-static-neutral-bluish-950": "#002b36",
					"--dsw-static-red-100": "color-mix(in srgb, #dc322f 20%, #073642)",
					"--dsw-static-red-400": "color-mix(in srgb, #dc322f 70%, #073642)",
					"--dsw-static-red-400-a12": "color-mix(in srgb, #b36a83 12%, transparent)",
					"--dsw-static-red-500": "#dc322f",
					"--dsw-static-red-50": "color-mix(in srgb, #dc322f 10%, #073642)",
					"--dsw-static-red-600": "#dc322f",
					"--dsw-static-red-600-a08": "color-mix(in srgb, #dc322f 8%, transparent)",
					"--dsw-static-red-900": "color-mix(in srgb, #dc322f 34%, #073642)",
					"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
					"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-875)",
					"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.5)",
					"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.2)",
					"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
					"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
					"--dsw-alias-bg-mask-drop": "rgba(39, 39, 48, 0.7)",
					"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
					"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-border-inverted2": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-border-inverted": "rgba(255, 255, 255, 0.06)",
					"--dsw-alias-border-l1": "rgba(42, 161, 152, 0.14)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(88, 110, 117, 0.24)",
					"--dsw-alias-border-l2": "rgba(88, 110, 117, 0.24)",
					"--dsw-alias-border-l3": "rgba(88, 110, 117, 0.36)",
					"--dsw-alias-border-l4": "rgba(88, 110, 117, 0.48)",
					"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-brand-primary-new-colorprimary-new-color": "#2aa198",
					"--dsw-alias-brand-primary": "#2aa198",
					"--dsw-alias-brand-text": "#002b36",
					"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-600)",
					"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-button-info-fill": "#2aa198",
					"--dsw-alias-button-info-hover": "#35b5ab",
					"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-primary-fill": "#2aa198",
					"--dsw-alias-button-primary-hover": "#35b5ab",
					"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
					"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
					"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
					"--dsw-alias-interactive-bg-active": "rgba(42, 161, 152, 0.28)",
					"--dsw-alias-interactive-bg-hover-accent": "rgba(255, 255, 255, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(242, 90, 90, 0.15)",
					"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-interactive-bg-hover": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
					"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
					"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
					"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-menu-icon": "var(--dsw-alias-label-primary-dimmed)",
					"--dsw-alias-link": "#268bd2",
					"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-800)",
					"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
					"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
					"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-800)",
					"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 6%, transparent)",
					"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
					"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 6%, transparent)",
					"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
					"--dsw-alias-state-error-primary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-600)",
					"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
					"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
					"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)",
					"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
					"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
					"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
					"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)",
					"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-interactive-bg-hover)",
					"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-active)",
					"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
					"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
					"--dsw-specific-bubble-highlight": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-bubble": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
					"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 45%, transparent)"
				}
			},
			{
				id: "solarized-light",
				colorScheme: "light",
				tokens: {
					...SHIKI_TOKENS_BY_THEME["solarized-light"],
					"--dsw-static-amber-100": "color-mix(in srgb, #b58900 20%, #fdf6e3)",
					"--dsw-static-amber-400": "color-mix(in srgb, #b58900 70%, #fdf6e3)",
					"--dsw-static-amber-500": "#b58900",
					"--dsw-static-amber-600": "#b58900",
					"--dsw-static-amber-900": "color-mix(in srgb, #b58900 32%, #fdf6e3)",
					"--dsw-static-blue-100": "color-mix(in srgb, #268bd2 22%, #fdf6e3)",
					"--dsw-static-blue-300": "color-mix(in srgb, #268bd2 48%, #fdf6e3)",
					"--dsw-static-blue-400": "color-mix(in srgb, #268bd2 65%, #fdf6e3)",
					"--dsw-static-blue-450": "color-mix(in srgb, #268bd2 82%, #fdf6e3)",
					"--dsw-static-blue-500": "#268bd2",
					"--dsw-static-blue-50": "color-mix(in srgb, #268bd2 8%, #fdf6e3)",
					"--dsw-static-blue-50p": "color-mix(in srgb, #268bd2 12%, #fdf6e3)",
					"--dsw-static-blue-600": "color-mix(in srgb, #268bd2 82%, #657b83)",
					"--dsw-static-blue-75": "color-mix(in srgb, #268bd2 16%, #fdf6e3)",
					"--dsw-static-blue-800": "color-mix(in srgb, #268bd2 50%, #657b83)",
					"--dsw-static-blue-900": "color-mix(in srgb, #268bd2 30%, #657b83)",
					"--dsw-static-blue-950": "color-mix(in srgb, #268bd2 16%, #657b83)",
					"--dsw-static-deepseek-100": "color-mix(in srgb, #268bd2 22%, #fdf6e3)",
					"--dsw-static-deepseek-200": "color-mix(in srgb, #268bd2 34%, #fdf6e3)",
					"--dsw-static-deepseek-300": "color-mix(in srgb, #268bd2 48%, #fdf6e3)",
					"--dsw-static-deepseek-400": "color-mix(in srgb, #268bd2 65%, #fdf6e3)",
					"--dsw-static-deepseek-450": "color-mix(in srgb, #268bd2 82%, #fdf6e3)",
					"--dsw-static-deepseek-500": "#268bd2",
					"--dsw-static-deepseek-50": "color-mix(in srgb, #268bd2 8%, #fdf6e3)",
					"--dsw-static-deepseek-600": "color-mix(in srgb, #268bd2 82%, #657b83)",
					"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #268bd2 66%, #657b83)",
					"--dsw-static-deepseek-800": "color-mix(in srgb, #268bd2 50%, #657b83)",
					"--dsw-static-deepseek-900": "color-mix(in srgb, #268bd2 38%, #657b83)",
					"--dsw-static-green-100": "color-mix(in srgb, #00a240 18%, #fdf6e3)",
					"--dsw-static-green-400": "color-mix(in srgb, #00a240 80%, #fdf6e3)",
					"--dsw-static-green-500": "#00a240",
					"--dsw-static-green-500-a08": "color-mix(in srgb, #00a240 8%, transparent)",
					"--dsw-static-green-500-a12": "color-mix(in srgb, #00a240 12%, transparent)",
					"--dsw-static-green-900": "color-mix(in srgb, #00a240 30%, #fdf6e3)",
					"--dsw-static-neutral-00": "#fdf6e3",
					"--dsw-static-neutral-1000": "#586e75",
					"--dsw-static-neutral-100": "#c9beaa",
					"--dsw-static-neutral-150": "#c9beaa",
					"--dsw-static-neutral-200": "#93a1a1",
					"--dsw-static-neutral-250": "#93a1a1",
					"--dsw-static-neutral-300": "#839496",
					"--dsw-static-neutral-400": "#657b83",
					"--dsw-static-neutral-500": "#586e75",
					"--dsw-static-neutral-50": "#eee8d5",
					"--dsw-static-neutral-550": "#4a5e65",
					"--dsw-static-neutral-600": "#3f535a",
					"--dsw-static-neutral-700": "#32454b",
					"--dsw-static-neutral-800": "#192f35",
					"--dsw-static-neutral-850": "#0f2930",
					"--dsw-static-neutral-900": "#657b83",
					"--dsw-static-neutral-bluish-00": "#fdf6e3",
					"--dsw-static-neutral-bluish-1000": "#586e75",
					"--dsw-static-neutral-bluish-100": "#c9beaa",
					"--dsw-static-neutral-bluish-150": "#b5aa96",
					"--dsw-static-neutral-bluish-200": "#93a1a1",
					"--dsw-static-neutral-bluish-300": "#839496",
					"--dsw-static-neutral-bluish-400": "#657b83",
					"--dsw-static-neutral-bluish-500": "#586e75",
					"--dsw-static-neutral-bluish-50": "#eee8d5",
					"--dsw-static-neutral-bluish-600": "#3f535a",
					"--dsw-static-neutral-bluish-60": "#e5deca",
					"--dsw-static-neutral-bluish-700": "#32454b",
					"--dsw-static-neutral-bluish-750": "#25393f",
					"--dsw-static-neutral-bluish-75": "#dacfbb",
					"--dsw-static-neutral-bluish-800": "#192f35",
					"--dsw-static-neutral-bluish-850": "#0f2930",
					"--dsw-static-neutral-bluish-875": "#07252c",
					"--dsw-static-neutral-bluish-900": "#657b83",
					"--dsw-static-neutral-bluish-950": "#002b36",
					"--dsw-static-red-100": "color-mix(in srgb, #dc322f 20%, #fdf6e3)",
					"--dsw-static-red-400": "color-mix(in srgb, #dc322f 70%, #fdf6e3)",
					"--dsw-static-red-400-a12": "color-mix(in srgb, #db5371 12%, transparent)",
					"--dsw-static-red-500": "#dc322f",
					"--dsw-static-red-50": "color-mix(in srgb, #dc322f 10%, #fdf6e3)",
					"--dsw-static-red-600": "#dc322f",
					"--dsw-static-red-600-a08": "color-mix(in srgb, #dc322f 8%, transparent)",
					"--dsw-static-red-900": "color-mix(in srgb, #dc322f 34%, #fdf6e3)",
					"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
					"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.24)",
					"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.12)",
					"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
					"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
					"--dsw-alias-bg-mask-drop": "rgba(255, 255, 255, 0.7)",
					"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-bg-skeleton": "rgba(0, 0, 0, 0.04)",
					"--dsw-alias-border-inverted2": "rgba(0, 0, 0, 0)",
					"--dsw-alias-border-inverted": "rgba(0, 0, 0, 0)",
					"--dsw-alias-border-l1": "rgba(101, 123, 131, 0.12)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(101, 123, 131, 0.18)",
					"--dsw-alias-border-l2": "rgba(101, 123, 131, 0.18)",
					"--dsw-alias-border-l3": "rgba(101, 123, 131, 0.26)",
					"--dsw-alias-border-l4": "rgba(101, 123, 131, 0.36)",
					"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-brand-primary-new-colorprimary-new-color": "#268bd2",
					"--dsw-alias-brand-primary": "#268bd2",
					"--dsw-alias-brand-text": "#fdf6e3",
					"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-500)",
					"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-button-info-fill": "#268bd2",
					"--dsw-alias-button-info-hover": "#1f75b3",
					"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-button-primary-fill": "#268bd2",
					"--dsw-alias-button-primary-hover": "#1f75b3",
					"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
					"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
					"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
					"--dsw-alias-interactive-bg-active": "rgba(38, 139, 210, 0.24)",
					"--dsw-alias-interactive-bg-hover-accent": "rgba(38, 49, 72, 0.14)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(236, 19, 19, 0.05)",
					"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-interactive-bg-hover": "rgba(38, 49, 72, 0.06)",
					"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-500) 70%, var(--dsw-static-blue-950))",
					"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-deepseek-500) 30%, var(--dsw-static-blue-950))",
					"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-label-primary-bluish": "var(--dsw-static-blue-900)",
					"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-1000) 30%, transparent)",
					"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-600)",
					"--dsw-alias-menu-icon": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-link": "#2aa198",
					"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-50)",
					"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-200)",
					"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-200)",
					"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-300)",
					"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-300)",
					"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-100)",
					"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a08)",
					"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-600-a08)",
					"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a08)",
					"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 4%, transparent)",
					"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
					"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-600-a08)",
					"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 4%, transparent)",
					"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
					"--dsw-alias-state-error-primary": "var(--dsw-static-red-600)",
					"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-300)",
					"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
					"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
					"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-100)",
					"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
					"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
					"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
					"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-100)",
					"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
					"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-markdown-code-block)",
					"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-hover)",
					"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
					"--dsw-specific-bubble-highlight": "var(--dsw-static-deepseek-200)",
					"--dsw-specific-bubble": "var(--dsw-static-deepseek-50)",
					"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
					"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-deepseek-100)",
					"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 58%, transparent)"
				}
			},
			{
				id: "gruvbox-dark",
				colorScheme: "dark",
				tokens: {
					...SHIKI_TOKENS_BY_THEME["gruvbox-dark"],
					"--dsw-static-amber-100": "color-mix(in srgb, #fe8019 20%, #3c3836)",
					"--dsw-static-amber-400": "color-mix(in srgb, #fe8019 70%, #3c3836)",
					"--dsw-static-amber-500": "#fe8019",
					"--dsw-static-amber-600": "#fe8019",
					"--dsw-static-amber-900": "color-mix(in srgb, #fe8019 18%, #282828)",
					"--dsw-static-blue-100": "color-mix(in srgb, #83a598 24%, #3c3836)",
					"--dsw-static-blue-300": "color-mix(in srgb, #83a598 50%, #3c3836)",
					"--dsw-static-blue-400": "color-mix(in srgb, #83a598 66%, #3c3836)",
					"--dsw-static-blue-450": "color-mix(in srgb, #83a598 84%, #3c3836)",
					"--dsw-static-blue-500": "#83a598",
					"--dsw-static-blue-50": "color-mix(in srgb, #83a598 10%, #3c3836)",
					"--dsw-static-blue-50p": "color-mix(in srgb, #83a598 14%, #3c3836)",
					"--dsw-static-blue-600": "color-mix(in srgb, #458588 84%, #3c3836)",
					"--dsw-static-blue-75": "color-mix(in srgb, #83a598 18%, #3c3836)",
					"--dsw-static-blue-800": "color-mix(in srgb, #458588 26%, #282828)",
					"--dsw-static-blue-900": "color-mix(in srgb, #458588 18%, #282828)",
					"--dsw-static-blue-950": "color-mix(in srgb, #458588 12%, #282828)",
					"--dsw-static-deepseek-100": "color-mix(in srgb, #fabd2f 24%, #3c3836)",
					"--dsw-static-deepseek-200": "color-mix(in srgb, #fabd2f 36%, #3c3836)",
					"--dsw-static-deepseek-300": "color-mix(in srgb, #fabd2f 50%, #3c3836)",
					"--dsw-static-deepseek-400": "color-mix(in srgb, #fabd2f 66%, #3c3836)",
					"--dsw-static-deepseek-450": "color-mix(in srgb, #fabd2f 84%, #3c3836)",
					"--dsw-static-deepseek-500": "#fabd2f",
					"--dsw-static-deepseek-50": "color-mix(in srgb, #fabd2f 10%, #3c3836)",
					"--dsw-static-deepseek-600": "color-mix(in srgb, #d79921 84%, #3c3836)",
					"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #d79921 68%, #3c3836)",
					"--dsw-static-deepseek-800": "color-mix(in srgb, #d79921 26%, #282828)",
					"--dsw-static-deepseek-900": "color-mix(in srgb, #d79921 18%, #282828)",
					"--dsw-static-green-100": "color-mix(in srgb, #b8bb26 18%, #3c3836)",
					"--dsw-static-green-400": "color-mix(in srgb, #b8bb26 80%, #3c3836)",
					"--dsw-static-green-500": "#b8bb26",
					"--dsw-static-green-500-a08": "color-mix(in srgb, #b8bb26 8%, transparent)",
					"--dsw-static-green-500-a12": "color-mix(in srgb, #b8bb26 12%, transparent)",
					"--dsw-static-green-900": "color-mix(in srgb, #b8bb26 18%, #282828)",
					"--dsw-static-neutral-00": "#fbf1c7",
					"--dsw-static-neutral-1000": "#1d2021",
					"--dsw-static-neutral-100": "#bdae93",
					"--dsw-static-neutral-150": "#bdae93",
					"--dsw-static-neutral-200": "#928374",
					"--dsw-static-neutral-250": "#928374",
					"--dsw-static-neutral-300": "#7c6f64",
					"--dsw-static-neutral-400": "#665c54",
					"--dsw-static-neutral-500": "#504945",
					"--dsw-static-neutral-50": "#ebdbb2",
					"--dsw-static-neutral-550": "#45403d",
					"--dsw-static-neutral-600": "#3c3836",
					"--dsw-static-neutral-700": "#32302f",
					"--dsw-static-neutral-800": "#282828",
					"--dsw-static-neutral-850": "#252525",
					"--dsw-static-neutral-900": "#282828",
					"--dsw-static-neutral-bluish-00": "#fbf1c7",
					"--dsw-static-neutral-bluish-1000": "#1d2021",
					"--dsw-static-neutral-bluish-100": "#bdae93",
					"--dsw-static-neutral-bluish-150": "#a89984",
					"--dsw-static-neutral-bluish-200": "#928374",
					"--dsw-static-neutral-bluish-300": "#7c6f64",
					"--dsw-static-neutral-bluish-400": "#665c54",
					"--dsw-static-neutral-bluish-500": "#504945",
					"--dsw-static-neutral-bluish-50": "#ebdbb2",
					"--dsw-static-neutral-bluish-600": "#3c3836",
					"--dsw-static-neutral-bluish-60": "#e0cf9f",
					"--dsw-static-neutral-bluish-700": "#32302f",
					"--dsw-static-neutral-bluish-750": "#2d2b2a",
					"--dsw-static-neutral-bluish-75": "#d5c4a1",
					"--dsw-static-neutral-bluish-800": "#282828",
					"--dsw-static-neutral-bluish-850": "#252525",
					"--dsw-static-neutral-bluish-875": "#202020",
					"--dsw-static-neutral-bluish-900": "#282828",
					"--dsw-static-neutral-bluish-950": "#282828",
					"--dsw-static-red-100": "color-mix(in srgb, #fb4934 20%, #3c3836)",
					"--dsw-static-red-400": "color-mix(in srgb, #fb4934 70%, #3c3836)",
					"--dsw-static-red-400-a12": "color-mix(in srgb, #b36a83 12%, transparent)",
					"--dsw-static-red-500": "#fb4934",
					"--dsw-static-red-50": "color-mix(in srgb, #fb4934 10%, #3c3836)",
					"--dsw-static-red-600": "#fb4934",
					"--dsw-static-red-600-a08": "color-mix(in srgb, #fb4934 8%, transparent)",
					"--dsw-static-red-900": "color-mix(in srgb, #fb4934 34%, #3c3836)",
					"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
					"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-875)",
					"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.5)",
					"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.2)",
					"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
					"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
					"--dsw-alias-bg-mask-drop": "rgba(39, 39, 48, 0.7)",
					"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
					"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-border-inverted2": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-border-inverted": "rgba(255, 255, 255, 0.06)",
					"--dsw-alias-border-l1": "rgba(250, 189, 47, 0.12)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(80, 73, 69, 0.36)",
					"--dsw-alias-border-l2": "rgba(80, 73, 69, 0.36)",
					"--dsw-alias-border-l3": "rgba(80, 73, 69, 0.52)",
					"--dsw-alias-border-l4": "rgba(80, 73, 69, 0.70)",
					"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-brand-primary-new-colorprimary-new-color": "#fabd2f",
					"--dsw-alias-brand-primary": "#fabd2f",
					"--dsw-alias-brand-text": "#282828",
					"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-600)",
					"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-button-info-fill": "#fabd2f",
					"--dsw-alias-button-info-hover": "#ffd05c",
					"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-primary-fill": "#fabd2f",
					"--dsw-alias-button-primary-hover": "#ffd05c",
					"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
					"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
					"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
					"--dsw-alias-interactive-bg-active": "rgba(250, 189, 47, 0.28)",
					"--dsw-alias-interactive-bg-hover-accent": "rgba(255, 255, 255, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(242, 90, 90, 0.15)",
					"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-interactive-bg-hover": "rgba(255, 255, 255, 0.08)",
					"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
					"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
					"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
					"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-menu-icon": "var(--dsw-alias-label-primary-dimmed)",
					"--dsw-alias-link": "#83a598",
					"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-800)",
					"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
					"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
					"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-800)",
					"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 6%, transparent)",
					"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
					"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 6%, transparent)",
					"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
					"--dsw-alias-state-error-primary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-600)",
					"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
					"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
					"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)",
					"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
					"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
					"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
					"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)",
					"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-interactive-bg-hover)",
					"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-active)",
					"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
					"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
					"--dsw-specific-bubble-highlight": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-bubble": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
					"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 45%, transparent)"
				}
			},
			{
				id: "gruvbox-light",
				colorScheme: "light",
				tokens: {
					...SHIKI_TOKENS_BY_THEME["gruvbox-light"],
					"--dsw-static-amber-100": "color-mix(in srgb, #af3a03 20%, #fbf1c7)",
					"--dsw-static-amber-400": "color-mix(in srgb, #af3a03 70%, #fbf1c7)",
					"--dsw-static-amber-500": "#af3a03",
					"--dsw-static-amber-600": "#af3a03",
					"--dsw-static-amber-900": "color-mix(in srgb, #af3a03 32%, #fbf1c7)",
					"--dsw-static-blue-100": "color-mix(in srgb, #076678 22%, #fbf1c7)",
					"--dsw-static-blue-300": "color-mix(in srgb, #076678 48%, #fbf1c7)",
					"--dsw-static-blue-400": "color-mix(in srgb, #076678 65%, #fbf1c7)",
					"--dsw-static-blue-450": "color-mix(in srgb, #076678 82%, #fbf1c7)",
					"--dsw-static-blue-500": "#076678",
					"--dsw-static-blue-50": "color-mix(in srgb, #076678 8%, #fbf1c7)",
					"--dsw-static-blue-50p": "color-mix(in srgb, #076678 12%, #fbf1c7)",
					"--dsw-static-blue-600": "color-mix(in srgb, #076678 82%, #3c3836)",
					"--dsw-static-blue-75": "color-mix(in srgb, #076678 16%, #fbf1c7)",
					"--dsw-static-blue-800": "color-mix(in srgb, #076678 50%, #3c3836)",
					"--dsw-static-blue-900": "color-mix(in srgb, #076678 30%, #3c3836)",
					"--dsw-static-blue-950": "color-mix(in srgb, #076678 16%, #3c3836)",
					"--dsw-static-deepseek-100": "color-mix(in srgb, #b57614 22%, #fbf1c7)",
					"--dsw-static-deepseek-200": "color-mix(in srgb, #b57614 34%, #fbf1c7)",
					"--dsw-static-deepseek-300": "color-mix(in srgb, #b57614 48%, #fbf1c7)",
					"--dsw-static-deepseek-400": "color-mix(in srgb, #b57614 65%, #fbf1c7)",
					"--dsw-static-deepseek-450": "color-mix(in srgb, #b57614 82%, #fbf1c7)",
					"--dsw-static-deepseek-500": "#b57614",
					"--dsw-static-deepseek-50": "color-mix(in srgb, #b57614 8%, #fbf1c7)",
					"--dsw-static-deepseek-600": "color-mix(in srgb, #b57614 82%, #3c3836)",
					"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #b57614 66%, #3c3836)",
					"--dsw-static-deepseek-800": "color-mix(in srgb, #b57614 50%, #3c3836)",
					"--dsw-static-deepseek-900": "color-mix(in srgb, #b57614 38%, #3c3836)",
					"--dsw-static-green-100": "color-mix(in srgb, #00a240 18%, #fbf1c7)",
					"--dsw-static-green-400": "color-mix(in srgb, #00a240 80%, #fbf1c7)",
					"--dsw-static-green-500": "#00a240",
					"--dsw-static-green-500-a08": "color-mix(in srgb, #00a240 8%, transparent)",
					"--dsw-static-green-500-a12": "color-mix(in srgb, #00a240 12%, transparent)",
					"--dsw-static-green-900": "color-mix(in srgb, #00a240 30%, #fbf1c7)",
					"--dsw-static-neutral-00": "#fbf1c7",
					"--dsw-static-neutral-1000": "#282828",
					"--dsw-static-neutral-100": "#bdae93",
					"--dsw-static-neutral-150": "#bdae93",
					"--dsw-static-neutral-200": "#928374",
					"--dsw-static-neutral-250": "#928374",
					"--dsw-static-neutral-300": "#7c6f64",
					"--dsw-static-neutral-400": "#665c54",
					"--dsw-static-neutral-500": "#504945",
					"--dsw-static-neutral-50": "#ebdbb2",
					"--dsw-static-neutral-550": "#45403d",
					"--dsw-static-neutral-600": "#3c3836",
					"--dsw-static-neutral-700": "#32302f",
					"--dsw-static-neutral-800": "#282828",
					"--dsw-static-neutral-850": "#232323",
					"--dsw-static-neutral-900": "#282828",
					"--dsw-static-neutral-bluish-00": "#fbf1c7",
					"--dsw-static-neutral-bluish-1000": "#282828",
					"--dsw-static-neutral-bluish-100": "#bdae93",
					"--dsw-static-neutral-bluish-150": "#a89984",
					"--dsw-static-neutral-bluish-200": "#928374",
					"--dsw-static-neutral-bluish-300": "#7c6f64",
					"--dsw-static-neutral-bluish-400": "#665c54",
					"--dsw-static-neutral-bluish-500": "#504945",
					"--dsw-static-neutral-bluish-50": "#ebdbb2",
					"--dsw-static-neutral-bluish-600": "#3c3836",
					"--dsw-static-neutral-bluish-60": "#e0cf9f",
					"--dsw-static-neutral-bluish-700": "#32302f",
					"--dsw-static-neutral-bluish-750": "#2d2b2a",
					"--dsw-static-neutral-bluish-75": "#d5c4a1",
					"--dsw-static-neutral-bluish-800": "#282828",
					"--dsw-static-neutral-bluish-850": "#232323",
					"--dsw-static-neutral-bluish-875": "#1f1f1f",
					"--dsw-static-neutral-bluish-900": "#282828",
					"--dsw-static-neutral-bluish-950": "#1d2021",
					"--dsw-static-red-100": "color-mix(in srgb, #9d0006 20%, #fbf1c7)",
					"--dsw-static-red-400": "color-mix(in srgb, #9d0006 70%, #fbf1c7)",
					"--dsw-static-red-400-a12": "color-mix(in srgb, #db5371 12%, transparent)",
					"--dsw-static-red-500": "#9d0006",
					"--dsw-static-red-50": "color-mix(in srgb, #9d0006 10%, #fbf1c7)",
					"--dsw-static-red-600": "#9d0006",
					"--dsw-static-red-600-a08": "color-mix(in srgb, #9d0006 8%, transparent)",
					"--dsw-static-red-900": "color-mix(in srgb, #9d0006 34%, #fbf1c7)",
					"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
					"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.24)",
					"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.12)",
					"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
					"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
					"--dsw-alias-bg-mask-drop": "rgba(255, 255, 255, 0.7)",
					"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-bg-skeleton": "rgba(0, 0, 0, 0.04)",
					"--dsw-alias-border-inverted2": "rgba(0, 0, 0, 0)",
					"--dsw-alias-border-inverted": "rgba(0, 0, 0, 0)",
					"--dsw-alias-border-l1": "rgba(60, 56, 54, 0.12)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(60, 56, 54, 0.18)",
					"--dsw-alias-border-l2": "rgba(60, 56, 54, 0.18)",
					"--dsw-alias-border-l3": "rgba(60, 56, 54, 0.26)",
					"--dsw-alias-border-l4": "rgba(60, 56, 54, 0.36)",
					"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-brand-primary-new-colorprimary-new-color": "#b57614",
					"--dsw-alias-brand-primary": "#b57614",
					"--dsw-alias-brand-text": "#fbf1c7",
					"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-500)",
					"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-button-info-fill": "#b57614",
					"--dsw-alias-button-info-hover": "#9d650f",
					"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-button-primary-fill": "#b57614",
					"--dsw-alias-button-primary-hover": "#9d650f",
					"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
					"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
					"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
					"--dsw-alias-interactive-bg-active": "rgba(181, 118, 20, 0.22)",
					"--dsw-alias-interactive-bg-hover-accent": "rgba(38, 49, 72, 0.14)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(236, 19, 19, 0.05)",
					"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-interactive-bg-hover": "rgba(38, 49, 72, 0.06)",
					"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-500) 70%, var(--dsw-static-blue-950))",
					"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-deepseek-500) 30%, var(--dsw-static-blue-950))",
					"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-label-primary-bluish": "var(--dsw-static-blue-900)",
					"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-1000) 30%, transparent)",
					"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-600)",
					"--dsw-alias-menu-icon": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-link": "#076678",
					"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-markdown-inline-code": "var(--dsw-static-neutral-50)",
					"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-200)",
					"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-200)",
					"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-300)",
					"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-300)",
					"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-100)",
					"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a08)",
					"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-600-a08)",
					"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a08)",
					"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 4%, transparent)",
					"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
					"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-600-a08)",
					"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 4%, transparent)",
					"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
					"--dsw-alias-state-error-primary": "var(--dsw-static-red-600)",
					"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-300)",
					"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
					"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
					"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-100)",
					"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
					"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
					"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
					"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-100)",
					"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
					"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-markdown-code-block)",
					"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-hover)",
					"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
					"--dsw-specific-bubble-highlight": "var(--dsw-static-deepseek-200)",
					"--dsw-specific-bubble": "var(--dsw-static-deepseek-50)",
					"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
					"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-deepseek-100)",
					"--dsw-specific-sidebar-nav-item-active": "var(--dsw-static-neutral-bluish-100)",
					"--dsw-specific-sidebar-nav-item-hover": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-60)",
					"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 58%, transparent)"
				}
			},
			CATPPUCCIN_MOCHA_THEME,
			CATPPUCCIN_MACCHIATO_THEME,
			CATPPUCCIN_FRAPPE_THEME,
			CATPPUCCIN_LATTE_THEME,
			{
				id: "cyberpunk",
				colorScheme: "dark",
				tokens: {
					...SHIKI_TOKENS_BY_THEME["cyberpunk"],
					"--dsw-static-amber-100": "color-mix(in srgb, #ffd700 20%, #0f1d12)",
					"--dsw-static-amber-400": "color-mix(in srgb, #ffd700 70%, #0f1d12)",
					"--dsw-static-amber-500": "#ffd700",
					"--dsw-static-amber-600": "#ffd700",
					"--dsw-static-amber-900": "color-mix(in srgb, #ffd700 18%, #000a00)",
					"--dsw-static-blue-100": "color-mix(in srgb, #00e5ff 24%, #0f1d12)",
					"--dsw-static-blue-300": "color-mix(in srgb, #00e5ff 50%, #0f1d12)",
					"--dsw-static-blue-400": "color-mix(in srgb, #00e5ff 66%, #0f1d12)",
					"--dsw-static-blue-450": "color-mix(in srgb, #00e5ff 84%, #0f1d12)",
					"--dsw-static-blue-500": "#00e5ff",
					"--dsw-static-blue-50": "color-mix(in srgb, #00e5ff 10%, #0f1d12)",
					"--dsw-static-blue-50p": "color-mix(in srgb, #00e5ff 14%, #0f1d12)",
					"--dsw-static-blue-600": "color-mix(in srgb, #00b8d4 84%, #0f1d12)",
					"--dsw-static-blue-75": "color-mix(in srgb, #00e5ff 18%, #0f1d12)",
					"--dsw-static-blue-800": "color-mix(in srgb, #00b8d4 26%, #000a00)",
					"--dsw-static-blue-900": "color-mix(in srgb, #00b8d4 18%, #000a00)",
					"--dsw-static-blue-950": "color-mix(in srgb, #00b8d4 12%, #000a00)",
					"--dsw-static-deepseek-100": "color-mix(in srgb, #00ff41 24%, #0f1d12)",
					"--dsw-static-deepseek-200": "color-mix(in srgb, #00ff41 36%, #0f1d12)",
					"--dsw-static-deepseek-300": "color-mix(in srgb, #00ff41 50%, #0f1d12)",
					"--dsw-static-deepseek-400": "color-mix(in srgb, #00ff41 66%, #0f1d12)",
					"--dsw-static-deepseek-450": "color-mix(in srgb, #00ff41 84%, #0f1d12)",
					"--dsw-static-deepseek-500": "#00ff41",
					"--dsw-static-deepseek-50": "color-mix(in srgb, #00ff41 10%, #0f1d12)",
					"--dsw-static-deepseek-600": "color-mix(in srgb, #00cc34 84%, #0f1d12)",
					"--dsw-static-deepseek-700-delete": "color-mix(in srgb, #00cc34 68%, #0f1d12)",
					"--dsw-static-deepseek-800": "color-mix(in srgb, #00cc34 26%, #000a00)",
					"--dsw-static-deepseek-900": "color-mix(in srgb, #00cc34 18%, #000a00)",
					"--dsw-static-green-100": "color-mix(in srgb, #00ff88 18%, #0f1d12)",
					"--dsw-static-green-400": "color-mix(in srgb, #00ff88 80%, #0f1d12)",
					"--dsw-static-green-500": "#00ff88",
					"--dsw-static-green-500-a08": "color-mix(in srgb, #00ff88 8%, transparent)",
					"--dsw-static-green-500-a12": "color-mix(in srgb, #00ff88 12%, transparent)",
					"--dsw-static-green-900": "color-mix(in srgb, #00ff88 22%, #000a00)",
					"--dsw-static-neutral-00": "#7dff9e",
					"--dsw-static-neutral-1000": "#000600",
					"--dsw-static-neutral-100": "#00d937",
					"--dsw-static-neutral-150": "#00cc34",
					"--dsw-static-neutral-200": "#1ca838",
					"--dsw-static-neutral-250": "#1ca838",
					"--dsw-static-neutral-300": "#1a8a30",
					"--dsw-static-neutral-400": "#147026",
					"--dsw-static-neutral-500": "#0c5c1e",
					"--dsw-static-neutral-50": "#00ff41",
					"--dsw-static-neutral-550": "#08521a",
					"--dsw-static-neutral-600": "#004814",
					"--dsw-static-neutral-700": "#234029",
					"--dsw-static-neutral-800": "#152819",
					"--dsw-static-neutral-850": "#0f1d12",
					"--dsw-static-neutral-900": "#000600",
					"--dsw-static-neutral-bluish-00": "#7dff9e",
					"--dsw-static-neutral-bluish-1000": "#000600",
					"--dsw-static-neutral-bluish-100": "#00d937",
					"--dsw-static-neutral-bluish-150": "#00cc34",
					"--dsw-static-neutral-bluish-200": "#1ca838",
					"--dsw-static-neutral-bluish-300": "#1a8a30",
					"--dsw-static-neutral-bluish-400": "#147026",
					"--dsw-static-neutral-bluish-500": "#0c5c1e",
					"--dsw-static-neutral-bluish-50": "#00ff41",
					"--dsw-static-neutral-bluish-600": "#004814",
					"--dsw-static-neutral-bluish-60": "#00f03d",
					"--dsw-static-neutral-bluish-700": "#234029",
					"--dsw-static-neutral-bluish-750": "#1c3421",
					"--dsw-static-neutral-bluish-75": "#00e038",
					"--dsw-static-neutral-bluish-800": "#152819",
					"--dsw-static-neutral-bluish-850": "#0f1d12",
					"--dsw-static-neutral-bluish-875": "#0a140c",
					"--dsw-static-neutral-bluish-900": "#000600",
					"--dsw-static-neutral-bluish-950": "#000a00",
					"--dsw-static-red-100": "color-mix(in srgb, #ff003c 20%, #0f1d12)",
					"--dsw-static-red-400": "color-mix(in srgb, #ff003c 78%, #0f1d12)",
					"--dsw-static-red-400-a12": "color-mix(in srgb, #ff003c 12%, transparent)",
					"--dsw-static-red-500": "#ff003c",
					"--dsw-static-red-50": "color-mix(in srgb, #ff003c 10%, #0f1d12)",
					"--dsw-static-red-600": "#e00034",
					"--dsw-static-red-600-a08": "color-mix(in srgb, #ff003c 8%, transparent)",
					"--dsw-static-red-900": "color-mix(in srgb, #ff003c 34%, #0f1d12)",
					"--dsw-alias-bg-base": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-preview": "var(--dsw-static-neutral-bluish-950)",
					"--dsw-alias-bg-document-selection": "color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)",
					"--dsw-alias-label-document-preview": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-bg-layer-1": "var(--dsw-static-neutral-bluish-875)",
					"--dsw-alias-bg-layer-2": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-bg-layer-3": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.5)",
					"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.2)",
					"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
					"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
					"--dsw-alias-bg-mask-drop": "rgba(0, 14, 4, 0.72)",
					"--dsw-alias-bg-module-platform": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-bg-multi-select": "var(--dsw-static-neutral-850)",
					"--dsw-alias-bg-overlay": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-bg-skeleton": "rgba(0, 255, 65, 0.08)",
					"--dsw-alias-border-inverted2": "rgba(0, 255, 65, 0.08)",
					"--dsw-alias-border-inverted": "rgba(0, 255, 65, 0.06)",
					"--dsw-alias-border-l1": "rgba(0, 255, 65, 0.14)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(0, 255, 65, 0.20)",
					"--dsw-alias-border-l2": "rgba(0, 255, 65, 0.24)",
					"--dsw-alias-border-l3": "rgba(0, 255, 65, 0.36)",
					"--dsw-alias-border-l4": "rgba(0, 255, 65, 0.52)",
					"--dsw-alias-brand-primary-invert": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-brand-primary-new-colorprimary-new-color": "#00ff41",
					"--dsw-alias-brand-primary": "#00ff41",
					"--dsw-alias-brand-text": "#000a00",
					"--dsw-alias-button-contrast-fill": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-button-elevated-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-floating-fill": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-button-floating-hover": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-button-ghost-active-border": "var(--dsw-static-neutral-bluish-600)",
					"--dsw-alias-button-ghost-active-fill": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-ghost-active-hover": "var(--dsw-static-neutral-bluish-700)",
					"--dsw-alias-button-info-fill": "#00ff41",
					"--dsw-alias-button-info-hover": "#5cff85",
					"--dsw-alias-button-primary-dimmed": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-button-primary-fill": "#00ff41",
					"--dsw-alias-button-primary-hover": "#5cff85",
					"--dsw-alias-button-tool-bar-fill-invisible": "rgba(0, 20, 4, 0.42)",
					"--dsw-alias-button-tool-bar-fill": "rgba(12, 48, 20, 0.55)",
					"--dsw-alias-button-tool-bar-hover": "rgba(18, 68, 28, 0.70)",
					"--dsw-alias-interactive-bg-active": "rgba(0, 255, 65, 0.22)",
					"--dsw-alias-interactive-bg-hover-accent": "rgba(0, 255, 65, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(255, 0, 60, 0.16)",
					"--dsw-alias-interactive-bg-hover-solid": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-interactive-bg-hover": "rgba(0, 255, 65, 0.09)",
					"--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-300)",
					"--dsw-alias-label-deep-diving": "color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))",
					"--dsw-alias-label-deep-diving-shimmer": "color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))",
					"--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-400)",
					"--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-75)",
					"--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)",
					"--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)",
					"--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-150)",
					"--dsw-alias-label-shimmer": "color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)",
					"--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-menu-icon": "var(--dsw-alias-label-primary-dimmed)",
					"--dsw-alias-link": "#00ff88",
					"--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-block-banner": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-code-block": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-code-segment-selected": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-alias-markdown-code-segment-unselected": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-alias-markdown-inline-code": "rgba(0, 255, 65, 0.12)",
					"--dsw-alias-markdown-placeholder": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-markdown-tag": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-alias-scrollbar-bg-l1": "var(--dsw-static-neutral-700)",
					"--dsw-alias-scrollbar-bg-l2": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l1": "var(--dsw-static-neutral-600)",
					"--dsw-alias-scrollbar-hover-l2": "var(--dsw-static-neutral-550)",
					"--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)",
					"--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-800)",
					"--dsw-alias-code-diff-added": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-code-diff-deleted": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-added-bg": "var(--dsw-static-green-500-a12)",
					"--dsw-alias-file-diff-added-gutter": "color-mix(in srgb, var(--dsw-static-green-500) 6%, transparent)",
					"--dsw-alias-file-diff-added-marker": "var(--dsw-static-green-500)",
					"--dsw-alias-file-diff-deleted-bg": "var(--dsw-static-red-400-a12)",
					"--dsw-alias-file-diff-deleted-gutter": "color-mix(in srgb, var(--dsw-static-red-500) 6%, transparent)",
					"--dsw-alias-file-diff-deleted-marker": "var(--dsw-static-red-500)",
					"--dsw-alias-state-error-primary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)",
					"--dsw-alias-state-idle-primary": "var(--dsw-static-neutral-600)",
					"--dsw-alias-state-success-primary": "var(--dsw-static-green-500)",
					"--dsw-alias-state-success-secondary": "var(--dsw-static-green-400)",
					"--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)",
					"--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)",
					"--dsw-alias-state-warn-primary": "var(--dsw-static-amber-500)",
					"--dsw-alias-state-warn-secondary": "var(--dsw-static-amber-400)",
					"--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)",
					"--dsw-alias-switch-thumb": "var(--dsw-static-neutral-bluish-200)",
					"--dsw-alias-toast-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-toast-label": "var(--dsw-static-neutral-bluish-00)",
					"--dsw-alias-turn-trigger-bg": "var(--dsw-alias-interactive-bg-hover)",
					"--dsw-alias-turn-trigger-bg-hover": "var(--dsw-alias-interactive-bg-active)",
					"--dsw-alias-tooltip-bg": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-alias-tooltip-key-bg": "color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)",
					"--dsw-alias-menu-group-header-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 94%, transparent)",
					"--dsw-specific-bubble-highlight": "var(--dsw-static-neutral-bluish-750)",
					"--dsw-specific-bubble": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-input-major": "var(--dsw-static-neutral-bluish-850)",
					"--dsw-specific-login-input": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-menu": "var(--dsw-menu-surface-fill)",
					"--dsw-specific-selector": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-fill": "var(--dsw-static-neutral-bluish-900)",
					"--dsw-specific-sidebar-nav-item-active-accent": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-specific-sidebar-nav-item-active": "rgba(0, 255, 65, 0.18)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(0, 255, 65, 0.08)",
					"--dsw-specific-tip": "var(--dsw-static-neutral-bluish-800)",
					"--dsw-menu-surface-fill": "color-mix(in srgb, var(--dsw-alias-bg-layer-3) 75%, transparent)"
				}
			}
		];
		//#endregion
		//#region src/client/theme/state.ts
		const STORAGE_KEYS = Object.freeze({
			themeOption: "codex-ui.theme.option",
			glassEnabled: "codex-ui.glass.enabled",
			glassMode: "codex-ui.glass.mode",
			glassPreset: "codex-ui.glass.preset",
			glassGlow: "codex-ui.glass.glow"
		});
		const listeners$3 = /* @__PURE__ */ new Set();
		const VALID_THEMES = [
			"stock",
			"codex-dark",
			"codex-light",
			"claude-dark",
			"claude-light",
			"dracula",
			"solarized-dark",
			"solarized-light",
			"gruvbox-dark",
			"gruvbox-light",
			"catppuccin-mocha",
			"catppuccin-macchiato",
			"catppuccin-frappe",
			"catppuccin-latte",
			"cyberpunk"
		];
		function safeGetItem$1(key) {
			try {
				if (typeof localStorage !== "undefined") return localStorage.getItem(key);
			} catch {}
			return null;
		}
		function safeSetItem$1(key, value) {
			try {
				if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
			} catch {}
		}
		function computeSnapshot() {
			const rawTheme = safeGetItem$1(STORAGE_KEYS.themeOption);
			const themeOption = rawTheme && VALID_THEMES.includes(rawTheme) ? rawTheme : "stock";
			const glassEnabled = safeGetItem$1(STORAGE_KEYS.glassEnabled) !== "false";
			const glassMode = safeGetItem$1(STORAGE_KEYS.glassMode) === "compat" ? "compat" : "mica";
			const rawPreset = safeGetItem$1(STORAGE_KEYS.glassPreset);
			const glassPreset = rawPreset === "clear" || rawPreset === "frosted" ? rawPreset : "standard";
			const glassGlow = safeGetItem$1(STORAGE_KEYS.glassGlow) === "true";
			return Object.freeze({
				themeOption,
				glassEnabled,
				glassMode,
				glassPreset,
				glassGlow,
				subPluginEnabled: currentSubPluginEnabled
			});
		}
		let currentSubPluginEnabled = true;
		/** 检查当前主题子插件是否在 Host 侧处于激活启用状态 */
		function isThemeSubPluginEnabled() {
			return currentSubPluginEnabled;
		}
		/** 供状态机与测试更新主题子插件启用标记，并广播触发响应式重渲染 */
		function setThemeSubPluginEnabled(enabled) {
			if (currentSubPluginEnabled !== enabled) {
				currentSubPluginEnabled = enabled;
				notify();
			}
		}
		let currentSnapshot = computeSnapshot();
		/** 获取当前主题与云母外观配置快照（通过事件驱动同步，避免高频无谓读盘） */
		function getThemeSettingsState() {
			return currentSnapshot;
		}
		function notify() {
			currentSnapshot = computeSnapshot();
			for (const listener of listeners$3) try {
				listener();
			} catch (e) {
				console.warn("[codex-ui:theme] listener error:", e);
			}
		}
		function setThemeOption(themeOption) {
			safeSetItem$1(STORAGE_KEYS.themeOption, themeOption);
			notify();
		}
		function setGlassEnabled(enabled) {
			safeSetItem$1(STORAGE_KEYS.glassEnabled, String(enabled));
			notify();
		}
		function setGlassMode(mode) {
			safeSetItem$1(STORAGE_KEYS.glassMode, mode);
			notify();
		}
		function setGlassPreset(preset) {
			safeSetItem$1(STORAGE_KEYS.glassPreset, preset);
			notify();
		}
		function setGlassGlow(glow) {
			safeSetItem$1(STORAGE_KEYS.glassGlow, String(glow));
			notify();
		}
		function subscribeThemeSettings(listener) {
			listeners$3.add(listener);
			return () => {
				listeners$3.delete(listener);
			};
		}
		if (typeof window !== "undefined") window.addEventListener("storage", (event) => {
			if (event.key === STORAGE_KEYS.themeOption || event.key === STORAGE_KEYS.glassEnabled || event.key === STORAGE_KEYS.glassMode || event.key === STORAGE_KEYS.glassPreset || event.key === STORAGE_KEYS.glassGlow) notify();
		});
		//#endregion
		//#region src/client/theme/index.ts
		let globalThemeRuntime;
		/**
		* 校验主题子插件是否在 Host 侧被显式停用。
		* 遵循统一的 fail-closed 契约：当端点 404 或网络不可达时视为停用并回退官方。
		*/
		async function checkThemeEnabled() {
			try {
				const base = typeof document !== "undefined" && document.baseURI ? document.baseURI : "http://localhost";
				const normalizedBase = base.endsWith("/") ? base : `${base}/`;
				const path = CODEX_UI_API_ENDPOINTS.theme.startsWith("/") ? CODEX_UI_API_ENDPOINTS.theme.slice(1) : CODEX_UI_API_ENDPOINTS.theme;
				const url = new URL(path, normalizedBase).href;
				const res = await fetch(url);
				if (!res.ok) return false;
				return (await res.json())?.enabled === true;
			} catch {
				return false;
			}
		}
		function tolerantRegistration(run) {
			try {
				return run() ?? (() => {});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (!/already registered/i.test(message)) console.warn("[codex-ui:theme] registration skipped:", message);
				return () => {};
			}
		}
		let lastAppliedTokens = [];
		let hasAppliedCustomTheme = false;
		const THEME_SURFACE_STYLE_ID = "dsh-codex-ui-theme-surface-style";
		/**
		* 确保注入消除插件页等场景色差的全局表面样式
		*/
		function ensureThemeSurfaceStyles(doc = typeof document !== "undefined" ? document : void 0) {
			if (!doc) return;
			let tag = doc.getElementById(THEME_SURFACE_STYLE_ID);
			if (!tag) {
				tag = doc.createElement("style");
				tag.id = THEME_SURFACE_STYLE_ID;
				tag.textContent = `
/* 彻底消除插件管理页顶栏与全局背景之间的色差：静止与滚动吸顶均保持底板透明，与全局背景底色与渐变自然融为一体；吸顶时仅保留微透磨砂与底部分割线 */
[data-plugin-bar]:before,
[class*="pageBar"]:before {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  transition: background 0.15s ease !important;
}

[data-plugin-bar][data-scrolled]:before,
[data-plugin-bar][data-compact]:before,
[class*="pageBar"][data-scrolled]:before,
[class*="pageBar"][data-compact]:before {
  background: transparent !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
}

[data-plugin-bar][data-compact]:after,
[class*="pageBar"][data-compact]:after,
[data-plugin-bar][data-scrolled]:after,
[class*="pageBar"][data-scrolled]:after {
  content: "" !important;
  position: absolute !important;
  inset-inline: 0 !important;
  bottom: 0 !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  pointer-events: none !important;
}

/* 轨迹视图保持 100% 满宽排版，严禁被云母浮动模式缩减为居中窄列与圆角卡片 */
[data-dsh-glass-float] [data-dsh-glass-trajectory],
[data-dsh-glass] [data-dsh-glass-trajectory],
[data-dsh-glass] [data-conversation-composer-overlay] {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

/* 斜杠指令/快捷指令候选面板（[data-trigger-menu] / Issue #72）：
   在选用自定义主题时，无论是否开启毛玻璃，提升面板材质浓度，杜绝悬浮在消息流上时的字叠字穿透 */
[data-trigger-menu] {
  --dsw-menu-surface-fill: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e2e) 88%, transparent) !important;
  --dsw-specific-menu: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e2e) 88%, transparent) !important;
  --dsw-menu-backdrop-filter: blur(24px) saturate(140%) !important;
}
`;
				doc.head.appendChild(tag);
			}
		}
		function removeThemeSurfaceStyles(doc = typeof document !== "undefined" ? document : void 0) {
			if (!doc) return;
			const tag = doc.getElementById(THEME_SURFACE_STYLE_ID);
			if (tag) tag.remove();
		}
		/**
		* 彻底恢复宿主官方原生主题呈现（严格遵循宿主 ui-layout / ThemePresenter 契约规范）：
		* - 优先从 runtime.getTheme() 快照权威读取 active.colorScheme，未就绪时安全回退到 prefers-color-scheme；
		* - 严格约束 data-ds-theme-source 仅允许 'system' | 'dark' | 'light'，严禁把自定义主题 id 写到根节点导致 Electron preload 越界；
		* - 绝不盲目删除 data-ds-dark-theme，确保深色模式下切回/停用时稳稳保持黑色底盘！
		*/
		function restoreNativeThemePresentation(themeRuntime) {
			if (typeof document === "undefined") return;
			const snap = (themeRuntime ?? globalThemeRuntime)?.getTheme?.();
			const systemDark = typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
			const scheme = snap?.active?.colorScheme ?? (systemDark ? "dark" : "light");
			const preference = snap?.preference ?? "system";
			const isDark = scheme === "dark";
			const source = preference === "system" ? "system" : scheme;
			document.documentElement.dataset.dsThemeSource = source;
			document.documentElement.style.colorScheme = scheme;
			if (isDark) document.body.setAttribute("data-ds-dark-theme", "");
			else document.body.removeAttribute("data-ds-dark-theme");
		}
		/**
		* 将指定主题精准映射并深度应用到真实 DOM（双重保险，彻底压制并覆盖官方亮暗限制）
		*/
		function applyThemeToDocument(themeOption, themeRuntime, syncRuntime = true) {
			if (typeof document === "undefined") return;
			if (!isThemeSubPluginEnabled()) {
				removeThemeSurfaceStyles();
				for (const name of lastAppliedTokens) document.body.style.removeProperty(name);
				lastAppliedTokens = [];
				return;
			}
			const runtime = themeRuntime ?? globalThemeRuntime;
			if (themeOption === "stock") {
				removeThemeSurfaceStyles();
				for (const name of lastAppliedTokens) document.body.style.removeProperty(name);
				lastAppliedTokens = [];
				if (syncRuntime && runtime && typeof runtime.setTheme === "function") try {
					const activeId = runtime.getTheme?.()?.active?.id;
					if (activeId && ALL_BUILTIN_THEMES.some((t) => t.id === activeId)) runtime.setTheme("system");
				} catch {}
				if (hasAppliedCustomTheme) {
					restoreNativeThemePresentation(runtime);
					hasAppliedCustomTheme = false;
				}
				return;
			}
			const targetTheme = ALL_BUILTIN_THEMES.find((t) => t.id === themeOption);
			if (!targetTheme) return;
			hasAppliedCustomTheme = true;
			ensureThemeSurfaceStyles();
			if (syncRuntime && runtime && typeof runtime.setTheme === "function") try {
				if (runtime.getTheme?.()?.active?.id !== targetTheme.id) runtime.setTheme(targetTheme.id);
			} catch {}
			const scheme = targetTheme.colorScheme;
			document.documentElement.style.colorScheme = scheme;
			document.documentElement.setAttribute("data-ds-theme-source", scheme);
			if (scheme === "dark") document.body.setAttribute("data-ds-dark-theme", "");
			else document.body.removeAttribute("data-ds-dark-theme");
			for (const name of lastAppliedTokens) if (!(name in targetTheme.tokens)) document.body.style.removeProperty(name);
			const applied = [];
			for (const [name, value] of Object.entries(targetTheme.tokens)) {
				document.body.style.setProperty(name, value);
				applied.push(name);
			}
			lastAppliedTokens = applied;
		}
		/**
		* 供 UI 直接调用的主题切换入口，立即执行 ThemeRuntime.setTheme 并持久化。
		*/
		function changeTheme(themeOption) {
			if (!isThemeSubPluginEnabled()) {
				console.warn("[codex-ui:theme] Theme sub-plugin is disabled on host, changeTheme skipped");
				return;
			}
			setThemeOption(themeOption);
			applyThemeToDocument(themeOption);
		}
		/**
		* 供 UI 直接调用的玻璃质感与排版模式切换入口。
		*/
		function changeGlass(options) {
			if (!isThemeSubPluginEnabled()) {
				console.warn("[codex-ui:theme] Theme sub-plugin is disabled on host, changeGlass skipped");
				return;
			}
			const state = getThemeSettingsState();
			const enabled = options.enabled ?? state.glassEnabled;
			const mode = options.mode ?? state.glassMode;
			const preset = options.preset ?? state.glassPreset;
			const glow = options.glow ?? state.glassGlow;
			if (options.enabled !== void 0) setGlassEnabled(options.enabled);
			if (options.mode !== void 0) setGlassMode(options.mode);
			if (options.preset !== void 0) setGlassPreset(options.preset);
			if (options.glow !== void 0) setGlassGlow(options.glow);
			applyGlassSettings({
				enabled,
				mode,
				preset,
				glow
			});
		}
		let globalCheckAndSync;
		/**
		* 挂载并观察主题与外观增强：
		* - 注册全部 6 套内置主题至 ThemeRuntime；
		* - 响应本地配置与云母模式切换；
		* - 卸载时纯净还原 DOM 与官方主题。
		*/
		function observeTheme(ctx) {
			let disposed = false;
			const theme = ctx.get("theme");
			globalThemeRuntime = theme;
			const disposers = [];
			const registerThemesOnRuntime = (runtimeInstance) => {
				if (typeof runtimeInstance.register === "function") for (const themeDef of ALL_BUILTIN_THEMES) {
					const dispose = tolerantRegistration(() => runtimeInstance.register(themeDef));
					disposers.push(dispose);
				}
			};
			const applyCurrentState = (syncRuntime = true) => {
				if (disposed || !isThemeSubPluginEnabled()) return;
				const state = getThemeSettingsState();
				applyGlassSettings({
					enabled: state.glassEnabled,
					mode: state.glassMode,
					preset: state.glassPreset,
					glow: state.glassGlow
				});
				applyThemeToDocument(state.themeOption, globalThemeRuntime ?? theme, syncRuntime);
			};
			if (theme) {
				registerThemesOnRuntime(theme);
				applyCurrentState(false);
			} else {
				let retries = 0;
				const timer = setInterval(() => {
					if (disposed) {
						clearInterval(timer);
						return;
					}
					const lateTheme = ctx.get("theme");
					if (lateTheme) {
						clearInterval(timer);
						globalThemeRuntime = lateTheme;
						registerThemesOnRuntime(lateTheme);
						applyCurrentState(false);
					} else if (++retries >= 100) {
						clearInterval(timer);
						console.warn("[codex-ui:theme] host theme service not ready after 5s polling, continuing with DOM-only fallback");
					}
				}, 50);
				disposers.push(() => clearInterval(timer));
			}
			let healTimer;
			const checkAndSync = async () => {
				if (disposed) return;
				const enabled = await checkThemeEnabled();
				if (disposed) return;
				if (!enabled) {
					setThemeSubPluginEnabled(false);
					disposeGlassMode();
					removeThemeSurfaceStyles();
					for (const name of lastAppliedTokens) document.body.style.removeProperty(name);
					lastAppliedTokens = [];
					if (hasAppliedCustomTheme) {
						restoreNativeThemePresentation(theme ?? globalThemeRuntime);
						hasAppliedCustomTheme = false;
					}
					if (!healTimer) healTimer = setInterval(() => {
						if (typeof document !== "undefined" && document.visibilityState === "visible") checkAndSync();
					}, 3e3);
					return;
				}
				if (healTimer) {
					clearInterval(healTimer);
					healTimer = void 0;
				}
				setThemeSubPluginEnabled(true);
				applyCurrentState(true);
			};
			globalCheckAndSync = checkAndSync;
			const onFocus = () => {
				if (!disposed) checkAndSync();
			};
			if (typeof window !== "undefined") {
				window.addEventListener("focus", onFocus);
				disposers.push(() => window.removeEventListener("focus", onFocus));
			}
			if (typeof document !== "undefined") {
				let clickTimer;
				const onClick = (e) => {
					if (disposed) return;
					if (e.target?.closest?.("[data-plugin-rows], [data-plugin-row], [data-shortcut-modal=\"settings\"], [role=\"switch\"]")) {
						if (clickTimer) clearTimeout(clickTimer);
						clickTimer = setTimeout(() => {
							if (!disposed) checkAndSync();
						}, 150);
					}
				};
				document.addEventListener("click", onClick, true);
				disposers.push(() => {
					if (clickTimer) clearTimeout(clickTimer);
					document.removeEventListener("click", onClick, true);
				});
			}
			if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
				let settingsObserverTimer;
				const observer = new MutationObserver((mutations) => {
					if (disposed) return;
					let touchesSettings = false;
					for (const m of mutations) if (m.target instanceof HTMLElement && (m.target.closest("[data-shortcut-modal=\"settings\"]") || m.target.closest("[data-plugin-rows]")) || [...m.addedNodes, ...m.removedNodes].some((n) => n instanceof HTMLElement && (n.getAttribute?.("data-shortcut-modal") === "settings" || n.querySelector?.("[data-shortcut-modal=\"settings\"]")))) {
						touchesSettings = true;
						break;
					}
					if (touchesSettings) {
						if (settingsObserverTimer) clearTimeout(settingsObserverTimer);
						settingsObserverTimer = setTimeout(() => {
							if (!disposed) checkAndSync();
						}, 150);
					}
				});
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ["data-state", "aria-checked"]
				});
				disposers.push(() => {
					if (settingsObserverTimer) clearTimeout(settingsObserverTimer);
					observer.disconnect();
				});
			}
			checkAndSync();
			applyCurrentState(false);
			const offThemeChange = ctx.on("theme/change", () => {
				if (disposed || !isThemeSubPluginEnabled()) return;
				const state = getThemeSettingsState();
				if (state.themeOption === "stock") return;
				applyThemeToDocument(state.themeOption, void 0, false);
			});
			const unsubscribe = subscribeThemeSettings(() => {
				if (disposed || !isThemeSubPluginEnabled()) return;
				applyCurrentState();
			});
			return () => {
				disposed = true;
				if (globalCheckAndSync === checkAndSync) globalCheckAndSync = void 0;
				if (healTimer) clearInterval(healTimer);
				unsubscribe();
				offThemeChange?.();
				disposeGlassMode();
				for (const dispose of disposers) dispose();
				if (globalThemeRuntime === theme) globalThemeRuntime = void 0;
			};
		}
		//#endregion
		//#region src/client/theme/ThemeSettingsCard.tsx
		const THEME_BUTTONS = [
			{
				id: "stock",
				labelKey: "theme.paletteStock",
				subKey: "theme.subStock",
				accent: "#3b82f6",
				colorScheme: "auto"
			},
			{
				id: "codex-dark",
				labelKey: "theme.paletteCodexDark",
				subKey: "theme.subCodexDark",
				accent: "#339cff",
				colorScheme: "dark"
			},
			{
				id: "codex-light",
				labelKey: "theme.paletteCodexLight",
				subKey: "theme.subCodexLight",
				accent: "#0169cc",
				colorScheme: "light"
			},
			{
				id: "claude-dark",
				labelKey: "theme.paletteClaudeDark",
				subKey: "theme.subClaudeDark",
				accent: "#d97757",
				colorScheme: "dark"
			},
			{
				id: "claude-light",
				labelKey: "theme.paletteClaudeLight",
				subKey: "theme.subClaudeLight",
				accent: "#d97757",
				colorScheme: "light"
			},
			{
				id: "dracula",
				labelKey: "theme.paletteDracula",
				subKey: "theme.subDracula",
				accent: "#ff79c6",
				colorScheme: "dark"
			},
			{
				id: "solarized-dark",
				labelKey: "theme.paletteSolarizedDark",
				subKey: "theme.subSolarizedDark",
				accent: "#2aa198",
				colorScheme: "dark"
			},
			{
				id: "solarized-light",
				labelKey: "theme.paletteSolarizedLight",
				subKey: "theme.subSolarizedLight",
				accent: "#268bd2",
				colorScheme: "light"
			},
			{
				id: "gruvbox-dark",
				labelKey: "theme.paletteGruvboxDark",
				subKey: "theme.subGruvboxDark",
				accent: "#fabd2f",
				colorScheme: "dark"
			},
			{
				id: "gruvbox-light",
				labelKey: "theme.paletteGruvboxLight",
				subKey: "theme.subGruvboxLight",
				accent: "#b57614",
				colorScheme: "light"
			},
			{
				id: "catppuccin-mocha",
				labelKey: "theme.paletteMocha",
				subKey: "theme.subMocha",
				accent: "#cba6f7",
				colorScheme: "dark"
			},
			{
				id: "catppuccin-macchiato",
				labelKey: "theme.paletteMacchiato",
				subKey: "theme.subMacchiato",
				accent: "#c6a0f6",
				colorScheme: "dark"
			},
			{
				id: "catppuccin-frappe",
				labelKey: "theme.paletteFrappe",
				subKey: "theme.subFrappe",
				accent: "#ca9ee6",
				colorScheme: "dark"
			},
			{
				id: "catppuccin-latte",
				labelKey: "theme.paletteLatte",
				subKey: "theme.subLatte",
				accent: "#8839ef",
				colorScheme: "light"
			},
			{
				id: "cyberpunk",
				labelKey: "theme.paletteCyberpunk",
				subKey: "theme.subCyberpunk",
				accent: "#00ff41",
				colorScheme: "dark"
			}
		];
		const stylesheet$1 = `
${SECTION_CARD_CSS}
.dcu-theme-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dcu-theme-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dcu-theme-palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
  gap: 8px;
}
.dcu-theme-cube {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.02));
  color: var(--dsw-alias-label-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
}
.dcu-theme-cube:hover:not(.selected) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06));
  border-color: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.16));
}
.dcu-theme-cube:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}
/* 选中态：深度融入主题专属强调色与同色发光边框 */
.dcu-theme-cube.selected {
  background: color-mix(in srgb, var(--cube-accent) 14%, var(--dsw-alias-bg-layer-2, #18181b)) !important;
  border-color: var(--cube-accent) !important;
  box-shadow: 0 0 0 1px var(--cube-accent), 0 2px 10px color-mix(in srgb, var(--cube-accent) 25%, transparent) !important;
}
.dcu-theme-cube-head {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: 100%;
}
.dcu-theme-swatch {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background-color: var(--cube-accent);
  box-shadow: 0 0 6px color-mix(in srgb, var(--cube-accent) 45%, transparent);
}
.dcu-theme-cube-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dcu-theme-cube.selected .dcu-theme-cube-title {
  font-weight: 600;
}
.dcu-theme-cube-sub {
  font-size: 11px;
  line-height: 15px;
  color: var(--dsw-alias-label-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.dcu-theme-cube.selected .dcu-theme-cube-sub {
  color: var(--dsw-alias-label-secondary);
}
.dcu-theme-row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 140px;
  flex: 1;
}
.dcu-theme-row-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
.dcu-theme-row-hint {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}
.dcu-theme-sub-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.02));
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
  border-radius: 8px;
}
.dcu-theme-row,
.dcu-theme-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.dcu-theme-sub-row [role="tablist"],
.dcu-theme-sub-row [data-slot="segmented-control"] {
  min-width: 240px;
}
.dcu-theme-code-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.dcu-theme-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dcu-theme-code-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary);
}
.dcu-theme-code-lang {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--dsw-font-markdown-code-block-font-family, var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace));
}
.dcu-theme-code-sample {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--dsw-alias-markdown-code-block, var(--dsw-alias-bg-layer-2));
  color: var(--shiki-foreground, var(--dsw-alias-label-primary));
  font-family: var(--dsw-font-markdown-code-block-font-family, var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace));
  font-size: 12px;
  line-height: 20px;
  white-space: pre;
  overflow-x: auto;
}
.dcu-tok-keyword {
  color: var(--shiki-token-keyword, var(--dsw-static-blue-500));
}
.dcu-tok-function {
  color: var(--shiki-token-function, var(--dsw-static-amber-500));
}
.dcu-tok-parameter {
  color: var(--shiki-token-parameter, var(--dsw-alias-label-primary));
}
.dcu-tok-string {
  color: var(--shiki-token-string, var(--dsw-static-green-500));
}
.dcu-tok-punct {
  color: var(--shiki-token-punctuation, var(--dsw-alias-label-secondary));
}
.dcu-tok-comment {
  color: var(--shiki-token-comment, var(--dsw-alias-label-tertiary));
  font-style: italic;
}
`;
		function ThemeSettingsCard({ t }) {
			const state = (0, react.useSyncExternalStore)(subscribeThemeSettings, getThemeSettingsState, getThemeSettingsState);
			if (!state.subPluginEnabled) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-section-card dcu-theme-settings",
				"aria-label": t("theme.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: stylesheet$1 }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-section-header",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-section-title-wrap",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: "dcu-section-title",
								children: t("theme.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dcu-section-desc",
								children: t("theme.desc")
							})]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-theme-section",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-theme-row-label",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-theme-row-title",
									children: t("theme.palette")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-theme-row-hint",
									children: t("theme.paletteHint")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-theme-palette-grid",
								role: "group",
								"aria-label": t("theme.palette"),
								children: THEME_BUTTONS.map((item) => {
									const isActive = state.themeOption === item.id;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: `dcu-theme-cube${isActive ? " selected" : ""}`,
										style: { "--cube-accent": item.accent },
										"aria-pressed": isActive,
										onClick: () => {
											changeTheme(item.id);
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dcu-theme-cube-head",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dcu-theme-swatch",
												"aria-hidden": "true"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dcu-theme-cube-title",
												children: t(item.labelKey)
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-theme-cube-sub",
											children: t(item.subKey)
										})]
									}, item.id);
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-theme-code-preview",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-theme-code-header",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-theme-code-label",
										children: t("theme.codeHighlight")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-theme-code-lang",
										children: "JavaScript"
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
									className: "dcu-theme-code-sample",
									tabIndex: 0,
									"aria-label": t("theme.codeHighlight"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-comment",
											children: "// A sample JavaScript code"
										}),
										"\n",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-keyword",
											children: "const"
										}),
										" ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-function",
											children: "greet"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-punct",
											children: " = ("
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-parameter",
											children: "name"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-punct",
											children: ") => "
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-string",
											children: "`hi ${name}`"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-punct",
											children: ";"
										}),
										"\n",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-keyword",
											children: "console"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-punct",
											children: "."
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-function",
											children: "log"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-punct",
											children: "("
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-function",
											children: "greet"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-punct",
											children: "("
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-string",
											children: "'world'"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-tok-punct",
											children: "));"
										})
									] })
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-theme-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-theme-row-label",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-theme-row-title",
								children: t("theme.glassEnable")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-theme-row-hint",
								children: t("theme.glassHint")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
							label: t("theme.glassEnable"),
							checked: state.glassEnabled,
							onChange: (checked) => {
								changeGlass({ enabled: checked });
							}
						})]
					}),
					state.glassEnabled && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-theme-sub-group",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-theme-sub-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-theme-row-label",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-theme-row-title",
										children: t("theme.mode")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-theme-row-hint",
										children: t("theme.modeHint")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
									id: "codex-ui-glass-mode",
									label: t("theme.mode"),
									value: state.glassMode,
									options: [{
										value: "compat",
										label: t("theme.modeCompat")
									}, {
										value: "mica",
										label: t("theme.modeMica")
									}],
									onChange: (nextMode) => {
										changeGlass({
											mode: nextMode,
											enabled: true
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-theme-sub-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-theme-row-label",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-theme-row-title",
										children: t("theme.glassPreset")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-theme-row-hint",
										children: t("theme.glassPresetHint")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
									id: "codex-ui-glass-preset",
									label: t("theme.glassPreset"),
									value: state.glassPreset,
									options: [
										{
											value: "clear",
											label: t("theme.presetClear")
										},
										{
											value: "standard",
											label: t("theme.presetStandard")
										},
										{
											value: "frosted",
											label: t("theme.presetFrosted")
										}
									],
									onChange: (nextPreset) => {
										changeGlass({
											preset: nextPreset,
											enabled: true
										});
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-theme-sub-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-theme-row-label",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-theme-row-title",
										children: t("theme.glassGlow")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-theme-row-hint",
										children: t("theme.glassGlowHint")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
									label: t("theme.glassGlow"),
									checked: state.glassGlow,
									onChange: (nextGlow) => {
										changeGlass({
											glow: nextGlow,
											enabled: true
										});
									}
								})]
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/composer/prediction-state.ts
		/**
		* 输入预测（ghost 建议）的用户级开关。
		*
		* 设计约束：
		* - **只影响预测**，不牵连 `↑`/`↓` 历史召回、宽度手柄、新会话建议卡片；
		* - 关闭后客户端**完全不发请求**，所以不产生任何辅助模型 token 花费（不需要 Host 侧再校验一次）；
		* - `hostAllowed` 来自 Host 状态端点：profile 的 `cordis.patch.yml` 给 `codex-ui-composer`
		*   配 `config: { prediction: false }` 时会被置为 `false`，此时用户开关置灰（fail-closed，
		*   站点管理员意志优先，等价于主题子插件的 `subPluginEnabled` 语义）。
		*/
		const PREDICTION_STORAGE_KEY = "codex-ui.composer.prediction";
		/** 同一窗口内跨标签页同步（storage 事件在写入方自身不触发）。 */
		const PREDICTION_STORAGE_EVENT = "codex-ui:prediction-change";
		const listeners$2 = /* @__PURE__ */ new Set();
		function safeGetItem(key) {
			try {
				if (typeof localStorage !== "undefined") return localStorage.getItem(key);
			} catch {}
			return null;
		}
		function safeSetItem(key, value) {
			try {
				if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
			} catch {}
		}
		function parseStoredMode(raw) {
			if (raw === "off" || raw === "false" || raw === "0") return "off";
			if (raw === "continue") return "continue";
			return "all";
		}
		let subPluginEnabled = true;
		let currentMode = parseStoredMode(safeGetItem(PREDICTION_STORAGE_KEY));
		let hostAllowed = true;
		function snapshot() {
			const effective = subPluginEnabled && hostAllowed && currentMode !== "off";
			return {
				subPluginEnabled,
				userEnabled: currentMode !== "off",
				mode: currentMode,
				hostAllowed,
				enabled: effective,
				nextEnabled: effective && currentMode === "all",
				continueEnabled: effective && (currentMode === "continue" || currentMode === "all")
			};
		}
		let cached = snapshot();
		function publish$1() {
			const next = snapshot();
			if (next.subPluginEnabled === cached.subPluginEnabled && next.userEnabled === cached.userEnabled && next.mode === cached.mode && next.hostAllowed === cached.hostAllowed && next.enabled === cached.enabled && next.nextEnabled === cached.nextEnabled && next.continueEnabled === cached.continueEnabled) return;
			cached = next;
			for (const listener of [...listeners$2]) try {
				listener();
			} catch {}
		}
		/** 稳定的只读快照，可直接交给 `useSyncExternalStore`。 */
		function getPredictionSettingsState() {
			return cached;
		}
		function subscribePredictionSettings(listener) {
			listeners$2.add(listener);
			return () => listeners$2.delete(listener);
		}
		function setPredictionMode(mode) {
			currentMode = mode;
			safeSetItem(PREDICTION_STORAGE_KEY, mode);
			publish$1();
			if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") try {
				window.dispatchEvent(new Event(PREDICTION_STORAGE_EVENT));
			} catch {}
		}
		/** Host 状态端点回报的配置位；缺省视为允许。 */
		function setHostPredictionAllowed(allowed) {
			hostAllowed = allowed;
			publish$1();
		}
		/** 标记 codex-ui-composer 子插件在 Host 侧的启用状态；未启用时设置卡片不渲染（对齐主题卡片）。 */
		function setSubPluginEnabled(enabled) {
			subPluginEnabled = enabled;
			publish$1();
		}
		/** 监听跨标签页与同窗口的设置变更。返回卸载函数。 */
		function observePredictionSettings() {
			if (typeof window === "undefined") return () => {};
			const onStorage = (event) => {
				if (event.key !== null && event.key !== "codex-ui.composer.prediction") return;
				currentMode = parseStoredMode(safeGetItem(PREDICTION_STORAGE_KEY));
				publish$1();
			};
			const onLocal = () => {
				currentMode = parseStoredMode(safeGetItem(PREDICTION_STORAGE_KEY));
				publish$1();
			};
			window.addEventListener("storage", onStorage);
			window.addEventListener(PREDICTION_STORAGE_EVENT, onLocal);
			return () => {
				window.removeEventListener("storage", onStorage);
				window.removeEventListener(PREDICTION_STORAGE_EVENT, onLocal);
			};
		}
		//#endregion
		//#region src/client/composer/history-scope.ts
		const HISTORY_SCOPE_STORAGE_KEY = "codex-ui.composer.history-scope";
		/** 同一窗口内跨标签页同步（storage 事件在写入方自身不触发）。 */
		const HISTORY_SCOPE_STORAGE_EVENT = "codex-ui:history-scope-change";
		const listeners$1 = /* @__PURE__ */ new Set();
		function safeStorage() {
			try {
				if (typeof localStorage !== "undefined") return localStorage;
			} catch {}
		}
		function parseStoredHistoryScope(raw) {
			return raw === "workspace" ? "workspace" : "session";
		}
		let currentScope = parseStoredHistoryScope(safeStorage()?.getItem(HISTORY_SCOPE_STORAGE_KEY));
		/** 稳定的只读快照，可直接交给 `useSyncExternalStore`。 */
		function getHistoryScope() {
			return currentScope;
		}
		function subscribeHistoryScope(listener) {
			listeners$1.add(listener);
			return () => {
				listeners$1.delete(listener);
			};
		}
		function publish() {
			for (const listener of [...listeners$1]) try {
				listener();
			} catch {}
		}
		function setHistoryScope(scope) {
			currentScope = scope;
			try {
				safeStorage()?.setItem(HISTORY_SCOPE_STORAGE_KEY, scope);
			} catch {}
			publish();
			if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") try {
				window.dispatchEvent(new Event(HISTORY_SCOPE_STORAGE_EVENT));
			} catch {}
		}
		/** 监听跨标签页与同窗口的设置变更。返回卸载函数。 */
		function observeHistoryScope() {
			if (typeof window === "undefined") return () => {};
			const sync = () => {
				const next = parseStoredHistoryScope(safeStorage()?.getItem(HISTORY_SCOPE_STORAGE_KEY));
				if (next === currentScope) return;
				currentScope = next;
				publish();
			};
			const onStorage = (event) => {
				if (event.key !== null && event.key !== "codex-ui.composer.history-scope") return;
				sync();
			};
			sync();
			window.addEventListener("storage", onStorage);
			window.addEventListener(HISTORY_SCOPE_STORAGE_EVENT, sync);
			return () => {
				window.removeEventListener("storage", onStorage);
				window.removeEventListener(HISTORY_SCOPE_STORAGE_EVENT, sync);
			};
		}
		//#endregion
		//#region src/client/composer/ComposerSettingsCard.tsx
		/**
		* 输入框增强设置卡片。
		*
		* 放预测开关与 ↑/↓ 历史召回范围；宽度手柄、建议卡片没有可调项，
		* 用不到就不渲染成灰项，遵循插件「不残留死配置」的既有约定。
		*
		* 站点级关闭（profile `cordis.patch.yml` 里 `config: { prediction: false }`）时，
		* 开关保持可见但置为关闭且禁用，并给出原因提示——比整卡消失更容易排查。
		*/
		function ComposerSettingsCard({ t }) {
			const state = (0, react.useSyncExternalStore)(subscribePredictionSettings, getPredictionSettingsState, getPredictionSettingsState);
			const historyScope = (0, react.useSyncExternalStore)(subscribeHistoryScope, getHistoryScope, getHistoryScope);
			if (!state.subPluginEnabled) return null;
			const lockedByHost = !state.hostAllowed;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-section-card dcu-composer-settings",
				"aria-label": t("composer.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: SECTION_CARD_CSS + SETTINGS_ROW_CSS }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-section-header",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-section-title-wrap",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: "dcu-section-title",
								children: t("composer.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dcu-section-desc",
								children: t("composer.desc")
							})]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-settings-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-settings-row-label",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-settings-row-title",
								children: t("composer.prediction")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-settings-row-hint",
								children: lockedByHost ? t("composer.predictionLocked") : t("composer.predictionHint")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
							id: "codex-ui-composer-prediction-mode",
							label: t("composer.prediction"),
							value: state.mode,
							disabled: lockedByHost,
							options: [
								{
									value: "off",
									label: t("composer.modeOff")
								},
								{
									value: "continue",
									label: t("composer.modeContinue")
								},
								{
									value: "all",
									label: t("composer.modeAll")
								}
							],
							onChange: (nextMode) => {
								if (lockedByHost) return;
								setPredictionMode(nextMode);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-settings-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-settings-row-label",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-settings-row-title",
								children: t("composer.historyScope")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-settings-row-hint",
								children: t("composer.historyScopeHint")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
							id: "codex-ui-composer-history-scope",
							label: t("composer.historyScope"),
							value: historyScope,
							options: [{
								value: "session",
								label: t("composer.historyScopeSession")
							}, {
								value: "workspace",
								label: t("composer.historyScopeWorkspace")
							}],
							onChange: (nextScope) => {
								setHistoryScope(nextScope);
							}
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/AboutSection.tsx
		const PROJECT_HOMEPAGES = Object.fromEntries(MANAGED_DEPENDENCIES.map(({ id, packageName }) => [id, id === "market" ? "https://dshmarket.com" : `https://github.com/MichengAI/${packageName.split("/")[1]}`]));
		const openExternal = (url) => {
			window.open(url, "_blank", "noreferrer");
		};
		const PROGRESS_PHASES = /* @__PURE__ */ new Set([
			"resolving",
			"downloading",
			"linking",
			"building"
		]);
		const SUB_PLUGINS = [
			{
				id: "composer",
				nameKey: "about.feature.composer.name",
				descKey: "about.feature.composer"
			},
			{
				id: "settings-skin",
				nameKey: "about.feature.settingsSkin.name",
				descKey: "about.feature.settingsSkin"
			},
			{
				id: "session-title",
				nameKey: "about.feature.sessionTitle.name",
				descKey: "about.feature.sessionTitle"
			},
			{
				id: "sidebar",
				nameKey: "about.feature.sidebar.name",
				descKey: "about.feature.sidebar"
			},
			{
				id: "theme",
				nameKey: "about.feature.theme.name",
				descKey: "about.feature.theme"
			},
			{
				id: "desktop-menu",
				nameKey: "about.feature.desktopMenu.name",
				descKey: "about.feature.desktopMenu"
			},
			{
				id: "dependencies",
				nameKey: "about.feature.dependencies.name",
				descKey: "about.feature.dependencies"
			}
		];
		const endpoint = CODEX_UI_API_ENDPOINTS.dependencies;
		const stylesheet = `
.dcu-about{color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);display:flex;flex-direction:column}
.dcu-about-feedback-links,.dcu-about-links{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dcu-about-version{margin-left:8px;color:var(--dsw-alias-label-tertiary);font-family:inherit;font-size:12px;font-weight:500;line-height:18px;letter-spacing:0;white-space:nowrap;vertical-align:baseline}
.dcu-section-subtitle-wrap{margin-top:-4px;margin-bottom:4px}
.dcu-section-subtitle{font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.dcu-subplugins-list{display:flex;flex-direction:column;gap:6px}
.dcu-subplugin-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,0.03));border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,0.06));border-radius:8px;transition:background-color 120ms ease}
.dcu-subplugin-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,0.05))}
.dcu-subplugin-header{display:inline-flex;align-items:center;gap:8px;flex:none}
.dcu-subplugin-name{font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary)}
.dcu-subplugin-badge{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:14px;padding:2px 6px;border-radius:4px;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,0.06))}
.dcu-subplugin-desc{margin:0;flex:1;min-width:0;text-align:right;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
@media(max-width:768px){
  .dcu-subplugin-item{flex-direction:column;align-items:flex-start;gap:4px}
  .dcu-subplugin-desc{text-align:left}
}
.dcu-section-card{box-sizing:border-box;display:flex;flex-direction:column;gap:16px;padding:18px 20px;background:var(--dsw-alias-bg-layer-2,#18181b);border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,0.08));border-radius:12px;margin-bottom:16px;transition:border-color 0.15s ease,background-color 0.15s ease}
body:not([data-ds-dark-theme]) .dcu-section-card{background:var(--dsw-alias-bg-layer-2,#ffffff);border-color:var(--dsw-alias-border-l1,rgba(0,0,0,0.08))}
html[data-dsh-glass] .dcu-section-card{background:var(--dsw-alias-bg-layer-2,#18181b)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08)}
html[data-dsh-glass] body:not([data-ds-dark-theme]) .dcu-section-card{background:var(--dsw-alias-bg-layer-2,#ffffff)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.6)}
.dcu-section-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dcu-section-title-wrap{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.dcu-section-title{margin:0;font-size:15px;font-weight:600;line-height:22px;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px}
.dcu-section-desc{margin:0;font-size:13px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dcu-about-dependencies{overflow:hidden;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,0.08));border-radius:8px;background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,0.15))}
.dcu-about-dependency{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:38px;padding:6px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,0.06));transition:background-color 120ms ease}
.dcu-about-dependency:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,0.04))}
.dcu-about-dependency:last-child{border-bottom:0}
.dcu-about-copy{min-width:0;flex:1;display:flex;flex-direction:column;justify-content:center;gap:1px}
.dcu-about-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-shrink:0;min-width:140px}
.dcu-about-name{font-size:13px;line-height:17px;font-weight:600}
.dcu-about-package{overflow:hidden;margin-top:0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px;text-overflow:ellipsis;white-space:nowrap}
.dcu-about-status{display:flex;align-items:center;gap:4px;font-size:12px;line-height:16px;white-space:nowrap;flex-shrink:0}
.dcu-about-status[data-installed=true]{color:var(--dsw-alias-state-success-primary)}
.dcu-about-status[data-installed=false]{color:var(--dsw-alias-state-error-primary)}
.dcu-about-status[data-update=true]{color:var(--dsw-alias-state-warning-primary)}
.dcu-about-progress{display:flex;align-items:center;gap:8px;font-size:12px;margin-top:8px}
.dcu-about-progress-bar{flex:1;height:4px;background:var(--dsw-alias-border-l2);border-radius:2px;overflow:hidden}
.dcu-about-progress-fill{height:100%;background:var(--dsw-alias-brand-primary);transition:width 0.2s ease}
.dcu-about-message{padding:8px 12px;border-radius:6px;font-size:12px;margin-top:8px}
.dcu-about-message[data-error="true"]{color:var(--dsw-alias-state-error-primary,#ef4444);background:rgba(239,68,68,0.1)}
.dcu-about-project-link{color:inherit;text-decoration:none}
.dcu-about-project-link:hover{text-decoration:underline;text-underline-offset:3px}
.dcu-about-name-row{display:flex;align-items:center;gap:10px;min-width:0}
.dcu-about-name-row .dcu-about-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcu-about-downloads{display:inline-flex;align-items:center;gap:4px;flex:none;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:20px;font-weight:400;text-decoration:none;white-space:nowrap}
.dcu-about-downloads svg{flex:none;opacity:.75}
`;
		/** 宿主图标库不提供 GitHub 品牌标识，内联后可离线使用并继承当前文字颜色。 */
		function GithubMark16() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				viewBox: "0 0 16 16",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				focusable: "false",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "currentColor",
					d: "M8 0a8 8 0 0 0-2.53 15.59c.4.074.547-.173.547-.385 0-.19-.007-.693-.01-1.36-2.226.484-2.695-1.073-2.695-1.073-.364-.924-.89-1.17-.89-1.17-.726-.496.055-.486.055-.486.803.056 1.225.824 1.225.824.714 1.223 1.872.87 2.328.665.072-.517.28-.87.508-1.07-1.777-.202-3.645-.888-3.645-3.956 0-.874.31-1.588.823-2.148-.083-.202-.357-1.017.078-2.12 0 0 .672-.215 2.2.82A7.65 7.65 0 0 1 8 4.8c.68.003 1.365.092 2.004.27 1.527-1.035 2.197-.82 2.197-.82.437 1.103.162 1.918.08 2.12.513.56.822 1.274.822 2.148 0 3.076-1.872 3.752-3.654 3.95.288.248.544.735.544 1.482 0 1.07-.01 1.932-.01 2.195 0 .214.144.463.55.384A8.001 8.001 0 0 0 8 0Z"
				})
			});
		}
		function isDependencyStatus(value) {
			if (value === null || typeof value !== "object") return false;
			const status = value;
			return MANAGED_DEPENDENCIES.some((dependency) => dependency.id === status.id) && typeof status.packageName === "string" && typeof status.installed === "boolean" && typeof status.updateAvailable === "boolean";
		}
		function isInstallProgress(value) {
			if (value === null || typeof value !== "object") return false;
			const progress = value;
			const phase = progress.phase;
			const total = progress.total;
			const percent = progress.percent;
			const currentPackage = progress.currentPackage;
			return typeof progress.active === "boolean" && typeof progress.target === "string" && typeof progress.seconds === "number" && Number.isInteger(progress.seconds) && progress.seconds >= 0 && typeof progress.lastLine === "string" && (phase === null || typeof phase === "string" && PROGRESS_PHASES.has(phase)) && typeof progress.done === "number" && Number.isInteger(progress.done) && progress.done >= 0 && (total === null || typeof total === "number" && Number.isInteger(total) && total >= 0) && (percent === null || typeof percent === "number" && Number.isFinite(percent) && percent >= 0 && percent <= 100) && (currentPackage === null || typeof currentPackage === "string");
		}
		function progressLabel(progress, t) {
			if (progress.phase !== null) {
				const current = progress.currentPackage === null || progress.currentPackage === "" ? "" : ` · ${progress.currentPackage}`;
				const done = progress.done > 0 ? ` · ${t("about.packagesDone").replace("{0}", String(progress.done))}` : "";
				return `${t(`about.progress.${progress.phase}`)}${current}${done}`;
			}
			if (progress.lastLine !== "") return `${progress.lastLine}  (${progress.seconds}s)`;
			return t("about.progressHint");
		}
		/** Codex UI 的功能说明、配套管理插件状态与受限安装入口。 */
		function AboutSection(props) {
			const { t } = props;
			const ctx = getClientContext();
			const [dependencies, setDependencies] = (0, react.useState)([]);
			const [state, setState] = (0, react.useState)("loading");
			const [installing, setInstalling] = (0, react.useState)();
			const [progress, setProgress] = (0, react.useState)();
			const [message, setMessage] = (0, react.useState)();
			const [refreshFailed, setRefreshFailed] = (0, react.useState)(false);
			const [loadFailure, setLoadFailure] = (0, react.useState)();
			const alive = (0, react.useRef)(true);
			const root = (0, react.useRef)(null);
			const stateRef = (0, react.useRef)("loading");
			const requestId = (0, react.useRef)(0);
			const installingRef = (0, react.useRef)();
			stateRef.current = state;
			(0, react.useEffect)(() => {
				alive.current = true;
				return () => {
					alive.current = false;
				};
			}, []);
			const load = (0, react.useCallback)(async (signal) => {
				const currentRequest = ++requestId.current;
				if (stateRef.current !== "ready") setState("loading");
				try {
					const response = await fetch(endpoint, {
						cache: "no-store",
						signal
					});
					if (!response.ok) throw new BusinessRequestError(response.status);
					const payload = await response.json();
					if (signal?.aborted || currentRequest !== requestId.current) return;
					if (!Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error();
					setDependencies(payload.dependencies);
					setState("ready");
					setRefreshFailed(false);
					setLoadFailure(void 0);
				} catch (error) {
					if (signal?.aborted || error instanceof DOMException && error.name === "AbortError" || currentRequest !== requestId.current) return;
					setLoadFailure(error);
					if (stateRef.current === "ready") setRefreshFailed(true);
					else setState("failed");
				}
			}, []);
			(0, react.useEffect)(() => {
				const node = root.current;
				const controller = new AbortController();
				const refresh = () => {
					load(controller.signal);
				};
				refresh();
				if (node === null || typeof IntersectionObserver === "undefined") return () => {
					controller.abort();
				};
				let initialized = false;
				let wasVisible = false;
				const observer = new IntersectionObserver((entries) => {
					const visible = entries.some((entry) => entry.isIntersecting);
					if (!initialized) {
						initialized = true;
						wasVisible = visible;
						return;
					}
					if (visible && !wasVisible) refresh();
					wasVisible = visible;
				}, { threshold: .2 });
				observer.observe(node);
				return () => {
					controller.abort();
					observer.disconnect();
				};
			}, [load]);
			(0, react.useEffect)(() => {
				if (installing === void 0) {
					setProgress(void 0);
					return;
				}
				let cancelled = false;
				const pull = async () => {
					try {
						const response = await fetch(`${endpoint}?action=progress`, { cache: "no-store" });
						const payload = await response.json();
						if (cancelled || !response.ok || !isInstallProgress(payload.progress)) return;
						setProgress(payload.progress);
					} catch {}
				};
				pull();
				const timer = window.setInterval(() => {
					pull();
				}, 800);
				return () => {
					cancelled = true;
					window.clearInterval(timer);
				};
			}, [installing]);
			(0, react.useEffect)(() => {
				try {
					const remote = ctx?.remote;
					if (typeof remote?.$on !== "function") return;
					const unsubs = [];
					try {
						unsubs.push(remote.$on("plugin-manager/install-state", (data) => {
							if (data?.phase && typeof data.phase === "string") setProgress((prev) => prev ? {
								...prev,
								phase: data.phase
							} : void 0);
						}));
					} catch {}
					try {
						unsubs.push(remote.$on("plugin-manager/changed", () => {
							load();
						}));
					} catch {}
					return () => {
						unsubs.forEach((unsub) => {
							try {
								unsub?.();
							} catch {}
						});
					};
				} catch {}
			}, [ctx, load]);
			const install = async (id) => {
				if (installingRef.current !== void 0) return;
				if (dependencies.find((dep) => dep.id === id) === void 0) return;
				installingRef.current = id;
				setInstalling(id);
				setMessage(void 0);
				try {
					const response = await fetch(`${endpoint}?dependency=${encodeURIComponent(id)}`, { method: "POST" });
					let payload = {};
					try {
						payload = await response.json();
					} catch {}
					if ([401, 403].includes(response.status)) throw new BusinessRequestError(response.status);
					if (Array.isArray(payload.dependencies) && payload.dependencies.every(isDependencyStatus) && alive.current) setDependencies(payload.dependencies);
					if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus) || payload.application !== "applied" && payload.application !== "restart-required" && payload.application !== "overridden") throw new Error(typeof payload.error === "string" ? payload.error : t("about.installFailed"));
					if (!alive.current) return;
					setState("ready");
					setRefreshFailed(false);
					setMessage({
						error: false,
						text: payload.application === "overridden" ? t("about.applied") : payload.application === "applied" ? t("about.applied") : t("about.restartRequired")
					});
				} catch (error) {
					if (!alive.current) return;
					setMessage({
						error: true,
						text: installErrorText(error, t)
					});
				} finally {
					installingRef.current = void 0;
					if (alive.current) setInstalling(void 0);
				}
			};
			const updateAll = async () => {
				if (installingRef.current !== void 0) return;
				installingRef.current = "all";
				setInstalling("all");
				setMessage(void 0);
				try {
					const response = await fetch(`${endpoint}?action=update-all`, { method: "POST" });
					let payload = {};
					try {
						payload = await response.json();
					} catch {}
					if ([401, 403].includes(response.status)) throw new BusinessRequestError(response.status);
					if (Array.isArray(payload.dependencies) && payload.dependencies.every(isDependencyStatus) && alive.current) setDependencies(payload.dependencies);
					if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus) || payload.application !== "applied" && payload.application !== "restart-required" && payload.application !== "overridden") throw new Error(typeof payload.error === "string" ? payload.error : t("about.installFailed"));
					if (!alive.current) return;
					setState("ready");
					setRefreshFailed(false);
					setMessage({
						error: false,
						text: (payload.application === "applied" || payload.application === "overridden") && payload.updatedCount === 0 && Array.isArray(payload.results) && payload.results.length === 0 ? t("about.upToDate") : payload.application === "overridden" ? t("about.applied") : payload.application === "applied" ? t("about.applied") : t("about.restartRequired")
					});
				} catch (error) {
					if (!alive.current) return;
					setMessage({
						error: true,
						text: installErrorText(error, t)
					});
				} finally {
					installingRef.current = void 0;
					if (alive.current) setInstalling(void 0);
				}
			};
			const actionableCount = dependencies.filter((dependency) => !dependency.installed || dependency.updateAvailable).length;
			const selfVersion = dependencies.find((dependency) => dependency.id === "ui")?.version;
			const title = (id) => t(`about.dependency.${id}`);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				ref: root,
				className: "dcu-about",
				"aria-label": t("about.nav"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: stylesheet }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-section-card dcu-card-features",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-section-header",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-section-title-wrap",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
										className: "dcu-section-title",
										children: [t("about.title"), selfVersion === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dcu-about-version",
											children: ["v", selfVersion]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dcu-section-desc",
										children: t("about.description")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-about-feedback-links dcu-about-links",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GithubMark16, {}),
										"aria-label": t("about.viewProject"),
										onClick: () => {
											openExternal("https://github.com/MichengAI/dsh-codex-ui");
										},
										children: t("about.viewProject")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconListPenOutlineMedium, { size: 14 }),
										"aria-label": t("about.feedback"),
										onClick: () => {
											openExternal("https://github.com/MichengAI/dsh-codex-ui/issues");
										},
										children: t("about.feedback")
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-section-subtitle-wrap",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-section-subtitle",
									children: t("about.features")
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-subplugins-list",
								children: SUB_PLUGINS.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-subplugin-item",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-subplugin-header",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-subplugin-name",
											children: t(item.nameKey)
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
											className: "dcu-subplugin-badge",
											children: item.id
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dcu-subplugin-desc",
										children: t(item.descKey)
									})]
								}, item.id))
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThemeSettingsCard, { t }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ComposerSettingsCard, { t }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-section-card dcu-card-dependencies",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-section-header",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-section-title-wrap",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: "dcu-section-title",
										children: t("about.dependencies")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dcu-section-desc",
										children: t("about.dependenciesDescription")
									})]
								}), state === "ready" && actionableCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									icon: installing === "all" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconLoadingOutlineMedium, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconDownloadOutlineMedium, { size: 14 }),
									"aria-busy": installing === "all",
									disabled: installing !== void 0,
									onClick: () => {
										updateAll();
									},
									children: installing === "all" ? t("about.updatingAll") : t("about.updateAll")
								})]
							}),
							state === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-about-message",
								role: "status",
								children: t("about.loading")
							}) : state === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-about-message",
								"data-error": "true",
								role: "alert",
								children: t(businessRequestErrorKey(loadFailure) ?? "about.statusFailed")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-about-dependencies",
								"aria-busy": installing !== void 0,
								children: dependencies.map((dependency) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
									className: "dcu-about-dependency",
									"data-dependency-id": dependency.id,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-about-copy",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dcu-about-name-row",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
												className: "dcu-about-name dcu-about-project-link",
												href: PROJECT_HOMEPAGES[dependency.id],
												target: "_blank",
												rel: "noreferrer",
												children: title(dependency.id)
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
												className: "dcu-about-downloads",
												href: `https://www.npmjs.com/package/${dependency.packageName}`,
												target: "_blank",
												rel: "noreferrer",
												title: t("about.downloadsSource"),
												"aria-label": `${dependency.packageName} · ${t("about.totalDownloads")} · ${typeof dependency.totalDownloads === "number" && Number.isSafeInteger(dependency.totalDownloads) && dependency.totalDownloads >= 0 ? dependency.totalDownloads.toLocaleString() : t("about.downloadsUnavailable")}`,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconDownloadOutlineMedium, {
													size: 12,
													"aria-hidden": "true"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dcu-about-downloads-count",
													children: typeof dependency.totalDownloads === "number" && Number.isSafeInteger(dependency.totalDownloads) && dependency.totalDownloads >= 0 ? dependency.totalDownloads.toLocaleString() : "—"
												})]
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dcu-about-package",
											title: dependency.packageName,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
													className: "dcu-about-project-link",
													href: PROJECT_HOMEPAGES[dependency.id],
													target: "_blank",
													rel: "noreferrer",
													children: dependency.packageName
												}),
												dependency.version === void 0 ? "" : ` · ${dependency.version}`,
												dependency.updateAvailable && dependency.latestVersion !== void 0 ? ` → ${dependency.latestVersion}` : ""
											]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-about-actions",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dcu-about-status",
											"data-installed": dependency.installed,
											"data-update": dependency.updateAvailable,
											children: [dependency.installed && !dependency.updateAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCheckOutlineMedium, { size: 14 }), dependency.updateAvailable ? t("about.updateAvailable") : dependency.installed ? t("about.installed") : t("about.missing")]
										}), (!dependency.installed || dependency.updateAvailable) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											icon: installing === dependency.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconLoadingOutlineMedium, { size: 14 }) : !dependency.installed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconDownloadOutlineMedium, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconRefreshOutlineMedium, { size: 14 }),
											disabled: installing !== void 0,
											"aria-busy": installing === dependency.id,
											onClick: () => {
												install(dependency.id);
											},
											children: installing === dependency.id ? t("about.installing") : dependency.updateAvailable ? t("about.update") : t("about.install")
										})]
									})]
								}, dependency.id))
							}),
							installing !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-about-progress",
								role: "status",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconLoadingOutlineMedium, { size: 14 }) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: progress === void 0 ? t("about.progressHint") : progressLabel(progress, t) }),
									progress?.percent !== null && progress?.percent !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "dcu-about-progress-pct",
										children: [progress.percent, "%"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-about-progress-bar",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dcu-about-progress-fill",
											"data-wave": progress?.percent === null || progress?.percent === void 0,
											style: progress?.percent === null || progress?.percent === void 0 ? void 0 : { width: `${progress.percent}%` }
										})
									})
								]
							}),
							refreshFailed && state === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-about-message",
								"data-error": "true",
								role: "status",
								children: t(businessRequestErrorKey(loadFailure) ?? "about.refreshFailed")
							}),
							message !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-about-message",
								"data-error": message.error,
								role: message.error ? "alert" : "status",
								children: message.text
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales/ja.ts
		const ja = {
			"about.dependencies": "連携管理プラグイン",
			"about.dependenciesDescription": "各連携プラグインは個別のインストールとワンクリック一括同期アップデートをサポートしています。",
			"about.dependency.archive": "会話アーカイブ",
			"about.dependency.btw": "BTW クエリ",
			"about.dependency.dsh": "DeepSeek Harness",
			"about.dependency.experts": "エキスパート管理",
			"about.dependency.im": "IM アシスタント",
			"about.dependency.market": "アプリマーケット",
			"about.dependency.pet": "Codex ペット",
			"about.dependency.pua": "PUA",
			"about.dependency.review": "コードレビュー",
			"about.dependency.schedule": "定期タスク",
			"about.dependency.simplify": "Simplify",
			"about.dependency.skills": "スキル管理",
			"about.dependency.suite": "Codex スイート",
			"about.dependency.ui": "Codex UI",
			"about.description": "入力欄の拡張、全画面設定ワークベンチの美化、デスクトップウィンドウメニューおよびエコシステムプラグイン管理。",
			"about.downloadsSource": "npm 公式統計：パッケージ作成日から昨日までの累計ダウンロード数。クリックして npm パッケージを表示",
			"about.downloadsUnavailable": "利用不可",
			"about.feature.composer": "ターミナル風の入力履歴（↑/↓）呼び出し、レスポンシブな幅調整、およびタスク提案カード",
			"about.feature.composer.name": "入力欄拡張 (Composer)",
			"about.feature.dependencies": "DSH 公式およびサードパーティプラグインの一元管理とワンクリック一括アップデート",
			"about.feature.dependencies.name": "エコシステム管理 (Dependencies)",
			"about.feature.desktopMenu": "システムネイティブのメニューバーにヘルプ項目を追加し、ページの再読み込みや再起動を提供",
			"about.feature.desktopMenu.name": "デスクトップウィンドウメニュー (Desktop Menus)",
			"about.feature.sessionTitle": "最初のメッセージのセマンティクスに基づいて規範的なタイトルをインテリジェントに抽出・生成",
			"about.feature.sessionTitle.name": "スマートセッションタイトル (Session Title)",
			"about.feature.settingsSkin": "全画面設定ワークベンチの美化、カテゴリナビゲーションおよびネイティブ検索",
			"about.feature.settingsSkin.name": "ネイティブ設定スキン (Settings Skin)",
			"about.feature.sidebar": "モジュール式サイドバー、折りたたみ引き出し、および自由なドラッグ並べ替え",
			"about.feature.sidebar.name": "サイドバーナビゲーション (Sidebar)",
			"about.feature.theme": "Codex クラシック ダーク/ライトおよび Catppuccin カラーパレットを内蔵、マイカのすりガラス質感をサポート",
			"about.feature.theme.name": "テーマと外観 (Theme)",
			"about.features": "内蔵サブプラグインと機能",
			"about.feedback": "フィードバック",
			"about.install": "インストール",
			"about.installBuildPolicy": "プラグイン依存の pnpm ビルドスクリプトポリシーが未確認です。プロファイル設定を更新してください。",
			"about.installExitDesktop": "DSH Desktop を完全に終了し、再起動してから更新してください。",
			"about.installExitWeb": "実行中のプラグインファイルを上書きできません。DSH Web を停止し、ターミナルで更新してから再起動してください。",
			"about.installFailed": "プラグインのインストールに失敗しました。後でもう一度お試しください。",
			"about.installPnpmMissing": "環境内に pnpm が見つかりません。pnpm をインストールして DSH を再起動してください。",
			"about.installServiceUnavailable": "DSH Desktop 依存関係管理サービスが準備できていません。再起動してください。",
			"about.installBusy": "別のインストールが既に進行中です。完了するまでお待ちください。",
			"about.installSuiteUnsupported": "レガシースイートメンバーは自動移行できません。ホストのプラグインマネージャーで処理してください。",
			"about.installStoreMismatch": "プラグインディレクトリと pnpm リポジトリが一致しません。DSH Desktop を完全に終了してから再試行してください。",
			"about.installStoreMismatchWeb": "プラグインディレクトリと pnpm リポジトリが一致しません。DSH Web を停止して再試行してください。失敗が続く場合はプロファイルの依存関係を再インストールしてください。",
			"about.installTimeout": "プラグインのインストールがタイムアウトしました。ネットワーク接続を確認してください。",
			"about.installUnchanged": "インストールコマンドは終了しましたが、現在のプロファイルに反映されませんでした。再試行してください。",
			"about.installWebFailed": "プラグインの更新に失敗しました。DSH Web ターミナルの出力を確認してください。",
			"about.installed": "インストール済み",
			"about.installing": "インストール中",
			"about.loading": "依存関係のインストール状態を読み込み中…",
			"about.missing": "未インストール",
			"about.nav": "Codex UI",
			"about.packagesDone": "{0} 個のパッケージが完了しました",
			"about.progress.building": "ビルド中",
			"about.progress.downloading": "ダウンロード中",
			"about.progress.linking": "ファイルの書き込み中",
			"about.progress.resolving": "依存関係の解決中",
			"about.progressHint": "プラグインをインストール中…",
			"about.refreshFailed": "依存関係の更新に失敗しました。前回の結果を表示しています。",
			"about.applied": "依存プラグインのインストールまたは更新が適用されました。",
			"about.restartRequired": "依存プラグインをインストールまたは更新しました。変更を適用するには DSH ホストを再起動してください。",
			"about.statusFailed": "依存関係の状態を読み込めません。",
			"about.title": "Codex UI",
			"about.totalDownloads": "npm 累計ダウンロード",
			"about.upToDate": "すべての連携プラグインは最新の状態です。",
			"about.update": "更新",
			"about.updateAll": "すべてインストール/更新",
			"about.updateAvailable": "更新可能",
			"about.updatingAll": "インストール/更新中",
			"about.viewProject": "GitHub",
			"composer.desc": "インライン入力予測と履歴（↑/↓）の呼び出し範囲を設定します。幅調整ハンドルなどの機能は引き続き利用できます。",
			"composer.prediction": "スマート入力予測",
			"composer.predictionHint": "無効、入力停止時の続きのみ、または予測＋続きの両方。Tab で採用。",
			"composer.predictionLocked": "現在のプロファイルのプラグイン設定で無効化されています（cordis.patch.yml → codex-ui-composer の prediction）。ここでは有効にできません。",
			"composer.modeOff": "オフ",
			"composer.modeContinue": "続きのみ",
			"composer.modeAll": "予測＋続き",
			"composer.historyScope": "履歴の呼び出し範囲",
			"composer.historyScopeHint": "現在の会話のみ、または同じワークスペースのすべての会話と共有します。",
			"composer.historyScopeSession": "現在の会話",
			"composer.historyScopeWorkspace": "ワークスペース",
			"composer.title": "入力欄の拡張",
			"desktopMenu.help": "ヘルプ",
			"desktopMenu.help.reloadPage": "ページを再読み込み",
			"desktopMenu.help.restartAppHost": "アプリとホストを再起動",
			"desktopMenu.help.restartConfirm": "DeepSeek Harness を終了して再度開きます。実行中のタスクは中断されます。続行しますか？",
			"desktopMenu.restart.busy": "既に再起動が進行中です。しばらくお待ちください。",
			"desktopMenu.restart.cancelled": "アプリは終了しませんでした。再起動はキャンセルされました。",
			"desktopMenu.restart.close": "閉じる",
			"desktopMenu.restart.failed": "再起動に失敗しました",
			"desktopMenu.restart.launchFailed": "アプリは終了しましたが、自動的に再起動できませんでした。手動で起動してください。",
			"desktopMenu.restart.quitting": "DeepSeek Harness を終了して再起動中…",
			"desktopMenu.restart.relaunched": "再起動しました。",
			"desktopMenu.restart.timeout": "所定の時間内に再起動が完了しませんでした。アプリを確認してください。",
			"desktopMenu.restart.unreachable": "ホストに接続できません。再起動チャネルを利用できません。",
			"desktopMenu.restart.unsupportedDesktopOnly": "デスクトップ版ではないため、アプリを再起動できません。",
			"desktopMenu.restart.unsupportedMissingApp": "DeepSeek Harness の実行ファイルが見つからないため、再起動できません。",
			"errors.forbidden": "セキュリティチェックにより拒否されました。信頼できる DSH アドレスから再試行してください。",
			"errors.generic": "操作が完了しませんでした。再試行してください。",
			"errors.serviceUnavailable": "サービスは現在利用できません。しばらくしてから再試行してください。",
			"errors.unauthorized": "DSH にログインしてから再試行してください。",
			"home.build": "新機能、アプリ、ツールの構築",
			"home.build.prompt1": "現在のプロジェクトに新しい機能を実装したいです。着手する前に要件と検収基準を確認してください。",
			"home.build.prompt2": "小さなツールを作成したいです。まず目的、入力、出力を質問し、現在のプロジェクトに合わせた提案をしてください。",
			"home.build.task1": "新しい機能を実装する",
			"home.build.task2": "小さなツールを作成する",
			"home.busy": "現在入力の処理中です。しばらくしてからもう一度お試しください。",
			"home.draft": "現在のドラフトと添付ファイルは保持されています。タスクの提案を使用するには入力をクリアしてください。",
			"home.explore": "コードを探索して理解する",
			"home.explore.prompt1": "現在のワークスペースのコードを探索し、プロジェクト構造、主要なエントリポイント、モジュール間の関係を説明してください。",
			"home.explore.prompt2": "特定の機能の実装を理解したいです。まず対象の機能を確認し、その後呼び出しフローに沿って説明してください。",
			"home.explore.task1": "プロジェクト構造を把握する",
			"home.explore.task2": "機能を理解する",
			"home.fix": "問題や不具合の修正",
			"home.fix.prompt1": "問題が発生しました。まず再現手順、期待される動作、実際の動作を確認し、根本原因を特定して修正してください。",
			"home.fix.prompt2": "現在のプロジェクトに該当するテストを実行し、失敗の根本原因を特定して最小限の修正を行い、有効な回帰カバレッジを維持してください。",
			"home.fix.task1": "問題を調査する",
			"home.fix.task2": "失敗したテストを修正する",
			"home.resizeInput": "ドラッグして入力エリアの幅を調整",
			"home.review": "コードをレビューして改善を提案",
			"home.review.prompt1": "現在のワークスペースの未コミットの変更をレビューし、実際の不具合、リグレッションのリスク、不足しているテストを優先して指摘してください。まだコードは変更しないでください。",
			"home.review.prompt2": "現在のプロジェクトのコード品質を検査し、ソースコードの根拠に基づいた改善提案を提示してください。まずは評価のみ行い、変更は行わないでください。",
			"home.review.task1": "現在の変更をレビューする",
			"home.review.task2": "コード品質を検査する",
			"home.suggestions": "タスクを開始",
			"home.workspace": "タスクを選択する前に、まずワークスペースを選択してください。",
			"input.historyHint": "↑↓ 履歴",
			"input.prediction.dismiss": "Esc 無視",
			"input.prediction.more": "Alt+↓ 切替",
			"input.prediction.tab": "Tab 採用",
			"sections.default": "プロジェクト",
			"sections.menu": "セクション",
			"sections.new": "新規セクション",
			"sections.newName": "新しいセクション名",
			"sections.pin": "ピン留め",
			"sections.pinned": "ピン留め",
			"sections.remove": "セクションを削除",
			"sections.addWorkspace": "ワークスペースを追加",
			"sections.rename": "名前を変更",
			"sections.settings": "セクション設定",
			"sections.unpin": "ピン留めを解除",
			"sections.writeAborted": "ワークスペースの移動が完了しなかったため、自動的に中止されました。",
			"sections.writePending": "ワークスペースの移動が完了していません。ホストの応答を待っています。",
			"session.markRead": "既読にする",
			"session.markUnread": "未読にする",
			"sessionTitle.system": "プログラミングアシスタントの会話のタイトルを生成してください。\n正確に1行、2つの部分で出力してください：タイプ｜テーマ\nタイプは次のいずれかでなければなりません：{types}\nテーマは具体的な事項でなければならず、タイプを繰り返したり、タイプ名や空のテーマを書かないでください。日付や絵文字、引用符、プレフィックス、説明、Markdownは含めないでください。\nテーマにはユーザーメッセージと同じ言語を使用してください。",
			"sessionTitle.type.design": "設計",
			"sessionTitle.type.docs": "ドキュメント",
			"sessionTitle.type.explore": "探索",
			"sessionTitle.type.feature": "機能",
			"sessionTitle.type.fix": "修正",
			"sessionTitle.type.optimize": "最適化",
			"sessionTitle.type.release": "リリース",
			"sessionTitle.type.research": "研究",
			"sessionTitle.userFrame": "このユーザーメッセージに基づいて会話のタイトルを生成してください。「タイプ｜テーマ」の1行のみを返し、3つ目の部分を追加したりテーマを繰り返したりしないでください。",
			"settings.back": "アプリに戻る",
			"settings.integrations": "統合",
			"settings.noResults": "一致する設定カテゴリがありません",
			"settings.personal": "個人設定",
			"settings.records": "記録とアプリ",
			"settings.search": "設定を検索…",
			"settings.title": "設定",
			"sidebar.browsePlugins": "他のプラグインを探す",
			"sidebar.createPlugin": "プラグインを作成",
			"sidebar.createPrompt": "左サイドバーのエントリを持つ DSH プラグインを作成します。",
			"sidebar.dragToMore": "ここにドラッグしてその他に収納",
			"sidebar.fixed": "常に固定",
			"sidebar.more": "その他",
			"sidebar.newSession": "新規チャット",
			"theme.desc": "DeepSeek Harness の外観をカスタマイズ。Codex スタイル配色やすりガラスのマイカ質感をサポート。",
			"theme.glassEnable": "ガラス質感とマイカ外観",
			"theme.glassGlow": "グランドグロー",
			"theme.glassGlowHint": "グラデーション背景の上に2つの柔らかな光斑を重ねます。オンにするとホームと背景に光のハローが生まれます",
			"theme.glassHint": "すりガラスと半透明の背景を有効化。オフにするとメインUIは単色に戻り、ぼかしや浮遊カードの装飾は行われません",
			"theme.glassPreset": "マテリアルプリセット",
			"theme.glassPresetHint": "マイカおよびオリジナルレイアウトの両方で透明度とぼかしの度合いを自由に切り替え",
			"theme.mode": "レイアウトモード",
			"theme.modeCompat": "オリジナルレイアウト (フラットガラス)",
			"theme.modeHint": "マイカ効果は浮遊型フロストカードに再構築；互換モードは公式レイアウトを維持したままガラス素材に切り替え",
			"theme.modeMica": "マイカ効果 (浮遊カード)",
			"theme.palette": "テーマカラー",
			"theme.paletteClaudeDark": "Claude ダーク",
			"theme.paletteClaudeLight": "Claude ライト",
			"theme.paletteCodexDark": "Codex ダーク",
			"theme.paletteCodexLight": "Codex ライト",
			"theme.paletteCyberpunk": "Cyberpunk (サイバーパンク)",
			"theme.paletteDracula": "Dracula (ドラキュラ)",
			"theme.paletteFrappe": "Frappé (フラッペ)",
			"theme.paletteGruvboxDark": "Gruvbox ダーク",
			"theme.paletteGruvboxLight": "Gruvbox ライト",
			"theme.paletteHint": "公式デフォルトまたは Codex スタイルの配色を選択",
			"theme.codeHighlight": "コード強調プレビュー",
			"theme.paletteLatte": "Latte (ラテ)",
			"theme.paletteMacchiato": "Macchiato (マキアート)",
			"theme.paletteMocha": "Mocha (モカ)",
			"theme.paletteSolarizedDark": "Solarized ダーク",
			"theme.paletteSolarizedLight": "Solarized ライト",
			"theme.paletteStock": "公式デフォルト",
			"theme.presetClear": "クリア (高透明)",
			"theme.presetFrosted": "フロスト (強ぼかし)",
			"theme.presetStandard": "標準 (適度)",
			"theme.subClaudeDark": "温かみのある黒炭とテラコッタ",
			"theme.subClaudeLight": "温かみのある和紙感とテラコッタ",
			"theme.subCodexDark": "没入型カーボンダーク ギークな質感",
			"theme.subCodexLight": "ミニマルペーパーホワイト 快適な読書",
			"theme.subCyberpunk": "黒地にネオングリーン · マトリックス端末",
			"theme.subDracula": "吸血鬼ピンクとサイバーネオン",
			"theme.subFrappe": "フラッペダーク 透明感のあるミスト",
			"theme.subGruvboxDark": "泥炭深茶と暖金レトロ",
			"theme.subGruvboxLight": "牛皮紙黄とヴィンテージ",
			"theme.subLatte": "ラテウォームホワイト 暖かく軽快",
			"theme.subMacchiato": "マキアートダーク 優雅で柔らかなトーン",
			"theme.subMocha": "モカダーク 目に優しい落ち着き",
			"theme.subSolarizedDark": "深海墨緑と青碧",
			"theme.subSolarizedLight": "羊皮紙と日光青",
			"theme.subStock": "システムに追従 ネイティブUI",
			"theme.title": "外観とテーマ"
		};
		//#endregion
		//#region src/client/locales/es.ts
		const es = {
			"about.dependencies": "Complementos de gestión complementarios",
			"about.dependenciesDescription": "Cada complemento permite instalación independiente bajo demanda y actualización sincronizada en lote.",
			"about.dependency.archive": "Conversaciones archivadas",
			"about.dependency.btw": "Consultas BTW",
			"about.dependency.dsh": "DeepSeek Harness",
			"about.dependency.experts": "Gestor de expertos",
			"about.dependency.im": "Asistente IM",
			"about.dependency.market": "Tienda de aplicaciones",
			"about.dependency.pet": "Mascota Codex",
			"about.dependency.pua": "PUA",
			"about.dependency.review": "Revisión de código",
			"about.dependency.schedule": "Tareas programadas",
			"about.dependency.simplify": "Simplify",
			"about.dependency.skills": "Gestor de habilidades",
			"about.dependency.suite": "Paquete Codex",
			"about.dependency.ui": "Codex UI",
			"about.description": "Mejoras en el cuadro de entrada, interfaz de configuración en pantalla completa, menú de ventana de escritorio y gestión del ecosistema.",
			"about.downloadsSource": "Estadísticas oficiales de npm: descargas acumuladas desde la creación del paquete hasta ayer. Haga clic para ver el paquete en npm",
			"about.downloadsUnavailable": "No disponible",
			"about.feature.composer": "Historial de comandos estilo terminal (↑/↓), ajuste de ancho adaptable y tarjetas de sugerencias de tareas",
			"about.feature.composer.name": "Mejoras de entrada (Composer)",
			"about.feature.dependencies": "Gestión unificada y actualización en lote con un solo clic de complementos oficiales y de terceros de DSH",
			"about.feature.dependencies.name": "Gestión de ecosistema (Dependencies)",
			"about.feature.desktopMenu": "Añade una opción de ayuda en la barra de menús del sistema con recarga de página y reinicio",
			"about.feature.desktopMenu.name": "Menú de ventana de escritorio (Desktop Menus)",
			"about.feature.sessionTitle": "Extracción y generación inteligente de títulos estructurados según la semántica del primer mensaje",
			"about.feature.sessionTitle.name": "Título de sesión inteligente (Session Title)",
			"about.feature.settingsSkin": "Embellecimiento del panel de configuración a pantalla completa, navegación por categorías y búsqueda nativa",
			"about.feature.settingsSkin.name": "Aspecto de configuración nativo (Settings Skin)",
			"about.feature.sidebar": "Barra lateral modular, cajones plegables y reordenación libre mediante arrastre",
			"about.feature.sidebar.name": "Navegación de barra lateral (Sidebar)",
			"about.feature.theme": "Paletas clásicas de Codex oscura/clara y Catppuccin integradas, compatibles con textura de mica esmerilada",
			"about.feature.theme.name": "Tema y apariencia (Theme)",
			"about.features": "Subcomplementos y funciones integradas",
			"about.feedback": "Comentarios",
			"about.install": "Instalar",
			"about.installBuildPolicy": "La política de compilación de pnpm no está configurada. Actualice la configuración del perfil.",
			"about.installExitDesktop": "Cierre DSH Desktop por completo y vuelva a abrirlo antes de actualizar.",
			"about.installExitWeb": "No se pueden reemplazar archivos en ejecución. Detenga DSH Web, actualice desde la terminal y reinicie.",
			"about.installFailed": "Error al instalar el complemento. Vuelva a intentarlo más tarde.",
			"about.installPnpmMissing": "No se encuentra pnpm en el entorno. Instale pnpm y reinicie DSH.",
			"about.installServiceUnavailable": "El servicio de dependencias de DSH Desktop no está listo. Reinicie y pruebe de nuevo.",
			"about.installBusy": "Ya hay otra instalación en curso. Espere a que finalice.",
			"about.installSuiteUnsupported": "Los miembros del paquete heredado no se pueden migrar automáticamente. Adminístrelos a través del administrador de complementos del host.",
			"about.installStoreMismatch": "El directorio no coincide con el almacén de pnpm. Cierre DSH Desktop por completo y reintente.",
			"about.installStoreMismatchWeb": "El directorio no coincide con pnpm. Detenga DSH Web y reintente; si persiste, reinstale las dependencias del perfil.",
			"about.installTimeout": "Tiempo de espera agotado al instalar. Compruebe su conexión a la red.",
			"about.installUnchanged": "El comando finalizó pero el complemento no entró en este perfil. Reintente.",
			"about.installWebFailed": "Error al actualizar el complemento. Compruebe la salida de la terminal de DSH Web.",
			"about.installed": "Instalado",
			"about.installing": "Instalando",
			"about.loading": "Cargando estado de dependencias…",
			"about.missing": "No instalado",
			"about.nav": "Codex UI",
			"about.packagesDone": "{0} paquetes completados",
			"about.progress.building": "Compilando",
			"about.progress.downloading": "Descargando",
			"about.progress.linking": "Escribiendo archivos",
			"about.progress.resolving": "Resolviendo dependencias",
			"about.progressHint": "Instalando complemento…",
			"about.refreshFailed": "Error al actualizar el estado; mostrando el último resultado correcto.",
			"about.applied": "Dependencias instaladas o actualizadas y aplicadas.",
			"about.restartRequired": "Dependencias instaladas o actualizadas. Reinicie el host de DSH para aplicar los cambios.",
			"about.statusFailed": "No se puede leer el estado de las dependencias.",
			"about.title": "Codex UI",
			"about.totalDownloads": "Descargas totales en npm",
			"about.upToDate": "Todos los complementos están instalados y en su versión más reciente.",
			"about.update": "Actualizar",
			"about.updateAll": "Instalar/actualizar todo",
			"about.updateAvailable": "Actualización disponible",
			"about.updatingAll": "Instalando/actualizando",
			"about.viewProject": "GitHub",
			"composer.desc": "Configura la predicción en línea y el alcance del historial (↑/↓); otras funciones como el ajuste de ancho siguen activas.",
			"composer.prediction": "Predicción de entrada en línea",
			"composer.predictionHint": "Desactivado, solo continuación al pausar escritura, o ambos; pulse Tab para aceptar.",
			"composer.predictionLocked": "Deshabilitado por la configuración del perfil (cordis.patch.yml → codex-ui-composer prediction); no se puede habilitar aquí.",
			"composer.modeOff": "Desactivado",
			"composer.modeContinue": "Solo continuación",
			"composer.modeAll": "Predicción y continuación",
			"composer.historyScope": "Alcance del historial",
			"composer.historyScopeHint": "Recupera mensajes solo de esta conversación o compártelos con todas las conversaciones del espacio de trabajo.",
			"composer.historyScopeSession": "Esta conversación",
			"composer.historyScopeWorkspace": "Espacio de trabajo",
			"composer.title": "Mejoras de entrada",
			"desktopMenu.help": "Ayuda",
			"desktopMenu.help.reloadPage": "Recargar página",
			"desktopMenu.help.restartAppHost": "Reiniciar aplicación y host",
			"desktopMenu.help.restartConfirm": "DeepSeek Harness se cerrará y se volverá a abrir; las tareas en curso se interrumpirán. ¿Continuar?",
			"desktopMenu.restart.busy": "Ya hay un reinicio en curso. Por favor espere.",
			"desktopMenu.restart.cancelled": "La aplicación no se cerró; el reinicio fue cancelado.",
			"desktopMenu.restart.close": "Cerrar",
			"desktopMenu.restart.failed": "Fallo al reiniciar",
			"desktopMenu.restart.launchFailed": "La aplicación se cerró pero no se pudo reabrir automáticamente. Iníciela manualmente.",
			"desktopMenu.restart.quitting": "Cerrando y reabriendo DeepSeek Harness…",
			"desktopMenu.restart.relaunched": "Reiniciado con éxito.",
			"desktopMenu.restart.timeout": "El reinicio no se completó a tiempo; verifique la aplicación.",
			"desktopMenu.restart.unreachable": "No se puede conectar con el host; el canal de reinicio no está disponible.",
			"desktopMenu.restart.unsupportedDesktopOnly": "Esta no es la versión de escritorio, no se puede reiniciar.",
			"desktopMenu.restart.unsupportedMissingApp": "No se encontró el ejecutable de DeepSeek Harness, no se puede reiniciar.",
			"errors.forbidden": "Solicitud rechazada por comprobación de seguridad. Reintente desde una dirección de confianza.",
			"errors.generic": "La operación no se completó. Inténtelo de nuevo.",
			"errors.serviceUnavailable": "El servicio no está disponible temporalmente. Inténtelo más tarde.",
			"errors.unauthorized": "Inicie sesión en DSH e inténtelo de nuevo.",
			"home.build": "Construir nuevas funciones, aplicaciones o herramientas",
			"home.build.prompt1": "Quiero implementar una nueva función en este proyecto. Primero confirme los requisitos y criterios de aceptación.",
			"home.build.prompt2": "Quiero crear una pequeña herramienta. Primero pregúnteme sobre el objetivo, entradas y salidas, y luego proponga una solución.",
			"home.build.task1": "Implementar una nueva función",
			"home.build.task2": "Crear una pequeña herramienta",
			"home.busy": "La entrada se está procesando actualmente. Vuelva a intentarlo en breve.",
			"home.draft": "Se conservan el borrador actual y los adjuntos. Limpie la entrada para usar una sugerencia.",
			"home.explore": "Explorar y comprender el código",
			"home.explore.prompt1": "Explore el código de este espacio de trabajo y explique su estructura, puntos de entrada principales y relaciones entre módulos.",
			"home.explore.prompt2": "Quiero entender la implementación de una función. Primero pregúnteme cuál es y luego explique su flujo de llamadas.",
			"home.explore.task1": "Explicar la estructura del proyecto",
			"home.explore.task2": "Comprender una función",
			"home.fix": "Corregir problemas y fallos",
			"home.fix.prompt1": "Tengo un problema. Primero pregúnteme los pasos de reproducción, comportamiento esperado y real, luego identifique la causa raíz y corríjalo.",
			"home.fix.prompt2": "Ejecute las pruebas correspondientes del proyecto, identifique la causa raíz de los fallos y realice correcciones mínimas manteniendo una cobertura de regresión válida.",
			"home.fix.task1": "Investigar un problema",
			"home.fix.task2": "Corregir pruebas fallidas",
			"home.resizeInput": "Arrastrar para ajustar el ancho del área de entrada",
			"home.review": "Revisar código y sugerir mejoras",
			"home.review.prompt1": "Revise los cambios no confirmados en este espacio de trabajo, señalando defectos reales, riesgos de regresión y pruebas faltantes. No modifique archivos aún.",
			"home.review.prompt2": "Inspeccione la calidad del código en este proyecto y sugiera mejoras respaldadas por la fuente. Evalúe únicamente; no edite.",
			"home.review.task1": "Revisar los cambios actuales",
			"home.review.task2": "Comprobar la calidad del código",
			"home.suggestions": "Iniciar una tarea",
			"home.workspace": "Primero elija un espacio de trabajo y luego seleccione una tarea.",
			"input.historyHint": "↑↓ Historial",
			"input.prediction.dismiss": "Esc descartar",
			"input.prediction.more": "Alt+↓ alternar",
			"input.prediction.tab": "Tab aceptar",
			"sections.default": "Proyectos",
			"sections.menu": "Sección",
			"sections.new": "Nueva sección",
			"sections.newName": "Nombre de la sección",
			"sections.pin": "Fijar",
			"sections.pinned": "Fijados",
			"sections.remove": "Eliminar sección",
			"sections.addWorkspace": "Agregar espacio de trabajo",
			"sections.rename": "Renombrar",
			"sections.settings": "Ajustes de sección",
			"sections.unpin": "Desfijar",
			"sections.writeAborted": "El movimiento del espacio de trabajo no se completó y fue cancelado automáticamente.",
			"sections.writePending": "El movimiento del espacio de trabajo aún está esperando la respuesta del host.",
			"session.markRead": "Marcar como leído",
			"session.markUnread": "Marcar como no leído",
			"sessionTitle.system": "Genera un título para una conversación de asistente de programación.\nProduce exactamente una línea con dos partes: Tipo｜Tema\nEl tipo debe ser uno de: {types}\nEl tema debe ser un asunto concreto y no debe repetir el tipo. No escribas fechas, emojis, comillas, prefijos, explicaciones ni Markdown.\nEscribe el tema en el idioma del mensaje del usuario.",
			"sessionTitle.type.design": "Diseño",
			"sessionTitle.type.docs": "Documentación",
			"sessionTitle.type.explore": "Exploración",
			"sessionTitle.type.feature": "Función",
			"sessionTitle.type.fix": "Corrección",
			"sessionTitle.type.optimize": "Optimización",
			"sessionTitle.type.release": "Lanzamiento",
			"sessionTitle.type.research": "Investigación",
			"sessionTitle.userFrame": "Genera un título de conversación a partir de este mensaje de usuario. Devuelve solo una línea Tipo｜Tema. No agregues una tercera parte ni repitas el tema.",
			"settings.back": "Volver a la aplicación",
			"settings.integrations": "Integraciones",
			"settings.noResults": "No hay categorías de configuración coincidentes",
			"settings.personal": "Personal",
			"settings.records": "Registros y aplicaciones",
			"settings.search": "Buscar ajustes…",
			"settings.title": "Configuración",
			"sidebar.browsePlugins": "Explorar otros complementos",
			"sidebar.createPlugin": "Crear tu complemento",
			"sidebar.createPrompt": "Crea un complemento DSH con entrada en la barra lateral izquierda.",
			"sidebar.dragToMore": "Arrastre aquí para colapsar en más",
			"sidebar.fixed": "Siempre fijado",
			"sidebar.more": "Más",
			"sidebar.newSession": "Nueva conversación",
			"theme.desc": "Personalice el estilo visual de DeepSeek Harness con temas clásicos de Codex y textura de mica esmerilada.",
			"theme.glassEnable": "Textura de cristal y aspecto mica",
			"theme.glassGlow": "Destellos de suelo",
			"theme.glassGlowHint": "Superpone suaves reflejos de luz sobre el fondo degradado. Añade un halo difuso en la página principal",
			"theme.glassHint": "Habilita el cristal esmerilado y la translucidez de fondo. Al desactivarlo, la interfaz vuelve a colores sólidos sin desenfoque",
			"theme.glassPreset": "Ajustes predefinidos de material",
			"theme.glassPresetHint": "Alterne entre niveles de transparencia y desenfoque en ambos modos de diseño",
			"theme.mode": "Modo de diseño",
			"theme.modeCompat": "Diseño original (Cristal plano)",
			"theme.modeHint": "El efecto mica transforma la interfaz en tarjetas esmeriladas flotantes; el modo original mantiene la distribución con material de cristal",
			"theme.modeMica": "Efecto Mica (Tarjetas flotantes)",
			"theme.palette": "Paleta de temas",
			"theme.paletteClaudeDark": "Claude Oscuro",
			"theme.paletteClaudeLight": "Claude Claro",
			"theme.paletteCodexDark": "Codex Oscuro",
			"theme.paletteCodexLight": "Codex Claro",
			"theme.paletteCyberpunk": "Cyberpunk",
			"theme.paletteDracula": "Dracula",
			"theme.paletteFrappe": "Frappé",
			"theme.paletteGruvboxDark": "Gruvbox Oscuro",
			"theme.paletteGruvboxLight": "Gruvbox Claro",
			"theme.paletteHint": "Elija el tema oficial por defecto o estilos clásicos de Codex",
			"theme.codeHighlight": "Vista previa de resaltado de código",
			"theme.paletteLatte": "Latte",
			"theme.paletteMacchiato": "Macchiato",
			"theme.paletteMocha": "Mocha",
			"theme.paletteSolarizedDark": "Solarized Oscuro",
			"theme.paletteSolarizedLight": "Solarized Claro",
			"theme.paletteStock": "Oficial por defecto",
			"theme.presetClear": "Transparente (Alta translucidez)",
			"theme.presetFrosted": "Esmerilado (Desenfoque fuerte)",
			"theme.presetStandard": "Estándar (Equilibrado)",
			"theme.subClaudeDark": "Tono oscuro cálido y terracota",
			"theme.subClaudeLight": "Papel cálido y terracota",
			"theme.subCodexDark": "Negro inmersivo Estilo hacker",
			"theme.subCodexLight": "Blanco papel limpio Lectura pura",
			"theme.subCyberpunk": "Verde neón sobre negro · terminal matrix",
			"theme.subDracula": "Rosa vampiro y brillo ciber",
			"theme.subFrappe": "Frappé oscuro Efecto niebla translúcida",
			"theme.subGruvboxDark": "Oscuro retro y oro cálido",
			"theme.subGruvboxLight": "Papel kraft retro y ámbar",
			"theme.subLatte": "Latte cálido Luminoso y agradable",
			"theme.subMacchiato": "Moka macchiato Suave y elegante",
			"theme.subMocha": "Tono moka oscuro Cómodo para la vista",
			"theme.subSolarizedDark": "Verde azulado y cian",
			"theme.subSolarizedLight": "Pergamino cálido y azul",
			"theme.subStock": "Seguir el sistema Interfaz nativa",
			"theme.title": "Apariencia y temas"
		};
		//#endregion
		//#region src/client/locales/fr.ts
		const fr = {
			"about.dependencies": "Plugins de gestion complémentaires",
			"about.dependenciesDescription": "Chaque plugin complémentaire prend en charge l'installation à la demande et la mise à jour groupée.",
			"about.dependency.archive": "Archives de conversation",
			"about.dependency.btw": "Requêtes BTW",
			"about.dependency.dsh": "DeepSeek Harness",
			"about.dependency.experts": "Gestion des experts",
			"about.dependency.im": "Assistant IM",
			"about.dependency.market": "Marché d'applications",
			"about.dependency.pet": "Animal de compagnie Codex",
			"about.dependency.pua": "PUA",
			"about.dependency.review": "Revue de code",
			"about.dependency.schedule": "Tâches planifiées",
			"about.dependency.simplify": "Simplify",
			"about.dependency.skills": "Gestion des compétences",
			"about.dependency.suite": "Suite Codex",
			"about.dependency.ui": "Codex UI",
			"about.description": "Amélioration de la saisie, interface des paramètres plein écran, menu de la fenêtre de bureau et gestion des plugins.",
			"about.downloadsSource": "Statistiques officielles npm : téléchargements cumulés depuis la création du package jusqu'à hier. Cliquez pour voir le package sur npm",
			"about.downloadsUnavailable": "Non disponible",
			"about.feature.composer": "Historique de saisie de style terminal (↑/↓), redimensionnement adaptatif et cartes de suggestions",
			"about.feature.composer.name": "Améliorations de saisie (Composer)",
			"about.feature.dependencies": "Gestion centralisée et mise à jour groupée en un clic des plugins officiels et tiers DSH",
			"about.feature.dependencies.name": "Gestion des dépendances (Dependencies)",
			"about.feature.desktopMenu": "Ajoute une entrée d'aide dans la barre de menus avec rechargement de page et redémarrage",
			"about.feature.desktopMenu.name": "Menu de fenêtre de bureau (Desktop Menus)",
			"about.feature.sessionTitle": "Extraction et génération de titres normalisés basées sur la sémantique du premier message",
			"about.feature.sessionTitle.name": "Titre de session intelligent (Session Title)",
			"about.feature.settingsSkin": "Amélioration esthétique des paramètres plein écran, navigation par catégorie et recherche native",
			"about.feature.settingsSkin.name": "Habillage des paramètres natifs (Settings Skin)",
			"about.feature.sidebar": "Barre latérale modulaire, tiroirs rétractables et réorganisation par glisser-déposer",
			"about.feature.sidebar.name": "Navigation latérale (Sidebar)",
			"about.feature.theme": "Palettes classiques Codex sombre/claire et Catppuccin intégrées avec effet mica dépoli",
			"about.feature.theme.name": "Thème et apparence (Theme)",
			"about.features": "Sous-plugins et fonctionnalités intégrés",
			"about.feedback": "Commentaires",
			"about.install": "Installer",
			"about.installBuildPolicy": "La politique des scripts de build pnpm n'est pas configurée. Mettez à jour la configuration.",
			"about.installExitDesktop": "Quittez complètement DSH Desktop puis relancez-le avant de mettre à jour.",
			"about.installExitWeb": "Impossible de remplacer les fichiers en cours d'exécution. Arrêtez DSH Web, mettez à jour via le terminal puis redémarrez.",
			"about.installFailed": "Échec de l'installation du plugin. Veuillez réessayer plus tard.",
			"about.installPnpmMissing": "pnpm est introuvable. Installez pnpm et redémarrez DSH.",
			"about.installServiceUnavailable": "Le service de dépendances DSH Desktop n'est pas prêt. Redémarrez et réessayez.",
			"about.installBusy": "Une autre installation est déjà en cours. Veuillez attendre qu'elle se termine.",
			"about.installSuiteUnsupported": "Les membres de l'ancienne suite ne peuvent pas être migrés automatiquement. Veuillez les gérer via le gestionnaire de plugins de l'hôte.",
			"about.installStoreMismatch": "Le dossier ne correspond pas au dépôt pnpm. Quittez complètement DSH Desktop et réessayez.",
			"about.installStoreMismatchWeb": "Le dossier ne correspond pas à pnpm. Arrêtez DSH Web et réessayez ; si le problème persiste, réinstallez les dépendances.",
			"about.installTimeout": "Délai d'installation dépassé. Vérifiez votre connexion réseau.",
			"about.installUnchanged": "La commande s'est terminée mais le plugin n'est pas entré dans ce profil. Réessayez.",
			"about.installWebFailed": "Échec de la mise à jour du plugin. Consultez la sortie du terminal DSH Web.",
			"about.installed": "Installé",
			"about.installing": "Installation en cours",
			"about.loading": "Chargement de l'état des dépendances…",
			"about.missing": "Non installé",
			"about.nav": "Codex UI",
			"about.packagesDone": "{0} packages terminés",
			"about.progress.building": "Compilation",
			"about.progress.downloading": "Téléchargement",
			"about.progress.linking": "Écriture des fichiers",
			"about.progress.resolving": "Résolution des dépendances",
			"about.progressHint": "Installation du plugin…",
			"about.refreshFailed": "Échec de l'actualisation ; affichage du dernier résultat valide.",
			"about.applied": "Dépendances installées ou mises à jour et appliquées.",
			"about.restartRequired": "Dépendances installées ou mises à jour. Redémarrez DSH pour appliquer les modifications.",
			"about.statusFailed": "Impossible de lire l'état des dépendances.",
			"about.title": "Codex UI",
			"about.totalDownloads": "Téléchargements totaux npm",
			"about.upToDate": "Tous les plugins complémentaires sont installés et à jour.",
			"about.update": "Mettre à jour",
			"about.updateAll": "Tout installer/mettre à jour",
			"about.updateAvailable": "Mise à jour disponible",
			"about.updatingAll": "Installation/mise à jour",
			"about.viewProject": "GitHub",
			"composer.desc": "Configurez la prédiction en ligne et la portée de l'historique (↑/↓) ; les autres fonctions comme les poignées de largeur restent actives.",
			"composer.prediction": "Prédiction de saisie en ligne",
			"composer.predictionHint": "Désactivé, continuation seule lors d'une pause de frappe, ou les deux ; Tab pour accepter.",
			"composer.predictionLocked": "Désactivé dans la configuration du profil (cordis.patch.yml → codex-ui-composer prediction) ; ne peut pas être activé ici.",
			"composer.modeOff": "Désactivé",
			"composer.modeContinue": "Continuer seulement",
			"composer.modeAll": "Prédiction et continuation",
			"composer.historyScope": "Portée de l'historique",
			"composer.historyScopeHint": "Rappelez les messages de cette conversation uniquement, ou partagez-les avec toutes les conversations de l'espace de travail.",
			"composer.historyScopeSession": "Cette conversation",
			"composer.historyScopeWorkspace": "Espace de travail",
			"composer.title": "Améliorations de saisie",
			"desktopMenu.help": "Aide",
			"desktopMenu.help.reloadPage": "Recharger la page",
			"desktopMenu.help.restartAppHost": "Redémarrer l'application et l'hôte",
			"desktopMenu.help.restartConfirm": "DeepSeek Harness va se fermer et se rouvrir ; les tâches en cours seront interrompues. Continuer ?",
			"desktopMenu.restart.busy": "Un redémarrage est déjà en cours. Veuillez patienter.",
			"desktopMenu.restart.cancelled": "L'application n'a pas quitté ; redémarrage annulé.",
			"desktopMenu.restart.close": "Fermer",
			"desktopMenu.restart.failed": "Échec du redémarrage",
			"desktopMenu.restart.launchFailed": "L'application a quitté mais n'a pas pu être rouverte automatiquement. Lancez-la manuellement.",
			"desktopMenu.restart.quitting": "Fermeture et réouverture de DeepSeek Harness…",
			"desktopMenu.restart.relaunched": "Redémarré.",
			"desktopMenu.restart.timeout": "Le redémarrage n'a pas abouti dans les temps ; veuillez vérifier l'application.",
			"desktopMenu.restart.unreachable": "Impossible de joindre l'hôte ; canal de redémarrage indisponible.",
			"desktopMenu.restart.unsupportedDesktopOnly": "Cette application n'est pas la version de bureau ; impossible de redémarrer.",
			"desktopMenu.restart.unsupportedMissingApp": "Exécutable DeepSeek Harness introuvable ; impossible de redémarrer.",
			"errors.forbidden": "Demande rejetée par le contrôle de sécurité. Réessayez depuis une adresse de confiance.",
			"errors.generic": "L'opération n'a pas pu aboutir. Veuillez réessayer.",
			"errors.serviceUnavailable": "Service temporairement indisponible. Veuillez réessayer plus tard.",
			"errors.unauthorized": "Veuillez vous connecter à DSH puis réessayer.",
			"home.build": "Créer de nouvelles fonctionnalités, applications ou outils",
			"home.build.prompt1": "Je souhaite implémenter une nouvelle fonctionnalité dans ce projet. Confirmez d'abord les exigences et les critères d'acceptation.",
			"home.build.prompt2": "Je souhaite créer un petit outil. Renseignez-vous d'abord sur l'objectif, les entrées et les sorties, puis proposez une solution adaptée.",
			"home.build.task1": "Implémenter une nouvelle fonctionnalité",
			"home.build.task2": "Créer un petit outil",
			"home.busy": "La saisie est en cours de traitement. Veuillez réessayer sous peu.",
			"home.draft": "Votre brouillon actuel et vos pièces jointes sont conservés. Effacez la saisie pour utiliser une suggestion.",
			"home.explore": "Explorer et comprendre le code",
			"home.explore.prompt1": "Explorez le code de cet espace de travail et expliquez la structure du projet, les points d'entrée principaux et les relations entre modules.",
			"home.explore.prompt2": "Je souhaite comprendre l'implémentation d'une fonctionnalité. Demandez-moi d'abord de laquelle il s'agit, puis expliquez son flux d'appels.",
			"home.explore.task1": "Comprendre la structure du projet",
			"home.explore.task2": "Comprendre une fonctionnalité",
			"home.fix": "Corriger les problèmes et les échecs",
			"home.fix.prompt1": "J'ai rencontré un problème. Renseignez-vous d'abord sur les étapes de reproduction, le comportement attendu et réel, puis trouvez la cause racine et corrigez.",
			"home.fix.prompt2": "Exécutez les tests applicables au projet, identifiez la cause première des échecs et apportez des corrections minimales tout en préservant une couverture de régression efficace.",
			"home.fix.task1": "Diagnostiquer un problème",
			"home.fix.task2": "Corriger les tests en échec",
			"home.resizeInput": "Faites glisser pour redimensionner la zone de saisie",
			"home.review": "Examiner le code et suggérer des modifications",
			"home.review.prompt1": "Veuillez examiner les modifications non validées de cet espace de travail en soulignant en priorité les défauts réels, les risques de régression et les tests manquants. Ne modifiez rien pour l'instant.",
			"home.review.prompt2": "Examinez la qualité du code de ce projet et formulez des suggestions d'amélioration étayées par le code source. Évaluez d'abord sans modifier.",
			"home.review.task1": "Examiner les modifications actuelles",
			"home.review.task2": "Vérifier la qualité du code",
			"home.suggestions": "Démarrer une tâche",
			"home.workspace": "Choisissez d'abord un espace de travail, puis sélectionnez une tâche.",
			"input.historyHint": "↑↓ Historique",
			"input.prediction.dismiss": "Esc rejeter",
			"input.prediction.more": "Alt+↓ faire défiler",
			"input.prediction.tab": "Tab accepter",
			"sections.default": "Projets",
			"sections.menu": "Section",
			"sections.new": "Nouvelle section",
			"sections.newName": "Nom de la section",
			"sections.pin": "Épingler",
			"sections.pinned": "Épinglés",
			"sections.remove": "Supprimer la section",
			"sections.addWorkspace": "Ajouter un espace de travail",
			"sections.rename": "Renommer",
			"sections.settings": "Paramètres de section",
			"sections.unpin": "Détacher",
			"sections.writeAborted": "Le déplacement de l'espace de travail n'a pas abouti et a été automatiquement annulé.",
			"sections.writePending": "Le déplacement de l'espace de travail est en attente de réponse de l'hôte.",
			"session.markRead": "Marquer comme lu",
			"session.markUnread": "Marquer comme non lu",
			"sessionTitle.system": "Générez un titre pour une conversation d'assistant de programmation.\nProduisez exactement une ligne en deux parties : Type｜Thème\nLe type doit être l'un des suivants : {types}\nLe thème doit être un sujet concret et ne doit pas répéter le type. N'écrivez pas de dates, d'emojis, de guillemets, de préfixes, d'explications ou de Markdown.\nÉcrivez le thème dans la langue du message utilisateur.",
			"sessionTitle.type.design": "Conception",
			"sessionTitle.type.docs": "Documentation",
			"sessionTitle.type.explore": "Exploration",
			"sessionTitle.type.feature": "Fonctionnalité",
			"sessionTitle.type.fix": "Correctif",
			"sessionTitle.type.optimize": "Optimisation",
			"sessionTitle.type.release": "Publication",
			"sessionTitle.type.research": "Recherche",
			"sessionTitle.userFrame": "Générez un titre de conversation à partir de ce message utilisateur. Renvoyez uniquement une ligne Type｜Thème. N'ajoutez pas de troisième partie et ne répétez pas le thème.",
			"settings.back": "Retour à l'application",
			"settings.integrations": "Intégrations",
			"settings.noResults": "Aucune catégorie de paramètres correspondante",
			"settings.personal": "Personnel",
			"settings.records": "Enregistrements et applications",
			"settings.search": "Rechercher dans les paramètres…",
			"settings.title": "Paramètres",
			"sidebar.browsePlugins": "Parcourir d'autres plugins",
			"sidebar.createPlugin": "Créer votre plugin",
			"sidebar.createPrompt": "Créer un plugin DSH avec une entrée dans la barre latérale gauche.",
			"sidebar.dragToMore": "Glisser ici pour réduire dans plus",
			"sidebar.fixed": "Toujours épinglé",
			"sidebar.more": "Plus",
			"sidebar.newSession": "Nouveau chat",
			"theme.desc": "Personnalisez le style visuel de DeepSeek Harness avec les thèmes Codex et le verre dépoli mica.",
			"theme.glassEnable": "Aspect verre dépoli et mica",
			"theme.glassGlow": "Lueurs au sol",
			"theme.glassGlowHint": "Superpose deux reflets lumineux doux sur le dégradé de fond créant un halo sur la page d'accueil",
			"theme.glassHint": "Active le verre dépoli et la translucidité de fond. Désactivé, l'interface revient à des couleurs unies sans flou",
			"theme.glassPreset": "Préréglage de matériau",
			"theme.glassPresetHint": "Basculez librement entre niveaux de transparence et de flou dans les deux modes",
			"theme.mode": "Mode de disposition",
			"theme.modeCompat": "Disposition originale (Verre plat)",
			"theme.modeHint": "L'effet mica transforme l'interface en cartes flottantes dépolies ; le mode original préserve la disposition avec un matériau en verre",
			"theme.modeMica": "Cartes Mica (Cartes flottantes)",
			"theme.palette": "Palette de thèmes",
			"theme.paletteClaudeDark": "Claude Sombre",
			"theme.paletteClaudeLight": "Claude Clair",
			"theme.paletteCodexDark": "Codex Sombre",
			"theme.paletteCodexLight": "Codex Clair",
			"theme.paletteCyberpunk": "Cyberpunk",
			"theme.paletteDracula": "Dracula",
			"theme.paletteFrappe": "Frappé",
			"theme.paletteGruvboxDark": "Gruvbox Sombre",
			"theme.paletteGruvboxLight": "Gruvbox Clair",
			"theme.paletteHint": "Choisissez le thème officiel par défaut ou les styles classiques de Codex",
			"theme.codeHighlight": "Aperçu de la coloration syntaxique",
			"theme.paletteLatte": "Latte",
			"theme.paletteMacchiato": "Macchiato",
			"theme.paletteMocha": "Mocha",
			"theme.paletteSolarizedDark": "Solarized Sombre",
			"theme.paletteSolarizedLight": "Solarized Clair",
			"theme.paletteStock": "Officiel par défaut",
			"theme.presetClear": "Clair (Haute transparence)",
			"theme.presetFrosted": "Dépoli (Flou accentué)",
			"theme.presetStandard": "Standard (Équilibré)",
			"theme.subClaudeDark": "Tonalité sombre chaude et terre cuite",
			"theme.subClaudeLight": "Papier chaud et terre cuite",
			"theme.subCodexDark": "Noir immersif Texture épurée",
			"theme.subCodexLight": "Blanc papier Lecture agréable",
			"theme.subCyberpunk": "Vert néon sur noir · terminal Matrix",
			"theme.subDracula": "Rose vampire et lueur cyber",
			"theme.subFrappe": "Frappé sombre Brume translucide",
			"theme.subGruvboxDark": "Rétro sombre et or chaud",
			"theme.subGruvboxLight": "Papier kraft rétro et ambre",
			"theme.subLatte": "Latte chaud Lumineux et chaleureux",
			"theme.subMacchiato": "Macchiato sombre Doux et élégant",
			"theme.subMocha": "Mocha sombre Reposant pour les yeux",
			"theme.subSolarizedDark": "Sarcelle profond et cyan",
			"theme.subSolarizedLight": "Parchemin chaud et bleu",
			"theme.subStock": "Selon le système Interface native",
			"theme.title": "Apparence et thèmes"
		};
		//#endregion
		//#region src/client/locales/de.ts
		const de = {
			"about.dependencies": "Begleitende Verwaltungs-Plugins",
			"about.dependenciesDescription": "Jedes Plugin unterstützt bedarfsweise Installation und synchronisierte Batch-Updates mit einem Klick.",
			"about.dependency.archive": "Archivierte Sitzungen",
			"about.dependency.btw": "BTW-Abfragen",
			"about.dependency.dsh": "DeepSeek Harness",
			"about.dependency.experts": "Expertenverwaltung",
			"about.dependency.im": "IM-Assistent",
			"about.dependency.market": "App-Marktplatz",
			"about.dependency.pet": "Codex Haustier",
			"about.dependency.pua": "PUA",
			"about.dependency.review": "Code-Review",
			"about.dependency.schedule": "Geplante Aufgaben",
			"about.dependency.simplify": "Simplify",
			"about.dependency.skills": "Skill-Verwaltung",
			"about.dependency.suite": "Codex Suite",
			"about.dependency.ui": "Codex UI",
			"about.description": "Eingabeoptimierung, Vollbild-Einstellungs-Workbench, Desktop-Fenstermenü und Ökosystem-Plugin-Verwaltung.",
			"about.downloadsSource": "Offizielle npm-Statistik: Kumulierte Downloads seit Paketerstellung bis gestern. Klicken, um Paket auf npm anzuzeigen",
			"about.downloadsUnavailable": "Nicht verfügbar",
			"about.feature.composer": "Terminal-Eingabeverlauf (↑/↓), adaptive Breitenanpassung und Aufgabenvorschlagskarten",
			"about.feature.composer.name": "Eingabe-Erweiterungen (Composer)",
			"about.feature.dependencies": "Zentrale Verwaltung und 1-Klick-Batch-Updates für offizielle und Drittanbieter-DSH-Plugins",
			"about.feature.dependencies.name": "Ökosystem-Verwaltung (Dependencies)",
			"about.feature.desktopMenu": "Fügt der Menüleiste einen Hilfe-Eintrag mit Neuladen und Neustart hinzu",
			"about.feature.desktopMenu.name": "Desktop-Fenstermenü (Desktop Menus)",
			"about.feature.sessionTitle": "Semantische Extraktion und Generierung standardisierter Titel basierend auf der ersten Nachricht",
			"about.feature.sessionTitle.name": "Intelligenter Sitzungstitel (Session Title)",
			"about.feature.settingsSkin": "Vollbild-Einstellungs-Workbench, kategoriesortierte Navigation und native Suche",
			"about.feature.settingsSkin.name": "Natives Einstellungs-Skin (Settings Skin)",
			"about.feature.sidebar": "Modulare Seitenleiste, einklappbare Schubladen und freie Drag-and-Drop-Sortierung",
			"about.feature.sidebar.name": "Seitenleisten-Navigation (Sidebar)",
			"about.feature.theme": "Integrierte Codex Dunkel/Hell- & Catppuccin-Farbpaletten mit schwebendem Glimmer-Milchglaseffekt",
			"about.feature.theme.name": "Design & Erscheinungsbild (Theme)",
			"about.features": "Integrierte Sub-Plugins & Funktionen",
			"about.feedback": "Feedback",
			"about.install": "Installieren",
			"about.installBuildPolicy": "pnpm-Build-Script-Richtlinie ist nicht konfiguriert. Bitte Profilkonfiguration anpassen.",
			"about.installExitDesktop": "Beenden Sie DSH Desktop vollständig und starten Sie es vor dem Update neu.",
			"about.installExitWeb": "Laufende Plugin-Dateien können nicht überschrieben werden. DSH Web stoppen, über Terminal aktualisieren und neu starten.",
			"about.installFailed": "Plugin-Installation fehlgeschlagen. Bitte versuchen Sie es später erneut.",
			"about.installPnpmMissing": "pnpm wurde nicht gefunden. Bitte pnpm installieren und DSH neu starten.",
			"about.installServiceUnavailable": "DSH Desktop-Dienst noch nicht bereit. Bitte neu starten.",
			"about.installBusy": "Eine andere Installation wird bereits ausgeführt. Bitte warten Sie, bis sie abgeschlossen ist.",
			"about.installSuiteUnsupported": "Legacy-Suite-Mitglieder können nicht automatisch migriert werden. Bitte verwalten Sie diese über den Host-Plugin-Manager.",
			"about.installStoreMismatch": "Verzeichnis stimmt nicht mit pnpm-Store überein. Beenden Sie DSH Desktop und versuchen Sie es erneut.",
			"about.installStoreMismatchWeb": "Verzeichnis stimmt nicht mit pnpm überein. Stoppen Sie DSH Web und versuchen Sie es erneut.",
			"about.installTimeout": "Zeitüberschreitung bei der Plugin-Installation. Bitte Netzwerkverbindung prüfen.",
			"about.installUnchanged": "Befehl abgeschlossen, aber Plugin wurde nicht übernommen. Bitte erneut versuchen.",
			"about.installWebFailed": "Plugin-Update fehlgeschlagen. Überprüfen Sie die Terminalausgabe von DSH Web.",
			"about.installed": "Installiert",
			"about.installing": "Wird installiert",
			"about.loading": "Abhängigkeitsstatus wird geladen…",
			"about.missing": "Nicht installiert",
			"about.nav": "Codex UI",
			"about.packagesDone": "{0} Pakete fertiggestellt",
			"about.progress.building": "Erstellen",
			"about.progress.downloading": "Herunterladen",
			"about.progress.linking": "Dateien schreiben",
			"about.progress.resolving": "Abhängigkeiten auflösen",
			"about.progressHint": "Plugin wird installiert…",
			"about.refreshFailed": "Aktualisierung fehlgeschlagen; letztes erfolgreiches Ergebnis wird angezeigt.",
			"about.applied": "Abhängigkeiten installiert oder aktualisiert und angewendet.",
			"about.restartRequired": "Abhängigkeiten installiert oder aktualisiert. Starten Sie den DSH-Host neu, um Änderungen anzuwenden.",
			"about.statusFailed": "Abhängigkeitsstatus kann nicht gelesen werden.",
			"about.title": "Codex UI",
			"about.totalDownloads": "npm Gesamtdownloads",
			"about.upToDate": "Alle Begleit-Plugins sind installiert und auf dem neuesten Stand.",
			"about.update": "Aktualisieren",
			"about.updateAll": "Alle installieren/aktualisieren",
			"about.updateAvailable": "Update verfügbar",
			"about.updatingAll": "Wird installiert/aktualisiert",
			"about.viewProject": "GitHub",
			"composer.desc": "Inline-Vorhersage und Verlaufsbereich (↑/↓) konfigurieren; weitere Funktionen wie die Breitenanpassung bleiben aktiv.",
			"composer.prediction": "Intelligente Eingabevorhersage",
			"composer.predictionHint": "Aus, nur Fortsetzung bei Tipppausen oder beides; mit Tab übernehmen.",
			"composer.predictionLocked": "In der Profilkonfiguration deaktiviert (cordis.patch.yml → codex-ui-composer prediction); kann hier nicht aktiviert werden.",
			"composer.modeOff": "Aus",
			"composer.modeContinue": "Nur Fortsetzung",
			"composer.modeAll": "Vorhersage & Fortsetzung",
			"composer.historyScope": "Verlaufsbereich",
			"composer.historyScopeHint": "Erinnerte Eingaben nur aus dieser Unterhaltung oder gemeinsam mit allen Unterhaltungen im Arbeitsbereich.",
			"composer.historyScopeSession": "Diese Unterhaltung",
			"composer.historyScopeWorkspace": "Arbeitsbereich",
			"composer.title": "Eingabe-Erweiterungen",
			"desktopMenu.help": "Hilfe",
			"desktopMenu.help.reloadPage": "Seite neu laden",
			"desktopMenu.help.restartAppHost": "App und Host neu starten",
			"desktopMenu.help.restartConfirm": "DeepSeek Harness wird geschlossen und neu geöffnet; laufende Aufgaben werden unterbrochen. Fortfahren?",
			"desktopMenu.restart.busy": "Ein Neustart wird bereits ausgeführt. Bitte warten.",
			"desktopMenu.restart.cancelled": "Die App wurde nicht beendet; Neustart abgebrochen.",
			"desktopMenu.restart.close": "Schließen",
			"desktopMenu.restart.failed": "Neustart fehlgeschlagen",
			"desktopMenu.restart.launchFailed": "Die App wurde beendet, konnte jedoch nicht automatisch neu geöffnet werden. Bitte manuell starten.",
			"desktopMenu.restart.quitting": "DeepSeek Harness wird geschlossen und neu geöffnet…",
			"desktopMenu.restart.relaunched": "Neu gestartet.",
			"desktopMenu.restart.timeout": "Neustart nicht rechtzeitig abgeschlossen; bitte App überprüfen.",
			"desktopMenu.restart.unreachable": "Host nicht erreichbar; Neustart-Kanal nicht verfügbar.",
			"desktopMenu.restart.unsupportedDesktopOnly": "Dies ist keine Desktop-Version; App kann nicht neu gestartet werden.",
			"desktopMenu.restart.unsupportedMissingApp": "DeepSeek Harness-Programmdatei nicht gefunden; Neustart nicht möglich.",
			"errors.forbidden": "Anfrage durch Sicherheitsprüfung abgelehnt. Versuchen Sie es von einer vertrauenswürdigen Adresse.",
			"errors.generic": "Vorgang nicht abgeschlossen. Bitte erneut versuchen.",
			"errors.serviceUnavailable": "Dienst vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.",
			"errors.unauthorized": "Bitte melden Sie sich bei DSH an und versuchen Sie es erneut.",
			"home.build": "Neue Funktionen, Anwendungen oder Tools erstellen",
			"home.build.prompt1": "Ich möchte eine neue Funktion in diesem Projekt implementieren. Stimmen Sie zuerst Anforderungen und Abnahmekriterien mit mir ab.",
			"home.build.prompt2": "Ich möchte ein kleines Tool erstellen. Fragen Sie mich zuerst nach Ziel, Ein- und Ausgaben und schlagen Sie dann einen Ansatz vor.",
			"home.build.task1": "Eine neue Funktion implementieren",
			"home.build.task2": "Ein kleines Tool erstellen",
			"home.busy": "Die Eingabe wird derzeit verarbeitet. Bitte versuchen Sie es in Kürze erneut.",
			"home.draft": "Ihr aktueller Entwurf und Ihre Anhänge bleiben erhalten. Löschen Sie die Eingabe, um einen Aufgabenvorschlag zu verwenden.",
			"home.explore": "Code untersuchen und verstehen",
			"home.explore.prompt1": "Erkunden Sie den Code dieses Arbeitsbereichs und erklären Sie die Projektstruktur, die Haupteinstiegspunkte und die Modulbeziehungen.",
			"home.explore.prompt2": "Ich möchte die Implementierung einer Funktion verstehen. Fragen Sie mich zuerst nach der konkreten Funktion und erklären Sie dann den Aufrufablauf.",
			"home.explore.task1": "Projektstruktur verstehen",
			"home.explore.task2": "Eine Funktion verstehen",
			"home.fix": "Probleme und Fehler beheben",
			"home.fix.prompt1": "Ich habe ein Problem festgestellt. Fragen Sie mich zuerst nach Schritten zur Reproduktion, erwartetem und tatsächlichem Verhalten, und beheben Sie die Ursache.",
			"home.fix.prompt2": "Führen Sie die anwendbaren Projekttests aus, ermitteln Sie die Fehlerursache und nehmen Sie minimale Korrekturen mit sinnvoller Regressionsabdeckung vor.",
			"home.fix.task1": "Ein Problem untersuchen",
			"home.fix.task2": "Fehlschlagende Tests beheben",
			"home.resizeInput": "Ziehen, um die Breite des Eingabebereichs anzupassen",
			"home.review": "Code überprüfen und Änderungen vorschlagen",
			"home.review.prompt1": "Überprüfen Sie die uncommitteten Änderungen in diesem Arbeitsbereich. Weisen Sie vorrangig auf echte Mängel, Regressionsrisiken und fehlende Tests hin; ändern Sie noch nichts.",
			"home.review.prompt2": "Prüfen Sie die Codequalität dieses Projekts und schlagen Sie quelltextgestützte Verbesserungen vor. Bewerten Sie zunächst nur, ohne Änderungen vorzunehmen.",
			"home.review.task1": "Aktuelle Änderungen überprüfen",
			"home.review.task2": "Codequalität prüfen",
			"home.suggestions": "Eine Aufgabe starten",
			"home.workspace": "Wählen Sie zuerst einen Arbeitsbereich aus und dann eine Aufgabe.",
			"input.historyHint": "↑↓ Verlauf",
			"input.prediction.dismiss": "Esc verwerfen",
			"input.prediction.more": "Alt+↓ wechseln",
			"input.prediction.tab": "Tab übernehmen",
			"sections.default": "Projekte",
			"sections.menu": "Bereich",
			"sections.new": "Neuer Bereich",
			"sections.newName": "Bereichsname",
			"sections.pin": "Anheften",
			"sections.pinned": "Angeheftet",
			"sections.remove": "Bereich entfernen",
			"sections.addWorkspace": "Arbeitsbereich hinzufügen",
			"sections.rename": "Umbenennen",
			"sections.settings": "Bereichseinstellungen",
			"sections.unpin": "Lösen",
			"sections.writeAborted": "Verschieben des Arbeitsbereichs wurde nicht abgeschlossen und automatisch abgebrochen.",
			"sections.writePending": "Verschieben des Arbeitsbereichs wartet noch auf Rückmeldung des Hosts.",
			"session.markRead": "Als gelesen markieren",
			"session.markUnread": "Als ungelesen markieren",
			"sessionTitle.system": "Generieren Sie einen Titel für eine Programmierassistenten-Konversation.\nGeben Sie genau eine Zeile mit zwei Teilen aus: Typ｜Thema\nDer Typ muss einer der folgenden sein: {types}\nDas Thema muss ein konkreter Gegenstand sein und darf den Typ nicht wiederholen. Schreiben Sie keine Daten, Emojis, Anführungszeichen, Präfixe, Erklärungen oder Markdown.\nSchreiben Sie das Thema in der Sprache der Benutzernachricht.",
			"sessionTitle.type.design": "Design",
			"sessionTitle.type.docs": "Dokumentation",
			"sessionTitle.type.explore": "Erkundung",
			"sessionTitle.type.feature": "Feature",
			"sessionTitle.type.fix": "Behebung",
			"sessionTitle.type.optimize": "Optimierung",
			"sessionTitle.type.release": "Release",
			"sessionTitle.type.research": "Forschung",
			"sessionTitle.userFrame": "Erstellen Sie einen Konversationstitel aus dieser Benutzernachricht. Geben Sie nur eine Zeile Typ｜Thema zurück. Fügen Sie keinen dritten Teil hinzu und wiederholen Sie das Thema nicht.",
			"settings.back": "Zurück zur App",
			"settings.integrations": "Integrationen",
			"settings.noResults": "Keine passenden Einstellungskategorien",
			"settings.personal": "Persönlich",
			"settings.records": "Protokolle und Apps",
			"settings.search": "Einstellungen suchen…",
			"settings.title": "Einstellungen",
			"sidebar.browsePlugins": "Weitere Plugins durchsuchen",
			"sidebar.createPlugin": "Eigenes Plugin erstellen",
			"sidebar.createPrompt": "Erstellen Sie ein DSH-Plugin mit einem Eintrag in der linken Seitenleiste.",
			"sidebar.dragToMore": "Hierher ziehen, um in Mehr abzulegen",
			"sidebar.fixed": "Immer angeheftet",
			"sidebar.more": "Mehr",
			"sidebar.newSession": "Neuer Chat",
			"theme.desc": "Passen Sie den visuellen Stil von DeepSeek Harness mit klassischen Codex-Themes und mattiertem Glimmerglas an.",
			"theme.glassEnable": "Glas- und Mica-Optik",
			"theme.glassGlow": "Bodenglanzeffekte",
			"theme.glassGlowHint": "Legt zwei weiche Lichtreflexe über den Farbverlauf am Boden. Erzeugt sanfte Reflexionszonen",
			"theme.glassHint": "Aktiviert Milchglas und dezente Hintergrundtransparenz. Deaktiviert kehrt das Layout zu Volltonfarben ohne Unschärfe zurück",
			"theme.glassPreset": "Material-Voreinstellung",
			"theme.glassPresetHint": "Transparenz und Unschärfe in beiden Layout-Modi flexibel anpassen",
			"theme.mode": "Layout-Modus",
			"theme.modeCompat": "Original-Layout (Flaches Glas)",
			"theme.modeHint": "Mica gestaltet das UI in schwebende satinierte Karten um; Original-Layout behält die Anordnung mit Glasmaterial bei",
			"theme.modeMica": "Mica-Effekt (Schwebende Karten)",
			"theme.palette": "Design-Farbpalette",
			"theme.paletteClaudeDark": "Claude Dunkel",
			"theme.paletteClaudeLight": "Claude Hell",
			"theme.paletteCodexDark": "Codex Dunkel",
			"theme.paletteCodexLight": "Codex Hell",
			"theme.paletteCyberpunk": "Cyberpunk",
			"theme.paletteDracula": "Dracula",
			"theme.paletteFrappe": "Frappé",
			"theme.paletteGruvboxDark": "Gruvbox Dunkel",
			"theme.paletteGruvboxLight": "Gruvbox Hell",
			"theme.paletteHint": "Offizielle Standard- oder klassische Codex-Farbschemata auswählen",
			"theme.codeHighlight": "Code-Hervorhebungsvorschau",
			"theme.paletteLatte": "Latte",
			"theme.paletteMacchiato": "Macchiato",
			"theme.paletteMocha": "Mocha",
			"theme.paletteSolarizedDark": "Solarized Dunkel",
			"theme.paletteSolarizedLight": "Solarized Hell",
			"theme.paletteStock": "Offizieller Standard",
			"theme.presetClear": "Klar (Hohe Durchsicht)",
			"theme.presetFrosted": "Satiniert (Starke Unschärfe)",
			"theme.presetStandard": "Standard (Ausgewogen)",
			"theme.subClaudeDark": "Warmer Dunkelton & Terrakotta",
			"theme.subClaudeLight": "Warmes Papier & Terrakotta",
			"theme.subCodexDark": "Immersives Anthrazit Puristischer Stil",
			"theme.subCodexLight": "Klares Papierweiß Angenehmes Lesen",
			"theme.subCyberpunk": "Neongrün auf Schwarz · Matrix-Terminal",
			"theme.subDracula": "Vampir-Pink & Cyber-Glow",
			"theme.subFrappe": "Dunkles Frappé Nebelig-transparent",
			"theme.subGruvboxDark": "Retro-Dunkel & Warmgold",
			"theme.subGruvboxLight": "Vintage-Kraftpapier & Bernstein",
			"theme.subLatte": "Warmes Latte Hell und freundlich",
			"theme.subMacchiato": "Dunkles Macchiato Sanft und elegant",
			"theme.subMocha": "Dunkles Mokka Augenschonend",
			"theme.subSolarizedDark": "Tiefes Blaugrün & Cyan",
			"theme.subSolarizedLight": "Warmes Pergament & Blau",
			"theme.subStock": "System folgen Natives UI",
			"theme.title": "Erscheinungsbild & Themes"
		};
		//#endregion
		//#region src/client/locales/ru.ts
		const ru = {
			"about.dependencies": "Сопутствующие плагины управления",
			"about.dependenciesDescription": "Каждый плагин поддерживает установку по требованию и синхронное пакетное обновление в один клик.",
			"about.dependency.archive": "Архив сессий",
			"about.dependency.btw": "Запросы BTW",
			"about.dependency.dsh": "DeepSeek Harness",
			"about.dependency.experts": "Управление экспертами",
			"about.dependency.im": "IM-ассистент",
			"about.dependency.market": "Магазин приложений",
			"about.dependency.pet": "Питомец Codex",
			"about.dependency.pua": "PUA",
			"about.dependency.review": "Ревью кода",
			"about.dependency.schedule": "Запланированные задачи",
			"about.dependency.simplify": "Simplify",
			"about.dependency.skills": "Управление навыками",
			"about.dependency.suite": "Пакет Codex",
			"about.dependency.ui": "Codex UI",
			"about.description": "Улучшения поля ввода, полноэкранная панель настроек, меню окна рабочего стола и управление плагинами экосистемы.",
			"about.downloadsSource": "Официальная статистика npm: суммарные загрузки со дня создания пакета по вчерашний день. Нажмите, чтобы открыть пакет на npm",
			"about.downloadsUnavailable": "Недоступно",
			"about.feature.composer": "Быстрый вызов истории ввода в стиле терминала (↑/↓), адаптивная регулировка ширины и карточки с предложениями задач",
			"about.feature.composer.name": "Улучшения ввода (Composer)",
			"about.feature.dependencies": "Централизованное управление и пакетное обновление официальных и сторонних плагинов DSH в один клик",
			"about.feature.dependencies.name": "Управление экосистемой (Dependencies)",
			"about.feature.desktopMenu": "Добавляет пункт помощи в строку меню системы с перезагрузкой страницы и перезапуском",
			"about.feature.desktopMenu.name": "Меню окна рабочего стола (Desktop Menus)",
			"about.feature.sessionTitle": "Интеллектуальное извлечение и генерация заголовков на основе первого сообщения",
			"about.feature.sessionTitle.name": "Умный заголовок сессии (Session Title)",
			"about.feature.settingsSkin": "Полноэкранная панель настроек, навигация по категориям и нативный поиск",
			"about.feature.settingsSkin.name": "Нативная тема настроек (Settings Skin)",
			"about.feature.sidebar": "Модульная боковая панель, складные ящики и свободное перетаскивание",
			"about.feature.sidebar.name": "Навигация боковой панели (Sidebar)",
			"about.feature.theme": "Встроенные темная/светлая темы Codex и палитры Catppuccin с эффектом матового стекла mica",
			"about.feature.theme.name": "Тема и оформление (Theme)",
			"about.features": "Встроенные субплагины и возможности",
			"about.feedback": "Обратная связь",
			"about.install": "Установить",
			"about.installBuildPolicy": "Политика сборки pnpm не настроена. Обновите конфигурацию профиля.",
			"about.installExitDesktop": "Полностью закройте DSH Desktop и перезапустите перед обновлением.",
			"about.installExitWeb": "Невозможно перезаписать запущенные файлы. Остановите DSH Web, обновите плагин через терминал и перезапустите.",
			"about.installFailed": "Ошибка установки плагина. Попробуйте позже.",
			"about.installPnpmMissing": "pnpm не найден в системе. Установите pnpm и перезапустите DSH.",
			"about.installServiceUnavailable": "Служба зависимостей DSH Desktop не готова. Перезапустите приложение.",
			"about.installBusy": "Другая установка уже выполняется. Дождитесь её завершения.",
			"about.installSuiteUnsupported": "Устаревшие компоненты пакета не могут быть перенесены автоматически. Управляйте ими через диспетчер плагинов хоста.",
			"about.installStoreMismatch": "Каталог не совпадает с хранилищем pnpm. Закройте DSH Desktop и попробуйте снова.",
			"about.installStoreMismatchWeb": "Каталог не совпадает с pnpm. Остановите DSH Web и повторите попытку; если ошибка повторяется, переустановите зависимости профиля.",
			"about.installTimeout": "Тайм-аут установки плагина. Проверьте подключение к сети.",
			"about.installUnchanged": "Команда завершена, но плагин не попал в профиль. Повторите попытку.",
			"about.installWebFailed": "Ошибка обновления плагина. Проверьте вывод терминала DSH Web.",
			"about.installed": "Установлено",
			"about.installing": "Установка",
			"about.loading": "Загрузка статуса зависимостей…",
			"about.missing": "Не установлено",
			"about.nav": "Codex UI",
			"about.packagesDone": "Завершено пакетов: {0}",
			"about.progress.building": "Сборка",
			"about.progress.downloading": "Загрузка",
			"about.progress.linking": "Запись файлов",
			"about.progress.resolving": "Разрешение зависимостей",
			"about.progressHint": "Установка плагина…",
			"about.refreshFailed": "Не удалось обновить статус; показан последний успешный результат.",
			"about.applied": "Зависимости установлены или обновлены и применены.",
			"about.restartRequired": "Зависимости установлены или обновлены. Перезапустите хост DSH, чтобы применить изменения.",
			"about.statusFailed": "Не удалось прочитать статус зависимостей.",
			"about.title": "Codex UI",
			"about.totalDownloads": "Всего загрузок на npm",
			"about.upToDate": "Все сопутствующие плагины установлены и обновлены до последней версии.",
			"about.update": "Обновить",
			"about.updateAll": "Установить/обновить все",
			"about.updateAvailable": "Доступно обновление",
			"about.updatingAll": "Установка/обновление",
			"about.viewProject": "GitHub",
			"composer.desc": "Настройте умное предсказание ввода и область истории (↑/↓); остальные функции, включая изменение ширины, остаются активными.",
			"composer.prediction": "Интеллектуальное предсказание ввода",
			"composer.predictionHint": "Отключено, только автодополнение при паузе, или оба варианта; Tab для принятия.",
			"composer.predictionLocked": "Отключено в настройках профиля (cordis.patch.yml → codex-ui-composer prediction); здесь включить невозможно.",
			"composer.modeOff": "Выкл",
			"composer.modeContinue": "Только продолжение",
			"composer.modeAll": "Предсказание и продолжение",
			"composer.historyScope": "Область истории",
			"composer.historyScopeHint": "Показывать введённые сообщения только этого диалога или всех диалогов рабочей области.",
			"composer.historyScopeSession": "Этот диалог",
			"composer.historyScopeWorkspace": "Рабочая область",
			"composer.title": "Улучшения поля ввода",
			"desktopMenu.help": "Справка",
			"desktopMenu.help.reloadPage": "Перезагрузить страницу",
			"desktopMenu.help.restartAppHost": "Перезапустить приложение и хост",
			"desktopMenu.help.restartConfirm": "DeepSeek Harness будет закрыт и открыт заново; выполняющиеся задачи будут прерваны. Продолжить?",
			"desktopMenu.restart.busy": "Перезапуск уже выполняется. Пожалуйста, подождите.",
			"desktopMenu.restart.cancelled": "Приложение не закрылось; перезапуск отменен.",
			"desktopMenu.restart.close": "Закрыть",
			"desktopMenu.restart.failed": "Сбой перезапуска",
			"desktopMenu.restart.launchFailed": "Приложение закрылось, но не смогло открыться автоматически. Запустите его вручную.",
			"desktopMenu.restart.quitting": "Закрытие и повторное открытие DeepSeek Harness…",
			"desktopMenu.restart.relaunched": "Перезапущено.",
			"desktopMenu.restart.timeout": "Перезапуск не завершился вовремя; пожалуйста, проверьте приложение.",
			"desktopMenu.restart.unreachable": "Не удается связаться с хостом; канал перезапуска недоступен.",
			"desktopMenu.restart.unsupportedDesktopOnly": "Это не десктопная версия, перезапуск не поддерживается.",
			"desktopMenu.restart.unsupportedMissingApp": "Исполняемый файл DeepSeek Harness не найден, перезапуск невозможен.",
			"errors.forbidden": "Запрос отклонен проверкой безопасности. Повторите с доверенного адреса DSH.",
			"errors.generic": "Операция не завершена. Пожалуйста, повторите попытку.",
			"errors.serviceUnavailable": "Сервис временно недоступен. Пожалуйста, повторите попытку позже.",
			"errors.unauthorized": "Пожалуйста, войдите в DSH и повторите попытку.",
			"home.build": "Создавать новые функции, приложения или инструменты",
			"home.build.prompt1": "Я хочу реализовать новую функцию в этом проекте. Сначала согласуйте со мной требования и критерии приемки.",
			"home.build.prompt2": "Я хочу создать небольшую утилиту. Сначала спросите меня о цели, входных и выходных данных, а затем предложите решение.",
			"home.build.task1": "Реализовать новую функцию",
			"home.build.task2": "Создать небольшую утилиту",
			"home.busy": "Ввод в данный момент обрабатывается. Пожалуйста, повторите попытку позже.",
			"home.draft": "Текущий черновик и вложения сохранены. Очистите ввод, чтобы использовать предложение задачи.",
			"home.explore": "Исследовать и понять код",
			"home.explore.prompt1": "Изучите код этой рабочей области и объясните структуру проекта, основные точки входа и связи между модулями.",
			"home.explore.prompt2": "Я хочу понять реализацию определенного функционала. Сначала спросите меня, о какой функции идет речь, затем объясните цепочку вызовов.",
			"home.explore.task1": "Изучить структуру проекта",
			"home.explore.task2": "Разобраться в функционале",
			"home.fix": "Исправить проблемы и ошибки",
			"home.fix.prompt1": "Я столкнулся с проблемой. Сначала спросите меня о шагах воспроизведения, ожидаемом и фактическом поведении, затем найдите первопричину и исправьте.",
			"home.fix.prompt2": "Запустите применимые тесты проекта, определите причину сбоя и внесите минимальные исправления, сохранив надежное регрессионное покрытие.",
			"home.fix.task1": "Разобраться с проблемой",
			"home.fix.task2": "Исправить упавшие тесты",
			"home.resizeInput": "Перетащите для изменения ширины области ввода",
			"home.review": "Проверить код и предложить изменения",
			"home.review.prompt1": "Проверьте незакоммиченные изменения в этой рабочей области, обращая особое внимание на реальные дефекты, риски регрессии и отсутствие тестов; пока ничего не меняйте.",
			"home.review.prompt2": "Проверьте качество кода текущего проекта и предложите обоснованные улучшения на основе исходного кода. Сначала только оцените, не внося изменений.",
			"home.review.task1": "Проверить текущие изменения",
			"home.review.task2": "Проверить качество кода",
			"home.suggestions": "Начать задачу",
			"home.workspace": "Сначала выберите рабочую область, затем выберите задачу.",
			"input.historyHint": "↑↓ История",
			"input.prediction.dismiss": "Esc отклонить",
			"input.prediction.more": "Alt+↓ переключить",
			"input.prediction.tab": "Tab принять",
			"sections.default": "Проекты",
			"sections.menu": "Секция",
			"sections.new": "Новая секция",
			"sections.newName": "Название секции",
			"sections.pin": "Закрепить",
			"sections.pinned": "Закрепленные",
			"sections.remove": "Удалить секцию",
			"sections.addWorkspace": "Добавить рабочую область",
			"sections.rename": "Переименовать",
			"sections.settings": "Настройки секции",
			"sections.unpin": "Открепить",
			"sections.writeAborted": "Перемещение рабочей области не было завершено и было автоматически отменено.",
			"sections.writePending": "Перемещение рабочей области еще ожидает ответа от хоста.",
			"session.markRead": "Пометить как прочитанное",
			"session.markUnread": "Пометить как непрочитанное",
			"sessionTitle.system": "Создайте заголовок для беседы с помощником по программированию.\nВыведите ровно одну строку из двух частей: Тип｜Тема\nТип должен быть одним из: {types}\nТема должна быть конкретным вопросом и не должна повторять тип. Не пишите даты, эмодзи, кавычки, префиксы, пояснения или Markdown.\nПишите тему на языке сообщения пользователя.",
			"sessionTitle.type.design": "Дизайн",
			"sessionTitle.type.docs": "Документация",
			"sessionTitle.type.explore": "Исследование",
			"sessionTitle.type.feature": "Функция",
			"sessionTitle.type.fix": "Исправление",
			"sessionTitle.type.optimize": "Оптимизация",
			"sessionTitle.type.release": "Релиз",
			"sessionTitle.type.research": "Анализ",
			"sessionTitle.userFrame": "Создайте заголовок беседы на основе этого сообщения пользователя. Верните только одну строку Тип｜Тема. Не добавляйте третью часть и не повторяйте тему.",
			"settings.back": "Вернуться в приложение",
			"settings.integrations": "Интеграции",
			"settings.noResults": "Нет совпадающих категорий настроек",
			"settings.personal": "Личные",
			"settings.records": "Записи и приложения",
			"settings.search": "Поиск настроек…",
			"settings.title": "Настройки",
			"sidebar.browsePlugins": "Просмотреть другие плагины",
			"sidebar.createPlugin": "Создать свой плагин",
			"sidebar.createPrompt": "Создайте плагин DSH с пунктом в левой боковой панели.",
			"sidebar.dragToMore": "Перетащите сюда, чтобы скрыть в «Еще»",
			"sidebar.fixed": "Всегда закреплено",
			"sidebar.more": "Еще",
			"sidebar.newSession": "Новый чат",
			"theme.desc": "Настройте визуальный стиль DeepSeek Harness с классическими темами Codex и эффектом матового стекла mica.",
			"theme.glassEnable": "Эффект стекла и стиль Mica",
			"theme.glassGlow": "Блики на фоне",
			"theme.glassGlowHint": "Накладывает мягкие световые блики на градиентный фон главной страницы",
			"theme.glassHint": "Включает матовое стекло и полупрозрачность фона. При отключении интерфейс возвращается к сплошным цветам без размытия",
			"theme.glassPreset": "Предустановка материала",
			"theme.glassPresetHint": "Свободно переключайте уровень прозрачности и размытия в обоих режимах",
			"theme.mode": "Режим компоновки",
			"theme.modeCompat": "Оригинальный макет (Плоское стекло)",
			"theme.modeHint": "Эффект mica преобразует интерфейс в парящие матовые карточки; оригинальный режим сохраняет структуру с эффектом стекла",
			"theme.modeMica": "Эффект Mica (Парящие карточки)",
			"theme.palette": "Цветовая палитра",
			"theme.paletteClaudeDark": "Claude Темная",
			"theme.paletteClaudeLight": "Claude Светлая",
			"theme.paletteCodexDark": "Codex Темная",
			"theme.paletteCodexLight": "Codex Светлая",
			"theme.paletteCyberpunk": "Cyberpunk",
			"theme.paletteDracula": "Dracula",
			"theme.paletteFrappe": "Frappé",
			"theme.paletteGruvboxDark": "Gruvbox Темная",
			"theme.paletteGruvboxLight": "Gruvbox Светлая",
			"theme.paletteHint": "Выберите официальную тему по умолчанию или классические стили Codex",
			"theme.codeHighlight": "Предпросмотр подсветки кода",
			"theme.paletteLatte": "Latte",
			"theme.paletteMacchiato": "Macchiato",
			"theme.paletteMocha": "Mocha",
			"theme.paletteSolarizedDark": "Solarized Темная",
			"theme.paletteSolarizedLight": "Solarized Светлая",
			"theme.paletteStock": "Официальная по умолчанию",
			"theme.presetClear": "Прозрачный (Высокая прозрачность)",
			"theme.presetFrosted": "Матовый (Сильное размытие)",
			"theme.presetStandard": "Стандартный (Умеренный)",
			"theme.subClaudeDark": "Теплый темный и терракотовый",
			"theme.subClaudeLight": "Теплая бумага и терракотовый",
			"theme.subCodexDark": "Глубокий угольный Минимализм",
			"theme.subCodexLight": "Чистый бумажный Комфортное чтение",
			"theme.subCyberpunk": "Неоновый зеленый на черном · терминал матрицы",
			"theme.subDracula": "Вампирский розовый и кибер-свечение",
			"theme.subFrappe": "Темный фраппе Полупрозрачный туман",
			"theme.subGruvboxDark": "Ретро-темный и теплое золото",
			"theme.subGruvboxLight": "Винтажный крафт и янтарь",
			"theme.subLatte": "Теплый латте Мягкий и светлый",
			"theme.subMacchiato": "Темный макиато Мягкий и элегантный",
			"theme.subMocha": "Темный мокко Защита для глаз",
			"theme.subSolarizedDark": "Глубокий бирюзовый и циан",
			"theme.subSolarizedLight": "Теплый пергамент и синий",
			"theme.subStock": "Как в системе Нативный интерфейс",
			"theme.title": "Внешний вид и темы"
		};
		//#endregion
		//#region src/client/locales/pt.ts
		const pt = {
			"about.dependencies": "Plugins de gerenciamento complementares",
			"about.dependenciesDescription": "Cada plugin complementar suporta instalação sob demanda e atualizações sincronizadas em lote.",
			"about.dependency.archive": "Conversas arquivadas",
			"about.dependency.btw": "Consultas BTW",
			"about.dependency.dsh": "DeepSeek Harness",
			"about.dependency.experts": "Gestão de especialistas",
			"about.dependency.im": "Assistente IM",
			"about.dependency.market": "Loja de aplicativos",
			"about.dependency.pet": "Mascote Codex",
			"about.dependency.pua": "PUA",
			"about.dependency.review": "Revisão de código",
			"about.dependency.schedule": "Tarefas agendadas",
			"about.dependency.simplify": "Simplify",
			"about.dependency.skills": "Gestão de habilidades",
			"about.dependency.suite": "Pacote Codex",
			"about.dependency.ui": "Codex UI",
			"about.description": "Aprimoramentos de entrada, interface de configurações em tela cheia, menu de janela da área de trabalho e gerenciamento do ecossistema.",
			"about.downloadsSource": "Estatísticas oficiais do npm: downloads acumulados desde a criação do pacote até ontem. Clique para ver o pacote no npm",
			"about.downloadsUnavailable": "Indisponível",
			"about.feature.composer": "Histórico de entrada estilo terminal (↑/↓), redimensionamento adaptativo e cartões de sugestões",
			"about.feature.composer.name": "Aprimoramentos de entrada (Composer)",
			"about.feature.dependencies": "Gerenciamento centralizado e atualizações em lote em um clique para plugins oficiais e de terceiros do DSH",
			"about.feature.dependencies.name": "Gestão de ecossistema (Dependencies)",
			"about.feature.desktopMenu": "Adiciona entrada de ajuda na barra de menus nativa com recarregamento de página e reinicialização",
			"about.feature.desktopMenu.name": "Menu da janela da área de trabalho (Desktop Menus)",
			"about.feature.sessionTitle": "Extração e geração inteligente de títulos padronizados com base na semântica da primeira mensagem",
			"about.feature.sessionTitle.name": "Título de sessão inteligente (Session Title)",
			"about.feature.settingsSkin": "Interface de configurações em tela cheia, navegação categorizada e busca nativa",
			"about.feature.settingsSkin.name": "Visual de configurações nativo (Settings Skin)",
			"about.feature.sidebar": "Barra lateral modular, gavetas recolhíveis e reorganização livre por arrasto",
			"about.feature.sidebar.name": "Navegação da barra lateral (Sidebar)",
			"about.feature.theme": "Paletas clássicas Codex escuro/claro e Catppuccin integradas, com efeito de vidro fosco mica",
			"about.feature.theme.name": "Tema e aparência (Theme)",
			"about.features": "Subplugins e recursos integrados",
			"about.feedback": "Feedback",
			"about.install": "Instalar",
			"about.installBuildPolicy": "A política de scripts de compilação do pnpm não está configurada. Atualize a configuração do perfil.",
			"about.installExitDesktop": "Feche o DSH Desktop completamente e reabra antes de atualizar.",
			"about.installExitWeb": "Não é possível substituir arquivos em execução. Pare o DSH Web, atualize pelo terminal e reinicie.",
			"about.installFailed": "Falha na instalação do plugin. Tente novamente mais tarde.",
			"about.installPnpmMissing": "pnpm não encontrado. Instale o pnpm e reinicie o DSH.",
			"about.installServiceUnavailable": "O serviço de dependências do DSH Desktop não está pronto. Reinicie e tente novamente.",
			"about.installBusy": "Outra instalação já está em andamento. Aguarde a conclusão.",
			"about.installSuiteUnsupported": "Os membros do pacote legado não podem ser migrados automaticamente. Gerencie-os pelo gerenciador de plugins do host.",
			"about.installStoreMismatch": "O diretório não coincide com o repositório pnpm. Feche o DSH Desktop completamente e tente novamente.",
			"about.installStoreMismatchWeb": "O diretório não coincide com o pnpm. Pare o DSH Web e tente novamente; se persistir, reinstale as dependências deste Perfil.",
			"about.installTimeout": "Tempo limite de instalação do plugin esgotado. Verifique sua conexão de rede.",
			"about.installUnchanged": "O comando foi concluído, mas o plugin não entrou neste perfil. Tente novamente.",
			"about.installWebFailed": "Falha ao atualizar o plugin. Verifique a saída do terminal do DSH Web.",
			"about.installed": "Instalado",
			"about.installing": "Instalando",
			"about.loading": "Carregando status das dependências…",
			"about.missing": "Não instalado",
			"about.nav": "Codex UI",
			"about.packagesDone": "{0} pacotes concluídos",
			"about.progress.building": "Compilando",
			"about.progress.downloading": "Baixando",
			"about.progress.linking": "Gravando arquivos",
			"about.progress.resolving": "Resolvendo dependências",
			"about.progressHint": "Instalando plugin…",
			"about.refreshFailed": "Falha ao atualizar o status; exibindo o último resultado bem-sucedido.",
			"about.applied": "Dependências instaladas ou atualizadas e aplicadas.",
			"about.restartRequired": "Dependências instaladas ou atualizadas. Reinicie o host DSH para aplicar as alterações.",
			"about.statusFailed": "Não foi possível ler o status das dependências.",
			"about.title": "Codex UI",
			"about.totalDownloads": "Total de downloads no npm",
			"about.upToDate": "Todos os plugins complementares estão instalados e atualizados.",
			"about.update": "Atualizar",
			"about.updateAll": "Instalar/atualizar tudo",
			"about.updateAvailable": "Atualização disponível",
			"about.updatingAll": "Instalando/atualizando",
			"about.viewProject": "GitHub",
			"composer.desc": "Configure a previsão em linha e o escopo do histórico (↑/↓); outros recursos como o ajuste de largura continuam ativos.",
			"composer.prediction": "Previsão de entrada em linha",
			"composer.predictionHint": "Desativado, apenas continuação ao pausar, ou ambos; pressione Tab para aceitar.",
			"composer.predictionLocked": "Desativado pela configuração do perfil (cordis.patch.yml → codex-ui-composer prediction); não pode ser ativado aqui.",
			"composer.modeOff": "Desativado",
			"composer.modeContinue": "Apenas continuação",
			"composer.modeAll": "Previsão e continuação",
			"composer.historyScope": "Escopo do histórico",
			"composer.historyScopeHint": "Recupere mensagens apenas desta conversa ou compartilhe com todas as conversas do espaço de trabalho.",
			"composer.historyScopeSession": "Esta conversa",
			"composer.historyScopeWorkspace": "Espaço de trabalho",
			"composer.title": "Aprimoramentos de entrada",
			"desktopMenu.help": "Ajuda",
			"desktopMenu.help.reloadPage": "Recarregar página",
			"desktopMenu.help.restartAppHost": "Reiniciar aplicativo e host",
			"desktopMenu.help.restartConfirm": "O DeepSeek Harness será fechado e reaberto; as tarefas em andamento serão interrompidas. Continuar?",
			"desktopMenu.restart.busy": "Já existe uma reinicialização em andamento. Aguarde.",
			"desktopMenu.restart.cancelled": "O aplicativo não foi encerrado; o reinício foi cancelado.",
			"desktopMenu.restart.close": "Fechar",
			"desktopMenu.restart.failed": "Falha ao reiniciar",
			"desktopMenu.restart.launchFailed": "O aplicativo encerrou, mas não pôde ser reaberto automaticamente. Inicie manualmente.",
			"desktopMenu.restart.quitting": "Fechando e reabrindo o DeepSeek Harness…",
			"desktopMenu.restart.relaunched": "Reiniciado.",
			"desktopMenu.restart.timeout": "O reinício não foi concluído a tempo; por favor verifique o aplicativo.",
			"desktopMenu.restart.unreachable": "Não é possível conectar ao host; o canal de reinicialização está indisponível.",
			"desktopMenu.restart.unsupportedDesktopOnly": "Esta não é a versão desktop, portanto não pode ser reiniciada.",
			"desktopMenu.restart.unsupportedMissingApp": "Não foi possível localizar o executável do DeepSeek Harness, impossível reiniciar.",
			"errors.forbidden": "Solicitação rejeitada pela verificação de segurança. Tente novamente a partir de um endereço confiável.",
			"errors.generic": "A operação não foi concluída. Tente novamente.",
			"errors.serviceUnavailable": "Serviço temporariamente indisponível. Tente novamente mais tarde.",
			"errors.unauthorized": "Faça login no DSH e tente novamente.",
			"home.build": "Construir novos recursos, aplicativos ou ferramentas",
			"home.build.prompt1": "Quero implementar um novo recurso neste projeto. Primeiro confirme comigo os requisitos e critérios de aceitação.",
			"home.build.prompt2": "Quero criar uma pequena ferramenta. Primeiro me pergunte sobre o objetivo, entradas e saídas, e depois proponha uma abordagem.",
			"home.build.task1": "Implementar um novo recurso",
			"home.build.task2": "Criar uma pequena ferramenta",
			"home.busy": "A entrada está sendo processada no momento. Tente novamente em breve.",
			"home.draft": "Seu rascunho atual e anexos foram preservados. Limpe a entrada para usar uma sugestão.",
			"home.explore": "Explorar e entender o código",
			"home.explore.prompt1": "Explore o código deste espaço de trabalho e explique a estrutura do projeto, os principais pontos de entrada e as relações entre módulos.",
			"home.explore.prompt2": "Quero entender a implementação de um recurso. Primeiro me pergunte qual é o recurso e depois explique o fluxo de chamadas.",
			"home.explore.task1": "Entender a estrutura do projeto",
			"home.explore.task2": "Compreender um recurso",
			"home.fix": "Corregir problemas e falhas",
			"home.fix.prompt1": "Encontrei um problema. Primeiro me pergunte sobre as etapas de reprodução, o comportamento esperado e o real, depois identifique a causa raiz e corrija.",
			"home.fix.prompt2": "Execute os testes aplicáveis ao projeto, identifique a causa raiz da falha e faça correções mínimas com cobertura de regressão significativa.",
			"home.fix.task1": "Investigar um problema",
			"home.fix.task2": "Corrigir testes com falha",
			"home.resizeInput": "Arraste para ajustar a largura da área de entrada",
			"home.review": "Revisar o código e sugerir alterações",
			"home.review.prompt1": "Revise as alterações não confirmadas neste espaço de trabalho, apontando defeitos reais, riscos de regressão e testes ausentes. Não modifique arquivos ainda.",
			"home.review.prompt2": "Inspecione a qualidade do código neste projeto e sugira melhorias fundamentadas no código-fonte. Apenas avalie, não edite.",
			"home.review.task1": "Revisar alterações atuais",
			"home.review.task2": "Inspecionar a qualidade do código",
			"home.suggestions": "Iniciar uma tarefa",
			"home.workspace": "Escolha um espaço de trabalho primeiro e depois selecione uma tarefa.",
			"input.historyHint": "↑↓ Histórico",
			"input.prediction.dismiss": "Esc descartar",
			"input.prediction.more": "Alt+↓ alternar",
			"input.prediction.tab": "Tab aceitar",
			"sections.default": "Projetos",
			"sections.menu": "Seção",
			"sections.new": "Nova seção",
			"sections.newName": "Nome da seção",
			"sections.pin": "Fixar",
			"sections.pinned": "Fixados",
			"sections.remove": "Remover seção",
			"sections.addWorkspace": "Adicionar espaço de trabalho",
			"sections.rename": "Renomear",
			"sections.settings": "Configurações de seção",
			"sections.unpin": "Desafixar",
			"sections.writeAborted": "A movimentação do espaço de trabalho não foi concluída e foi abortada automaticamente.",
			"sections.writePending": "A movimentação do espaço de trabalho ainda aguarda resposta do host.",
			"session.markRead": "Marcar como lido",
			"session.markUnread": "Marcar como não lido",
			"sessionTitle.system": "Gere um título para uma conversa com assistente de programação.\nRetorne exatamente uma linha com duas partes: Tipo｜Tema\nO tipo deve ser um dos seguintes: {types}\nO tema deve ser um assunto concreto e não deve repetir o tipo. Não inclua datas, emojis, aspas, prefixos, explicações ou Markdown.\nEscreva o tema no idioma da mensagem do usuário.",
			"sessionTitle.type.design": "Design",
			"sessionTitle.type.docs": "Documentação",
			"sessionTitle.type.explore": "Exploração",
			"sessionTitle.type.feature": "Recurso",
			"sessionTitle.type.fix": "Correção",
			"sessionTitle.type.optimize": "Otimização",
			"sessionTitle.type.release": "Lançamento",
			"sessionTitle.type.research": "Pesquisa",
			"sessionTitle.userFrame": "Gere um título de conversa a partir desta mensagem do usuário. Retorne apenas uma linha Tipo｜Tema. Não adicione uma terceira parte nem repita o tema.",
			"settings.back": "Voltar ao app",
			"settings.integrations": "Integrações",
			"settings.noResults": "Nenhuma categoria de configuração correspondente",
			"settings.personal": "Pessoal",
			"settings.records": "Registros e aplicativos",
			"settings.search": "Pesquisar configurações…",
			"settings.title": "Configurações",
			"sidebar.browsePlugins": "Explorar outros plugins",
			"sidebar.createPlugin": "Criar seu plugin",
			"sidebar.createPrompt": "Crie um plugin DSH com entrada na barra lateral esquerda.",
			"sidebar.dragToMore": "Arraste aqui para recolher em mais",
			"sidebar.fixed": "Sempre fixado",
			"sidebar.more": "Mais",
			"sidebar.newSession": "Novo chat",
			"theme.desc": "Personalize o estilo visual do DeepSeek Harness com temas clássicos do Codex e efeito mica fosco.",
			"theme.glassEnable": "Textura de vidro e aparência mica",
			"theme.glassGlow": "Brilho de fundo",
			"theme.glassGlowHint": "Sobrepõe suaves reflexos de luz no fundo gradiente, gerando uma suave auréola difusa",
			"theme.glassHint": "Ativa o vidro fosco e a translucidez suave de fundo. Ao desativar, a interface retorna a cores sólidas sem desfoque",
			"theme.glassPreset": "Predefinição de material",
			"theme.glassPresetHint": "Alterne livremente entre níveis de transparência e desfoque em ambos os modos",
			"theme.mode": "Modo de layout",
			"theme.modeCompat": "Layout original (Vidro plano)",
			"theme.modeHint": "O efeito mica transforma a interface em cartões foscos flutuantes; o modo original preserva a disposição com acabamento em vidro",
			"theme.modeMica": "Efeito Mica (Cartões flutuantes)",
			"theme.palette": "Paleta de temas",
			"theme.paletteClaudeDark": "Claude Escuro",
			"theme.paletteClaudeLight": "Claude Claro",
			"theme.paletteCodexDark": "Codex Escuro",
			"theme.paletteCodexLight": "Codex Claro",
			"theme.paletteCyberpunk": "Cyberpunk",
			"theme.paletteDracula": "Dracula",
			"theme.paletteFrappe": "Frappé",
			"theme.paletteGruvboxDark": "Gruvbox Escuro",
			"theme.paletteGruvboxLight": "Gruvbox Claro",
			"theme.paletteHint": "Escolha o tema oficial padrão ou os estilos clássicos do Codex",
			"theme.codeHighlight": "Pré-visualização do realce de código",
			"theme.paletteLatte": "Latte",
			"theme.paletteMacchiato": "Macchiato",
			"theme.paletteMocha": "Mocha",
			"theme.paletteSolarizedDark": "Solarized Escuro",
			"theme.paletteSolarizedLight": "Solarized Claro",
			"theme.paletteStock": "Oficial padrão",
			"theme.presetClear": "Transparente (Alta translucidez)",
			"theme.presetFrosted": "Fosco (Desfoque intenso)",
			"theme.presetStandard": "Padrão (Equilibrado)",
			"theme.subClaudeDark": "Tom escuro quente e terracota",
			"theme.subClaudeLight": "Papel quente e terracota",
			"theme.subCodexDark": "Carvão imersivo Visual hacker",
			"theme.subCodexLight": "Branco papelLeitura pura",
			"theme.subCyberpunk": "Verde neon no preto · terminal matrix",
			"theme.subDracula": "Rosa vampiro e brilho ciber",
			"theme.subFrappe": "Frappé escuro Névoa translúcida",
			"theme.subGruvboxDark": "Escuro retrô e ouro quente",
			"theme.subGruvboxLight": "Papel kraft retrô e âmbar",
			"theme.subLatte": "Latte quente Acolhedor e suave",
			"theme.subMacchiato": "Macchiato escuro Suave e elegante",
			"theme.subMocha": "Mocha escuro Confortável para os olhos",
			"theme.subSolarizedDark": "Azul petróleo e ciano",
			"theme.subSolarizedLight": "Pergaminho quente e azul",
			"theme.subStock": "Seguir o sistema Interface nativa",
			"theme.title": "Aparência e temas"
		};
		//#endregion
		//#region src/client/locales.ts
		/** 本插件独占的界面文案命名空间。 */
		const NS = "michengai.codexUi";
		const zh = {
			"home.resizeInput": "拖动调整输入区宽度",
			"home.suggestions": "开始一项任务",
			"home.workspace": "请先选择工作区，再选择任务。",
			"home.draft": "已保留当前草稿和附件；清空输入后可填入任务建议。",
			"home.busy": "当前输入正在处理中，请稍后再试。",
			"home.explore": "探索并理解代码",
			"home.build": "构建新功能、应用或工具",
			"home.review": "审查代码并提出修改建议",
			"home.fix": "修复问题和失败",
			"home.explore.task1": "了解项目结构",
			"home.explore.prompt1": "请探索当前工作区的代码，解释项目结构、主要入口和模块之间的关系。",
			"home.explore.task2": "理解一项功能",
			"home.explore.prompt2": "我想了解一项功能的实现。先问我具体是哪项功能，再沿调用关系解释。",
			"home.build.task1": "实现一项新功能",
			"home.build.prompt1": "我想在当前项目中实现一项新功能。先和我确认需求与验收标准，再实施。",
			"home.build.task2": "构建一个小工具",
			"home.build.prompt2": "我想构建一个小工具。先问我目标、输入和输出，再结合当前项目提出方案。",
			"home.review.task1": "评审当前改动",
			"home.review.prompt1": "请评审当前工作区的未提交改动，优先指出真实缺陷、回归风险和缺少的测试；先不要修改。",
			"home.review.task2": "检查代码质量",
			"home.review.prompt2": "请检查当前项目的代码质量，给出有源码依据的改进建议，先评估不改动。",
			"home.fix.task1": "排查一个问题",
			"home.fix.prompt1": "我遇到了一个问题。先问我复现步骤、预期和实际表现，再定位根因并修复。",
			"home.fix.task2": "修复失败的测试",
			"home.fix.prompt2": "请运行当前项目适用的测试，定位失败根因并做最小修复，保留有效的回归覆盖。",
			"settings.title": "设置",
			"settings.back": "返回应用",
			"settings.search": "搜索设置…",
			"settings.personal": "个人",
			"settings.integrations": "集成",
			"settings.records": "记录与应用",
			"settings.noResults": "没有匹配的设置分类",
			"input.historyHint": "↑↓ 翻历史",
			"input.prediction.tab": "Tab 采纳",
			"input.prediction.more": "Alt+↓ 切换",
			"input.prediction.dismiss": "Esc 忽略",
			"about.nav": "Codex UI",
			"sections.pinned": "置顶",
			"sections.default": "项目",
			"sections.menu": "分区",
			"sections.pin": "置顶",
			"sections.unpin": "取消置顶",
			"sections.rename": "重命名",
			"sections.remove": "移除分区",
			"sections.addWorkspace": "添加工作区",
			"sections.writePending": "工作区移动尚未完成，后续操作正在等待宿主响应。",
			"sections.writeAborted": "工作区移动未完成，已自动撤销。",
			"sections.new": "新建分区",
			"sections.newName": "新分区名称",
			"sections.settings": "分区设置",
			"session.markUnread": "标记为未读",
			"session.markRead": "标记为已读",
			"about.title": "Codex UI",
			"about.viewProject": "GitHub",
			"about.feedback": "问题反馈",
			"about.description": "输入框增强、全屏设置工作台美化、桌面窗口菜单与生态插件管理。",
			"about.features": "包含子插件与功能",
			"about.feature.composer.name": "输入框增强 (Composer)",
			"about.feature.composer": "终端风格输入历史（↑/↓）快捷召回、自适应宽度调节与会话建议卡片",
			"about.feature.settingsSkin.name": "原生设置皮肤 (Settings Skin)",
			"about.feature.settingsSkin": "全屏设置工作台美化、分类导航与原生输入框搜索",
			"about.feature.sessionTitle.name": "会话智能标题 (Session Title)",
			"about.feature.sessionTitle": "基于首条消息语义智能提取并生成规范的会话标题",
			"about.feature.sidebar.name": "侧边栏导航 (Sidebar)",
			"about.feature.sidebar": "模块化侧边栏导航、折叠抽屉收纳与自由拖拽排序",
			"about.feature.theme.name": "主题与界面换肤 (Theme)",
			"about.feature.theme": "内置 Codex 经典黑白与 Catppuccin 色盘，支持悬浮云母磨砂质感",
			"about.feature.dependencies.name": "配套生态管理 (Dependencies)",
			"about.feature.dependencies": "深度集成 DSH 官方与第三方生态插件集中管理与一键批量更新",
			"about.feature.desktopMenu.name": "桌面窗口菜单 (Desktop Menus)",
			"about.feature.desktopMenu": "在系统原生菜单栏追加帮助入口，并提供页面刷新与重启",
			"desktopMenu.help": "帮助",
			"desktopMenu.help.reloadPage": "刷新页面",
			"desktopMenu.help.restartAppHost": "重启应用与 Host",
			"desktopMenu.help.restartConfirm": "将退出并重新打开 DeepSeek Harness，正在运行的任务会被中断。继续？",
			"desktopMenu.restart.quitting": "正在退出并重新打开 DeepSeek Harness…",
			"desktopMenu.restart.relaunched": "已重新启动。",
			"desktopMenu.restart.cancelled": "应用没有退出，本次重启已取消。",
			"desktopMenu.restart.launchFailed": "应用已退出，但没能自动重新打开，请手动启动。",
			"desktopMenu.restart.timeout": "没有在预期时间内完成重启，请确认应用是否还在。",
			"desktopMenu.restart.busy": "已有重启正在进行中，请稍候。",
			"desktopMenu.restart.failed": "重启失败",
			"desktopMenu.restart.unreachable": "连不上宿主，重启通道不可用。",
			"desktopMenu.restart.unsupportedDesktopOnly": "当前不是桌面版，无法重启应用。",
			"desktopMenu.restart.unsupportedMissingApp": "找不到 DeepSeek Harness 的可执行文件，无法重启。",
			"desktopMenu.restart.close": "关闭",
			"about.dependencies": "配套管理插件",
			"about.dependenciesDescription": "每个配套插件均支持独立按需安装与一键批量同步升级。",
			"about.loading": "正在读取依赖安装状态…",
			"about.statusFailed": "暂时无法读取依赖安装状态。",
			"about.refreshFailed": "依赖状态刷新失败，当前显示上次成功读取的结果。",
			"about.installed": "已安装",
			"about.missing": "未安装",
			"about.updateAvailable": "可更新",
			"about.install": "安装",
			"about.update": "更新",
			"about.installing": "安装中",
			"about.updateAll": "全部安装/更新",
			"about.updatingAll": "安装/更新中",
			"about.upToDate": "所有配套插件均已安装并为最新版本。",
			"about.installFailed": "依赖安装失败，请稍后重试。",
			"about.installUnchanged": "安装命令已结束，但插件没有进入当前 Profile。请重试。",
			"about.installExitDesktop": "请先完全退出 DSH Desktop，再重新打开后更新。",
			"about.installStoreMismatch": "插件目录与 pnpm 仓库不一致。请完全退出 DSH Desktop 后再更新。",
			"about.installExitWeb": "无法覆盖正在运行的插件文件。请停止当前 DSH Web 后，在终端更新插件，再重新启动 DSH Web。",
			"about.installStoreMismatchWeb": "插件目录与 pnpm 仓库不一致。请停止当前 DSH Web 后重试；仍失败时重新安装该 Profile 的依赖。",
			"about.installWebFailed": "插件更新失败。请查看 DSH Web 终端输出后重试。",
			"about.installBuildPolicy": "插件依赖的 pnpm 构建脚本策略尚未确认，请更新 Profile 配置后重试。",
			"about.installPnpmMissing": "当前环境找不到 pnpm，请安装 pnpm 并重启 DSH 后重试。",
			"about.installTimeout": "插件安装超时，请检查网络后重试。",
			"about.installServiceUnavailable": "DSH Desktop 依赖管理服务尚未就绪，请重启后重试。",
			"about.installBusy": "已有安装任务正在进行，请等待完成后再试。",
			"about.installSuiteUnsupported": "旧套件成员暂不支持自动迁移，请通过宿主插件管理器处理。",
			"about.applied": "依赖已安装或更新并生效。",
			"about.restartRequired": "依赖已安装或更新。请重启 DSH 宿主以应用更改。",
			"about.progressHint": "正在安装插件…",
			"about.packagesDone": "已完成 {0} 个包",
			"about.progress.resolving": "解析依赖",
			"about.progress.downloading": "下载中",
			"about.progress.linking": "写入文件",
			"about.progress.building": "构建中",
			"about.dependency.dsh": "DeepSeek Harness",
			"about.dependency.suite": "Codex 套件",
			"about.dependency.ui": "Codex UI",
			"about.dependency.experts": "专家管理",
			"about.dependency.skills": "技能管理",
			"about.dependency.archive": "归档会话",
			"about.dependency.im": "IM助理",
			"about.dependency.schedule": "定时任务",
			"about.dependency.pet": "Codex 宠物",
			"about.dependency.btw": "BTW 旁问",
			"about.dependency.simplify": "Simplify",
			"about.dependency.pua": "PUA",
			"about.dependency.review": "代码审查",
			"about.dependency.market": "应用市场",
			"about.totalDownloads": "npm 累计下载",
			"about.downloadsUnavailable": "暂不可用",
			"about.downloadsSource": "npm 官方统计：自包创建日至昨日的累计下载次数，点击查看 npm 包",
			"errors.unauthorized": "请先登录 DSH，再重试。",
			"errors.forbidden": "请求被安全检查拒绝，请从可信的 DSH 地址重试。",
			"errors.serviceUnavailable": "服务暂不可用，请稍后重试。",
			"errors.generic": "操作未完成，请重试。",
			"sessionTitle.system": "为编程助手会话生成标题。\n只输出一行，恰好两段：类型｜主题\n类型必须是其中一个：{types}\n主题必须是具体事项，不能重复类型，不要写类型名或空主题。不要写日期或表情，不要引号、前缀、解释或 Markdown。\n主题使用用户消息的语言。",
			"sessionTitle.userFrame": "根据这条用户消息生成会话标题。只返回“类型｜主题”一行，不要第三段，不要重复主题。",
			"sessionTitle.type.feature": "功能",
			"sessionTitle.type.design": "设计",
			"sessionTitle.type.fix": "修复",
			"sessionTitle.type.optimize": "优化",
			"sessionTitle.type.release": "发布",
			"sessionTitle.type.explore": "探索",
			"sessionTitle.type.docs": "文档",
			"sessionTitle.type.research": "研究",
			"sidebar.more": "更多",
			"sidebar.newSession": "新会话",
			"sidebar.dragToMore": "拖至此处收入更多",
			"sidebar.fixed": "始终常驻",
			"sidebar.browsePlugins": "浏览更多插件",
			"sidebar.createPlugin": "创建你的插件",
			"sidebar.createPrompt": "创建一个带左侧栏入口的 DSH 插件。",
			"composer.title": "输入框增强",
			"composer.desc": "智能输入预测与 ↑/↓ 历史召回范围设置；输入框宽度手柄等能力保持常驻。",
			"composer.prediction": "智能输入预测",
			"composer.predictionHint": "关闭、仅打字停顿续写、或同时启用空框推测与续写；按 Tab 采纳。",
			"composer.predictionLocked": "已在当前 Profile 的插件配置中关闭（cordis.patch.yml → codex-ui-composer 的 prediction），此处不可开启。",
			"composer.modeOff": "关闭",
			"composer.modeContinue": "仅续写",
			"composer.modeAll": "推测+续写",
			"composer.historyScope": "历史召回范围",
			"composer.historyScopeHint": "仅在当前会话内召回，或与同一工作区的所有会话共享。",
			"composer.historyScopeSession": "当前会话",
			"composer.historyScopeWorkspace": "当前工作区",
			"theme.title": "界面外观与换肤",
			"theme.desc": "定制 DeepSeek Harness 视觉风格，支持 Codex 经典配色与悬浮云母质感。",
			"theme.palette": "主题配色",
			"theme.paletteHint": "选择内置官方或 Codex 风格配色方案",
			"theme.codeHighlight": "代码高亮预览",
			"theme.paletteStock": "官方默认",
			"theme.paletteCodexDark": "Codex 暗色",
			"theme.paletteCodexLight": "Codex 亮色",
			"theme.paletteClaudeDark": "Claude 暗色",
			"theme.paletteClaudeLight": "Claude 暖白",
			"theme.paletteDracula": "Dracula (德古拉)",
			"theme.paletteSolarizedDark": "Solarized 暗色",
			"theme.paletteSolarizedLight": "Solarized 亮色",
			"theme.paletteGruvboxDark": "Gruvbox 暗色",
			"theme.paletteGruvboxLight": "Gruvbox 亮色",
			"theme.paletteMocha": "Mocha (摩卡)",
			"theme.paletteMacchiato": "Macchiato (玛奇朵)",
			"theme.paletteFrappe": "Frappé (冰吸)",
			"theme.paletteLatte": "Latte (拿铁)",
			"theme.paletteCyberpunk": "Cyberpunk (赛博朋克)",
			"theme.subStock": "跟随系统 原生界面",
			"theme.subCodexDark": "沉浸炭黑 极客质感",
			"theme.subCodexLight": "极简纸白 纯净阅读",
			"theme.subClaudeDark": "暖炭夜色 陶橙点缀",
			"theme.subClaudeLight": "暖米纸感 陶橙点缀",
			"theme.subDracula": "吸血鬼粉 潮酷荧光",
			"theme.subSolarizedDark": "深海墨绿 碧玉青蓝",
			"theme.subSolarizedLight": "古籍羊皮 日光清蓝",
			"theme.subGruvboxDark": "泥炭深棕 暖金复古",
			"theme.subGruvboxLight": "牛皮纸黄 复古工装",
			"theme.subMocha": "摩卡暗色 舒适护眼",
			"theme.subMacchiato": "玛奇朵暗色 典雅柔和",
			"theme.subFrappe": "冰吸暗色 雾感通透",
			"theme.subLatte": "拿铁暖白 温润明快",
			"theme.subCyberpunk": "黑底霓虹绿 矩阵终端",
			"theme.mode": "排版模式",
			"theme.modeHint": "云母效果重塑为悬浮磨砂卡片；原版排版保持官方布局换用玻璃材质",
			"theme.modeMica": "云母效果 (悬浮卡片)",
			"theme.modeCompat": "原版排版 (平铺玻璃)",
			"theme.glassPreset": "材质预设",
			"theme.glassPresetHint": "在云母与原版排版模式下均可自由切换通透与磨砂程度",
			"theme.presetClear": "清透 (高透光)",
			"theme.presetStandard": "标准 (适中)",
			"theme.presetFrosted": "磨砂 (强虚化)",
			"theme.glassEnable": "玻璃质感与云母外观",
			"theme.glassHint": "启用毛玻璃与背景微透质感。关闭后主界面回退至纯色，不进行背景虚化与浮动卡片修饰",
			"theme.glassGlow": "地面光斑",
			"theme.glassGlowHint": "在渐变地面上叠加两枚柔光反射斑。开启后主页与背景会有漫反射光晕"
		};
		const en = {
			"home.resizeInput": "Drag to resize the input area",
			"home.suggestions": "Start a task",
			"home.workspace": "Choose a workspace first, then select a task.",
			"home.draft": "Your draft and attachments are preserved. Clear the input to use a suggestion.",
			"home.busy": "The input is busy. Please try again shortly.",
			"home.explore": "Explore and understand code",
			"home.build": "Build features, apps, or tools",
			"home.review": "Review code and suggest changes",
			"home.fix": "Fix bugs and failures",
			"home.explore.task1": "Explain the project structure",
			"home.explore.prompt1": "Explore this workspace and explain its structure, main entry points, and module relationships.",
			"home.explore.task2": "Understand a feature",
			"home.explore.prompt2": "Help me understand a feature. First ask which feature, then explain its implementation and call flow.",
			"home.build.task1": "Implement a feature",
			"home.build.prompt1": "Help me implement a feature in this project. First clarify requirements and acceptance criteria.",
			"home.build.task2": "Build a small tool",
			"home.build.prompt2": "Help me build a small tool. First ask about its goal, inputs, and outputs, then propose an approach.",
			"home.review.task1": "Review current changes",
			"home.review.prompt1": "Review uncommitted changes for bugs, regressions, and missing tests. Do not modify files yet.",
			"home.review.task2": "Inspect code quality",
			"home.review.prompt2": "Inspect code quality in this project and suggest improvements grounded in the source. Assess only; do not edit.",
			"home.fix.task1": "Investigate a bug",
			"home.fix.prompt1": "Help me fix a bug. First ask for reproduction steps, expected behavior, and actual behavior.",
			"home.fix.task2": "Fix failing tests",
			"home.fix.prompt2": "Run the applicable project tests, identify failure causes, and make minimal fixes with meaningful regression coverage.",
			"settings.title": "Settings",
			"settings.back": "Back to app",
			"settings.search": "Search settings…",
			"settings.personal": "Personal",
			"settings.integrations": "Integrations",
			"settings.records": "Records and app",
			"settings.noResults": "No matching settings categories",
			"input.historyHint": "↑↓ History",
			"input.prediction.tab": "Tab accept",
			"input.prediction.more": "Alt+↓ cycle",
			"input.prediction.dismiss": "Esc dismiss",
			"about.nav": "Codex UI",
			"sections.pinned": "Pinned",
			"sections.default": "Projects",
			"sections.menu": "Section",
			"sections.pin": "Pin",
			"sections.unpin": "Unpin",
			"sections.rename": "Rename",
			"sections.remove": "Remove section",
			"sections.addWorkspace": "Add workspace",
			"sections.writePending": "Workspace move is still pending host response.",
			"sections.writeAborted": "Workspace move was not completed and was aborted.",
			"sections.new": "New section",
			"sections.newName": "Section name",
			"sections.settings": "Section settings",
			"session.markUnread": "Mark as unread",
			"session.markRead": "Mark as read",
			"about.title": "Codex UI",
			"about.viewProject": "GitHub",
			"about.feedback": "Issues",
			"about.description": "Input enhancement, fullscreen settings workbench skin, desktop titlebar menu, and ecosystem plugin management.",
			"about.features": "Built-in Sub-plugins & Capabilities",
			"about.feature.composer.name": "Composer Enhancements",
			"about.feature.composer": "Terminal-style input history (↑/↓), adaptive width resizing, and starter suggestions",
			"about.feature.settingsSkin.name": "Settings Skin",
			"about.feature.settingsSkin": "Fullscreen settings workbench skin, categorized navigation, and search",
			"about.feature.sessionTitle.name": "Session Title Generator",
			"about.feature.sessionTitle": "Smart semantic session title generation based on the first conversation prompt",
			"about.feature.sidebar.name": "Sidebar Navigation",
			"about.feature.sidebar": "Modular sidebar navigation, collapsible drawers, and drag reordering",
			"about.feature.theme.name": "Theme & Appearance",
			"about.feature.theme": "Built-in Codex dark/light & Catppuccin palettes with floating mica glassmorphism",
			"about.feature.dependencies.name": "Companion Dependencies",
			"about.feature.dependencies": "Integrated management, live healthcheck, and one-click updates for DSH plugins",
			"about.feature.desktopMenu.name": "Desktop Window Menus",
			"about.feature.desktopMenu": "Adds a Help entry to the native menubar with page reload and restart",
			"desktopMenu.help": "Help",
			"desktopMenu.help.reloadPage": "Reload Page",
			"desktopMenu.help.restartAppHost": "Restart App and Host",
			"desktopMenu.help.restartConfirm": "DeepSeek Harness will close and reopen; running tasks will be interrupted. Continue?",
			"desktopMenu.restart.quitting": "Closing and reopening DeepSeek Harness…",
			"desktopMenu.restart.relaunched": "Restarted.",
			"desktopMenu.restart.cancelled": "The app did not exit; this restart was cancelled.",
			"desktopMenu.restart.launchFailed": "The app exited but could not be reopened automatically.",
			"desktopMenu.restart.timeout": "The restart did not finish in time; please check the app.",
			"desktopMenu.restart.busy": "A restart is already in progress. Please wait.",
			"desktopMenu.restart.failed": "Restart failed",
			"desktopMenu.restart.unreachable": "Cannot reach the Host; the restart channel is unavailable.",
			"desktopMenu.restart.unsupportedDesktopOnly": "This is not the desktop app, so it cannot be restarted.",
			"desktopMenu.restart.unsupportedMissingApp": "Cannot locate the DeepSeek Harness executable, so it cannot be restarted.",
			"desktopMenu.restart.close": "Close",
			"about.dependencies": "Companion management plugins",
			"about.dependenciesDescription": "Install or update each companion plugin individually, or synchronize all versions in one click.",
			"about.loading": "Loading dependency status…",
			"about.statusFailed": "Dependency status is temporarily unavailable.",
			"about.refreshFailed": "Dependency status refresh failed. Showing the last successful result.",
			"about.installed": "Installed",
			"about.missing": "Not installed",
			"about.updateAvailable": "Update available",
			"about.install": "Install",
			"about.update": "Update",
			"about.installing": "Installing",
			"about.updateAll": "Install/update all",
			"about.updatingAll": "Installing/updating",
			"about.upToDate": "All companion plugins are installed and up to date.",
			"about.installFailed": "Dependency installation failed. Try again later.",
			"about.installUnchanged": "The install command finished, but the plugin did not enter this profile. Try again.",
			"about.installExitDesktop": "Quit DSH Desktop completely, reopen it, and try the update again.",
			"about.installStoreMismatch": "The plugin directory and pnpm store do not match. Quit DSH Desktop completely and try again.",
			"about.installExitWeb": "Running plugin files cannot be replaced. Stop the current DSH Web host, update the plugin from a terminal, then restart DSH Web.",
			"about.installStoreMismatchWeb": "The plugin directory and pnpm store do not match. Stop the current DSH Web host and try again; if it persists, reinstall this Profile's dependencies.",
			"about.installWebFailed": "Plugin update failed. Check the DSH Web terminal output and try again.",
			"about.installBuildPolicy": "The pnpm build-script policy for this plugin is not configured. Update the Profile configuration and try again.",
			"about.installPnpmMissing": "pnpm is not available. Install pnpm, restart DSH, and try again.",
			"about.installTimeout": "Plugin installation timed out. Check the network and try again.",
			"about.installServiceUnavailable": "The DSH Desktop dependency service is not ready. Restart DSH Desktop and try again.",
			"about.installBusy": "Another installation is already in progress. Please wait for it to complete.",
			"about.installSuiteUnsupported": "Legacy suite members cannot be automatically migrated. Please manage them via the host plugin manager.",
			"about.applied": "Dependencies installed or updated and applied.",
			"about.restartRequired": "Dependencies installed or updated. Restart the DSH host to apply changes.",
			"about.progressHint": "Installing plugin…",
			"about.packagesDone": "{0} packages done",
			"about.progress.resolving": "Resolving",
			"about.progress.downloading": "Downloading",
			"about.progress.linking": "Writing files",
			"about.progress.building": "Building",
			"about.dependency.dsh": "DeepSeek Harness",
			"about.dependency.suite": "Codex suite",
			"about.dependency.ui": "Codex UI",
			"about.dependency.experts": "Expert management",
			"about.dependency.skills": "Skill management",
			"about.dependency.archive": "Archived conversations",
			"about.dependency.im": "IM Assistant",
			"about.dependency.schedule": "Scheduled tasks",
			"about.dependency.pet": "Codex Pet",
			"about.dependency.btw": "BTW",
			"about.dependency.simplify": "Simplify",
			"about.dependency.pua": "PUA",
			"about.dependency.review": "Code Review",
			"about.dependency.market": "App Market",
			"about.totalDownloads": "npm total downloads",
			"about.downloadsUnavailable": "Unavailable",
			"about.downloadsSource": "Cumulative npm downloads from package creation through yesterday. View package on npm.",
			"errors.unauthorized": "Sign in to DSH, then try again.",
			"errors.forbidden": "The security check rejected this request. Try again from a trusted DSH address.",
			"errors.serviceUnavailable": "The service is unavailable. Try again later.",
			"errors.generic": "The action could not be completed. Try again.",
			"sessionTitle.system": "Generate a title for a coding-assistant conversation.\nOutput exactly one line with two parts: Type｜Theme\nType must be one of: {types}\nThe theme must be a concrete subject and must not repeat the type. Do not write dates, emoji, quotes, prefixes, explanations, or Markdown.\nWrite the theme in the language of the user message.",
			"sessionTitle.userFrame": "Generate a conversation title from this user message. Return only one Type｜Theme line. Do not add a third part or repeat the theme.",
			"sessionTitle.type.feature": "Feature",
			"sessionTitle.type.design": "Design",
			"sessionTitle.type.fix": "Fix",
			"sessionTitle.type.optimize": "Optimize",
			"sessionTitle.type.release": "Release",
			"sessionTitle.type.explore": "Explore",
			"sessionTitle.type.docs": "Docs",
			"sessionTitle.type.research": "Research",
			"sidebar.more": "More",
			"sidebar.newSession": "New chat",
			"sidebar.dragToMore": "Drag here to collapse",
			"sidebar.fixed": "Always pinned",
			"sidebar.browsePlugins": "Browse other plugins",
			"sidebar.createPlugin": "Create your plugin",
			"sidebar.createPrompt": "Create a DSH plugin with a left sidebar entry.",
			"composer.title": "Composer Enhancements",
			"composer.desc": "Configure inline prediction and ↑/↓ history scope; other composer features like width handles remain active.",
			"composer.prediction": "Inline prediction",
			"composer.predictionHint": "Off, typing pause continuation only, or both prediction and continuation; press Tab to accept.",
			"composer.predictionLocked": "Disabled by this Profile's plugin config (cordis.patch.yml → codex-ui-composer prediction); it cannot be enabled here.",
			"composer.modeOff": "Off",
			"composer.modeContinue": "Continuation only",
			"composer.modeAll": "Prediction & continuation",
			"composer.historyScope": "History scope",
			"composer.historyScopeHint": "Recall prompts from this conversation only, or share them across every conversation in the workspace.",
			"composer.historyScopeSession": "This conversation",
			"composer.historyScopeWorkspace": "Workspace",
			"theme.title": "Appearance & Themes",
			"theme.desc": "Customize DeepSeek Harness visual styling with Codex themes and frosted mica glass.",
			"theme.palette": "Theme Palette",
			"theme.paletteHint": "Choose official default or classic Codex color schemes",
			"theme.codeHighlight": "Code Highlight Preview",
			"theme.paletteStock": "Official Default",
			"theme.paletteCodexDark": "Codex Dark",
			"theme.paletteCodexLight": "Codex Light",
			"theme.paletteClaudeDark": "Claude Dark",
			"theme.paletteClaudeLight": "Claude Light",
			"theme.paletteDracula": "Dracula",
			"theme.paletteSolarizedDark": "Solarized Dark",
			"theme.paletteSolarizedLight": "Solarized Light",
			"theme.paletteGruvboxDark": "Gruvbox Dark",
			"theme.paletteGruvboxLight": "Gruvbox Light",
			"theme.paletteMocha": "Mocha",
			"theme.paletteMacchiato": "Macchiato",
			"theme.paletteFrappe": "Frappé",
			"theme.paletteLatte": "Latte",
			"theme.paletteCyberpunk": "Cyberpunk",
			"theme.subStock": "System default",
			"theme.subCodexDark": "Immersive carbon dark",
			"theme.subCodexLight": "Clean paper light",
			"theme.subClaudeDark": "Warm dark & terracotta",
			"theme.subClaudeLight": "Warm paper & terracotta",
			"theme.subDracula": "Vampire pink & cyber glow",
			"theme.subSolarizedDark": "Deep teal & cyan",
			"theme.subSolarizedLight": "Warm parchment & blue",
			"theme.subGruvboxDark": "Retro dark & warm gold",
			"theme.subGruvboxLight": "Vintage kraft & warm amber",
			"theme.subMocha": "Mocha dark & soothing",
			"theme.subMacchiato": "Macchiato soft tone",
			"theme.subFrappe": "Frappé cool mist",
			"theme.subLatte": "Latte warm light",
			"theme.subCyberpunk": "Neon green on black · matrix terminal",
			"theme.mode": "Layout Mode",
			"theme.modeHint": "Mica restyles the UI into floating frosted cards; Compatibility keeps the stock layout with glass material",
			"theme.modeMica": "Mica Cards",
			"theme.modeCompat": "Stock Compat",
			"theme.glassPreset": "Material Preset",
			"theme.glassPresetHint": "Toggle transparency and blur levels in both Mica and Stock layout modes",
			"theme.presetClear": "Clear",
			"theme.presetStandard": "Standard",
			"theme.presetFrosted": "Frosted",
			"theme.glassEnable": "Glassmorphism & Mica",
			"theme.glassHint": "Enable frosted glassmorphism and subtle background translucency. Turning it off restores solid colors on the main layout without blur or floating cards",
			"theme.glassGlow": "Ground glows",
			"theme.glassGlowHint": "Adds soft radial glows on top of the gradient ground. Turning it on brightens the top-left corner"
		};
		//#endregion
		//#region src/client/settings-skin/model.ts
		const SETTINGS_NAV_GROUPS = [
			{
				id: "personal",
				order: 100,
				labelKey: "settings.personal",
				defaultZh: "个人",
				defaultEn: "Personal"
			},
			{
				id: "integrations",
				order: 200,
				labelKey: "settings.integrations",
				defaultZh: "集成",
				defaultEn: "Integrations"
			},
			{
				id: "records",
				order: 300,
				labelKey: "settings.records",
				defaultZh: "记录与应用",
				defaultEn: "Records and app"
			}
		];
		/**
		* 菜单分组模型：
		* 仅置顶「个人」（账号与通用）与置底「记录与应用」（归档与关于），
		* 其余所有项不设规则枚举，统统自动归入「集成」，保持宿主与第三方生态的纯天然扩展性。
		*/
		function classifySettingsButton(text) {
			const normalized = text.trim().toLowerCase();
			if (/^(账号|账户|余额|account|balance|アカウント|残高|cuenta|saldo|compte|solde|konto|guthaben|аккаунт|баланс|conta)/i.test(normalized)) return "personal";
			if (/^(通用|常规|偏好|general|preferences|一般|環境設定|preferencias|général|préférences|allgemein|общие|настройки|geral|preferências)/i.test(normalized)) return "personal";
			if (/^(归档|已归档|历史|archive|archived|history|アーカイブ|履歴|archivo|archivado|historial|archives|archivé|historique|archiviert|verlauf|архив|история|arquivad)/i.test(normalized)) return "records";
			if (/^(关于|codex ui|about|について|acerca de|à propos|über|о программе|sobre)/i.test(normalized)) return "records";
			return "integrations";
		}
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const mergeClasses = (...classes) => classes.filter((className, index, array) => {
			return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
		}).join(" ").trim();
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toPascalCase = (string) => {
			const camelCase = toCamelCase(string);
			return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
		};
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/defaultAttributes.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		var defaultAttributes = {
			xmlns: "http://www.w3.org/2000/svg",
			width: 24,
			height: 24,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round"
		};
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const hasA11yProp = (props) => {
			for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
			return false;
		};
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/context.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const LucideContext = (0, react.createContext)({});
		const useLucideContext = () => (0, react.useContext)(LucideContext);
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/Icon.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Icon = (0, react.forwardRef)(({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
			const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, color: contextColor = "currentColor", className: contextClass = "" } = useLucideContext() ?? {};
			const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
			return (0, react.createElement)("svg", {
				ref,
				...defaultAttributes,
				width: size ?? contextSize ?? defaultAttributes.width,
				height: size ?? contextSize ?? defaultAttributes.height,
				stroke: color ?? contextColor,
				strokeWidth: calculatedStrokeWidth,
				className: mergeClasses("lucide", contextClass, className),
				...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
				...rest
			}, [...iconNode.map(([tag, attrs]) => (0, react.createElement)(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
		});
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/createLucideIcon.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const createLucideIcon = (iconName, iconNode) => {
			const Component = (0, react.forwardRef)(({ className, ...props }, ref) => (0, react.createElement)(Icon, {
				ref,
				iconNode,
				className: mergeClasses(`lucide-${toKebabCase(toPascalCase(iconName))}`, `lucide-${iconName}`, className),
				...props
			}));
			Component.displayName = toPascalCase(iconName);
			return Component;
		};
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ArrowLeft = createLucideIcon("arrow-left", [["path", {
			d: "m12 19-7-7 7-7",
			key: "1l729n"
		}], ["path", {
			d: "M19 12H5",
			key: "x3x0zl"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Blocks = createLucideIcon("blocks", [["path", {
			d: "M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2",
			key: "1ah6g2"
		}], ["rect", {
			x: "14",
			y: "2",
			width: "8",
			height: "8",
			rx: "1",
			key: "88lufb"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Bug = createLucideIcon("bug", [
			["path", {
				d: "M12 20v-9",
				key: "1qisl0"
			}],
			["path", {
				d: "M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z",
				key: "uouzyp"
			}],
			["path", {
				d: "M14.12 3.88 16 2",
				key: "qol33r"
			}],
			["path", {
				d: "M21 21a4 4 0 0 0-3.81-4",
				key: "1b0z45"
			}],
			["path", {
				d: "M21 5a4 4 0 0 1-3.55 3.97",
				key: "5cxbf6"
			}],
			["path", {
				d: "M22 13h-4",
				key: "1jl80f"
			}],
			["path", {
				d: "M3 21a4 4 0 0 1 3.81-4",
				key: "1fjd4g"
			}],
			["path", {
				d: "M3 5a4 4 0 0 0 3.55 3.97",
				key: "1d7oge"
			}],
			["path", {
				d: "M6 13H2",
				key: "82j7cp"
			}],
			["path", {
				d: "m8 2 1.88 1.88",
				key: "fmnt4t"
			}],
			["path", {
				d: "M9 7.13V6a3 3 0 1 1 6 0v1.13",
				key: "1vgav8"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ChevronDown = createLucideIcon("chevron-down", [["path", {
			d: "m6 9 6 6 6-6",
			key: "qrunsl"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Ellipsis = createLucideIcon("ellipsis", [
			["circle", {
				cx: "12",
				cy: "12",
				r: "1",
				key: "41hilf"
			}],
			["circle", {
				cx: "19",
				cy: "12",
				r: "1",
				key: "1wjl8i"
			}],
			["circle", {
				cx: "5",
				cy: "12",
				r: "1",
				key: "1pcz8c"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Hammer = createLucideIcon("hammer", [
			["path", {
				d: "m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9",
				key: "1hayfq"
			}],
			["path", {
				d: "m18 15 4-4",
				key: "16gjal"
			}],
			["path", {
				d: "m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",
				key: "15ts47"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const MessageSquarePlus = createLucideIcon("message-square-plus", [
			["path", {
				d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
				key: "18887p"
			}],
			["path", {
				d: "M12 8v6",
				key: "1ib9pf"
			}],
			["path", {
				d: "M9 11h6",
				key: "1fldmi"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Plus = createLucideIcon("plus", [["path", {
			d: "M5 12h14",
			key: "1ays0h"
		}], ["path", {
			d: "M12 5v14",
			key: "s699le"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ScanLine = createLucideIcon("scan-line", [
			["path", {
				d: "M3 7V5a2 2 0 0 1 2-2h2",
				key: "aa7l1z"
			}],
			["path", {
				d: "M17 3h2a2 2 0 0 1 2 2v2",
				key: "4qcy5o"
			}],
			["path", {
				d: "M21 17v2a2 2 0 0 1-2 2h-2",
				key: "6vwrx8"
			}],
			["path", {
				d: "M7 21H5a2 2 0 0 1-2-2v-2",
				key: "ioqczr"
			}],
			["path", {
				d: "M7 12h10",
				key: "b7w52i"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Search = createLucideIcon("search", [["path", {
			d: "m21 21-4.34-4.34",
			key: "14j7rj"
		}], ["circle", {
			cx: "11",
			cy: "11",
			r: "8",
			key: "4ej97u"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Telescope = createLucideIcon("telescope", [
			["path", {
				d: "m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44",
				key: "k4qptu"
			}],
			["path", {
				d: "m13.56 11.747 4.332-.924",
				key: "19l80z"
			}],
			["path", {
				d: "m16 21-3.105-6.21",
				key: "7oh9d"
			}],
			["path", {
				d: "M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z",
				key: "m7xp4m"
			}],
			["path", {
				d: "m6.158 8.633 1.114 4.456",
				key: "74o979"
			}],
			["path", {
				d: "m8 21 3.105-6.21",
				key: "1fvxut"
			}],
			["circle", {
				cx: "12",
				cy: "13",
				r: "2",
				key: "1c1ljs"
			}]
		]);
		//#endregion
		//#region src/client/settings-skin/SettingsNavHeader.tsx
		let isSkinEnabled = true;
		const skinStateListeners = /* @__PURE__ */ new Set();
		function setSkinEnabledState(enabled) {
			if (isSkinEnabled !== enabled) {
				isSkinEnabled = enabled;
				skinStateListeners.forEach((fn) => fn(enabled));
			}
		}
		function subscribeSkinEnabledState(fn) {
			skinStateListeners.add(fn);
			return () => {
				skinStateListeners.delete(fn);
			};
		}
		let currentQuery = "";
		const listeners = /* @__PURE__ */ new Set();
		function getNavSearchQuery() {
			return currentQuery;
		}
		function setNavSearchQuery(query) {
			currentQuery = query;
			listeners.forEach((fn) => fn(query));
		}
		function subscribeNavSearch(fn) {
			listeners.add(fn);
			return () => {
				listeners.delete(fn);
			};
		}
		function SettingsNavHeader(props = {}) {
			const [enabled, setEnabled] = (0, react.useState)(isSkinEnabled);
			const [query, setQuery] = (0, react.useState)(currentQuery);
			const dict = typeof document !== "undefined" && (document.documentElement.lang || "zh").startsWith("zh") ? zh : en;
			const t = props.t ?? ((key) => dict[key] ?? key);
			(0, react.useEffect)(() => {
				return subscribeSkinEnabledState((state) => setEnabled(state));
			}, []);
			(0, react.useEffect)(() => {
				return subscribeNavSearch((q) => setQuery(q));
			}, []);
			const handleQueryChange = (val) => {
				setQuery(val);
				setNavSearchQuery(val);
			};
			const handleClose = () => {
				const closeBtn = document.querySelector("[data-shortcut-modal=\"settings\"]")?.querySelector("button[class*=\"close\"]");
				if (closeBtn) closeBtn.click();
				else window.dispatchEvent(new KeyboardEvent("keydown", {
					key: "Escape",
					code: "Escape",
					bubbles: true
				}));
			};
			if (!enabled) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: t("settings.title") });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-settings-nav-header-root",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dcu-settings-nav-header-top",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dcu-settings-back-btn",
						onClick: handleClose,
						"aria-label": t("settings.back"),
						title: t("settings.back"),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArrowLeft, {
							size: 16,
							"aria-hidden": "true"
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-settings-nav-header-title",
						children: t("settings.title")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dcu-settings-search-wrapper",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
						type: "search",
						className: "dcu-settings-search-input",
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Search, {
							size: 14,
							className: "dcu-settings-search-icon",
							"aria-hidden": "true"
						}),
						placeholder: t("settings.search"),
						"aria-label": t("settings.search"),
						value: query,
						onChange: (e) => handleQueryChange(e.target.value)
					})
				})]
			});
		}
		//#endregion
		//#region src/client/settings-skin/index.ts
		const SETTINGS_SKIN_STYLE_ID = "dcu-official-settings-skin";
		const SETTINGS_SKIN_CSS = `
/* 全屏工作台 Presentation 遮罩层铺满
   选择器必须精确落到“装着设置面板的那一层遮罩”：宿主所有 Modal（含确认框、插件弹窗）的
   root 都是 body 直属的 role="presentation"，用 body:has(...) > [role="presentation"]
   会把同时打开的其它模态窗一起改成 stretch 靠左上角。 */
body > [role="presentation"]:has(> [data-shortcut-modal="settings"]) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 1000 !important;
  display: flex !important;
  align-items: stretch !important;
  justify-content: stretch !important;
  padding: 0 !important;
  background-color: transparent !important;
}

/* 模态框外壳：全屏 100vw x 100vh 工作台形态 */
[data-shortcut-modal="settings"] {
  box-sizing: border-box !important;
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 0 !important;
  border: none !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  box-shadow: none !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: row !important;
}

/* 桌面平台窗口标题栏避让：在具有 Windows/macOS 顶栏的环境下平滑下移，绝不遮盖或截断内容与操作区 */
html[data-platform="darwin"] body > [role="presentation"]:not(#root) {
  -webkit-app-region: initial;
}

/* 桌面平台窗口标题栏避让：单点锁定在 [data-shortcut-modal="settings"]，绝无重复，也绝不冲顶 */
html[data-windows-titlebar]:not([data-fullscreen]) [data-shortcut-modal="settings"] {
  top: var(--dsh-windows-titlebar-height, var(--dsh-frame-chrome-top, 40px)) !important;
  height: calc(100vh - var(--dsh-windows-titlebar-height, var(--dsh-frame-chrome-top, 40px))) !important;
}

html[data-platform="darwin"]:not([data-fullscreen]) [data-shortcut-modal="settings"] {
  top: var(--dsh-frame-top-clearance, 38px) !important;
  height: calc(100vh - var(--dsh-frame-top-clearance, 38px)) !important;
}

/* 左侧整列侧栏：与首页侧栏严格等宽，底色统合对齐 --dsw-alias-bg-layer-2，杜绝与右侧工作区产生色差断层 */
[data-shortcut-modal="settings"] > nav {
  box-sizing: border-box !important;
  width: var(--dcu-settings-nav-width, 280px) !important;
  min-width: var(--dcu-settings-nav-width, 280px) !important;
  max-width: var(--dcu-settings-nav-width, 280px) !important;
  flex-shrink: 0 !important;
  gap: 0 !important;
  padding: 16px 12px 24px !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

/* 设置工作台必须使用实色不透明底板，左右两栏整体浑然一体 */
[data-shortcut-modal="settings"] {
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
}

[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) {
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
}

/* 浅色模式全局兜底：浅底高对比度规范，绝不允许残留或回退暗黑色 */
body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"],
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"] {
  background: var(--dsw-alias-bg-base, var(--dsw-static-neutral-bluish-00, #ffffff)) !important;
}

body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav),
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) {
  background: var(--dsw-alias-bg-layer-1, var(--dsw-static-neutral-bluish-00, #ffffff)) !important;
}

/* 玻璃质感/原版兼容排版模式（Compat） */
html[data-dsh-glass]:not([data-dsh-glass-float]) [data-shortcut-modal="settings"] {
  background: var(--dsw-alias-bg-base, #151517) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

html[data-dsh-glass]:not([data-dsh-glass-float]) [data-shortcut-modal="settings"] > nav,
html[data-dsh-glass]:not([data-dsh-glass-float]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="navTitle"] {
  background: color-mix(
    in srgb,
    var(--dsw-specific-sidebar-fill, #181825) 85%,
    var(--dsw-alias-bg-base, #09090b)
  ) !important;
  backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.05) !important;
}

html[data-dsh-glass]:not([data-dsh-glass-float]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) {
  background: var(--dsw-alias-bg-base, #151517) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 云母悬浮模式（Mica Mode）：设置面板全面升华为与首页一致的悬浮双岛体系 */
html[data-dsh-glass-float] body > [role="presentation"]:has(> [data-shortcut-modal="settings"]) {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 卡片背后的全局画布：完全对齐首页的漫反射温润云母底板（Glow 1 + Glow 2 + Wash 深度渐变） */
html[data-dsh-glass-float] [data-shortcut-modal="settings"] {
  background:
    radial-gradient(58% 46% at 18% 6%,
      color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color, #0169cc)
        calc(12% * var(--dsh-glass-ambience, 1) * var(--dsh-glass-glow, 0)), transparent), transparent 68%),
    radial-gradient(48% 42% at 86% 14%,
      color-mix(in srgb, var(--dsw-alias-brand-primary, #339cff)
        calc(10% * var(--dsh-glass-ambience, 1) * var(--dsh-glass-glow, 0)), transparent), transparent 62%),
    linear-gradient(165deg,
      color-mix(in srgb, var(--dsh-glass-ground, var(--dsw-alias-bg-base)), var(--dsh-glass-wash-tint, #ffffff)
        calc(var(--dsh-glass-wash-mix, 22%) * var(--dsh-glass-ambience, 1))) 0%,
      var(--dsh-glass-ground, var(--dsw-alias-bg-base)) 55%,
      color-mix(in srgb, var(--dsh-glass-ground, var(--dsw-alias-bg-base)), #000000 calc(5% * var(--dsh-glass-ambience, 1))) 100%) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 左侧导航悬浮岛：与首页侧边栏严格对齐几何形态、12px外边距、16px圆角与微高光 */
html[data-dsh-glass-float] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > nav {
  box-sizing: border-box !important;
  width: calc(var(--dcu-settings-nav-width, 280px) - 24px) !important;
  min-width: calc(var(--dcu-settings-nav-width, 280px) - 24px) !important;
  max-width: calc(var(--dcu-settings-nav-width, 280px) - 24px) !important;
  margin: 8px 12px 12px 12px !important;
  height: calc(100% - 20px) !important;
  max-height: calc(100% - 20px) !important;
  border-radius: 16px !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  background: var(--dsw-alias-bg-layer-2, var(--dsh-glass-card, #18181b)) !important;
  backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  overflow: hidden !important;
}

/* 右侧工作台悬浮岛：独立大圆角卡片，浅色为纯净微光白，深色为深邃灰，与首页悬浮实体完全一致 */
html[data-dsh-glass-float] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) {
  margin: 8px 12px 12px 0 !important;
  height: calc(100% - 20px) !important;
  max-height: calc(100% - 20px) !important;
  border-radius: 16px !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1, #18181b)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  overflow: hidden !important;
}

/* 云母模式下收敛顶部工具栏与内容区 padding，消除脱节大空隙 */
html[data-dsh-glass-float] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child {
  height: 48px !important;
  min-height: 48px !important;
  padding: 0 24px !important;
  background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1, #18181b)) !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2) {
  padding: 16px 32px 48px !important;
  background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1, #18181b)) !important;
}

html[data-platform="darwin"] [data-shortcut-modal="settings"] > nav {
  background: var(--dsw-specific-sidebar-fill, transparent) !important;
}

/* 顶部标题与搜索区插槽容器 */
[data-shortcut-modal="settings"] > nav > :first-child {
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
  flex: none !important;
}

/* 彻底隐藏宿主原生的 settings.header 插槽内容，杜绝原生“设置”文本复活并被挤到右边竖排折行 */
[data-shortcut-modal="settings"] [data-slot="settings.header"],
[data-shortcut-modal="settings"] [class*="navTitle"] > :not(.dcu-settings-nav-header-root) {
  display: none !important;
}

.dcu-settings-nav-header-root {
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
  width: 100% !important;
}

/* 顶部标题与返回栏：拉平左对齐基线，垂直水平对齐 */
.dcu-settings-nav-header-top {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  height: 28px !important;
  padding: 0 !important;
  width: 100% !important;
}

.dcu-settings-back-btn,
button.dcu-settings-back-btn,
[data-shortcut-modal="settings"] > nav button.dcu-settings-back-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 28px !important;
  min-width: 28px !important;
  max-width: 28px !important;
  height: 28px !important;
  min-height: 28px !important;
  max-height: 28px !important;
  flex: none !important;
  border-radius: var(--dsw-radius-sm, 6px) !important;
  background: transparent !important;
  border: none !important;
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  cursor: pointer !important;
  padding: 0 !important;
  transition: color 0.12s ease, background 0.12s ease !important;
}

.dcu-settings-back-btn:hover,
button.dcu-settings-back-btn:hover,
[data-shortcut-modal="settings"] > nav button.dcu-settings-back-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06)) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

.dcu-settings-nav-header-title {
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 28px !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  letter-spacing: -0.01em !important;
  user-select: none !important;
  white-space: nowrap !important;
  flex: 1 1 auto !important;
}

/* 搜索框容器与宿主原生 Input 规范对齐 */
.dcu-settings-search-wrapper {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
}

.dcu-settings-search-icon {
  width: 14px !important;
  height: 14px !important;
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  pointer-events: none !important;
}

/* 宿主原生 Input 组件全宽容器与 Token 规范 */
.dcu-settings-search-input {
  box-sizing: border-box !important;
  display: inline-flex !important;
  width: 100% !important;
  height: 32px !important;
  border-radius: var(--dsw-radius-md, 8px) !important;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.05)) !important;
  border: 0.5px solid var(--dsw-alias-border-l4, rgba(255, 255, 255, 0.08)) !important;
  transition: border-color 0.12s ease, background-color 0.12s ease !important;
}

.dcu-settings-search-input:focus-within {
  border-color: var(--dsw-alias-state-business-primary, var(--dsw-static-deepseek-500, #4176e6)) !important;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.08)) !important;
}

.dcu-settings-search-input input {
  font-size: 13px !important;
  line-height: 20px !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

.dcu-settings-search-input input::placeholder {
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  font-size: 13px !important;
}

/* 导航项列表容器 */
[data-shortcut-modal="settings"] > nav [class*="navList"],
[data-shortcut-modal="settings"] > nav > :nth-child(2) {
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding: 4px 0 32px !important;
}

/* 分组小标题：字号12px、中灰、标准大小写、呼吸留白 */
.dcu-settings-nav-group-header {
  box-sizing: border-box !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  letter-spacing: normal !important;
  text-transform: none !important;
  padding: 16px 10px 6px !important;
  user-select: none !important;
}

.dcu-settings-nav-group-header:first-of-type {
  padding-top: 6px !important;
}

/* 空搜索提示 */
.dcu-settings-nav-empty {
  padding: 24px 10px;
  font-size: 13px;
  color: var(--dsw-alias-label-tertiary, #71717a);
  text-align: center;
  user-select: none;
}

/* 导航项按钮：Codex 原生胶囊形态（Capsule） */
[data-shortcut-modal="settings"] > nav button,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button {
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  height: 32px !important;
  min-height: 32px !important;
  padding-inline: 10px !important;
  border-radius: var(--dsw-radius-sm, 6px) !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  color: var(--dsw-alias-label-secondary, #d4d4d8) !important;
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  transition: background 0.12s ease, color 0.12s ease !important;
  text-align: left !important;
  width: 100% !important;
}

[data-shortcut-modal="settings"] > nav button svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button svg {
  width: 16px !important;
  height: 16px !important;
  flex-shrink: 0 !important;
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  stroke-width: 1.5 !important;
  transition: color 0.12s ease !important;
}

[data-shortcut-modal="settings"] > nav button:hover,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:hover {
  background: var(--dsw-specific-sidebar-nav-item-hover, var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.05))) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

[data-shortcut-modal="settings"] > nav button:hover svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:hover svg {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

/* 选中菜单项：纯正 Codex 胶囊激活态（Capsule Pill） */
[data-shortcut-modal="settings"] > nav button[aria-current="true"],
[data-shortcut-modal="settings"] > nav button[class*="active"],
[data-shortcut-modal="settings"] > nav [class*="navCell"][class*="active"],
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[aria-current="true"],
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[class*="active"] {
  background: var(--dsw-specific-sidebar-nav-item-active, var(--dsw-alias-interactive-bg-selected, rgba(255, 255, 255, 0.10))) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  font-weight: 500 !important;
}

[data-shortcut-modal="settings"] > nav button[aria-current="true"] svg,
[data-shortcut-modal="settings"] > nav button[class*="active"] svg,
[data-shortcut-modal="settings"] > nav [class*="navCell"][class*="active"] svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[aria-current="true"] svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[class*="active"] svg {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

[data-shortcut-modal="settings"] > nav button:focus-visible,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:focus-visible {
  outline: 2px solid var(--dsw-alias-state-focus-ring, var(--dsw-static-deepseek-500, #4176e6)) !important;
  outline-offset: 1px !important;
}

/* 右侧内容工作区 */
[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) {
  display: flex !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  height: 100% !important;
}

[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child {
  box-sizing: border-box !important;
  height: 56px !important;
  min-height: 56px !important;
  padding: 0 32px !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.07)) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
}

[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child h2,
[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child span {
  font-size: 16px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
  letter-spacing: -0.01em;
}

[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child button,
[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child a {
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  transition: color 0.15s ease;
}

[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child button:hover,
[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child a:hover {
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
}

[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2) {
  box-sizing: border-box !important;
  min-height: 0 !important;
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  padding: 24px 32px 48px !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
}

/* 浅色模式右侧内容区实色与文字按钮高对比度兜底 */
body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child,
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child {
  background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08)) !important;
}

body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child h2,
body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child span,
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child h2,
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child span {
  color: var(--dsw-alias-label-primary, #18181b) !important;
}

body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child button,
body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child a,
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child button,
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child a {
  color: var(--dsw-alias-label-secondary, #52525b) !important;
}

body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child button:hover,
body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child a:hover,
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child button:hover,
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child a:hover {
  color: var(--dsw-alias-label-primary, #18181b) !important;
}

body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2),
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2) {
  background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
}

/* 右侧设置区固定宽度规范：卡片先吃满列宽、再被 800px 夹住，左右留白相等（不会出现单侧空洞）。
   实测（scripts/verify-settings-geometry.mjs，1400px 面板）：卡片宽 800px、左右各 260px —
   即「居中收束」而不是贴左；若要改成贴左，需同时去掉下面的 margin-inline: auto。 */
[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2) > * {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
  box-sizing: border-box !important;
}

[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2) > * > * {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
  box-sizing: border-box !important;
}

[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2) [class*="section"] {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
}

/* 新版宿主平铺 4 块 Grid 布局映射（0.2.1-alpha.3+），杜绝 4 列横向撕裂与多余空条 */
[data-shortcut-modal="settings"]:has(> [class*="options"]) {
  display: grid !important;
  grid-template-columns: var(--dcu-settings-nav-width, 280px) minmax(0, 1fr) !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
  flex-direction: unset !important;
  position: fixed !important;
}

[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="navTitle"] {
  grid-column: 1 !important;
  grid-row: 1 !important;
  box-sizing: border-box !important;
  width: var(--dcu-settings-nav-width, 280px) !important;
  min-width: var(--dcu-settings-nav-width, 280px) !important;
  max-width: var(--dcu-settings-nav-width, 280px) !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  border-bottom: none !important;
  padding: 16px 12px 8px 12px !important;
  margin: 0 !important;
  height: auto !important;
  flex: none !important;
}

[data-shortcut-modal="settings"]:has(> [class*="options"]) > nav {
  grid-column: 1 !important;
  grid-row: 2 !important;
  box-sizing: border-box !important;
  width: var(--dcu-settings-nav-width, 280px) !important;
  min-width: var(--dcu-settings-nav-width, 280px) !important;
  max-width: var(--dcu-settings-nav-width, 280px) !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  border-top: none !important;
  padding: 0 12px 24px 12px !important;
  margin: 0 !important;
  overflow-y: auto !important;
  height: 100% !important;
  flex: none !important;
}

/* 顶部操作区（打开配置文件 + 关闭按钮）：普通模式下透明浮动，无实体白条与下边框，绝不硬切出第二层顶部 */
[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="header"] {
  grid-column: 2 !important;
  grid-row: 1 / -1 !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 56px !important;
  min-height: 56px !important;
  box-sizing: border-box !important;
  padding: 0 32px !important;
  border: none !important;
  border-bottom: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 12px !important;
  background: transparent !important;
  z-index: 10 !important;
  margin: 0 !important;
  pointer-events: none !important;
}

[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="header"] > * {
  pointer-events: auto !important;
}

/* 右侧内容工作区：独占右侧整列（Row 1 至 Row 2 全高一体），首屏内容自 56px 顶栏下方舒展排列 */
[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] {
  grid-column: 2 !important;
  grid-row: 1 / -1 !important;
  box-sizing: border-box !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding-top: calc(56px + 20px) !important;
  padding-bottom: 48px !important;
  padding-inline: 32px !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  margin: 0 !important;
  height: 100% !important;
  flex: none !important;
}

[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] > *,
[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] > * > *,
[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] [class*="section"],
[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] [class*="card"] {
  box-sizing: border-box !important;
}

[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] > :not([style*="display: contents"]):not([data-slot]),
[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] > * > *,
[data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] [class*="section"] {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
}

/* 浅色模式新版 Grid 兜底 */
body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="navTitle"],
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="navTitle"] {
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #ffffff)) !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08)) !important;
}

body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > nav,
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:has(> [class*="options"]) > nav {
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #ffffff)) !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08)) !important;
}

body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="header"],
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="header"] {
  background: transparent !important;
  border: none !important;
  border-bottom: none !important;
}

body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"],
html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] {
  background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
}

/* 云母悬浮双岛（Mica Mode）新版 Grid 适配：右侧整列为标准 56px 顶栏 + 16px 圆角大卡片 */
html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) {
  grid-template-columns: calc(var(--dcu-settings-nav-width, 280px) - 24px) minmax(0, 1fr) !important;
  gap: 0 12px !important;
  padding: 8px 12px 12px 12px !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="navTitle"] {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 16px 12px 8px 12px !important;
  border-right: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-left: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-top: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0 !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) > nav {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 12px 24px 12px !important;
  border-right: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-left: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-bottom: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-top: none !important;
  border-radius: 0 0 16px 16px !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)) !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="header"] {
  grid-column: 2 !important;
  grid-row: 1 / -1 !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 12px !important;
  margin: 0 !important;
  height: 56px !important;
  min-height: 56px !important;
  box-sizing: border-box !important;
  padding: 0 32px !important;
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 12px !important;
  z-index: 10 !important;
  pointer-events: none !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="header"] > * {
  pointer-events: auto !important;
}

html[data-dsh-glass-float] body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="header"],
html[data-dsh-glass-float] html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="header"] {
  background: transparent !important;
  border: none !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] {
  margin: 0 !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-radius: 16px !important;
  background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1, #18181b)) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  padding-top: calc(56px + 20px) !important;
  padding-bottom: 48px !important;
  padding-inline: 32px !important;
}

/* 无论窗口 <=768px 还是处于收起态 [data-sidebar-collapsed]，结构尺寸均收敛为 56px 导轨 */
[data-shortcut-modal="settings"][data-sidebar-collapsed],
html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed],
html[data-dsh-glass] [data-shortcut-modal="settings"][data-sidebar-collapsed] {
  --dcu-settings-nav-width: 56px !important;
}

[data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) {
  grid-template-columns: 56px minmax(0, 1fr) !important;
}

/* --- 普通纯色原生模式（未开启云母）下的收起态：与普通展开态完全一致，平铺紧贴，0 外边距、0 圆角、0 磨砂、0 阴影 --- */
html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) {
  gap: 0 !important;
  padding: 0 !important;
  background: var(--dsw-alias-bg-base, #151517) !important;
}

html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="navTitle"] {
  grid-column: 1 !important;
  grid-row: 1 !important;
  box-sizing: border-box !important;
  width: 56px !important;
  min-width: 56px !important;
  max-width: 56px !important;
  padding: 14px 0 10px 0 !important;
  margin: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 0 !important;
  border: none !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  border-bottom: none !important;
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #18181b)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
  flex: none !important;
}

html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"][data-sidebar-collapsed] > nav {
  box-sizing: border-box !important;
  width: 56px !important;
  min-width: 56px !important;
  max-width: 56px !important;
  margin: 0 !important;
  padding: 12px 0 16px !important;
  border-radius: 0 !important;
  border: none !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #18181b)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 0 !important;
}

html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > div:not(nav) {
  margin: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: var(--dsw-alias-bg-base, #151517) !important;
  height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > div:not(nav) > :first-child {
  background: transparent !important;
  border: none !important;
  border-bottom: none !important;
  flex: none !important;
}

html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2) {
  margin: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  overflow-y: auto !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  padding-top: 28px !important;
  padding-bottom: 64px !important;
  padding-inline: 48px !important;
  box-sizing: border-box !important;
}

html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="options"] {
  margin: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: var(--dsw-alias-bg-base, #151517) !important;
  overflow-y: auto !important;
  height: 100% !important;
  max-height: 100% !important;
  padding-top: calc(56px + 28px) !important;
  padding-bottom: 64px !important;
  padding-inline: 48px !important;
  box-sizing: border-box !important;
}

/* 浅色普通模式下的收起态高对比度平铺底板 */
html:not([data-dsh-glass-float]) body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"][data-sidebar-collapsed] > nav,
html:not([data-dsh-glass-float]) html[data-ds-theme-source="light"] [data-shortcut-modal="settings"][data-sidebar-collapsed] > nav,
html:not([data-dsh-glass-float]) body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="navTitle"],
html:not([data-dsh-glass-float]) html[data-ds-theme-source="light"] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="navTitle"] {
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #f3f3f4)) !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08)) !important;
}

html:not([data-dsh-glass-float]) body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > div:not(nav),
html:not([data-dsh-glass-float]) html[data-ds-theme-source="light"] [data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > div:not(nav),
html:not([data-dsh-glass-float]) body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="options"],
html:not([data-dsh-glass-float]) html[data-ds-theme-source="light"] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="options"] {
  background: var(--dsw-alias-bg-base, #ffffff) !important;
}

/* --- 仅在开启云母悬浮模式（html[data-dsh-glass-float]）下，才启用 12px 悬浮双岛、16px 圆角大卡片与磨砂投影 --- */
html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) {
  grid-template-columns: 56px minmax(0, 1fr) !important;
  gap: 0 12px !important;
  padding: 8px 12px 12px 12px !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="navTitle"] {
  grid-column: 1 !important;
  grid-row: 1 !important;
  box-sizing: border-box !important;
  width: 56px !important;
  min-width: 56px !important;
  max-width: 56px !important;
  padding: 14px 0 10px 0 !important;
  margin: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 16px 16px 0 0 !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-bottom: none !important;
  background: var(--dsh-glass-card, var(--dsw-specific-sidebar-fill, #18181b)) !important;
  backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  flex: none !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > nav {
  box-sizing: border-box !important;
  width: 56px !important;
  min-width: 56px !important;
  max-width: 56px !important;
  margin: 8px 12px 12px 12px !important;
  padding: 12px 0 16px !important;
  border-radius: 16px !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  background: var(--dsh-glass-card, var(--dsw-alias-bg-layer-1)) !important;
  backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 0 !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > nav {
  grid-column: 1 !important;
  grid-row: 2 !important;
  box-sizing: border-box !important;
  width: 56px !important;
  min-width: 56px !important;
  max-width: 56px !important;
  height: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
  padding: 0 0 16px !important;
  flex: none !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-top: none !important;
  border-radius: 0 0 16px 16px !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)) !important;
  background: var(--dsh-glass-card, var(--dsw-specific-sidebar-fill, #18181b)) !important;
  backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > div:not(nav) {
  margin: 8px 12px 12px 0 !important;
  border-radius: 16px !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  background: var(--dsw-alias-bg-layer-1) !important;
  overflow-y: auto !important;
  height: calc(100% - 20px) !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="options"] {
  grid-column: 2 !important;
  grid-row: 1 / -1 !important;
  box-sizing: border-box !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding-top: calc(52px + 20px) !important;
  padding-bottom: 40px !important;
  padding-inline: 20px !important;
  margin: 0 !important;
  border-radius: 16px !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  background: var(--dsw-alias-bg-layer-1) !important;
  height: 100% !important;
  max-height: 100% !important;
}

[data-shortcut-modal="settings"][data-sidebar-collapsed] > nav::-webkit-scrollbar,
[data-shortcut-modal="settings"][data-sidebar-collapsed] [class*="navList"]::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

/* 旧版嵌套结构下的返回标题栏，平铺 Grid 宿主下不命中了 nav > :first-child，避免把 navList 错误当成标题 */
[data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > nav > :first-child {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 auto 10px auto !important;
  width: 100% !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

[data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > nav [class*="navList"],
[data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > nav > :nth-child(2) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 4px !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

[data-shortcut-modal="settings"][data-sidebar-collapsed] .dcu-settings-nav-header-root,
[data-shortcut-modal="settings"][data-sidebar-collapsed] .dcu-settings-nav-header-top {
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 auto !important;
  gap: 0 !important;
}

[data-shortcut-modal="settings"][data-sidebar-collapsed] .dcu-settings-back-btn,
[data-shortcut-modal="settings"][data-sidebar-collapsed] button.dcu-settings-back-btn {
  margin: 0 auto !important;
}

[data-shortcut-modal="settings"][data-sidebar-collapsed] .dcu-settings-nav-header-title,
[data-shortcut-modal="settings"][data-sidebar-collapsed] .dcu-settings-search-wrapper,
[data-shortcut-modal="settings"][data-sidebar-collapsed] .dcu-settings-nav-group-header,
[data-shortcut-modal="settings"][data-sidebar-collapsed] .dcu-settings-nav-empty {
  display: none !important;
}

[data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > nav,
html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > nav {
  grid-column: 1 !important;
  grid-row: 2 !important;
  box-sizing: border-box !important;
  width: 56px !important;
  min-width: 56px !important;
  max-width: 56px !important;
  height: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
  padding: 0 0 16px !important;
  flex: none !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-top: none !important;
  border-radius: 0 0 16px 16px !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)) !important;
  background: var(--dsh-glass-card, var(--dsw-specific-sidebar-fill, #18181b)) !important;
  backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

/* 导航项按钮：纯图标居中方块，对齐宿主官方首页折叠 36x36px panelRow，绝对居中无偏移 */
[data-shortcut-modal="settings"][data-sidebar-collapsed] > nav button,
[data-shortcut-modal="settings"][data-sidebar-collapsed] > nav > :nth-child(2) > button,
[data-shortcut-modal="settings"][data-sidebar-collapsed] > nav [class*="navCell"] {
  box-sizing: border-box !important;
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  min-height: 36px !important;
  max-width: 36px !important;
  max-height: 36px !important;
  padding: 0 !important;
  margin: 2px auto !important;
  gap: 0 !important;
  justify-content: center !important;
  align-items: center !important;
  text-align: center !important;
  border-radius: var(--dsw-radius-md, 8px) !important;
  flex: 0 0 36px !important;
}

/* 仅隐藏设置菜单列表中的文字标签，绝不干涉任何图标的显示规则，100%继承展开态既定图标状态！ */
[data-shortcut-modal="settings"][data-sidebar-collapsed] > nav [class*="navList"] button [class*="navLabel"],
[data-shortcut-modal="settings"][data-sidebar-collapsed] > nav button:not(.dcu-settings-back-btn) [class*="navLabel"] {
  display: none !important;
}

/* 保护并确保返回按钮完整显示，包含其内部由宿主 Button 原语包裹的 span 图标 */
[data-shortcut-modal="settings"][data-sidebar-collapsed] .dcu-settings-back-btn,
[data-shortcut-modal="settings"][data-sidebar-collapsed] button.dcu-settings-back-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  margin: 0 auto 6px auto !important;
  padding: 0 !important;
  border-radius: var(--dsw-radius-md, 8px) !important;
  opacity: 1 !important;
  visibility: visible !important;
}

[data-shortcut-modal="settings"][data-sidebar-collapsed] .dcu-settings-back-btn span,
[data-shortcut-modal="settings"][data-sidebar-collapsed] .dcu-settings-back-btn svg {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  opacity: 1 !important;
  visibility: visible !important;
}

/* 无论官方项目还是第三方插件，每个按钮在折叠态均保持唯一的视觉中心，不强行干涉内部已隐藏的备用 svg */
[data-shortcut-modal="settings"][data-sidebar-collapsed] > nav [class*="navList"] button svg,
[data-shortcut-modal="settings"][data-sidebar-collapsed] > nav [class*="navIcon"] svg {
  margin: 0 !important;
  padding: 0 !important;
  width: 18px !important;
  height: 18px !important;
  flex: none !important;
}

/* 顶栏操作区（配置文件与关闭按钮）：普通模式下透明浮动，无实体白条与下边框，绝不硬切出第二层顶部 */
html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="header"] {
  grid-column: 2 !important;
  grid-row: 1 / -1 !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 56px !important;
  min-height: 56px !important;
  padding: 0 20px !important;
  border-radius: 0 !important;
  border: none !important;
  border-bottom: none !important;
  background: transparent !important;
  z-index: 10 !important;
  pointer-events: none !important;
}

html:not([data-dsh-glass-float]) body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="header"],
html:not([data-dsh-glass-float]) html[data-ds-theme-source="light"] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="header"] {
  background: transparent !important;
  border: none !important;
  border-bottom: none !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="header"] {
  grid-column: 2 !important;
  grid-row: 1 / -1 !important;
  position: absolute !important;
  top: 8px !important;
  left: 0 !important;
  right: 12px !important;
  height: 52px !important;
  min-height: 52px !important;
  padding: 0 20px !important;
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  z-index: 10 !important;
  pointer-events: none !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="header"] > * {
  pointer-events: auto !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:not(:has(> [class*="options"])) > div:not(nav) {
  margin: 8px 12px 12px 0 !important;
  border-radius: 16px !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  background: var(--dsw-alias-bg-layer-1) !important;
  overflow-y: auto !important;
  height: calc(100% - 20px) !important;
}

[data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="options"],
html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="options"] {
  grid-column: 2 !important;
  grid-row: 1 / -1 !important;
  box-sizing: border-box !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding-top: calc(52px + 20px) !important;
  padding-bottom: 40px !important;
  padding-inline: 20px !important;
  margin: 0 !important;
  border-radius: 16px !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  background: var(--dsw-alias-bg-layer-1) !important;
  height: 100% !important;
  max-height: 100% !important;
}

/* 移动端与极窄视口响应式规范：对齐宿主官方首页 56px 图标导轨（Icon Rail）模式 */
@media (max-width: 768px) {
  body > [role="presentation"]:has(> [data-shortcut-modal="settings"]) {
    padding: 0 !important;
  }

  /* 强行压制 JS 写入的行内 --dcu-settings-nav-width 变量，并将所有云母/经典模式的基准锁死为 56px */
  [data-shortcut-modal="settings"],
  html[data-dsh-glass-float] [data-shortcut-modal="settings"],
  html[data-dsh-glass] [data-shortcut-modal="settings"] {
    --dcu-settings-nav-width: 56px !important;
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
    border-radius: 0 !important;
    border: none !important;
    display: flex !important;
    flex-direction: row !important;
    padding-top: env(safe-area-inset-top, 0px) !important;
    padding-bottom: env(safe-area-inset-bottom, 0px) !important;
    padding-left: env(safe-area-inset-left, 0px) !important;
    padding-right: env(safe-area-inset-right, 0px) !important;
    box-sizing: border-box !important;
  }

  /* 4 块 Grid 布局映射：普通模式紧贴平铺，仅在云母模式下启用悬浮双岛与外层边距 */
  html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"]:has(> [class*="options"]) {
    display: grid !important;
    grid-template-columns: 56px minmax(0, 1fr) !important;
    grid-template-rows: auto minmax(0, 1fr) !important;
    position: fixed !important;
    inset: 0 !important;
    gap: 0 !important;
    padding: 0 !important;
    background: var(--dsw-alias-bg-base, #151517) !important;
  }

  html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]),
  html[data-dsh-glass] [data-shortcut-modal="settings"]:has(> [class*="options"]) {
    display: grid !important;
    grid-template-columns: 56px minmax(0, 1fr) !important;
    grid-template-rows: auto minmax(0, 1fr) !important;
    position: fixed !important;
    inset: 0 !important;
    gap: 0 12px !important;
    padding: 8px 12px 12px 12px !important;
  }

  /* 左侧顶部区：普通模式下平铺实色无圆角，云母模式下为圆角磨砂卡片 */
  html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="navTitle"] {
    grid-column: 1 !important;
    grid-row: 1 !important;
    box-sizing: border-box !important;
    width: 56px !important;
    min-width: 56px !important;
    max-width: 56px !important;
    padding: 14px 0 10px 0 !important;
    margin: 0 !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 0 !important;
    border: none !important;
    border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
    border-bottom: none !important;
    background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #18181b)) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
    flex: none !important;
  }

  html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="navTitle"] {
    grid-column: 1 !important;
    grid-row: 1 !important;
    box-sizing: border-box !important;
    width: 56px !important;
    min-width: 56px !important;
    max-width: 56px !important;
    padding: 14px 0 10px 0 !important;
    margin: 0 !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 16px 16px 0 0 !important;
    border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
    border-bottom: none !important;
    background: var(--dsh-glass-card, var(--dsw-specific-sidebar-fill, #18181b)) !important;
    backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
    -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
    flex: none !important;
  }

  /* 旧版嵌套宿主在 <=768px 下的 nav 单岛体系，与折叠块完全对齐 */
  [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > nav,
  html[data-dsh-glass-float] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > nav {
    box-sizing: border-box !important;
    width: 56px !important;
    min-width: 56px !important;
    max-width: 56px !important;
    margin: 8px 12px 12px 12px !important;
    padding: 12px 0 16px !important;
    border-radius: 16px !important;
    border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
    box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
    background: var(--dsh-glass-card, var(--dsw-alias-bg-layer-1)) !important;
    backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
    -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: 0 !important;
  }

  [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > nav > :first-child {
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 auto 10px auto !important;
    width: 100% !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
  }

  [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > nav [class*="navList"],
  [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > nav > :nth-child(2) {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: 4px !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  .dcu-settings-nav-header-root {
    align-items: center !important;
    justify-content: center !important;
    width: 56px !important;
    max-width: 56px !important;
  }

  .dcu-settings-nav-header-top {
    justify-content: center !important;
    padding: 0 !important;
    width: 56px !important;
    max-width: 56px !important;
  }

  .dcu-settings-nav-header-title,
  .dcu-settings-search-wrapper,
  .dcu-settings-nav-group-header,
  .dcu-settings-nav-empty {
    display: none !important;
  }

  /* 左侧导航栏：普通模式下平铺实色无圆角无投影，云母模式下完整对齐首页云母磨砂圆角与下投影 */
  html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"] > nav,
  html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > nav {
    grid-column: 1 !important;
    grid-row: 2 !important;
    box-sizing: border-box !important;
    width: 56px !important;
    min-width: 56px !important;
    max-width: 56px !important;
    height: 100% !important;
    max-height: 100% !important;
    margin: 0 !important;
    padding: 0 0 16px !important;
    flex: none !important;
    border: none !important;
    border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #18181b)) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
  }

  html[data-dsh-glass-float] [data-shortcut-modal="settings"] > nav,
  html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) > nav,
  html[data-dsh-glass-float] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > nav {
    grid-column: 1 !important;
    grid-row: 2 !important;
    box-sizing: border-box !important;
    width: 56px !important;
    min-width: 56px !important;
    max-width: 56px !important;
    height: 100% !important;
    max-height: 100% !important;
    margin: 0 !important;
    padding: 0 8px 16px !important;
    flex: none !important;
    border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
    border-top: none !important;
    border-radius: 0 0 16px 16px !important;
    box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)) !important;
    background: var(--dsh-glass-card, var(--dsw-specific-sidebar-fill, #18181b)) !important;
    backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
    -webkit-backdrop-filter: blur(var(--dsh-glass-blur, 16px)) !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  [data-shortcut-modal="settings"] > nav::-webkit-scrollbar,
  [data-shortcut-modal="settings"] [class*="navList"]::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  /* 导航项按钮：纯图标正方形居中卡片，尺寸统一为 36x36px 图标导轨 */
  [data-shortcut-modal="settings"] > nav button,
  [data-shortcut-modal="settings"] > nav > :nth-child(2) > button,
  [data-shortcut-modal="settings"] > nav [class*="navCell"] {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
    max-width: 36px !important;
    max-height: 36px !important;
    padding: 0 !important;
    margin: 2px auto !important;
    justify-content: center !important;
    align-items: center !important;
    border-radius: var(--dsw-radius-md, 8px) !important;
  }

  /* 隐藏菜单项文字标签，保留居中图标，保护返回按钮 */
  [data-shortcut-modal="settings"] > nav [class*="navList"] button [class*="navLabel"],
  [data-shortcut-modal="settings"] > nav button:not(.dcu-settings-back-btn) [class*="navLabel"] {
    display: none !important;
  }

  /* 移动端媒体查询下同样仅隐藏文字，不干涉图标 */
  [data-shortcut-modal="settings"] > nav [class*="navList"] button svg,
  [data-shortcut-modal="settings"] > nav [class*="navIcon"] svg {
    margin: 0 !important;
    width: 18px !important;
    height: 18px !important;
  }

  /* 顶部操作区（配置文件与关闭按钮）：对齐首页悬浮大卡片的 52px 顶栏，左边缘与右侧卡片完全对齐 */
  [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="header"],
  html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="header"] {
    grid-column: 2 !important;
    grid-row: 1 / -1 !important;
    position: absolute !important;
    top: 8px !important;
    left: 0 !important;
    right: 12px !important;
    height: 52px !important;
    min-height: 52px !important;
    padding: 0 20px !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    z-index: 10 !important;
    pointer-events: none !important;
  }

  html[data-dsh-glass-float] [data-shortcut-modal="settings"][data-sidebar-collapsed]:has(> [class*="options"]) > [class*="header"] > * {
    pointer-events: auto !important;
  }

  html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) {
    margin: 0 !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: var(--dsw-alias-bg-base, #151517) !important;
    height: 100% !important;
    max-height: 100% !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
  }

  html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child {
    background: transparent !important;
    border: none !important;
    border-bottom: none !important;
    flex: none !important;
  }

  /* 右侧设置内容区：普通模式平铺紧贴，云母模式下复刻首页右侧 16px 圆角大卡片独立悬浮岛 */
  html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2) {
    margin: 0 !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    overflow-y: auto !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;
    padding-top: 28px !important;
    padding-bottom: 40px !important;
    padding-inline: 20px !important;
    box-sizing: border-box !important;
  }

  html:not([data-dsh-glass-float]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] {
    margin: 0 !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: var(--dsw-alias-bg-base, #151517) !important;
    overflow-y: auto !important;
    height: 100% !important;
    max-height: 100% !important;
    padding-top: calc(56px + 28px) !important;
    padding-bottom: 40px !important;
    padding-inline: 20px !important;
    box-sizing: border-box !important;
  }

  html:not([data-dsh-glass-float]) body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav),
  html:not([data-dsh-glass-float]) html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav),
  html:not([data-dsh-glass-float]) body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"],
  html:not([data-dsh-glass-float]) html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] {
    background: var(--dsw-alias-bg-base, #ffffff) !important;
  }

  html[data-dsh-glass-float] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) {
    margin: 8px 12px 12px 0 !important;
    border-radius: 16px !important;
    border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
    box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
    background: var(--dsw-alias-bg-layer-1) !important;
    overflow-y: auto !important;
    height: calc(100% - 20px) !important;
  }

  [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"],
  html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] {
    grid-column: 2 !important;
    grid-row: 1 / -1 !important;
    box-sizing: border-box !important;
    flex: 1 1 auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    padding-top: calc(52px + 20px) !important;
    padding-bottom: 40px !important;
    padding-inline: 20px !important;
    margin: 0 !important;
    border-radius: 16px !important;
    border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
    box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
    background: var(--dsw-alias-bg-layer-1) !important;
    height: 100% !important;
    max-height: 100% !important;
  }

  [data-shortcut-modal="settings"] [class*="section"],
  [data-shortcut-modal="settings"] [class*="card"] {
    width: 100% !important;
    max-width: 100% !important;
  }
}
`;
		let lastSkinCheckTime = 0;
		let cachedSkinEnabledResult = null;
		/** 探测宿主 settings-skin 子组件是否处于激活状态（含 5 秒 TTL 缓存，避免频繁打开弹层连续网络开销） */
		async function checkSettingsSkinEnabled(force = false) {
			const now = Date.now();
			if (!force && cachedSkinEnabledResult !== null && now - lastSkinCheckTime < 5e3) return cachedSkinEnabledResult;
			try {
				const response = await fetch("/api/michengai/dsh-codex-ui/settings-skin", {
					headers: { Accept: "application/json" },
					cache: "no-store"
				});
				if (!response.ok) {
					cachedSkinEnabledResult = false;
					lastSkinCheckTime = now;
					return false;
				}
				cachedSkinEnabledResult = (await response.json())?.enabled === true;
				lastSkinCheckTime = now;
				return cachedSkinEnabledResult;
			} catch {
				cachedSkinEnabledResult = false;
				lastSkinCheckTime = now;
				return false;
			}
		}
		/** 注入 Codex 1:1 设置皮肤样式 */
		function installSettingsSkin(doc = document) {
			const existing = doc.getElementById(SETTINGS_SKIN_STYLE_ID);
			if (existing !== null) {
				if (existing.textContent !== SETTINGS_SKIN_CSS) existing.textContent = SETTINGS_SKIN_CSS;
				return () => {
					existing.remove();
				};
			}
			const style = doc.createElement("style");
			style.id = SETTINGS_SKIN_STYLE_ID;
			style.textContent = SETTINGS_SKIN_CSS;
			(doc.head ?? doc.documentElement).appendChild(style);
			return () => {
				if (style.parentNode !== null) style.remove();
			};
		}
		/** 彻底卸载 Codex 设置皮肤并清理 DOM 样式节点 */
		function uninstallSettingsSkin(doc = document) {
			const existing = doc.getElementById(SETTINGS_SKIN_STYLE_ID);
			if (existing !== null) existing.remove();
		}
		/**
		* 探测宿主首页主侧栏的展开宽度（默认 280px，最小 264px）
		* 1. 优先解析 AppFrame 上的 gridTemplateColumns（如 280px minmax(...) ...）；
		* 2. 其次读取宿主 Windows 标题栏或侧栏 CSS 变量；
		* 3. 再次直接测量宿主侧栏 DOM 容器元素的实际宽度；
		* 4. 若侧栏处于折叠状态（56px / 0px）或未找到，则安全回退至宿主官方标准默认宽度 280px。
		*/
		function getHostSidebarExpandedWidth(doc = document) {
			if (!doc) return 280;
			try {
				for (const node of doc.querySelectorAll("div")) {
					const grid = node.style?.gridTemplateColumns;
					if (grid && grid.includes("minmax")) {
						const match = /^(\d+(?:\.\d+)?)px\s+/.exec(grid.trim());
						if (match) {
							const parsed = Number(match[1]);
							if (Number.isFinite(parsed) && parsed >= 264) return parsed;
						}
					}
				}
			} catch {}
			try {
				const rootStyle = doc.documentElement ? getComputedStyle(doc.documentElement) : null;
				if (rootStyle) {
					const winWidth = Number.parseFloat(rootStyle.getPropertyValue("--dsh-windows-sidebar-width"));
					if (Number.isFinite(winWidth) && winWidth >= 264) return winWidth;
					const hostWidth = Number.parseFloat(rootStyle.getPropertyValue("--dsh-sidebar-width"));
					if (Number.isFinite(hostWidth) && hostWidth >= 264) return hostWidth;
				}
			} catch {}
			try {
				const sidebarEl = doc.querySelector("[data-slot=\"sidebar\"]") ?? doc.querySelector("div[class*=\"sidebarCol\"]") ?? doc.querySelector("div[class*=\"hHd-Xa_root\"]");
				if (sidebarEl) {
					const measured = sidebarEl.getBoundingClientRect?.().width;
					if (typeof measured === "number" && Number.isFinite(measured) && measured >= 264) return measured;
				}
			} catch {}
			return 280;
		}
		/** 探测宿主首页侧栏是否处于折叠状态（56px 导轨或窄屏自动收起） */
		function isHostSidebarCollapsed(doc = document) {
			if (!doc) return false;
			try {
				if (doc.querySelector("[data-sidebar-collapsed=\"true\"], [data-sidebar-collapsed]") !== null) return true;
				const sidebarEl = doc.querySelector("[data-slot=\"sidebar\"]") ?? doc.querySelector("div[class*=\"sidebarCol\"]") ?? doc.querySelector("div[class*=\"hHd-Xa_root\"]");
				if (sidebarEl) {
					const measured = sidebarEl.getBoundingClientRect?.().width;
					if (typeof measured === "number" && Number.isFinite(measured) && measured > 0 && measured <= 64) return true;
				}
			} catch {}
			return false;
		}
		/**
		* 对宿主动态生成的菜单按钮执行无侵入的已知项分组与搜索过滤
		*/
		function decorateSettingsNav(panelEl) {
			if (isHostSidebarCollapsed(panelEl.ownerDocument || document)) {
				panelEl.setAttribute("data-sidebar-collapsed", "true");
				panelEl.style.setProperty("--dcu-settings-nav-width", "56px");
			} else {
				panelEl.removeAttribute("data-sidebar-collapsed");
				const sidebarWidth = getHostSidebarExpandedWidth(panelEl.ownerDocument || document);
				panelEl.style.setProperty("--dcu-settings-nav-width", `${sidebarWidth}px`);
			}
			const navHeader = panelEl.querySelector(":scope > [class*=\"navTitle\"]") ?? panelEl.querySelector("nav > :first-child");
			const navList = panelEl.querySelector("nav [class*=\"navList\"]") ?? panelEl.querySelector("nav > :nth-child(2)") ?? panelEl.querySelector("nav > :first-child");
			if (!navList) return () => {};
			const isZh = (document.documentElement.lang || "zh").startsWith("zh");
			let cleanHeader = () => {};
			if (navHeader && !navHeader.querySelector(".dcu-settings-nav-header-root")) {
				const originalChildren = Array.from(navHeader.childNodes);
				originalChildren.forEach((child) => {
					if (child instanceof HTMLElement) child.style.display = "none";
					else if (child.nodeType === 3) child.textContent = "";
				});
				const headerRoot = document.createElement("div");
				headerRoot.className = "dcu-settings-nav-header-root";
				(0, react_dom.render)(react.default.createElement(SettingsNavHeader), headerRoot);
				navHeader.appendChild(headerRoot);
				cleanHeader = () => {
					(0, react_dom.unmountComponentAtNode)(headerRoot);
					headerRoot.remove();
					originalChildren.forEach((child) => {
						if (child instanceof HTMLElement) child.style.removeProperty("display");
					});
				};
			}
			for (const group of SETTINGS_NAV_GROUPS) if (!navList.querySelector(`[data-dcu-group-header="${group.id}"]`)) {
				const header = document.createElement("div");
				header.className = "dcu-settings-nav-group-header";
				header.setAttribute("data-dcu-group-header", group.id);
				header.style.setProperty("order", String(group.order));
				header.textContent = isZh ? group.defaultZh : group.defaultEn;
				navList.appendChild(header);
			}
			let emptyTip = navList.querySelector("[data-dcu-group-empty]");
			if (!emptyTip) {
				emptyTip = document.createElement("div");
				emptyTip.className = "dcu-settings-nav-empty";
				emptyTip.setAttribute("data-dcu-group-empty", "");
				emptyTip.style.setProperty("order", "999");
				emptyTip.style.display = "none";
				emptyTip.textContent = isZh ? zh["settings.noResults"] : en["settings.noResults"];
				navList.appendChild(emptyTip);
			}
			const getNavButtonLabel = (btn) => {
				const labelEl = btn.querySelector("[class*=\"navLabel\"]");
				if (labelEl && labelEl.textContent?.trim()) return labelEl.textContent.trim();
				const textSpan = btn.querySelector("span:not([class*=\"navIcon\"])");
				if (textSpan && textSpan.textContent?.trim()) return textSpan.textContent.trim();
				const allSpans = btn.querySelectorAll("span");
				for (const s of allSpans) if (s.textContent?.trim() && !s.className?.includes("navIcon")) return s.textContent.trim();
				return btn.textContent?.trim() ?? "";
			};
			const classifyButtons = () => {
				navList.querySelectorAll(":scope > button").forEach((btn, index) => {
					const group = classifySettingsButton(getNavButtonLabel(btn));
					const baseOrder = group === "personal" ? 100 : group === "records" ? 300 : 200;
					btn.style.setProperty("order", String(baseOrder + 1 + index));
					btn.setAttribute("data-dcu-group", group);
				});
			};
			classifyButtons();
			const applyFilter = (query) => {
				const trimmed = query.trim().toLowerCase();
				const buttons = navList.querySelectorAll(":scope > button");
				let totalVisible = 0;
				for (const btn of buttons) {
					const label = getNavButtonLabel(btn).toLowerCase();
					if (trimmed === "") {
						btn.style.removeProperty("display");
						totalVisible += 1;
					} else if (label.includes(trimmed)) {
						btn.style.removeProperty("display");
						totalVisible += 1;
					} else btn.style.setProperty("display", "none", "important");
				}
				for (const group of SETTINGS_NAV_GROUPS) {
					const header = navList.querySelector(`[data-dcu-group-header="${group.id}"]`);
					if (header) {
						if ([...navList.querySelectorAll(`button[data-dcu-group="${group.id}"]`)].filter((b) => b.style.display !== "none").length > 0) header.style.removeProperty("display");
						else header.style.setProperty("display", "none", "important");
					}
				}
				if (emptyTip) emptyTip.style.setProperty("display", totalVisible === 0 ? "block" : "none", "important");
			};
			applyFilter(getNavSearchQuery());
			const unsubSearch = subscribeNavSearch(applyFilter);
			const navObserver = new MutationObserver(() => {
				classifyButtons();
				applyFilter(getNavSearchQuery());
			});
			navObserver.observe(navList, { childList: true });
			return () => {
				cleanHeader();
				unsubSearch();
				navObserver.disconnect();
				navList.querySelectorAll("[data-dcu-group-header], [data-dcu-group-empty]").forEach((el) => el.remove());
				navList.querySelectorAll(":scope > button").forEach((btn) => {
					btn.style.removeProperty("order");
					btn.style.display = "";
					btn.removeAttribute("data-dcu-group");
				});
			};
		}
		/**
		* 观察设置弹层的挂载并与子组件生命周期同步
		* 返回 Disposer，卸载时彻底移除 Observer、装饰器与注入样式
		*/
		function observeSettingsSkin(_ctx) {
			let disposed = false;
			let cleanDecorator;
			const sync = async () => {
				if (disposed) return;
				const enabled = await checkSettingsSkinEnabled();
				if (disposed) return;
				setSkinEnabledState(enabled);
				if (enabled) {
					installSettingsSkin(document);
					const modal = document.querySelector("[data-shortcut-modal=\"settings\"]");
					if (modal) {
						cleanDecorator?.();
						cleanDecorator = decorateSettingsNav(modal);
					}
				} else {
					cleanDecorator?.();
					cleanDecorator = void 0;
					uninstallSettingsSkin(document);
				}
			};
			if (typeof document !== "undefined") sync();
			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					for (const node of mutation.addedNodes) if (node instanceof HTMLElement) {
						const modal = node.getAttribute("data-shortcut-modal") === "settings" ? node : node.querySelector("[data-shortcut-modal=\"settings\"]");
						if (modal) {
							if (cachedSkinEnabledResult === true) {
								installSettingsSkin(document);
								cleanDecorator?.();
								cleanDecorator = decorateSettingsNav(modal);
							}
							sync();
							return;
						}
					}
					for (const node of mutation.removedNodes) if (node instanceof HTMLElement) {
						if (node.getAttribute("data-shortcut-modal") === "settings" || node.querySelector("[data-shortcut-modal=\"settings\"]")) {
							cleanDecorator?.();
							cleanDecorator = void 0;
						}
					}
				}
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			return () => {
				disposed = true;
				observer.disconnect();
				cleanDecorator?.();
				setSkinEnabledState(false);
				uninstallSettingsSkin(document);
			};
		}
		//#endregion
		//#region src/client/settings-nav-icon.ts
		/**
		* 为 Codex UI 在 DSH 原生设置导航中补上专属的 16x16 矢量图标。
		* 遵循与 dshmarket / dsh-automation 一致的非侵入式属性标记与 CSS mask 伪元素标准。
		*/
		const CODEX_UI_NAV_MARKER = "data-dcu-nav-icon";
		const NAV_ROW_SELECTOR = "[role=\"dialog\"] > nav button, [data-shortcut-modal=\"settings\"] > nav button";
		const STYLE_ID$3 = "dcu-settings-nav-icon-style";
		/** 原生 settings.section.icon 插槽图标组件 */
		function CodexUiNavIcon({ size = 16 }) {
			return react.default.createElement("svg", {
				xmlns: "http://www.w3.org/2000/svg",
				viewBox: "0 0 16 16",
				width: size,
				height: size,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.3,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}, react.default.createElement("rect", {
				x: 1.5,
				y: 2,
				width: 13,
				height: 12,
				rx: 2
			}), react.default.createElement("line", {
				x1: 5.5,
				y1: 2,
				x2: 5.5,
				y2: 14
			}), react.default.createElement("line", {
				x1: 5.5,
				y1: 5.5,
				x2: 14.5,
				y2: 5.5
			}));
		}
		const ICON_MASK_URL = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\"><rect x=\"1.5\" y=\"2\" width=\"13\" height=\"12\" rx=\"2\" stroke=\"black\" stroke-width=\"1.3\" fill=\"none\"/><line x1=\"5.5\" y1=\"2\" x2=\"5.5\" y2=\"14\" stroke=\"black\" stroke-width=\"1.3\"/><line x1=\"5.5\" y1=\"5.5\" x2=\"14.5\" y2=\"5.5\" stroke=\"black\" stroke-width=\"1.3\"/></svg>")}")`;
		const NAV_ICON_CSS = `
[${CODEX_UI_NAV_MARKER}="codex-ui"] > svg { display: none !important; }
[${CODEX_UI_NAV_MARKER}="codex-ui"]::before {
  content: '';
  flex: none;
  width: 16px;
  height: 16px;
  background-color: currentColor;
  -webkit-mask: ${ICON_MASK_URL} center / contain no-repeat;
  mask: ${ICON_MASK_URL} center / contain no-repeat;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: 16px 16px;
  mask-size: 16px 16px;
}
`;
		function ensureStyle(doc) {
			if (doc.getElementById(STYLE_ID$3) !== null) return;
			const style = doc.createElement("style");
			style.id = STYLE_ID$3;
			style.textContent = NAV_ICON_CSS;
			(doc.head ?? doc.documentElement).appendChild(style);
		}
		function matchesLabel(text, getLabel) {
			const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
			return normalized === getLabel().trim().toLowerCase() || normalized === "codex ui";
		}
		/** 把「Codex UI」设置项按钮切到原生插槽图标之外的自绘 icon（属性标记 + CSS mask）。
		*  返回值表示「本次调用改动了该按钮的状态」（打上或移除了标记），供调用方做变更统计。 */
		function applyNavIcon(button, getLabel) {
			if (matchesLabel(button.textContent ?? "", getLabel)) {
				if (Boolean(button.querySelector?.("span[class*=\"navIcon\"]"))) {
					if (button.getAttribute("data-dcu-nav-icon") === "codex-ui") {
						button.removeAttribute(CODEX_UI_NAV_MARKER);
						return true;
					}
					return false;
				}
				if (button.getAttribute("data-dcu-nav-icon") === "codex-ui") return false;
				ensureStyle(button.ownerDocument ?? document);
				button.setAttribute(CODEX_UI_NAV_MARKER, "codex-ui");
				return true;
			}
			if (button.getAttribute("data-dcu-nav-icon") === "codex-ui") {
				button.removeAttribute(CODEX_UI_NAV_MARKER);
				return true;
			}
			return false;
		}
		function observeSettingsNavIcon(getLabel, doc = document) {
			if (typeof doc === "undefined" || doc.body === null) return () => {};
			const scan = (root) => {
				if (root instanceof HTMLButtonElement && root.matches(NAV_ROW_SELECTOR)) {
					applyNavIcon(root, getLabel);
					return;
				}
				const buttons = root.querySelectorAll?.(NAV_ROW_SELECTOR) ?? [];
				for (const btn of buttons) applyNavIcon(btn, getLabel);
			};
			scan(doc);
			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					const owner = (mutation.target instanceof Element ? mutation.target : mutation.target.parentElement)?.closest?.(NAV_ROW_SELECTOR);
					if (owner instanceof HTMLButtonElement) applyNavIcon(owner, getLabel);
					for (const node of mutation.addedNodes) if (node instanceof Element) scan(node);
				}
			});
			observer.observe(doc.body, {
				childList: true,
				subtree: true
			});
			return () => {
				observer.disconnect();
				doc.querySelectorAll(`[${CODEX_UI_NAV_MARKER}="codex-ui"]`).forEach((btn) => {
					btn.removeAttribute(CODEX_UI_NAV_MARKER);
				});
				doc.getElementById(STYLE_ID$3)?.remove();
			};
		}
		//#endregion
		//#region src/client/composer/input-history.ts
		const HISTORY_KEY = "michengai.codex-ui.input-history.v1";
		const LEGACY_HISTORY_KEY = "michengai.btw.history.v1";
		const MAX_STORAGE_LENGTH = 1e6;
		/** 最多保留多少个作用域；会话级模式下即最近有输入的 100 个会话。 */
		const MAX_SCOPES = 100;
		/** 只保存已发送文本；浏览器存储失败时仍保留本次内存历史。 */
		var InputHistory = class {
			storage;
			limit;
			warn;
			scopes = /* @__PURE__ */ new Map();
			constructor(storage, limit = 200, warn = console.warn) {
				this.storage = storage;
				this.limit = limit;
				this.warn = warn;
				try {
					const current = storage?.getItem(HISTORY_KEY);
					const raw = current ?? storage?.getItem(LEGACY_HISTORY_KEY);
					if (!raw) return;
					if (raw.length > MAX_STORAGE_LENGTH) throw new Error("历史数据过大");
					const data = JSON.parse(raw);
					if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("历史格式无效");
					for (const [key, value] of Object.entries(data).slice(-100)) if (Array.isArray(value)) this.scopes.set(key, value.filter((item) => typeof item === "string" && item.length <= 8e3).slice(-limit));
					if (current === null || current === void 0) storage?.setItem(HISTORY_KEY, JSON.stringify(Object.fromEntries(this.scopes)));
				} catch {
					warn("输入历史读取失败，本次使用内存历史。");
				}
			}
			list(scope) {
				return this.scopes.get(scope) ?? [];
			}
			add(scope, text) {
				if (!text.trim() || text.length > 8e3) return;
				const previous = this.scopes.get(scope) ?? [];
				if (previous.at(-1) === text) return;
				this.scopes.delete(scope);
				this.scopes.set(scope, [...previous, text].slice(-this.limit));
				while (this.scopes.size > MAX_SCOPES) this.scopes.delete(this.scopes.keys().next().value);
				let serialized = JSON.stringify(Object.fromEntries(this.scopes));
				while (serialized.length > MAX_STORAGE_LENGTH && this.scopes.size) {
					const oldest = this.scopes.keys().next().value;
					const entries = this.scopes.get(oldest);
					entries.shift();
					if (!entries.length) this.scopes.delete(oldest);
					serialized = JSON.stringify(Object.fromEntries(this.scopes));
				}
				try {
					this.storage?.setItem(HISTORY_KEY, serialized);
				} catch {
					this.warn("输入历史无法保存到浏览器，本次仍可使用。");
				}
			}
		};
		/** 从空输入进入，编辑历史即退出，避免覆盖用户的新草稿。 */
		var HistoryCursor = class {
			index;
			original = "";
			displayed = "";
			entries = [];
			reset() {
				this.index = void 0;
				this.entries = [];
			}
			move(direction, draft, entries) {
				if (this.index !== void 0 && draft !== this.displayed) this.reset();
				if (this.index === void 0) {
					if (direction !== -1 || draft !== "" || entries.length === 0) return void 0;
					this.original = draft;
					this.entries = [...entries];
					this.index = this.entries.length;
				}
				this.index = Math.max(0, Math.min(this.entries.length, this.index + direction));
				if (this.index === this.entries.length) {
					const restored = this.original;
					this.reset();
					return restored;
				}
				this.displayed = this.entries[this.index] ?? "";
				return this.displayed;
			}
		};
		//#endregion
		//#region src/client/composer/draft-attachments.ts
		/** 统一旧版图片草稿与 0.1.5 的通用附件草稿，保护已有附件不被历史召回覆盖。 */
		function hasDraftAttachments(state) {
			return (state.attachmentIds?.length ?? 0) > 0 || (state.imageIds?.length ?? 0) > 0;
		}
		//#endregion
		//#region src/client/composer/input-history-keyboard.ts
		/** 只处理当前输入框的历史按键，保持 IME、菜单和富内容的原有行为。 */
		function bindHistoryKeys(editor, adapter) {
			const cursor = new HistoryCursor();
			let composing = false;
			let writingHistory = false;
			const begin = () => {
				composing = true;
			};
			const end = () => {
				composing = false;
			};
			const changed = () => {
				if (!writingHistory) cursor.reset();
			};
			const keydown = (event) => {
				if (event.target !== editor && !editor.contains(event.target)) return;
				if (event.defaultPrevented || composing || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || adapter.blocked()) return;
				if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
				const draft = adapter.draft();
				if (draft !== "" && !atHistoryBoundary(editor)) return;
				const next = cursor.move(event.key === "ArrowUp" ? -1 : 1, draft, adapter.entries());
				if (next === void 0) return;
				event.preventDefault();
				event.stopImmediatePropagation();
				writingHistory = true;
				try {
					adapter.setDraft(next);
				} finally {
					writingHistory = false;
				}
			};
			editor.addEventListener("compositionstart", begin);
			editor.addEventListener("compositionend", end);
			editor.addEventListener("input", changed);
			editor.addEventListener("keydown", keydown, true);
			return () => {
				editor.removeEventListener("compositionstart", begin);
				editor.removeEventListener("compositionend", end);
				editor.removeEventListener("input", changed);
				editor.removeEventListener("keydown", keydown, true);
			};
		}
		/** 召回文本中间或存在选区时，保留宿主编辑器的垂直光标移动。 */
		function atHistoryBoundary(editor) {
			if (editor instanceof HTMLTextAreaElement) return editor.selectionStart === editor.selectionEnd && (editor.selectionStart === 0 || editor.selectionEnd === editor.value.length);
			const selection = editor.ownerDocument.getSelection();
			if (!selection?.isCollapsed || !selection.rangeCount || !editor.contains(selection.anchorNode)) return false;
			const caret = selection.getRangeAt(0);
			const before = editor.ownerDocument.createRange();
			before.selectNodeContents(editor);
			before.setEnd(caret.startContainer, caret.startOffset);
			const after = editor.ownerDocument.createRange();
			after.selectNodeContents(editor);
			after.setStart(caret.endContainer, caret.endOffset);
			return before.toString() === "" || after.toString() === "";
		}
		/** 从本 slot 向上寻找唯一输入框，避免绑定侧栏、搜索或其他会话。 */
		function findComposer(anchor) {
			let parent = anchor.parentElement;
			while (parent && parent !== document.body) {
				const editors = parent.querySelectorAll("textarea:not([disabled]), [data-lexical-editor=\"true\"][contenteditable=\"true\"]");
				if (editors.length === 1) return editors[0];
				if (editors.length > 1) return void 0;
				parent = parent.parentElement;
			}
		}
		//#endregion
		//#region src/client/composer/InputHistoryDock.tsx
		function InputHistoryHint({ t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `
    [data-composer-card] [data-input-scroll]{container:dcu-composer-input / inline-size}
    [data-composer-card] [data-composer-placeholder]{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
    [data-composer-card] [data-composer-placeholder]::after{
      content:${JSON.stringify(t("input.historyHint"))};
      color:var(--dsw-alias-label-caption);font-size:12px;line-height:18px;
      white-space:nowrap;flex:0 0 auto;margin-right:8px;
    }
    @container dcu-composer-input (max-width:560px){
      [data-composer-card] [data-composer-placeholder]::after{display:none}
    }
    @media(max-width:640px){
      [data-composer-card] [data-composer-placeholder]::after{display:none}
    }
  ` });
		}
		/** 隐形输入扩展：使用宿主状态和编辑动作，不替换编辑器或创建旁问界面。 */
		function InputHistoryDock({ ctx, sessionId, history, seen }) {
			const anchor = (0, react.useRef)(null);
			const scopeMode = (0, react.useSyncExternalStore)(subscribeHistoryScope, getHistoryScope, getHistoryScope);
			(0, react.useEffect)(() => {
				const binding = ctx.sessions.binding(sessionId);
				if (binding === void 0) return;
				const scope = scopeMode === "workspace" ? ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd ?? sessionId : sessionId;
				const input = ctx.conversation.input.for(binding.ctx);
				const menu = ctx.inputTriggers.sessionOf(binding.ctx).menu;
				seen.set(binding, binding.eventSource.getSnapshot().revision);
				const collect = () => {
					const snapshot = binding.eventSource.getSnapshot();
					if (snapshot.change.kind !== "replace" && snapshot.revision <= (seen.get(binding) ?? -1)) return;
					seen.set(binding, snapshot.revision);
					if (snapshot.change.kind !== "append") return;
					for (const entry of snapshot.change.entries) {
						if (entry.event.type !== "user/message" || entry.event.data.source?.kind !== "user") continue;
						const text = entry.event.data.content.filter((block) => block.type === "text").map((block) => block.text).join("");
						history.add(scope, text);
					}
				};
				const offEvents = binding.eventSource.subscribe(collect);
				let previous = input.state.getSnapshot();
				const offInput = input.state.subscribe(() => {
					const next = input.state.getSnapshot();
					if (previous.phase === "submitting" && next.phase === "plain" && next.draft === "" && !hasDraftAttachments(previous) && previous.occurrences.length === 0) history.add(scope, previous.draft);
					previous = next;
				});
				let editor;
				let offKeys = () => {};
				const connect = () => {
					const next = anchor.current === null ? void 0 : findComposer(anchor.current);
					if (next === editor) return;
					offKeys();
					editor = next;
					if (editor === void 0) return;
					offKeys = bindHistoryKeys(editor, {
						draft: () => input.state.getSnapshot().draft,
						entries: () => history.list(scope),
						setDraft: (text) => input.setDraft(text),
						blocked: () => {
							const state = input.state.getSnapshot();
							return state.phase === "adjudicating" || state.phase === "submitting" || hasDraftAttachments(state) || state.occurrences.length > 0 || menu.getSnapshot().open;
						}
					});
				};
				connect();
				const parent = anchor.current?.parentElement?.parentElement;
				const observer = new MutationObserver(connect);
				if (parent !== null && parent !== void 0) observer.observe(parent, {
					childList: true,
					subtree: true
				});
				return () => {
					observer.disconnect();
					offKeys();
					offInput();
					offEvents();
				};
			}, [
				ctx,
				sessionId,
				history,
				seen,
				scopeMode
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				ref: anchor,
				hidden: true
			});
		}
		function registerInputHistory(ctx) {
			let storage;
			try {
				storage = window.localStorage;
			} catch {
				console.warn("[michengai-codex-ui] 浏览器存储不可用，使用内存输入历史。");
			}
			const history = new InputHistory(storage);
			const seen = /* @__PURE__ */ new WeakMap();
			const stopScope = observeHistoryScope();
			function Dock(props) {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputHistoryDock, {
					ctx,
					sessionId: props.session.sessionId,
					history,
					seen
				});
			}
			const unregisterDock = ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "codex-ui-input-history",
				order: -100
			}, Dock));
			const unregisterHint = ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "codex-ui-input-history-hint",
				order: -100,
				locale: NS
			}, InputHistoryHint));
			return () => {
				stopScope();
				unregisterDock();
				unregisterHint();
			};
		}
		/** 按用户要求用最窄宽度替代宿主自适应默认；已有有效偏好不重置，拖拽起点沿用宿主存储。 */
		function initializeComposerWidth(storage) {
			const key = "dsh.conversation.contentWidth";
			try {
				const saved = Number(storage.getItem(key));
				if (Number.isFinite(saved) && saved > 0) return;
				storage.setItem(key, String(640));
			} catch (error) {
				console.warn("[codex-ui] 无法初始化输入区宽度，将使用宿主默认值。", error);
			}
		}
		/** 新建页没有宿主 WidthHandle，补充同一宽度偏好的拖拽入口。 */
		function observeHeroWidthHandles(label) {
			const mounted = /* @__PURE__ */ new Map();
			const style = document.createElement("style");
			style.textContent = `[data-phase=hero]:has([data-conversation-scroll]){position:relative}[data-dcu-width-handle]{position:absolute;top:0;bottom:0;width:32px;padding:0;border:0;background:transparent;cursor:col-resize;touch-action:none;z-index:100;outline-offset:-5px}[data-dcu-width-handle=left]{right:calc(50% + var(--dsh-chat-content-width, var(--dsh-chat-user-width, 640px)) / 2 + 16px)}[data-dcu-width-handle=right]{left:calc(50% + var(--dsh-chat-content-width, var(--dsh-chat-user-width, 640px)) / 2 + 16px)}[data-dcu-width-handle]::after{content:'';position:absolute;top:calc(var(--dcu-pointer-y,50%) - 50px);height:100px;width:3px;left:14px;border-radius:3px;background:linear-gradient(transparent,var(--dsw-alias-scrollbar-hover-l1,#888),transparent);opacity:0}[data-dcu-width-handle]:hover::after,[data-dcu-width-handle]:focus-visible::after,[data-dcu-width-handle][data-dragging]::after{opacity:1}[data-phase=hero]:has([data-conversation-composer-overlay]) [data-dcu-width-handle]{display:none}`;
			document.head.append(style);
			const sync = () => {
				for (const [root, dispose] of mounted) if (!root.isConnected || root.dataset.phase !== "hero") {
					dispose();
					mounted.delete(root);
				}
				for (const root of document.querySelectorAll("[data-phase=hero]")) {
					if (mounted.has(root) || !root.querySelector("[data-conversation-scroll]")) continue;
					const clamp = (value) => Math.min(Math.max(640, value), Math.max(640, root.clientWidth - 176));
					const current = () => {
						const raw = getComputedStyle(root).getPropertyValue("--dsh-chat-user-width") || getComputedStyle(root).getPropertyValue("--dsh-chat-content-width");
						return clamp(parseFloat(raw) || 640);
					};
					const publish = (width, save) => {
						const value = clamp(width);
						root.style.setProperty("--dsh-chat-user-width", `${value}px`);
						root.style.setProperty("--dsh-chat-content-width", `${value}px`);
						if (save) try {
							localStorage.setItem("dsh.conversation.contentWidth", String(value));
						} catch (error) {
							console.warn("[codex-ui] 无法保存输入区宽度。", error);
						}
					};
					const initialWidth = current();
					root.style.setProperty("--dsh-chat-user-width", `${initialWidth}px`);
					root.style.setProperty("--dsh-chat-content-width", `${initialWidth}px`);
					const handles = ["left", "right"].map((side) => {
						const handle = document.createElement("button");
						handle.type = "button";
						handle.dataset.dcuWidthHandle = side;
						handle.setAttribute("aria-label", label);
						let origin = 0;
						let initial = 640;
						let dragging = false;
						handle.addEventListener("pointerdown", (event) => {
							if (event.button !== 0) return;
							event.preventDefault();
							origin = event.clientX;
							initial = current();
							dragging = true;
							handle.dataset.dragging = "";
							handle.setPointerCapture(event.pointerId);
						});
						handle.addEventListener("pointermove", (event) => {
							handle.style.setProperty("--dcu-pointer-y", `${event.clientY - handle.getBoundingClientRect().top}px`);
							if (dragging) publish(initial + (event.clientX - origin) * (side === "right" ? 2 : -2), false);
						});
						handle.addEventListener("pointerup", (event) => {
							if (!dragging) return;
							publish(initial + (event.clientX - origin) * (side === "right" ? 2 : -2), true);
							dragging = false;
							delete handle.dataset.dragging;
							handle.releasePointerCapture(event.pointerId);
						});
						handle.addEventListener("lostpointercapture", () => {
							if (dragging) publish(initial, false);
							dragging = false;
							delete handle.dataset.dragging;
						});
						handle.addEventListener("keydown", (event) => {
							if (![
								"ArrowLeft",
								"ArrowRight",
								"Home"
							].includes(event.key)) return;
							event.preventDefault();
							const delta = (event.key === "ArrowRight" ? 1 : -1) * (side === "right" ? 1 : -1) * 20;
							publish(event.key === "Home" ? 640 : current() + delta, true);
						});
						root.append(handle);
						return handle;
					});
					mounted.set(root, () => {
						handles.forEach((handle) => handle.remove());
					});
				}
			};
			const observer = new MutationObserver(sync);
			observer.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["data-phase"]
			});
			sync();
			return () => {
				observer.disconnect();
				mounted.forEach((dispose) => dispose());
				mounted.clear();
				style.remove();
			};
		}
		//#endregion
		//#region src/client/composer/NewConversationSuggestions.tsx
		const categories = [
			{
				id: "explore",
				label: "home.explore",
				tasks: [{
					label: "home.explore.task1",
					prompt: "home.explore.prompt1"
				}, {
					label: "home.explore.task2",
					prompt: "home.explore.prompt2"
				}],
				Icon: Telescope,
				color: "#27aaff"
			},
			{
				id: "build",
				label: "home.build",
				tasks: [{
					label: "home.build.task1",
					prompt: "home.build.prompt1"
				}, {
					label: "home.build.task2",
					prompt: "home.build.prompt2"
				}],
				Icon: Hammer,
				color: "#a478e8"
			},
			{
				id: "review",
				label: "home.review",
				tasks: [{
					label: "home.review.task1",
					prompt: "home.review.prompt1"
				}, {
					label: "home.review.task2",
					prompt: "home.review.prompt2"
				}],
				Icon: ScanLine,
				color: "#44bd83"
			},
			{
				id: "fix",
				label: "home.fix",
				tasks: [{
					label: "home.fix.task1",
					prompt: "home.fix.prompt1"
				}, {
					label: "home.fix.task2",
					prompt: "home.fix.prompt2"
				}],
				Icon: Bug,
				color: "#f48235"
			}
		];
		const hints = {
			workspace: "home.workspace",
			draft: "home.draft",
			busy: "home.busy"
		};
		const emptyDraft = {
			getSnapshot: () => false,
			subscribe: () => () => {}
		};
		/** 寻找宿主新会话标语容器，支持任意环境下的多层级 DOM 结构 */
		function findHeroStack(doc = document) {
			const phaseOwner = doc.querySelector("[data-phase]");
			if (phaseOwner && phaseOwner.getAttribute("data-phase") !== "hero") return null;
			const classic = doc.querySelector("[data-phase=hero] [class*=\"_composerHero\"]>:first-child>[class$=\"_stack\"]") ?? doc.querySelector("[data-phase=hero] [class*=\"host_composerHero\"] [class*=\"host_stack\"]") ?? doc.querySelector("[data-phase=hero] [class*=\"_stack\"]");
			if (classic) return classic;
			const headline = doc.querySelector("[class*=\"_headline\"]");
			if (headline?.parentElement) return headline.parentElement;
			const stack = doc.querySelector("[class*=\"_fishHitbox\"]")?.closest("[class*=\"_stack\"]");
			if (stack) return stack;
			return doc.querySelector("[class*=\"_composerHero\"] [class*=\"_stack\"]") ?? doc.querySelector("[class*=\"pXSMma_stack\"]");
		}
		/** 只向宿主标题容器贡献自己的 React portal，不搬动标题、工具条或编辑器。 */
		function NewConversationSuggestions({ t, prefill, draftSource = emptyDraft }) {
			const hasDraft = (0, react.useSyncExternalStore)(draftSource.subscribe, draftSource.getSnapshot, emptyDraft.getSnapshot);
			const [target, setTarget] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const sync = () => setTarget(findHeroStack(document));
				sync();
				const observer = new MutationObserver(sync);
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ["data-phase"]
				});
				return () => observer.disconnect();
			}, []);
			return target === null ? null : (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SuggestionCards, {
				t,
				prefill,
				hasDraft
			}), target);
		}
		function SuggestionCards({ t, prefill, hasDraft = false }) {
			const [selected, setSelected] = (0, react.useState)();
			const [hint, setHint] = (0, react.useState)("ready");
			function fill(text) {
				const result = prefill?.(text) ?? "workspace";
				setHint(result);
				if (result === "ready") document.querySelector("[data-phase=hero] [data-lexical-editor=true]")?.focus();
				if (result === "workspace") document.querySelector("[data-phase=hero] [class*=\"_heroWorkspaceRow\"]>button")?.click();
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-home-suggestions",
				"data-has-draft": hasDraft,
				"aria-hidden": hasDraft,
				"aria-label": t("home.suggestions"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-home-cards",
						children: categories.map(({ id, label, Icon, color }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: hasDraft,
							className: "dcu-home-card",
							style: { "--dcu-home-icon": color },
							"aria-pressed": selected === id,
							onClick: () => {
								setSelected(selected === id ? void 0 : id);
								setHint("ready");
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { "aria-hidden": "true" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(label) })]
						}, id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-home-details",
						children: categories.map((category) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-home-tasks",
							"data-active": selected === category.id,
							"aria-hidden": selected !== category.id,
							children: category.tasks.map((task) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dcu-home-task",
								disabled: hasDraft || selected !== category.id,
								onClick: () => fill(t(task.prompt)),
								children: t(task.label)
							}, task.label))
						}, category.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-home-status",
						children: Object.keys(hints).map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dcu-home-hint",
							"data-active": hint === key,
							"aria-hidden": hint !== key,
							role: hint === key ? "status" : void 0,
							children: t(hints[key])
						}, key))
					})
				]
			});
		}
		//#endregion
		//#region src/client/composer/ComposerPredictionOverlay.tsx
		/**
		* Browser half of composer predictions (1:1 完整无损移植自 dsh-composer-predictions 1.2.8 原版源码)
		* 具备经真机验证的局部坐标测量、ResizeObserver / selectionchange 监听、流式 SSE 消费器与 Tab/Alt 按键拦截
		*/
		const h = react.default.createElement;
		const ENDPOINT = CODEX_UI_API_ENDPOINTS.composerPredictionStream;
		/** Wait for the settled UI before asking, so a fresh turn is fully committed. */
		const SETTLE_MS = 600;
		/** Wait for a typing pause before asking for a continuation. */
		const TYPE_PAUSE_MS = 500;
		/** A continuation needs enough text to continue from. */
		const CONTINUE_MIN_CHARS = 3;
		/** Ignore the first characters of a streaming answer to avoid flicker. */
		const STREAM_MIN_CHARS = 3;
		/** Editor text insets from the resident composer styles. */
		const EDITOR_INSET_TOP = 4;
		const EDITOR_INSET_LEFT = 14;
		const EDITOR_INSET_RIGHT = 8;
		/** The editable scroll container's right margin, outside the text column. */
		const EDITOR_SCROLL_MARGIN = 4;
		const FALLBACK_LINE_HEIGHT = 24;
		const NO_GHOST = {
			mode: "next",
			items: [],
			index: 0,
			stream: "",
			active: false
		};
		const NEXT_GHOST_STYLE = {
			position: "absolute",
			display: "flex",
			alignItems: "center",
			gap: "8px",
			boxSizing: "border-box",
			fontFamily: "inherit",
			fontSize: "inherit",
			lineHeight: "inherit",
			color: "var(--dsw-alias-label-caption)",
			background: "var(--dsw-specific-input-major)",
			overflow: "hidden",
			whiteSpace: "nowrap",
			pointerEvents: "none",
			userSelect: "none",
			zIndex: 2
		};
		/** The continuation ghost hugs its text and sits where the caret is. */
		const CONTINUE_GHOST_STYLE = {
			...NEXT_GHOST_STYLE,
			gap: "6px",
			padding: "0 4px",
			borderRadius: "4px",
			zIndex: 3
		};
		const TEXT_STYLE = {
			flex: "1 1 auto",
			minWidth: 0,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap",
			opacity: .9
		};
		const CONTINUE_TEXT_STYLE = {
			...TEXT_STYLE,
			flex: "0 1 auto"
		};
		const KEYCAP_STYLE = {
			flex: "none",
			fontSize: "11px",
			lineHeight: "16px",
			padding: "0 5px",
			borderRadius: "4px",
			border: "1px solid var(--dsw-alias-border-l2)",
			color: "var(--dsw-alias-label-tertiary)",
			background: "transparent"
		};
		const BADGE_STYLE = {
			flex: "none",
			fontSize: "10px",
			lineHeight: "14px",
			color: "var(--dsw-alias-label-tertiary)",
			opacity: .8
		};
		/**
		* Locate the composer card this overlay actually belongs to.
		*
		* The seat is rendered inside the resident composer card, so the anchor node
		* is an ancestor-scoped key: a global `querySelector` would pick whichever
		* card happens to be first in the document and paint that conversation's
		* ghost over another one.
		*/
		function composerElementsNear(anchor) {
			if (typeof document === "undefined") return null;
			if (anchor === null || anchor === void 0 || !anchor.isConnected) return null;
			const card = anchor.closest("[data-composer-card]");
			if (card === null) return null;
			const editor = card.querySelector("[contenteditable=\"true\"]") || card.querySelector("[role=\"textbox\"]");
			return editor === null ? null : {
				card,
				editor
			};
		}
		/** The collapsed selection inside the editor, when it is there at all. */
		function readCaret(editor) {
			if (typeof window === "undefined" || typeof document === "undefined") return null;
			const selection = window.getSelection();
			if (selection === null || selection.rangeCount === 0) return null;
			const range = selection.getRangeAt(0);
			if (range === null || !range.collapsed) return null;
			if (!editor.contains(range.startContainer)) return null;
			const prefixRange = document.createRange();
			prefixRange.selectNodeContents(editor);
			prefixRange.setEnd(range.startContainer, range.startOffset);
			const prefix = prefixRange.toString();
			const rect = caretRect(range);
			if (rect === null) return null;
			return {
				prefix,
				left: rect.left,
				top: rect.top,
				height: rect.height
			};
		}
		function caretRect(range) {
			let rect = range.getBoundingClientRect();
			if (rect.width === 0 && rect.height === 0) {
				const rects = range.getClientRects();
				if (rects.length > 0) rect = rects[0];
			}
			if (rect.width === 0 && rect.height === 0 || rect.top === 0 && rect.left === 0) {
				const fallback = rectBeforeCaret(range);
				if (fallback !== null) return fallback;
			}
			if (rect.width === 0 && rect.height === 0) return null;
			return {
				left: rect.left,
				top: rect.top,
				height: rect.height
			};
		}
		/** Measure the character before the caret when the collapsed range is empty. */
		function rectBeforeCaret(range) {
			const node = range.startContainer;
			const offset = range.startOffset;
			if (typeof Node === "undefined" || node === null || node.nodeType !== Node.TEXT_NODE || offset <= 0) return null;
			const probe = document.createRange();
			probe.setStart(node, offset - 1);
			probe.setEnd(node, offset);
			const rect = probe.getBoundingClientRect();
			if (rect.width === 0 && rect.height === 0) return null;
			return {
				left: rect.right,
				top: rect.top,
				height: rect.height
			};
		}
		/** Whether the caret is at the effective end of the draft. */
		function caretAtEnd(editor, draft) {
			const caret = readCaret(editor);
			if (caret === null) return null;
			const draftText = collapse(draft.trimEnd());
			const prefix = collapse(caret.prefix.trimEnd());
			if (prefix === "") return null;
			return draftText === prefix ? caret : null;
		}
		function collapse(text) {
			return text.replace(/\s+/gu, " ").trim();
		}
		/** A half-typed `/command` or `@reference` is not a message continuation. */
		function isTriggerToken(draft) {
			return /(?:^|\s)\/[^\s]*$/u.test(draft) || /(?:^|\s)@"?[^\s]*$/u.test(draft);
		}
		/** Show the model's first line while it is still streaming. */
		function streamingCandidate(stream) {
			if (stream.trim().length < STREAM_MIN_CHARS) return "";
			for (const raw of stream.split(/\r?\n/u)) {
				let line = raw.trim();
				if (line === "") continue;
				if (/^none$/iu.test(line)) return "";
				line = cleanLine(line);
				if (line === "") continue;
				return line.length > 240 ? line.slice(0, 240) : line;
			}
			return "";
		}
		function cleanLine(line) {
			return line.replace(/^(?:[-*•]|\d+[.)])\s+/u, "").replace(/^["'`\u201c\u201d]+|["'`\u201c\u201d]+$/gu, "").replace(/\s+/gu, " ").trim();
		}
		/**
		* Join a continuation onto the draft without gluing words together.
		* Avoid repeating a separator already present in the exact draft.
		*/
		function joinContinuation(draft, value) {
			if (draft === "" || value === "") return value;
			if (/\s$/u.test(draft)) return value.replace(/^\s+/u, "");
			if (/^\s/u.test(value)) return value;
			const last = draft.slice(-1);
			const first = value.slice(0, 1);
			if (isCjk(last) || isCjk(first)) return value;
			if (/[([{/\-—"'`]$/u.test(last)) return value;
			if (/^[,.;:!?)\]}%]/u.test(first)) return value;
			return ` ${value}`;
		}
		function isCjk(character) {
			return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(character);
		}
		function sameBox(left, right) {
			return left !== null && left !== void 0 && left.top === right.top && left.left === right.left && left.height === right.height && left.right === right.right && left.maxWidth === right.maxWidth;
		}
		/** Parse a fully buffered SSE body, for shells that cannot stream fetch bodies. */
		function parseSseText(text) {
			const events = [];
			for (const frame of text.split("\n\n")) for (const line of frame.split("\n")) {
				if (!line.startsWith("data:")) continue;
				const payload = line.slice(5).trim();
				if (payload === "") continue;
				try {
					events.push(JSON.parse(payload));
				} catch {}
			}
			return events;
		}
		/** Read one SSE body and hand every `data:` payload to the callback. */
		async function consumeStream(body, signal, onEvent) {
			const reader = body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let terminal = false;
			try {
				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					if (signal.aborted) break;
					buffer += decoder.decode(value, { stream: true });
					let boundary = buffer.indexOf("\n\n");
					while (boundary >= 0) {
						const frame = buffer.slice(0, boundary);
						buffer = buffer.slice(boundary + 2);
						for (const line of frame.split("\n")) {
							if (!line.startsWith("data:")) continue;
							const payload = line.slice(5).trim();
							if (payload === "") continue;
							try {
								const event = JSON.parse(payload);
								if (event.type === "done" || event.type === "error") terminal = true;
								onEvent(event);
							} catch {}
						}
						boundary = buffer.indexOf("\n\n");
					}
				}
				return terminal;
			} finally {
				if (signal.aborted) try {
					await reader.cancel();
				} catch {}
				reader.releaseLock();
			}
		}
		const PREDICTION_PLACEHOLDER_HIDE_CSS = "[data-composer-card]:has([data-composer-prediction]) [data-composer-placeholder]{visibility:hidden !important;}";
		function ComposerPredictionOverlay(props) {
			const { sessionId, useSession, useInput, inputActions, enabled = true, mode = "all", nextEnabled, continueEnabled, t } = props;
			const predictionsEnabled = enabled !== false;
			const allowNext = nextEnabled !== void 0 ? nextEnabled : predictionsEnabled && mode === "all";
			const allowContinue = continueEnabled !== void 0 ? continueEnabled : predictionsEnabled && (mode === "continue" || mode === "all");
			const draft = useInput ? useInput((state) => state === void 0 ? "" : state.draft || "") : "";
			const running = useSession ? useSession((state) => state?.running === true) : false;
			const [ghost, setGhost] = react.default.useState(NO_GHOST);
			const [box, setBox] = react.default.useState(null);
			const [compositionEnd, setCompositionEnd] = react.default.useState(0);
			const anchorRef = react.default.useRef(null);
			const elements = () => composerElementsNear(anchorRef.current);
			const abortRef = react.default.useRef(null);
			const composingRef = react.default.useRef(false);
			const dismissedRef = react.default.useRef(null);
			const acceptRef = react.default.useRef(null);
			const cycleRef = react.default.useRef(null);
			const currentRef = react.default.useRef("");
			const request = react.default.useCallback(async (mode, draftText) => {
				if (sessionId === void 0 || sessionId === null) return;
				if (typeof document !== "undefined" && document.hidden) return;
				abortRef.current?.abort();
				const controller = new AbortController();
				abortRef.current = controller;
				setGhost({
					mode,
					items: [],
					index: 0,
					stream: "",
					active: true
				});
				const settle = (items) => {
					if (controller.signal.aborted) return;
					setGhost((previous) => {
						if (previous.mode !== mode) return previous;
						if (items.length === 0) return NO_GHOST;
						return {
							mode,
							items,
							index: 0,
							stream: "",
							active: false
						};
					});
				};
				try {
					const response = await fetch(ENDPOINT, {
						method: "POST",
						headers: {
							"content-type": "application/json",
							accept: "text/event-stream"
						},
						body: JSON.stringify({
							sessionId,
							mode,
							draft: draftText
						}),
						signal: controller.signal
					});
					if (!response.ok || controller.signal.aborted) {
						settle([]);
						return;
					}
					if (!(response.headers.get("content-type") || "").includes("text/event-stream")) {
						const payload = await response.json().catch(() => null);
						settle(Array.isArray(payload?.suggestions) ? payload.suggestions.filter((item) => typeof item === "string" && item !== "") : typeof payload?.suggestion === "string" && payload.suggestion !== "" ? [payload.suggestion] : []);
						return;
					}
					if (response.body === null) {
						const done = parseSseText(await response.text().catch(() => "")).find((event) => event.type === "done");
						settle(Array.isArray(done?.items) ? done.items.filter((item) => typeof item === "string" && item !== "") : []);
						return;
					}
					if (!await consumeStream(response.body, controller.signal, (event) => {
						if (controller.signal.aborted) return;
						if (event.type === "delta" && typeof event.text === "string") setGhost((previous) => previous.active && previous.mode === mode ? {
							...previous,
							stream: previous.stream + event.text
						} : previous);
						else if (event.type === "done") {
							const items = Array.isArray(event.items) ? event.items.filter((item) => typeof item === "string" && item !== "") : [];
							settle(items);
						} else if (event.type === "error") settle([]);
					})) settle([]);
				} catch {
					if (!controller.signal.aborted) settle([]);
				}
			}, [sessionId]);
			react.default.useEffect(() => {
				if (predictionsEnabled) return;
				abortRef.current?.abort();
				setGhost(NO_GHOST);
				setBox(null);
			}, [predictionsEnabled]);
			react.default.useEffect(() => {
				if (!allowNext && ghost.mode === "next") {
					abortRef.current?.abort();
					setGhost(NO_GHOST);
					setBox(null);
				}
			}, [allowNext, ghost.mode]);
			react.default.useEffect(() => {
				const onCompositionStart = () => {
					composingRef.current = true;
					abortRef.current?.abort();
					setGhost(NO_GHOST);
					setBox(null);
				};
				const onCompositionEnd = () => {
					composingRef.current = false;
					setCompositionEnd((value) => value + 1);
				};
				document.addEventListener("compositionstart", onCompositionStart, true);
				document.addEventListener("compositionend", onCompositionEnd, true);
				return () => {
					document.removeEventListener("compositionstart", onCompositionStart, true);
					document.removeEventListener("compositionend", onCompositionEnd, true);
				};
			}, []);
			react.default.useEffect(() => {
				dismissedRef.current = null;
				abortRef.current?.abort();
				setGhost(NO_GHOST);
				setBox(null);
				return () => abortRef.current?.abort();
			}, [sessionId]);
			react.default.useEffect(() => {
				abortRef.current?.abort();
				setGhost(NO_GHOST);
				if (dismissedRef.current !== null && dismissedRef.current.draft !== draft) dismissedRef.current = null;
			}, [draft]);
			react.default.useEffect(() => {
				if (!running) return;
				abortRef.current?.abort();
				setGhost(NO_GHOST);
				dismissedRef.current = null;
			}, [running]);
			react.default.useEffect(() => {
				if (sessionId === void 0 || sessionId === null) return void 0;
				if (!allowNext || running || draft !== "") return void 0;
				if (dismissedRef.current !== null && dismissedRef.current.draft === draft) return void 0;
				const timer = setTimeout(() => {
					if (composingRef.current) return;
					request("next", "");
				}, SETTLE_MS);
				return () => clearTimeout(timer);
			}, [
				sessionId,
				running,
				draft,
				request,
				allowNext,
				compositionEnd
			]);
			react.default.useEffect(() => {
				if (sessionId === void 0 || sessionId === null) return void 0;
				if (!allowContinue || draft.trim() === "" || draft.length < CONTINUE_MIN_CHARS) return void 0;
				if (isTriggerToken(draft)) return void 0;
				if (dismissedRef.current !== null && dismissedRef.current.draft === draft) return void 0;
				const timer = setTimeout(() => {
					if (composingRef.current) return;
					const found = elements();
					if (found === null) return;
					if (caretAtEnd(found.editor, draft) === null) return;
					request("continue", draft.slice(-4e3));
				}, TYPE_PAUSE_MS);
				return () => clearTimeout(timer);
			}, [
				sessionId,
				draft,
				request,
				allowContinue,
				compositionEnd
			]);
			react.default.useEffect(() => {
				const onVisibility = () => {
					if (!allowNext || document.hidden) return;
					if (draft !== "" || running) return;
					if (currentRef.current !== "" || dismissedRef.current !== null) return;
					if (sessionId === void 0 || sessionId === null) return;
					request("next", "");
				};
				document.addEventListener("visibilitychange", onVisibility);
				return () => document.removeEventListener("visibilitychange", onVisibility);
			}, [
				draft,
				running,
				sessionId,
				request,
				allowNext
			]);
			const rawCandidate = ghost.items.length > 0 ? ghost.items[Math.min(ghost.index, ghost.items.length - 1)] ?? "" : streamingCandidate(ghost.stream);
			const current = ghost.mode === "continue" ? joinContinuation(draft, rawCandidate) : rawCandidate;
			currentRef.current = current;
			const hasCandidate = current !== "";
			const visible = predictionsEnabled && current !== "" && box !== null && (ghost.mode === "next" ? allowNext && draft === "" && !running : allowContinue && draft.trim() !== "" && !isTriggerToken(draft));
			react.default.useLayoutEffect(() => {
				if (ghost.mode !== "next") return void 0;
				const measure = () => {
					const found = elements();
					if (found === null) {
						setBox((previous) => previous === null ? previous : null);
						return;
					}
					const cardRect = found.card.getBoundingClientRect();
					const editorRect = found.editor.getBoundingClientRect();
					if (editorRect.width <= 0 || editorRect.height <= 0) {
						setBox((previous) => previous === null ? previous : null);
						return;
					}
					const computed = window.getComputedStyle(found.editor);
					const lineHeight = Number.parseFloat(computed.lineHeight);
					const paddingTop = Number.parseFloat(computed.paddingTop);
					const paddingLeft = Number.parseFloat(computed.paddingLeft);
					const topInset = Number.isFinite(paddingTop) ? paddingTop : EDITOR_INSET_TOP;
					const leftInset = Number.isFinite(paddingLeft) ? paddingLeft : EDITOR_INSET_LEFT;
					const next = {
						top: Math.max(0, Math.round(editorRect.top - cardRect.top + topInset)),
						left: Math.max(0, Math.round(editorRect.left - cardRect.left + leftInset)),
						right: Math.max(EDITOR_INSET_RIGHT, Math.round(cardRect.right - editorRect.right + EDITOR_SCROLL_MARGIN)),
						height: Number.isFinite(lineHeight) && lineHeight > 0 ? Math.round(lineHeight) : FALLBACK_LINE_HEIGHT
					};
					setBox((previous) => sameBox(previous, next) ? previous : next);
				};
				measure();
				const found = elements();
				let observer;
				if (found !== null && typeof ResizeObserver === "function") {
					observer = new ResizeObserver(measure);
					observer.observe(found.card);
					observer.observe(found.editor);
				}
				window.addEventListener("resize", measure);
				return () => {
					observer?.disconnect();
					window.removeEventListener("resize", measure);
				};
			}, [
				ghost.mode,
				draft,
				sessionId,
				running,
				hasCandidate
			]);
			react.default.useLayoutEffect(() => {
				if (ghost.mode !== "continue") return void 0;
				let frame = 0;
				const measure = () => {
					frame = 0;
					const found = elements();
					if (found === null) {
						setBox((previous) => previous === null ? previous : null);
						return;
					}
					const caret = caretAtEnd(found.editor, draft);
					if (caret === null) {
						setBox((previous) => previous === null ? previous : null);
						return;
					}
					const editorRect = found.editor.getBoundingClientRect();
					if (editorRect.width <= 0 || editorRect.height <= 0) {
						setBox((previous) => previous === null ? previous : null);
						return;
					}
					const cardRect = found.card.getBoundingClientRect();
					const computed = window.getComputedStyle(found.editor);
					const lineHeight = Number.parseFloat(computed.lineHeight);
					const height = Number.isFinite(caret.height) && caret.height > 0 ? Math.round(caret.height) : Number.isFinite(lineHeight) && lineHeight > 0 ? Math.round(lineHeight) : FALLBACK_LINE_HEIGHT;
					const desired = caret.left - cardRect.left;
					const left = Math.max(0, desired);
					const maxWidth = cardRect.right - (cardRect.left + left) - 16;
					if (maxWidth < 48) {
						setBox((previous) => previous === null ? previous : null);
						return;
					}
					const top = caret.top - cardRect.top;
					if (top < 0 || top > cardRect.height - 8) {
						setBox((previous) => previous === null ? previous : null);
						return;
					}
					const next = {
						top: Math.round(top),
						left: Math.round(left),
						maxWidth: Math.round(maxWidth),
						height
					};
					setBox((previous) => sameBox(previous, next) ? previous : next);
				};
				const schedule = () => {
					if (frame === 0) frame = requestAnimationFrame(measure);
				};
				measure();
				document.addEventListener("selectionchange", schedule);
				document.addEventListener("scroll", schedule, true);
				const found = elements();
				window.addEventListener("resize", schedule);
				let observer;
				if (found !== null && typeof ResizeObserver === "function") {
					observer = new ResizeObserver(schedule);
					observer.observe(found.card);
					observer.observe(found.editor);
				}
				return () => {
					if (frame !== 0) cancelAnimationFrame(frame);
					document.removeEventListener("selectionchange", schedule);
					document.removeEventListener("scroll", schedule, true);
					window.removeEventListener("resize", schedule);
					observer?.disconnect();
				};
			}, [
				ghost.mode,
				draft,
				sessionId,
				running,
				hasCandidate
			]);
			const accept = () => {
				const value = currentRef.current;
				if (value === "" || ghost.active) return;
				const expected = ghost.mode === "continue" ? draft + value : value;
				dismissedRef.current = { draft: expected };
				abortRef.current?.abort();
				setGhost(NO_GHOST);
				setBox(null);
				try {
					if (inputActions.insertText(value, inputActions.captureInsertion()) !== true) return;
				} catch {
					return;
				}
				try {
					const found = elements();
					if (found !== null && !found.card.contains(document.activeElement)) found.editor.focus();
				} catch {}
			};
			acceptRef.current = accept;
			const cycle = (delta) => {
				setGhost((previous) => {
					if (previous.items.length <= 1) return previous;
					const index = (previous.index + delta + previous.items.length) % previous.items.length;
					return {
						...previous,
						index
					};
				});
			};
			cycleRef.current = cycle;
			react.default.useEffect(() => {
				if (!visible) return void 0;
				const onKeyDown = (event) => {
					if (event.defaultPrevented) return;
					if (event.isComposing === true || event.keyCode === 229) return;
					const found = elements();
					if (found === null) return;
					const target = typeof Node !== "undefined" && event.target instanceof Node ? event.target : null;
					const inEditor = found.editor.contains(document.activeElement);
					if (!(found.card.contains(document.activeElement) || target !== null && found.card.contains(target))) return;
					if (event.key === "Escape") {
						event.preventDefault();
						event.stopPropagation();
						dismissedRef.current = { draft };
						abortRef.current?.abort();
						setGhost(NO_GHOST);
						setBox(null);
						return;
					}
					if (event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
						if (ghost.items.length <= 1) return;
						event.preventDefault();
						event.stopPropagation();
						cycleRef.current?.(event.key === "ArrowDown" ? 1 : -1);
						return;
					}
					if (event.key !== "Tab" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
					if (!inEditor || ghost.active) return;
					if (ghost.mode === "continue" && caretAtEnd(found.editor, draft) === null) return;
					event.preventDefault();
					event.stopPropagation();
					acceptRef.current?.();
				};
				document.addEventListener("keydown", onKeyDown, true);
				return () => document.removeEventListener("keydown", onKeyDown, true);
			}, [
				visible,
				draft,
				ghost.items.length,
				ghost.active,
				ghost.mode
			]);
			const anchor = h("span", {
				ref: anchorRef,
				"data-composer-prediction-anchor": "",
				"aria-hidden": "true",
				style: { display: "none" }
			});
			if (!visible || box === null) return anchor;
			return renderPredictionGhost({
				ghost,
				box,
				current,
				t,
				anchor
			});
		}
		function renderPredictionGhost(options) {
			const { ghost, box, current, t, anchor } = options;
			const continuation = ghost.mode === "continue";
			const style = continuation ? CONTINUE_GHOST_STYLE : NEXT_GHOST_STYLE;
			const showKeycap = !ghost.active && (!continuation || (box.maxWidth ?? 0) >= 96);
			const showBadge = ghost.items.length > 1;
			return h(react.default.Fragment, null, h("style", null, PREDICTION_PLACEHOLDER_HIDE_CSS), h("span", {
				role: "status",
				"aria-live": "polite",
				"aria-atomic": "true",
				style: {
					position: "absolute",
					width: 1,
					height: 1,
					padding: 0,
					margin: -1,
					overflow: "hidden",
					clipPath: "inset(50%)",
					whiteSpace: "nowrap"
				}
			}, ghost.active ? "" : t("input.prediction.dismiss") || current), h("div", {
				style: {
					...style,
					...box
				},
				"aria-hidden": "true",
				"data-composer-prediction": ghost.mode,
				title: current
			}, h("span", { style: continuation ? CONTINUE_TEXT_STYLE : TEXT_STYLE }, current), showBadge ? h("span", {
				style: BADGE_STYLE,
				title: t("input.prediction.more")
			}, `${ghost.index + 1}/${ghost.items.length}`) : null, showKeycap ? h("kbd", {
				style: KEYCAP_STYLE,
				title: t("input.prediction.tab")
			}, "Tab") : null), anchor ?? null);
		}
		//#endregion
		//#region src/client/composer/new-conversation-style.ts
		/** 新建页底部输入布局；保留宿主节点、插槽与 active 会话底部信息。 */
		const NEW_CONVERSATION_STYLE = `
[data-phase=hero]:has([data-conversation-scroll]){container:dcu-new-conversation / inline-size}
[data-phase=hero] [data-conversation-scroll][class]{--dsh-composer-side-clearance:16px;justify-content:flex-start;scrollbar-gutter:stable both-edges}
[data-phase=hero] [data-composer-seat]{flex:1 0 auto;min-height:100%}
[data-phase=hero] [data-composer-seat]>:has([class*="_composerHero"]){display:flex;flex:1;flex-direction:column}
[data-phase=hero] [class*="_composerHero"]{box-sizing:border-box;flex:1;width:100%;max-width:none;min-width:0;margin-inline:auto;gap:0;padding-bottom:32px}
[data-phase=hero] [class*="_composerHero"]>:first-child{box-sizing:border-box;flex:1;width:100%;max-width:768px;align-self:center;height:auto;min-height:340px;align-items:center;padding:32px 28px}
[data-phase=hero] [class*="_composerHero"]>:first-child>[class$="_stack"]{width:100%;max-width:none;min-width:0;align-items:center;gap:32px}
[data-phase=hero] [class*="_composerHero"] [class$="_headline"]{grid-template-columns:46px auto auto;font-size:34px;line-height:44px}
[data-phase=hero] [class*="_composerHero"] [class$="_fishHitbox"]{width:46px;height:46px}
[data-phase=hero] [class*="_composerHero"] [class$="_fishHitbox"]>svg{width:46px;height:auto}
[data-phase=hero] [class*="_heroWorkspaceRow"]{box-sizing:border-box;width:min(var(--dsh-chat-content-width,640px),100%);align-self:center;display:flex;align-items:center;justify-content:flex-start;gap:8px;background:transparent;padding:0 4px;margin:0 0 8px;z-index:1}
.dcu-home-suggestions{width:100%;color:var(--dsw-alias-label-primary);font:13px/20px var(--dsw-font-family)}
.dcu-home-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.dcu-home-card{appearance:none;display:flex;flex-direction:column;justify-content:space-between;gap:22px;min-width:0;min-height:106px;padding:16px;border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);border-radius:20px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background-color 150ms,border-color 150ms}
.dcu-home-card:hover,.dcu-home-card[aria-pressed=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent)}
.dcu-home-card svg{width:16px;height:16px;flex:none;color:var(--dcu-home-icon)}
.dcu-home-card:focus-visible,.dcu-home-task:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:3px}
.dcu-home-details,.dcu-home-status{display:grid}
.dcu-home-suggestions[data-has-draft=true]{visibility:hidden;pointer-events:none}
.dcu-home-tasks{grid-area:1/1;display:flex;flex-wrap:wrap;align-content:start;gap:8px;margin-top:16px}
.dcu-home-details>[data-active=false],.dcu-home-status>[data-active=false]{visibility:hidden;pointer-events:none}
.dcu-home-task{appearance:none;border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);border-radius:10px;padding:8px 12px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.dcu-home-task:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
.dcu-home-hint{grid-area:1/1;margin:12px 0 0;color:var(--dsw-alias-label-secondary)}
@container dcu-new-conversation (width < 640px){
  .dcu-home-cards{grid-template-columns:repeat(2,minmax(0,1fr))}
  [data-phase=hero] [class*="_composerHero"]>:first-child{padding:32px 24px;min-height:420px}
}
@media(prefers-reduced-motion:reduce){.dcu-home-card{transition:none}}
[data-conversation-scroll]{--dsh-composer-card-max-width:calc(var(--dsh-chat-content-width) + 32px);--dsh-composer-side-clearance:24px}
`;
		//#endregion
		//#region src/client/composer/new-conversation-draft.ts
		/** 任务建议只能填入空闲且空白的草稿，不覆盖附件、提及或正在提交的内容。 */
		function prefillNewConversation(input, text) {
			if (input === void 0) return "workspace";
			const state = input.state.getSnapshot();
			if (state.phase !== "plain") return "busy";
			if (state.draft.trim() !== "" || hasDraftAttachments(state) || state.occurrences.length > 0) return "draft";
			input.setDraft(text);
			return "ready";
		}
		//#endregion
		//#region src/client/composer/index.tsx
		function currentSessionId(state) {
			if (!state) return void 0;
			if (typeof state.current === "string" && state.current !== "") return state.current;
			const byId = state.byId ?? {};
			for (const [id, row] of Object.entries(byId)) if (row && (row.retainedBy?.mainView ?? 0) > 0) return row.id?.trim() || id;
		}
		const COMPOSER_ENHANCEMENT_STYLE_ID = "dcu-composer-enhancements-style";
		function browserStorage() {
			try {
				return window.localStorage;
			} catch {
				return;
			}
		}
		/**
		* 读取 Host 状态：子插件是否启用，以及站点级是否允许预测。
		* 网络/解析失败一律返回“全部关闭”，避免在宿主不可达时仍然悄悄花 token。
		*/
		async function fetchComposerStatus() {
			try {
				const response = await fetch(CODEX_UI_API_ENDPOINTS.composer, {
					headers: { Accept: "application/json" },
					cache: "no-store"
				});
				if (!response.ok) return {
					enabled: false,
					prediction: false
				};
				const data = await response.json();
				return {
					enabled: data?.enabled === true,
					prediction: data?.prediction !== false
				};
			} catch {
				return {
					enabled: false,
					prediction: false
				};
			}
		}
		/** 注入 Composer 相关增强样式（新会话建议卡片） */
		function installComposerStyles(doc = document) {
			const existing = doc.getElementById(COMPOSER_ENHANCEMENT_STYLE_ID);
			if (existing !== null) return () => {
				existing.remove();
			};
			const style = doc.createElement("style");
			style.id = COMPOSER_ENHANCEMENT_STYLE_ID;
			style.textContent = `\n${NEW_CONVERSATION_STYLE}\n`;
			(doc.head ?? doc.documentElement).appendChild(style);
			return () => {
				if (style.parentNode !== null) style.remove();
			};
		}
		/**
		* 启动并管理 Composer 输入框核心增强能力：
		* 1. 终端风格输入历史记录与召回 (↑/↓)
		* 2. 输入框宽度初始化与拖拽手柄
		* 3. 新建会话建议卡片
		*
		* 当子插件关闭时，所有增强功能彻底注销并恢复 DSH 官方原生输入区。
		*/
		function observeComposerEnhancements(ctx) {
			let disposed = false;
			let cleanActive;
			const activate = () => {
				const cleaners = [];
				const t = ctx.locale.bind(NS);
				cleaners.push(installComposerStyles(document));
				const storage = browserStorage();
				if (storage) initializeComposerWidth(storage);
				cleaners.push(observeHeroWidthHandles(t("home.resizeInput")));
				cleaners.push(registerInputHistory(ctx));
				function SuggestionsDock(props) {
					const rawSession = props?.session;
					const sessions = ctx.sessions;
					const conversation = ctx.conversation;
					const sessionId = rawSession?.sessionId ?? rawSession?.id ?? currentSessionId(sessions?.list?.getSnapshot?.());
					const binding = sessionId && typeof sessions?.binding === "function" ? sessions.binding(sessionId) : void 0;
					const input = binding?.ctx && typeof conversation?.input?.for === "function" ? conversation.input.for(binding.ctx) : void 0;
					const draftSource = (0, react.useMemo)(() => ({
						getSnapshot: () => {
							if (!input) return false;
							const s = input.state?.getSnapshot?.();
							return (s?.draft?.trim()?.length ?? 0) > 0 || (s?.attachmentIds?.length ?? 0) > 0;
						},
						subscribe: (onChange) => input?.state?.subscribe?.(onChange) ?? (() => {})
					}), [input]);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NewConversationSuggestions, {
						t,
						prefill: (text) => prefillNewConversation(input, text),
						draftSource
					});
				}
				const unregisterSuggestions = ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
					name: "conversation.input.dock",
					id: "codex-ui-home-suggestions",
					order: -100,
					locale: NS
				}, SuggestionsDock));
				cleaners.push(unregisterSuggestions);
				function PredictionSlot(props) {
					const prediction = (0, react.useSyncExternalStore)(subscribePredictionSettings, getPredictionSettingsState, getPredictionSettingsState);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ComposerPredictionOverlay, {
						...props,
						enabled: prediction.enabled,
						mode: prediction.mode,
						nextEnabled: prediction.nextEnabled,
						continueEnabled: prediction.continueEnabled,
						ctx,
						t
					});
				}
				const unregisterPrediction = ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
					name: "conversation.input.overlay",
					id: "codex-ui-composer-prediction",
					order: 50,
					locale: NS
				}, PredictionSlot));
				cleaners.push(unregisterPrediction);
				cleaners.push(observePredictionSettings());
				return () => {
					for (const clean of cleaners.reverse()) try {
						clean();
					} catch {}
					if (typeof document !== "undefined") document.querySelectorAll("[data-dcu-width-handle]").forEach((el) => el.remove());
				};
			};
			const sync = async () => {
				if (disposed) return;
				const status = await fetchComposerStatus();
				if (disposed) return;
				setSubPluginEnabled(status.enabled);
				setHostPredictionAllowed(status.prediction);
				if (status.enabled) {
					if (!cleanActive) cleanActive = activate();
				} else {
					cleanActive?.();
					cleanActive = void 0;
				}
			};
			cleanActive = activate();
			sync();
			const onFocus = () => {
				sync();
			};
			if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
			let observer;
			if (typeof document !== "undefined") {
				observer = new MutationObserver((mutations) => {
					for (const mutation of mutations) if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
						for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) if (node instanceof HTMLElement) {
							if (node.getAttribute("data-shortcut-modal") === "settings" || node.querySelector?.("[data-shortcut-modal=\"settings\"]")) {
								sync();
								return;
							}
						}
					}
				});
				observer.observe(document.body, {
					childList: true,
					subtree: true
				});
			}
			const pollTimer = setInterval(() => {
				if (typeof document !== "undefined" && document.visibilityState === "visible") sync();
			}, 15e3);
			return () => {
				disposed = true;
				if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
				observer?.disconnect();
				clearInterval(pollTimer);
				cleanActive?.();
				cleanActive = void 0;
			};
		}
		//#endregion
		//#region src/client/sidebar/layout.ts
		/**
		* 侧栏导航布局模型：
		* 只保存「常驻顺序」与「收入更多的顺序」，入口本身仍由宿主注册与渲染。
		* 纯函数，方便单测；不读写 localStorage。
		*/
		/** 宿主固定的入口：始终常驻，不参与收纳与拖动。 */
		const FIXED_PANEL_IDS = ["plugins"];
		const SIDEBAR_LAYOUT_KEY = "michengai.codex-ui.sidebar-layout.v1";
		const isStringArray$1 = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
		/** 解析持久化内容；格式不符时返回 undefined，由调用方回退默认布局。 */
		function parseLayout(raw) {
			if (raw === null || raw === "") return void 0;
			try {
				const data = JSON.parse(raw);
				if (typeof data !== "object" || data === null) return void 0;
				const { pinned, more } = data;
				if (!isStringArray$1(pinned) || !isStringArray$1(more)) return void 0;
				return {
					pinned,
					more
				};
			} catch {
				return;
			}
		}
		function serializeLayout(layout) {
			return JSON.stringify({
				pinned: layout.pinned,
				more: layout.more
			});
		}
		const isFixed = (id) => FIXED_PANEL_IDS.includes(id);
		/**
		* 把已保存布局与当前实际注册的入口对齐：
		* - 固定入口由宿主恒定渲染，不写入布局数据；
		* - 保存过但已消失的入口丢弃；
		* - 新出现的入口追加到更多末尾，不打断用户已有顺序；
		* - 同一入口不会同时出现在两个分区。
		*/
		function normalizeLayout(saved, availableIds) {
			const available = new Set(availableIds.filter((id) => !isFixed(id)));
			const seen = /* @__PURE__ */ new Set();
			const pinned = [];
			for (const id of saved?.pinned ?? []) {
				if (!available.has(id) || seen.has(id)) continue;
				seen.add(id);
				pinned.push(id);
			}
			const more = [];
			for (const id of saved?.more ?? []) {
				if (!available.has(id) || seen.has(id)) continue;
				seen.add(id);
				more.push(id);
			}
			for (const id of availableIds) {
				if (isFixed(id) || seen.has(id)) continue;
				seen.add(id);
				more.push(id);
			}
			return {
				pinned,
				more
			};
		}
		/**
		* 把入口移动到目标分区的位置：
		* - 固定入口不可移动；
		* - 未知入口忽略；
		* - 越界索引收敛到末尾。
		*/
		function moveEntry(layout, target) {
			if (isFixed(target.id)) return layout;
			if (!(/* @__PURE__ */ new Set([...layout.pinned, ...layout.more])).has(target.id)) return layout;
			const pinned = layout.pinned.filter((id) => id !== target.id);
			const more = layout.more.filter((id) => id !== target.id);
			const bucket = target.zone === "pinned" ? pinned : more;
			const index = Number.isFinite(target.index) ? Math.max(0, Math.min(Math.trunc(target.index), bucket.length)) : bucket.length;
			bucket.splice(index, 0, target.id);
			return {
				pinned,
				more
			};
		}
		//#endregion
		//#region src/client/sidebar/SidebarNav.tsx
		const IconBrowse = _deepseek_ai_dsh_client_ui_primitives.IconPluginPinwheelOutlineRegular ?? Blocks;
		const IconCreate = _deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular ?? Plus;
		const IconNewChat = _deepseek_ai_dsh_client_ui_primitives.IconNewChatOutlineMedium ?? _deepseek_ai_dsh_client_ui_primitives.IconNewChatOutlineRegular ?? MessageSquarePlus;
		const Tooltip = _deepseek_ai_dsh_client_ui_primitives.Tooltip;
		const ShortcutKeys = _deepseek_ai_dsh_client_ui_primitives.ShortcutKeys;
		function getNewSessionShortcut() {
			if (typeof document === "undefined") return {};
			const aria = document.querySelector("button[class*=\"newSession\"]")?.getAttribute("aria-keyshortcuts") || void 0;
			if (!aria) return typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent) ? {
				aria: "⌥⌘N",
				keys: [
					"⌥",
					"⌘",
					"N"
				]
			} : {
				aria: "Ctrl+Alt+N",
				keys: [
					"Ctrl",
					"Alt",
					"N"
				]
			};
			return {
				aria,
				keys: aria.split("+").map((k) => {
					const lower = k.trim().toLowerCase();
					if (lower === "control") return "Ctrl";
					if (lower === "alt") return "Alt";
					if (lower === "shift") return "Shift";
					if (lower === "meta" || lower === "command") return "⌘";
					return k.trim();
				})
			};
		}
		function resolveSlotLabel(label) {
			if (typeof label === "function") try {
				const res = label();
				return typeof res === "string" ? res : void 0;
			} catch {
				return;
			}
			return typeof label === "string" ? label : void 0;
		}
		const PanelIcon = ({ component: Component, active }) => {
			if (!Component) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Component, {
				size: 16,
				active
			});
		};
		/** 跨平台拖拽预览镜像，对齐 CodexUI 会话树与 DSH 原生风格。 */
		function setDragPreview(dataTransfer, title) {
			try {
				const preview = document.createElement("div");
				preview.className = "dcu-sb-drag-ghost";
				preview.textContent = title;
				document.body.appendChild(preview);
				preview.offsetWidth;
				dataTransfer.setDragImage(preview, 16, 16);
				window.requestAnimationFrame(() => {
					preview.remove();
				});
			} catch {}
		}
		/**
		* 全局原生拖拽守卫（借鉴 DSH workspace 原语）：
		* 挂载期间持续监听，在自身拖拽进行期间防止 Electron 桌面端窗口层叠边界取消拖拽。
		*/
		function useNativeDragAcceptance(isDraggingGetter) {
			(0, react.useEffect)(() => {
				if (typeof document === "undefined") return;
				const acceptDrag = (e) => {
					if (!isDraggingGetter()) return;
					e.preventDefault();
					if (e.dataTransfer !== null) e.dataTransfer.dropEffect = "move";
				};
				const acceptDrop = (e) => {
					if (!isDraggingGetter()) return;
					e.preventDefault();
				};
				document.addEventListener("dragover", acceptDrag);
				document.addEventListener("drop", acceptDrop);
				return () => {
					document.removeEventListener("dragover", acceptDrag);
					document.removeEventListener("drop", acceptDrop);
				};
			}, [isDraggingGetter]);
		}
		/**
		* 独立的 React 侧栏导航组件：
		* - 接管新会话行、固定常驻区（如 plugins）、用户常驻区与折叠“更多”区；
		* - 原位折叠动画与键盘无障碍管理；
		* - 采用指针手势（Pointer Drag）驱动双向排序与跨区移动，全面规避 Electron HTML5 OS 拖拽拦截；
		* - 鼠标移上去呈现优雅的圆角胶囊形态。
		*/
		const SidebarNav = ({ ctx, onLayoutChange, initialLayout }) => {
			const t = (0, react.useMemo)(() => {
				return (key, fallback) => {
					try {
						const fn = ctx.locale?.bind?.(NS);
						const translated = fn?.(key);
						return translated && translated !== key ? translated : fallback ?? key;
					} catch {
						return fallback ?? key;
					}
				};
			}, [ctx]);
			const [panels, setPanels] = (0, react.useState)(() => {
				try {
					return (ctx.slots?.entriesOfSlot?.("sidebar.panellist") ?? []).filter((entry) => typeof entry.options.id === "string").map((entry) => ({
						id: entry.options.id,
						order: entry.options.order ?? 0,
						label: resolveSlotLabel(entry.options.label) ?? entry.options.id,
						component: entry.component
					}));
				} catch {
					return [];
				}
			});
			const syncPanels = (0, react.useCallback)(() => {
				try {
					const next = (ctx.slots?.entriesOfSlot?.("sidebar.panellist") ?? []).filter((entry) => typeof entry.options.id === "string").map((entry) => ({
						id: entry.options.id,
						order: entry.options.order ?? 0,
						label: resolveSlotLabel(entry.options.label) ?? entry.options.id,
						component: entry.component
					}));
					setPanels(next);
				} catch {}
			}, [ctx]);
			(0, react.useEffect)(() => {
				const unsubSlots = ctx.slots?.subscribe?.("sidebar.panellist", syncPanels);
				const unsubLocale = ctx.locale?.subscribe?.(syncPanels);
				return () => {
					unsubSlots?.();
					unsubLocale?.();
				};
			}, [ctx, syncPanels]);
			const availableIds = (0, react.useMemo)(() => panels.map((p) => p.id), [panels]);
			const [layout, setLayout] = (0, react.useState)(() => {
				if (initialLayout) return normalizeLayout(initialLayout, availableIds);
				try {
					return normalizeLayout(parseLayout(typeof localStorage !== "undefined" ? localStorage.getItem(SIDEBAR_LAYOUT_KEY) : null), availableIds);
				} catch {
					return normalizeLayout(void 0, availableIds);
				}
			});
			const layoutRef = (0, react.useRef)(layout);
			layoutRef.current = layout;
			(0, react.useEffect)(() => {
				setLayout((prev) => {
					const next = normalizeLayout(prev, availableIds);
					if (next.pinned.length === prev.pinned.length && next.more.length === prev.more.length && next.pinned.every((id, i) => id === prev.pinned[i]) && next.more.every((id, i) => id === prev.more[i])) return prev;
					return next;
				});
			}, [availableIds]);
			const persistLayout = (0, react.useCallback)((nextLayout) => {
				try {
					if (typeof localStorage !== "undefined") localStorage.setItem(SIDEBAR_LAYOUT_KEY, serializeLayout(nextLayout));
				} catch {}
				onLayoutChange?.(nextLayout);
			}, [onLayoutChange]);
			const [activePanelId, setActivePanelId] = (0, react.useState)(() => {
				try {
					return (ctx.get?.("layout") ?? ctx?.layout)?.panelInfo?.getSnapshot?.()?.activePanelId ?? null;
				} catch {
					return null;
				}
			});
			(0, react.useEffect)(() => {
				try {
					const layoutApi = ctx.get?.("layout") ?? ctx?.layout;
					if (!layoutApi?.panelInfo?.subscribe) return;
					return layoutApi.panelInfo.subscribe(() => {
						const next = layoutApi.panelInfo?.getSnapshot?.()?.activePanelId ?? null;
						setActivePanelId(next);
					});
				} catch {
					return () => {};
				}
			}, [ctx]);
			const [moreOpen, setMoreOpen] = (0, react.useState)(false);
			const [startingSession, setStartingSession] = (0, react.useState)(false);
			const handleStartSession = (0, react.useCallback)(async () => {
				if (startingSession) return;
				setStartingSession(true);
				try {
					const uiWorkspace = ctx.get?.("uiWorkspace") ?? ctx?.uiWorkspace;
					if (typeof uiWorkspace?.startSession === "function") await Promise.resolve(uiWorkspace.startSession());
					else document.querySelector("button[class*=\"newSession\"]")?.click();
				} catch (err) {
					console.warn("startSession failed:", err);
				} finally {
					setStartingSession(false);
				}
			}, [ctx, startingSession]);
			const handleSelectPanel = (0, react.useCallback)((id) => {
				setActivePanelId(id);
				try {
					const layoutApi = ctx.get?.("layout") ?? ctx?.layout;
					if (typeof layoutApi?.selectPanel === "function") layoutApi.selectPanel(id);
					else document.querySelector(`button[class*="panelRow"][data-dcu-panel-id="${id}"]`)?.click();
				} catch (err) {
					console.warn(`selectPanel('${id}') failed:`, err);
				}
			}, [ctx]);
			const handleBrowsePlugins = (0, react.useCallback)(() => {
				try {
					const pluginNav = ctx.get?.("pluginNavigation");
					if (typeof pluginNav?.openList === "function") {
						pluginNav.openList();
						return;
					}
				} catch {}
				handleSelectPanel("plugins");
			}, [ctx, handleSelectPanel]);
			const handleCreatePlugin = (0, react.useCallback)(() => {
				try {
					const uiWorkspace = ctx.get?.("uiWorkspace");
					if (typeof uiWorkspace?.startSession === "function") {
						uiWorkspace.startSession(void 0, {
							agentPreset: "cordis",
							prompt: t("sidebar.createPrompt", "创建一个带左侧栏入口的 DSH 插件。"),
							whenDraftExists: "append"
						});
						return;
					}
				} catch {}
				handleStartSession();
			}, [
				ctx,
				handleStartSession,
				t
			]);
			const [draggingId, setDraggingId] = (0, react.useState)(null);
			const [dragOver, setDragOver] = (0, react.useState)(null);
			const dragOverRef = (0, react.useRef)(null);
			const updateDragOver = (0, react.useCallback)((next) => {
				dragOverRef.current = next;
				setDragOver((prev) => {
					if (prev?.zone === next?.zone && prev?.target === next?.target) return prev;
					return next;
				});
			}, []);
			const isDraggingRef = (0, react.useRef)(null);
			useNativeDragAcceptance((0, react.useCallback)(() => Boolean(isDraggingRef.current), []));
			const commitDrop = (0, react.useCallback)((draggedId, zone, target) => {
				if (!draggedId || FIXED_PANEL_IDS.includes(draggedId)) return;
				const currentLayout = layoutRef.current;
				if (target === "__more_trigger__") {
					const next = moveEntry(currentLayout, {
						id: draggedId,
						zone: "more",
						index: currentLayout.more.filter((id) => id !== draggedId).length
					});
					setLayout(next);
					persistLayout(next);
					setMoreOpen(true);
					return;
				}
				const targetList = (zone === "pinned" ? currentLayout.pinned : currentLayout.more).filter((id) => id !== draggedId);
				if (target === "__end__") {
					const next = moveEntry(currentLayout, {
						id: draggedId,
						zone,
						index: targetList.length
					});
					setLayout(next);
					persistLayout(next);
					if (zone === "more") setMoreOpen(true);
					return;
				}
				if (target === draggedId) return;
				const targetIdx = targetList.indexOf(target);
				const next = moveEntry(currentLayout, {
					id: draggedId,
					zone,
					index: targetIdx !== -1 ? targetIdx : targetList.length
				});
				setLayout(next);
				persistLayout(next);
				if (zone === "more") setMoreOpen(true);
			}, [persistLayout]);
			const handleDragStart = (0, react.useCallback)((e, id, label) => {
				if (FIXED_PANEL_IDS.includes(id)) {
					e.preventDefault();
					return;
				}
				e.stopPropagation();
				try {
					e.dataTransfer.effectAllowed = "move";
					e.dataTransfer.setData("text/plain", id);
					e.dataTransfer.setData("application/x-dsh-panel-id", id);
					setDragPreview(e.dataTransfer, label);
				} catch {}
				setDraggingId(id);
				isDraggingRef.current = id;
			}, []);
			const handleDragEnd = (0, react.useCallback)(() => {
				setDraggingId(null);
				updateDragOver(null);
				isDraggingRef.current = null;
			}, [updateDragOver]);
			const handleDragOverRow = (0, react.useCallback)((e, targetId, zone) => {
				if (!(isDraggingRef.current ?? draggingId)) return;
				e.preventDefault();
				e.stopPropagation();
				if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
				const list = zone === "pinned" ? layoutRef.current.pinned : layoutRef.current.more;
				if (targetId === "plugins") {
					const firstPanel = list[0];
					updateDragOver({
						zone: "pinned",
						target: firstPanel ?? "__end__"
					});
					return;
				}
				const targetIdx = list.indexOf(targetId);
				if (targetIdx === -1) {
					updateDragOver({
						zone,
						target: "__end__"
					});
					return;
				}
				const rect = e.currentTarget.getBoundingClientRect();
				if (e.clientY >= rect.top + rect.height / 2) {
					const nextId = list[targetIdx + 1];
					updateDragOver({
						zone,
						target: nextId ?? "__end__"
					});
				} else updateDragOver({
					zone,
					target: targetId
				});
			}, [draggingId, updateDragOver]);
			const handleDragLeaveRow = (0, react.useCallback)((e, targetId) => {
				if (e.currentTarget.contains(e.relatedTarget)) return;
				if (dragOverRef.current?.target === targetId) updateDragOver(null);
			}, [updateDragOver]);
			const handleDropRow = (0, react.useCallback)((e, targetId, zone) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.dataTransfer?.getData("application/x-dsh-panel-id") || e.dataTransfer?.getData("text/plain") || isDraggingRef.current || draggingId;
				const target = dragOverRef.current?.target ?? targetId;
				commitDrop(id, zone, target);
				handleDragEnd();
			}, [
				commitDrop,
				draggingId,
				handleDragEnd
			]);
			const handleDragOverZone = (0, react.useCallback)((e, zone) => {
				if (!(isDraggingRef.current ?? draggingId)) return;
				e.preventDefault();
				e.stopPropagation();
				if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
				updateDragOver({
					zone,
					target: "__end__"
				});
			}, [draggingId, updateDragOver]);
			const handleDropZone = (0, react.useCallback)((e, zone) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.dataTransfer?.getData("application/x-dsh-panel-id") || e.dataTransfer?.getData("text/plain") || isDraggingRef.current || draggingId;
				commitDrop(id, zone, "__end__");
				handleDragEnd();
			}, [
				commitDrop,
				draggingId,
				handleDragEnd
			]);
			const panelMap = (0, react.useMemo)(() => new Map(panels.map((p) => [p.id, p])), [panels]);
			const fixedPanels = (0, react.useMemo)(() => FIXED_PANEL_IDS.map((id) => panelMap.get(id)).filter((p) => Boolean(p)), [panelMap]);
			const userPinnedPanels = (0, react.useMemo)(() => layout.pinned.map((id) => panelMap.get(id)).filter((p) => Boolean(p)), [layout.pinned, panelMap]);
			const morePanels = (0, react.useMemo)(() => layout.more.map((id) => panelMap.get(id)).filter((p) => Boolean(p)), [layout.more, panelMap]);
			const newSessionShortcut = (0, react.useMemo)(() => getNewSessionShortcut(), []);
			const newSessionButton = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "dcu-sb-row dcu-sb-new-session-row",
				"aria-label": t("sidebar.newSession", "新会话"),
				"aria-keyshortcuts": newSessionShortcut.aria,
				"aria-disabled": startingSession,
				onClick: handleStartSession,
				onKeyDown: (e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleStartSession();
					}
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-sb-glyph",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconNewChat, { size: 16 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-sb-title",
						children: t("sidebar.newSession", "新会话")
					}),
					ShortcutKeys && newSessionShortcut.keys && newSessionShortcut.keys.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-sb-shortcut",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShortcutKeys, { keys: newSessionShortcut.keys })
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: "dcu-sb-root",
				"data-dcu-sb-root": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-sb-section dcu-sb-new-session-section",
						onDragOver: (e) => {
							if (!(isDraggingRef.current ?? draggingId)) return;
							e.preventDefault();
							e.stopPropagation();
							if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
							const firstPanel = layoutRef.current.pinned[0];
							updateDragOver({
								zone: "pinned",
								target: firstPanel ?? "__end__"
							});
						},
						onDrop: (e) => {
							e.preventDefault();
							e.stopPropagation();
							const id = e.dataTransfer?.getData("application/x-dsh-panel-id") || e.dataTransfer?.getData("text/plain") || isDraggingRef.current || draggingId;
							const firstPanel = layoutRef.current.pinned[0];
							commitDrop(id, "pinned", firstPanel ?? "__end__");
							handleDragEnd();
						},
						children: Tooltip ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
							label: t("sidebar.newSession", "新会话"),
							shortcutKeys: newSessionShortcut.keys,
							delayMs: 500,
							side: "right",
							children: newSessionButton
						}) : newSessionButton
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-sb-section dcu-sb-pinned-section",
						"data-zone": "pinned",
						onDragOver: (e) => handleDragOverZone(e, "pinned"),
						onDrop: (e) => handleDropZone(e, "pinned"),
						children: [fixedPanels.map((panel) => {
							const active = activePanelId === panel.id;
							const isPluginsOverAfter = dragOver?.zone === "pinned" && dragOver.target === "__end__" && userPinnedPanels.length === 0;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `dcu-sb-row ${active ? "dcu-sb-row-active" : ""}`,
								"aria-label": panel.label,
								title: t("sidebar.fixed", "始终常驻"),
								"aria-current": active ? "page" : void 0,
								"data-dcu-panel-id": panel.id,
								"data-drag-over": isPluginsOverAfter ? "after" : void 0,
								draggable: false,
								onClick: () => handleSelectPanel(panel.id),
								onKeyDown: (e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleSelectPanel(panel.id);
									}
								},
								onDragOver: (e) => handleDragOverRow(e, panel.id, "pinned"),
								onDragLeave: (e) => handleDragLeaveRow(e, panel.id),
								onDrop: (e) => handleDropRow(e, panel.id, "pinned"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-sb-glyph",
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelIcon, {
										component: panel.component,
										active
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-sb-title",
									children: panel.label
								})]
							}, panel.id);
						}), userPinnedPanels.map((panel, index) => {
							const active = activePanelId === panel.id;
							const isDragging = draggingId === panel.id;
							const isOverBefore = dragOver?.zone === "pinned" && dragOver.target === panel.id;
							const isLast = index === userPinnedPanels.length - 1;
							const isOverAfter = dragOver?.zone === "pinned" && dragOver.target === "__end__" && isLast;
							const overPos = isOverBefore ? "before" : isOverAfter ? "after" : void 0;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `dcu-sb-row ${active ? "dcu-sb-row-active" : ""}`,
								"aria-label": panel.label,
								"aria-current": active ? "page" : void 0,
								"data-dcu-panel-id": panel.id,
								"data-dragging": isDragging ? "true" : void 0,
								"data-drag-over": overPos,
								draggable: true,
								onClick: () => handleSelectPanel(panel.id),
								onKeyDown: (e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleSelectPanel(panel.id);
									}
								},
								onDragStart: (e) => handleDragStart(e, panel.id, panel.label),
								onDragEnd: handleDragEnd,
								onDragOver: (e) => handleDragOverRow(e, panel.id, "pinned"),
								onDragLeave: (e) => handleDragLeaveRow(e, panel.id),
								onDrop: (e) => handleDropRow(e, panel.id, "pinned"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-sb-glyph",
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelIcon, {
										component: panel.component,
										active
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-sb-title",
									children: panel.label
								})]
							}, panel.id);
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-sb-section dcu-sb-more-section",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `dcu-sb-row dcu-sb-more-trigger ${dragOver?.target === "__more_trigger__" ? "dcu-sb-row-active" : ""}`,
							"aria-expanded": moreOpen,
							"aria-label": t("sidebar.more", "更多"),
							"data-drag-over": dragOver?.target === "__more_trigger__" ? "onto" : void 0,
							onClick: () => setMoreOpen((prev) => !prev),
							onKeyDown: (e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									setMoreOpen((prev) => !prev);
								}
							},
							onDragOver: (e) => {
								const currentDragged = isDraggingRef.current ?? draggingId;
								if (!currentDragged) return;
								if (layoutRef.current.more.includes(currentDragged)) return;
								e.preventDefault();
								e.stopPropagation();
								if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
								updateDragOver({
									zone: "more",
									target: "__more_trigger__"
								});
							},
							onDragLeave: () => {
								if (dragOverRef.current?.target === "__more_trigger__") updateDragOver(null);
							},
							onDrop: (e) => {
								const currentDragged = isDraggingRef.current ?? draggingId;
								if (currentDragged && layoutRef.current.more.includes(currentDragged)) return;
								e.preventDefault();
								e.stopPropagation();
								const id = e.dataTransfer?.getData("application/x-dsh-panel-id") || e.dataTransfer?.getData("text/plain") || isDraggingRef.current || draggingId;
								commitDrop(id, "more", "__more_trigger__");
								handleDragEnd();
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-sb-glyph",
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Ellipsis, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dcu-sb-title",
									children: [t("sidebar.more", "更多"), morePanels.length > 0 ? ` (${morePanels.length})` : ""]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `dcu-sb-chevron ${moreOpen ? "dcu-sb-chevron-open" : ""}`,
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronDown, { size: 14 })
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: `dcu-sb-accordion ${moreOpen ? "dcu-sb-accordion-open" : ""}`,
							"data-zone": "more",
							"aria-hidden": !moreOpen,
							onDragOver: (e) => handleDragOverZone(e, "more"),
							onDrop: (e) => handleDropZone(e, "more"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-sb-accordion-content",
								children: [
									morePanels.map((panel, index) => {
										const active = activePanelId === panel.id;
										const isDragging = draggingId === panel.id;
										const isOverBefore = dragOver?.zone === "more" && dragOver.target === panel.id;
										const isLast = index === morePanels.length - 1;
										const isOverAfter = dragOver?.zone === "more" && dragOver.target === "__end__" && isLast;
										const overPos = isOverBefore ? "before" : isOverAfter ? "after" : void 0;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											tabIndex: moreOpen ? void 0 : -1,
											className: `dcu-sb-row ${active ? "dcu-sb-row-active" : ""}`,
											"aria-label": panel.label,
											"aria-current": active ? "page" : void 0,
											"data-dcu-panel-id": panel.id,
											"data-dragging": isDragging ? "true" : void 0,
											"data-drag-over": overPos,
											draggable: true,
											onClick: () => handleSelectPanel(panel.id),
											onKeyDown: (e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													handleSelectPanel(panel.id);
												}
											},
											onDragStart: (e) => handleDragStart(e, panel.id, panel.label),
											onDragEnd: handleDragEnd,
											onDragOver: (e) => handleDragOverRow(e, panel.id, "more"),
											onDragLeave: (e) => handleDragLeaveRow(e, panel.id),
											onDrop: (e) => handleDropRow(e, panel.id, "more"),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dcu-sb-glyph",
												"aria-hidden": "true",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PanelIcon, {
													component: panel.component,
													active
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dcu-sb-title",
												children: panel.label
											})]
										}, panel.id);
									}),
									morePanels.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-sb-empty-drop-hint",
										"data-drag-over": dragOver?.zone === "more" ? "after" : void 0,
										onDragOver: (e) => handleDragOverZone(e, "more"),
										onDrop: (e) => handleDropZone(e, "more"),
										children: t("sidebar.dragToMore", "拖至此处收入更多")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dcu-sb-divider" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										tabIndex: moreOpen ? void 0 : -1,
										className: "dcu-sb-row dcu-sb-footer-row",
										"aria-label": t("sidebar.browsePlugins", "浏览更多插件"),
										draggable: false,
										onClick: handleBrowsePlugins,
										onKeyDown: (e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleBrowsePlugins();
											}
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-sb-glyph",
											"aria-hidden": "true",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconBrowse, { size: 16 })
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-sb-title",
											children: t("sidebar.browsePlugins", "浏览更多插件")
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										tabIndex: moreOpen ? void 0 : -1,
										className: "dcu-sb-row dcu-sb-footer-row",
										"aria-label": t("sidebar.createPlugin", "创建你的插件"),
										draggable: false,
										onClick: handleCreatePlugin,
										onKeyDown: (e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleCreatePlugin();
											}
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-sb-glyph",
											"aria-hidden": "true",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCreate, { size: 16 })
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-sb-title",
											children: t("sidebar.createPlugin", "创建你的插件")
										})]
									})
								]
							})
						})]
					})
				]
			});
		};
		//#endregion
		//#region src/client/sidebar/styles.ts
		/**
		* Codex UI 侧栏导航专属样式：
		* - 对齐宿主 panelRow 指标：36px 高度、0px 圆角、7px 8px 内边距、8px 间距；
		* - 使用 grid-template-rows 实现原位折叠动画；
		* - 原生减弱动画感知支持；
		* - 拖拽放置指示线样式；
		* - 宿主原生 newSession 与 panelList 靶向隐藏。
		*/
		const SIDEBAR_STYLES_ID = "michengai-codex-ui-sidebar-styles";
		const SIDEBAR_ACTIVE_ATTR = "data-dcu-sidebar-active";
		const SIDEBAR_CSS = `
/* 仅在展开态隐藏宿主原生 newSession 和 panelList；折叠收缩态 100% 对齐宿主官方 56px 原生导轨 */
[${SIDEBAR_ACTIVE_ATTR}]:not([class*="collapsed"]) button[class*="newSession"],
[${SIDEBAR_ACTIVE_ATTR}]:not([class*="collapsed"]) nav[class*="panelList"] {
  display: none !important;
}

/* 折叠收缩态下隐藏自研导航，完全回退展示宿主原生折叠导轨（自带全部图标与完整生态） */
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] .dcu-sb-root,
[data-sidebar-collapsed="true"] .dcu-sb-root {
  display: none !important;
}

/* 确保宿主原生 newSession 按钮在折叠态下常驻可见、图标对比度清晰，不依赖 hover */
[${SIDEBAR_ACTIVE_ATTR}][data-sidebar-collapsed="true"] button[class*="newSession"],
[${SIDEBAR_ACTIVE_ATTR}][class*="collapsed"] button[class*="newSession"],
[data-sidebar-collapsed="true"] [${SIDEBAR_ACTIVE_ATTR}] button[class*="newSession"] {
  color: var(--dsw-alias-label-primary, inherit) !important;
  opacity: 1 !important;
}

.dcu-sb-root {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 6px;
  font-size: 14px;
  font-family: inherit;
  line-height: inherit;
  color: var(--dsw-alias-label-primary, inherit);
  -webkit-app-region: no-drag !important;
}

.dcu-sb-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  -webkit-app-region: no-drag !important;
}

.dcu-sb-row {
  appearance: none;
  -webkit-appearance: none;
  height: 36px;
  min-height: 36px;
  max-height: 36px;
  padding: 0 10px;
  margin: 1px 2px;
  width: calc(100% - 4px);
  box-sizing: border-box;
  border-radius: var(--dsw-radius-md, 8px);
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--dsw-alias-label-primary, inherit);
  text-align: left;
  font-size: inherit;
  font-family: inherit;
  font-weight: 400;
  text-decoration: none;
  user-select: none;
  -webkit-user-select: none;
  transition: background 150ms ease, color 150ms ease;
  position: relative;
  outline: none;
  -webkit-app-region: no-drag !important;
}

/* 鼠标悬停胶囊态：对齐宿主交互 hover 底色 */
.dcu-sb-row:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--dsw-alias-label-primary, inherit);
}

.dcu-sb-row:focus-visible {
  outline: 1.5px solid var(--dsw-alias-brand-primary, #4176e6);
  outline-offset: -1px;
}

/* 选中项胶囊高亮态 */
.dcu-sb-row.dcu-sb-row-active {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.12));
  color: var(--dsw-alias-label-primary, inherit);
  font-weight: 500;
}

.dcu-sb-row[data-dragging="true"] {
  opacity: 0.35;
  cursor: grabbing !important;
}

/*
 * 拖拽放置指示线：完全照搬宿主工作区树的落点线画法
 * （12px 高的带子里，左端一个 5x7 的箭头 + 从 x=4 起、高 2px 的横线，颜色用宿主 business 状态色）。
 * 这样侧栏导航和工作区树的落点线是同一个视觉语言，不再是两种粗细/两种颜色。
 */
.dcu-sb-row[data-drag-over="before"]::before,
.dcu-sb-row[data-drag-over="after"]::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 12px;
  pointer-events: none;
  z-index: 10;
  background:
    linear-gradient(
        55deg,
        transparent calc(50% - 1px),
        var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary, #4176e6)) calc(50% - 1px) calc(50% + 1px),
        transparent calc(50% + 1px)
      )
      0 0 / 5px 7px no-repeat,
    linear-gradient(
        125deg,
        transparent calc(50% - 1px),
        var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary, #4176e6)) calc(50% - 1px) calc(50% + 1px),
        transparent calc(50% + 1px)
      )
      0 5px / 5px 7px no-repeat,
    linear-gradient(var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary, #4176e6)) 0 0) 4px 5px /
      calc(100% - 4px) 2px no-repeat;
}

/* 12px 的带子里，横线落在第 5~7px，所以上移 6px 让横线正好压在行边界上。 */
.dcu-sb-row[data-drag-over="before"]::before {
  top: -6px;
}

.dcu-sb-row[data-drag-over="after"]::after {
  bottom: -6px;
}

.dcu-sb-row[data-drag-over="onto"] {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4176e6) 16%, transparent) !important;
  outline: 1.5px dashed var(--dsw-alias-brand-primary, #4176e6) !important;
  outline-offset: -1px;
}

.dcu-sb-drag-ghost {
  position: fixed;
  top: 8px;
  left: -9999px;
  z-index: 10040;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 220px;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-interactive-bg-hover, #2a2a2a);
  color: var(--dsw-alias-label-primary, #fff);
  font-size: 13px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.24);
  white-space: nowrap;
  pointer-events: none;
}

.dcu-sb-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: inherit;
  pointer-events: none;
}

.dcu-sb-glyph svg {
  width: 16px;
  height: 16px;
  display: block;
  pointer-events: none;
}

.dcu-sb-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}

.dcu-sb-shortcut {
  margin-left: auto;
  opacity: 0.65;
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  pointer-events: none;
}

.dcu-sb-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-left: auto;
  color: var(--dsw-alias-label-tertiary, #888);
  transition: transform 150ms var(--ds-ease-in-out, cubic-bezier(0.2, 0, 0, 1));
  pointer-events: none;
}

.dcu-sb-chevron-open {
  transform: rotate(180deg);
}

.dcu-sb-accordion {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 220ms cubic-bezier(0.2, 0, 0, 1), opacity 220ms cubic-bezier(0.2, 0, 0, 1);
  overflow: hidden;
  -webkit-app-region: no-drag !important;
}

.dcu-sb-accordion.dcu-sb-accordion-open {
  grid-template-rows: 1fr;
  opacity: 1;
  /* 保持 hidden：1fr 已经是内容自然高度，切成 visible 会让内容在动画第一帧就整块露出来，
     看起来「没有展开动画」。 */
  overflow: hidden;
}

.dcu-sb-accordion[aria-hidden="true"] {
  pointer-events: none;
}

.dcu-sb-accordion-content {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  -webkit-app-region: no-drag !important;
}

.dcu-sb-accordion.dcu-sb-accordion-open .dcu-sb-accordion-content {
  overflow: hidden;
}

.dcu-sb-empty-drop-hint {
  height: 34px;
  border: 1.5px dashed var(--dsw-alias-brand-primary, #4176e6);
  border-radius: var(--dsw-radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--dsw-alias-brand-primary, #4176e6);
  margin: 2px 2px;
  width: calc(100% - 4px);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4176e6) 10%, transparent);
  user-select: none;
  box-sizing: border-box;
}

.dcu-sb-divider {
  height: 0.5px;
  background: var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  margin: 4px 6px;
  box-sizing: border-box;
}

.dcu-sb-footer-row {
  color: var(--dsw-alias-label-secondary, #a1a1aa);
}

.dcu-sb-footer-row:hover {
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
}

@media (prefers-reduced-motion: reduce) {
  .dcu-sb-accordion,
  .dcu-sb-chevron,
  .dcu-sb-row {
    transition: none !important;
  }
}
`;
		function injectSidebarStyles() {
			if (typeof document === "undefined") return () => {};
			if (document.getElementById("michengai-codex-ui-sidebar-styles")) return () => {};
			const style = document.createElement("style");
			style.id = SIDEBAR_STYLES_ID;
			style.textContent = SIDEBAR_CSS;
			document.head.appendChild(style);
			return () => {
				style.remove();
			};
		}
		//#endregion
		//#region src/client/sidebar/index.ts
		const CONTAINER_CLASS = "dcu-sidebar-nav-root";
		/**
		* 校验侧栏子插件是否在 Host 侧启用。
		* 遵循 fail-closed 原则：404、网络失败或未显式 enabled 时视为关闭并回退官方。
		*/
		async function checkSidebarEnabled() {
			try {
				const base = typeof document !== "undefined" && document.baseURI ? document.baseURI : "http://localhost";
				const normalizedBase = base.endsWith("/") ? base : `${base}/`;
				const path = CODEX_UI_API_ENDPOINTS.sidebar.startsWith("/") ? CODEX_UI_API_ENDPOINTS.sidebar.slice(1) : CODEX_UI_API_ENDPOINTS.sidebar;
				const url = new URL(path, normalizedBase).href;
				const res = await fetch(url);
				if (!res.ok) return false;
				return (await res.json()).enabled === true;
			} catch {
				return false;
			}
		}
		/**
		* 挂载并观察侧栏导航增强：
		* - 只有在子插件探活成功时激活；
		* - 在原生 newSession 前挂载唯一的 React 独立导航容器；
		* - 靶向隐藏原生 newSession 与 panelList，绝不删除或克隆宿主 DOM 节点；
		* - 观察器仅监听挂载容器的存续，彻底切断 DOM 自触发循环；
		* - 卸载时彻底 unmount React Root、移除样式与标记，原生侧栏无损秒级复原。
		*/
		function observeSidebarNav(ctx) {
			let disposed = false;
			let observer = null;
			let cleanupStyles = null;
			let currentContainer = null;
			let currentSidebarRoot = null;
			let rafPending = false;
			let isEnabled = false;
			const teardownMount = () => {
				if (currentContainer) {
					try {
						(0, react_dom.unmountComponentAtNode)(currentContainer);
					} catch {}
					currentContainer.remove();
					currentContainer = null;
				}
				if (currentSidebarRoot) {
					currentSidebarRoot.removeAttribute(SIDEBAR_ACTIVE_ATTR);
					currentSidebarRoot = null;
				}
			};
			const tryMount = () => {
				if (disposed || !isEnabled || typeof document === "undefined") return;
				if (currentContainer && document.contains(currentContainer)) return;
				if (currentContainer) teardownMount();
				const nativeNewSession = document.querySelector("button[class*=\"newSession\"]");
				if (!nativeNewSession) return;
				const sidebarRoot = nativeNewSession.closest("[class*=\"root\"]") || nativeNewSession.parentElement;
				if (!sidebarRoot) return;
				if (!cleanupStyles) cleanupStyles = injectSidebarStyles();
				sidebarRoot.setAttribute(SIDEBAR_ACTIVE_ATTR, "true");
				currentSidebarRoot = sidebarRoot;
				const container = document.createElement("div");
				container.className = CONTAINER_CLASS;
				container.setAttribute("data-dcu-managed", "true");
				sidebarRoot.insertBefore(container, nativeNewSession);
				currentContainer = container;
				(0, react_dom.render)(react.default.createElement(SidebarNav, { ctx }), container);
			};
			const scheduleCheck = () => {
				if (disposed || rafPending) return;
				rafPending = true;
				requestAnimationFrame(() => {
					rafPending = false;
					if (!disposed && isEnabled) tryMount();
				});
			};
			const sync = async () => {
				if (disposed) return;
				const nextEnabled = await checkSidebarEnabled();
				if (disposed) return;
				if (nextEnabled === isEnabled) return;
				isEnabled = nextEnabled;
				if (isEnabled) tryMount();
				else {
					teardownMount();
					if (cleanupStyles) {
						cleanupStyles();
						cleanupStyles = null;
					}
				}
			};
			sync();
			const onFocus = () => {
				sync();
			};
			if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
			if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
				observer = new MutationObserver((mutations) => {
					if (disposed) return;
					let hasForeignChange = false;
					let touchesSettings = false;
					for (const m of mutations) {
						if (m.target instanceof Element && m.target.closest(`.${CONTAINER_CLASS}`)) continue;
						hasForeignChange = true;
						if (!touchesSettings) {
							for (const node of [...m.addedNodes, ...m.removedNodes]) if (node instanceof HTMLElement) {
								if (node.getAttribute("data-shortcut-modal") === "settings" || node.querySelector?.("[data-shortcut-modal=\"settings\"]")) {
									touchesSettings = true;
									break;
								}
							}
						}
					}
					if (touchesSettings) sync();
					else if (hasForeignChange) scheduleCheck();
				});
				observer.observe(document.body, {
					childList: true,
					subtree: true
				});
			}
			return () => {
				disposed = true;
				if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
				if (observer) {
					observer.disconnect();
					observer = null;
				}
				teardownMount();
				if (cleanupStyles) {
					cleanupStyles();
					cleanupStyles = null;
				}
			};
		}
		//#endregion
		//#region src/client/sidebar/sections/model.ts
		/**
		* 工作区「分区」模型（纯函数，不触碰 DOM 与存储）。
		*
		* 分区是插件层的视图结构：宿主的工作区注册表仍是唯一事实来源，
		* 分区只决定「谁排在谁旁边」。因此模型里的分组成员顺序就是最终要写入宿主的顺序，
		* `flattenSections` 的结果与宿主 `workspaces` 的排列应当逐项一致。
		*
		* 不变式：
		* - 始终包含内置分区 `pinned`（置顶）与兜底分区 `default`（项目），且各只有一份；
		* - `default` 永远排在最后，`pinned` 可被拖到任意位置（Codex 同样允许）；
		* - 一个工作区最多出现在一个分区里，未知工作区在归一化时被丢弃。
		*/
		/** 内置「置顶」分区 id：可拖动、可重命名，但不能删除。 */
		const PINNED_SECTION_ID = "pinned";
		/** 兜底「项目」分区 id：固定最后，成员是尚未归类的工作区。 */
		const DEFAULT_SECTION_ID = "default";
		/** 新建用户的默认分区结构：置顶 + 项目，没有自定义分区。 */
		function createSectionsState() {
			return { sections: [{
				id: PINNED_SECTION_ID,
				name: "置顶",
				ids: []
			}, {
				id: DEFAULT_SECTION_ID,
				name: "项目",
				ids: []
			}] };
		}
		/** 判断是否内置分区（置顶与兜底），内置分区不允许删除。 */
		function isBuiltinSection(id) {
			return id === "pinned" || id === "default";
		}
		const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
		/**
		* 解析持久化内容。
		* 结构不合法时返回 `undefined`，由调用方回退默认结构（与侧栏布局解析风格一致）。
		*/
		function parseSections(raw) {
			if (raw === null || raw === void 0 || raw === "") return void 0;
			try {
				const data = JSON.parse(raw);
				if (typeof data !== "object" || data === null) return void 0;
				const sections = data.sections;
				if (!Array.isArray(sections)) return void 0;
				const parsed = [];
				for (const item of sections) {
					if (typeof item !== "object" || item === null) return void 0;
					const record = item;
					if (typeof record.id !== "string" || record.id === "") return void 0;
					if (typeof record.name !== "string") return void 0;
					if (!isStringArray(record.ids)) return void 0;
					parsed.push({
						id: record.id,
						name: record.name,
						ids: record.ids.slice()
					});
				}
				return { sections: parsed };
			} catch {
				return;
			}
		}
		/** 序列化为持久化字符串。 */
		function serializeSections(state) {
			return JSON.stringify({ sections: state.sections });
		}
		/**
		* 用当前实际存在的工作区集合校正分区结构：
		* - 丢弃已删除的工作区、跨分区重复项（保留首次出现）与重复分区 id；
		* - 补齐缺失的内置分区，`default` 固定到最后；
		* - 名称空白的内置分区回退默认名。
		*
		* @param state - 待校正的结构。
		* @param knownIds - 宿主当前存在的工作区 id；省略时只做结构校正，不按存在性裁剪（启动早期宿主可能还没就绪）。
		* @returns 新的、满足不变式的结构。
		*/
		function normalizeSections(state, knownIds) {
			const known = knownIds === void 0 ? void 0 : new Set(knownIds);
			const seenIds = /* @__PURE__ */ new Set();
			const seenSections = /* @__PURE__ */ new Set();
			const sections = [];
			for (const section of state.sections) {
				if (seenSections.has(section.id)) continue;
				seenSections.add(section.id);
				const ids = [];
				for (const id of section.ids) {
					if (seenIds.has(id)) continue;
					if (known !== void 0 && !known.has(id)) continue;
					seenIds.add(id);
					ids.push(id);
				}
				const canonical = defaultNameFor(section.id);
				const name = canonical !== "" ? canonical : section.name.trim();
				sections.push({
					id: section.id,
					name,
					ids
				});
			}
			if (!seenSections.has("pinned")) sections.unshift({
				id: PINNED_SECTION_ID,
				name: defaultNameFor(PINNED_SECTION_ID),
				ids: []
			});
			const defaultIndex = sections.findIndex((section) => section.id === DEFAULT_SECTION_ID);
			if (defaultIndex === -1) sections.push({
				id: DEFAULT_SECTION_ID,
				name: defaultNameFor(DEFAULT_SECTION_ID),
				ids: []
			});
			else if (defaultIndex !== sections.length - 1) {
				const [fallback] = sections.splice(defaultIndex, 1);
				sections.push(fallback);
			}
			return { sections };
		}
		/** 内置分区的默认名称。 */
		function defaultNameFor(id) {
			if (id === "pinned") return "置顶";
			if (id === "default") return "项目";
			return "";
		}
		/** 查找某个工作区所属分区 id。 */
		function sectionOf(state, workspaceId) {
			for (const section of state.sections) if (section.ids.includes(workspaceId)) return section.id;
		}
		/** 按分区顺序摊平出的工作区顺序，即应当写入宿主的顺序。 */
		function flattenSections(state) {
			const order = [];
			for (const section of state.sections) order.push(...section.ids);
			return order;
		}
		/**
		* 把工作区放进指定分区。
		*
		* @param state - 当前结构。
		* @param workspaceId - 目标工作区。
		* @param sectionId - 目标分区。
		* @param index - 分区内插入位置；省略时追加到分区末尾。
		* @returns 新的结构；分区不存在时原样返回。
		*/
		function assignWorkspace(state, workspaceId, sectionId, index) {
			if (state.sections.find((section) => section.id === sectionId) === void 0) return state;
			const sections = state.sections.map((section) => ({
				id: section.id,
				name: section.name,
				ids: section.ids.filter((id) => id !== workspaceId)
			}));
			const next = sections.find((section) => section.id === sectionId);
			const at = index === void 0 ? next.ids.length : Math.max(0, Math.min(index, next.ids.length));
			next.ids.splice(at, 0, workspaceId);
			return { sections };
		}
		/** 新建自定义分区，插到兜底分区之前。 */
		function createSection(state, id, name) {
			const sections = state.sections.map((section) => ({
				...section,
				ids: section.ids.slice()
			}));
			const defaultIndex = sections.findIndex((section) => section.id === DEFAULT_SECTION_ID);
			const at = defaultIndex === -1 ? sections.length : defaultIndex;
			sections.splice(at, 0, {
				id,
				name,
				ids: []
			});
			return { sections };
		}
		/** 重命名分区；名称为空时忽略。 */
		function renameSection(state, sectionId, name) {
			if (isBuiltinSection(sectionId)) return state;
			const trimmed = name.trim();
			if (trimmed === "") return state;
			return { sections: state.sections.map((section) => section.id === sectionId ? {
				...section,
				name: trimmed,
				ids: section.ids.slice()
			} : section) };
		}
		/**
		* 删除自定义分区，成员并入兜底分区末尾。
		* 内置分区（置顶、项目）不可删除，原样返回。
		*/
		function deleteSection(state, sectionId) {
			if (isBuiltinSection(sectionId)) return state;
			const removed = state.sections.find((section) => section.id === sectionId);
			if (removed === void 0) return state;
			return { sections: state.sections.filter((section) => section.id !== sectionId).map((section) => section.id === "default" ? {
				...section,
				ids: [...section.ids, ...removed.ids]
			} : {
				...section,
				ids: section.ids.slice()
			}) };
		}
		/**
		* 用宿主的最新顺序校正归属（用户在原生树上直接拖动项目后调用）。
		*
		* 判定方式：把新旧顺序做前后缀比较，找出唯一被移动的项；它归入「新位置上方最近的邻居」所属分区，
		* 没有上方邻居时归入下方邻居的分区，两侧都没有则落到兜底分区。
		* 其余项保持原归属。返回结构的分区摊平结果与新顺序逐项一致。
		*
		* @param state - 拖动前的结构。
		* @param order - 宿主当前的完整工作区顺序。
		* @returns 校正后的结构与是否发生变化。
		*/
		function reconcileHostOrder(state, order, fallbackSectionId = DEFAULT_SECTION_ID) {
			const assignments = /* @__PURE__ */ new Map();
			for (const section of state.sections) for (const id of section.ids) assignments.set(id, section.id);
			let added = false;
			for (const id of order) if (!assignments.has(id)) {
				assignments.set(id, fallbackSectionId);
				added = true;
			}
			const sections = state.sections.map((section) => {
				const ids = order.filter((id) => assignments.get(id) === section.id);
				return {
					id: section.id,
					name: section.name,
					ids
				};
			});
			const changed = added || sections.some((section, index) => {
				const before = state.sections[index];
				if (before === void 0 || before.ids.length !== section.ids.length) return true;
				return before.ids.some((id, i) => id !== section.ids[i]);
			});
			return {
				state: { sections },
				changed
			};
		}
		//#endregion
		//#region src/client/sidebar/sections/motion.ts
		/**
		* 分区事务的布局动效：宿主仍拥有所有项目节点，只在一次最终布局上做块级 FLIP。
		* 普通原生拖拽不进入此流程；不调用 React 实例或宿主私有动画方法。
		*/
		var SectionLayoutMotion = class {
			list;
			positions = /* @__PURE__ */ new Map();
			animations = /* @__PURE__ */ new Set();
			constructor(list) {
				this.list = list;
				for (const element of Array.from(list.children)) if (element instanceof HTMLElement) this.positions.set(element, element.getBoundingClientRect());
			}
			/** 合并标题与成员最终布局，在同一绘制前替换本次排序的行级位移。 */
			play(layout) {
				for (const row of Array.from(this.list.querySelectorAll("[data-row-key]"))) for (const animation of row.getAnimations?.() ?? []) {
					const effect = animation.effect;
					if (typeof effect?.getKeyframes === "function" && effect.getKeyframes().some((frame) => frame.transform !== void 0)) animation.cancel();
				}
				layout();
				if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
				const finished = Array.from(this.list.children).flatMap((element) => {
					if (!(element instanceof HTMLElement) || typeof element.animate !== "function") return [];
					const before = this.positions.get(element);
					const after = element.getBoundingClientRect();
					if (after.height === 0) return [];
					if (before === void 0 || before.height === 0) return [{
						element,
						keyframes: [{ opacity: 0 }, { opacity: 1 }]
					}];
					const dx = before.left - after.left;
					const dy = before.top - after.top;
					if (dx === 0 && dy === 0) return [];
					return [{
						element,
						keyframes: [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }]
					}];
				}).map(({ element, keyframes }) => {
					const animation = element.animate(keyframes, {
						duration: 200,
						easing: "ease-out"
					});
					this.animations.add(animation);
					return animation.finished.catch(() => {}).then(() => {
						animation.cancel();
						this.animations.delete(animation);
					});
				});
				return Promise.all(finished).then(() => {});
			}
			/** 卸载时取消本实例创建的动画，释放对宿主节点的引用。 */
			dispose() {
				for (const animation of this.animations) animation.cancel();
				this.animations.clear();
				this.positions.clear();
			}
		};
		//#endregion
		//#region src/client/sidebar/sections/order.ts
		/**
		* 生成一次性排序计划，不根据宿主中间帧反复纠偏。
		* 显式操作只允许移动给定的项目；启动恢复才允许调整整表。
		*/
		function planWorkspaceMoves(current, desired, workspaceIds) {
			const order = current.slice();
			const moves = [];
			const move = (workspaceId, beforeWorkspaceId) => {
				if (!order.includes(workspaceId)) return;
				const next = order.filter((id) => id !== workspaceId);
				const at = beforeWorkspaceId === void 0 ? next.length : next.indexOf(beforeWorkspaceId);
				if (at < 0) return;
				next.splice(at, 0, workspaceId);
				if (next.every((id, index) => id === order[index])) return;
				moves.push({
					workspaceId,
					beforeWorkspaceId
				});
				order.splice(0, order.length, ...next);
			};
			if (workspaceIds !== void 0) {
				const moving = new Set(workspaceIds);
				for (let index = desired.length - 1; index >= 0; index -= 1) {
					const id = desired[index];
					if (moving.has(id)) move(id, desired[index + 1]);
				}
			} else for (let index = 0; index < desired.length; index += 1) if (order[index] !== desired[index]) move(desired[index], order[index]);
			return moves;
		}
		let transport = {
			async load() {
				try {
					const response = await fetch(CODEX_UI_API_ENDPOINTS.sections, {
						credentials: "same-origin",
						headers: { accept: "application/json" }
					});
					if (!response.ok) return null;
					const text = await response.text();
					return text.trim() === "" ? null : text;
				} catch {
					return null;
				}
			},
			async save(body) {
				try {
					return (await fetch(CODEX_UI_API_ENDPOINTS.sections, {
						method: "POST",
						credentials: "same-origin",
						headers: { "content-type": "application/json" },
						body
					})).ok;
				} catch {
					return false;
				}
			}
		};
		/**
		* 读取宿主里的分区文档。
		*
		* @returns 原始 JSON 文本；读取失败时返回 `null`，调用方按默认结构启动，不影响侧栏渲染。
		*/
		async function loadSectionsDocument() {
			return transport.load();
		}
		let pending;
		let timer;
		let inFlight;
		async function flush() {
			const body = pending;
			pending = void 0;
			if (body === void 0) return;
			if (!await transport.save(body) && pending === void 0) {
				pending = body;
				scheduleSave();
			}
		}
		/** 立刻把待写内容发出去（切换页面、卸载时使用）。 */
		async function flushSectionsSave() {
			if (timer !== void 0) {
				window.clearTimeout(timer);
				timer = void 0;
			}
			inFlight = flush();
			await inFlight;
			inFlight = void 0;
		}
		function scheduleSave() {
			if (timer !== void 0) window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				timer = void 0;
				if (inFlight !== void 0) return;
				inFlight = flush().finally(() => {
					inFlight = void 0;
				});
			}, 350);
		}
		/**
		* 排队保存分区文档（350ms 合并连续操作，避免拖动时每次移动都打一次请求）。
		*
		* @param body - 完整文档 JSON。
		*/
		function scheduleSectionsSave(body) {
			pending = body;
			scheduleSave();
		}
		//#endregion
		//#region src/client/sidebar/sections/index.ts
		/** 分区标题行的标记属性，样式与测试都靠它定位。 */
		const SECTION_HEADER_ATTR = "data-dcu-ws-section";
		/** 追加在项目行菜单里的入口标记。 */
		const MENU_ITEM_ATTR = "data-dcu-ws-section-item";
		const HEADER_CLASS = "dcu-ws-section";
		const STYLE_ID$2 = "michengai-codex-ui-sections-styles";
		/** 各分区的折叠状态（与本文件的分区数据分键存放）。 */
		const COLLAPSED_STORAGE_KEY = "michengai.codex-ui.workspace-sections-collapsed.v1";
		/**
		* 分区标题、菜单与拖拽指示线的样式。
		* 只吃宿主主题变量，随明暗与主题切换自动跟随；宿主变量缺失时回退中性色。
		*/
		const SECTIONS_CSS = `
.dcu-ws-section{display:flex;align-items:center;gap:4px;height:30px;margin:8px 2px 2px;padding:0 4px 0 var(--dcu-section-lead,6px);font-size:12px;letter-spacing:.2px;color:var(--dsw-alias-label-tertiary,rgba(127,127,127,.95));-webkit-app-region:no-drag;cursor:pointer;border-radius:6px}
.dcu-ws-section:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.10))}
.dcu-ws-section-label{flex:0 0 auto;max-width:70%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 展开/收起三角与宿主项目行同构：16×20 的 slot，里面是 14px 的实心三角，展开旋转 90°。 */
.dcu-ws-section-chevron{display:inline-flex;align-items:center;justify-content:center;flex:none;width:16px;height:20px;color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,#888))}
.dcu-ws-section-chevron svg{display:block;transition:transform .15s var(--ds-ease-in-out,cubic-bezier(.2,0,0,1))}
.dcu-ws-section[data-open='true'] .dcu-ws-section-chevron svg{transform:rotate(90deg)}
.dcu-ws-section-grow{flex:1 1 auto}
.dcu-ws-section-input{flex:1 1 auto;min-width:0;height:22px;padding:0 6px;border-radius:5px;font:inherit;font-size:12.5px;color:var(--dsw-alias-label-primary,inherit);background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.14));border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.4));outline:none}
.dcu-ws-section-editing{margin:4px 2px;padding-left:0}
/* 分区成员不加缩进：项目行以下全是宿主自己的排版（会话行、缩进变量都在里面），
   这里再补 padding 会把整个项目块连同会话一起右移，跟原生不一致。成员标记只用于折叠隐藏。 */
[data-dcu-section-member]{transition:max-height 180ms var(--ds-ease-in-out,cubic-bezier(.2,0,0,1)),opacity 180ms var(--ds-ease-in-out,cubic-bezier(.2,0,0,1))}
[data-dcu-section-hidden='true'],[data-dcu-section-relocating='true']{display:none !important}
/* 与宿主行操作区完全一致：按钮自带 margin:-4px，gap:13px 使视觉净间距为 5px；平时隐藏，悬停/聚焦/菜单打开时显现 */
.dcu-ws-section-actions{display:none;align-items:center;gap:13px;padding-right:6px;flex:none}
@media (hover:hover){.dcu-ws-section:hover .dcu-ws-section-actions{display:inline-flex}}
@media (hover:none){.dcu-ws-section-actions{display:inline-flex}}
.dcu-ws-section:focus-within .dcu-ws-section-actions,.dcu-ws-section[data-menu-open='true'] .dcu-ws-section-actions{display:inline-flex}
.dcu-ws-section-action{width:24px;height:24px;margin:-4px;padding:0;border:0;border-radius:var(--dsw-radius-xs,4px);background:transparent;color:var(--dsw-alias-label-tertiary,inherit);font:inherit;font-size:12px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.dcu-ws-section-action:hover{color:var(--dsw-alias-label-primary,inherit);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.16))}
[data-sidebar-collapsed='true'] .dcu-ws-section{display:none !important}
/* z-index 取宿主顶级浮层的量级：分区标题 ··· 这条路径把面板挂在 body 上，宿主侧边栏/工作区树自己是
   更大的层级，1000 会让侧边栏的行文字压在面板上（表现为「菜单跑到侧边栏后面」）。
   面板本体由宿主 MenuSurface 原语渲染（表面 + material 磨砂层），这里只补壳外的几何与文字颜色，
   不碰填充与模糊——否则会和宿主的 material 叠加成双层，并把它的模糊打成惰性。 */
.dcu-ws-section-menu{position:fixed;z-index:2147483000;min-width:144px;max-width:360px;overflow:visible;padding:4px;display:flex;flex-direction:column;gap:0;border:none;border-radius:var(--dsw-radius-lg,14px);box-shadow:var(--dsw-elevation-prominent,0 6px 20px rgba(0,0,0,.45));color:var(--dsw-alias-label-primary,#ededed);isolation:isolate}
/* 滚动搬进内层：面板自身必须 overflow:visible，否则下面的 8px 透明桥会被横向裁掉 */
.dcu-ws-section-menu-scroll{display:flex;flex-direction:column;gap:0;min-height:0;flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;max-height:inherit}
/* 父菜单与二级菜单之间有一小段空隙：铺一条透明桥，指针穿过去时不会触发离开事件。 */
.dcu-ws-section-menu[data-flyout='true']::before{content:'';position:absolute;top:0;bottom:0;left:-6px;width:8px}
/* 行样式一律交由宿主类名（克隆行自带），这里不再覆盖 button 的 padding / 圆角 / 字号，
   否则二级菜单的行与一级菜单的行会出现可见差异。 */
.dcu-ws-section[data-dcu-section-fixed='true']{cursor:default}
/* 跨分区拖拽拦截时以 CSS 隐藏宿主落点线，绝不侵入修改宿主 React 的 DOM className；移回合法区自然恢复 */
body[data-dcu-drag-blocked='true'] [class*="workspaceDropBefore"]::before,
body[data-dcu-drag-blocked='true'] [class*="workspaceDropAfter"]::after,
body[data-dcu-drag-blocked='true'] [class*="dropBefore"]::before,
body[data-dcu-drag-blocked='true'] [class*="dropAfter"]::after{display:none !important}

`;
		/** 注入分区样式；已存在时复用（样式与组件生命周期解耦，卸载不摘除）。 */
		function injectStyles() {
			if (document.getElementById(STYLE_ID$2) !== null) return;
			const style = document.createElement("style");
			style.id = STYLE_ID$2;
			style.textContent = SECTIONS_CSS;
			document.head.appendChild(style);
		}
		/** 内置分区的显示名走本地化；用户改过名则用用户的名字。 */
		function localizeBuiltinName(sectionId, storedName, text) {
			if (sectionId === "pinned") return text("sections.pinned", "置顶");
			if (sectionId === "default") return text("sections.default", "项目");
			return storedName;
		}
		const MENU_CLASS = "dcu-ws-section-menu";
		/** 从行节点上读出工作区 id：`data-row-key="workspace:<id>"`，未分组桶为空串。 */
		function workspaceIdOfRow(row) {
			const key = row.getAttribute("data-row-key");
			if (key === null || !key.startsWith("workspace:")) return void 0;
			const id = key.slice(10);
			return id === "" ? void 0 : id;
		}
		/**
		* 列表是否属于侧栏的「工作区」区块。
		*
		* 频道、定时等页签下也会出现树形列表，只有同时满足下面三条才算工作区，避免把分区标题塞进别的列表：
		* 不在 rail（侧栏收起）形态里、同一区域的区块标题带有多颗操作按钮、列表里确有项目行。
		*/
		function isWorkspaceRegion(list) {
			if (list.querySelector("[data-row-key^=\"workspace:\"]") === null) return false;
			let node = list.parentElement;
			for (let level = 0; level < 4 && node !== null; level += 1) {
				const header = node.querySelector("[class*=\"sectionHeader\"]");
				if (header !== null) {
					const actions = header.querySelector("[class*=\"headerActions\"]");
					if (actions !== null && actions.querySelectorAll("button").length >= 2) return true;
				}
				node = node.parentElement;
			}
			return false;
		}
		/** 收集原生列表里的项目分组块，按 DOM 顺序。 */
		function collectProjectBlocks(root, list) {
			const container = list ?? findWorkspaceList(root);
			if (container === void 0) return [];
			const blocks = [];
			for (const row of Array.from(root.querySelectorAll("[data-row-key^=\"workspace:\"]"))) {
				const workspaceId = workspaceIdOfRow(row);
				if (workspaceId === void 0) continue;
				const block = blockOf(row, container);
				if (block !== null) blocks.push({
					workspaceId,
					block
				});
			}
			return blocks;
		}
		/**
		* 找到承载全部项目行的滚动列表。
		*
		* 宿主结构是 `div[role=tree].list > div.groupSection > span > div[data-row-key]`，
		* 直接取 `row.parentElement.parentElement` 只会拿到第一个分组块内部，标题就会全挤在最上面。
		* 这里改成语义判定：从第一行向上找到「同时包含所有行」的祖先。
		*/
		function findWorkspaceList(root) {
			const rows = Array.from(root.querySelectorAll("[data-row-key^=\"workspace:\"]")).filter((row) => workspaceIdOfRow(row) !== void 0);
			if (rows.length === 0) return void 0;
			const first = rows[0];
			const last = rows[rows.length - 1];
			let node = first.parentElement;
			let treeCandidate;
			let anyCandidate;
			while (node !== null) {
				if (node.contains(last) && isWorkspaceRegion(node)) {
					if (node.getAttribute("role") === "tree") treeCandidate = node;
					else anyCandidate = node;
				}
				node = node.parentElement;
			}
			return treeCandidate ?? anyCandidate;
		}
		/** 行所属的分组块：行到列表之间、父节点就是列表的那一层。 */
		function blockOf(row, list) {
			let node = row instanceof HTMLElement ? row : null;
			while (node !== null && node.parentElement !== list) node = node.parentElement;
			return node;
		}
		/**
		* 观察并驱动工作区分区。
		*
		* @param ctx - 客户端根 Context。
		* @returns 释放函数；卸载后标题、监听与在途写入全部撤销。
		*/
		let activeInstance;
		function observeWorkspaceSections(ctx, translate) {
			if (typeof document === "undefined") return () => {};
			const text = (key, fallback) => {
				try {
					const value = translate?.(key, fallback);
					return value === void 0 || value === "" ? fallback : value;
				} catch {
					return fallback;
				}
			};
			injectStyles();
			activeInstance?.();
			let disposed = false;
			let state = createSectionsState();
			/** 分区文档是否已从宿主导入；未导入前不渲染标题、不做顺序写入。 */
			let sectionsLoaded = false;
			let list;
			let baselineSet = false;
			const RELOCATING_ATTR = "data-dcu-section-relocating";
			const RELOCATING_TIMEOUT_MS = 1500;
			/** 正在等候异步顺序落地的新建工作区 ID，避免延迟流帧造成置顶/相邻分组闪烁或错位。 */
			const relocatingIds = /* @__PURE__ */ new Set();
			let relocatingCleanupTimer;
			/** 记录上一次稳定布局后各分区标题的 offsetTop，用于与宿主 AnimatedRows 同步补间。 */
			const lastHeaderOffsets = /* @__PURE__ */ new WeakMap();
			const syncedHostAnimations = /* @__PURE__ */ new WeakSet();
			const activeHeaderSyncAnimations = /* @__PURE__ */ new WeakMap();
			function clearRelocating() {
				relocatingIds.clear();
				if (relocatingCleanupTimer !== void 0) {
					window.clearTimeout(relocatingCleanupTimer);
					relocatingCleanupTimer = void 0;
				}
				for (const node of Array.from(document.querySelectorAll(`[${RELOCATING_ATTR}]`))) node.removeAttribute(RELOCATING_ATTR);
			}
			function markRelocating(ids) {
				for (const id of ids) relocatingIds.add(id);
				if (relocatingCleanupTimer !== void 0) window.clearTimeout(relocatingCleanupTimer);
				relocatingCleanupTimer = window.setTimeout(() => {
					relocatingCleanupTimer = void 0;
					if (disposed || relocatingIds.size === 0) return;
					if (list !== void 0) cancelHostRowAnimations(list);
					clearRelocating();
					syncNow();
				}, RELOCATING_TIMEOUT_MS);
			}
			function cancelHostRowAnimations(container) {
				for (const row of Array.from(container.querySelectorAll("[data-row-key]"))) for (const animation of row.getAnimations?.() ?? []) {
					const effect = animation.effect;
					if (typeof effect?.getKeyframes === "function" && effect.getKeyframes().some((frame) => frame.transform !== void 0)) animation.cancel();
				}
			}
			function recordHeaderOffsets() {
				for (const header of headers.values()) {
					if (!header.isConnected) continue;
					lastHeaderOffsets.set(header, {
						parent: header.offsetParent,
						top: header.offsetTop
					});
				}
			}
			/**
			* 宿主展开/收起工作区或新建空白会话时，AnimatedRows 只对 [data-row-key] 行做 200ms 平滑位移；
			* 若插件分区标题原地瞬移，就会与下方行发生错位/重影碰撞。在绘制前同步补间位移量即可同频共舞。
			*/
			function syncHeadersWithHostMotion(container) {
				if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
					recordHeaderOffsets();
					return;
				}
				let hasFreshHostMove = false;
				for (const row of Array.from(container.querySelectorAll("[data-row-key^=\"workspace:\"]"))) for (const animation of row.getAnimations?.() ?? []) {
					if (syncedHostAnimations.has(animation)) continue;
					const effect = animation.effect;
					if (typeof effect?.getKeyframes === "function" && effect.getKeyframes().some((frame) => frame.transform !== void 0)) {
						syncedHostAnimations.add(animation);
						hasFreshHostMove = true;
					}
				}
				const moves = [];
				for (const header of headers.values()) {
					if (!header.isConnected) continue;
					const prev = lastHeaderOffsets.get(header);
					const currParent = header.offsetParent;
					const currTop = header.offsetTop;
					if (hasFreshHostMove && prev !== void 0 && prev.parent === currParent && typeof header.animate === "function") {
						let currentTranslateY = 0;
						const running = activeHeaderSyncAnimations.get(header);
						if (running !== void 0 && running.playState === "running") {
							const transform = window.getComputedStyle(header).transform;
							if (transform !== "" && transform !== "none" && typeof DOMMatrix === "function") currentTranslateY = new DOMMatrix(transform).m42;
						}
						const dy = prev.top + currentTranslateY - currTop;
						if (Math.abs(dy) >= .5) moves.push({
							header,
							dy
						});
					}
					lastHeaderOffsets.set(header, {
						parent: currParent,
						top: currTop
					});
				}
				for (const { header, dy } of moves) {
					activeHeaderSyncAnimations.get(header)?.cancel();
					const anim = header.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], {
						duration: 200,
						easing: "ease-out"
					});
					activeHeaderSyncAnimations.set(header, anim);
					anim.finished.catch(() => {}).then(() => {
						if (activeHeaderSyncAnimations.get(header) === anim) activeHeaderSyncAnimations.delete(header);
						anim.cancel();
					});
				}
			}
			let activeUpdate;
			let writeGen = 0;
			let waitNotice;
			let noticeTimer;
			const clearWriteWait = () => {
				writeGen += 1;
				if (noticeTimer !== void 0) window.clearTimeout(noticeTimer);
				noticeTimer = void 0;
				waitNotice?.remove();
				waitNotice = void 0;
			};
			const showAbortedNotice = () => {
				if (disposed || list?.parentElement === null || list === void 0) return;
				clearWriteWait();
				waitNotice = document.createElement("div");
				waitNotice.setAttribute("data-dcu-sections-wait", "aborted");
				waitNotice.setAttribute("role", "alert");
				waitNotice.textContent = text("sections.writeAborted", "工作区移动未完成，已自动撤销。");
				waitNotice.style.cssText = "padding: 8px 12px; font-size: 12px; color: var(--dsw-alias-text-danger, #ef4444);";
				list.parentElement.insertBefore(waitNotice, list);
				const notice = waitNotice;
				noticeTimer = window.setTimeout(() => {
					noticeTimer = void 0;
					if (waitNotice === notice) {
						notice.remove();
						waitNotice = void 0;
					}
				}, 4e3);
			};
			const insertWorkspace = async (service, workspaceId, beforeWorkspaceId) => {
				const curGen = ++writeGen;
				const timer8s = window.setTimeout(() => {
					if (disposed || writeGen !== curGen || list?.parentElement === null || list === void 0) return;
					waitNotice?.remove();
					waitNotice = document.createElement("div");
					waitNotice.setAttribute("data-dcu-sections-wait", "");
					waitNotice.setAttribute("role", "status");
					waitNotice.textContent = text("sections.writePending", "工作区移动尚未完成，后续操作正在等待宿主响应。");
					waitNotice.style.cssText = "padding: 8px 12px; font-size: 12px; color: var(--dsw-alias-text-secondary, inherit);";
					list.parentElement.insertBefore(waitNotice, list);
				}, 8e3);
				let timer20s;
				try {
					await Promise.race([service.insertBefore(workspaceId, beforeWorkspaceId), new Promise((_, reject) => {
						timer20s = window.setTimeout(() => {
							if (writeGen === curGen) reject(/* @__PURE__ */ new Error("宿主响应超时 (20s)"));
						}, 2e4);
					})]);
				} finally {
					window.clearTimeout(timer8s);
					if (timer20s !== void 0) window.clearTimeout(timer20s);
					if (writeGen === curGen) {
						waitNotice?.remove();
						waitNotice = void 0;
					}
				}
			};
			const updates = [];
			let committedState = state;
			let wired = false;
			let syncing = false;
			let rafId = 0;
			let observer;
			let unsubscribe;
			const headers = /* @__PURE__ */ new Map();
			let menuHost;
			/** 取消「分区」行上待触发的收起定时器：指针移到二级菜单上时由面板侧调用。 */
			let cancelAnchorLeave;
			/** 取消二级菜单自身待触发的收起定时器：指针移回行上时由行侧调用。 */
			let cancelPanelLeave;
			/** 「分区 ›」二级菜单当前是否展开：菜单行会被重新注入，展开态必须按这个标志落到新节点上。 */
			let assignExpanded = false;
			/** 当前二级菜单的锚点（「分区」那一行），悬停重复触发时用来去重。 */
			let assignAnchor;
			/**
			* 检查宿主是否已挂载目录选择流能力（`sidebar.workspaces.directoryFlow`）。
			* 仅当官方 slots 服务就绪且该 slot 被占用时显示分区内「添加工作区」按钮；
			* slots 缺失或未占用时不渲染无效入口，避免出现只能走兜底快捷键的残缺状态。
			*/
			const isDirectoryFlowAvailable = () => typeof ctx.slots?.entries === "function" && ctx.slots.entries("sidebar.workspaces.directoryFlow").length > 0;
			/**
			* 等待新工作区自动归属的目标分区 ID。
			* 用户在某个分区的菜单里点击「新建工作区」后暂存，当宿主创建新工作区时自动将其分配到该分区。
			*/
			let pendingTargetSectionId;
			let pendingTargetCleanupTimer;
			let triggeringHostAdd = false;
			function clearPendingTarget() {
				pendingTargetSectionId = void 0;
				if (pendingTargetCleanupTimer !== void 0) {
					window.clearTimeout(pendingTargetCleanupTimer);
					pendingTargetCleanupTimer = void 0;
				}
			}
			function schedulePendingTargetCleanup() {
				if (pendingTargetCleanupTimer !== void 0) window.clearTimeout(pendingTargetCleanupTimer);
				pendingTargetCleanupTimer = window.setTimeout(() => {
					pendingTargetCleanupTimer = void 0;
					pendingTargetSectionId = void 0;
				}, 9e4);
			}
			/**
			* 宿主顶栏/侧栏头部原生「添加工作区」按钮的 8 门精确文案（同步自宿主 `workspace.add`）。
			* 仅做精确全等匹配：既能绕开宿主工作区行右键菜单（`工作区“…”的操作`）与带省略号的菜单项（`添加工作区…`），
			* 又与下方选择器对 `[data-context-menu-trigger]`、`[aria-haspopup="menu"]` 及 `[data-row-key]` 的排除构成双重防护。
			*/
			const HOST_ADD_WORKSPACE_LABELS = /* @__PURE__ */ new Set([
				"添加工作区",
				"Add workspace",
				"ワークスペースを追加",
				"Agregar espacio de trabajo",
				"Ajouter un espace de travail",
				"Arbeitsbereich hinzufügen",
				"Добавить рабочую область",
				"Adicionar espaço de trabalho"
			]);
			function isHostAddWorkspaceButton(btn) {
				if (btn.hasAttribute("data-dcu-action")) return false;
				if (btn.hasAttribute("data-context-menu-trigger") || btn.getAttribute("aria-haspopup") === "menu") return false;
				if (btn.closest("[data-row-key]") !== null) return false;
				const shortcuts = btn.getAttribute("aria-keyshortcuts") ?? "";
				if (/\bo\b/i.test(shortcuts) || /(?:^|\+)o$/i.test(shortcuts)) return true;
				const label = btn.getAttribute("aria-label")?.trim() ?? "";
				return HOST_ADD_WORKSPACE_LABELS.has(label);
			}
			function findHostAddWorkspaceButton() {
				const candidates = document.querySelectorAll("button:not([data-dcu-action]):not([data-context-menu-trigger]):not([aria-haspopup=\"menu\"])");
				for (const btn of candidates) if (isHostAddWorkspaceButton(btn)) return btn;
				return null;
			}
			function triggerHostAddWorkspace() {
				triggeringHostAdd = true;
				try {
					const hostAddBtn = findHostAddWorkspaceButton();
					if (hostAddBtn !== null) {
						hostAddBtn.click();
						return;
					}
					const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
					const event = new KeyboardEvent("keydown", {
						code: "KeyO",
						key: "o",
						ctrlKey: !isMac,
						metaKey: isMac,
						bubbles: true,
						cancelable: true
					});
					document.dispatchEvent(event);
				} finally {
					triggeringHostAdd = false;
				}
			}
			function startAddWorkspaceToSection(sectionId) {
				pendingTargetSectionId = sectionId;
				schedulePendingTargetCleanup();
				triggerHostAddWorkspace();
			}
			function onDocumentClickClearPending(event) {
				if (triggeringHostAdd || pendingTargetSectionId === void 0) return;
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.closest(`.${HEADER_CLASS}-actions`) !== null) return;
				const menuitem = target.closest("[role=\"menuitem\"]");
				if (menuitem !== null && !menuitem.hasAttribute("data-dcu-action")) {
					const normalized = (menuitem.textContent ?? "").trim().replace(/[….]+\s*$/, "").trim();
					if (HOST_ADD_WORKSPACE_LABELS.has(normalized)) clearPendingTarget();
					return;
				}
				const btn = target.closest("button");
				if (btn !== null && isHostAddWorkspaceButton(btn)) clearPendingTarget();
			}
			function onDocumentKeydownClearPending(event) {
				if (triggeringHostAdd || pendingTargetSectionId === void 0) return;
				if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === "KeyO") clearPendingTarget();
			}
			const workspaces = () => {
				const service = ctx.get?.("workspaces");
				if (service === void 0 || service === null) return void 0;
				const candidate = service;
				if (typeof candidate.insertBefore !== "function" || candidate.list === void 0) return void 0;
				return candidate;
			};
			const knownIds = () => {
				const service = workspaces();
				if (service === void 0) return [];
				try {
					return service.list.getSnapshot().items.map((item) => item.workspaceId);
				} catch {
					return [];
				}
			};
			const domOrder = () => collectProjectBlocks(list ?? document, list).map((block) => block.workspaceId);
			/**
			* 从宿主导入分区文档。
			*
			* 宿主读不到（接口未就绪、首次运行）时按默认结构启动：只有「置顶 + 项目」两个内置分区，
			* 首次同步会把宿主现有工作区顺序采纳进「项目」，与以前的全新安装行为一致。
			*/
			async function loadStateFromHost() {
				let raw = null;
				try {
					raw = await loadSectionsDocument();
				} catch {
					raw = null;
				}
				state = normalizeSections(parseSections(raw) ?? { sections: [] });
				committedState = state;
				sectionsLoaded = true;
				scheduleSync();
			}
			/** 分区文档写回宿主；失败不阻塞界面，下一次用户操作会再触发保存。 */
			function persist(value = state) {
				if (!sectionsLoaded) return;
				scheduleSectionsSave(serializeSections(value));
			}
			function commit(next) {
				commitExplicit(next, []);
			}
			/** 保留显式移动身份；在宿主确认且真实列表到位之前，不提前修改标题和折叠标记。 */
			function commitExplicit(next, workspaceIds, suppressMotion = false) {
				if (disposed) return;
				state = next;
				updates.push({
					next,
					workspaceIds,
					rpcDone: false,
					suppressMotion
				});
				startNextUpdate();
			}
			function syncHeaderAddButton(header, sectionId, name, available) {
				const actions = header.querySelector(`.${HEADER_CLASS}-actions`);
				if (actions === null) return;
				const existing = actions.querySelector("[data-dcu-action=\"add-workspace\"]");
				if (available) {
					if (existing === null) actions.appendChild(buildAddWorkspaceActionButton(sectionId, name));
				} else if (existing !== null) existing.remove();
			}
			function ensureHeader(sectionId, name) {
				const displayName = localizeBuiltinName(sectionId, name, text);
				let header = headers.get(sectionId);
				if (header !== void 0 && header.isConnected) {
					const label = header.querySelector(`.${HEADER_CLASS}-label`);
					if (label !== null && label.textContent !== displayName) label.textContent = displayName;
					syncHeaderAddButton(header, sectionId, displayName, isDirectoryFlowAvailable());
					return header;
				}
				header = document.createElement("div");
				header.className = HEADER_CLASS;
				header.setAttribute(SECTION_HEADER_ATTR, sectionId);
				if (isBuiltinSection(sectionId)) header.setAttribute("data-dcu-section-fixed", "true");
				header.draggable = false;
				header.tabIndex = 0;
				header.dataset.open = collapsed[sectionId] === true ? "false" : "true";
				const label = document.createElement("span");
				label.className = `${HEADER_CLASS}-label`;
				label.textContent = displayName;
				header.appendChild(label);
				const chevron = document.createElement("span");
				chevron.className = `${HEADER_CLASS}-chevron`;
				chevron.innerHTML = iconChevron();
				header.appendChild(chevron);
				const grow = document.createElement("span");
				grow.className = `${HEADER_CLASS}-grow`;
				header.appendChild(grow);
				const actions = document.createElement("span");
				actions.className = `${HEADER_CLASS}-actions`;
				actions.appendChild(buildHeaderActionButton(sectionId, displayName));
				header.appendChild(actions);
				syncHeaderAddButton(header, sectionId, displayName, isDirectoryFlowAvailable());
				header.addEventListener("click", (event) => {
					if (event.target instanceof Element && event.target.closest(`.${HEADER_CLASS}-actions`) !== null) return;
					toggleSection(sectionId);
				});
				header.addEventListener("keydown", (event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						toggleSection(sectionId);
					}
				});
				headers.set(sectionId, header);
				return header;
			}
			/**
			* 分区标题右侧的「添加工作区」快捷按钮（位于 `···` 右侧）：
			* 复用宿主项目行图标按钮外壳与宿主原生 `IconProjectAddOutlineRegular` 图标。
			* 置顶、项目和自定义分区均有此按钮。
			*/
			function buildAddWorkspaceActionButton(sectionId, name) {
				const hostButton = document.querySelector("[data-row-key^=\"workspace:\"] [class*=\"rowActions\"] button");
				let button;
				if (hostButton !== null) {
					button = hostButton.cloneNode(true);
					button.removeAttribute("aria-keyshortcuts");
					button.removeAttribute("tabindex");
					button.removeAttribute("aria-haspopup");
					button.removeAttribute("aria-expanded");
					button.removeAttribute("data-context-menu-trigger");
				} else {
					button = document.createElement("button");
					button.className = `${HEADER_CLASS}-action`;
				}
				button.innerHTML = iconProjectAdd();
				button.setAttribute("type", "button");
				button.setAttribute("data-dcu-action", "add-workspace");
				const addLabel = text("sections.addWorkspace", "添加工作区");
				button.setAttribute("aria-label", `${name} ${addLabel}`);
				button.setAttribute("title", addLabel);
				button.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					startAddWorkspaceToSection(sectionId);
				});
				return button;
			}
			/** 分区标题右侧的 `···`：直接克隆宿主项目行的原生图标按钮，样式与宿主完全一致。 */
			function buildHeaderActionButton(sectionId, name) {
				const hostButton = document.querySelector("[data-row-key^=\"workspace:\"] [class*=\"rowActions\"] button");
				let button;
				if (hostButton !== null) {
					button = hostButton.cloneNode(true);
					button.removeAttribute("aria-keyshortcuts");
					button.removeAttribute("tabindex");
				} else {
					button = document.createElement("button");
					button.className = `${HEADER_CLASS}-action`;
					button.textContent = "···";
				}
				button.setAttribute("type", "button");
				button.setAttribute("data-dcu-action", "more");
				button.setAttribute("aria-label", `${name} ${text("sections.settings", "分区设置")}`);
				button.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					openSectionMenu(sectionId, button);
				});
				return button;
			}
			function toggleSection(sectionId) {
				const header = headers.get(sectionId);
				const collapse = !(header?.dataset.open === "false");
				collapsed[sectionId] = collapse;
				persistCollapsed();
				if (header !== void 0) header.dataset.open = collapse ? "false" : "true";
				animateSectionMembers(sectionId, collapse);
				scheduleSync();
			}
			/** 正在做折叠动画的分区：这段时间里 placeHeaders 不要改写成员的显示状态。 */
			const animatingSections = /* @__PURE__ */ new Set();
			/** 每个分区最近一次折叠动画的代号，用来丢弃过期回调。 */
			const animationGeneration = /* @__PURE__ */ new Map();
			/**
			* 折叠/展开动画。
			*
			* 成员是宿主的分组块，不能包容器，所以对块本身做 max-height 过渡（经典稳妥做法）：
			* 先量出当前高度写成具体 px，再过渡到 0；展开反向。用 max-height 而不是 `height:auto`
			* 是因为宿主块内部有自己的布局，auto 插值在逐帧重排时会互相压住（表现为项目文件夹重叠）。
			*/
			function animateSectionMembers(sectionId, collapse) {
				const blocks = Array.from(document.querySelectorAll(`[data-dcu-section-member="${sectionId}"]`));
				if (blocks.length === 0) return;
				const generation = (animationGeneration.get(sectionId) ?? 0) + 1;
				animationGeneration.set(sectionId, generation);
				animatingSections.add(sectionId);
				for (const block of blocks) {
					if (!block.isConnected) continue;
					if (collapse) {
						block.removeAttribute("data-dcu-section-hidden");
						block.style.overflow = "hidden";
						const height = block.offsetHeight;
						block.style.maxHeight = `${height}px`;
						block.style.opacity = "1";
						block.offsetHeight;
						block.style.maxHeight = "0px";
						block.style.opacity = "0";
					} else {
						block.removeAttribute("data-dcu-section-hidden");
						block.style.overflow = "hidden";
						block.style.maxHeight = "0px";
						block.style.opacity = "0";
						block.offsetHeight;
						const targetHeight = Math.max(block.scrollHeight, block.offsetHeight || 40);
						block.style.maxHeight = `${targetHeight}px`;
						block.style.opacity = "1";
					}
				}
				window.setTimeout(() => {
					if (animationGeneration.get(sectionId) !== generation) return;
					blocks.forEach((block) => {
						if (!block.isConnected) return;
						block.style.removeProperty("max-height");
						block.style.removeProperty("overflow");
						block.style.removeProperty("opacity");
						if (collapse) block.setAttribute("data-dcu-section-hidden", "true");
						else block.removeAttribute("data-dcu-section-hidden");
					});
					animatingSections.delete(sectionId);
					scheduleSync();
				}, 210);
			}
			function readCollapsed() {
				try {
					const raw = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
					if (raw === null) return {};
					const parsed = JSON.parse(raw);
					return typeof parsed === "object" && parsed !== null ? parsed : {};
				} catch {
					return {};
				}
			}
			function persistCollapsed() {
				try {
					window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(collapsed));
				} catch {}
			}
			/** 上一次算对齐时的（标题数+列宽）组合，避免每帧量 rect。 */
			let lastAlignKey = "";
			/** 把标题按分区顺序放到各自第一个分组块前面；空分区贴着下一个分区显示。 */
			function placeHeaders(blocks, layoutState = state) {
				if (blocks.length === 0) {
					const stalePinned = headers.get(PINNED_SECTION_ID);
					if (stalePinned !== void 0) {
						stalePinned.remove();
						headers.delete(PINNED_SECTION_ID);
						if (collapsed["pinned"] === true) {
							delete collapsed[PINNED_SECTION_ID];
							persistCollapsed();
						}
					}
					return;
				}
				const target = blocks[0].block.parentElement;
				if (target === null) return;
				const ungrouped = Array.from(list?.querySelectorAll("[data-row-key=\"workspace:\"]") ?? []).map((row) => row instanceof HTMLElement ? blockOf(row, list) : null).find((block) => block !== null);
				const byId = new Map(blocks.map((item) => [item.workspaceId, item.block]));
				const visibleById = relocatingIds.size === 0 ? byId : new Map(blocks.filter((item) => !relocatingIds.has(item.workspaceId)).map((item) => [item.workspaceId, item.block]));
				let reference = null;
				for (let index = layoutState.sections.length - 1; index >= 0; index -= 1) {
					const section = layoutState.sections[index];
					const first = section.ids.map((id) => visibleById.get(id)).find((block) => block !== void 0);
					if (first !== void 0) reference = first;
					else if (section.id === "default" && ungrouped !== void 0) reference = ungrouped;
					if (section.id === "pinned" && section.ids.length === 0) {
						const stale = headers.get(PINNED_SECTION_ID);
						if (stale !== void 0) {
							stale.remove();
							headers.delete(PINNED_SECTION_ID);
							if (collapsed["pinned"] === true) {
								delete collapsed[PINNED_SECTION_ID];
								persistCollapsed();
							}
						}
						continue;
					}
					const header = ensureHeader(section.id, section.name);
					if (header.parentElement !== target || header.nextElementSibling !== reference) target.insertBefore(header, reference);
					reference = header;
				}
				const memberOf = /* @__PURE__ */ new Map();
				for (const section of layoutState.sections) for (const id of section.ids) memberOf.set(id, section.id);
				for (const block of blocks) {
					if (relocatingIds.has(block.workspaceId)) block.block.setAttribute(RELOCATING_ATTR, "true");
					else block.block.removeAttribute(RELOCATING_ATTR);
					const sectionId = memberOf.get(block.workspaceId);
					if (sectionId === void 0) {
						block.block.removeAttribute("data-dcu-section-member");
						block.block.removeAttribute("data-dcu-section-hidden");
						continue;
					}
					block.block.setAttribute("data-dcu-section-member", sectionId);
					if (animatingSections.has(sectionId)) continue;
					if (headers.get(sectionId)?.dataset.open === "false") block.block.setAttribute("data-dcu-section-hidden", "true");
					else {
						block.block.removeAttribute("data-dcu-section-hidden");
						block.block.style.removeProperty("max-height");
						block.block.style.removeProperty("overflow");
						block.block.style.removeProperty("opacity");
					}
				}
				const alignKey = `${headers.size}:${list?.clientWidth ?? 0}`;
				const label = document.querySelector("[class*=\"sectionLabel\"]");
				const firstHeader = layoutState.sections.map((section) => headers.get(section.id)).find((header) => header !== void 0);
				if (label !== null && firstHeader !== void 0 && alignKey !== lastAlignKey) {
					lastAlignKey = alignKey;
					const lead = Math.max(0, Math.round(label.getBoundingClientRect().left - firstHeader.getBoundingClientRect().left));
					for (const header of headers.values()) header.style.setProperty("--dcu-section-lead", `${lead}px`);
				}
				if (ungrouped !== void 0) {
					ungrouped.setAttribute("data-dcu-section-member", DEFAULT_SECTION_ID);
					if (!animatingSections.has("default")) {
						if (headers.get("default")?.dataset.open === "false") ungrouped.setAttribute("data-dcu-section-hidden", "true");
						else {
							ungrouped.removeAttribute("data-dcu-section-hidden");
							ungrouped.style.removeProperty("max-height");
							ungrouped.style.removeProperty("overflow");
							ungrouped.style.removeProperty("opacity");
						}
					}
				}
				for (const [id, header] of Array.from(headers.entries())) if (!layoutState.sections.some((section) => section.id === id)) {
					header.remove();
					headers.delete(id);
				}
			}
			/** 列表不在工作区视图（频道、定时、rail 收起）时摘掉标题，避免串到别的列表里。 */
			function detachHeaders() {
				for (const header of headers.values()) header.remove();
				headers.clear();
			}
			/** 清理「内部 pointerout 截断」监听（每次开面板重新挂，closeSectionMenu 里释放）。 */
			let flyoutExitCleanup;
			/**
			* 截断子面板与父菜单之间「同一菜单内部」的 out 事件，避免宿主把跨 React 根的内部移动
			* 判成离开菜单。真正移出菜单（related 落在菜单外）的事件原样放行。
			*/
			function guardFlyoutExit(parentMenu, container) {
				const inside = (node, root) => node instanceof Node && root.contains(node);
				const handler = (event) => {
					const related = event.relatedTarget;
					if (!(related instanceof Node)) return;
					if (inside(related, container)) {
						event.stopPropagation();
						return;
					}
					if (inside(event.target, container) && inside(related, parentMenu)) event.stopPropagation();
				};
				parentMenu.addEventListener("pointerout", handler);
				parentMenu.addEventListener("mouseout", handler);
				return () => {
					parentMenu.removeEventListener("pointerout", handler);
					parentMenu.removeEventListener("mouseout", handler);
				};
			}
			function closeSectionMenu() {
				flyoutExitCleanup?.();
				flyoutExitCleanup = void 0;
				if (menuHost !== void 0) {
					(0, react_dom.unmountComponentAtNode)(menuHost);
					menuHost.remove();
				}
				assignExpanded = false;
				assignAnchor?.setAttribute("aria-expanded", "false");
				for (const h of headers.values()) h.removeAttribute("data-menu-open");
				cancelPanelLeave = void 0;
				menuHost = void 0;
				assignAnchor = void 0;
			}
			/**
			* 分区自己的菜单面板：直接用宿主原语渲染 —— `MenuSurface`（表面 + material 磨砂层）
			* 与 `MenuItemButton`（行）。既不手绘控件，也不依赖「页面上已经开着某个宿主菜单」，
			* 所以冷启动第一次点分区标题的 `···` 同样能弹出来。
			*
			* 嵌套在宿主行菜单里时挂进父菜单内部（outside-click 判定视为菜单内部，指针移入不会关父菜单）；
			* 独立打开时挂到 body。
			*/
			function openHostPanel(anchor, items, flyoutFrom) {
				closeSectionMenu();
				const parentMenu = flyoutFrom?.isConnected === true ? flyoutFrom : anchor.closest("[role=\"menu\"]");
				const { MenuSurface, MenuItemButton } = _deepseek_ai_dsh_client_ui_primitives;
				if (MenuSurface === void 0 || MenuItemButton === void 0) return;
				const container = document.createElement("div");
				container.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;z-index:2147483000;margin:0;padding:0;border:0;background:transparent;overflow:visible;inset:auto";
				if (parentMenu !== null && parentMenu !== void 0) {
					parentMenu.appendChild(container);
					flyoutExitCleanup?.();
					flyoutExitCleanup = guardFlyoutExit(parentMenu, container);
				} else document.body.appendChild(container);
				(0, react_dom.flushSync)(() => {
					(0, react_dom.render)((0, react.createElement)(MenuSurface, {
						role: "menu",
						"aria-label": text("sections.menu", "分区"),
						className: MENU_CLASS,
						"data-dcu-menu-surface": "true",
						...parentMenu === null || parentMenu === void 0 ? {} : { "data-flyout": "true" }
					}, (0, react.createElement)("div", { className: `${MENU_CLASS}-scroll` }, items.map((item) => (0, react.createElement)(MenuItemButton, {
						key: item.label,
						icon: (0, react.createElement)("span", {
							style: { display: "inline-flex" },
							dangerouslySetInnerHTML: { __html: item.icon }
						}),
						onSelect: () => {
							closeSectionMenu();
							item.onSelect();
						}
					}, item.label)))), container);
				});
				try {
					container.setAttribute("popover", "manual");
					container.showPopover?.();
				} catch {}
				let leaveTimer;
				const cancelLeave = () => {
					if (leaveTimer === void 0) return;
					window.clearTimeout(leaveTimer);
					leaveTimer = void 0;
				};
				cancelPanelLeave = cancelLeave;
				container.addEventListener("mouseenter", () => {
					cancelAnchorLeave?.();
					cancelLeave();
				});
				container.addEventListener("mouseleave", () => {
					cancelLeave();
					leaveTimer = window.setTimeout(() => {
						leaveTimer = void 0;
						closeSectionMenu();
					}, 180);
				});
				container.addEventListener("pointerdown", (event) => event.stopPropagation());
				container.addEventListener("mousedown", (event) => event.stopPropagation());
				container.addEventListener("keydown", (event) => {
					const rows = Array.from(container.querySelectorAll("[role=\"menuitem\"]"));
					if (rows.length === 0) return;
					if (event.key === "Home" || event.key === "End") {
						event.preventDefault();
						event.stopPropagation();
						rows[event.key === "Home" ? 0 : rows.length - 1]?.focus();
						return;
					}
					if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
					const index = rows.indexOf(document.activeElement);
					if (!(event.key === "ArrowDown" ? index === rows.length - 1 : index <= 0)) return;
					event.preventDefault();
					event.stopPropagation();
				});
				menuHost = container;
				const surface = container.querySelector("[data-dcu-menu-surface]");
				if (surface !== null) {
					const rect = anchor.getBoundingClientRect();
					const width = surface.offsetWidth || 196;
					const height = surface.offsetHeight || 120;
					const maxHeight = Math.max(140, Math.min(360, window.innerHeight - 20));
					surface.style.maxHeight = `${maxHeight}px`;
					if (parentMenu !== null && parentMenu !== void 0) {
						const parentRect = parentMenu.getBoundingClientRect();
						let left = parentRect.right + 2;
						if (left + width > window.innerWidth - 10) left = Math.max(10, parentRect.left - width - 4);
						let top = rect.top - 4;
						if (top + Math.min(height, maxHeight) > window.innerHeight - 10) top = Math.max(10, window.innerHeight - Math.min(height, maxHeight) - 10);
						surface.style.left = `${left}px`;
						surface.style.top = `${top}px`;
					} else {
						surface.style.left = `${Math.max(8, Math.min(rect.left + 4, window.innerWidth - width - 8))}px`;
						surface.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - height - 8))}px`;
					}
				}
				container.style.visibility = "visible";
			}
			function openSectionMenu(sectionId, anchor) {
				const section = state.sections.find((item) => item.id === sectionId);
				if (section === void 0) return;
				const builtin = sectionId === "pinned" || sectionId === "default";
				const items = [];
				if (!builtin) items.push({
					label: text("sections.rename", "重命名"),
					icon: iconEdit(),
					onSelect: () => {
						closeSectionMenu();
						startRename(sectionId);
					}
				});
				items.push({
					label: text("sections.new", "新建分区"),
					icon: iconPlus(),
					onSelect: () => {
						closeSectionMenu();
						startCreateSection();
					}
				});
				if (!builtin) items.push({
					label: text("sections.remove", "移除分区"),
					icon: iconClose(),
					onSelect: () => {
						closeSectionMenu();
						headers.get(sectionId)?.remove();
						headers.delete(sectionId);
						commitExplicit(deleteSection(state, sectionId), section.ids);
					}
				});
				openHostPanel(anchor, items);
				headers.get(sectionId)?.setAttribute("data-menu-open", "true");
			}
			/** 标题原地改名：只把标签换成输入框，不碰宿主节点。 */
			let editingInput;
			function startRename(sectionId) {
				const header = headers.get(sectionId);
				const label = header?.querySelector(`.${HEADER_CLASS}-label`);
				if (header === void 0 || label === null || label === void 0) return;
				const section = state.sections.find((item) => item.id === sectionId);
				if (section === void 0) return;
				label.style.display = "none";
				const input = document.createElement("input");
				input.className = `${HEADER_CLASS}-input`;
				input.value = section.name;
				input.maxLength = 24;
				header.insertBefore(input, label);
				input.focus();
				input.select();
				editingInput = input;
				const finish = (commitValue) => {
					if (editingInput !== input) return;
					editingInput = void 0;
					const value = input.value.trim();
					input.remove();
					label.style.display = "";
					if (commitValue && value !== "") commit(renameSection(state, sectionId, value));
				};
				input.addEventListener("keydown", (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						finish(true);
					} else if (event.key === "Escape") {
						event.preventDefault();
						finish(false);
					}
				});
				input.addEventListener("blur", () => finish(true));
			}
			/** 新建分区：在列表里插一行输入框，回车创建（宿主 web 里 window.prompt 被禁用，所以不用 prompt）。 */
			function startCreateSection(workspaceId) {
				const host = findWorkspaceList(document);
				if (host === void 0) return;
				const row = document.createElement("div");
				row.className = `${HEADER_CLASS} ${HEADER_CLASS}-editing`;
				const input = document.createElement("input");
				input.className = `${HEADER_CLASS}-input`;
				input.placeholder = text("sections.newName", "新分区名称");
				input.maxLength = 24;
				row.appendChild(input);
				const lastHeader = Array.from(headers.values()).at(-1);
				if (lastHeader !== void 0 && lastHeader.parentElement === host) host.insertBefore(row, lastHeader.nextSibling);
				else host.insertBefore(row, host.firstChild);
				input.focus();
				let done = false;
				const finish = (commitValue) => {
					if (done) return;
					done = true;
					const value = input.value.trim();
					row.remove();
					if (!commitValue || value === "") return;
					const id = `s${Date.now().toString(36)}`;
					const created = createSection(state, id, value);
					if (workspaceId === void 0) commit(created);
					else commitExplicit(assignWorkspace(created, workspaceId, id), [workspaceId]);
				};
				input.addEventListener("keydown", (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						finish(true);
					} else if (event.key === "Escape") {
						event.preventDefault();
						finish(false);
					}
				});
				input.addEventListener("blur", () => finish(true));
			}
			function onKeydownToCloseSectionMenu(event) {
				if (event.key !== "Escape" || menuHost === void 0) return;
				closeSectionMenu();
			}
			function onPointerdownToCloseSectionMenu(event) {
				if (menuHost === void 0) return;
				if (event.target instanceof Node && menuHost.contains(event.target)) return;
				closeSectionMenu();
			}
			document.addEventListener("keydown", onKeydownToCloseSectionMenu, true);
			document.addEventListener("pointerdown", onPointerdownToCloseSectionMenu, true);
			/**
			* 保留项目之间的原生拖拽排序，同时严格禁止跨分区拖拽（跨分区转移全靠菜单操作）。
			*
			* 1. 同分区内部：完全放行宿主原生的拖拽排序事件，顺序变化由 reconcileHostOrder 自动持久化。
			* 2. 跨分区或分区标题：在捕获阶段拦截 dragover 与 drop，显示禁止符号，阻止跨分区落点。
			*/
			let draggingWorkspaceId;
			let draggingSectionId;
			/**
			* 跨分区拖拽拦截时切换 body 标记。
			* 由 CSS 控制宿主伪元素显隐，完全不触碰宿主 DOM className，
			* 移回同分区时落点线瞬时自然恢复，且避免 60Hz 遍历整个 DOM 树。
			*/
			function setDragBlocked(blocked) {
				if (blocked) {
					if (!document.body.hasAttribute("data-dcu-drag-blocked")) document.body.setAttribute("data-dcu-drag-blocked", "true");
				} else if (document.body.hasAttribute("data-dcu-drag-blocked")) document.body.removeAttribute("data-dcu-drag-blocked");
			}
			function onWorkspaceDragStart(event) {
				setDragBlocked(false);
				const target = event.target;
				if (!(target instanceof Element)) return;
				const row = target.closest("[data-row-key^=\"workspace:\"]");
				if (row === null) return;
				const workspaceId = (row.getAttribute("data-row-key") ?? "").slice(10);
				if (!workspaceId) return;
				draggingWorkspaceId = workspaceId;
				draggingSectionId = sectionOf(state, workspaceId);
			}
			function onWorkspaceDragOver(event) {
				if (draggingWorkspaceId === void 0 || draggingSectionId === void 0) return;
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.closest(`.${HEADER_CLASS}`) !== null) {
					if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
					setDragBlocked(true);
					event.stopPropagation();
					return;
				}
				let targetWorkspaceId;
				const targetRow = target.closest("[data-row-key^=\"workspace:\"]");
				if (targetRow !== null) targetWorkspaceId = (targetRow.getAttribute("data-row-key") ?? "").slice(10);
				else {
					const rowInGroup = target.closest("[class*=\"groupSection\"]")?.querySelector("[data-row-key^=\"workspace:\"]");
					if (rowInGroup) targetWorkspaceId = (rowInGroup.getAttribute("data-row-key") ?? "").slice(10);
				}
				if (targetWorkspaceId !== void 0 && targetWorkspaceId !== "") {
					if (sectionOf(state, targetWorkspaceId) !== draggingSectionId) {
						if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
						setDragBlocked(true);
						event.stopPropagation();
					} else {
						event.preventDefault();
						if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
						setDragBlocked(false);
					}
				}
			}
			function onWorkspaceDrop(event) {
				setDragBlocked(false);
				if (draggingWorkspaceId === void 0 || draggingSectionId === void 0) return;
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.closest(`.${HEADER_CLASS}`) !== null) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}
				const targetRow = target.closest("[data-row-key^=\"workspace:\"]");
				if (targetRow !== null) {
					const targetWorkspaceId = (targetRow.getAttribute("data-row-key") ?? "").slice(10);
					if (sectionOf(state, targetWorkspaceId) !== draggingSectionId) {
						event.preventDefault();
						event.stopPropagation();
					}
				}
			}
			function onWorkspaceDragEnd() {
				setDragBlocked(false);
				draggingWorkspaceId = void 0;
				draggingSectionId = void 0;
			}
			document.addEventListener("dragstart", onWorkspaceDragStart, true);
			document.addEventListener("dragover", onWorkspaceDragOver, true);
			document.addEventListener("drop", onWorkspaceDrop, true);
			document.addEventListener("dragend", onWorkspaceDragEnd, true);
			/**
			* 对齐归档管理器规范：从行内操作区精准定位“···”操作菜单触发按钮。
			* 优先匹配 aria-haspopup="menu"，排除星标按钮与新建会话按钮，避免行内按钮顺序变化时误判。
			*/
			function isStarButton(btn) {
				const className = btn.getAttribute("class") ?? "";
				if (className.includes("dsham_rowStar") || className.includes("star")) return true;
				if (typeof btn.closest === "function" && Boolean(btn.closest(".dsham_starSlot"))) return true;
				return false;
			}
			/**
			* 语义不匹配就返回 null（与归档管理器的 `findRowMenuButton` 一致）：
			* 未分组伪工作区的行里 `rowActions` 只有「新建会话」，退回 `buttons[0]` 会把它当成
			* 菜单锚点，右键/点击时给一个不存在的菜单做注入准备。
			*/
			function findRowMenuButton(row) {
				const actions = row.querySelector("[class*=\"rowActions\"]");
				if (!actions) return null;
				const buttons = Array.from(actions.querySelectorAll("button"));
				if (buttons.length === 0) return null;
				return buttons.find((btn) => {
					if (isStarButton(btn)) return false;
					if (btn.getAttribute("aria-haspopup") === "menu") return true;
					const label = (btn.getAttribute("aria-label") ?? btn.getAttribute("title") ?? "").toLowerCase();
					if (/new|create|新建|add|\+|созда/.test(label)) return false;
					return /action|操作|действи|more|更多|选项|options|menu/.test(label);
				}) ?? null;
			}
			function isRowMenuButton(button, row) {
				if (findRowMenuButton(row) === button) return true;
				const label = (button.getAttribute("aria-label") ?? button.getAttribute("title") ?? "").toLowerCase();
				if (/new|create|新建|add|\+|созда/.test(label)) return false;
				return /action|操作|действи|more|更多|选项|options|menu/.test(label);
			}
			/**
			* 从触发目标元素反查对应的工作区行节点，严格过滤会话行与菜单内部元素。
			*/
			function projectRowOfMenuButton(target) {
				const row = target.closest("[data-row-key]");
				if (row === null) return null;
				if (!(row.getAttribute("data-row-key") ?? "").startsWith("workspace:")) return null;
				const button = target.closest("button");
				if (button !== null) return isRowMenuButton(button, row) ? row : null;
				return row;
			}
			/**
			* 项目行 `···` 一按下就记下目标工作区。
			*
			* 宿主的菜单在 **pointerdown** 阶段就挂载（不是 click），等到 click 再注入必然晚一帧以上，
			* 用户看到的就是「菜单先出来，置顶/分区过一会儿才冒出来」。
			* 键盘回车没有 pointerdown，所以保留 click 兜底。
			*/
			function prepareMenuInjection(target) {
				if (target.closest("[role=\"menu\"]") !== null) return;
				if (target.closest("[data-row-key^=\"session:\"]") !== null) {
					assigningWorkspaceId = void 0;
					return;
				}
				const row = projectRowOfMenuButton(target);
				if (row === null) {
					assigningWorkspaceId = void 0;
					return;
				}
				assigningWorkspaceId = workspaceIdOfRow(row);
				injectMenuEntry();
			}
			function onPointerdownToPrepareMenu(event) {
				if (event.target instanceof Element) prepareMenuInjection(event.target);
			}
			function onClickToPrepareMenu(event) {
				if (event.target instanceof Element) prepareMenuInjection(event.target);
			}
			/** 对齐归档管理器规范：支持在工作区行上右键直接唤起操作菜单与分区入口 */
			function onContextMenuToPrepareMenu(event) {
				const target = event.target;
				if (!target) return;
				if (target.closest("input, textarea, [contenteditable='true']")) return;
				const row = target.closest("[data-row-key^=\"workspace:\"]");
				if (!row) return;
				const clickedButton = target.closest("button");
				if (clickedButton && !isRowMenuButton(clickedButton, row)) return;
				if (!findRowMenuButton(row)) return;
				const id = workspaceIdOfRow(row);
				if (id) {
					assigningWorkspaceId = id;
					injectMenuEntry();
				}
			}
			document.addEventListener("pointerdown", onPointerdownToPrepareMenu, true);
			document.addEventListener("click", onClickToPrepareMenu, true);
			document.addEventListener("click", onDocumentClickClearPending, true);
			document.addEventListener("keydown", onDocumentKeydownClearPending, true);
			document.addEventListener("contextmenu", onContextMenuToPrepareMenu, true);
			let unsubscribeDirectoryFlow;
			try {
				if (typeof ctx.slots?.subscribe === "function") unsubscribeDirectoryFlow = ctx.slots.subscribe("sidebar.workspaces.directoryFlow", () => {
					if (disposed) return;
					const available = isDirectoryFlowAvailable();
					if (!available) clearPendingTarget();
					for (const [id, header] of headers.entries()) syncHeaderAddButton(header, id, localizeBuiltinName(id, state.sections.find((item) => item.id === id)?.name ?? id, text), available);
				});
			} catch {
				unsubscribeDirectoryFlow = void 0;
			}
			/**
			* 用宿主自己的图标组件渲染出静态 SVG。
			* 手绘图标在描边粗细、圆角与视觉重心上永远差一档，直接复用宿主原语才能和原生菜单项完全同源。
			*/
			const iconCache = /* @__PURE__ */ new Map();
			function hostIconMarkup(name, size = 16) {
				const cacheKey = `${name}:${size}`;
				const cached = iconCache.get(cacheKey);
				if (cached !== void 0) return cached;
				const Component = _deepseek_ai_dsh_client_ui_primitives[name];
				if (typeof Component !== "function") {
					iconCache.set(cacheKey, "");
					return "";
				}
				let markup = "";
				const host = document.createElement("div");
				try {
					(0, react_dom.render)((0, react.createElement)(Component, {
						size,
						"aria-hidden": true
					}), host);
					markup = host.innerHTML;
				} catch {
					markup = "";
				} finally {
					(0, react_dom.unmountComponentAtNode)(host);
				}
				iconCache.set(cacheKey, markup);
				return markup;
			}
			/**
			* 图标全部取自宿主 primitives（RC 版本就有这些名字，别再自己画、也别依赖 sprite）：
			* `IconPinOutlineRegular` / `IconPinFillRegular` / `IconChecklistOutlineRegular` /
			* `IconCheckOutlineRegular` / `IconPlusOutlineRegular` / `IconEditOutlineRegular` /
			* `IconCloseOutlineRegular` / `IconTriangleRightFillRegular`。
			*/
			const iconPin = () => hostIconMarkup("IconPinOutlineRegular");
			const iconPinned = () => hostIconMarkup("IconPinFillRegular");
			const iconSection = () => hostIconMarkup("IconChecklistOutlineRegular");
			const iconPlus = () => hostIconMarkup("IconPlusOutlineRegular");
			const FALLBACK_PROJECT_ADD_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" width=\"16\" height=\"16\" fill=\"none\" stroke-width=\"1.2\"><path d=\"M5.54492 2.06738C5.91034 2.06754 6.26318 2.20149 6.53711 2.44336L7.94043 3.68164V4.7998C7.71462 4.74105 7.50367 4.63139 7.32617 4.47461L5.87598 3.19238C5.78477 3.11185 5.66658 3.06754 5.54492 3.06738H2.94922C2.67322 3.06738 2.44946 3.29145 2.44922 3.56738V12.4326C2.44927 12.7087 2.67311 12.9326 2.94922 12.9326H12.9326C13.2086 12.9325 13.4326 12.7086 13.4326 12.4326V8.53613H14.4326V12.4326C14.4326 13.2609 13.7609 13.9325 12.9326 13.9326H2.94922C2.12083 13.9326 1.44927 13.261 1.44922 12.4326V3.56738C1.44946 2.73916 2.12094 2.06738 2.94922 2.06738H5.54492Z\" fill=\"currentColor\"/><path d=\"M9.75977 4.50208H14.5509\" stroke=\"currentColor\"/><path d=\"M12.1492 6.89758L12.1492 2.10642\" stroke=\"currentColor\"/></svg>";
			/** 宿主原生「添加工作区」图标（带加号的工作区轮廓）。 */
			const iconProjectAdd = () => {
				const markup = hostIconMarkup("IconProjectAddOutlineRegular", 16);
				return markup !== "" ? markup : FALLBACK_PROJECT_ADD_SVG;
			};
			/** 分区展开箭头：和宿主项目行同一颗 `IconTriangleRightFillRegular`，展开时旋转 90°。 */
			const iconChevron = () => hostIconMarkup("IconTriangleRightFillRegular");
			const iconEdit = () => hostIconMarkup("IconEditOutlineRegular");
			const iconClose = () => hostIconMarkup("IconCloseOutlineRegular");
			/**
			* 按宿主菜单项的行结构复制一行，保证图标槽、字号、悬停与危险态样式完全一致。
			* 宿主一行是 `div > button[role=menuitem](span 图标 + span 文案)`，因此克隆整行最稳。
			*/
			function buildMenuRow(reference, icon, label, attribute, template, tailIcon) {
				const wrapper = template ?? reference?.parentElement;
				if (wrapper === void 0 || wrapper === null) return null;
				const row = wrapper.cloneNode(true);
				row.querySelectorAll("button").forEach((button) => {
					if (button !== row.querySelector("button")) button.remove();
				});
				const button = row.querySelector("button");
				if (button === null) return null;
				button.removeAttribute("disabled");
				button.style.opacity = "";
				button.style.cursor = "";
				if (attribute !== "") button.setAttribute(attribute, "true");
				button.querySelectorAll("[class*=\"shortcut\"], [aria-keyshortcuts]").forEach((el) => el.remove());
				const spans = Array.from(button.querySelectorAll(":scope > span"));
				const iconSlot = spans[0];
				const labelSlot = button.querySelector("[class*=\"itemLabel\"], [class*=\"label\"]") ?? spans.slice(1).find((span) => span.children.length === 0 || span.textContent !== "") ?? spans[spans.length - 1];
				if (iconSlot === void 0 || labelSlot === void 0 || iconSlot === labelSlot) return null;
				spans.forEach((span) => {
					if (span !== iconSlot && span !== labelSlot) span.remove();
				});
				iconSlot.innerHTML = icon;
				labelSlot.textContent = label;
				if (tailIcon !== void 0 && tailIcon !== "") {
					const tail = document.createElement("span");
					tail.style.marginLeft = "auto";
					tail.style.opacity = "0.65";
					tail.style.display = "inline-flex";
					tail.style.alignItems = "center";
					tail.innerHTML = tailIcon;
					button.appendChild(tail);
				}
				return row;
			}
			function injectMenuEntry(attempt = 0) {
				if (disposed) return;
				if (assigningWorkspaceId === void 0) return;
				if (document.querySelector(`[data-dcu-ws-section-item]`) !== null) return;
				const menus = Array.from(document.querySelectorAll("[role=\"menu\"]")).filter((item) => !isOwnPanel(item));
				const rendered = menus.filter((menu) => menu.querySelector("button[role=\"menuitem\"]") !== null);
				const menu = rendered[rendered.length - 1] ?? (hostMenuRowTemplate === void 0 ? void 0 : menus[menus.length - 1]);
				if (menu === void 0) {
					if (attempt < 6) window.setTimeout(() => injectMenuEntry(attempt + 1), 20);
					return;
				}
				const menuItemsText = Array.from(menu.querySelectorAll("button[role=\"menuitem\"]")).map((b) => b.textContent ?? "").join(" ");
				if (menuItemsText.includes("置顶会话") || menuItemsText.includes("分叉会话") || menuItemsText.includes("删除会话") || menuItemsText.includes("Session ID") || menuItemsText.includes("移动到工作区") || /\b(session|fork|sitzung|séance|сесси|сеанс|sessão|sesión)\b/i.test(menuItemsText) || menuItemsText.includes("セッション") || menuItemsText.includes("сеанс") || menuItemsText.includes("sesión")) {
					assigningWorkspaceId = void 0;
					return;
				}
				const reference = Array.from(menu.querySelectorAll("button[role=\"menuitem\"]")).find((button) => button.closest("[role=\"menu\"]") === menu);
				const template = hostMenuRowTemplate;
				let container = reference?.parentElement?.parentElement;
				if (container === void 0 || container === null) {
					if (template === void 0) return;
					container = menu.firstElementChild ?? menu;
				}
				if (reference !== void 0 && template === void 0) {}
				if (reference !== void 0 && hostMenuRowTemplate === void 0 && !isOwnPanel(reference)) hostMenuRowTemplate = reference.parentElement?.cloneNode(true);
				const workspaceId = assigningWorkspaceId;
				if (workspaceId === void 0) return;
				const pinned = sectionOf(state, workspaceId) === PINNED_SECTION_ID;
				const pinRow = buildMenuRow(reference, pinned ? iconPinned() : iconPin(), text(pinned ? "sections.unpin" : "sections.pin", pinned ? "取消置顶" : "置顶"), MENU_ITEM_ATTR, hostMenuRowTemplate);
				const sectionRow = buildMenuRow(reference, iconSection(), text("sections.menu", "分区"), MENU_ITEM_ATTR, hostMenuRowTemplate, "<svg viewBox=\"0 0 16 16\" width=\"12\" height=\"12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 12L10 8L6 4\"/></svg>");
				/**
				* 插到宿主菜单行所在的同一个父亲里、紧挨在第一条宿主行之前。
				*
				* 归档插件就是这么做的：先拿到宿主行的外层 wrapper，再把克隆行插进「wrapper 的父亲」。
				* 这样我们的行和宿主的行是亲兄弟，共用同一块菜单表面；换成自己猜容器的话，
				* 某些布局下（桌面端）拿到的会是外壳层，行就被渲染成一个独立浮层。
				*/
				const hostWrap = reference?.parentElement ?? null;
				const hostParent = hostWrap?.parentElement ?? container;
				const insertBeforeNode = hostWrap !== null && hostWrap.parentElement === hostParent ? hostWrap : container.firstChild;
				if (pinRow !== null) {
					pinRow.querySelector("button")?.addEventListener("click", (event) => {
						event.preventDefault();
						event.stopPropagation();
						closeMenusByEscape();
						commitExplicit(assignWorkspace(state, workspaceId, pinned ? DEFAULT_SECTION_ID : PINNED_SECTION_ID), [workspaceId]);
					});
					hostParent.insertBefore(pinRow, insertBeforeNode);
				}
				if (sectionRow !== null) {
					const anchorButton = sectionRow.querySelector("button");
					if (anchorButton !== null) {
						anchorButton.setAttribute("aria-haspopup", "menu");
						anchorButton.setAttribute("aria-expanded", assignExpanded ? "true" : "false");
						let hoverTimer;
						const cancelHover = () => {
							if (hoverTimer === void 0) return;
							window.clearTimeout(hoverTimer);
							hoverTimer = void 0;
						};
						cancelAnchorLeave = cancelHover;
						anchorButton.addEventListener("mouseenter", () => {
							cancelHover();
							cancelPanelLeave?.();
							hoverTimer = window.setTimeout(() => {
								hoverTimer = void 0;
								if (menuHost !== void 0 && !menuHost.isConnected) closeSectionMenu();
								if (menuHost !== void 0 && assignAnchor === anchorButton) return;
								openAssignMenu(anchorButton, menu);
							}, 90);
						});
						anchorButton.addEventListener("mouseleave", () => {
							cancelHover();
							hoverTimer = window.setTimeout(() => {
								hoverTimer = void 0;
								if (assignAnchor === anchorButton) closeSectionMenu();
							}, 180);
						});
						anchorButton.addEventListener("click", (event) => {
							event.preventDefault();
							event.stopPropagation();
							cancelHover();
							openAssignMenu(anchorButton, menu);
						});
					}
					hostParent.insertBefore(sectionRow, pinRow?.nextSibling ?? insertBeforeNode);
				}
			}
			/** 让宿主菜单按它自己的 Escape 语义关闭，避免我们自己猜关闭逻辑。 */
			function closeMenusByEscape() {
				document.dispatchEvent(new KeyboardEvent("keydown", {
					key: "Escape",
					bubbles: true,
					cancelable: true
				}));
			}
			let assigningWorkspaceId;
			/** 宿主菜单表面与菜单行的克隆模板：分区菜单复用它们，样式才与原生一致。 */
			let hostMenuRowTemplate;
			/** 宿主菜单的外壳与内容容器：真正的底色/模糊画在 viewport 上，必须整层复用。 */
			let collapsed = readCollapsed();
			function openAssignMenu(anchor, parentMenu) {
				const workspaceId = assigningWorkspaceId;
				if (workspaceId === void 0) return;
				const current = sectionOf(state, workspaceId);
				/**
				* 只列「能移动过去」的目标：
				* - 当前所在的分区不列（移到自己那儿没意义）；
				* - 置顶也不列——父菜单里已经有独立的一行「置顶 / 取消置顶」，重复出现只会让人犹豫。
				*/
				const items = state.sections.filter((section) => section.id !== current && section.id !== "pinned").map((section) => ({
					label: section.name,
					icon: iconSection(),
					onSelect: () => {
						closeSectionMenu();
						closeMenusByEscape();
						commitExplicit(assignWorkspace(state, workspaceId, section.id), [workspaceId]);
					}
				}));
				items.push({
					label: text("sections.new", "新建分区"),
					icon: iconPlus(),
					onSelect: () => {
						closeSectionMenu();
						closeMenusByEscape();
						startCreateSection(workspaceId);
					}
				});
				openHostPanel(anchor, items, parentMenu);
				if (menuHost !== void 0) {
					assignAnchor = anchor;
					assignExpanded = true;
					anchor.setAttribute("aria-expanded", "true");
				}
			}
			/**
			* 消费正在等待中的新建工作区目标分区。
			* 只要 ids 中出现了 referenceState 尚未记录的新增工作区，且 pendingTargetSectionId 有效，
			* 即立刻消费并清除 pendingTargetSectionId（避免被后续写入吞掉或重复触发），同时自动展开目标分区。
			*/
			function consumeTargetForNewIds(ids, referenceState) {
				const target = pendingTargetSectionId;
				if (target === void 0) return void 0;
				if (!ids.some((id) => sectionOf(referenceState, id) === void 0)) return void 0;
				pendingTargetSectionId = void 0;
				if (pendingTargetCleanupTimer !== void 0) {
					window.clearTimeout(pendingTargetCleanupTimer);
					pendingTargetCleanupTimer = void 0;
				}
				if (collapsed[target] === true) {
					collapsed[target] = false;
					persistCollapsed();
					const targetHeader = headers.get(target);
					if (targetHeader !== void 0) targetHeader.dataset.open = "true";
				}
				return target;
			}
			/** 新增项目进入指定或默认分区，删除项目及时裁剪；不改变既有成员的显式归属。 */
			function withHostWorkspaces(value, ids, fallbackSectionId = DEFAULT_SECTION_ID) {
				let next = normalizeSections(value, ids);
				for (const id of ids) if (sectionOf(next, id) === void 0) next = assignWorkspace(next, id, fallbackSectionId);
				return next;
			}
			/** 一次只执行一个确定的计划；请求未结束时绝不超时重发同一条写入。 */
			function startNextUpdate() {
				if (disposed || activeUpdate !== void 0) return;
				const update = updates.shift();
				if (update === void 0) return;
				const ids = knownIds();
				const original = new Set(flattenSections(update.next));
				const target = consumeTargetForNewIds(ids, update.next) ?? "default";
				update.next = withHostWorkspaces(update.next, ids, target);
				const additions = ids.filter((id) => !original.has(id));
				const movingIds = update.workspaceIds === void 0 ? void 0 : additions.length === 0 ? update.workspaceIds : [...update.workspaceIds, ...additions];
				if (updates.length === 0) state = update.next;
				activeUpdate = update;
				if (list !== void 0 && update.suppressMotion !== true) update.motion = new SectionLayoutMotion(list);
				const service = workspaces();
				const plannedMoves = planWorkspaceMoves(ids, flattenSections(update.next), movingIds);
				if (update.suppressMotion === true && movingIds !== void 0 && movingIds.length > 0 && plannedMoves.length > 0) markRelocating(movingIds);
				const write = async () => {
					if (service === void 0) throw new Error("工作区服务未就绪");
					for (const move of plannedMoves) {
						if (disposed || activeUpdate !== update) return;
						await insertWorkspace(service, move.workspaceId, move.beforeWorkspaceId);
					}
					if (disposed || activeUpdate !== update) return;
					update.rpcDone = true;
					syncNow(true);
				};
				write().catch(() => {
					if (disposed || activeUpdate !== update) return;
					console.warn("[codex-ui:sections] 工作区移动失败，已撤销未确认的分区操作。");
					showAbortedNotice();
					updates.length = 0;
					update.motion?.dispose();
					clearRelocating();
					activeUpdate = void 0;
					state = committedState;
					scheduleSync();
				});
				scheduleSync();
			}
			function scheduleSync() {
				if (disposed || rafId !== 0) return;
				rafId = window.requestAnimationFrame(() => {
					rafId = 0;
					syncNow();
				});
			}
			/** 缓存宿主菜单的表面类名与行结构，供分区菜单复用（任意宿主菜单都可以当模板）。 */
			/** 是不是我们自己画的面板（分区菜单）。宿主菜单模板绝不能取自它。 */
			function isOwnPanel(element) {
				return element instanceof Element && element.closest(`.${MENU_CLASS}`) !== null;
			}
			function cacheHostMenuTemplate() {
				if (hostMenuRowTemplate !== void 0 && hostMenuRowTemplate.isConnected) return;
				const menu = Array.from(document.querySelectorAll("[role=\"menu\"]")).find((item) => item.querySelector("button[role=\"menuitem\"]") !== null && !isOwnPanel(item) && item.closest("[data-shortcut-modal=\"settings\"]") === null);
				const reference = menu?.querySelector("button[role=\"menuitem\"]");
				const wrapper = reference?.parentElement;
				if (menu === void 0 || reference === void 0 || wrapper === void 0 || wrapper === null) return;
				hostMenuRowTemplate = wrapper.cloneNode(true);
			}
			function syncNow(allowRevealRelocating = true) {
				if (disposed || syncing) return;
				cacheHostMenuTemplate();
				if (!sectionsLoaded) return;
				const next = findWorkspaceList(document);
				if (next === void 0) {
					detachHeaders();
					return;
				}
				list = next;
				if (!wired) {
					wired = true;
					subscribeWorkspaces();
					startObserver();
				}
				syncing = true;
				try {
					const order = domOrder();
					const ids = knownIds();
					const update = activeUpdate;
					if (update !== void 0) {
						if (update.rpcDone && sameVisibleOrder(ids, order)) {
							const original = new Set(flattenSections(update.next));
							const target = consumeTargetForNewIds(ids, update.next) ?? "default";
							const normalized = withHostWorkspaces(update.next, ids, target);
							if (!sameOrder(flattenSections(normalized), flattenSections(update.next))) {
								update.next = reconcileHostOrder(normalized, ids, target).state;
								state = reconcileHostOrder(withHostWorkspaces(state, ids, target), ids, target).state;
								update.motion?.dispose();
								update.motion = void 0;
								update.layoutDone = false;
								const additions = ids.filter((id) => !original.has(id));
								const moves = planWorkspaceMoves(ids, flattenSections(update.next), additions);
								if (moves.length > 0) {
									const service = workspaces();
									if (service === void 0) throw new Error("工作区服务未就绪");
									update.rpcDone = false;
									if (update.suppressMotion === true && additions.length > 0) markRelocating(additions);
									(async () => {
										for (const move of moves) await insertWorkspace(service, move.workspaceId, move.beforeWorkspaceId);
										if (activeUpdate !== update || disposed) return;
										update.rpcDone = true;
										scheduleSync();
									})().catch(() => {
										console.warn("[codex-ui:sections] 同步新工作区顺序失败。");
										if (activeUpdate !== update || disposed) return;
										updates.length = 0;
										clearRelocating();
										activeUpdate = void 0;
										state = committedState;
										scheduleSync();
									});
									return;
								}
							}
						}
						const desired = flattenSections(update.next);
						const idsSet = new Set(ids);
						const orderSet = new Set(order);
						const relocatingInDom = Array.from(relocatingIds).every((id) => !idsSet.has(id) || orderSet.has(id));
						if (!(sameOrder(ids, desired) && sameVisibleOrder(desired, order) && relocatingInDom && (relocatingIds.size === 0 || update.rpcDone))) {
							if (relocatingIds.size > 0) {
								cancelHostRowAnimations(list);
								placeHeaders(collectProjectBlocks(list, list), update.next);
								recordHeaderOffsets();
							}
							return;
						}
						if (relocatingIds.size > 0) {
							if (!allowRevealRelocating) return;
							cancelHostRowAnimations(list);
							clearRelocating();
						}
						if (!update.layoutDone) {
							update.layoutDone = true;
							const layout = () => {
								placeHeaders(collectProjectBlocks(list, list), update.next);
								recordHeaderOffsets();
							};
							const finished = update.motion?.play(layout);
							if (finished === void 0) layout();
							(finished ?? Promise.resolve()).then(() => {
								if (disposed || activeUpdate !== update) return;
								update.motionDone = true;
								syncNow(allowRevealRelocating);
							});
						}
						if (update.rpcDone && update.motionDone) {
							committedState = update.next;
							state = update.next;
							persist(committedState);
							activeUpdate = void 0;
							startNextUpdate();
						}
						return;
					}
					if (!sameVisibleOrder(ids, order) || order.length === 0) return;
					const before = serializeSections(state);
					state = normalizeSections(state, ids);
					if (!baselineSet) {
						baselineSet = true;
						const target = consumeTargetForNewIds(ids, state) ?? "default";
						for (const id of ids) if (sectionOf(state, id) === void 0) state = assignWorkspace(state, id, target);
						committedState = state;
						if (!sameOrder(flattenSections(state), ids)) {
							commitExplicit(state);
							return;
						}
					} else {
						const newIds = ids.filter((id) => sectionOf(state, id) === void 0);
						const target = consumeTargetForNewIds(ids, state);
						state = reconcileHostOrder(state, ids, target ?? "default").state;
						if (newIds.length > 0) {
							committedState = state;
							persist();
							if (!sameOrder(flattenSections(state), ids)) {
								commitExplicit(state, newIds, true);
								if (relocatingIds.size > 0) {
									cancelHostRowAnimations(list);
									placeHeaders(collectProjectBlocks(list, list), state);
									recordHeaderOffsets();
								}
								return;
							}
						}
					}
					committedState = state;
					if (serializeSections(state) !== before) persist();
					placeHeaders(collectProjectBlocks(list, list));
					if (relocatingIds.size === 0 && animatingSections.size === 0) syncHeadersWithHostMotion(list);
					else recordHeaderOffsets();
				} finally {
					syncing = false;
				}
			}
			/** 可见行必须是快照的有序子集；未渲染的项目仍由完整快照维护。 */
			function sameVisibleOrder(all, visible) {
				const shown = new Set(visible);
				return shown.size === visible.length && sameOrder(all.filter((id) => shown.has(id)), visible);
			}
			/** 两个顺序是否逐项一致。 */
			function sameOrder(left, right) {
				return left.length === right.length && left.every((id, index) => id === right[index]);
			}
			function startObserver() {
				observer = new MutationObserver((mutations) => {
					if (disposed) return;
					if (assigningWorkspaceId !== void 0 && document.querySelector(`[data-dcu-ws-section-item]`) === null) {
						for (const mutation of mutations) for (const node of Array.from(mutation.addedNodes)) if (node instanceof Element && (node.matches("[role=\"menu\"]") || node.querySelector("[role=\"menu\"]") !== null)) {
							injectMenuEntry();
							return;
						}
					}
					let touched = false;
					for (const mutation of mutations) {
						for (const node of Array.from(mutation.addedNodes)) {
							if (node instanceof Element && node.closest(`.${HEADER_CLASS}`) !== null) continue;
							touched = true;
							break;
						}
						if (touched) break;
						if (mutation.type === "childList") {
							touched = true;
							break;
						}
					}
					if (touched) {
						if (activeUpdate !== void 0 || knownIds().some((id) => sectionOf(state, id) === void 0)) syncNow(true);
						else {
							if (list !== void 0 && relocatingIds.size === 0 && animatingSections.size === 0) syncHeadersWithHostMotion(list);
							scheduleSync();
						}
					}
				});
				observer.observe(document.body, {
					childList: true,
					subtree: true
				});
			}
			function subscribeWorkspaces() {
				const service = workspaces();
				if (service === void 0) return;
				try {
					unsubscribe = service.list.subscribe(() => {
						if (!disposed && knownIds().some((id) => sectionOf(state, id) === void 0)) syncNow(false);
						else scheduleSync();
					});
				} catch {
					unsubscribe = void 0;
				}
			}
			const boot = window.setInterval(() => {
				if (disposed) return;
				if (findWorkspaceList(document) === void 0) return;
				window.clearInterval(boot);
				scheduleSync();
			}, 200);
			loadStateFromHost();
			scheduleSync();
			const dispose = () => {
				if (disposed) return;
				disposed = true;
				if (activeInstance === dispose) activeInstance = void 0;
				window.clearInterval(boot);
				if (rafId !== 0) window.cancelAnimationFrame(rafId);
				if (pendingTargetCleanupTimer !== void 0) window.clearTimeout(pendingTargetCleanupTimer);
				clearRelocating();
				observer?.disconnect();
				clearWriteWait();
				updates.length = 0;
				activeUpdate?.motion?.dispose();
				activeUpdate = void 0;
				document.removeEventListener("dragstart", onWorkspaceDragStart, true);
				document.removeEventListener("dragover", onWorkspaceDragOver, true);
				document.removeEventListener("drop", onWorkspaceDrop, true);
				document.removeEventListener("dragend", onWorkspaceDragEnd, true);
				document.removeEventListener("keydown", onKeydownToCloseSectionMenu, true);
				document.removeEventListener("pointerdown", onPointerdownToCloseSectionMenu, true);
				document.removeEventListener("pointerdown", onPointerdownToPrepareMenu, true);
				document.removeEventListener("click", onClickToPrepareMenu, true);
				document.removeEventListener("click", onDocumentClickClearPending, true);
				document.removeEventListener("keydown", onDocumentKeydownClearPending, true);
				document.removeEventListener("contextmenu", onContextMenuToPrepareMenu, true);
				unsubscribeDirectoryFlow?.();
				unsubscribe?.();
				closeSectionMenu();
				flushSectionsSave();
				for (const header of headers.values()) header.remove();
				headers.clear();
				document.body.removeAttribute("data-dcu-dragging-section-target");
				document.body.removeAttribute("data-dcu-drag-blocked");
				for (const block of Array.from(document.querySelectorAll("[data-dcu-section-member]"))) {
					block.removeAttribute("data-dcu-section-member");
					block.removeAttribute("data-dcu-section-hidden");
				}
			};
			activeInstance = dispose;
			return dispose;
		}
		//#endregion
		//#region src/client/sidebar/session-unread/model.ts
		/** 会话行 `data-row-key` 的前缀。 */
		const SESSION_ROW_KEY_PREFIX = "session:";
		/** 宿主行内操作区（CSS Module 哈希前后都保留 `rowActions`）。 */
		const ROW_ACTIONS_SELECTOR = "[class*=\"rowActions\"]";
		/**
		* 从宿主行的 `data-row-key` 解析会话 id。
		*
		* @param key - 行节点的 `data-row-key`。
		* @returns 会话 id；工作区行、其它行与空键返回 undefined。
		*/
		function sessionIdOfRowKey(key) {
			if (key === null || key === void 0 || !key.startsWith(SESSION_ROW_KEY_PREFIX)) return void 0;
			const id = key.slice(8);
			return id === "" ? void 0 : id;
		}
		/**
		* 是否有外部插件往操作区塞了非菜单按钮（归档管理器的星标就是这么插的）。
		*
		* @param button - 操作区内的候选按钮。
		* @returns 是外部按钮时返回 true。
		*/
		function isForeignButton(button) {
			const className = button.getAttribute("class") ?? "";
			return className.includes("rowStar") || className.includes("dsham_");
		}
		/**
		* 找到会话行的「···」菜单锚点。
		*
		* 两代宿主结构都要认：
		* - 0.2.2+ 给锚点打了 `data-context-menu-trigger`，快捷操作收进 `rowQuickActions`；
		* - 0.2.1 由 `Menu` 原语把锚点包在自己的 `span` 里，归档 / 置顶按钮与它平级。
		* 标记优先，其次按「非快捷操作区的包裹果」、再按「直接子按钮」兜底。空白会话行没有
		* 操作区，返回 null（右击时保留浏览器原生菜单）。
		*
		* @param row - 会话行节点。
		* @returns 菜单锚点按钮或 null。
		*/
		function findSessionMenuButton(row) {
			const actions = row.querySelector(ROW_ACTIONS_SELECTOR);
			if (actions === null) return null;
			const marked = actions.querySelector("button[data-context-menu-trigger]");
			if (marked !== null && !isForeignButton(marked)) return marked;
			const notQuickAction = (button) => !isForeignButton(button) && button.closest("[class*=\"rowQuickActions\"]") === null;
			const wrapped = Array.from(actions.querySelectorAll(":scope > span > button")).filter(notQuickAction);
			if (wrapped.length > 0) return wrapped[0] ?? null;
			const direct = Array.from(actions.querySelectorAll(":scope > button")).filter(notQuickAction);
			if (direct.length > 0) return direct[0] ?? null;
			return Array.from(actions.querySelectorAll("button")).filter(notQuickAction)[0] ?? null;
		}
		/**
		* 读取可写的未读集合。
		*
		* @param host - 宿主 `uiSession` 服务的最小可用面。
		* @returns 未读集合；服务缺失或内部字段改名时返回 undefined。
		*/
		function unreadSetOf(host) {
			if (host === void 0) return void 0;
			if (!(host.completionUnread instanceof Set)) return void 0;
			if (typeof host.publishStatus !== "function") return void 0;
			return host.completionUnread;
		}
		/**
		* 宿主未读服务是否具备可写能力（未读集合有效且广播方法存在）。
		*/
		function canMarkSession(host) {
			return unreadSetOf(host) !== void 0;
		}
		/**
		* 目标会话是否处于已归档状态。
		*/
		function isSessionArchived(archivedSessionIds, sessionId) {
			return archivedSessionIds?.includes(sessionId) === true;
		}
		/**
		* 目标会话是否正在主视图中打开。
		*/
		function isSessionOpenInMainView(sessionItem) {
			return (sessionItem?.retainedBy?.mainView ?? 0) > 0;
		}
		/**
		* 目标会话是否处于忙碌态（运行中或等待交互）。
		*/
		function isSessionBusy(status, sessionItem) {
			return status?.running === true || status?.pendingInteraction !== void 0 || sessionItem?.running === true;
		}
		/**
		* 综合判断是否应向用户展示未读/已读切换菜单项。
		*
		* - 宿主契约漂移不可写时：不展示（fail-closed，杜绝点击静默无效）；
		* - 已归档会话：不展示；
		* - 当前处于已读态，但在主视图打开中或忙碌中：不展示（标记后会被宿主重算冲掉）；
		* - 当前处于未读态：始终展示「标记为已读」。
		*/
		function shouldShowSessionUnreadAction(params) {
			if (!params.canWrite) return false;
			if (params.isArchived) return false;
			if (!params.isUnread && (params.isOpenInMainView || params.isBusy)) return false;
			return true;
		}
		/**
		* 写入或清除未读标记，并让宿主重算状态。
		*
		* 已经是目标值时直接成功（不重复广播）；广播抛错时回滚集合，避免内存状态与宿主
		* 渲染结果分叉。失败返回 false，调用方不做任何 UI 承诺。
		*
		* @param host - 宿主 `uiSession` 服务的最小可用面。
		* @param sessionId - 目标会话。
		* @param unread - 目标状态。
		* @returns 宿主状态是否已按目标写入。
		*/
		function writeSessionUnread(host, sessionId, unread) {
			const unreadSet = unreadSetOf(host);
			if (unreadSet === void 0 || sessionId === "") return false;
			const had = unreadSet.has(sessionId);
			if (had === unread) return true;
			if (unread) unreadSet.add(sessionId);
			else unreadSet.delete(sessionId);
			try {
				host.publishStatus();
				return true;
			} catch {
				if (had) unreadSet.add(sessionId);
				else unreadSet.delete(sessionId);
				return false;
			}
		}
		//#endregion
		//#region src/client/sidebar/session-unread/index.tsx
		/** 宿主会话行菜单槽位（行操作列表）。 */
		const MENU_SLOT = "sidebar.workspaces.session.menu.item";
		/** 槽位内本子插件的行 id：命名空间化，避免与宿主行冲突。 */
		const MENU_ITEM_ID = "codex-ui:session-unread";
		/** 排在置顶（100）之后、重命名（200）之前。 */
		const MENU_ORDER = 150;
		/** 图标插槽 entryKey。 */
		const ICON_UNREAD_KEY = "codex-ui:icon-session-unread";
		const ICON_READ_KEY = "codex-ui:icon-session-read";
		/**
		* 「标记为未读 / 标记为已读」菜单行。
		*
		* 宿主标准 hook 缺一环就整行不渲染：这是可选增强，绝不能让一个缺失的宿主能力
		* 把整份会话菜单拖垮。
		*
		* @param props - 宿主组合 props（见 {@link MarkUnreadMenuProps}）。
		* @returns 一行菜单项，或 null（未读不可写 / 已归档 / 正在主视图打开）。
		*/
		function MarkUnreadMenuItem(props) {
			const { useMenuOpenState, useSessionStatus, useSessions, useWorkspaces } = props;
			if (typeof useMenuOpenState !== "function" || typeof useSessionStatus !== "function" || typeof useSessions !== "function" || typeof useWorkspaces !== "function" || typeof props.markUnread !== "function" || typeof props.markRead !== "function") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkUnreadMenuRow, { ...props });
		}
		/**
		* 菜单行的渲染主体：hooks 必须无条件调用，因此与能力守卫拆成两个组件。
		*
		* @param props - 已确认具备全部宿主 hook 的组合 props。
		* @returns 菜单项或 null。
		*/
		function MarkUnreadMenuRow(props) {
			const { markRead, markUnread, sessionId, t } = props;
			const [, setMenuOpen] = props.useMenuOpenState();
			const unread = props.useSessionStatus((statuses) => statuses.get(sessionId)?.completionUnread === true);
			const busy = props.useSessionStatus((statuses) => isSessionBusy(statuses.get(sessionId)));
			const openInMainView = props.useSessions((list) => isSessionOpenInMainView(list.byId[sessionId]));
			const archived = props.useWorkspaces((state) => isSessionArchived(state.archivedSessionIds, sessionId));
			if (!shouldShowSessionUnreadAction({
				canWrite: typeof props.canWrite === "function" ? props.canWrite() : props.canWrite === true,
				isUnread: unread,
				isArchived: archived,
				isOpenInMainView: openInMainView,
				isBusy: busy
			})) return null;
			const select = (next) => {
				setMenuOpen(false);
				if (next) markUnread(sessionId);
				else markRead(sessionId);
			};
			if (unread) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckCircleOutlineRegular, { size: 16 }),
				onSelect: () => select(false),
				children: t("session.markRead")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
					state: "done",
					size: 10
				}),
				onSelect: () => select(true),
				children: t("session.markUnread")
			});
		}
		/**
		* 从客户端 Context 惰性读取宿主 `uiSession`。
		*
		* 故意不列入插件 inject：服务缺失时本能力整体降级，不影响插件其它功能加载；
		* 服务晚到时因为每次点击才读取，标记依然可用。
		*
		* @param ctx - 客户端插件 Context。
		* @returns 宿主服务的最小可用面或 undefined。
		*/
		function unreadHostOf(ctx) {
			try {
				const service = ctx.get?.("uiSession") ?? ctx.uiSession;
				if (service === null || typeof service !== "object") return void 0;
				return service;
			} catch {
				return;
			}
		}
		/**
		* 宿主是否自带右键菜单服务（0.2.2+ 把 `contextmenu` 绑定到了会话行本身）。
		*/
		function getNativeContextMenuService(ctx) {
			try {
				const service = ctx.get?.("contextMenus") ?? ctx.contextMenus;
				if (service === null || typeof service !== "object") return void 0;
				return service;
			} catch {
				return;
			}
		}
		function hostOwnsContextMenu(ctx) {
			return typeof getNativeContextMenuService(ctx)?.open === "function";
		}
		/**
		* 挂载会话未读能力。
		*
		* - DSH 0.2.2+：宿主拥有 contextMenus 服务，直接通过 contextMenus.register(..., order: 150)
		*   注入会话菜单，精准排在置顶（100）之后、重命名（200）之前；同时注入 contextMenu.icon。
		* - DSH 0.2.0 / 0.2.1：老版宿主无 contextMenus 服务，注册 sidebar.workspaces.session.menu.item
		*   并安装文档级 contextmenu 委托点击「···」锚点唤起菜单。
		*
		* @param ctx - 客户端插件 Context。
		* @returns 卸载函数（重复调用安全）。
		*/
		function observeSessionUnread(ctx) {
			const slots = ctx.slots;
			let disposed = false;
			const markUnread = (sessionId) => writeSessionUnread(unreadHostOf(ctx), sessionId, true);
			const markRead = (sessionId) => writeSessionUnread(unreadHostOf(ctx), sessionId, false);
			const nativeContextMenus = getNativeContextMenuService(ctx);
			if (typeof nativeContextMenus?.register === "function") {
				let disposeUnreadIcon;
				let disposeReadIcon;
				if (slots !== void 0 && typeof slots.inject === "function" && typeof slots.register === "function") {
					try {
						const u1 = slots.inject("contextMenu.icon", () => slots.register({
							name: "contextMenu.icon",
							key: ICON_UNREAD_KEY
						}, () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
							state: "done",
							size: 10
						})));
						if (typeof u1 === "function") disposeUnreadIcon = u1;
					} catch {}
					try {
						const u2 = slots.inject("contextMenu.icon", () => slots.register({
							name: "contextMenu.icon",
							key: ICON_READ_KEY
						}, () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckCircleOutlineRegular, { size: 16 })));
						if (typeof u2 === "function") disposeReadIcon = u2;
					} catch {}
				}
				let unregNative;
				try {
					unregNative = nativeContextMenus.register({
						id: MENU_ITEM_ID,
						target: "session",
						order: MENU_ORDER,
						observe: () => {
							const sessionStatus = unreadHostOf(ctx)?.sessionStatus;
							return [ctx.locale, ...sessionStatus?.subscribe ? [sessionStatus] : []];
						},
						resolve: (target) => {
							const sessionId = target?.sessionId;
							if (!sessionId) return [];
							const unreadHost = unreadHostOf(ctx);
							const canWrite = canMarkSession(unreadHost);
							const isUnread = unreadSetOf(unreadHost)?.has(sessionId) === true;
							let archived = false;
							try {
								const workspaces = ctx.get?.("workspaces") ?? ctx.workspaces;
								archived = isSessionArchived((workspaces?.list?.getSnapshot?.() ?? workspaces?.getSnapshot?.())?.archivedSessionIds, sessionId);
							} catch {}
							let openInMainView = false;
							let busy = false;
							try {
								const sessions = ctx.get?.("sessions") ?? ctx.sessions;
								const list = sessions?.list?.getSnapshot?.() ?? sessions?.getSnapshot?.();
								const sessionItem = list?.byId?.[sessionId] ?? list?.items?.find?.((s) => s.id === sessionId);
								openInMainView = isSessionOpenInMainView(sessionItem);
								const uiSession = unreadHost;
								const statusMap = uiSession?.sessionStatus?.getSnapshot?.() ?? uiSession?.sessionStatus;
								busy = isSessionBusy(statusMap instanceof Map ? statusMap.get(sessionId) : statusMap?.[sessionId] ?? uiSession?.statusOf?.(sessionId), sessionItem);
							} catch {}
							if (!shouldShowSessionUnreadAction({
								canWrite,
								isUnread,
								isArchived: archived,
								isOpenInMainView: openInMainView,
								isBusy: busy
							})) return [];
							const t = ctx.locale?.bind?.("michengai.codexUi") ?? ((k) => k);
							if (isUnread) return [{
								id: "mark-read",
								label: t("session.markRead"),
								icon: { key: ICON_READ_KEY },
								run: () => {
									markRead(sessionId);
								}
							}];
							return [{
								id: "mark-unread",
								label: t("session.markUnread"),
								icon: { key: ICON_UNREAD_KEY },
								run: () => {
									markUnread(sessionId);
								}
							}];
						}
					});
				} catch (error) {
					console.warn("[codex-ui:session-unread] 注册原生 contextMenus 失败，跳过。", error);
				}
				return () => {
					if (disposed) return;
					disposed = true;
					if (typeof unregNative === "function") try {
						unregNative();
					} catch {}
					if (typeof disposeUnreadIcon === "function") try {
						disposeUnreadIcon();
					} catch {}
					if (typeof disposeReadIcon === "function") try {
						disposeReadIcon();
					} catch {}
				};
			}
			if (slots === void 0 || typeof slots.inject !== "function" || typeof slots.register !== "function") return () => {};
			let disposeEntry;
			try {
				disposeEntry = slots.inject(MENU_SLOT, () => slots.register({
					name: MENU_SLOT,
					id: MENU_ITEM_ID,
					order: MENU_ORDER,
					locale: NS,
					inject: () => ({
						markUnread,
						markRead,
						canWrite: () => canMarkSession(unreadHostOf(ctx))
					})
				}, MarkUnreadMenuItem));
			} catch (error) {
				console.warn("[codex-ui:session-unread] 会话菜单项注册失败，已跳过。", error);
				return () => {};
			}
			const onContextMenu = (event) => {
				if (disposed || event.defaultPrevented) return;
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.closest("input, textarea, [contenteditable='true']") !== null) return;
				if (target.closest("[role=\"menu\"]") !== null) return;
				const row = target.closest("[data-row-key]");
				if (row === null || sessionIdOfRowKey(row.getAttribute("data-row-key")) === void 0) return;
				if (hostOwnsContextMenu(ctx) || row.querySelector("[data-context-menu-trigger]") !== null) return;
				const selection = typeof window.getSelection === "function" ? window.getSelection() : null;
				if (selection !== null && selection.toString().trim() !== "") return;
				const menuButton = findSessionMenuButton(row);
				if (menuButton === null) return;
				event.preventDefault();
				menuButton.click();
			};
			document.addEventListener("contextmenu", onContextMenu, true);
			return () => {
				if (disposed) return;
				disposed = true;
				document.removeEventListener("contextmenu", onContextMenu, true);
				if (typeof disposeEntry !== "function") return;
				try {
					disposeEntry();
				} catch {}
			};
		}
		//#endregion
		//#region src/client/desktop-menu/restart-client.ts
		/**
		* 「重启应用与 Host」的客户端通道与进度卡片。
		*
		* 页面只做三件事：问 Host 能不能重启（status，拿到一次性令牌）→ 带着令牌 POST →
		* 轮询阶段把实情显示出来。真正的退出与重开由 Host 侧生成的助手脚本完成。
		*
		* 为什么不在这里直接 location.reload：重载只换页面，插件宿主进程还在，装了新插件
		* 也不生效；真重启必须让整个应用退出再起来。
		*/
		/** 与 checkDesktopMenuEnabled 相同的方式拼出端点地址（兼容 dsh-app:// 协议）。 */
		function endpointUrl(search) {
			const base = typeof document !== "undefined" && document.baseURI ? document.baseURI : "http://localhost";
			const normalizedBase = base.endsWith("/") ? base : `${base}/`;
			const path = CODEX_UI_API_ENDPOINTS.desktopMenu.startsWith("/") ? CODEX_UI_API_ENDPOINTS.desktopMenu.slice(1) : CODEX_UI_API_ENDPOINTS.desktopMenu;
			return `${new URL(path, normalizedBase).href}${search}`;
		}
		/** 读一次重启状态；网络/协议不可用时返回 null（调用方据此报「通道不可用」）。 */
		async function fetchRestartStatus() {
			try {
				const response = await fetch(endpointUrl("?action=status"), {
					method: "GET",
					cache: "no-store",
					headers: { accept: "application/json" }
				});
				if (!response.ok) return null;
				const payload = await response.json();
				if (typeof payload?.token !== "string") return null;
				return payload;
			} catch {
				return null;
			}
		}
		/** 带着令牌请求重启。 */
		async function requestRestart(token) {
			try {
				const response = await fetch(endpointUrl("?action=restart"), {
					method: "POST",
					cache: "no-store",
					headers: {
						accept: "application/json",
						[CODEX_UI_RESTART_HEADER]: token
					}
				});
				const payload = await response.json().catch(() => ({}));
				if (response.ok && payload.ok === true) return { ok: true };
				return {
					ok: false,
					error: payload.error ?? `http-${response.status}`,
					detail: payload.detail,
					reason: payload.reason
				};
			} catch (error) {
				return {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}
		const STYLE_ID$1 = "dcu-desktop-restart-style";
		const STYLES$1 = `
.dcu-restart-toast {
  position: fixed;
  z-index: 10001;
  right: 20px;
  bottom: 20px;
  width: min(380px, calc(100vw - 40px));
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: var(--dsw-radius-md, 10px);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.1));
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-surface-overlay, #1e1e22));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  box-shadow: var(--dsw-elevation-prominent, 0 14px 34px rgba(0, 0, 0, 0.36));
  color: var(--dsw-alias-label-primary, #fff);
  font-family: var(--dsw-font-family, sans-serif);
  font-size: 13px;
  line-height: 19px;
  animation: dcu-restart-in 120ms ease-out;
}

@keyframes dcu-restart-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.dcu-restart-toast[data-tone="error"] {
  border-color: var(--dsw-alias-state-error-primary, #ff6b6b);
}

.dcu-restart-toast-title {
  font-weight: 600;
}

.dcu-restart-toast-body {
  color: var(--dsw-alias-label-secondary, #a1a1a6);
  overflow-wrap: anywhere;
}

.dcu-restart-toast-action {
  align-self: flex-end;
  height: 26px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-sm, 6px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.14));
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.dcu-restart-toast-action:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
}
`;
		function ensureStyles$1() {
			if (document.getElementById(STYLE_ID$1) !== null) return;
			const style = document.createElement("style");
			style.id = STYLE_ID$1;
			style.textContent = STYLES$1;
			document.head.append(style);
		}
		/**
		* 显示重启提示卡。
		* @param copy - 当前语言文案。
		*/
		function showRestartToast(copy) {
			ensureStyles$1();
			const card = document.createElement("div");
			card.className = "dcu-restart-toast";
			card.setAttribute("role", "status");
			card.setAttribute("aria-live", "polite");
			const title = document.createElement("div");
			title.className = "dcu-restart-toast-title";
			const body = document.createElement("div");
			body.className = "dcu-restart-toast-body";
			const action = document.createElement("button");
			action.type = "button";
			action.className = "dcu-restart-toast-action";
			action.textContent = copy.close;
			action.hidden = true;
			action.addEventListener("click", () => {
				card.remove();
			});
			card.append(title, body, action);
			document.body.append(card);
			return { set(nextTitle, nextBody, tone = "info") {
				title.textContent = nextTitle;
				body.textContent = nextBody ?? "";
				body.hidden = nextBody === void 0 || nextBody === "";
				card.dataset.tone = tone;
				action.hidden = tone !== "error";
			} };
		}
		/**
		* 重启后盯住阶段：页面通常会在应用退出时被带走，所以这里只是尽量把结果说清楚。
		* @param toast - 提示卡。
		* @param copy - 文案。
		* @param pollMs - 轮询间隔。
		* @param limitMs - 最长观察时间。
		*/
		function watchRestart(toast, copy, pollMs = 700, limitMs = 9e4) {
			const startedAt = Date.now();
			let timer;
			let stopped = false;
			const stop = () => {
				stopped = true;
				if (timer !== void 0) window.clearInterval(timer);
			};
			const tick = async () => {
				if (stopped) return;
				if (Date.now() - startedAt > limitMs) {
					stop();
					toast.set(copy.timeout, void 0, "error");
					return;
				}
				const status = await fetchRestartStatus();
				if (stopped) return;
				if (status === null) return;
				const phase = status.phase;
				if (phase === "quitting" || phase === "starting") {
					toast.set(copy.quitting);
					return;
				}
				if (phase === "relaunched") {
					stop();
					toast.set(copy.relaunched);
					return;
				}
				if (phase === "cancelled") {
					stop();
					toast.set(copy.cancelled, status.detail, "error");
					return;
				}
				if (phase === "launch-failed") {
					stop();
					toast.set(copy.launchFailed, status.detail, "error");
				}
			};
			timer = window.setInterval(() => {
				tick();
			}, pollMs);
			return stop;
		}
		//#endregion
		//#region src/client/desktop-menu/index.ts
		/** 「重启应用与 Host」的文案：全部来自本插件的词典，不在代码里写死语言。 */
		function restartCopy(translate) {
			return {
				quitting: translate("desktopMenu.restart.quitting", "Closing and reopening DeepSeek Harness…"),
				relaunched: translate("desktopMenu.restart.relaunched", "Restarted."),
				cancelled: translate("desktopMenu.restart.cancelled", "The app did not exit; this restart was cancelled."),
				launchFailed: translate("desktopMenu.restart.launchFailed", "The app exited but could not be reopened automatically."),
				timeout: translate("desktopMenu.restart.timeout", "The restart did not finish in time; please check the app."),
				close: translate("desktopMenu.restart.close", "Close"),
				failed: translate("desktopMenu.restart.failed", "Restart failed"),
				busy: translate("desktopMenu.restart.busy", "A restart is already in progress. Please wait.")
			};
		}
		/** 不可重启的原因代码 → 本地文案。 */
		function unsupportedText(translate, reason) {
			if (reason === "desktop-only") return translate("desktopMenu.restart.unsupportedDesktopOnly", "This is not the desktop app, so it cannot be restarted.");
			return translate("desktopMenu.restart.unsupportedMissingApp", "Cannot locate the DeepSeek Harness executable, so it cannot be restarted.");
		}
		const MENU_HOST_CLASS = "dcu-desktop-menu-popover";
		const STYLE_ID = "dcu-desktop-menu-style";
		const STYLES = `
.${MENU_HOST_CLASS} {
  position: fixed;
  z-index: 10000;
  min-width: 200px;
  max-width: 320px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-surface-overlay, #1e1e22));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  box-shadow: var(--dsw-elevation-prominent, 0 14px 34px rgba(0,0,0,0.36), 0 2px 8px rgba(0,0,0,0.24));
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  color: var(--dsw-alias-label-primary, #ffffff);
  font-family: var(--dsw-font-family, sans-serif);
  animation: dcu-menu-fade-in 100ms ease-out;
  outline: none;
  -webkit-app-region: no-drag;
}

@keyframes dcu-menu-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.${MENU_HOST_CLASS} .dcu-menu-separator {
  height: 1px;
  margin: 4px 6px;
  background: var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
}

.${MENU_HOST_CLASS} button.dcu-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 28px;
  padding: 5px 8px;
  text-align: left;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
  outline: none;
  transition: background-color 100ms ease;
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: no-drag;
}

.${MENU_HOST_CLASS} button.dcu-menu-item:hover,
.${MENU_HOST_CLASS} button.dcu-menu-item:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
}

.${MENU_HOST_CLASS} .dcu-menu-label {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;
		function ensureStyles() {
			if (document.getElementById(STYLE_ID) !== null) return;
			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = STYLES;
			document.head.append(style);
		}
		let activePopover = null;
		let activeAnchor = null;
		function closeActiveMenu(restoreFocus = false) {
			const anchor = activeAnchor;
			if (activePopover !== null) {
				activePopover.remove();
				activePopover = null;
			}
			if (activeAnchor !== null) {
				activeAnchor.setAttribute("aria-expanded", "false");
				activeAnchor = null;
			}
			if (restoreFocus && anchor && anchor.isConnected) anchor.focus();
		}
		function openDropdown(anchor, items, options = {}) {
			if (activeAnchor === anchor && activePopover !== null) {
				closeActiveMenu();
				return;
			}
			closeActiveMenu();
			ensureStyles();
			const rect = anchor.getBoundingClientRect();
			const popover = document.createElement("div");
			popover.className = MENU_HOST_CLASS;
			popover.setAttribute("role", "menu");
			popover.tabIndex = -1;
			for (const item of items) {
				if (item.separatorBefore) {
					const sep = document.createElement("div");
					sep.className = "dcu-menu-separator";
					sep.setAttribute("role", "separator");
					popover.append(sep);
				}
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "dcu-menu-item";
				btn.setAttribute("role", "menuitem");
				const labelSpan = document.createElement("span");
				labelSpan.className = "dcu-menu-label";
				labelSpan.textContent = item.label;
				btn.append(labelSpan);
				btn.addEventListener("pointerdown", (e) => {
					e.stopPropagation();
				});
				btn.addEventListener("mousedown", (e) => {
					e.stopPropagation();
				});
				btn.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					closeActiveMenu();
					setTimeout(() => {
						try {
							Promise.resolve(item.action?.()).catch((err) => {
								console.error("Menu action error:", err);
							});
						} catch (err) {
							console.error("Menu action error:", err);
						}
					}, 10);
				});
				popover.append(btn);
			}
			document.body.append(popover);
			const popoverRect = popover.getBoundingClientRect();
			let left = rect.left;
			let top = rect.bottom + 2;
			if (left + popoverRect.width > window.innerWidth - 8) left = window.innerWidth - popoverRect.width - 8;
			if (left < 8) left = 8;
			if (top + popoverRect.height > window.innerHeight - 8) top = rect.top - popoverRect.height - 2;
			popover.style.left = `${Math.round(left)}px`;
			popover.style.top = `${Math.round(top)}px`;
			anchor.setAttribute("aria-expanded", "true");
			activePopover = popover;
			activeAnchor = anchor;
			const menuItems = Array.from(popover.querySelectorAll("button.dcu-menu-item"));
			const focusAt = (index) => {
				if (menuItems.length === 0) return;
				const clamped = Math.max(0, Math.min(index, menuItems.length - 1));
				menuItems[clamped].focus();
			};
			popover.addEventListener("keydown", (event) => {
				const current = menuItems.indexOf(document.activeElement);
				if (event.key === "ArrowDown") {
					event.preventDefault();
					focusAt(current < 0 ? 0 : current + 1);
				} else if (event.key === "ArrowUp") {
					event.preventDefault();
					focusAt(current < 0 ? menuItems.length - 1 : current - 1);
				} else if (event.key === "Home") {
					event.preventDefault();
					focusAt(0);
				} else if (event.key === "End") {
					event.preventDefault();
					focusAt(menuItems.length - 1);
				}
			});
			if (options.focusFirst === true && menuItems.length > 0) menuItems[0].focus();
			else popover.focus();
		}
		/**
		* 监听全局事件以支持点击外部或按 Esc 关闭菜单
		*/
		let globalListenersInstalled = false;
		function ensureGlobalListeners() {
			if (globalListenersInstalled) return;
			globalListenersInstalled = true;
			document.addEventListener("pointerdown", (e) => {
				if (activePopover === null) return;
				const path = e.composedPath ? e.composedPath() : [];
				if (path.length > 0) {
					if (activePopover && path.includes(activePopover)) return;
					if (activeAnchor && path.includes(activeAnchor)) return;
				} else {
					const target = e.target;
					if (target && (activePopover.contains(target) || activeAnchor?.contains(target))) return;
				}
				closeActiveMenu();
			}, true);
			window.addEventListener("keydown", (e) => {
				if (e.key === "Escape" && activePopover !== null) closeActiveMenu(true);
			}, true);
		}
		/**
		* 检查桌面端窗口菜单子插件在 Host 侧是否启用
		*/
		async function checkDesktopMenuEnabled() {
			try {
				const base = typeof document !== "undefined" && document.baseURI ? document.baseURI : "http://localhost";
				const normalizedBase = base.endsWith("/") ? base : `${base}/`;
				const path = CODEX_UI_API_ENDPOINTS.desktopMenu.startsWith("/") ? CODEX_UI_API_ENDPOINTS.desktopMenu.slice(1) : CODEX_UI_API_ENDPOINTS.desktopMenu;
				const url = new URL(path, normalizedBase).href;
				const res = await fetch(url, { method: "GET" });
				if (!res.ok) return true;
				return (await res.json()).enabled !== false;
			} catch {
				return true;
			}
		}
		/**
		* 观察并在 Windows 桌面端的 data-windows-menu 宿主上注入【帮助】菜单。
		* 只追加一个入口，官方【应用】【编辑】保持原样。
		*/
		function observeDesktopTitlebarMenus(translate = (_k, fallback) => fallback ?? "") {
			ensureGlobalListeners();
			let cleanedUp = false;
			let injectedHelpBtn = null;
			const getHelpItems = () => {
				const zh = document.documentElement.lang?.toLowerCase().startsWith("zh") ?? true;
				return [{
					id: "reload-page",
					label: translate("desktopMenu.help.reloadPage", zh ? "刷新页面" : "Reload Page"),
					action: () => {
						window.location.reload();
					}
				}, {
					id: "restart-host",
					label: translate("desktopMenu.help.restartAppHost", zh ? "重启应用与 Host" : "Restart App and Host"),
					action: async () => {
						const copy = restartCopy(translate);
						const status = await fetchRestartStatus();
						if (status === null) {
							showRestartToast(copy).set(copy.failed, translate("desktopMenu.restart.unreachable", "Cannot reach the Host; the restart channel is unavailable."), "error");
							return;
						}
						if (!status.canRestart) {
							showRestartToast(copy).set(copy.failed, unsupportedText(translate, status.reason), "error");
							return;
						}
						const confirmMsg = translate("desktopMenu.help.restartConfirm", "DeepSeek Harness will close and reopen; running tasks will be interrupted. Continue?");
						if (!window.confirm(confirmMsg)) return;
						const toast = showRestartToast(copy);
						toast.set(copy.quitting);
						const outcome = await requestRestart(status.token);
						if (!outcome.ok) {
							const detailText = outcome.error === "busy" ? copy.busy : outcome.reason ? unsupportedText(translate, outcome.reason) : outcome.detail ?? outcome.error ?? "unknown";
							toast.set(copy.failed, detailText, "error");
							return;
						}
						watchRestart(toast, copy);
					}
				}];
			};
			const mountMenus = () => {
				if (cleanedUp || typeof document === "undefined") return;
				const host = document.querySelector("[data-windows-menu]");
				if (!host || !host.shadowRoot) return;
				const shadow = host.shadowRoot;
				const bar = shadow.querySelector("[role=\"menubar\"]");
				if (!bar) return;
				if (Array.from(bar.querySelectorAll("button")).length === 0) return;
				if (!shadow.getElementById("dcu-desktop-menu-help")) {
					const helpBtn = document.createElement("button");
					helpBtn.type = "button";
					helpBtn.id = "dcu-desktop-menu-help";
					helpBtn.setAttribute("role", "menuitem");
					helpBtn.setAttribute("aria-haspopup", "menu");
					helpBtn.setAttribute("aria-expanded", "false");
					const setRovingFocus = (target) => {
						bar.querySelectorAll("button").forEach((btn) => {
							btn.tabIndex = btn === target ? 0 : -1;
						});
						target.focus();
					};
					helpBtn.tabIndex = -1;
					helpBtn.textContent = translate("desktopMenu.help", "帮助");
					helpBtn.addEventListener("click", (e) => {
						e.preventDefault();
						e.stopPropagation();
						openDropdown(helpBtn, getHelpItems());
					});
					helpBtn.addEventListener("keydown", (e) => {
						if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							e.stopPropagation();
							openDropdown(helpBtn, getHelpItems(), { focusFirst: true });
							return;
						}
						if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
							e.preventDefault();
							e.stopPropagation();
							const official = Array.from(bar.querySelectorAll("button:not(#dcu-desktop-menu-help)"));
							const target = e.key === "ArrowLeft" ? official[official.length - 1] ?? official[0] : official[0];
							if (target) setRovingFocus(target);
						}
					});
					bar.addEventListener("keydown", (e) => {
						const target = e.target;
						if (!target || target === helpBtn) return;
						const official = Array.from(bar.querySelectorAll("button:not(#dcu-desktop-menu-help)"));
						if (official.length === 0) return;
						if (e.key === "ArrowRight" && target === official[official.length - 1]) {
							e.preventDefault();
							e.stopImmediatePropagation();
							setRovingFocus(helpBtn);
						} else if (e.key === "ArrowLeft" && target === official[0]) {
							e.preventDefault();
							e.stopImmediatePropagation();
							setRovingFocus(helpBtn);
						}
					}, true);
					bar.append(helpBtn);
					injectedHelpBtn = helpBtn;
				}
			};
			mountMenus();
			const observer = new MutationObserver(() => {
				mountMenus();
			});
			observer.observe(document.body, { childList: true });
			return () => {
				cleanedUp = true;
				observer.disconnect();
				closeActiveMenu();
				injectedHelpBtn?.remove();
				document.getElementById(STYLE_ID)?.remove();
			};
		}
		//#endregion
		//#region src/client/index.ts
		const inject = [
			"slots",
			"locale",
			"sessions",
			"conversation",
			"inputTriggers",
			"layout",
			"uiWorkspace",
			"workspaces",
			"remote"
		];
		let clientContext;
		function getClientContext() {
			return clientContext;
		}
		/** 浏览器客户端插件入口；保留官方原生侧边栏与工作区树，提供输入框增强、设置美化与生态关于页。 */
		function apply(ctx) {
			clientContext = ctx;
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en,
				ja,
				es,
				fr,
				de,
				ru,
				pt
			}), "michengai-codex-ui: dictionaries");
			const t = ctx.locale.bind(NS);
			const sidebarReady = checkSidebarEnabled();
			ctx.effect(() => observeTheme(ctx), "michengai-codex-ui: theme & appearance");
			ctx.effect(() => observeSidebarNav(ctx), "michengai-codex-ui: sidebar navigation");
			ctx.effect(() => {
				let stop;
				let cancelled = false;
				checkDesktopMenuEnabled().then((enabled) => {
					if (cancelled || !enabled) return;
					const translate = (key, fallback) => {
						try {
							const value = t(key);
							return typeof value === "string" && value !== "" && value !== key ? value : fallback ?? key;
						} catch {
							return fallback ?? key;
						}
					};
					stop = observeDesktopTitlebarMenus(translate);
				});
				return () => {
					cancelled = true;
					stop?.();
				};
			}, "michengai-codex-ui: desktop titlebar menus");
			ctx.effect(() => {
				let stop;
				let cancelled = false;
				sidebarReady.then((enabled) => {
					if (cancelled || !enabled) return;
					const translate = (key, fallback) => {
						try {
							const value = t(key);
							return typeof value === "string" && value !== "" && value !== key ? value : fallback ?? key;
						} catch {
							return fallback ?? key;
						}
					};
					stop = observeWorkspaceSections(ctx, translate);
				});
				return () => {
					cancelled = true;
					stop?.();
				};
			}, "michengai-codex-ui: workspace sections");
			ctx.effect(() => {
				let stop;
				let cancelled = false;
				sidebarReady.then((enabled) => {
					if (cancelled || !enabled) return;
					stop = observeSessionUnread(ctx);
				});
				return () => {
					cancelled = true;
					stop?.();
				};
			}, "michengai-codex-ui: session unread");
			ctx.effect(() => observeComposerEnhancements(ctx), "michengai-codex-ui: composer enhancements");
			ctx.effect(() => observeSettingsSkin(), "michengai-codex-ui: official settings skin");
			ctx.effect(() => observeSettingsNavIcon(() => t("about.nav")), "michengai-codex-ui: settings nav icon");
			ctx.slots.inject("settings.section.icon", () => ctx.slots.register({
				name: "settings.section.icon",
				id: "codex-ui",
				locale: NS
			}, CodexUiNavIcon));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "codex-ui",
				order: Number.MAX_SAFE_INTEGER,
				label: () => t("about.nav"),
				locale: NS
			}, AboutSection));
		}
		//#endregion
		exports.apply = apply;
		exports.getClientContext = getClientContext;
		exports.inject = inject;
		return module.exports;
	}
});
