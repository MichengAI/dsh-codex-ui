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
		const CODEX_UI_API_BASE = "/api/dsh-codex-ui";
		const CODEX_UI_API_ENDPOINTS = Object.freeze({
			dependencies: `${CODEX_UI_API_BASE}/dependencies`,
			settingsSkin: `${CODEX_UI_API_BASE}/settings-skin`,
			composer: `${CODEX_UI_API_BASE}/composer`
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
		const endpoint = CODEX_UI_API_ENDPOINTS.dependencies;
		const stylesheet = `
.dcu-about{color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family)}.dcu-about-head{display:flex;flex-direction:column;align-items:stretch;gap:12px;margin-bottom:12px}.dcu-about-title-block{min-width:0}.dcu-about h2,.dcu-about-title{margin:0;font-size:24px;line-height:32px;font-weight:600;letter-spacing:-.4px;color:var(--dsw-alias-label-primary)}.dcu-about-intro,.dcu-about-desc{margin:12px 0 0;color:var(--dsw-alias-label-tertiary,#a0a0a0);font-size:14px;line-height:22px}.dcu-about h3{margin:24px 0 12px;font-size:16px;font-weight:600;line-height:24px;color:var(--dsw-alias-label-primary)}.dcu-about-features{margin:0;padding-left:20px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:24px}.dcu-about-dependencies-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:24px}.dcu-about-dependencies-heading h3{margin:0}.dcu-about-dependencies-heading+.dcu-about-intro,.dcu-about-dependencies-heading+.dcu-about-desc{margin-top:8px;margin-bottom:14px}.dcu-about-dependencies{overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,10px)}.dcu-about-dependency{display:flex;align-items:center;gap:12px;min-height:64px;padding:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dcu-about-dependency:last-child{border-bottom:0}.dcu-about-copy{min-width:0;flex:1}.dcu-about-name{font-size:13px;line-height:20px;font-weight:600}.dcu-about-package{overflow:hidden;margin-top:2px;color:var(--dsw-alias-label-tertiary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.dcu-about-status{display:flex;align-items:center;gap:5px;font-size:12px}.dcu-about-status[data-installed=true]{color:var(--dsw-alias-state-success-primary)}.dcu-about-status[data-installed=false]{color:var(--dsw-alias-state-error-primary)}.dcu-about-status[data-update=true]{color:var(--dsw-alias-state-warning-primary)}.dcu-about-install{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:32px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:6px 9px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}.dcu-about-install:hover:not(:disabled){background:var(--dsw-specific-menu-item-hover)}.dcu-about-install:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.dcu-about-install:disabled{cursor:default;opacity:.4}.dcu-about-install[aria-busy=true]{pointer-events:none}.dcu-about-update-all{min-height:30px;padding:4px 10px;font-weight:500;border-color:var(--dsw-alias-border-l3)}.dcu-about-progress{position:relative;margin-top:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:10px 14px 12px;background:var(--dsw-alias-bg-layer-2);display:flex;align-items:center;gap:10px;font-size:12px;overflow:hidden}.dcu-about-progress code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--dsw-alias-label-secondary)}.dcu-about-progress-pct{flex:none;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-weight:500}.dcu-about-progress-bar{position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--dsw-alias-border-l2);overflow:hidden}.dcu-about-progress-fill{height:100%;background:var(--dsw-alias-state-business-primary);transition:width 200ms ease}.dcu-about-progress-fill[data-wave=true]{width:40%;animation:dcu-progress-wave 1.4s ease-in-out infinite}@keyframes dcu-progress-wave{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}.dcu-about-message{margin-top:16px;border-radius:8px;padding:10px 14px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;border:1px solid var(--dsw-alias-border-l2)}.dcu-about-message[data-error=true]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent)}
.dcu-about-title-row{display:flex;align-items:center;gap:8px 12px;min-width:0;flex-wrap:wrap}.dcu-about-feedback-links,.dcu-about-links{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dcu-about-external-link{display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:0 8px;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;font-size:12px;font-weight:500;line-height:18px;text-decoration:none;white-space:nowrap}.dcu-about-external-link:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.dcu-about-external-link:focus-visible{outline:2px solid var(--dsw-alias-state-success-primary);outline-offset:2px}.dcu-about-external-link svg{flex:none}@media(max-width:720px){.dcu-about-title-row{flex-wrap:wrap}}
.dcu-about-version{margin-left:8px;color:var(--dsw-alias-label-tertiary);font-family:inherit;font-size:12px;font-weight:500;line-height:18px;letter-spacing:0;white-space:nowrap;vertical-align:baseline}
.dcu-about-project-link{color:inherit;text-decoration:none}.dcu-about-project-link:hover{text-decoration:underline;text-underline-offset:3px}.dcu-about-project-link:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px;border-radius:2px}
.dcu-about-name-row{display:flex;align-items:center;gap:10px;min-width:0}.dcu-about-name-row .dcu-about-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-about-downloads{display:inline-flex;align-items:center;gap:4px;flex:none;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:20px;font-weight:400;font-variant-numeric:tabular-nums;text-decoration:none;white-space:nowrap}.dcu-about-downloads svg{flex:none;opacity:.75}.dcu-about-downloads:hover{color:var(--dsw-alias-label-primary)}.dcu-about-downloads:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:3px;border-radius:2px}@media(max-width:480px){.dcu-about-dependency{flex-wrap:wrap;gap:8px}.dcu-about-copy{flex-basis:100%}}
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
					} catch {
						if (!cancelled) return;
					}
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
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-about-title-block",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dcu-about-desc dcu-about-intro",
								children: t("about.description")
							})]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("about.features") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
						className: "dcu-about-features",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.composer") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.settingsSkin") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.sessionTitle") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.dependencies") })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-about-dependencies-heading",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("about.dependencies") }), state === "ready" && actionableCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							className: "dcu-about-install dcu-about-update-all",
							type: "button",
							"aria-busy": installing === "all",
							disabled: installing !== void 0,
							onClick: () => {
								updateAll();
							},
							children: [installing === "all" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconLoadingOutlineMedium, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconDownloadOutlineMedium, { size: 14 }), installing === "all" ? t("about.updatingAll") : t("about.updateAll")]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dcu-about-intro",
						children: t("about.dependenciesDescription")
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
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-about-status",
									"data-installed": dependency.installed,
									"data-update": dependency.updateAvailable,
									children: [dependency.installed && !dependency.updateAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCheckOutlineMedium, { size: 14 }), dependency.updateAvailable ? t("about.updateAvailable") : dependency.installed ? t("about.installed") : t("about.missing")]
								}),
								(!dependency.installed || dependency.updateAvailable) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									className: "dcu-about-install",
									type: "button",
									disabled: installing !== void 0,
									onClick: () => {
										install(dependency.id);
									},
									children: [installing === dependency.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconLoadingOutlineMedium, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconDownloadOutlineMedium, { size: 14 }), installing === dependency.id ? t("about.installing") : dependency.updateAvailable ? t("about.update") : t("about.install")]
								})
							]
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
			"about.features": "基本功能",
			"about.feature.composer": "输入历史快捷召回 (↑/↓) 与自适应宽度拖拽调节",
			"about.feature.settingsSkin": "全屏设置工作台美化、原生输入框与分类检索",
			"about.feature.sessionTitle": "基于首句内容语义总结并智能生成会话标题",
			"about.feature.dependencies": "深度集成 DSH 生态插件集中管理与一键更新",
			"about.dependencies": "配套管理插件",
			"about.dependenciesDescription": "每个配套插件都可单独安装和更新，也可一键安装缺失项并更新旧版本。可分别检查 Codex UI、专家、技能、归档、IM、定时任务、BTW、Simplify、PUA、代码审查、宠物和应用市场。",
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
			"sessionTitle.type.research": "研究"
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
			"about.features": "Core features",
			"about.feature.composer": "Input history recall (↑/↓) and adaptive width resizing",
			"about.feature.settingsSkin": "Fullscreen settings workbench skin, native input, and classified search",
			"about.feature.sessionTitle": "Smart semantic session title generation from the first prompt",
			"about.feature.dependencies": "Centralized management and one-click updates for DSH ecosystem plugins",
			"about.dependencies": "Companion management plugins",
			"about.dependenciesDescription": "Install or update each companion separately, or install missing plugins and update old versions in one action. Check Codex UI, expert, skill, archive, IM, scheduled-task, BTW, Simplify, PUA, code review, pet, and marketplace plugins on their own.",
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
			"sessionTitle.type.research": "Research"
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
/* 全屏工作台 Presentation 遮罩层铺满 */
body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"] {
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
html[data-platform="darwin"] body > [role="presentation"]:not(#root),
html[data-platform="darwin"] [data-shortcut-modal="settings"] {
  -webkit-app-region: initial;
}

html[data-windows-titlebar]:not([data-fullscreen]) body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"],
html[data-windows-titlebar]:not([data-fullscreen]) [data-shortcut-modal="settings"] {
  top: var(--dsh-windows-titlebar-height, var(--dsh-frame-chrome-top, 40px)) !important;
  height: calc(100vh - var(--dsh-windows-titlebar-height, var(--dsh-frame-chrome-top, 40px))) !important;
}

html[data-platform="darwin"]:not([data-fullscreen]) body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"],
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
}

.dcu-settings-back-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: var(--dsw-radius-sm, 6px) !important;
  background: transparent !important;
  border: none !important;
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  cursor: pointer !important;
  padding: 0 !important;
  transition: color 0.12s ease, background 0.12s ease !important;
}

.dcu-settings-back-btn:hover {
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
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button svg {
  width: 16px !important;
  height: 16px !important;
  flex-shrink: 0 !important;
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  stroke-width: 1.5 !important;
  transition: color 0.12s ease !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:hover {
  background: var(--dsw-specific-sidebar-nav-item-hover, var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.05))) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:hover svg {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

/* 选中菜单项：纯正 Codex 胶囊激活态（Capsule Pill） */
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[aria-current="true"],
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[class*="active"] {
  background: var(--dsw-specific-sidebar-nav-item-active, var(--dsw-alias-interactive-bg-selected, rgba(255, 255, 255, 0.10))) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  font-weight: 500 !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[aria-current="true"] svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[class*="active"] svg {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:focus-visible {
  outline: 2px solid var(--dsw-alias-state-focus-ring, var(--dsw-static-deepseek-500, #4176e6)) !important;
  outline-offset: 1px !important;
}

/* 右侧内容工作区 */
[data-shortcut-modal="settings"] > div:not(nav) {
  display: flex !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  height: 100% !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child {
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

[data-shortcut-modal="settings"] > div:not(nav) > :first-child h2,
[data-shortcut-modal="settings"] > div:not(nav) > :first-child span {
  font-size: 16px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
  letter-spacing: -0.01em;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child button,
[data-shortcut-modal="settings"] > div:not(nav) > :first-child a {
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  transition: color 0.15s ease;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child button:hover,
[data-shortcut-modal="settings"] > div:not(nav) > :first-child a:hover {
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) {
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

/* 右侧设置区固定宽度规范：居中排版，避免宽屏下拉伸 */
[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) > * {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
  box-sizing: border-box !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) > * > * {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
  box-sizing: border-box !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) [class*="section"] {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
}

@media (max-width: 640px) {
  body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"] {
    padding: 0;
  }

  [data-shortcut-modal="settings"] {
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    border-radius: 0;
    border: none;
    flex-direction: column;
  }

  [data-shortcut-modal="settings"] > nav {
    width: 100%;
    min-width: 0;
    gap: 10px;
    padding: 12px 16px 8px;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  [data-shortcut-modal="settings"] > nav > :first-child { padding-inline: 4px; }

  [data-shortcut-modal="settings"] > nav > :nth-child(2) {
    flex-direction: row;
    overflow-x: auto;
  }

  [data-shortcut-modal="settings"] > nav > :nth-child(2) > button { flex: 0 0 auto; }

  [data-shortcut-modal="settings"] > div > :first-child { height: 48px; min-height: 48px; padding: 0 16px; }

  [data-shortcut-modal="settings"] > div > :nth-child(2) { padding: 16px; }
}
`;
		/** 探测宿主 settings-skin 子组件是否处于激活状态 */
		async function checkSettingsSkinEnabled() {
			try {
				const response = await fetch("/api/dsh-codex-ui/settings-skin", {
					headers: { Accept: "application/json" },
					cache: "no-store"
				});
				if (!response.ok) return false;
				return (await response.json())?.enabled === true;
			} catch {
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
			const navHeader = panelEl.querySelector("nav > :first-child");
			const navList = panelEl.querySelector("nav > :nth-child(2)");
			if (!navList) return () => {};
			const isZh = (document.documentElement.lang || "zh").startsWith("zh");
			let cleanHeader = () => {};
			if (navHeader && !navHeader.querySelector(".dcu-settings-nav-header-root")) {
				const originalChildren = Array.from(navHeader.childNodes);
				originalChildren.forEach((child) => {
					if (child instanceof HTMLElement) child.style.display = "none";
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
			if (typeof document !== "undefined" && document.querySelector("[data-shortcut-modal=\"settings\"]")) sync();
			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) for (const node of mutation.addedNodes) if (node instanceof HTMLElement) {
					if (node.getAttribute("data-shortcut-modal") === "settings" || node.querySelector("[data-shortcut-modal=\"settings\"]")) {
						sync();
						return;
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
		/** 探测宿主 codex-ui-composer 子组件是否处于激活状态 */
		async function checkComposerEnabled() {
			try {
				const response = await fetch(CODEX_UI_API_ENDPOINTS.composer, {
					headers: { Accept: "application/json" },
					cache: "no-store"
				});
				if (!response.ok) return true;
				return (await response.json())?.enabled !== false;
			} catch {
				return true;
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
			}, 2500);
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
		//#region src/client/index.ts
		const inject = [
			"slots",
			"locale",
			"sessions",
			"conversation",
			"inputTriggers"
		];
		/** 浏览器客户端插件入口；100% 保留官方原生侧边栏与工作区树，提供输入框增强、设置美化与生态关于页。 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "michengai-codex-ui: dictionaries");
			const t = ctx.locale.bind(NS);
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
