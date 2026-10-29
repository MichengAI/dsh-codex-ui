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
		* 优先使用 0.1.7 的 Medium 导出名，0.1.5 只有旧尺寸名时回退。
		* 必须动态读取，不能写成静态属性访问，否则旧宿主一加载客户端就会拿到 undefined。
		*/
		function resolveHostIcon(icons, modern, legacy) {
			const icon = icons[modern] ?? icons[legacy];
			if (!icon) throw new Error(`宿主缺少图标 ${modern}`);
			return icon;
		}
		function hostIcon(modern, legacy) {
			return resolveHostIcon(_deepseek_ai_dsh_client_ui_primitives, modern, legacy);
		}
		const IconCheckOutlineMedium = hostIcon("IconCheckOutlineMedium", "IconCheckOutline16");
		const IconDownloadOutlineMedium = hostIcon("IconDownloadOutlineMedium", "IconDownloadOutline16");
		const IconListPenOutlineMedium = hostIcon("IconListPenOutlineMedium", "IconListPenOutline16");
		const IconLoadingOutlineMedium = hostIcon("IconLoadingOutlineMedium", "IconLoadingOutline16");
		const IconRefreshOutlineMedium = hostIcon("IconRefreshOutlineMedium", "IconRefreshOutline16");
		//#endregion
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
			[/服务尚未就绪|Profile 信息无效|dependency service is not ready/i, "about.installServiceUnavailable"]
		];
		/** 安装错误保留用户可执行的处理建议，但不直接展示 Host 原文。 */
		function installErrorText(error, t) {
			const requestKey = businessRequestErrorKey(error);
			if (requestKey !== void 0) return t(requestKey);
			const message = error instanceof Error ? error.message : String(error);
			return t(INSTALL_ERROR_KEYS.find(([pattern]) => pattern.test(message))?.[1] ?? "about.installFailed");
		}
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
		const GLASS_CSS_TEXT = "[data-dsh-glass] body{--dsh-glass-card:color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(52% * var(--dsh-glass-frost,1)), transparent);--dsh-glass-card-raised:color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(64% * var(--dsh-glass-frost,1)), transparent);--dsh-glass-card-hover:color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(76% * var(--dsh-glass-frost,1)), transparent);--dsh-glass-rim:color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent);--dsh-glass-rim-soft:color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);--dsh-glass-rim-strong:color-mix(in srgb, var(--dsw-alias-label-primary) 30%, transparent);--dsh-glass-edge:inset 0 1px 0 #ffffff6b;--dsh-glass-drop:0 10px 32px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 38%, transparent);--dsh-glass-input-shadow:0 1px 2px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 65%, transparent), 0 8px 24px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 80%, transparent);--dsh-glass-ground:color-mix(in srgb, color-mix(in srgb, var(--dsw-alias-bg-base), #fff calc(var(--dsh-glass-brightness-white,0) * 100%)), #000 calc(var(--dsh-glass-brightness-black,0) * 100%));--dsh-glass-ambience:calc(1 - var(--dsh-glass-brightness-white,0) - var(--dsh-glass-brightness-black,0));--dsh-glass-wash-tint:#fff;--dsh-glass-wash-mix:22%}[data-dsh-glass] body[data-ds-dark-theme]{--dsh-glass-rim:color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent);--dsh-glass-rim-soft:color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent);--dsh-glass-rim-strong:color-mix(in srgb, var(--dsw-alias-label-primary) 30%, transparent);--dsh-glass-edge:inset 0 1px 0 #ffffff14;--dsh-glass-drop:0 10px 32px #02060e73;--dsh-glass-input-shadow:0 1px 2px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 65%, transparent), 0 8px 24px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 80%, transparent);--dsh-glass-wash-tint:var(--dsw-alias-bg-layer-1);--dsh-glass-wash-mix:68%}[data-dsh-glass] body,[data-dsh-glass] [data-dsh-glass-ground-sample]{background: radial-gradient(58% 46% at 18% 6%, color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) calc(12% * var(--dsh-glass-ambience) * var(--dsh-glass-glow,0)), transparent), transparent 68%),  radial-gradient(48% 42% at 86% 14%, color-mix(in srgb, var(--dsw-alias-state-success-tertiary) calc(10% * var(--dsh-glass-ambience) * var(--dsh-glass-glow,0)), transparent), transparent 62%),  linear-gradient(165deg, color-mix(in srgb, var(--dsh-glass-ground), var(--dsh-glass-wash-tint) calc(var(--dsh-glass-wash-mix) * var(--dsh-glass-ambience))) 0%, var(--dsh-glass-ground) 55%, color-mix(in srgb, var(--dsh-glass-ground), #000 calc(5% * var(--dsh-glass-ambience))) 100%)}[data-dsh-glass] [data-dsh-glass-frame],[data-dsh-glass] [data-phase],[data-dsh-glass] [data-dsh-glass-details],[data-dsh-glass-float] [data-dsh-glass-frame]>[class*=centerCol]{background:0 0}[data-dsh-glass-float] [data-phase=active] header{z-index:8;position:relative}[data-dsh-glass-float] [class*=banner]{position:static}[data-dsh-glass-float] [data-phase=active] [data-conversation-scroll]{margin-top:-95px;padding-top:107px}[data-dsh-glass] [data-phase] [class*=composerSeat][class*=composerSeat]{background:0 0}[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar]>[class*=dock],[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar]>[data-composer-dock]{position:relative}[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar]>[class*=dock]:before,[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar]>[data-composer-dock]:before{display:none!important;content:none!important}[data-dsh-glass] [data-dsh-glass-fade]{z-index:7;pointer-events:none;backdrop-filter:blur(5px);background:#ffffff2e;height:13px;position:fixed;left:0;right:0}[data-dsh-glass] body[data-ds-dark-theme] [data-dsh-glass-fade]{background:#00000024}[data-dsh-glass] [data-dsh-glass-fade=top]{top:0;-webkit-mask-image:linear-gradient(#000 0%,#0000 100%);mask-image:linear-gradient(#000 0%,#0000 100%)}[data-dsh-glass][data-windows-titlebar] [data-dsh-glass-fade=top]{display:none}[data-dsh-glass] [data-dsh-glass-fade=bottom]{bottom:0;-webkit-mask-image:linear-gradient(#0000 0%,#000 100%);mask-image:linear-gradient(#0000 0%,#000 100%)}[data-dsh-glass-float] [data-menu-material=translucent],[data-dsh-glass-float] [role=menu]:not([data-menu-material]):not([data-menu-material] *),[data-dsh-glass-float] [role=dialog],[data-dsh-glass-float] [role=alert],[data-dsh-glass-float] [data-trigger-menu],[data-dsh-glass-float] [data-dsh-glass-surface]{border-radius:14px}[data-dsh-glass-float] [role=menuitem],[data-dsh-glass-float] [role=tooltip],[data-dsh-glass-float] [class*=pill]{border-radius:8px}[data-dsh-glass-float] button[class*=button]{border-radius:10px}[data-dsh-glass-float] [class*=iconButton],[data-dsh-glass-float] [class*=searchButton]{border-radius:8px}[data-dsh-glass-float] [class*=block]{--dsl-code-block-border-radius:14px;--dsl-diff-radius:14px;--dsl-read-radius:14px;--dsl-terminal-radius:14px;--dsl-web-radius:14px;--dsl-search-radius:14px;border-radius:14px}[data-dsh-glass-float] [data-dsh-glass-add]{background:var(--dsh-glass-card-raised);border:1px solid var(--dsh-glass-rim);box-shadow:var(--dsh-glass-edge);backdrop-filter:blur(var(--dsh-glass-blur,14px))}[data-dsh-glass-float] [data-dsh-glass-add]:hover:not(:disabled){background:var(--dsh-glass-card-hover)}[data-dsh-glass-float] [data-dsh-glass-surface]{background:var(--dsh-glass-card-raised);border:1px solid var(--dsh-glass-rim-soft);box-shadow:var(--dsh-glass-edge);backdrop-filter:blur(var(--dsh-glass-blur,14px))}[data-dsh-glass-float] [data-dsh-glass-surface]:hover:not(:disabled){background:var(--dsh-glass-card-hover)}[data-dsh-glass-float] [data-conversation-scroll] [class*=bubble]{border:1px solid var(--dsh-glass-rim-soft);background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(46% * var(--dsh-glass-frost,1)), transparent);border-radius:14px}[data-dsh-glass-float] [class*=card]{border-radius:14px}[data-dsh-glass-float] [data-reader-reasoning-card]:not([data-overflow=false][data-expanded=false]),[data-dsh-glass-compat] [data-reader-reasoning-card]:not([data-overflow=false][data-expanded=false]){background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) calc(52% * var(--dsh-glass-frost,1)), transparent);border-color:var(--dsh-glass-rim-soft);border-radius:14px}html[data-dsh-glass-float] [data-changed-files],html[data-dsh-glass-float] [data-presented-file]{--changes-fill:var(--dsh-glass-card);--deliverable-fill:var(--dsh-glass-card);border-color:var(--dsh-glass-rim-soft);border-radius:14px}html[data-dsh-glass-float] [data-presented-file],html[data-dsh-glass-float] [data-changed-files]{background:var(--dsh-glass-card)}html[data-dsh-glass-float] [data-changed-files]>:first-child,html[data-dsh-glass-float] [data-changed-files] ul>li>:first-child,html[data-dsh-glass-float] [data-changed-files] ul{background:0 0}html[data-dsh-glass-float] [data-changed-files] ul{border-top:.5px solid var(--dsh-glass-rim-soft)}html[data-dsh-glass-float] [data-changed-files]>:first-child>:first-child,html[data-dsh-glass-float] [data-presented-file]>:first-child{background:var(--dsh-glass-card-raised)}html[data-dsh-glass-float] [data-turn-trigger]{background:var(--dsh-glass-card);border-color:var(--dsh-glass-rim-soft);border-radius:14px}html[data-dsh-glass-float] [data-turn-trigger]:hover{background:var(--dsh-glass-card-hover)}[data-dsh-glass] [data-dsh-glass-settings]{--dsh-glass-settings-raised:calc(38% + 38% * var(--dsh-glass-frost,1));--dsh-glass-settings-soft:calc(30% + 30% * var(--dsh-glass-frost,1));--dsw-alias-bg-module-platform:color-mix(in srgb, var(--dsw-static-neutral-bluish-800) var(--dsh-glass-settings-raised), transparent);--dsw-alias-bg-layer-3:color-mix(in srgb, var(--dsw-static-neutral-bluish-800) var(--dsh-glass-settings-soft), transparent);--dsw-alias-bg-layer-2:color-mix(in srgb, var(--dsw-static-neutral-bluish-850) var(--dsh-glass-settings-raised), transparent);--dsw-alias-bg-layer-1:color-mix(in srgb, var(--dsw-static-neutral-bluish-850) var(--dsh-glass-settings-soft), transparent);--dsw-specific-sidebar-nav-item-active:color-mix(in srgb, var(--dsw-static-neutral-bluish-750) var(--dsh-glass-settings-raised), transparent);--dsw-specific-sidebar-nav-item-hover:color-mix(in srgb, var(--dsw-static-neutral-bluish-850) var(--dsh-glass-settings-soft), transparent)}[data-dsh-glass] body:not([data-ds-dark-theme]) [data-dsh-glass-settings]{--dsw-alias-bg-module-platform:color-mix(in srgb, var(--dsw-static-neutral-bluish-60) var(--dsh-glass-settings-raised), transparent);--dsw-alias-bg-layer-3:color-mix(in srgb, var(--dsw-static-neutral-bluish-00) var(--dsh-glass-settings-soft), transparent);--dsw-alias-bg-layer-2:color-mix(in srgb, var(--dsw-static-neutral-bluish-00) var(--dsh-glass-settings-raised), transparent);--dsw-alias-bg-layer-1:color-mix(in srgb, var(--dsw-static-neutral-bluish-00) var(--dsh-glass-settings-soft), transparent);--dsw-specific-sidebar-nav-item-active:color-mix(in srgb, var(--dsw-static-neutral-bluish-100) var(--dsh-glass-settings-raised), transparent);--dsw-specific-sidebar-nav-item-hover:color-mix(in srgb, var(--dsw-static-neutral-bluish-75) var(--dsh-glass-settings-soft), transparent)}[data-dsh-glass-float] [data-phase] header:not([class*=headerBlank]){width:100%;max-width:min(calc(var(--dsh-chat-user-width,clamp(680px, calc(var(--dsh-conversation-column-width,1500px) * .64), 920px)) + 32px), calc(100% - 32px));border:1px solid var(--dsh-glass-rim);background:var(--dsh-glass-card);box-shadow:var(--dsh-glass-edge), var(--dsh-glass-drop);backdrop-filter:blur(var(--dsh-glass-blur,14px));border-radius:20px;margin:12px auto 0;padding:10px 16px 8px}[data-dsh-glass-float] [data-phase] header:not([class*=headerBlank]):after{display:none}[data-dsh-glass-float] [data-dsh-glass-frame][data-sidebar-collapsed] [data-phase] header:not([class*=headerBlank]){width:auto;max-width:none;margin-left:28px;margin-right:16px}[data-dsh-glass-float] [class*=sidebarCol]{--dsw-specific-sidebar-fill:transparent;z-index:9;border:1px solid var(--dsh-glass-rim-soft);box-shadow:var(--dsh-glass-drop);border-radius:20px;margin:12px;padding:10px 12px 14px;position:relative;overflow:hidden}[data-dsh-glass-float] [class*=sidebarCol]:before{content:\"\";border-radius:inherit;background:var(--dsh-glass-card);box-shadow:var(--dsh-glass-edge);z-index:-1;pointer-events:none;transition:border-radius .15s var(--ds-ease-in-out);position:absolute;inset:0}[data-dsh-glass-float] body{--dsw-specific-sidebar-fill:color-mix(in srgb, var(--dsw-alias-bg-layer-1) calc(52% * var(--dsh-glass-frost,1)), color-mix(in srgb, var(--dsh-glass-ground), var(--dsh-glass-wash-tint) calc(var(--dsh-glass-wash-mix) * var(--dsh-glass-ambience))))!important}[data-dsh-glass-float] [data-dsh-glass-frame][data-sidebar-collapsed] [class*=sidebarCol]{transition:margin .15s var(--ds-ease-in-out), border-radius .15s var(--ds-ease-in-out);border-radius:16px;margin:12px -12px 12px 12px;padding:0}[data-dsh-glass-float] [data-dsh-glass-frame]:not([data-sidebar-collapsed]) [data-dsh-glass-sidebar-root]{width:100%!important}[data-dsh-glass-float] [data-dsh-glass-trajectory]{width:100%!important;max-width:none!important;height:100%!important;margin:0!important;border:none!important;box-shadow:none!important;border-radius:0!important;overflow:hidden}[data-dsh-glass-float] [data-dsh-glass-trajectory] [role=toolbar],[data-dsh-glass-float] [data-dsh-glass-trajectory] section[aria-label=Trajectory\\ timeline]{background:0 0}[data-dsh-glass-float] [data-composer-card],[data-dsh-glass-float] [data-composer-card]:after{border-radius:24px}[data-dsh-glass-float] [data-composer-card]{z-index:8;isolation:isolate;border:1px solid var(--dsh-glass-rim-strong);box-shadow:var(--dsh-glass-input-shadow);background:0 0;position:relative}[data-dsh-glass-float] [data-composer-card]:before{content:\"\";z-index:-1;border-radius:inherit;background:var(--dsh-glass-card);box-shadow:var(--dsh-glass-edge);backdrop-filter:blur(var(--dsh-glass-blur,14px));pointer-events:none;position:absolute;inset:0}[data-dsh-glass-float] [data-dsh-glass-inputbar]:not([class*=hero]):not(:has([data-dsh-glass-stats])){padding-bottom:12px}[data-dsh-glass-float] [role=treeitem][aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}[data-dsh-glass-float] button[class*=button]:hover:not(:disabled),[data-dsh-glass-float] [role=menuitem]:hover:not(:disabled){box-shadow:0 0 12px color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) 20%, transparent)}[data-dsh-glass-float] [data-menu-material=translucent]:not(:focus-visible){--dsw-menu-surface-fill:var(--dsh-glass-card-raised);--dsw-menu-backdrop-filter:blur(var(--dsh-glass-blur,14px))}[data-dsh-glass-float] body[data-ds-dark-theme] [data-menu-material=translucent]:not(:focus-visible){outline:1px solid var(--dsh-glass-rim-soft);outline-offset:-1px}[data-dsh-glass-float] [role=menu]:not([data-menu-material]):not([data-menu-material] *){background:var(--dsh-glass-card-raised);border:1px solid var(--dsh-glass-rim-soft);backdrop-filter:blur(var(--dsh-glass-blur,14px))}[data-dsh-glass-float] [data-menu-material=translucent]:has([role=group]>[role=menuitemradio]){--dsw-menu-surface-fill:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 70%, transparent)}[data-dsh-glass-float] [data-menu-group]:has(>[role=menuitemradio])>[data-menu-group-heading]{background:var(--dsh-glass-card-raised);backdrop-filter:blur(var(--dsh-glass-blur,14px));border-radius:999px;align-items:center;width:fit-content;margin:3px 0 5px 6px;padding:3px 10px;display:inline-flex}[data-dsh-glass-float] [role=dialog][aria-modal=true]{background:var(--dsh-glass-card-raised);border:1px solid var(--dsh-glass-rim);box-shadow:var(--dsh-glass-edge), var(--dsh-glass-drop);backdrop-filter:blur(var(--dsh-glass-blur,14px));border-radius:20px}[data-dsh-glass] [data-conversation-scroll]{text-shadow:0 0 1px #ffffff80}[data-dsh-glass] body[data-ds-dark-theme] [data-conversation-scroll]{text-shadow:0 0 1px #0006}[data-dsh-glass-float] [data-dsh-glass-inputbar] [data-slot]{color:var(--dsw-alias-label-secondary)}[data-dsh-glass]{--dsh-glass-entry-scale:1}[data-dsh-glass-compat]{--dsh-glass-entry-scale:0}[data-dsh-glass] [data-testid^=view-]{animation:dsh-glass-in calc(.26s * var(--dsh-glass-entry-scale,1)) var(--ds-ease-in-out)}[data-dsh-glass] [data-tool]{animation:dsh-glass-rise calc(.3s * var(--dsh-glass-entry-scale,1)) var(--ds-ease-in-out) both}[data-dsh-glass] [role=dialog]{animation:dsh-glass-dialog-in calc(.24s * var(--dsh-glass-entry-scale,1)) var(--ds-ease-in-out)}@keyframes dsh-glass-in{0%{opacity:0}}@keyframes dsh-glass-rise{0%{opacity:0;transform:translateY(6px)}}@keyframes dsh-glass-dialog-in{0%{opacity:0;transform:translateY(8px)scale(.985)}}[data-dsh-glass] :focus-visible{outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) 85%, transparent);outline-offset:1px}[data-dsh-glass] ::selection{background:color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) 35%, transparent)}[data-dsh-glass-compat] [role=menu]:not([data-menu-material]):not([data-menu-material] *),[data-dsh-glass-compat] [class*=popover],[data-dsh-glass-compat] [class*=dropdown]{backdrop-filter:blur(12px)}[data-dsh-glass-compat] [data-menu-material=translucent]:not(:focus-visible){--dsw-menu-surface-fill:var(--dsh-glass-card-raised);--dsw-menu-backdrop-filter:blur(12px)}[data-dsh-glass-compat] [data-sidebar-right-panel][data-sidebar-right-open],[data-dsh-glass-compat] [data-sidebar-right-panel][data-sidebar-right-open] [class*=panel]{backdrop-filter:blur(12px)}[data-dsh-glass-compat] [role=menu]:not([data-menu-material]):not([data-menu-material] *),[data-dsh-glass-compat] [class*=popover],[data-dsh-glass-compat] [class*=dropdown]{background:var(--dsh-glass-card-raised)}[data-dsh-glass-compat] [data-composer-card]{isolation:isolate;backdrop-filter:none;background:0 0;position:relative}[data-dsh-glass-compat] [data-composer-card]:before{content:\"\";z-index:-1;border-radius:inherit;background:var(--dsh-glass-card-raised);backdrop-filter:blur(12px);pointer-events:none;position:absolute;inset:0}[data-dsh-glass-compat] [role=menu]:not([data-menu-material]):not([data-menu-material] *):not(:focus-visible),[data-dsh-glass-compat] [data-composer-card]:not(:focus-visible),[data-dsh-glass-compat] [class*=popover]:not(:focus-visible),[data-dsh-glass-compat] [class*=dropdown]:not(:focus-visible){outline:1px solid var(--dsh-glass-rim);outline-offset:-1px}[data-dsh-glass-compat] [role=dialog][aria-modal=true]{background:var(--dsh-glass-card-raised);border:1px solid var(--dsh-glass-rim);box-shadow:var(--dsh-glass-edge), var(--dsh-glass-drop);backdrop-filter:blur(var(--dsh-glass-blur,12px))}@media (prefers-reduced-motion:reduce){[data-dsh-glass] [data-testid^=view-],[data-dsh-glass] [data-tool],[data-dsh-glass] [role=dialog]{animation:none}}";
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
		function stampAll() {
			for (const seam of SEAMS) stamp(seam);
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

/* 彻底清除输入框底部 dock / stats 区域的半透明灰色脏色块与切线 */
[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar] > [class*="dock"]:before,
[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar] > [data-composer-dock]:before,
[data-dsh-glass] [class*="dock"]:before,
[data-dsh-glass] [data-composer-dock]:before {
  display: none !important;
  content: none !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 底盘渐变（与 body 上那份逐字一致）抽成变量挂在 body 上，供「座舱底板」和「云母浮动顶栏」共用：
   这两处都需要一块与页面底色完全一致的实底来遮挡滚过的正文，而 background-attachment: fixed
   能把渐变钉到视口上，画出来与页面底色逐像素一致（实测 RGB 通道差 0），不会产生横向色差。 */
[data-dsh-glass] body {
  --dsh-glass-ground-layers:
    radial-gradient(58% 46% at 18% 6%, color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) calc(12% * var(--dsh-glass-ambience) * var(--dsh-glass-glow,0)), transparent), transparent 68%),
    radial-gradient(48% 42% at 86% 14%, color-mix(in srgb, var(--dsw-alias-state-success-tertiary) calc(10% * var(--dsh-glass-ambience) * var(--dsh-glass-glow,0)), transparent), transparent 62%),
    linear-gradient(165deg, color-mix(in srgb, var(--dsh-glass-ground), var(--dsh-glass-wash-tint) calc(var(--dsh-glass-wash-mix) * var(--dsh-glass-ambience))) 0%, var(--dsh-glass-ground) 55%, color-mix(in srgb, var(--dsh-glass-ground), #000 calc(5% * var(--dsh-glass-ambience))) 100%);
}

/* 输入框座舱遮挡（Issue #69）：玻璃层把宿主 composerSeat 的原生 36px 渐变底板覆盖成了透明，
   向上回看历史时正文会直接穿过输入卡片与底部 dock 区域；参考插件那条 dock 遮罩带又因色差被移除，
   于是两层遮挡同时缺失。这里补回遮挡，拆成「座舱底板 + 上沿渐隐带」两段：
   底板铺与页面底色逐像素一致的底盘（见上），彻底挡住正文且无色带；
   渐隐带用 mask 淡出同一块底盘，高度 16px 是因为实测最后一条消息底部与座舱顶部正好留白 16px，
   只覆盖这段空白，滚到底时不会把最后一条消息一起淡掉。 */
[data-dsh-glass] [data-phase=active] [class*="composerSeat"][class*="composerSeat"],
[data-dsh-glass] [data-content-phase=active] [class*="composerSeat"][class*="composerSeat"] {
  background: var(--dsh-glass-ground-layers);
  background-attachment: fixed;
}

[data-dsh-glass] [data-phase=active] [class*="composerSeat"][class*="composerSeat"]::before,
[data-dsh-glass] [data-content-phase=active] [class*="composerSeat"][class*="composerSeat"]::before {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: 100%;
  height: 16px;
  z-index: -1;
  pointer-events: none;
  background: var(--dsh-glass-ground-layers);
  background-attachment: fixed;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 100%);
}

/* 云母浮动顶栏同一缺陷：顶栏底色只有 52% × frost（clear 预设仅 8.3%）、blur 为 0，
   而浮动排版又用 margin-top:-95px / padding-top:107px 故意让正文从顶栏下方穿过，
   于是正文与「加载更早」之类的胶囊会直接透过顶栏显示。这里沿用座舱同一手法补实底。 */
[data-dsh-glass-float] [data-phase] header:not([class*="headerBlank"]) {
  background: var(--dsh-glass-ground-layers);
  background-attachment: fixed;
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
					styleTag.textContent = GLASS_CSS_TEXT + GLASS_EXTRA_CSS;
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
		const ALL_BUILTIN_THEMES = [
			{
				id: "codex-dark",
				colorScheme: "dark",
				tokens: {
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
				id: "catppuccin-mocha",
				colorScheme: "dark",
				tokens: {
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
			},
			{
				id: "catppuccin-macchiato",
				colorScheme: "dark",
				tokens: {
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
			},
			{
				id: "catppuccin-frappe",
				colorScheme: "dark",
				tokens: {
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
			},
			{
				id: "catppuccin-latte",
				colorScheme: "light",
				tokens: {
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
		const listeners$1 = /* @__PURE__ */ new Set();
		const VALID_THEMES = [
			"stock",
			"codex-dark",
			"codex-light",
			"catppuccin-mocha",
			"catppuccin-macchiato",
			"catppuccin-frappe",
			"catppuccin-latte"
		];
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
		function computeSnapshot() {
			const rawTheme = safeGetItem(STORAGE_KEYS.themeOption);
			const themeOption = rawTheme && VALID_THEMES.includes(rawTheme) ? rawTheme : "stock";
			const glassEnabled = safeGetItem(STORAGE_KEYS.glassEnabled) !== "false";
			const glassMode = safeGetItem(STORAGE_KEYS.glassMode) === "compat" ? "compat" : "mica";
			const rawPreset = safeGetItem(STORAGE_KEYS.glassPreset);
			const glassPreset = rawPreset === "clear" || rawPreset === "frosted" ? rawPreset : "standard";
			const glassGlow = safeGetItem(STORAGE_KEYS.glassGlow) === "true";
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
			for (const listener of listeners$1) try {
				listener();
			} catch (e) {
				console.warn("[codex-ui:theme] listener error:", e);
			}
		}
		function setThemeOption(themeOption) {
			safeSetItem(STORAGE_KEYS.themeOption, themeOption);
			notify();
		}
		function setGlassEnabled(enabled) {
			safeSetItem(STORAGE_KEYS.glassEnabled, String(enabled));
			notify();
		}
		function setGlassMode(mode) {
			safeSetItem(STORAGE_KEYS.glassMode, mode);
			notify();
		}
		function setGlassPreset(preset) {
			safeSetItem(STORAGE_KEYS.glassPreset, preset);
			notify();
		}
		function setGlassGlow(glow) {
			safeSetItem(STORAGE_KEYS.glassGlow, String(glow));
			notify();
		}
		function subscribeThemeSettings(listener) {
			listeners$1.add(listener);
			return () => {
				listeners$1.delete(listener);
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

/* 彻底清除输入框底部 dock / stats 区域的半透明灰色脏色块与切线 */
[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar] > [class*="dock"]:before,
[data-dsh-glass] [data-phase] [data-dsh-glass-inputbar] > [data-composer-dock]:before,
[data-dsh-glass] [class*="dock"]:before,
[data-dsh-glass] [data-composer-dock]:before {
  display: none !important;
  content: none !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
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
			}
		];
		const stylesheet$1 = `
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
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-theme-row-label",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-theme-row-title",
								children: t("theme.palette")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-theme-row-hint",
								children: t("theme.paletteHint")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
				id: "dependencies",
				nameKey: "about.feature.dependencies.name",
				descKey: "about.feature.dependencies"
			}
		];
		const endpoint = CODEX_UI_API_ENDPOINTS.dependencies;
		const stylesheet = `
.dcu-about{color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);display:flex;flex-direction:column}
.dcu-about-head{display:flex;flex-direction:column;align-items:stretch;gap:12px;margin-bottom:16px}
.dcu-about-title-block{min-width:0}
.dcu-about h2,.dcu-about-title{margin:0;font-size:24px;line-height:32px;font-weight:600;letter-spacing:-.4px;color:var(--dsw-alias-label-primary)}
.dcu-about-title-row{display:flex;align-items:center;gap:8px 12px;min-width:0;flex-wrap:wrap}
.dcu-about-feedback-links,.dcu-about-links{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dcu-about-version{margin-left:8px;color:var(--dsw-alias-label-tertiary);font-family:inherit;font-size:12px;font-weight:500;line-height:18px;letter-spacing:0;white-space:nowrap;vertical-align:baseline}
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
		function AboutSection({ t }) {
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
			const install = async (id) => {
				if (installingRef.current !== void 0) return;
				installingRef.current = id;
				setInstalling(id);
				setMessage(void 0);
				try {
					const response = await fetch(`${endpoint}?dependency=${encodeURIComponent(id)}`, { method: "POST" });
					if ([
						401,
						403,
						503
					].includes(response.status)) throw new BusinessRequestError(response.status);
					const payload = await response.json();
					if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error(typeof payload.error === "string" ? payload.error : t("about.installFailed"));
					if (!alive.current) return;
					setDependencies(payload.dependencies);
					setState("ready");
					setRefreshFailed(false);
					setMessage({
						error: false,
						text: payload.autoReload === false ? t("about.restartManually") : t("about.restartRequired")
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
					if ([
						401,
						403,
						503
					].includes(response.status)) throw new BusinessRequestError(response.status);
					const payload = await response.json();
					if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error(typeof payload.error === "string" ? payload.error : t("about.installFailed"));
					if (!alive.current) return;
					setDependencies(payload.dependencies);
					setState("ready");
					setRefreshFailed(false);
					setMessage({
						error: false,
						text: payload.restartRequired === false ? t("about.upToDate") : payload.autoReload === false ? t("about.restartManually") : t("about.restartRequired")
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-about-head",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-about-title-block",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-about-title-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h2", {
									className: "dcu-about-title",
									children: [t("about.title"), selfVersion === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "dcu-about-version",
										children: ["v", selfVersion]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-about-feedback-links dcu-about-links",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GithubMark16, {}),
											"aria-label": t("about.viewProject"),
											onClick: () => {
												openExternal("https://github.com/MichengAI/dsh-codex-ui");
											},
											children: t("about.viewProject")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconListPenOutlineMedium, { size: 14 }),
											"aria-label": t("about.feedback"),
											onClick: () => {
												openExternal("https://github.com/MichengAI/dsh-codex-ui/issues");
											},
											children: t("about.feedback")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											icon: state === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconLoadingOutlineMedium, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconRefreshOutlineMedium, { size: 14 }),
											"aria-label": t("about.checkUpdate"),
											disabled: state === "loading" || installing !== void 0,
											onClick: () => {
												load();
											},
											children: state === "loading" ? t("about.checking") : t("about.checkUpdate")
										})
									]
								})]
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-section-card dcu-card-features",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-section-header",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-section-title-wrap",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: "dcu-section-title",
									children: t("about.features")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dcu-section-desc",
									children: t("about.description")
								})]
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThemeSettingsCard, { t }),
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
			"about.nav": "Codex UI",
			"about.title": "Codex UI",
			"about.viewProject": "GitHub",
			"about.feedback": "问题反馈",
			"about.checkUpdate": "检查更新",
			"about.checking": "正在检查更新…",
			"about.description": "为 DSH 提供输入框增强、全屏设置工作台美化与生态插件管理。",
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
			"about.restartRequired": "正在热更新插件，窗口会自动刷新。",
			"about.restartManually": "安装完成。当前 Web 无法自动重启，请重启 DSH Web 后刷新页面。",
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
			"theme.title": "界面外观与换肤",
			"theme.desc": "定制 DeepSeek Harness 视觉风格，支持 Codex 经典配色与悬浮云母质感。",
			"theme.palette": "主题配色",
			"theme.paletteHint": "选择内置官方或 Codex 风格配色方案",
			"theme.paletteStock": "官方默认",
			"theme.paletteCodexDark": "Codex 暗色",
			"theme.paletteCodexLight": "Codex 亮色",
			"theme.paletteMocha": "Mocha (摩卡)",
			"theme.paletteMacchiato": "Macchiato (玛奇朵)",
			"theme.paletteFrappe": "Frappé (冰吸)",
			"theme.paletteLatte": "Latte (拿铁)",
			"theme.subStock": "跟随系统 原生界面",
			"theme.subCodexDark": "沉浸炭黑 极客质感",
			"theme.subCodexLight": "极简纸白 纯净阅读",
			"theme.subMocha": "摩卡暗色 舒适护眼",
			"theme.subMacchiato": "玛奇朵暗色 典雅柔和",
			"theme.subFrappe": "冰吸暗色 雾感通透",
			"theme.subLatte": "拿铁暖白 温润明快",
			"theme.mode": "排版模式",
			"theme.modeHint": "云母效果重塑为悬浮磨砂卡片；原版排版保持官方布局换用玻璃材质",
			"theme.modeMica": "云母效果 (悬浮卡片)",
			"theme.modeCompat": "原版排版 (平铺玻璃)",
			"theme.glassPreset": "材质预设",
			"theme.glassPresetHint": "在云母与原版排版模式下均可自由切换通透与磨砂程度",
			"theme.presetClear": "清透 (高透光)",
			"theme.presetStandard": "标准 (适中)",
			"theme.presetFrosted": "磨砂 (强虚化)",
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
			"about.nav": "Codex UI",
			"about.title": "Codex UI",
			"about.viewProject": "GitHub",
			"about.feedback": "Issues",
			"about.checkUpdate": "Check for updates",
			"about.checking": "Checking…",
			"about.description": "Adds input enhancements, fullscreen settings workbench skin, and ecosystem plugin management to DSH.",
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
			"about.restartRequired": "Updating plugins now. The window will refresh automatically.",
			"about.restartManually": "Installation complete. This Web host cannot restart itself; restart DSH Web, then refresh the page.",
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
			"theme.title": "Appearance & Themes",
			"theme.desc": "Customize DeepSeek Harness visual styling with Codex themes and frosted mica glass.",
			"theme.palette": "Theme Palette",
			"theme.paletteHint": "Choose official default or classic Codex color schemes",
			"theme.paletteStock": "Official Default",
			"theme.paletteCodexDark": "Codex Dark",
			"theme.paletteCodexLight": "Codex Light",
			"theme.paletteMocha": "Mocha",
			"theme.paletteMacchiato": "Macchiato",
			"theme.paletteFrappe": "Frappé",
			"theme.paletteLatte": "Latte",
			"theme.subStock": "System default",
			"theme.subCodexDark": "Immersive carbon dark",
			"theme.subCodexLight": "Clean paper light",
			"theme.subMocha": "Mocha dark & soothing",
			"theme.subMacchiato": "Macchiato soft tone",
			"theme.subFrappe": "Frappé cool mist",
			"theme.subLatte": "Latte warm light",
			"theme.mode": "Layout Mode",
			"theme.modeHint": "Mica restyles the UI into floating frosted cards; Compatibility keeps the stock layout with glass material",
			"theme.modeMica": "Mica Cards",
			"theme.modeCompat": "Stock Compat",
			"theme.glassPreset": "Material Preset",
			"theme.glassPresetHint": "Toggle transparency and blur levels in both Mica and Stock layout modes",
			"theme.presetClear": "Clear",
			"theme.presetStandard": "Standard",
			"theme.presetFrosted": "Frosted",
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
			if (/^(账号|账户|余额|account|balance)/i.test(normalized)) return "personal";
			if (/^(通用|常规|偏好|general|preferences)/i.test(normalized)) return "personal";
			if (/^(归档|已归档|历史|archive|archived)/i.test(normalized)) return "records";
			if (/^(关于|codex ui|about)/i.test(normalized)) return "records";
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

/* 左侧整列侧栏：与首页侧栏严格等宽，底色对齐 --dsw-specific-sidebar-fill */
[data-shortcut-modal="settings"] > nav {
  box-sizing: border-box !important;
  width: var(--dcu-settings-nav-width, 280px) !important;
  min-width: var(--dcu-settings-nav-width, 280px) !important;
  max-width: var(--dcu-settings-nav-width, 280px) !important;
  flex-shrink: 0 !important;
  gap: 12px !important;
  padding: 16px 12px 24px !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #121214)) !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

/* 设置工作台必须使用实色不透明底板，严禁半透明导致底层文本透出重影 */
[data-shortcut-modal="settings"] {
  background: var(--dsw-alias-bg-base, #151517) !important;
}

[data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) {
  background: var(--dsw-alias-bg-base, #151517) !important;
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
  background: var(--dsh-glass-card, var(--dsw-alias-bg-layer-1)) !important;
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
  background: var(--dsw-alias-bg-layer-1) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  overflow: hidden !important;
}

/* 云母模式下收敛顶部工具栏与内容区 padding，消除脱节大空隙 */
html[data-dsh-glass-float] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :first-child {
  height: 48px !important;
  min-height: 48px !important;
  padding: 0 24px !important;
  background: var(--dsw-alias-bg-layer-1) !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) > :nth-child(2) {
  padding: 16px 36px 48px !important;
  background: var(--dsw-alias-bg-layer-1) !important;
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
[data-shortcut-modal="settings"] nav button.dcu-settings-back-btn {
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
[data-shortcut-modal="settings"] nav button.dcu-settings-back-btn:hover {
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
[data-shortcut-modal="settings"] nav [class*="navList"],
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
[data-shortcut-modal="settings"] nav button,
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

[data-shortcut-modal="settings"] nav button svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button svg {
  width: 16px !important;
  height: 16px !important;
  flex-shrink: 0 !important;
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  stroke-width: 1.5 !important;
  transition: color 0.12s ease !important;
}

[data-shortcut-modal="settings"] nav button:hover,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:hover {
  background: var(--dsw-specific-sidebar-nav-item-hover, var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.05))) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

[data-shortcut-modal="settings"] nav button:hover svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:hover svg {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

/* 选中菜单项：纯正 Codex 胶囊激活态（Capsule Pill） */
[data-shortcut-modal="settings"] nav button[aria-current="true"],
[data-shortcut-modal="settings"] nav button[class*="active"],
[data-shortcut-modal="settings"] nav [class*="navCell"][class*="active"],
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[aria-current="true"],
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[class*="active"] {
  background: var(--dsw-specific-sidebar-nav-item-active, var(--dsw-alias-interactive-bg-selected, rgba(255, 255, 255, 0.10))) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  font-weight: 500 !important;
}

[data-shortcut-modal="settings"] nav button[aria-current="true"] svg,
[data-shortcut-modal="settings"] nav button[class*="active"] svg,
[data-shortcut-modal="settings"] nav [class*="navCell"][class*="active"] svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[aria-current="true"] svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[class*="active"] svg {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

[data-shortcut-modal="settings"] nav button:focus-visible,
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
  padding: 32px 48px 64px !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
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

/* 右侧设置区固定宽度规范：居中排版，避免宽屏下拉伸 */
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

@media (max-width: 640px) {
  body > [role="presentation"]:has(> [data-shortcut-modal="settings"]) {
    padding: 0 !important;
  }

  [data-shortcut-modal="settings"] {
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
    border-radius: 0 !important;
    border: none !important;
    flex-direction: column !important;
    padding-top: env(safe-area-inset-top, 0px) !important;
    padding-bottom: env(safe-area-inset-bottom, 0px) !important;
    padding-left: env(safe-area-inset-left, 0px) !important;
    padding-right: env(safe-area-inset-right, 0px) !important;
    box-sizing: border-box !important;
  }

  [data-shortcut-modal="settings"] > nav {
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    gap: 10px !important;
    padding: 12px 16px 8px !important;
    border-right: 0 !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  }

  [data-shortcut-modal="settings"] > nav > :first-child { padding-inline: 4px !important; }

  [data-shortcut-modal="settings"] > nav > :nth-child(2) {
    flex-direction: row !important;
    overflow-x: auto !important;
  }

  [data-shortcut-modal="settings"] > nav > :nth-child(2) > button { flex: 0 0 auto !important; }

  [data-shortcut-modal="settings"]:not(:has(> [class*="options"])) > div:not(nav) {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow-y: auto !important;
  }

  [data-shortcut-modal="settings"] > div > :first-child { height: 48px !important; min-height: 48px !important; padding: 0 16px !important; }

  [data-shortcut-modal="settings"] > div > :nth-child(2) { padding: 16px !important; }

  [data-shortcut-modal="settings"]:has(> [class*="options"]) {
    display: flex !important;
    flex-direction: column !important;
  }
  [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="navTitle"],
  [data-shortcut-modal="settings"]:has(> [class*="options"]) > nav {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
  }
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
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #18181b)) !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  border-bottom: none !important;
  padding: 16px 12px 12px 12px !important;
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
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #18181b)) !important;
  border-right: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  border-top: none !important;
  padding: 0 12px 24px !important;
  margin: 0 !important;
  overflow-y: auto !important;
  height: 100% !important;
  flex: none !important;
}

/* 顶部操作区（打开配置文件 + 关闭按钮）：整行 56px 顶栏，精准对齐老版标准头部 */
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
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 12px !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  z-index: 10 !important;
  margin: 0 !important;
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
  padding-top: calc(56px + 28px) !important;
  padding-bottom: 64px !important;
  padding-inline: 48px !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
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
  background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08)) !important;
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
  border-right: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-left: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-top: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0 !important;
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #18181b)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) > nav {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  margin: 0 !important;
  border-right: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-left: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-bottom: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-top: none !important;
  border-radius: 0 0 16px 16px !important;
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-1, #18181b)) !important;
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
  border-radius: 16px 16px 0 0 !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(255, 255, 255, 0.08)) !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08)) !important;
  background: var(--dsw-alias-bg-layer-1) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 12px !important;
  z-index: 10 !important;
}

html[data-dsh-glass-float] body:not([data-ds-dark-theme]) [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="header"],
html[data-dsh-glass-float] html[data-ds-theme-source="light"] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="header"] {
  background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08)) !important;
}

html[data-dsh-glass-float] [data-shortcut-modal="settings"]:has(> [class*="options"]) > [class*="options"] {
  margin: 0 !important;
  border: 1px solid var(--dsh-glass-rim-soft, rgba(0, 0, 0, 0.08)) !important;
  border-radius: 16px !important;
  background: var(--dsw-alias-bg-layer-1) !important;
  box-shadow: var(--dsh-glass-drop, 0 8px 24px rgba(0, 0, 0, 0.08)), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
  padding-top: calc(56px + 28px) !important;
  padding-bottom: 48px !important;
  padding-inline: 36px !important;
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
			if (existing !== null) return () => {
				existing.remove();
			};
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
		/**
		* 对宿主动态生成的菜单按钮执行无侵入的已知项分组与搜索过滤
		*/
		function decorateSettingsNav(panelEl) {
			const sidebarWidth = getHostSidebarExpandedWidth(panelEl.ownerDocument || document);
			panelEl.style.setProperty("--dcu-settings-nav-width", `${sidebarWidth}px`);
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
			const classifyButtons = () => {
				navList.querySelectorAll(":scope > button").forEach((btn, index) => {
					const group = classifySettingsButton(btn.querySelector("span")?.textContent?.trim() ?? btn.textContent?.trim() ?? "");
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
					const label = (btn.querySelector("span")?.textContent ?? btn.textContent ?? "").toLowerCase();
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
						if (trimmed === "") header.style.removeProperty("display");
						else if ([...navList.querySelectorAll(`button[data-dcu-group="${group.id}"]`)].filter((b) => b.style.display !== "none").length > 0) header.style.removeProperty("display");
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
		const NAV_ROW_SELECTOR = "[role=\"dialog\"] nav button, [data-shortcut-modal=\"settings\"] nav button";
		const STYLE_ID = "dcu-settings-nav-icon-style";
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
			if (doc.getElementById(STYLE_ID) !== null) return;
			const style = doc.createElement("style");
			style.id = STYLE_ID;
			style.textContent = NAV_ICON_CSS;
			(doc.head ?? doc.documentElement).appendChild(style);
		}
		function matchesLabel(text, getLabel) {
			const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
			return normalized === getLabel().trim().toLowerCase() || normalized === "codex ui";
		}
		function applyNavIcon(button, getLabel) {
			if (matchesLabel(button.textContent ?? "", getLabel)) {
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
				doc.getElementById(STYLE_ID)?.remove();
			};
		}
		//#endregion
		//#region src/client/composer/input-history.ts
		const HISTORY_KEY = "michengai.codex-ui.input-history.v1";
		const LEGACY_HISTORY_KEY = "michengai.btw.history.v1";
		const MAX_STORAGE_LENGTH = 1e6;
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
					for (const [key, value] of Object.entries(data).slice(-20)) if (Array.isArray(value)) this.scopes.set(key, value.filter((item) => typeof item === "string" && item.length <= 8e3).slice(-limit));
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
				while (this.scopes.size > 20) this.scopes.delete(this.scopes.keys().next().value);
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
			(0, react.useEffect)(() => {
				const binding = ctx.sessions.binding(sessionId);
				if (binding === void 0) return;
				const scope = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd ?? sessionId;
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
				seen
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
		/** 探测宿主 codex-ui-composer 子组件是否处于激活状态（遵循 fail-closed 契约） */
		async function checkComposerEnabled() {
			try {
				const response = await fetch(CODEX_UI_API_ENDPOINTS.composer, {
					headers: { Accept: "application/json" },
					cache: "no-store"
				});
				if (!response.ok) return false;
				return (await response.json())?.enabled === true;
			} catch {
				return false;
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
				return () => {
					for (const clean of cleaners.reverse()) try {
						clean();
					} catch {}
					if (typeof document !== "undefined") {
						document.querySelectorAll(".dcu-home-suggestions").forEach((el) => el.remove());
						document.querySelectorAll("[data-dcu-width-handle]").forEach((el) => el.remove());
					}
				};
			};
			const sync = async () => {
				if (disposed) return;
				const enabled = await checkComposerEnabled();
				if (disposed) return;
				if (enabled) {
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
		const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
		/** 解析持久化内容；格式不符时返回 undefined，由调用方回退默认布局。 */
		function parseLayout(raw) {
			if (raw === null || raw === "") return void 0;
			try {
				const data = JSON.parse(raw);
				if (typeof data !== "object" || data === null) return void 0;
				const { pinned, more } = data;
				if (!isStringArray(pinned) || !isStringArray(more)) return void 0;
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

.dcu-sb-row[draggable="true"] {
  cursor: grab;
}

.dcu-sb-row[draggable="true"]:active {
  cursor: grabbing;
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

/* 拖拽放置指示线 */
.dcu-sb-row[data-drag-over="before"]::before {
  content: "";
  position: absolute;
  top: -1px;
  left: 6px;
  right: 6px;
  height: 2px;
  border-radius: 1px;
  background: var(--dsw-alias-brand-primary, #4176e6);
  pointer-events: none;
  z-index: 10;
}

.dcu-sb-row[data-drag-over="after"]::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 6px;
  right: 6px;
  height: 2px;
  border-radius: 1px;
  background: var(--dsw-alias-brand-primary, #4176e6);
  pointer-events: none;
  z-index: 10;
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
  transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
  pointer-events: none;
}

.dcu-sb-chevron-open {
  transform: rotate(180deg);
}

.dcu-sb-accordion {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 220ms cubic-bezier(0.2, 0, 0, 1), opacity 160ms ease;
  overflow: hidden;
  -webkit-app-region: no-drag !important;
}

.dcu-sb-accordion.dcu-sb-accordion-open {
  grid-template-rows: 1fr;
  opacity: 1;
  overflow: visible;
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
  overflow: visible;
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
		//#region src/client/index.ts
		const inject = [
			"slots",
			"locale",
			"sessions",
			"conversation",
			"inputTriggers",
			"layout",
			"uiWorkspace"
		];
		/** 浏览器客户端插件入口；保留官方原生侧边栏与工作区树，提供输入框增强、设置美化与生态关于页。 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "michengai-codex-ui: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.effect(() => observeTheme(ctx), "michengai-codex-ui: theme & appearance");
			ctx.effect(() => observeSidebarNav(ctx), "michengai-codex-ui: sidebar navigation");
			ctx.effect(() => observeComposerEnhancements(ctx), "michengai-codex-ui: composer enhancements");
			ctx.effect(() => observeSettingsSkin(), "michengai-codex-ui: official settings skin");
			ctx.effect(() => observeSettingsNavIcon(() => t("about.nav")), "michengai-codex-ui: settings nav icon");
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
		exports.inject = inject;
		return module.exports;
	}
});
