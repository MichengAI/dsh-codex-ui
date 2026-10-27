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
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		_deepseek_ai_dsh_client_ui_primitives = __toESM(_deepseek_ai_dsh_client_ui_primitives, 1);
		let react_dom = require("react-dom");
		//#region src/client/session-host.ts
		var UnknownSessionError = class extends Error {
			constructor() {
				super("unknown session");
				this.name = "UnknownSessionError";
			}
		};
		/** 旧宿主读 list.current；alpha.2 主视图改由 retainedBy.mainView 标记。 */
		function currentSessionId(state) {
			if (state === void 0) return void 0;
			if (typeof state.current === "string" && state.current !== "") return state.current;
			const byId = state.byId ?? {};
			const ids = Array.isArray(state.ids) && state.ids.length > 0 ? state.ids : Object.keys(byId);
			const pick = (id, row) => {
				if (row === void 0 || (row.retainedBy?.mainView ?? 0) <= 0) return void 0;
				const explicit = row.id?.trim();
				return explicit !== void 0 && explicit !== "" ? explicit : id;
			};
			for (const id of ids) {
				const found = pick(id, byId[id]);
				if (found !== void 0) return found;
			}
			for (const id of Object.keys(byId)) {
				if (ids.includes(id)) continue;
				const found = pick(id, byId[id]);
				if (found !== void 0) return found;
			}
		}
		/** 官方树在全局面板打开时取消会话选中。 */
		function visibleSelectedSessionId(state, panelActive = false) {
			return panelActive ? void 0 : currentSessionId(state);
		}
		function sessionRowUnread(localUnread, status, selected = false) {
			return localUnread || status?.completionUnread === true && !selected;
		}
		function sessionRunningFlags(byId, status) {
			const ids = new Set(Object.keys(byId));
			if (status !== void 0) for (const id of status.keys()) ids.add(id);
			const next = {};
			for (const id of ids) next[id] = sessionIsRunning(byId[id], status?.get(id));
			return next;
		}
		function hostAccess(ctx) {
			return ctx;
		}
		/** 有 reflect 时只 probe，不能硬读未注入服务，否则 Cordis 会挡住插件激活。 */
		function probeService(ctx, name) {
			if (ctx === void 0) return void 0;
			const access = hostAccess(ctx);
			const reflectGet = access.reflect?.get;
			const hasReflect = typeof reflectGet === "function";
			if (hasReflect) try {
				const found = reflectGet.call(access.reflect, name);
				if (found !== void 0) return found;
			} catch {}
			if (typeof access.get === "function") try {
				const found = access.get(name);
				if (found !== void 0) return found;
			} catch {
				return;
			}
			if (hasReflect) return void 0;
			try {
				return access[name];
			} catch {
				return;
			}
		}
		function isSessionArchived(ctx, id) {
			if (id === "") return false;
			const access = hostAccess(ctx);
			let store;
			try {
				store = probeService(access, "workspaces") ?? access.workspaces;
			} catch {
				return false;
			}
			return store?.list?.getSnapshot?.()?.archivedSessionIds?.includes(id) ?? false;
		}
		function openHostSession(ctx, id) {
			if (id === "") return false;
			if (isSessionArchived(ctx, id)) return false;
			const access = hostAccess(ctx);
			const uiWorkspace = probeService(access, "uiWorkspace");
			if (typeof uiWorkspace?.openSession === "function") try {
				uiWorkspace.openSession(id);
				return true;
			} catch {
				return false;
			}
			if (typeof access.sessions?.retain === "function") return false;
			if (typeof access.sessions?.open === "function") try {
				access.sessions.open(id);
				return true;
			} catch {
				return false;
			}
			return false;
		}
		async function withSessionBinding(sessions, sessionId, operation) {
			const host = sessions === void 0 ? void 0 : hostAccess({ sessions }).sessions;
			if (host === void 0) throw new UnknownSessionError();
			if (typeof host.using === "function") return host.using(sessionId, { source: "controllerOperation" }, async (reference) => {
				if (reference.ready !== void 0) await reference.ready;
				if (reference.binding === void 0) throw new UnknownSessionError();
				return operation(reference.binding);
			});
			const existing = host.binding?.(sessionId);
			if (existing !== void 0) return operation(existing);
			if (typeof host.retain !== "function") throw new UnknownSessionError();
			const reference = host.retain(sessionId, { source: "controllerOperation" });
			try {
				if (reference.ready !== void 0) await reference.ready;
				if (reference.binding === void 0) throw new UnknownSessionError();
				return await operation(reference.binding);
			} finally {
				reference.release?.();
			}
		}
		async function renameHostSession(ctx, sessionId, title) {
			await withSessionBinding(hostAccess(ctx).sessions, sessionId, async (binding) => {
				if (typeof binding.session?.rename !== "function") throw new UnknownSessionError();
				const result = await binding.session.rename(title);
				if (result.ok === false) throw result.error ?? /* @__PURE__ */ new Error("rename failed");
			});
		}
		async function forkHostSession(ctx, sessionId) {
			const access = hostAccess(ctx);
			const uiWorkspace = probeService(access, "uiWorkspace");
			if (typeof uiWorkspace?.forkSession === "function") {
				await uiWorkspace.forkSession(sessionId);
				return;
			}
			const childId = await access.sessions?.fork?.({
				sessionId,
				increaseTitle: true
			});
			if (typeof childId === "string" && childId !== "") openHostSession(access, childId);
		}
		async function archiveHostSession(ctx, sessionId) {
			const access = hostAccess(ctx);
			const uiWorkspace = probeService(access, "uiWorkspace");
			if (typeof uiWorkspace?.archiveSession === "function") {
				await uiWorkspace.archiveSession(sessionId);
				return;
			}
			await access.workspaces?.archiveSession?.(sessionId);
		}
		function mergePendingInteractions(legacy, status) {
			const next = new Map(legacy);
			for (const [id, row] of status) if (row?.pendingInteraction !== void 0) next.set(id, row.pendingInteraction);
			return next;
		}
		function sessionIsRunning(session, status) {
			if (status?.running !== void 0) return status.running === true;
			return session?.running === true;
		}
		//#endregion
		//#region src/client/session-navigation.ts
		function openConversation(host, layout, id) {
			const opened = openHostSession(host, id);
			if (opened) selectGlobalPanel(layout, null);
			return opened;
		}
		/** 归档判断必须先于 byId：已释放的归档会话不在 byId，直接 wait 会让深链永远清不掉。 */
		function deepLinkAction(byId, archived, sessionId) {
			if (archived) return "clean";
			return byId[sessionId] === void 0 ? "wait" : "open";
		}
		/** 统一检测旧宿主是否提供面板切换能力，保留宿主方法的 this。 */
		function selectGlobalPanel(layout, id) {
			if ("selectPanel" in layout && typeof layout.selectPanel === "function") layout.selectPanel(id);
		}
		//#endregion
		//#region src/client/workspace-shortcuts.ts
		function hasBindings(value) {
			const state = value.hooks?.workspaceShortcuts;
			return typeof state?.getSnapshot === "function" && typeof state.subscribe === "function" && typeof value.closeAddWorkspace === "function" && typeof value.setDirectoryBusy === "function" && typeof value.createWorkspace === "function";
		}
		/** Read the official, shadowed registration's public injected face; keep its command IDs and key bindings. */
		function createWorkspaceShortcutSource(slots) {
			let entry;
			let bindings;
			let lastSearch = 0;
			let snapshot = {
				searchRequest: 0,
				addRequested: false
			};
			const listeners = /* @__PURE__ */ new Set();
			let offState = () => {};
			const publish = () => {
				const state = bindings?.hooks.workspaceShortcuts.getSnapshot();
				const searchRequest = snapshot.searchRequest + (state !== void 0 && state.searchRequest !== lastSearch ? 1 : 0);
				lastSearch = state?.searchRequest ?? 0;
				const addRequested = state?.addRequested ?? false;
				if (snapshot.bindings === bindings && snapshot.searchRequest === searchRequest && snapshot.addRequested === addRequested) return;
				snapshot = {
					searchRequest,
					addRequested,
					bindings
				};
				for (const listener of listeners) listener();
			};
			const reconcile = () => {
				const next = slots.entries("sidebar.workspaces").find((row) => row.locale === "workspace");
				if (next === entry) return;
				offState();
				entry = next;
				const injected = next?.inject?.();
				bindings = injected && hasBindings(injected) ? injected : void 0;
				lastSearch = bindings?.hooks.workspaceShortcuts.getSnapshot().searchRequest ?? 0;
				offState = bindings?.hooks.workspaceShortcuts.subscribe(publish) ?? (() => {});
				publish();
			};
			reconcile();
			const offSlots = slots.subscribe("sidebar.workspaces", reconcile);
			return {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				dispose: () => {
					offSlots();
					offState();
					listeners.clear();
				}
			};
		}
		//#endregion
		//#region src/client/workspace-directory-flow.ts
		const WORKSPACE_DIRECTORY_FLOW = "sidebar.codex.directoryFlow";
		/** Give the selected host picker an outlet owned by our sidebar, including while collapsed.
		* Directory pickers have no children; preserve their injected face, locale and store.
		* The registry has erased the original component's types, so only this forwarding boundary
		* uses the erased registration signature. No host implementation or private state is imported.
		*/
		function registerWorkspaceDirectoryFlow(ctx) {
			ctx.slots.inject(WORKSPACE_DIRECTORY_FLOW, () => {
				let entry;
				let offEntry = () => {};
				const register = ctx.slots.register.bind(ctx.slots);
				const reconcile = () => {
					const next = ctx.slots.entriesOfSlot("sidebar.workspaces.directoryFlow")[0];
					if (next === entry) return;
					offEntry();
					offEntry = () => {};
					entry = next;
					if (!next || Object.keys(next.children ?? {}).length > 0) return;
					offEntry = register({
						name: WORKSPACE_DIRECTORY_FLOW,
						inject: next.inject,
						store: next.store,
						locale: next.locale
					}, next.component);
				};
				reconcile();
				const off = ctx.slots.subscribe("sidebar.workspaces.directoryFlow", reconcile);
				return () => {
					off();
					offEntry();
				};
			});
		}
		//#endregion
		//#region src/client/official-slot-shadow.ts
		/**
		* 真实插槽核会在同一轮同步启动里继续挂官方插件。
		* 立刻声明官方也要声明的子插槽，官方注册会抛出且不会重试，停用后官方就回不来。
		* 测试夹具没有 spec，保持同步登记。
		*/
		function registerAfterOfficialWave(slots, slot, officialReady, register, waitForOfficial = false) {
			const face = slots;
			if (typeof face.spec !== "function") return register();
			let remove = () => {};
			let done = false;
			let off = () => {};
			let timer;
			const finish = (timedOut = false) => {
				if (done) return;
				done = true;
				if (timer !== void 0) clearTimeout(timer);
				off();
				if (timedOut) console.warn(`[michengai-codex-ui] 等待官方 '${slot}' 注册超时；仅注册自有槽，保留官方共享声明。`);
				remove = register(timedOut);
			};
			if (officialReady()) return register();
			off = face.subscribe?.(slot, () => {
				if (officialReady()) finish(false);
			}) ?? (() => {});
			if (!waitForOfficial) queueMicrotask(() => finish(false));
			else timer = setTimeout(() => finish(true), 3e3);
			return () => {
				done = true;
				if (timer !== void 0) clearTimeout(timer);
				off();
				remove();
			};
		}
		//#endregion
		//#region src/client/settings-navigation.ts
		/**
		* 自有设置壳通过事件直接打开分区，不依赖账号入口的按钮或菜单结构。
		* 保留的宿主设置壳仍从设置入口触发，再按可访问名称选择页面。
		*/
		function pickSettingsSectionButton(buttons, labels) {
			for (const label of labels) {
				const match = buttons.find((button) => button.textContent?.trim() === label);
				if (match !== void 0) return match;
			}
		}
		let cancelPendingNavigation;
		const SETTINGS_NAVIGATION_TIMEOUT_MS = 4e3;
		const SETTINGS_TRIGGER_SELECTOR = "button[aria-haspopup=\"menu\"],button[aria-haspopup=\"dialog\"]";
		const SETTINGS_DIALOG_SELECTOR = "[data-shortcut-modal=\"settings\"]";
		function clickOfficialSettingsItem() {
			const items = [...document.querySelectorAll("[role=\"menu\"] [role=\"menuitem\"]")];
			const target = items.find((item) => /^(settings|设置|preferences|偏好设置)$/i.test(item.textContent?.trim() ?? "")) ?? items[0];
			if (target === void 0) return false;
			target.click();
			return true;
		}
		/** 通过官方账号菜单打开原生设置，让其自有 Store 与快捷键闭包保持连接。 */
		function openSettingsRoot(root) {
			if (document.querySelector(SETTINGS_DIALOG_SELECTOR) !== null) return;
			const trigger = root?.querySelector(SETTINGS_TRIGGER_SELECTOR);
			if (trigger === null || trigger === void 0) return;
			if (trigger.getAttribute("aria-haspopup") === "dialog") {
				trigger.click();
				return;
			}
			if (trigger.getAttribute("aria-expanded") !== "true") trigger.click();
			const clickItem = () => clickOfficialSettingsItem();
			if (clickItem()) return;
			const observer = new MutationObserver(() => {
				if (clickItem()) {
					observer.disconnect();
					window.clearTimeout(timeout);
				}
			});
			const timeout = window.setTimeout(() => observer.disconnect(), SETTINGS_NAVIGATION_TIMEOUT_MS);
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		}
		function openSettingsSection(root, label, onMissing, onSelected) {
			const labels = typeof label === "string" ? [label] : label;
			cancelPendingNavigation?.();
			let finished = false;
			let frame;
			let observer;
			const cleanup = () => {
				if (finished) return;
				finished = true;
				observer.disconnect();
				window.clearTimeout(timeout);
				if (frame !== void 0) window.cancelAnimationFrame(frame);
				if (cancelPendingNavigation === cleanup) cancelPendingNavigation = void 0;
			};
			const select = () => {
				const dialog = document.querySelector(SETTINGS_DIALOG_SELECTOR);
				if (dialog === null) return false;
				const target = pickSettingsSectionButton([...dialog.querySelectorAll("nav button")], labels);
				if (target === void 0) return false;
				cleanup();
				target.click();
				onSelected?.();
				return true;
			};
			const schedule = () => {
				if (finished || frame !== void 0) return;
				frame = window.requestAnimationFrame(() => {
					frame = void 0;
					if (select()) return;
					const trigger = root?.querySelector(SETTINGS_TRIGGER_SELECTOR);
					if (trigger === null || trigger === void 0) return;
					if (trigger.getAttribute("aria-haspopup") === "dialog") {
						if (document.querySelector(SETTINGS_DIALOG_SELECTOR) === null) trigger.click();
						return;
					}
					if (trigger.getAttribute("aria-expanded") !== "true") trigger.click();
					clickOfficialSettingsItem();
				});
			};
			observer = new MutationObserver(schedule);
			const timeout = window.setTimeout(() => {
				if (select()) return;
				cleanup();
				console.warn(`[michengai-codex-ui] 未找到设置分区：${labels.join(" / ")}`);
				onMissing?.();
			}, SETTINGS_NAVIGATION_TIMEOUT_MS);
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			cancelPendingNavigation = cleanup;
			schedule();
		}
		//#endregion
		//#region src/client/global-panels.tsx
		/** 从宿主注册表读取面板元数据；缓存快照以满足 React 外部状态订阅契约。 */
		function createGlobalPanelSource(slots, locale) {
			let cached = [];
			return {
				getSnapshot() {
					const next = slots.entriesOfSlot("sidebar.panellist").flatMap(({ options }) => {
						if (options.id === void 0 || options.id === "plugins") return [];
						return [{
							id: options.id,
							order: options.order ?? 0,
							label: (typeof options.label === "function" ? options.label() : options.label) ?? options.id
						}];
					}).sort((a, b) => a.order - b.order);
					if (next.length !== cached.length || next.some((panel, index) => {
						const previous = cached[index];
						return previous === void 0 || panel.id !== previous.id || panel.label !== previous.label || panel.order !== previous.order;
					})) cached = next;
					return cached;
				},
				subscribe(listener) {
					const offSlots = slots.subscribe("sidebar.panellist", listener);
					const offLocale = locale.subscribe(listener);
					return () => {
						offSlots();
						offLocale();
					};
				}
			};
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
		const IconArchiveOutlineMedium = hostIcon("IconArchiveOutlineMedium", "IconArchiveOutline20");
		const IconBranchOutlineMedium = hostIcon("IconBranchOutlineMedium", "IconBranchOutline16");
		const IconCheckOutlineMedium = hostIcon("IconCheckOutlineMedium", "IconCheckOutline16");
		hostIcon("IconChevronDownOutlineMedium", "IconChevronDownOutline14");
		const IconChevronRightOutlineMedium = hostIcon("IconChevronRightOutlineMedium", "IconChevronRightOutline14");
		const IconCopyOutlineMedium = hostIcon("IconCopyOutlineMedium", "IconCopyOutline16");
		const IconDownloadOutlineMedium = hostIcon("IconDownloadOutlineMedium", "IconDownloadOutline16");
		const IconEditOutlineMedium = hostIcon("IconEditOutlineMedium", "IconEditOutline16");
		const IconEllipsisOutlineMedium = hostIcon("IconEllipsisOutlineMedium", "IconEllipsisOutline16");
		const IconEnhanceOutlineMedium = hostIcon("IconEnhanceOutlineMedium", "IconEnhanceOutline16");
		hostIcon("IconFlatListOutlineMedium", "IconFlatListOutline16");
		const IconFolderCloseMedium = hostIcon("IconFolderCloseMedium", "IconFolderClose16");
		const IconFolderOpenMedium = hostIcon("IconFolderOpenMedium", "IconFolderOpen16");
		const IconFolderOpenOutlineMedium = hostIcon("IconFolderOpenOutlineMedium", "IconFolderOpenOutline16");
		const IconLinkOutlineMedium = hostIcon("IconLinkOutlineMedium", "IconLinkOutline16");
		const IconListPenOutlineMedium = hostIcon("IconListPenOutlineMedium", "IconListPenOutline16");
		const IconLoadingOutlineMedium = hostIcon("IconLoadingOutlineMedium", "IconLoadingOutline16");
		const IconNewChatOutlineMedium = hostIcon("IconNewChatOutlineMedium", "IconNewChatOutline16");
		const IconPanelLeftOutlineMedium = hostIcon("IconPanelLeftOutlineMedium", "IconPanelLeftOutline16");
		const IconPersonalizationOutlineMedium = hostIcon("IconPersonalizationOutlineMedium", "IconPersonalizationOutline16");
		const IconProjectAddOutlineMedium = hostIcon("IconProjectAddOutlineMedium", "IconProjectAddOutline16");
		const IconRefreshOutlineMedium = hostIcon("IconRefreshOutlineMedium", "IconRefreshOutline16");
		const IconSearchOutlineMedium = hostIcon("IconSearchOutlineMedium", "IconSearchOutline16");
		const IconSettingsOutlineMedium = hostIcon("IconSettingsOutlineMedium", "IconSettingsOutline16");
		const IconSkillOutlineMedium = hostIcon("IconSkillOutlineMedium", "IconSkillOutline16");
		const IconTrashOutlineMedium = hostIcon("IconTrashOutlineMedium", "IconTrashOutline16");
		const IconUserOutlineMedium = hostIcon("IconUserOutlineMedium", "IconUserOutline16");
		hostIcon("IconWorkspaceTreeOutlineMedium", "IconWorkspaceTreeOutline16");
		//#endregion
		//#region src/client/sidebar-search.ts
		/** 按用户可见名称和辅助关键词筛选侧栏搜索结果。 */
		function filterSidebarSearchItems(items, query) {
			const needle = query.trim().toLocaleLowerCase();
			if (needle === "") return [...items];
			return items.filter((item) => `${item.label} ${item.keywords}`.toLocaleLowerCase().includes(needle));
		}
		const visibleSidebarWidths = /* @__PURE__ */ new WeakMap();
		const hostSidebarSnapshots = /* @__PURE__ */ new WeakMap();
		/** 会话顶栏用它把宿主发布的窗口 chrome 安全区换算回窄轨之外的左内边距。 */
		const SIDEBAR_RAIL_WIDTH_VAR = "--dcu-sidebar-rail-width";
		/** 值不变时不再重写 style，避免与宿主重绘叠加时反复触发 style 监听。 */
		function writeSidebarRailWidth(frame, width) {
			const value = `${width}px`;
			if (frame.style.getPropertyValue(SIDEBAR_RAIL_WIDTH_VAR) !== value) frame.style.setProperty(SIDEBAR_RAIL_WIDTH_VAR, value);
		}
		/** 记下插件改写前的宿主列宽。已经带初始化标记的列宽是本插件留下的，不能当成宿主原值。 */
		function rememberHostSidebar(frame) {
			if (hostSidebarSnapshots.has(frame) || frame.hasAttribute("data-dcu-codex-sidebar-initialized")) return;
			const handle = frame.querySelector("[data-side=\"sidebar\"]");
			hostSidebarSnapshots.set(frame, {
				grid: frame.style.gridTemplateColumns,
				handleLeft: handle?.style.left ?? "",
				windowsWidth: frame.style.getPropertyValue("--dsh-windows-sidebar-width")
			});
		}
		/** 停用或卸载时撤回列宽、拖拽柄和初始化标记，让官方侧栏按宿主宽度重排。 */
		function restoreHostSidebar(frame) {
			frame.removeAttribute("data-dcu-codex-sidebar-initialized");
			frame.style.removeProperty("--dcu-sidebar-expanded-width");
			frame.style.removeProperty(SIDEBAR_RAIL_WIDTH_VAR);
			const html = frame.ownerDocument.documentElement;
			const tracks = parseSidebarGrid(frame.style.gridTemplateColumns);
			if (frame.hasAttribute("data-sidebar-collapsed")) {
				if ((html.hasAttribute("data-windows-titlebar") || html.dataset.platform === "darwin") && tracks?.sidebar === 56) {
					frame.style.gridTemplateColumns = `0px ${tracks.middle} ${tracks.details}`;
					if (html.hasAttribute("data-windows-titlebar")) frame.style.setProperty("--dsh-windows-sidebar-width", "0px");
				}
				return;
			}
			const snapshot = hostSidebarSnapshots.get(frame);
			const handle = frame.querySelector("[data-side=\"sidebar\"]");
			if (snapshot !== void 0) {
				frame.style.gridTemplateColumns = snapshot.grid;
				if (handle !== null) {
					if (snapshot.handleLeft === "") handle.style.removeProperty("left");
					else handle.style.left = snapshot.handleLeft;
				}
				if (snapshot.windowsWidth === "") frame.style.removeProperty("--dsh-windows-sidebar-width");
				else frame.style.setProperty("--dsh-windows-sidebar-width", snapshot.windowsWidth);
				return;
			}
			if (tracks?.sidebar === 240) {
				frame.style.gridTemplateColumns = `280px ${tracks.middle} ${tracks.details}`;
				if (handle !== null) handle.style.left = "280px";
			}
		}
		/** 解析宿主 AppFrame 的 grid-template-columns。 */
		function parseSidebarGrid(value) {
			const match = /^(\d+(?:\.\d+)?)px\s+(minmax\(\d+(?:px)?,\s*1fr\))\s+(minmax\(0(?:px)?,\s*\d+(?:\.\d+)?px\)|\d+(?:\.\d+)?px)$/.exec(value.trim());
			if (match === null) return void 0;
			return {
				sidebar: Number(match[1]),
				middle: match[2],
				details: match[3]
			};
		}
		function findSidebarFrame(root) {
			const marked = root.querySelector("[data-sidebar-collapsed]");
			if (marked !== null) return marked;
			for (const node of root.querySelectorAll("div")) if (parseSidebarGrid(node.style.gridTemplateColumns) !== void 0) return node;
		}
		/** 同步侧栏网格和拖拽柄，保证两者始终使用同一个可见宽度。 */
		function applySidebarWidth(frame, width) {
			const tracks = parseSidebarGrid(frame.style.gridTemplateColumns);
			if (tracks === void 0 || frame.hasAttribute("data-sidebar-collapsed")) return false;
			visibleSidebarWidths.set(frame, width);
			writeSidebarRailWidth(frame, 0);
			const next = `${width}px ${tracks.middle} ${tracks.details}`;
			const changed = frame.style.gridTemplateColumns !== next;
			if (changed) frame.style.gridTemplateColumns = next;
			const contentWidth = `${width}px`;
			if (frame.style.getPropertyValue("--dcu-sidebar-expanded-width") !== contentWidth) frame.style.setProperty("--dcu-sidebar-expanded-width", contentWidth);
			const handle = frame.querySelector("[data-side=\"sidebar\"]");
			if (handle !== null && handle.style.left !== contentWidth) handle.style.left = contentWidth;
			return changed;
		}
		/** 自动宽度调整与初始化过渡共用前置条件；手动拖拽不受此限制。 */
		function canApplySlimSidebar(frame) {
			return !frame.hasAttribute("data-dragging") && parseSidebarGrid(frame.style.gridTemplateColumns) !== void 0;
		}
		function applySlimSidebar(frame) {
			if (!canApplySlimSidebar(frame)) return false;
			if (frame.hasAttribute("data-sidebar-collapsed")) {
				const tracks = parseSidebarGrid(frame.style.gridTemplateColumns);
				const next = `56px ${tracks.middle} ${tracks.details}`;
				const changed = frame.style.gridTemplateColumns !== next;
				if (changed) frame.style.gridTemplateColumns = next;
				writeSidebarRailWidth(frame, 56);
				if (frame.ownerDocument.documentElement.hasAttribute("data-windows-titlebar") && frame.style.getPropertyValue("--dsh-windows-sidebar-width") !== `56px`) frame.style.setProperty("--dsh-windows-sidebar-width", `56px`);
				return changed;
			}
			const initialized = frame.hasAttribute("data-dcu-codex-sidebar-initialized");
			const changed = applySidebarWidth(frame, initialized ? visibleSidebarWidths.get(frame) ?? 240 : 240);
			if (!initialized) frame.setAttribute("data-dcu-codex-sidebar-initialized", "");
			return changed;
		}
		/** 仅在首帧覆盖宿主默认宽度时关闭过渡，避免刷新出现收缩动画。 */
		function pauseInitialSidebarTransition(frame) {
			const handle = frame.querySelector("[data-side=\"sidebar\"]");
			const frameTransition = frame.style.transition;
			const handleTransition = handle?.style.transition;
			frame.style.transition = "none";
			if (handle !== null) handle.style.transition = "none";
			return () => {
				frame.style.transition = frameTransition;
				if (handle !== null && handleTransition !== void 0) handle.style.transition = handleTransition;
			};
		}
		function observeSlimSidebar() {
			if (typeof document === "undefined" || document.body === null) return () => {};
			let applying = false;
			let frame;
			let pending;
			let frameObserver;
			const watchFrame = (next) => {
				if (frame === next) return;
				frameObserver?.disconnect();
				frame = next;
				if (frame === void 0) return;
				frameObserver = new MutationObserver(apply);
				frameObserver.observe(frame, {
					attributes: true,
					attributeFilter: [
						"style",
						"data-sidebar-collapsed",
						"data-dragging",
						"data-dcu-codex-sidebar-initialized"
					]
				});
			};
			const apply = () => {
				if (applying) return;
				applying = true;
				try {
					if (frame === void 0 || !frame.isConnected) watchFrame(findSidebarFrame(document));
					if (frame !== void 0) {
						rememberHostSidebar(frame);
						if (!canApplySlimSidebar(frame)) {
							const rail = frame.hasAttribute("data-sidebar-collapsed") ? parseSidebarGrid(frame.style.gridTemplateColumns)?.sidebar ?? 0 : 0;
							writeSidebarRailWidth(frame, rail);
							return;
						}
						if (frame.hasAttribute("data-sidebar-collapsed")) {
							applySlimSidebar(frame);
							return;
						}
						const restoreTransition = frame.hasAttribute("data-dcu-codex-sidebar-initialized") ? void 0 : pauseInitialSidebarTransition(frame);
						const changed = applySlimSidebar(frame);
						if (restoreTransition !== void 0) {
							if (!changed) restoreTransition();
							else window.requestAnimationFrame(() => window.requestAnimationFrame(restoreTransition));
						}
					}
				} finally {
					applying = false;
				}
			};
			const schedule = () => {
				if (pending !== void 0) return;
				pending = window.requestAnimationFrame(() => {
					pending = void 0;
					apply();
				});
			};
			apply();
			const observer = new MutationObserver(() => {
				if (frame === void 0 || !frame.isConnected) schedule();
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			return () => {
				observer.disconnect();
				frameObserver?.disconnect();
				if (pending !== void 0) window.cancelAnimationFrame(pending);
				if (frame !== void 0) restoreHostSidebar(frame);
			};
		}
		//#endregion
		//#region src/client/sidebar-drag.ts
		const SIDEBAR_MAX_PX = 420;
		/** 左移超过开始宽度的一半时收起侧栏，避免轻微拖动误触。 */
		function shouldCollapseOnSidebarDrag(startWidth, startX, endX) {
			return startX - endX > startWidth / 2;
		}
		/** 直接按可见宽度计算拖拽结果，绕开宿主与 Codex 不一致的最小宽度。 */
		function sidebarWidthDuringDrag(startWidth, startX, currentX) {
			return Math.min(SIDEBAR_MAX_PX, Math.max(240, startWidth + currentX - startX));
		}
		function isSidebarDragHandle(target) {
			if (target === null || typeof target !== "object" || !("closest" in target)) return false;
			const handle = target.closest("[data-side=\"sidebar\"]");
			return handle !== null && String(handle.className).includes("handle");
		}
		//#endregion
		//#region src/client/workspace-browser.ts
		/** 任务树只保留普通会话，后台或扩展类会话不混入工作区列表。 */
		function isTaskSession(session) {
			if (session.origin === "subagent" || session.origin === "im" || session.blank === true) return false;
			if (session.id.startsWith("im:") || session.id.startsWith("dsh-automation-session-")) return false;
			return true;
		}
		/**
		* 对齐本机 Codex 26.915.4065.0 的项目会话列表。
		* 未展开时显示 5 条；展开后每次再加 10 条。按钮文案保持「展开显示」，全部露出后消失。
		* 当前会话落在窗口外时追加到末尾。
		*/
		function projectSessionWindow(ids, state, forcedId) {
			const page = state.page < 1 ? 1 : state.page;
			const limit = state.expanded ? 5 + 10 * page : 5;
			const head = ids.slice(0, limit);
			const visible = forcedId !== void 0 && ids.includes(forcedId) && !head.includes(forcedId) ? [...head, forcedId] : head;
			return {
				ids: visible,
				showMore: visible.length < ids.length
			};
		}
		/**
		* 折叠项目文件夹时清掉「展开显示」。
		* 安装包 i$n：文件夹从展开变为折叠时，对 `project:${id}` 调用 sE(..., false)。
		*/
		function collapseProjectSessionWindow() {
			return {
				expanded: false,
				page: 1
			};
		}
		/** 第一次展开把页码设为 1（可见 15 条），之后每点一次页码加 1。 */
		function nextProjectSessionWindow(state) {
			const current = state ?? {
				expanded: false,
				page: 1
			};
			if (!current.expanded) return {
				expanded: true,
				page: 1
			};
			return {
				expanded: true,
				page: current.page + 1
			};
		}
		/**
		* 会话行蓝线的落点：只在被悬停的那一行下方，且仅当它后面那条会话被折起或不存在。
		* 下一行仍可见时交给它自己的 before 线，避免两条平行蓝线。
		*/
		function sessionDropAfterRowId(drop, renderedIds) {
			const hoveredId = drop?.hoveredId;
			if (hoveredId === void 0 || !renderedIds.includes(hoveredId)) return void 0;
			const beforeId = drop?.beforeId;
			if (beforeId !== void 0 && renderedIds.includes(beforeId)) return void 0;
			return hoveredId;
		}
		/** 过滤不应出现在工作区树中的会话。 */
		function visibleSessionIds(ids, byId, archivedIds) {
			const archived = new Set(archivedIds);
			return ids.filter((id) => {
				const session = byId[id];
				return session !== void 0 && !archived.has(id) && isTaskSession({
					...session,
					id: session.id || id
				});
			});
		}
		/** 没有归属任何项目的普通会话，放到「最近」。 */
		function ungroupedSessionIds(ids, byId, assignedIds, archivedIds) {
			const assigned = new Set(assignedIds);
			return visibleSessionIds(ids, byId, archivedIds).filter((id) => !assigned.has(id));
		}
		/** 将一个项目或会话移到指定项之前；省略锚点时追加到末尾。 */
		function moveBefore(ids, id, beforeId) {
			if (!ids.includes(id) || beforeId === id) return [...ids];
			const next = ids.filter((item) => item !== id);
			const index = beforeId === void 0 ? next.length : next.indexOf(beforeId);
			next.splice(index < 0 ? next.length : index, 0, id);
			return next;
		}
		/**
		* 复刻 Codex 的排序落点：先从当前列表移除被拖项，再把落点表示成“插到谁之前”。
		* null 表示悬停自身或最终顺序不变，此时不显示蓝线，也不执行排序。
		*/
		function reorderDropBeforeId(ids, draggedId, hoveredId, after) {
			if (draggedId === hoveredId || !ids.includes(hoveredId)) return null;
			const remaining = ids.filter((id) => id !== draggedId);
			const hoveredIndex = remaining.indexOf(hoveredId);
			if (hoveredIndex < 0) return null;
			const beforeId = after ? remaining[hoveredIndex + 1] : hoveredId;
			if (!ids.includes(draggedId)) return beforeId;
			return moveBefore(ids, draggedId, beforeId).every((id, index) => id === ids[index]) ? null : beforeId;
		}
		/**
		* 置顶标题区与首项目的上半区都表示“插到第一项之前”，因此必须共用同一条指示线。
		* 非空列表把指示线贴到首项目顶部；空列表才使用独立的起始占位线。
		*/
		function pinnedHeaderDropIndicator(ids) {
			const workspaceId = ids[0];
			return workspaceId === void 0 ? { kind: "empty" } : {
				kind: "workspace",
				workspaceId
			};
		}
		/**
		* 空置顶没有项目行可自行计算落点，松手时 dragleave 又常把 relatedTarget 置空并清掉蓝线。
		* 只要这次 drop 发生在置顶区，空列表也必须把项目置顶。
		*/
		function resolvePinnedSectionDrop(draggedWorkspace, target, pinnedEmpty) {
			if (draggedWorkspace === void 0) return void 0;
			if (target?.zone === "pinned") return {
				id: draggedWorkspace,
				beforeId: target.beforeId
			};
			return pinnedEmpty ? { id: draggedWorkspace } : void 0;
		}
		/** 按指定 id 顺序取出对应项；未出现在 ids 中的项丢弃。 */
		function orderByIds(items, ids, idOf) {
			const byId = new Map(items.map((item) => [idOf(item), item]));
			return ids.flatMap((id) => {
				const item = byId.get(id);
				return item === void 0 ? [] : [item];
			});
		}
		/** 展开移动目标的全部父级，保证页面重载并选中会话后该行仍然可见。 */
		function expandedForSessionMove(current, target) {
			const next = { ...current };
			if (target.pinned) {
				next["section:pinned"] = true;
				next[`pin:${target.workspaceId}`] = true;
				return next;
			}
			next["section:projects"] = true;
			next[target.workspaceId] = true;
			if (target.groupId !== void 0) next[`workspace-group:${target.groupId}`] = true;
			else if (target.hasGroups) next["workspace-group:ungrouped"] = true;
			return next;
		}
		function workspaceIdForSession(workspaces, sessionId) {
			return workspaces.find((workspace) => workspace.sessionIds.some((id) => String(id) === sessionId))?.workspaceId;
		}
		/** 打开或闭合只跟展开状态走；当前会话所在项目额外使用当前色。 */
		function projectFolderPresentation(isExpanded, containsCurrent) {
			return {
				open: isExpanded,
				current: containsCurrent
			};
		}
		/** 当前会话变化时展开所属项目或「最近」；会话尚未进入树则保持原展开状态。 */
		function expandedForCurrentSession(current, sessionId, tree) {
			if (sessionId === void 0 || sessionId === "") return { ...current };
			const workspaceId = workspaceIdForSession(tree.workspaces, sessionId);
			if (workspaceId !== void 0) return expandedForSessionMove(current, {
				workspaceId: String(workspaceId),
				pinned: tree.pinnedWorkspaceIds.includes(String(workspaceId)),
				groupId: tree.groups.find((group) => group.workspaceIds.includes(String(workspaceId)))?.id,
				hasGroups: tree.groups.length > 0
			});
			if (tree.recentIds.includes(sessionId)) return {
				...current,
				"section:recent": true
			};
			return { ...current };
		}
		/** 仅提供真正改变归属的目标；未分组目标固定排在自定义分组之后。 */
		function workspaceGroupMoveTargets(groups, workspaceId) {
			const currentGroupId = groups.find((group) => group.workspaceIds.includes(workspaceId))?.id;
			const targets = groups.filter((group) => group.id !== currentGroupId).map((group) => ({
				groupId: group.id,
				title: group.title
			}));
			if (currentGroupId !== void 0) targets.push({
				groupId: void 0,
				title: void 0
			});
			return targets;
		}
		const SESSION_DRAG_TYPE = "application/x-dcu-session";
		const WORKSPACE_DRAG_TYPE = "application/x-dcu-workspace";
		const WORKSPACE_GROUP_DRAG_TYPE = "application/x-dcu-workspace-group";
		const SESSION_DRAG_PREFIX = "dcu-session:";
		const WORKSPACE_DRAG_PREFIX = "dcu-workspace:";
		const WORKSPACE_GROUP_DRAG_PREFIX = "dcu-workspace-group:";
		function textPayload(data) {
			try {
				return data?.getData("text/plain") ?? "";
			} catch {
				return "";
			}
		}
		/** 写入会话拖拽载荷；drop 时以这个为准，不依赖尚未刷新的 React 状态。 */
		function writeSessionDrag(data, sessionId, title) {
			data.effectAllowed = "move";
			data.setData("text/plain", `${SESSION_DRAG_PREFIX}${sessionId}`);
			data.setData(SESSION_DRAG_TYPE, sessionId);
		}
		function writeWorkspaceDrag(data, workspaceId, title) {
			data.effectAllowed = "move";
			data.setData("text/plain", `${WORKSPACE_DRAG_PREFIX}${workspaceId}`);
			data.setData(WORKSPACE_DRAG_TYPE, workspaceId);
		}
		function writeWorkspaceGroupDrag(data, groupId, title) {
			data.effectAllowed = "move";
			data.setData("text/plain", `${WORKSPACE_GROUP_DRAG_PREFIX}${groupId}`);
			data.setData(WORKSPACE_GROUP_DRAG_TYPE, groupId);
		}
		function readSessionDrag(data, fallback) {
			try {
				const typed = data?.getData(SESSION_DRAG_TYPE);
				if (typed !== void 0 && typed.trim() !== "") return typed;
			} catch {}
			const text = textPayload(data);
			if (text.startsWith(SESSION_DRAG_PREFIX)) return text.slice(12);
			return fallback !== void 0 && fallback.trim() !== "" ? fallback : void 0;
		}
		function sessionDropAction(sourceWorkspaceId, targetWorkspaceId) {
			return sourceWorkspaceId !== void 0 && sourceWorkspaceId === targetWorkspaceId ? "reorder" : "move";
		}
		function readWorkspaceGroupDrag(data, fallback) {
			if (readSessionDrag(data) !== void 0) return void 0;
			try {
				const typed = data?.getData(WORKSPACE_GROUP_DRAG_TYPE);
				if (typed !== void 0 && typed.trim() !== "") return typed;
			} catch {}
			const text = textPayload(data);
			if (text.startsWith(WORKSPACE_GROUP_DRAG_PREFIX)) return text.slice(20);
			return fallback !== void 0 && fallback.trim() !== "" ? fallback : void 0;
		}
		/** 会话拖拽优先；有会话载荷时不得再把父项目置顶。 */
		function readWorkspaceDrag(data, fallback) {
			if (readSessionDrag(data) !== void 0) return void 0;
			if (readWorkspaceGroupDrag(data) !== void 0) return void 0;
			try {
				const typed = data?.getData(WORKSPACE_DRAG_TYPE);
				if (typed !== void 0 && typed.trim() !== "") return typed;
			} catch {}
			const text = textPayload(data);
			if (text.startsWith(WORKSPACE_DRAG_PREFIX)) return text.slice(14);
			return fallback !== void 0 && fallback.trim() !== "" ? fallback : void 0;
		}
		//#endregion
		//#region src/client/tree-expansion.ts
		const WORKSPACE_EXPANSION_STORAGE_KEY = "dsh-codex-ui.workspace-expansion.v1";
		const MAX_EXPANSION_ENTRIES = 500;
		const MAX_EXPANSION_KEY_LENGTH = 512;
		function browserStorage$1() {
			if (typeof window === "undefined") return void 0;
			try {
				return window.localStorage;
			} catch {
				return;
			}
		}
		function parseTreeExpansionState(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
			const entries = Object.entries(value).filter(([key, expanded]) => key.length > 0 && key.length <= MAX_EXPANSION_KEY_LENGTH && typeof expanded === "boolean").slice(0, MAX_EXPANSION_ENTRIES);
			return Object.fromEntries(entries);
		}
		function readTreeExpansionState(storage, key) {
			if (storage === void 0) return {};
			try {
				return parseTreeExpansionState(JSON.parse(storage.getItem(key) ?? "{}"));
			} catch {
				return {};
			}
		}
		function writeTreeExpansionState(storage, key, state) {
			if (storage === void 0) return;
			try {
				storage.setItem(key, JSON.stringify(parseTreeExpansionState(state)));
			} catch {}
		}
		//#endregion
		//#region src/client/WorkspaceShortcutBridge.tsx
		function WorkspaceShortcutBridge({ source, openSearch, startSession, renderDirectoryFlow, t }) {
			const { searchRequest, addRequested, bindings } = (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot, source.getSnapshot);
			const seenSearch = (0, react.useRef)(searchRequest);
			const openSearchRef = (0, react.useRef)(openSearch);
			openSearchRef.current = openSearch;
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const mounted = (0, react.useRef)(true);
			const pending = (0, react.useRef)(false);
			const pickedPath = (0, react.useRef)(void 0);
			const currentBindings = (0, react.useRef)(bindings);
			currentBindings.current = bindings;
			(0, react.useEffect)(() => {
				mounted.current = true;
				return () => {
					mounted.current = false;
				};
			}, []);
			(0, react.useEffect)(() => {
				pending.current = false;
				pickedPath.current = void 0;
				setBusy(false);
				setError(void 0);
			}, [bindings]);
			(0, react.useEffect)(() => {
				if (searchRequest === seenSearch.current) return;
				seenSearch.current = searchRequest;
				bindings?.closeAddWorkspace();
				openSearchRef.current();
			}, [searchRequest, bindings]);
			(0, react.useEffect)(() => {
				bindings?.setDirectoryBusy(addRequested || busy || error !== void 0);
				return () => {
					bindings?.setDirectoryBusy(false);
				};
			}, [
				bindings,
				addRequested,
				busy,
				error
			]);
			const fail = (message) => {
				bindings?.closeAddWorkspace();
				setError(message);
			};
			const isCurrent = () => mounted.current && source.getSnapshot().bindings === bindings && currentBindings.current === bindings;
			const pick = (path) => {
				if (!bindings || pending.current) return;
				pickedPath.current = path;
				pending.current = true;
				setError(void 0);
				setBusy(true);
				bindings.createWorkspace({ path }).then((workspace) => {
					if (!isCurrent()) return;
					bindings.closeAddWorkspace();
					startSession(workspace.workspaceId);
				}).catch((reason) => {
					if (isCurrent()) fail(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					if (isCurrent()) {
						pending.current = false;
						setBusy(false);
					}
				});
			};
			const chooseAgain = () => {
				setError(void 0);
				pickedPath.current = void 0;
				bindings?.setDirectoryBusy(false);
				bindings?.requestAddWorkspace?.();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [renderDirectoryFlow({
				open: addRequested,
				busy,
				onCancel: () => {
					bindings?.closeAddWorkspace();
				},
				onError: (message) => {
					pickedPath.current = void 0;
					fail(message);
				},
				onPicked: pick
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: error !== void 0,
				onClose: () => {
					setError(void 0);
				},
				title: t("workspace.addFailed"),
				closeLabel: t("sessions.close"),
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					pickedPath.current !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						disabled: busy,
						onClick: () => {
							pick(pickedPath.current);
						},
						children: t("workspace.retry")
					}),
					bindings?.requestAddWorkspace && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						disabled: busy,
						onClick: chooseAgain,
						children: t("workspace.chooseAgain")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						onClick: () => {
							setError(void 0);
						},
						children: t("sessions.close")
					})
				] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					role: "alert",
					children: error
				})
			})] });
		}
		//#endregion
		//#region src/client/CodexSidebar.tsx
		const emptyFooterActions = [];
		const getEmptyFooterActions = () => emptyFooterActions;
		const SIDEBAR_COLLAPSE_SETTLE_MS = 500;
		const SIDEBAR_EXPANSION_STORAGE_KEY = "dsh-codex-ui.sidebar-expansion.v1";
		const EXTENSIONS_EXPANSION_KEY = "extensions";
		function readExtensionsOpen() {
			return readTreeExpansionState(browserStorage$1(), SIDEBAR_EXPANSION_STORAGE_KEY)[EXTENSIONS_EXPANSION_KEY] === true;
		}
		function writeExtensionsOpen(open) {
			const storage = browserStorage$1();
			const expanded = readTreeExpansionState(storage, SIDEBAR_EXPANSION_STORAGE_KEY);
			writeTreeExpansionState(storage, SIDEBAR_EXPANSION_STORAGE_KEY, {
				...expanded,
				[EXTENSIONS_EXPANSION_KEY]: open
			});
		}
		const emptyPanels = [];
		const getEmptyPanels = () => emptyPanels;
		const useLegacyPanelInfo = (selector) => selector({ activePanelId: null });
		const stylesheet$2 = `

.dcu-root{--dcu-sidebar-background:#eef7f5;--dcu-sidebar-primary:#393d3e;--dcu-sidebar-secondary:#676b6c;--dcu-sidebar-tertiary:#9a9f9f;--dcu-sidebar-navigation:#4e5253;--dcu-sidebar-icon:#4e5253;--dcu-sidebar-hover:#dfe8e5;--dcu-sidebar-border:rgba(37,46,41,.10);--dcu-tip-bg:#ffffff;--dcu-tip-shadow:0 10px 32px rgba(31,39,36,.22);width:100%;height:100%;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;background:var(--dcu-sidebar-background);color:var(--dcu-sidebar-primary);font:14px/20px var(--dsw-font-family)}body[data-ds-dark-theme] .dcu-root{--dcu-sidebar-background:#1d2120;--dcu-sidebar-primary:#b9bab9;--dcu-sidebar-secondary:#909191;--dcu-sidebar-tertiary:#666867;--dcu-sidebar-navigation:#b9bab9;--dcu-sidebar-icon:#afafaf;--dcu-sidebar-hover:#303432;--dcu-sidebar-border:rgba(255,255,255,.08);--dcu-tip-bg:#2a2a2a;--dcu-tip-shadow:0 10px 30px rgba(0,0,0,.28)}
/* 滤镜只作用于背景，避免为设置和搜索等 fixed 后代创建侧栏包含块。 */
body[data-we-sidebar-glass] .dcu-root{position:relative;background:transparent}body[data-we-sidebar-glass] .dcu-root::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background-color:color-mix(in srgb,var(--we-sidebar-color,#fff) calc(var(--we-sidebar-alpha,.15)*.66*100%),transparent);background-image:linear-gradient(180deg,rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.14)),rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.04)) 38%,rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.01)));-webkit-backdrop-filter:blur(var(--we-sidebar-blur,16px)) saturate(var(--we-sidebar-saturate,1.8)) brightness(var(--we-glass-brightness,1.04)) contrast(1.01);backdrop-filter:blur(var(--we-sidebar-blur,16px)) saturate(var(--we-sidebar-saturate,1.8)) brightness(var(--we-glass-brightness,1.04)) contrast(1.01);box-shadow:inset 0 1px 0 rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.32)),inset 0 -1px 0 rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.08)),inset 0 0 0 .5px rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.06))}body[data-ds-dark-theme][data-we-sidebar-glass] .dcu-root::before{background-color:color-mix(in srgb,var(--we-sidebar-color,#fff) calc(var(--we-sidebar-alpha,.15)*.33*100%),transparent)}body[data-we-appwindow][data-we-sidebar-glass] .dcu-root::before{-webkit-backdrop-filter:none;backdrop-filter:none}@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){body[data-we-sidebar-glass] .dcu-root{background:#eef7f5}body[data-ds-dark-theme][data-we-sidebar-glass] .dcu-root{background:#1d2120}body[data-we-sidebar-glass] .dcu-root::before{display:none}}
body[data-we-sidebar-glass] .dcu-expanded-shell,body[data-we-sidebar-glass] .dcu-compact-shell,body[data-we-sidebar-glass] .dcu-foot{position:relative}
.dcu-expanded-shell{display:flex;width:100%;min-height:0;flex:1 1 0;overflow:hidden;flex-direction:column;transform-origin:left center;transition:opacity 500ms cubic-bezier(.16,1,.3,1),transform 500ms cubic-bezier(.16,1,.3,1);animation:dcu-sidebar-expanded-in 500ms cubic-bezier(.16,1,.3,1)}.dcu-compact-shell{display:none;width:56px}.dcu-root.dcu-collapsing .dcu-expanded-shell{opacity:0;transform:translateX(-6px)}.dcu-root.dcu-compact .dcu-expanded-shell{display:none}.dcu-root.dcu-compact .dcu-compact-shell{display:flex;min-height:0;flex:1;flex-direction:column;align-items:center;animation:dcu-sidebar-compact-in 140ms ease-out}@keyframes dcu-sidebar-expanded-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}@keyframes dcu-sidebar-compact-in{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
.dcu-root *{box-sizing:border-box}.dcu-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:8px;flex:none;height:var(--dcu-header-height,34px);padding:calc((var(--dcu-header-height,34px) - 28px)/2) 8px calc((var(--dcu-header-height,34px) - 28px)/2) 12px}.dcu-brand{border:0;background:transparent;color:inherit;padding:0;display:flex;align-items:center;min-width:0;overflow:hidden}.dcu-brand svg{display:block;width:auto;max-width:100%;height:24px;min-width:0}.dcu-head-actions{display:grid;grid-auto-flow:column;grid-auto-columns:28px;align-items:center;column-gap:8px;height:28px}
.dcu-icon,.dcu-menu button,.dcu-footer-link{appearance:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}.dcu-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;color:var(--dcu-sidebar-icon)}.dcu-head .dcu-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0;padding:0;border-radius:50%;line-height:0}.dcu-head .dcu-icon svg{display:block;width:16px;height:16px}
.dcu-icon:hover,.dcu-menu button:hover:not(:disabled),.dcu-footer-link:hover{background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary)}
.dcu-menu{padding:0 6px 8px;display:grid;gap:2px}.dcu-menu button,.dcu-footer-link{display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:8px;align-items:center;width:100%;min-height:36px;padding:0 4px;border-radius:8px;color:var(--dcu-sidebar-navigation);font-size:14px;line-height:20px;text-align:left;font-weight:400}
.dcu-menu-icon{display:grid;place-items:center start;width:20px;height:20px}.dcu-menu-icon svg,.dcu-footer-link svg{display:block;width:16px;height:16px;color:var(--dcu-sidebar-icon)}.dcu-menu button:disabled{color:var(--dcu-sidebar-secondary);cursor:default;opacity:1}.dcu-menu button:disabled svg{color:var(--dcu-sidebar-secondary)}
.dcu-extensions-group{display:grid}.dcu-extension-leading{position:relative;display:block;width:16px;height:16px}.dcu-extension-leading svg{position:absolute;inset:0;transition:opacity 140ms ease-out,transform 220ms cubic-bezier(.16,1,.3,1)}.dcu-extension-default-icon{opacity:1}.dcu-extension-state-arrow{opacity:0;transform:rotate(0)}.dcu-extensions-group:hover .dcu-extension-default-icon,.dcu-extensions-toggle:focus-visible .dcu-extension-default-icon{opacity:0}.dcu-extensions-group:hover .dcu-extension-state-arrow,.dcu-extensions-toggle:focus-visible .dcu-extension-state-arrow{opacity:1}.dcu-extensions-toggle[aria-expanded=true] .dcu-extension-state-arrow{transform:rotate(90deg)}.dcu-extension-panel{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows 220ms cubic-bezier(.16,1,.3,1),opacity 160ms ease-out}.dcu-extension-panel[data-open=false]{grid-template-rows:0fr;opacity:0;pointer-events:none}.dcu-extension-panel-inner{position:relative;min-height:0;overflow:hidden}.dcu-extension-items{position:relative;display:grid;gap:1px;margin:1px 0 4px 28px}.dcu-extension-items::before{content:"";position:absolute;left:-16px;top:0;bottom:4px;width:1px;background:var(--dcu-sidebar-border)}.dcu-extension-items button{grid-template-columns:20px minmax(0,1fr);min-height:32px;color:var(--dcu-sidebar-secondary);font-size:13px;font-weight:400}
.dcu-workspaces{display:flex;min-height:0;flex:1;flex-direction:column;margin-top:2px;padding-top:8px;border-top:1px solid var(--dcu-sidebar-border)}.dcu-native-workspaces{display:flex;min-height:0;flex:1}.dcu-native-workspaces>*{min-width:0;flex:1}.dcu-foot{display:grid;width:100%;gap:4px;padding:8px 6px 12px;border-top:1px solid var(--dcu-sidebar-border);transition:opacity 500ms cubic-bezier(.16,1,.3,1),transform 500ms cubic-bezier(.16,1,.3,1)}.dcu-root.dcu-collapsing>.dcu-foot{opacity:0;transform:translateX(-4px);pointer-events:none}.dcu-footer-actions:empty,.dcu-settings-seat:empty{display:none}.dcu-settings-seat>[data-dcu-settings-trigger]{width:100%;min-height:36px;padding-left:4px!important;color:var(--dcu-sidebar-navigation);font:14px/20px var(--dsw-font-family);font-weight:400}.dcu-compact{width:100%;align-items:flex-start;overflow:hidden;padding:calc((var(--dcu-header-height,34px) - 28px)/2) 0 8px}.dcu-compact-nav{display:flex;flex:1;min-height:0;flex-direction:column;align-items:center;gap:2px;overflow:auto;padding:6px 0}.dcu-compact .dcu-icon{width:36px;height:36px;flex:none}.dcu-compact .dcu-foot{width:36px;margin-top:auto;margin-left:10px;padding:8px 0;border-top:0}.dcu-compact .dcu-settings-seat{width:36px;overflow:hidden}.dcu-compact .dcu-settings-seat>[data-dcu-settings-trigger]{display:grid;place-items:center;width:36px;min-height:36px;padding:0!important;font-size:0!important;line-height:0}.dcu-compact .dcu-settings-seat>[data-dcu-settings-trigger] svg{width:16px;height:16px}.dcu-compact .dcu-footer-link{display:flex;justify-content:center;width:36px;padding:0;font-size:0}.dcu-compact .dcu-footer-link svg{width:16px;height:16px}
.dcu-settings-seat [data-slot="settings.trigger"]{color:var(--dcu-sidebar-navigation)}
.dcu-settings-seat [data-slot="settings.trigger"]>svg{color:var(--dcu-sidebar-icon)}
/* 宿主列负责缩放，宽态内容保持展开宽度，避免中文竖排与工作区逐帧重排。 */
.dcu-expanded-shell,.dcu-root:not(.dcu-compact)>.dcu-foot{width:var(--dcu-sidebar-expanded-width,240px);flex-shrink:0}
/* 对齐 Codex 的半秒布局节奏；显式声明避免依赖宿主主题的动画 token。 */
.dcu-root{position:relative}
.dcu-root.dcu-collapsing .dcu-compact-shell{position:absolute;left:0;top:calc(var(--dcu-sidebar-top-clearance,0px) + (var(--dcu-header-height,34px) - 28px)/2);bottom:8px;display:flex;flex-direction:column;align-items:center;animation:dcu-sidebar-compact-in 500ms cubic-bezier(.16,1,.3,1)}
.dcu-root.dcu-collapsing .dcu-compact-shell .dcu-icon{width:36px;height:36px;flex:none}.dcu-root .dcu-compact-shell>.dcu-icon,.dcu-root.dcu-collapsing .dcu-compact-shell>.dcu-icon{width:28px;height:28px;flex:none;margin:0;padding:0;border-radius:50%}
/* 收尾仅移除宽态层，窄轨不重复淡入，否则会在半秒处闪烁。 */
.dcu-root.dcu-compact .dcu-compact-shell{animation:none}
/* 原生交通灯覆盖网页顶部；宽态、窄轨和动画层共用宿主安全区，保持页脚在窗口内。 */
.dcu-root{--dcu-sidebar-top-clearance:0px}
html[data-platform=darwin]:not([data-fullscreen]) .dcu-root{position:relative;--dcu-sidebar-top-clearance:var(--dsh-frame-top-clearance,48px);padding-top:var(--dcu-sidebar-top-clearance)}
/* 只开放顶部空白安全区，不让项目列表、窄轨按钮成为窗口拖动区域。 */
html[data-platform=darwin]:not([data-fullscreen]) .dcu-root::after{content:"";position:absolute;inset:0 0 auto;height:var(--dcu-sidebar-top-clearance);pointer-events:none;-webkit-app-region:drag}
html[data-platform=darwin]:not([data-fullscreen]) .dcu-root.dcu-compact{padding-top:calc(var(--dcu-sidebar-top-clearance) + (var(--dcu-header-height,34px) - 28px)/2)}
[data-dcu-codex-sidebar-initialized]{transition:grid-template-columns 500ms cubic-bezier(.16,1,.3,1)}
/* dsh-better-sidebar 的 #root 布局规则会覆盖 transition 简写；合并两侧过渡而非只争抢左栏。 */
#root [data-dcu-codex-sidebar-initialized]:not([data-dragging]){transition:grid-template-columns 500ms cubic-bezier(.16,1,.3,1),padding-right var(--ds-transition-duration-slow,.3s) var(--ds-ease-in-out,cubic-bezier(.4,0,.2,1))}
#root [data-dcu-codex-sidebar-initialized][data-dragging]{transition:none}
[data-dcu-codex-sidebar-initialized] [data-side="sidebar"]{transition:left 500ms cubic-bezier(.16,1,.3,1)}
[data-dcu-codex-sidebar-initialized][data-dragging],[data-dcu-codex-sidebar-initialized][data-dragging] [data-side="sidebar"]{transition:none}
@media (prefers-reduced-motion:reduce){[data-dcu-codex-sidebar-initialized],[data-dcu-codex-sidebar-initialized] [data-side="sidebar"],#root [data-dcu-codex-sidebar-initialized]:not([data-dragging]){transition:none}.dcu-root.dcu-collapsing .dcu-compact-shell{animation:none}}
.dcu-native-workspaces{flex-direction:column}
.dcu-dependency-notice{margin:0 10px 8px;border:1px solid var(--dcu-sidebar-border);border-radius:8px;padding:8px;color:var(--dcu-sidebar-secondary);font-size:12px;line-height:18px}
.dcu-search-scrim{position:fixed;z-index:10020;inset:0;display:flex;justify-content:center;align-items:flex-start;padding:72px 20px;background:color-mix(in srgb,#000 60%,transparent);animation:dcu-search-scrim-in 140ms ease-out}.dcu-search-dialog{width:min(560px,100%);max-height:min(640px,calc(100vh - 120px));overflow:auto;border:1px solid var(--dcu-sidebar-border);border-radius:16px;padding:10px;background:#ffffff;box-shadow:0 16px 40px rgba(0,0,0,.24);animation:dcu-search-dialog-in 180ms cubic-bezier(.16,1,.3,1)}body[data-ds-dark-theme] .dcu-search-dialog{background:#232323;border-color:rgba(255,255,255,.08);box-shadow:0 16px 40px rgba(0,0,0,.45)}@keyframes dcu-search-scrim-in{from{opacity:0}to{opacity:1}}@keyframes dcu-search-dialog-in{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1}}.dcu-search-input{margin-bottom:8px}.dcu-search-section{padding:6px 0}.dcu-search-title{padding:0 8px 4px;color:var(--dcu-sidebar-tertiary);font-size:12px;font-weight:600}.dcu-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;min-height:34px;border:0;border-radius:8px;padding:6px 8px;background:transparent;color:var(--dcu-sidebar-primary);font:inherit;text-align:left;cursor:pointer}.dcu-search-row:hover,.dcu-search-row[data-active=true]{background:var(--dcu-sidebar-hover)}.dcu-search-main{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-search-detail{max-width:160px;overflow:hidden;color:var(--dcu-sidebar-tertiary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.dcu-search-empty{padding:18px 8px;color:var(--dcu-sidebar-tertiary);font-size:13px}@media (prefers-reduced-motion:reduce){.dcu-expanded-shell,.dcu-root.dcu-compact .dcu-compact-shell,.dcu-foot,.dcu-search-scrim,.dcu-search-dialog,.dcu-extension-panel,.dcu-extension-leading svg{animation:none;transition:none}}
[data-conversation-scroll]{--dsh-composer-card-max-width:calc(var(--dsh-chat-content-width) + 32px);--dsh-composer-side-clearance:24px;--dcu-composer-bg:var(--dsw-specific-input-major,#fff);--dcu-composer-shadow:0 0 0 1px #0000000a,0 2px 8px #0000000a,0 4px 80px 8px #00000006}
body[data-ds-dark-theme] [data-conversation-scroll]{--dcu-composer-bg:var(--dsw-alias-bg-layer-2,#242424);--dcu-composer-shadow:inset 0 0 1px #fff3}
[data-conversation-scroll] [data-composer-card]{padding-top:8px;gap:4px;border:0;border-radius:20px;background:var(--dcu-composer-bg);box-shadow:var(--dcu-composer-shadow)}
/* 官方附件轨道用 -6px 抵消 12px 行间距；本皮肤为 4px，改为 +2px 保留附件到正文的 6px。 */
[data-conversation-scroll] [data-composer-card]>[data-slot="conversation.input.attachments"]>:is([class$="_rail"],[class*="_rail_"]){margin-bottom:2px}
[data-conversation-scroll] [data-input-mirror]{min-height:44px}
[data-conversation-scroll] [data-composer-card] [data-input-scroll]{margin-right:0}
[data-conversation-scroll] [data-input-scroll] [data-lexical-editor=true]{min-height:44px;padding:0 12px}
[data-conversation-scroll] [data-composer-placeholder]{inset:0 12px auto}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div{padding:0 8px 8px;gap:5px}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div>div{gap:4px}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div>div>div{gap:4px}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div :is(button,select):not([role]){min-height:28px;height:28px}
/* 保留 Codex 黑白发送键；使用独立主题颜色，避免壁纸的透明表面令牌影响 currentColor 箭头。 */
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]{width:28px;transform:none;background:#0f1115;color:#fff}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]:hover:not(:disabled){background:#40434a}
body[data-ds-dark-theme] [data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]{background:#fff;color:#0f1115}
body[data-ds-dark-theme] [data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]:hover:not(:disabled){background:#d5d7dc}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div :is(button,select):focus-visible{outline:2px solid var(--dsw-alias-label-secondary);outline-offset:2px}
@supports(corner-shape:superellipse(1.5)){[data-conversation-scroll] [data-composer-card]{border-radius:25px;corner-shape:superellipse(1.5)}}
@media(max-width:639px){[data-conversation-scroll]{--dcu-composer-shadow:0 0 0 1px #0000000a,0 2px 8px #0000000a,0 4px 40px 8px #00000006}}
@media(forced-colors:active){[data-conversation-scroll] [data-composer-card]{outline:1px solid CanvasText}}
`;
		function MenuIcon({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dcu-menu-icon",
				children
			});
		}
		function SidebarSearchModal({ openPlugins, openSession, startSession, t, useSessions, useWorkspaces, settingsSeat, onClose }) {
			const [query, setQuery] = (0, react.useState)("");
			const [activeIndex, setActiveIndex] = (0, react.useState)(0);
			const deferredQuery = (0, react.useDeferredValue)(query);
			const sessions = useSessions((state) => state);
			const workspaces = useWorkspaces((state) => state);
			const selectSection = (0, react.useCallback)((label) => {
				openSettingsSection(settingsSeat.current, label);
			}, [settingsSeat]);
			const selectExternalSection = (0, react.useCallback)((label) => {
				openSettingsSection(settingsSeat.current, label, () => {
					selectSection(t("about.nav"));
				});
			}, [
				selectSection,
				settingsSeat,
				t
			]);
			const openSettings = (0, react.useCallback)(() => {
				openSettingsRoot(settingsSeat.current);
			}, [settingsSeat]);
			const entries = (0, react.useMemo)(() => {
				const archived = new Set(workspaces.archivedSessionIds);
				const workspaceTitles = new Map(workspaces.items.flatMap((workspace) => workspace.sessionIds.map((sessionId) => [String(sessionId), workspace.title])));
				const sessionEntries = sessions.ids.map((id) => sessions.byId[id]).filter((session) => session !== void 0 && !archived.has(session.id) && isTaskSession(session)).sort((left, right) => right.updatedAt - left.updatedAt).map((session) => ({
					id: `session:${session.id}`,
					group: "sessions",
					label: session.displayTitle,
					keywords: `${session.cwd ?? ""} ${session.id}`,
					detail: workspaceTitles.get(String(session.id)) ?? session.cwd,
					run: () => {
						onClose();
						openSession(session.id);
					}
				}));
				const settingEntries = [
					{
						id: "settings:root",
						group: "settings",
						label: t("search.settings"),
						keywords: t("search.settings"),
						run: () => {
							onClose();
							openSettings();
						}
					},
					{
						id: "settings:experts",
						group: "settings",
						label: t("sidebar.experts"),
						keywords: t("search.settings"),
						run: () => {
							onClose();
							selectExternalSection(t("sidebar.experts"));
						}
					},
					{
						id: "settings:skills",
						group: "settings",
						label: t("sidebar.skills"),
						keywords: t("search.settings"),
						run: () => {
							onClose();
							selectExternalSection(t("sidebar.skills"));
						}
					},
					{
						id: "settings:plugins",
						group: "settings",
						label: t("sidebar.plugins"),
						keywords: t("search.settings"),
						run: () => {
							onClose();
							openPlugins();
						}
					},
					{
						id: "settings:codex-ui",
						group: "settings",
						label: t("about.nav"),
						keywords: t("search.settings"),
						run: () => {
							onClose();
							selectSection(t("about.nav"));
						}
					}
				];
				return [
					...sessionEntries,
					...settingEntries,
					{
						id: "action:new",
						group: "actions",
						label: t("sidebar.newTask"),
						keywords: t("search.actions"),
						run: () => {
							onClose();
							startSession();
						}
					}
				];
			}, [
				onClose,
				openPlugins,
				openSession,
				openSettings,
				selectExternalSection,
				selectSection,
				sessions.byId,
				sessions.ids,
				startSession,
				t,
				workspaces.archivedSessionIds,
				workspaces.items
			]);
			const results = (0, react.useMemo)(() => filterSidebarSearchItems(entries, deferredQuery).slice(0, 12), [deferredQuery, entries]);
			(0, react.useEffect)(() => {
				setActiveIndex(0);
			}, [query]);
			(0, react.useEffect)(() => {
				const onKeyDown = (event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						onClose();
						return;
					}
					if (event.key === "ArrowDown") {
						event.preventDefault();
						setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
						return;
					}
					if (event.key === "ArrowUp") {
						event.preventDefault();
						setActiveIndex((index) => Math.max(index - 1, 0));
						return;
					}
					if (event.key === "Enter") {
						const entry = results[activeIndex];
						if (entry !== void 0) {
							event.preventDefault();
							entry.run();
						}
					}
				};
				window.addEventListener("keydown", onKeyDown);
				return () => {
					window.removeEventListener("keydown", onKeyDown);
				};
			}, [
				activeIndex,
				onClose,
				results
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-search-scrim",
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "dcu-search-dialog",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("sidebar.search"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-search-input",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							autoFocus: true,
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconSearchOutlineMedium, { size: 16 }),
							value: query,
							placeholder: t("search.placeholder"),
							onChange: (event) => {
								setQuery(event.target.value);
							}
						})
					}), results.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-search-empty",
						children: t("search.empty")
					}) : [
						"sessions",
						"settings",
						"actions"
					].map((group) => {
						const grouped = results.filter((entry) => entry.group === group);
						if (grouped.length === 0) return null;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "dcu-search-section",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-search-title",
								children: t(`search.${group}`)
							}), grouped.map((entry) => {
								const index = results.indexOf(entry);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "dcu-search-row",
									"data-active": index === activeIndex,
									onMouseEnter: () => {
										setActiveIndex(index);
									},
									onClick: entry.run,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-search-main",
										children: entry.label
									}), entry.detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-search-detail",
										children: entry.detail
									})]
								}, entry.id);
							})]
						}, group);
					})]
				})
			});
		}
		/** 搜索状态与大侧栏隔离：未打开时不订阅 store 快照，避免后台流式高频引发无谓的搜索索引重构。 */
		const SidebarSearch = (0, react.forwardRef)(function SidebarSearch(props, ref) {
			const [open, setOpen] = (0, react.useState)(false);
			const close = (0, react.useCallback)(() => {
				setOpen(false);
			}, []);
			(0, react.useImperativeHandle)(ref, () => ({ open: () => {
				setOpen(true);
			} }), []);
			if (!open) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidebarSearchModal, {
				...props,
				onClose: close
			});
		});
		const subscribeEmpty = () => () => {};
		/** Codex 风格的 DSH 侧栏，只替换导航外观，项目浏览和设置仍由 DSH 官方组件提供。 */
		function CodexSidebar({ workspaceShortcuts, globalPanels, footerActions, selectPanel, usePanelInfo = useLegacyPanelInfo, collapsed, width, openSession, startSession, toggleSidebar, archiveSession, canDeleteSession, deleteSession, forkSession, renameSession, renderSlot, t, useSessions, useSessionPendingInteraction, useSessionStatus, useWorkspaces }) {
			const extensionPanels = [...(0, react.useSyncExternalStore)(globalPanels?.subscribe ?? subscribeEmpty, globalPanels?.getSnapshot ?? getEmptyPanels, globalPanels?.getSnapshot ?? getEmptyPanels)].sort((left, right) => left.order - right.order);
			const visibleFooterActions = (0, react.useSyncExternalStore)(footerActions?.subscribe ?? subscribeEmpty, footerActions?.getSnapshot ?? getEmptyFooterActions, footerActions?.getSnapshot ?? getEmptyFooterActions);
			const activePanelId = usePanelInfo((info) => info.activePanelId);
			const panelActive = activePanelId !== null && activePanelId !== "";
			const compact = collapsed || width < 80;
			const [visualCompact, setVisualCompact] = (0, react.useState)(compact);
			const [collapsing, setCollapsing] = (0, react.useState)(false);
			const settingsSeat = (0, react.useRef)(null);
			const search = (0, react.useRef)(null);
			const openSearch = () => {
				workspaceShortcuts?.getSnapshot().bindings?.closeAddWorkspace();
				search.current?.open();
			};
			const toggleSidebarRef = (0, react.useRef)(toggleSidebar);
			toggleSidebarRef.current = toggleSidebar;
			const expandSidebar = (0, react.useCallback)(() => {
				toggleSidebarRef.current();
			}, []);
			const [extensionsOpen, setExtensionsOpen] = (0, react.useState)(readExtensionsOpen);
			const [startingSession, setStartingSession] = (0, react.useState)(false);
			const beginSession = (0, react.useCallback)(async (workspaceId) => {
				if (startingSession) return;
				setStartingSession(true);
				try {
					await Promise.resolve(startSession(workspaceId));
				} catch (error) {
					console.warn("新建任务失败：", error);
				} finally {
					setStartingSession(false);
				}
			}, [startSession, startingSession]);
			const selectSection = (label) => {
				openSettingsSection(settingsSeat.current, label);
			};
			const openPlugins = () => {
				selectExternalSection([t("sidebar.marketplace"), t("sidebar.builtinPlugins")]);
			};
			const selectExternalSection = (label) => {
				openSettingsSection(settingsSeat.current, label, () => {
					selectSection(t("about.nav"));
				});
			};
			(0, react.useEffect)(() => {
				let startX = 0;
				let startWidth = 240;
				let dragging = false;
				let pointerId;
				let frame;
				let handle;
				const stopHostDrag = (event) => {
					event.preventDefault();
					event.stopPropagation();
				};
				const finishDrag = () => {
					frame?.removeAttribute("data-dragging");
					handle?.removeAttribute("data-dragging");
					if (handle !== void 0 && pointerId !== void 0 && handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId);
					dragging = false;
					pointerId = void 0;
					frame = void 0;
					handle = void 0;
				};
				const onDown = (event) => {
					if (dragging || !isSidebarDragHandle(event.target)) return;
					const nextFrame = findSidebarFrame(document);
					const tracks = nextFrame === void 0 ? void 0 : parseSidebarGrid(nextFrame.style.gridTemplateColumns);
					const nextHandle = event.target instanceof Element ? event.target.closest("[data-side=\"sidebar\"]") ?? void 0 : void 0;
					if (nextFrame === void 0 || tracks === void 0 || nextHandle === void 0) return;
					stopHostDrag(event);
					dragging = true;
					pointerId = event.pointerId;
					startX = event.clientX;
					startWidth = tracks.sidebar;
					frame = nextFrame;
					handle = nextHandle;
					frame.setAttribute("data-dragging", "");
					handle.setAttribute("data-dragging", "true");
					try {
						handle.setPointerCapture(event.pointerId);
					} catch {}
				};
				const onMove = (event) => {
					if (!dragging || event.pointerId !== pointerId || frame === void 0) return;
					stopHostDrag(event);
					applySidebarWidth(frame, sidebarWidthDuringDrag(startWidth, startX, event.clientX));
				};
				const onUp = (event) => {
					if (!dragging || event.pointerId !== pointerId) return;
					stopHostDrag(event);
					if (frame !== void 0) applySidebarWidth(frame, sidebarWidthDuringDrag(startWidth, startX, event.clientX));
					const collapse = shouldCollapseOnSidebarDrag(startWidth, startX, event.clientX);
					finishDrag();
					if (collapse) window.requestAnimationFrame(() => {
						window.requestAnimationFrame(() => {
							toggleSidebarRef.current();
						});
					});
				};
				const onCancel = (event) => {
					if (event.pointerId !== pointerId) return;
					stopHostDrag(event);
					finishDrag();
				};
				window.addEventListener("pointerdown", onDown, true);
				window.addEventListener("pointermove", onMove, true);
				window.addEventListener("pointerup", onUp, true);
				window.addEventListener("pointercancel", onCancel, true);
				return () => {
					finishDrag();
					window.removeEventListener("pointerdown", onDown, true);
					window.removeEventListener("pointermove", onMove, true);
					window.removeEventListener("pointerup", onUp, true);
					window.removeEventListener("pointercancel", onCancel, true);
				};
			}, []);
			(0, react.useLayoutEffect)(() => {
				if (!compact) {
					setCollapsing(false);
					setVisualCompact(false);
					return;
				}
				if (visualCompact) {
					setCollapsing(false);
					return;
				}
				if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true) {
					setCollapsing(false);
					setVisualCompact(true);
					return;
				}
				setCollapsing(true);
				let done = false;
				const finish = () => {
					if (done) return;
					done = true;
					setVisualCompact(true);
					setCollapsing(false);
				};
				const timer = window.setTimeout(finish, SIDEBAR_COLLAPSE_SETTLE_MS);
				return () => {
					done = true;
					window.clearTimeout(timer);
				};
			}, [compact, visualCompact]);
			const workspaceSlot = (0, react.useMemo)(() => {
				return renderSlot("sidebar.workspaces", {
					wide: true,
					expandSidebar,
					panelActive
				});
			}, [
				expandSidebar,
				panelActive,
				renderSlot
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: `dcu-root${visualCompact ? " dcu-compact" : ""}${collapsing ? " dcu-collapsing" : ""}`,
				"aria-label": t("sidebar.label"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: stylesheet$2 }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-expanded-shell",
						onTransitionEnd: (event) => {
							if (event.target === event.currentTarget && (event.propertyName === "opacity" || event.propertyName === "transform")) {
								setVisualCompact(true);
								setCollapsing(false);
							}
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								className: "dcu-head",
								"data-window-drag": true,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-brand",
									"aria-label": t("sidebar.newTask"),
									onClick: () => {
										beginSession();
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.BrandWordmark, { size: 24 })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-head-actions",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dcu-icon",
										"aria-label": t("sidebar.collapse"),
										onClick: toggleSidebar,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPanelLeftOutlineMedium, { size: 16 })
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dcu-icon",
										"aria-label": t("sidebar.search"),
										onClick: openSearch,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconSearchOutlineMedium, { size: 16 })
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
								className: "dcu-menu",
								"aria-label": t("sidebar.mainMenu"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										beginSession();
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconNewChatOutlineMedium, { size: 16 }) }), t("sidebar.newTask")]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-extensions-group",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dcu-extensions-toggle",
										"aria-expanded": extensionsOpen,
										"aria-controls": "dcu-extension-items",
										onClick: () => {
											setExtensionsOpen((open) => {
												const next = !open;
												writeExtensionsOpen(next);
												return next;
											});
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dcu-extension-leading",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconEnhanceOutlineMedium, {
												className: "dcu-extension-default-icon",
												size: 16
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevronRightOutlineMedium, { className: "dcu-extension-state-arrow" })]
										}) }), t("sidebar.extensions")]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										id: "dcu-extension-items",
										className: "dcu-extension-panel",
										"data-open": extensionsOpen,
										"aria-hidden": !extensionsOpen,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dcu-extension-panel-inner",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dcu-extension-items",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														tabIndex: extensionsOpen ? 0 : -1,
														onClick: () => {
															selectExternalSection(t("sidebar.experts"));
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconUserOutlineMedium, { size: 16 }) }), t("sidebar.experts")]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														tabIndex: extensionsOpen ? 0 : -1,
														onClick: () => {
															selectExternalSection(t("sidebar.skills"));
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconSkillOutlineMedium, { size: 16 }) }), t("sidebar.skills")]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														tabIndex: extensionsOpen ? 0 : -1,
														onClick: () => {
															openPlugins();
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPersonalizationOutlineMedium, { size: 16 }) }), t("sidebar.plugins")]
													}),
													extensionPanels.map((panel) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														tabIndex: extensionsOpen ? 0 : -1,
														"aria-current": activePanelId === panel.id ? "page" : void 0,
														onClick: () => {
															selectPanel?.(panel.id);
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: renderSlot("sidebar.panellist", {
															size: 16,
															active: activePanelId === panel.id
														}, { only: panel.id }) }), panel.label]
													}, panel.id))
												]
											})
										})
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-workspaces",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-native-workspaces",
									children: workspaceSlot
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-compact-shell",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dcu-icon",
							"aria-label": t("sidebar.expand"),
							onClick: toggleSidebar,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPanelLeftOutlineMedium, { size: 16 })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
							className: "dcu-compact-nav",
							"aria-label": t("sidebar.mainMenu"),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.newTask"),
									onClick: () => {
										beginSession();
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconNewChatOutlineMedium, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.search"),
									onClick: openSearch,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconSearchOutlineMedium, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.experts"),
									onClick: () => {
										selectExternalSection(t("sidebar.experts"));
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconUserOutlineMedium, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.skills"),
									onClick: () => {
										selectExternalSection(t("sidebar.skills"));
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconSkillOutlineMedium, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.plugins"),
									onClick: () => {
										openPlugins();
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPersonalizationOutlineMedium, { size: 16 })
								}),
								extensionPanels.map((panel) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": panel.label,
									title: panel.label,
									onClick: () => {
										selectPanel?.(panel.id);
									},
									children: renderSlot("sidebar.panellist", {
										size: 16,
										active: activePanelId === panel.id
									}, { only: panel.id })
								}, panel.id))
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						className: "dcu-foot",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-footer-actions",
							children: footerActions === void 0 ? renderSlot("sidebar.footer.action", { wide: !visualCompact }) : visibleFooterActions.map((action) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: renderSlot("sidebar.footer.action", { wide: !visualCompact }, { only: action.id }) }, action.id))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							ref: settingsSeat,
							className: "dcu-settings-seat",
							children: renderSlot("sidebar.settings", { wide: !visualCompact })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidebarSearch, {
						ref: search,
						openPlugins,
						settingsSeat,
						openSession,
						startSession: beginSession,
						t,
						useSessions,
						useWorkspaces
					}),
					workspaceShortcuts && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspaceShortcutBridge, {
						source: workspaceShortcuts,
						openSearch,
						startSession: (id) => {
							beginSession(id);
						},
						renderDirectoryFlow: (owner) => renderSlot("sidebar.codex.directoryFlow", owner),
						t
					})
				]
			});
		}
		CodexSidebar.displayName = "michengai-codex-ui";
		//#endregion
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
		//#region src/business-api.ts
		const CODEX_UI_API_BASE = "/api/dsh-codex-ui";
		const CODEX_UI_API_ENDPOINTS = Object.freeze({
			dependencies: `${CODEX_UI_API_BASE}/dependencies`,
			preferences: `${CODEX_UI_API_BASE}/preferences`,
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
		const WORKSPACE_GROUP_ERROR_MESSAGES = {
			"group-invalid": "分组信息无效。",
			"workspace-invalid": "项目标识无效。",
			"group-missing": "目标分组不存在。",
			"order-anchor-missing": "排序锚点不存在。"
		};
		/** 以稳定错误码承载分组业务失败，诊断文案不参与界面控制逻辑。 */
		var WorkspaceGroupError = class extends Error {
			code;
			name = "WorkspaceGroupError";
			constructor(code, message = WORKSPACE_GROUP_ERROR_MESSAGES[code]) {
				super(message);
				this.code = code;
			}
		};
		/** 校验结构和归属；存储兼容模式保留旧 locale 下合法的大小写变体名称。 */
		function parseGroups(value, preserveCaseVariants) {
			if (!Array.isArray(value) || value.length > 100) return void 0;
			const groupIds = /* @__PURE__ */ new Set();
			const groupTitles = /* @__PURE__ */ new Set();
			const workspaceIds = /* @__PURE__ */ new Set();
			const groups = [];
			for (const valueGroup of value) {
				if (valueGroup === null || typeof valueGroup !== "object") return void 0;
				const group = valueGroup;
				const id = typeof group.id === "string" ? group.id.trim() : "";
				const title = typeof group.title === "string" ? group.title.trim() : "";
				if (id === "" || id.length > 128 || title === "" || title.length > 80) return void 0;
				const titleKey = preserveCaseVariants ? title : title.toLowerCase();
				if (groupIds.has(id) || groupTitles.has(titleKey)) return void 0;
				if (!Array.isArray(group.workspaceIds) || group.workspaceIds.length > 1e3) return void 0;
				const normalizedIds = [...new Set(group.workspaceIds)];
				if (!normalizedIds.every((workspaceId) => typeof workspaceId === "string" && workspaceId.trim() !== "" && workspaceId.length <= 256)) return void 0;
				if (normalizedIds.some((workspaceId) => workspaceIds.has(workspaceId))) return void 0;
				groupIds.add(id);
				groupTitles.add(titleKey);
				normalizedIds.forEach((workspaceId) => workspaceIds.add(workspaceId));
				groups.push({
					id,
					title,
					workspaceIds: normalizedIds
				});
			}
			return groups;
		}
		/** 旧数据可往返保存且不改名；新名称的大小写判重由创建、重命名操作执行。 */
		function parseStoredWorkspaceGroups(value) {
			return parseGroups(value, true);
		}
		/** 新建空分组；项目只有被显式移动后才会进入其中。 */
		function createWorkspaceGroup(groups, group) {
			if (groups.some((existing) => existing.title.toLowerCase() === group.title.trim().toLowerCase())) throw new WorkspaceGroupError("group-invalid");
			const next = parseStoredWorkspaceGroups([...groups, {
				...group,
				workspaceIds: []
			}]);
			if (next === void 0) throw new WorkspaceGroupError("group-invalid");
			return next;
		}
		/** 仅更改名称，保留分组标识、成员及其顺序。 */
		function renameWorkspaceGroup(groups, groupId, title) {
			if (!groups.some((group) => group.id === groupId)) throw new WorkspaceGroupError("group-missing");
			const normalizedTitle = title.trim();
			if (normalizedTitle === "" || normalizedTitle.length > 80 || groups.some((group) => group.id !== groupId && group.title.toLowerCase() === normalizedTitle.toLowerCase())) throw new WorkspaceGroupError("group-invalid");
			return groups.map((group) => group.id === groupId ? {
				...group,
				title: normalizedTitle
			} : group);
		}
		/** 将项目放入指定分组；未传分组时退回未分组区。 */
		function assignWorkspaceToGroup(groups, workspaceId, groupId) {
			if (workspaceId.trim() === "" || workspaceId.length > 256) throw new WorkspaceGroupError("workspace-invalid");
			if (groupId !== void 0 && !groups.some((group) => group.id === groupId)) throw new WorkspaceGroupError("group-missing");
			return groups.map((group) => ({
				...group,
				workspaceIds: group.id === groupId ? [...group.workspaceIds.filter((id) => id !== workspaceId), workspaceId] : group.workspaceIds.filter((id) => id !== workspaceId)
			}));
		}
		/** 将项目插入目标分组的指定位置，同时从原分组移除。 */
		function placeWorkspaceInGroup(groups, workspaceId, groupId, beforeId) {
			if (workspaceId.trim() === "" || workspaceId.length > 256) throw new WorkspaceGroupError("workspace-invalid");
			const target = groups.find((group) => group.id === groupId);
			if (target === void 0) throw new WorkspaceGroupError("group-missing");
			const targetIds = target.workspaceIds.filter((id) => id !== workspaceId);
			const index = beforeId === void 0 ? targetIds.length : targetIds.indexOf(beforeId);
			if (index < 0) throw new WorkspaceGroupError("order-anchor-missing");
			targetIds.splice(index, 0, workspaceId);
			return groups.map((group) => ({
				...group,
				workspaceIds: group.id === groupId ? targetIds : group.workspaceIds.filter((id) => id !== workspaceId)
			}));
		}
		/** 在同一分组内移动项目；省略锚点时放到分组末尾。 */
		function moveWorkspaceGroupMember(groups, workspaceId, groupId, beforeId) {
			const target = groups.find((group) => group.id === groupId);
			if (target === void 0) throw new WorkspaceGroupError("group-missing");
			if (!target.workspaceIds.includes(workspaceId)) return groups.map((group) => ({
				...group,
				workspaceIds: [...group.workspaceIds]
			}));
			const remaining = target.workspaceIds.filter((id) => id !== workspaceId);
			const index = beforeId === void 0 ? remaining.length : remaining.indexOf(beforeId);
			if (index < 0) throw new WorkspaceGroupError("order-anchor-missing");
			const workspaceIds = [...remaining];
			workspaceIds.splice(index, 0, workspaceId);
			return groups.map((group) => group.id === groupId ? {
				...group,
				workspaceIds
			} : {
				...group,
				workspaceIds: [...group.workspaceIds]
			});
		}
		/** 调整自定义分组顺序；省略锚点时移动到所有自定义分组末尾。 */
		function moveWorkspaceGroup(groups, groupId, beforeGroupId) {
			const moved = groups.find((group) => group.id === groupId);
			if (moved === void 0) throw new WorkspaceGroupError("group-missing");
			if (beforeGroupId === groupId) return groups.map((group) => ({
				...group,
				workspaceIds: [...group.workspaceIds]
			}));
			const remaining = groups.filter((group) => group.id !== groupId);
			const index = beforeGroupId === void 0 ? remaining.length : remaining.findIndex((group) => group.id === beforeGroupId);
			if (index < 0) throw new WorkspaceGroupError("order-anchor-missing");
			remaining.splice(index, 0, moved);
			return remaining.map((group) => ({
				...group,
				workspaceIds: [...group.workspaceIds]
			}));
		}
		/** 删除分组时仅解除归属，不影响工作区本身。 */
		function deleteWorkspaceGroup(groups, groupId) {
			return groups.filter((group) => group.id !== groupId).map((group) => ({
				...group,
				workspaceIds: [...group.workspaceIds]
			}));
		}
		/** 工作区清单变化后清理失效归属，但保留空分组供用户继续使用。 */
		function pruneWorkspaceGroups(groups, validIds) {
			const valid = new Set(validIds);
			return groups.map((group) => ({
				...group,
				workspaceIds: group.workspaceIds.filter((id) => valid.has(id))
			}));
		}
		function groupedWorkspaceIds(groups) {
			return groups.flatMap((group) => group.workspaceIds);
		}
		//#endregion
		//#region src/client/user-error.ts
		const WORKSPACE_GROUP_ERROR_KEYS = {
			"group-invalid": "errors.groupInvalid",
			"workspace-invalid": "errors.workspaceInvalid",
			"group-missing": "errors.groupMissing",
			"order-anchor-missing": "errors.orderAnchorMissing"
		};
		const HOST_ACTION_DEFAULT_KEYS = {
			rename: "sessions.renameFailed",
			delete: "sessions.deleteFailed",
			archive: "sessions.archiveFailed",
			fork: "sessions.forkFailed"
		};
		const HOST_ACTION_ERROR_KEYS = {
			rename: {
				"session/not-found": "sessions.unknown",
				"session/title-invalid": "sessions.renameInvalid"
			},
			delete: { "session/not-found": "sessions.unknown" },
			archive: { "session/not-found": "sessions.unknown" },
			fork: {
				"session/not-found": "sessions.unknown",
				"session/fork-unavailable": "sessions.forkUnavailable"
			}
		};
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
		/** 仅显式构造的本地化错误允许原样进入界面。 */
		var UserFacingError = class extends Error {};
		/** 保留 Host 结构化失败及操作语境，界面只消费受控映射。 */
		var HostActionError = class extends Error {
			action;
			reason;
			name = "HostActionError";
			constructor(action, reason) {
				super(`Host ${action} 操作失败`);
				this.action = action;
				this.reason = reason;
			}
		};
		function objectRecord(value) {
			return value !== null && typeof value === "object" ? value : void 0;
		}
		/** DSH 明确要求跨 bundle 按结构标记识别 RemoteFailure，不能使用 instanceof。 */
		function remoteFailureCode(value) {
			const seen = /* @__PURE__ */ new Set();
			let current = value;
			while (true) {
				const record = objectRecord(current);
				if (record === void 0 || seen.has(record)) return void 0;
				seen.add(record);
				if (record.isDSHRemoteError === true && typeof record.code === "string") return record.code;
				current = record.rpcError;
			}
		}
		function diagnosticMessage(value) {
			if (value instanceof Error) return value.message;
			const record = objectRecord(value);
			return typeof record?.message === "string" ? record.message : void 0;
		}
		function hostActionErrorKey(error) {
			const code = remoteFailureCode(error.reason);
			if (code !== void 0) {
				const key = HOST_ACTION_ERROR_KEYS[error.action][code];
				if (key !== void 0) return key;
			}
			if (error.action === "delete" && diagnosticMessage(error.reason)?.includes("UNKNOWN_SESSION") === true) return "sessions.unknown";
			return HOST_ACTION_DEFAULT_KEYS[error.action];
		}
		/** 将业务错误映射为当前语言，未知底层错误统一脱敏。 */
		function userErrorText(error, t) {
			const requestKey = businessRequestErrorKey(error);
			if (requestKey !== void 0) return t(requestKey);
			if (error instanceof UserFacingError) return error.message;
			if (error instanceof WorkspaceGroupError) return t(WORKSPACE_GROUP_ERROR_KEYS[error.code]);
			if (error instanceof HostActionError) return t(hostActionErrorKey(error));
			return t("errors.generic");
		}
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
		const stylesheet$1 = `
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: stylesheet$1 }),
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.sidebar") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.search") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.workspace") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.sessions") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.conversation") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.navigator") })
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
		const Archive = createLucideIcon("archive", [
			["rect", {
				width: "20",
				height: "5",
				x: "2",
				y: "3",
				rx: "1",
				key: "1wp1u1"
			}],
			["path", {
				d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",
				key: "1s80jp"
			}],
			["path", {
				d: "M10 12h4",
				key: "a56b0p"
			}]
		]);
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
		const EyeOff = createLucideIcon("eye-off", [
			["path", {
				d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
				key: "ct8e1f"
			}],
			["path", {
				d: "M14.084 14.158a3 3 0 0 1-4.242-4.242",
				key: "151rxh"
			}],
			["path", {
				d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
				key: "13bj9a"
			}],
			["path", {
				d: "m2 2 20 20",
				key: "1ooewy"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Eye = createLucideIcon("eye", [["path", {
			d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
			key: "1nclc0"
		}], ["circle", {
			cx: "12",
			cy: "12",
			r: "3",
			key: "1v7zrd"
		}]]);
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
		const MessageCircle = createLucideIcon("message-circle", [["path", {
			d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",
			key: "1sd12s"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Pin = createLucideIcon("pin", [["path", {
			d: "M12 17v5",
			key: "bb1du9"
		}], ["path", {
			d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",
			key: "1nkz8b"
		}]]);
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
		const SquarePen = createLucideIcon("square-pen", [["path", {
			d: "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
			key: "1m0v6g"
		}], ["path", {
			d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",
			key: "ohrbg2"
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
		//#region src/client/session-title-scroll.ts
		/** 会话行只展示标题第一行，避免换行把胶囊撑高。 */
		function sessionTitleLine(title) {
			return title.split(/\r?\n/)[0] ?? title;
		}
		/** 标题比可视槽多出来的像素；1px 内当作测量误差。 */
		function titleOverflowPx(scrollWidth, clientWidth) {
			const extra = Math.ceil(scrollWidth - clientWidth);
			return extra > 1 ? extra : 0;
		}
		const PX_PER_SECOND = 42;
		/** 按溢出长度估算单程时长，长标题更慢，避免一闪而过。 */
		function titleScrollDurationMs(overflowPx) {
			if (overflowPx <= 0) return 0;
			return Math.min(8e3, Math.max(1600, Math.round(overflowPx / PX_PER_SECOND * 1e3)));
		}
		//#endregion
		//#region src/client/session-tree.tsx
		function PinIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pin, {
				"aria-hidden": "true",
				size: 16,
				strokeWidth: 1.5
			});
		}
		function QuickArchiveIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Archive, {
				"aria-hidden": "true",
				size: 16,
				strokeWidth: 1.5
			});
		}
		function sessionMenuItems(t, options) {
			const items = [
				{
					id: "rename",
					label: t("sessions.rename"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconEditOutlineMedium, { size: 16 })
				},
				{
					id: "unread",
					label: t(options.unread ? "sessions.markRead" : "sessions.markUnread"),
					icon: options.unread ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EyeOff, {
						"aria-hidden": "true",
						size: 16,
						strokeWidth: 1.5
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Eye, {
						"aria-hidden": "true",
						size: 16,
						strokeWidth: 1.5
					})
				},
				{
					id: "archive",
					label: t("sessions.archive"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconArchiveOutlineMedium, { size: 16 })
				},
				{
					type: "separator",
					id: "main-separator"
				},
				{
					id: "fork",
					label: t("sessions.fork"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconBranchOutlineMedium, { size: 16 })
				}
			];
			items.push({
				type: "separator",
				id: "copy-separator"
			}, {
				id: "copyId",
				label: t("sessions.copyId"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconLinkOutlineMedium, { size: 16 })
			}, {
				id: "copyTitle",
				label: t("sessions.copyTitle"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCopyOutlineMedium, { size: 16 })
			}, ...options.includePath === true ? [{
				id: "copyPath",
				label: t("sessions.copyPath"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCopyOutlineMedium, { size: 16 }),
				disabled: options.path === void 0
			}] : []);
			if (options.canDelete !== false) items.push({
				type: "separator",
				id: "delete-separator"
			}, {
				id: "delete",
				label: t("sessions.delete"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconTrashOutlineMedium, { size: 16 }),
				danger: true
			});
			return items;
		}
		/** 把右键落点收成 Menu 的锚点矩形，让列表贴着指针打开。 */
		function pointerMenuRect(x, y) {
			return new DOMRect(x, y, 0, 0);
		}
		function pendingLabel(kind, t) {
			switch (kind) {
				case "approval": return t("sessions.waitingApproval");
				case "plan-review": return t("sessions.planReview");
				case "question": return t("sessions.waitingAnswer");
			}
		}
		function SessionState({ pendingInteraction, unread, running, t }) {
			if (pendingInteraction !== void 0) {
				const label = pendingLabel(pendingInteraction, t);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dcu-wb-pending",
					"data-state": "warning",
					"data-pending-kind": pendingInteraction,
					"aria-label": label,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-pending-dot",
						"aria-hidden": "true"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-pending-label",
						children: label
					})]
				});
			}
			if (unread) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dcu-wb-unread",
				"aria-label": t("sessions.unread")
			});
			if (running) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dcu-wb-running",
				"aria-hidden": "true"
			});
			return null;
		}
		function SessionTime({ time }) {
			if (time === void 0 || time === "") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dcu-wb-session-time",
				children: time
			});
		}
		function SessionRowTitle({ title }) {
			const text = sessionTitleLine(title);
			const wrapRef = (0, react.useRef)(null);
			const textRef = (0, react.useRef)(null);
			const [shift, setShift] = (0, react.useState)(0);
			(0, react.useLayoutEffect)(() => {
				const wrap = wrapRef.current;
				const inner = textRef.current;
				if (wrap === null || inner === null) return;
				const measure = () => {
					setShift(titleOverflowPx(inner.scrollWidth, wrap.clientWidth));
				};
				measure();
				let cancelled = false;
				const fonts = typeof document === "undefined" ? void 0 : document.fonts;
				if (fonts !== void 0) fonts.ready.then(() => {
					if (!cancelled) measure();
				});
				if (typeof ResizeObserver === "undefined") return () => {
					cancelled = true;
				};
				const observer = new ResizeObserver(measure);
				observer.observe(wrap);
				return () => {
					cancelled = true;
					observer.disconnect();
				};
			}, [text]);
			const style = shift > 0 ? {
				"--dcu-title-shift": `${shift}px`,
				"--dcu-title-duration": `${titleScrollDurationMs(shift)}ms`
			} : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				ref: wrapRef,
				className: "dcu-wb-session-title",
				"data-overflow": shift > 0 || void 0,
				style,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					ref: textRef,
					className: "dcu-wb-session-title-text",
					children: text
				})
			});
		}
		const SessionRow = (0, react.memo)(function SessionRow({ id, title, selected, menuOpen, unread, running, pendingInteraction, t, menuItems, onOpen, onMenuChange, onSelectAction, onArchive, onHover, onLeave, onContextMenu, menuPoint, subtitle, flat, draggable, dropActive, onDragStart, onDragEnd, onDragOver, onDrop, time }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-dcu-session": id,
				className: `dcu-wb-session${selected ? " dcu-wb-selected" : ""}${menuOpen ? " dcu-wb-menu-open" : ""}${dropActive === true ? " dcu-wb-drop" : ""}${flat === true ? " dcu-wb-session-flat" : ""}`,
				role: "treeitem",
				"aria-selected": selected,
				draggable,
				onDragStart,
				onDragEnd,
				onDragOver,
				onDrop,
				onClick: onOpen,
				onContextMenu,
				onMouseEnter: onHover,
				onMouseLeave: onLeave,
				children: [
					subtitle !== void 0 && subtitle !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dcu-wb-session-copy",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRowTitle, { title }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-session-sub",
							children: subtitle
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRowTitle, { title }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionState, {
						pendingInteraction,
						unread,
						running,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionTime, { time }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-quick-actions",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dcu-wb-more",
							"aria-label": t("sessions.archive"),
							onClick: (event) => {
								event.stopPropagation();
								onArchive();
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuickArchiveIcon, {})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-actions",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: menuOpen,
							onClose: () => {
								onMenuChange(false);
							},
							items: menuItems,
							onSelect: onSelectAction,
							portal: true,
							dense: true,
							getAnchorRect: menuPoint === void 0 ? void 0 : () => pointerMenuRect(menuPoint.x, menuPoint.y),
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dcu-wb-more dcu-wb-context-anchor",
								"aria-label": t("sessions.actions", { name: title }),
								onClick: (event) => {
									event.stopPropagation();
									onMenuChange(!menuOpen);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconEllipsisOutlineMedium, { size: 16 })
							})
						})
					})
				]
			});
		});
		(0, react.memo)(function GroupHead({ expanded, title, icon, onToggle, actions, menuOpen }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dcu-wb-project-head${menuOpen === true ? " dcu-wb-menu-open" : ""}`,
				role: "treeitem",
				"aria-expanded": expanded,
				tabIndex: 0,
				onClick: onToggle,
				onKeyDown: (event) => {
					if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
						event.preventDefault();
						onToggle();
					}
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-folder",
						children: icon
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-project-title",
						children: title
					}),
					actions !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-actions",
						children: actions
					})
				]
			});
		});
		//#endregion
		//#region src/client/session-pending.ts
		const EMPTY_PENDING_INTERACTIONS = /* @__PURE__ */ new Map();
		const EMPTY_SESSION_STATUS = /* @__PURE__ */ new Map();
		function useEmptySessionPendingInteraction(selector) {
			return selector(EMPTY_PENDING_INTERACTIONS);
		}
		function useEmptySessionStatus(selector) {
			return selector(EMPTY_SESSION_STATUS);
		}
		function useHostSessionStatus(useSessionStatus) {
			return (useSessionStatus ?? useEmptySessionStatus)((state) => state);
		}
		/** 旧宿主订阅 pending Store；alpha.2 改走 useSessionStatus。两路都要订阅，避免条件 Hook。 */
		function useHostPendingInteractions(useSessionPendingInteraction, useSessionStatus) {
			return mergePendingInteractions((useSessionPendingInteraction ?? useEmptySessionPendingInteraction)((state) => state), (useSessionStatus ?? useEmptySessionStatus)((state) => state));
		}
		function visiblePendingKind(kind) {
			switch (kind) {
				case "approval":
				case "plan-review":
				case "question": return kind;
				default: return;
			}
		}
		/** 旧版 SessionSummary 的兼容读取；alpha.5 已将该状态迁移到独立 Store。 */
		function legacyPendingInteraction(summary) {
			if (typeof summary !== "object" || summary === null || !("pendingInteraction" in summary)) return void 0;
			return summary.pendingInteraction;
		}
		function pendingInteractionForSession(sessionId, pendingInteractions, summaryKind) {
			return visiblePendingKind(summaryKind) ?? visiblePendingKind(pendingInteractions.get(sessionId)?.kind);
		}
		//#endregion
		//#region src/client/pinned-workspaces.ts
		/** 浏览器本地持久化键；用于工作区偏好的首帧恢复与 Host 故障兜底。 */
		const PINNED_WORKSPACES_STORAGE_KEY = "dsh-codex-ui.pinned-workspace-ids";
		const WORKSPACE_GROUPS_STORAGE_KEY = "dsh-codex-ui.workspace-groups.v1";
		const WORKSPACE_PREFERENCES_ENDPOINT = CODEX_UI_API_ENDPOINTS.preferences;
		/** 清理无效或重复的工作区标识。 */
		function normalizePinnedWorkspaceIds(ids) {
			return [...new Set(ids.filter((id) => id.trim() !== ""))];
		}
		/** 仅在宿主完整基线就绪后清理已经不存在的工作区，避免加载中的临时列表抹掉持久化置顶。 */
		function prunePinnedWorkspaceIds(ids, validIds) {
			const valid = new Set(validIds);
			const next = ids.filter((id) => valid.has(id));
			return next.length === ids.length ? [...ids] : next;
		}
		/** Host 数据优先；旧 Host 或待同步分组使用本地缓存，读取期间的用户操作始终优先。 */
		function resolveWorkspacePreferencesHydration(local, host, dirty, localWorkspaceGroupsPendingHostSync = false) {
			if (dirty !== void 0) return {
				pinnedWorkspaceIds: normalizePinnedWorkspaceIds(dirty.pinnedWorkspaceIds),
				workspaceGroups: dirty.workspaceGroups,
				writeHost: true
			};
			if (host.exists) {
				const preserveLocalGroups = host.workspaceGroupsSupported === false || localWorkspaceGroupsPendingHostSync;
				return {
					pinnedWorkspaceIds: normalizePinnedWorkspaceIds(host.pinnedWorkspaceIds),
					workspaceGroups: preserveLocalGroups ? local.workspaceGroups : host.workspaceGroups,
					writeHost: localWorkspaceGroupsPendingHostSync && host.workspaceGroupsSupported !== false
				};
			}
			const pinnedWorkspaceIds = normalizePinnedWorkspaceIds(local.pinnedWorkspaceIds);
			return {
				pinnedWorkspaceIds,
				workspaceGroups: local.workspaceGroups,
				writeHost: pinnedWorkspaceIds.length > 0 || local.workspaceGroups.length > 0
			};
		}
		async function readHostWorkspacePreferences(fetcher = fetch) {
			const response = await fetcher(WORKSPACE_PREFERENCES_ENDPOINT, {
				method: "GET",
				cache: "no-store",
				signal: AbortSignal.timeout(5e3)
			});
			if (!response.ok) throw new BusinessRequestError(response.status);
			const payload = await response.json();
			if (payload === null || typeof payload !== "object") throw new Error("置顶偏好响应格式无效。");
			const record = payload;
			const workspaceGroupsSupported = Object.prototype.hasOwnProperty.call(record, "workspaceGroups");
			const workspaceGroups = workspaceGroupsSupported ? parseStoredWorkspaceGroups(record.workspaceGroups) : [];
			if (typeof record.exists !== "boolean" || !Array.isArray(record.pinnedWorkspaceIds) || !record.pinnedWorkspaceIds.every((id) => typeof id === "string") || workspaceGroups === void 0) throw new Error("置顶偏好响应格式无效。");
			return {
				exists: record.exists,
				pinnedWorkspaceIds: normalizePinnedWorkspaceIds(record.pinnedWorkspaceIds),
				workspaceGroups,
				workspaceGroupsSupported
			};
		}
		async function writeHostWorkspacePreferences(pinnedWorkspaceIds, workspaceGroups, fetcher = fetch) {
			const groups = parseStoredWorkspaceGroups([...workspaceGroups]);
			if (groups === void 0) throw new Error("工作区分组数据无效。");
			const response = await fetcher(WORKSPACE_PREFERENCES_ENDPOINT, {
				method: "PUT",
				cache: "no-store",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					pinnedWorkspaceIds: normalizePinnedWorkspaceIds(pinnedWorkspaceIds),
					workspaceGroups: groups
				}),
				signal: AbortSignal.timeout(5e3)
			});
			if (!response.ok) throw new BusinessRequestError(response.status);
		}
		/** 兼容旧调用方；新代码应同时写入分组。 */
		async function readHostPinnedWorkspaceIds(fetcher = fetch) {
			return readHostWorkspacePreferences(fetcher);
		}
		/** 在置顶列表中切换一个工作区。 */
		/** 把工作区插入置顶列表的指定位置；省略锚点时追加到末尾。 */
		function insertPinnedWorkspace(ids, id, beforeId) {
			const next = ids.filter((item) => item !== id);
			if (beforeId === void 0) return [...next, id];
			if (beforeId === id) return ids.includes(id) ? [...ids] : [...next, id];
			const index = next.indexOf(beforeId);
			next.splice(index < 0 ? next.length : index, 0, id);
			return next;
		}
		function togglePinnedWorkspace(ids, workspaceId) {
			return ids.includes(workspaceId) ? ids.filter((id) => id !== workspaceId) : [...ids, workspaceId];
		}
		/** 从浏览器本地存储读取置顶工作区；损坏数据按空列表处理。 */
		function readPinnedWorkspaceIds(storage) {
			if (storage === void 0) return [];
			try {
				const value = JSON.parse(storage.getItem("dsh-codex-ui.pinned-workspace-ids") ?? "[]");
				return Array.isArray(value) && value.every((id) => typeof id === "string") ? normalizePinnedWorkspaceIds(value) : [];
			} catch {
				return [];
			}
		}
		/** 保存置顶工作区；存储不可用时不影响导航。 */
		function savePinnedWorkspaceIds(storage, ids) {
			if (storage === void 0) return;
			try {
				storage.setItem(PINNED_WORKSPACES_STORAGE_KEY, JSON.stringify(normalizePinnedWorkspaceIds(ids)));
			} catch {}
		}
		/** 分组缓存用于首帧恢复和 Host 暂时不可用时兜底，并记录尚未完成的 Host 迁移。 */
		function readWorkspaceGroupsCache(storage) {
			if (storage === void 0) return {
				workspaceGroups: [],
				pendingHostSync: false
			};
			try {
				const value = JSON.parse(storage.getItem("dsh-codex-ui.workspace-groups.v1") ?? "{\"version\":1,\"workspaceGroups\":[],\"pendingHostSync\":false}");
				if (value === null || typeof value !== "object") return {
					workspaceGroups: [],
					pendingHostSync: false
				};
				const record = value;
				const workspaceGroups = record.version === 1 ? parseStoredWorkspaceGroups(record.workspaceGroups) : void 0;
				if (workspaceGroups === void 0 || typeof record.pendingHostSync !== "boolean") return {
					workspaceGroups: [],
					pendingHostSync: false
				};
				return {
					workspaceGroups,
					pendingHostSync: record.pendingHostSync
				};
			} catch {
				return {
					workspaceGroups: [],
					pendingHostSync: false
				};
			}
		}
		function saveWorkspaceGroupsCache(storage, groups, pendingHostSync) {
			if (storage === void 0) return;
			const workspaceGroups = parseStoredWorkspaceGroups([...groups]);
			if (workspaceGroups === void 0) return;
			try {
				storage.setItem(WORKSPACE_GROUPS_STORAGE_KEY, JSON.stringify({
					version: 1,
					workspaceGroups,
					pendingHostSync
				}));
			} catch {}
		}
		//#endregion
		//#region src/client/session-manager.ts
		const SESSION_UNREAD_STORAGE_KEY = "dsh.session-unread.v1";
		function normalizeSessionIds(ids) {
			return [...new Set(ids.filter((id) => id.trim() !== ""))];
		}
		function toggleSessionId(ids, sessionId) {
			return ids.includes(sessionId) ? ids.filter((id) => id !== sessionId) : [sessionId, ...ids.filter((id) => id !== sessionId)];
		}
		/** 返回本次刷新中结束、且不在当前会话中的后台会话。 */
		function completedBackgroundSessionIds(previous, current, currentSessionId) {
			return Object.entries(current).flatMap(([id, running]) => previous[id] === true && running !== true && id !== currentSessionId ? [id] : []);
		}
		function readSessionIds(storage, key) {
			if (storage === void 0) return [];
			try {
				const value = JSON.parse(storage.getItem(key) ?? "{\"version\":1,\"ids\":[]}");
				if (value === null || typeof value !== "object") return [];
				const ids = value.ids;
				return Array.isArray(ids) && ids.every((id) => typeof id === "string") ? normalizeSessionIds(ids) : [];
			} catch {
				return [];
			}
		}
		function writeSessionIds(storage, key, ids) {
			if (storage === void 0) return;
			try {
				storage.setItem(key, JSON.stringify({
					version: 1,
					ids: normalizeSessionIds(ids)
				}));
			} catch {}
		}
		//#endregion
		//#region src/client/hover-tip.ts
		/** 把悬停卡片限制在视口内，避免贴边裁切。 */
		function clampHoverCardPosition(left, top, width, height, viewportWidth, viewportHeight) {
			const pad = 8;
			return {
				left: Math.min(Math.max(left, pad), Math.max(pad, viewportWidth - width - pad)),
				top: Math.min(Math.max(top, pad), Math.max(pad, viewportHeight - height - pad))
			};
		}
		/** 从行元素算出卡片出现在右侧的初始坐标。 */
		function hoverCardAnchor(rect) {
			return {
				left: rect.right + 8,
				top: rect.top
			};
		}
		const HOUR = 3600;
		const DAY = HOUR * 24;
		const WEEK = DAY * 7;
		const MONTH = DAY * 30;
		const YEAR = DAY * 365;
		function formatRelativeTime(updatedAt, t, now, justNow) {
			const seconds = Math.max(0, Math.floor((now - updatedAt) / 1e3));
			if (seconds < 60) return t(justNow);
			if (seconds < HOUR) return t("time.minutes", { count: Math.floor(seconds / 60) });
			if (seconds < DAY) return t("time.hours", { count: Math.floor(seconds / HOUR) });
			if (seconds < WEEK) return t("time.days", { count: Math.floor(seconds / DAY) });
			if (seconds < MONTH) return t("time.weeks", { count: Math.floor(seconds / WEEK) });
			if (seconds < YEAR) return t("time.months", { count: Math.floor(seconds / MONTH) });
			return t("time.years", { count: Math.floor(seconds / YEAR) });
		}
		/** 悬停卡片右上角。分档与 ChatGPT `$wa` 一致；英文刚刚用 Just now。 */
		function formatHoverTime(updatedAt, t, now = Date.now()) {
			return formatRelativeTime(updatedAt, t, now, "time.justNow");
		}
		/** 会话行右侧。分档相同；英文刚刚用 now，避免挤占标题。 */
		function formatCompactTime(updatedAt, t, now = Date.now()) {
			return formatRelativeTime(updatedAt, t, now, "time.justNowShort");
		}
		//#endregion
		//#region src/client/shared-now.ts
		const SHARED_NOW_INTERVAL_MS = 6e4;
		/** 对齐到下一个整档，避免「刚刚」在整分钟边界之后还多停将近一轮。 */
		function msUntilNextNowTick(now, intervalMs = SHARED_NOW_INTERVAL_MS) {
			const remainder = now % intervalMs;
			return remainder === 0 ? intervalMs : intervalMs - remainder;
		}
		const listeners$1 = /* @__PURE__ */ new Set();
		let sharedNow = Date.now();
		let timeoutId = 0;
		let intervalId = 0;
		let cancelled = true;
		function publish(now) {
			sharedNow = now;
			for (const listener of listeners$1) listener();
		}
		function startClock() {
			cancelled = false;
			timeoutId = window.setTimeout(() => {
				if (cancelled) return;
				publish(Date.now());
				intervalId = window.setInterval(() => {
					publish(Date.now());
				}, SHARED_NOW_INTERVAL_MS);
				if (cancelled) {
					window.clearInterval(intervalId);
					intervalId = 0;
				}
			}, msUntilNextNowTick(Date.now()));
		}
		function stopClock() {
			cancelled = true;
			window.clearTimeout(timeoutId);
			window.clearInterval(intervalId);
			timeoutId = 0;
			intervalId = 0;
		}
		function subscribe(listener) {
			if (listeners$1.size === 0) {
				sharedNow = Date.now();
				startClock();
			}
			listeners$1.add(listener);
			return () => {
				listeners$1.delete(listener);
				if (listeners$1.size === 0) stopClock();
			};
		}
		function getSnapshot() {
			return sharedNow;
		}
		/** 模块级当前时刻。几棵树挂着都只走一套定时器，每分钟刷新一次。 */
		function useSharedNow() {
			return (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
		}
		//#endregion
		//#region src/client/hover-shell.tsx
		const HOVER_TIP_SHOW_DELAY_MS = 1e3;
		const WORKSPACE_HOVER_CARD_ESTIMATED_HEIGHT = 152;
		const HoverDispatchContext = (0, react.createContext)({
			showTip: () => {},
			hideTip: () => {},
			dismissTip: () => {},
			keepTip: () => {},
			isShowing: () => false
		});
		const HoverValueContext = (0, react.createContext)(void 0);
		/** 悬停状态放在独立 Provider 里，读 tip 的卡片会更新，树组件只拿稳定的 dispatch。 */
		function HoverShell({ blocked = false, children }) {
			const [hoverTip, setHoverTip] = (0, react.useState)();
			const hideTipTimer = (0, react.useRef)();
			const showTipTimer = (0, react.useRef)();
			const pendingTip = (0, react.useRef)();
			const blockedRef = (0, react.useRef)(blocked);
			blockedRef.current = blocked;
			const tipRef = (0, react.useRef)(hoverTip);
			tipRef.current = hoverTip;
			const place = (tip) => ({
				...tip,
				...clampHoverCardPosition(tip.left, tip.top, tip.kind === "workspace" ? 316 : 248, tip.kind === "workspace" ? WORKSPACE_HOVER_CARD_ESTIMATED_HEIGHT : 148, window.innerWidth, window.innerHeight)
			});
			const dispatch = (0, react.useMemo)(() => ({
				showTip: (tip, options) => {
					if (blockedRef.current) return;
					if (hideTipTimer.current !== void 0) {
						window.clearTimeout(hideTipTimer.current);
						hideTipTimer.current = void 0;
					}
					pendingTip.current = tip;
					if (options?.immediate === true || tipRef.current !== void 0) {
						if (showTipTimer.current !== void 0) {
							window.clearTimeout(showTipTimer.current);
							showTipTimer.current = void 0;
						}
						setHoverTip(place(tip));
						return;
					}
					if (showTipTimer.current !== void 0) window.clearTimeout(showTipTimer.current);
					showTipTimer.current = window.setTimeout(() => {
						showTipTimer.current = void 0;
						const next = pendingTip.current;
						if (blockedRef.current || next === void 0) return;
						setHoverTip(place(next));
					}, HOVER_TIP_SHOW_DELAY_MS);
				},
				hideTip: () => {
					pendingTip.current = void 0;
					if (showTipTimer.current !== void 0) {
						window.clearTimeout(showTipTimer.current);
						showTipTimer.current = void 0;
					}
					if (hideTipTimer.current !== void 0) window.clearTimeout(hideTipTimer.current);
					hideTipTimer.current = window.setTimeout(() => {
						setHoverTip(void 0);
					}, 120);
				},
				dismissTip: () => {
					pendingTip.current = void 0;
					if (showTipTimer.current !== void 0) {
						window.clearTimeout(showTipTimer.current);
						showTipTimer.current = void 0;
					}
					if (hideTipTimer.current !== void 0) {
						window.clearTimeout(hideTipTimer.current);
						hideTipTimer.current = void 0;
					}
					setHoverTip(void 0);
				},
				keepTip: () => {
					if (hideTipTimer.current !== void 0) {
						window.clearTimeout(hideTipTimer.current);
						hideTipTimer.current = void 0;
					}
				},
				isShowing: (kind, id) => tipRef.current?.kind === kind && tipRef.current.id === id
			}), []);
			(0, react.useEffect)(() => () => {
				if (hideTipTimer.current !== void 0) window.clearTimeout(hideTipTimer.current);
				if (showTipTimer.current !== void 0) window.clearTimeout(showTipTimer.current);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HoverDispatchContext.Provider, {
				value: dispatch,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HoverValueContext.Provider, {
					value: hoverTip,
					children
				})
			});
		}
		function useHoverDispatch() {
			return (0, react.useContext)(HoverDispatchContext);
		}
		function useHoverValue() {
			return (0, react.useContext)(HoverValueContext);
		}
		//#endregion
		//#region src/client/workspace-hover-card.tsx
		/** 只订阅悬停值，避免工作区树随鼠标移动整树重绘。 */
		function WorkspaceHoverCard({ t, onEditWorkspace, onToggleWorkspacePin }) {
			const hoverTip = useHoverValue();
			const { keepTip, hideTip, dismissTip } = useHoverDispatch();
			(0, react.useEffect)(() => {
				if (hoverTip === void 0) return;
				const onPointerDown = (event) => {
					const target = event.target;
					if (!(target instanceof Element)) return;
					if (target.closest(".dcu-wb-tip") !== null || target.closest("[data-dcu-title-folder]") !== null || target.closest(".dcu-wb-project-head") !== null) return;
					dismissTip();
				};
				window.addEventListener("pointerdown", onPointerDown, true);
				return () => {
					window.removeEventListener("pointerdown", onPointerDown, true);
				};
			}, [hoverTip, dismissTip]);
			if (hoverTip === void 0) return null;
			const workspace = hoverTip.kind === "workspace";
			const workspaceId = workspace ? hoverTip.id : void 0;
			const taskSummary = hoverTip.unreadCount !== void 0 && hoverTip.unreadCount > 0 ? t("workspace.taskSummary", {
				count: hoverTip.count ?? 0,
				unreadCount: hoverTip.unreadCount
			}) : t("workspace.taskCount", { count: hoverTip.count ?? 0 });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dcu-wb-tip${workspace ? " dcu-wb-tip-workspace" : ""}`,
				style: {
					left: hoverTip.left,
					top: hoverTip.top
				},
				onMouseEnter: keepTip,
				onMouseLeave: hideTip,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tip-title",
						children: [
							workspace && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-folder",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolderCloseMedium, { size: 16 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-tip-title-main",
								children: hoverTip.title
							}),
							workspaceId !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dcu-wb-tip-pin",
								"aria-label": t(hoverTip.pinned === true ? "workspace.unpin" : "workspace.pin"),
								onClick: () => {
									onToggleWorkspacePin(workspaceId);
									dismissTip();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, {})
							}) : hoverTip.time !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-tip-time",
								children: hoverTip.time
							})
						]
					}),
					workspace && hoverTip.count !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tip-meta",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MessageCircle, {
							"aria-hidden": "true",
							size: 16,
							strokeWidth: 1.5
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: taskSummary })]
					}),
					workspace && hoverTip.path !== void 0 && hoverTip.path !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tip-row dcu-wb-tip-path",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-folder",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolderCloseMedium, { size: 16 })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-tip-path-copy",
							children: hoverTip.path
						})]
					}),
					!workspace && hoverTip.project !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tip-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-folder",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolderCloseMedium, { size: 16 })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: hoverTip.project })]
					}),
					!workspace && hoverTip.branch !== void 0 && hoverTip.branch !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tip-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-folder",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconBranchOutlineMedium, { size: 16 })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: hoverTip.branch })]
					}),
					workspaceId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dcu-wb-tip-sep" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dcu-wb-tip-edit",
						onClick: () => {
							onEditWorkspace(workspaceId, hoverTip.title);
							dismissTip();
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconSettingsOutlineMedium, { size: 16 }), t("workspace.edit")]
					})] })
				]
			});
		}
		//#endregion
		//#region src/client/workspace-compat.ts
		function hasStartSession(value) {
			return value !== null && typeof value === "object" && "startSession" in value && typeof value.startSession === "function";
		}
		/** 旧版提供聚合字段；alpha.5 起由工作区和会话两个 Store 分别报告基线阶段。 */
		function workspaceBaselinesReady(workspaces, sessions) {
			if ("baselinesReady" in workspaces) return workspaces.baselinesReady === true;
			return "phase" in workspaces && workspaces.phase === "ready" && "phase" in sessions && sessions.phase === "ready";
		}
		//#endregion
		//#region src/client/workspace-archive.ts
		/** 按项目顺序归档会话；失败后停止，交由调用方显示并允许用户重试。 */
		async function archiveWorkspaceSessions(sessionIds, archiveSession) {
			for (const sessionId of new Set(sessionIds)) await archiveSession(sessionId);
		}
		//#endregion
		//#region src/client/workspace-drop-indicator.ts
		const ROWS = ".dcu-wb-section-head,.dcu-wb-collection-head,.dcu-wb-project-head,.dcu-wb-session,.dcu-wb-nochat,.dcu-wb-empty";
		const TARGETS = ".dcu-wb-drop,.dcu-wb-group-order-drop";
		function measureWorkspaceDropIndicator(root, onTargets) {
			const measured = Array.from(root.querySelectorAll(TARGETS)).filter((node) => node.closest("[data-open=false]") === null).map((target) => ({
				target,
				rect: measureTarget(root, target)
			})).filter((item) => item.rect !== void 0);
			const unique = measured.filter((item, index) => !measured.slice(0, index).some((previous) => previous.rect.top === item.rect.top && previous.rect.left === item.rect.left && previous.rect.width === item.rect.width));
			onTargets?.(unique.map((item) => item.target));
			return unique[0]?.rect;
		}
		function measureTarget(root, target) {
			const section = target.closest(".dcu-wb-section") ?? root;
			const rows = Array.from(section.querySelectorAll(ROWS)).filter((node) => node.closest("[data-open=false]") === null).map((node) => ({
				node,
				rect: node.getBoundingClientRect()
			})).filter((row) => row.rect.height > 0 && row.rect.width > 0);
			const owned = rows.filter((row) => row.node === target || target.contains(row.node));
			const after = target.classList.contains("dcu-wb-drop-after");
			let upper;
			let lower;
			let anchor = target.getBoundingClientRect();
			if (owned.length > 0) {
				const edge = after ? owned[owned.length - 1] : owned[0];
				const index = rows.indexOf(edge);
				anchor = edge.rect;
				upper = after ? edge.rect.bottom : rows[index - 1]?.rect.bottom;
				lower = after ? rows[index + 1]?.rect.top : edge.rect.top;
			} else if (target.matches(".dcu-wb-pin-start,.dcu-wb-pin-end")) {
				if (anchor.width <= 0 || anchor.height <= 0) return void 0;
				const itemRows = rows.filter((row) => !row.node.matches(".dcu-wb-section-head,.dcu-wb-empty,.dcu-wb-nochat"));
				if (target.matches(".dcu-wb-pin-end") && itemRows.length > 0) {
					const last = itemRows[itemRows.length - 1];
					anchor = last.rect;
					upper = last.rect.bottom;
					lower = rows.find((row) => row.rect.top >= last.rect.bottom - .5)?.rect.top;
				} else if (target.matches(".dcu-wb-pin-start") && itemRows.length > 0) {
					const first = itemRows[0];
					anchor = first.rect;
					lower = first.rect.top;
					upper = rows.filter((row) => row.rect.bottom <= first.rect.top + .5).at(-1)?.rect.bottom;
				} else {
					upper = rows.filter((row) => row.rect.bottom <= anchor.top).at(-1)?.rect.bottom;
					lower = rows.find((row) => row.rect.top >= anchor.bottom)?.rect.top;
					if (lower === void 0) lower = anchor.bottom;
					if (upper === void 0) upper = anchor.top;
				}
			} else return void 0;
			const center = upper === void 0 ? lower - 4 : lower === void 0 ? upper + 4 : (upper + lower) / 2;
			const box = root.getBoundingClientRect();
			return {
				top: center - box.top - root.clientTop + root.scrollTop - 4,
				left: anchor.left - box.left - root.clientLeft + root.scrollLeft + 4,
				width: Math.max(0, anchor.width - 12)
			};
		}
		/** 仅拖拽期间刷新，滚动、折叠动画和尺寸变化都使用当前帧的布局；结束时完整清理。 */
		function mountWorkspaceDropIndicator(root) {
			const line = root.ownerDocument.createElement("div");
			line.className = "dcu-wb-drop-indicator";
			line.setAttribute("aria-hidden", "true");
			root.append(line);
			root.dataset.dropIndicator = "measured";
			const view = root.ownerDocument.defaultView;
			let frame = 0;
			let previous = "";
			let previousConflict = [];
			const update = () => {
				const rect = measureWorkspaceDropIndicator(root, (targets) => {
					const conflict = targets.length > 1 ? targets : [];
					if (conflict.length > 1 && (conflict.length !== previousConflict.length || conflict.some((target, index) => target !== previousConflict[index]))) console.warn("Codex UI 拖拽存在多个有效落点，请检查跨区状态清理。", { count: conflict.length });
					previousConflict = conflict;
				});
				const next = rect === void 0 ? "" : `${rect.top},${rect.left},${rect.width}`;
				line.hidden = rect === void 0;
				if (rect !== void 0 && next !== previous) {
					line.style.top = `${rect.top}px`;
					line.style.left = `${rect.left}px`;
					line.style.width = `${rect.width}px`;
				}
				previous = next;
				frame = view.requestAnimationFrame(update);
			};
			update();
			return () => {
				view.cancelAnimationFrame(frame);
				line.remove();
				delete root.dataset.dropIndicator;
			};
		}
		//#endregion
		//#region src/client/CodexWorkspaceBrowser.tsx
		const DISCLOSURE_EXIT_MS = 180;
		function NewSessionIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SquarePen, {
				"aria-hidden": "true",
				size: 16,
				strokeWidth: 1.5
			});
		}
		function CreateGroupIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconProjectAddOutlineMedium, { size: 16 });
		}
		function AddWorkspaceIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Plus, {
				"aria-hidden": "true",
				size: 16,
				strokeWidth: 1.5
			});
		}
		/** 使用独立节点生成稳定的拖拽预览，避免浏览器把目标高亮和操作按钮截入默认快照。 */
		function setDragPreview(dataTransfer, title, icon) {
			const preview = document.createElement("div");
			preview.className = "dcu-wb-drag-ghost";
			if (icon !== void 0 && icon !== null) {
				const previewIcon = icon.cloneNode(true);
				previewIcon.className = "dcu-wb-drag-ghost-icon";
				previewIcon.setAttribute("aria-hidden", "true");
				preview.appendChild(previewIcon);
			}
			const previewTitle = document.createElement("span");
			previewTitle.className = "dcu-wb-drag-ghost-title";
			previewTitle.textContent = sessionTitleLine(title);
			preview.appendChild(previewTitle);
			document.body.appendChild(preview);
			preview.offsetWidth;
			dataTransfer.setDragImage(preview, 16, 15);
			window.requestAnimationFrame(() => {
				preview.remove();
			});
		}
		function animateDisclosure(body, wasOpen, open) {
			if (wasOpen === open || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return void 0;
			const height = `${body.scrollHeight}px`;
			const from = wasOpen ? {
				height,
				opacity: 1,
				transform: "translateY(0)"
			} : {
				height: "0px",
				opacity: 0,
				transform: "translateY(-2px)"
			};
			const to = open ? {
				height,
				opacity: 1,
				transform: "translateY(0)"
			} : {
				height: "0px",
				opacity: 0,
				transform: "translateY(-2px)"
			};
			return body.animate([from, to], {
				duration: DISCLOSURE_EXIT_MS,
				easing: "cubic-bezier(.16, 1, .3, 1)",
				fill: "none"
			});
		}
		/** 所有可折叠层级使用同一套原生高度动画，兼容宿主内核对 auto 高度过渡的差异。 */
		function DisclosureBody({ className, children, open }) {
			const bodyRef = (0, react.useRef)(null);
			const previousOpen = (0, react.useRef)(open);
			(0, react.useLayoutEffect)(() => {
				const body = bodyRef.current;
				if (body === null) return;
				body.inert = !open;
				const animation = animateDisclosure(body, previousOpen.current, open);
				previousOpen.current = open;
				return () => {
					animation?.cancel();
				};
			}, [open]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: bodyRef,
				className,
				"data-open": open,
				"aria-hidden": !open,
				children
			});
		}
		/** 顶层分区使用已有结构，通过统一监听器复用与项目、分组一致的原生动画。 */
		function useSectionDisclosureMotion(rootRef) {
			const previousOpen = (0, react.useRef)(/* @__PURE__ */ new WeakMap());
			(0, react.useLayoutEffect)(() => {
				const bodies = rootRef.current?.querySelectorAll(".dcu-wb-section-body") ?? [];
				for (const body of bodies) {
					const open = body.dataset.open === "true";
					const previous = previousOpen.current.get(body);
					previousOpen.current.set(body, open);
					body.inert = !open;
					if (previous !== void 0) animateDisclosure(body, previous, open);
				}
			});
		}
		function sameWorkspaceDropTarget(left, right) {
			if (left === void 0 || right === void 0) return left === right;
			if (left.zone !== right.zone) return false;
			if (left.zone === "group" && right.zone === "group") return left.groupId === right.groupId && left.beforeId === right.beforeId && left.ontoGroup === right.ontoGroup && left.crossGroup === right.crossGroup;
			if (left.zone === "ungrouped" && right.zone === "ungrouped") return left.beforeId === right.beforeId && left.ontoSection === right.ontoSection && left.crossGroup === right.crossGroup;
			return "beforeId" in left && "beforeId" in right && left.beforeId === right.beforeId;
		}
		function sameWorkspaceGroups(left, right) {
			return left.length === right.length && left.every((group, index) => group.id === right[index]?.id && group.title === right[index]?.title && sameIds(group.workspaceIds, right[index]?.workspaceIds ?? []));
		}
		function newWorkspaceGroupId() {
			if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `group-${crypto.randomUUID()}`;
			return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
		}
		function workspaceGroupMoveActionId(groupId) {
			return `moveWorkspaceToGroup:${groupId ?? ""}`;
		}
		const stylesheet = `
.dcu-wb{--dcu-wb-inset:8px;display:flex;flex:1;min-height:0;flex-direction:column;padding:4px var(--dcu-wb-inset) 8px;color:var(--dcu-sidebar-primary)}
.dcu-wb *{box-sizing:border-box}
.dcu-wb-tree{flex:1;min-height:0;overflow-x:hidden;overflow-y:auto;padding-bottom:16px;scrollbar-gutter:auto;scrollbar-width:none;user-select:none;-webkit-user-select:none}
.dcu-wb-tree::-webkit-scrollbar{display:none}
.dcu-wb-section+.dcu-wb-section{margin-top:12px}
.dcu-wb-section-head{position:relative;display:flex;align-items:center;min-height:24px;padding:0;border-radius:6px}.dcu-wb-section-head:hover .dcu-wb-actions{display:flex}.dcu-wb-section-label{position:relative;display:flex;align-items:center;gap:4px;flex:1;min-width:0;min-height:24px;border:0;padding:2px 4px 2px 12px;background:transparent;color:var(--dcu-sidebar-tertiary);font:13px/20px var(--dsw-font-family);font-weight:400;letter-spacing:0;text-align:left;cursor:pointer}.dcu-wb-section-caret{display:grid;place-items:center;flex:none;width:12px;height:12px;color:currentColor;opacity:0;transform:rotate(0deg);transform-origin:50% 50%;transition:opacity 120ms ease,transform 160ms ease}.dcu-wb-section-head .dcu-wb-section-caret{position:absolute;left:0;top:6px}.dcu-wb-section-caret svg{display:block}.dcu-wb-section-head:hover .dcu-wb-section-caret,.dcu-wb-section-label:focus-visible .dcu-wb-section-caret{opacity:.78}.dcu-wb-section-label[aria-expanded=true] .dcu-wb-section-caret{transform:rotate(90deg)}.dcu-wb-section-body{display:block}.dcu-wb-section-body[data-open=false]{display:none}.dcu-wb-section-body>div{min-height:0}.dcu-wb-section-body[data-open=true]>div{animation:dcu-wb-section-in 140ms cubic-bezier(.16,1,.3,1)}@keyframes dcu-wb-section-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.dcu-wb-section-caret{transition:none}.dcu-wb-section-body[data-open=true]>div{animation:none}}
.dcu-wb-project{position:relative;min-width:0}
.dcu-wb-collection-head .dcu-wb-more{opacity:0;pointer-events:none}
.dcu-wb-collection-head:hover .dcu-wb-more,.dcu-wb-collection-head:focus-within .dcu-wb-more,.dcu-wb-collection-head .dcu-wb-more[aria-expanded=true]{opacity:1;pointer-events:auto}
@media (pointer:coarse){.dcu-wb-collection-head .dcu-wb-more{opacity:1;pointer-events:auto}}
.dcu-wb-collection-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcu-wb-collection-actions{flex-shrink:0;width:20px}
.dcu-wb-collections{display:grid;min-width:0;gap:4px}.dcu-wb-collection,.dcu-wb-ungrouped{position:relative;min-width:0;overflow:visible}.dcu-wb-collection-head{display:flex;align-items:center;min-height:28px;padding:0 4px;border-radius:6px;transition:background 120ms ease}.dcu-wb-collection-head:hover,.dcu-wb-collection-head:focus-within,.dcu-wb-collection-head.dcu-wb-group-drop{background:var(--dcu-sidebar-hover)}.dcu-wb-collection-head.dcu-wb-group-drop{outline:1px solid var(--dsw-alias-state-business-primary)}.dcu-wb-collection-head[draggable=true],.dcu-wb-collection-head[draggable=true] .dcu-wb-collection-label{cursor:grab}.dcu-wb-collection-head[draggable=true]:active,.dcu-wb-collection-head[draggable=true]:active .dcu-wb-collection-label{cursor:grabbing}.dcu-wb-collection-label{display:flex;align-items:center;gap:5px;min-width:0;flex:1;border:0;padding:4px;background:transparent;color:var(--dcu-sidebar-primary);font:13px/20px var(--dsw-font-family);text-align:left;cursor:pointer}.dcu-wb-collection-label .dcu-wb-section-caret{position:static;order:-1;opacity:.78}.dcu-wb-collection-label[aria-expanded=true] .dcu-wb-section-caret{transform:rotate(90deg)}.dcu-wb-collection-count{margin-left:auto;color:var(--dcu-sidebar-secondary);font-variant-numeric:tabular-nums}.dcu-wb-collection-body{position:relative;min-width:0;padding-left:12px}.dcu-wb-collection-body::before{content:"";position:absolute;left:31px;top:0;bottom:8px;width:1px;background:var(--dcu-sidebar-border)}.dcu-wb-group-member{position:relative}.dcu-wb-group-member.dcu-wb-drop::before,.dcu-wb-collection.dcu-wb-group-order-drop::before,.dcu-wb-ungrouped.dcu-wb-group-order-drop::before{content:"";position:absolute;z-index:2;left:7px;right:8px;top:-8px;height:8px;pointer-events:none;background:radial-gradient(circle at 4px 50%,transparent 1.75px,var(--dsw-alias-state-business-primary) 2px 3.75px,transparent 4px),linear-gradient(var(--dsw-alias-state-business-primary),var(--dsw-alias-state-business-primary)) 10px 50%/calc(100% - 10px) 2px no-repeat}.dcu-wb-group-member.dcu-wb-drop-after::before{top:auto;bottom:-8px}.dcu-wb-collection-body .dcu-wb-project-head{padding-left:12px}
.dcu-wb-collection.dcu-wb-workspace-move-drop,.dcu-wb-ungrouped.dcu-wb-workspace-move-drop{border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 9%,transparent);outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dcu-wb-project-head,.dcu-wb-session{position:relative;display:flex;align-items:center;gap:6px;width:100%;min-width:0;border-radius:10px;padding:0 8px;color:var(--dcu-sidebar-primary);cursor:pointer}
.dcu-wb-collection-body::before{left:calc(4px + 4px + 6px)}
.dcu-wb-project-head{height:30px;background:transparent;font:inherit;text-align:left}
.dcu-wb-project-head:hover,.dcu-wb-project-head.dcu-wb-menu-open,.dcu-wb-session:hover,.dcu-wb-session.dcu-wb-selected,.dcu-wb-session.dcu-wb-menu-open{background:var(--dcu-sidebar-hover)}.dcu-wb-project.dcu-wb-session-drop>.dcu-wb-project-head{border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 9%,transparent);outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.dcu-wb-project-body>.dcu-wb-session:first-child,.dcu-wb-project-body>.dcu-wb-nochat:first-child{margin-top:4px}.dcu-wb-session+.dcu-wb-session{margin-top:2px}
.dcu-wb-project-head[draggable=true],.dcu-wb-session[draggable=true]{cursor:grab}
.dcu-wb-project-head[draggable=true]:active,.dcu-wb-session[draggable=true]:active{cursor:grabbing}
.dcu-wb-section,.dcu-wb-section:focus,.dcu-wb-section:focus-visible,.dcu-wb-project-head:focus,.dcu-wb-session:focus{outline:0}.dcu-wb-pinned-list{position:relative}.dcu-wb-pin-end,.dcu-wb-pin-start{position:absolute;left:0;right:0;height:8px;z-index:2;pointer-events:none}.dcu-wb-pin-end.dcu-wb-drop,.dcu-wb-pin-start.dcu-wb-drop{pointer-events:auto}.dcu-wb-pin-start{top:0}.dcu-wb-pin-end{bottom:-8px}.dcu-wb-project.dcu-wb-drop::before,.dcu-wb-session.dcu-wb-drop::before,.dcu-wb-pin-end.dcu-wb-drop::before,.dcu-wb-pin-start.dcu-wb-drop::before{content:"";position:absolute;z-index:2;left:7px;right:8px;top:-8px;height:8px;pointer-events:none;background:radial-gradient(circle at 4px 50%,transparent 1.75px,var(--dsw-alias-state-business-primary) 2px 3.75px,transparent 4px),linear-gradient(var(--dsw-alias-state-business-primary),var(--dsw-alias-state-business-primary)) 10px 50%/calc(100% - 10px) 2px no-repeat}.dcu-wb-pin-start.dcu-wb-drop::before{top:0}.dcu-wb-pinned-list>.dcu-wb-project:first-child.dcu-wb-drop::before{top:-4px}.dcu-wb-project.dcu-wb-drop-after::before,.dcu-wb-session.dcu-wb-drop-after::before{top:auto;bottom:-8px}.dcu-wb-dragging{opacity:.28}.dcu-wb-drag-ghost{position:fixed;top:8px;left:-9999px;z-index:10040;display:flex;align-items:center;gap:8px;max-width:220px;height:30px;padding:0 10px;border:1px solid var(--dcu-sidebar-border);border-radius:8px;background:var(--dcu-sidebar-hover);box-shadow:0 4px 12px rgba(0,0,0,.24);color:var(--dcu-sidebar-primary);font:14px/20px var(--dsw-font-family);white-space:nowrap;pointer-events:none}.dcu-wb-drag-ghost-icon{display:grid;place-items:center;flex:none;width:16px;height:16px;color:var(--dcu-sidebar-icon)}.dcu-wb-drag-ghost-icon svg{display:block;width:16px;height:16px}.dcu-wb-drag-ghost-title{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dcu-wb-folder{display:grid;place-items:center;flex:none;width:16px;height:20px;color:var(--dcu-sidebar-icon)}.dcu-wb-folder.dcu-wb-folder-current{color:var(--dsw-alias-state-business-primary)}.dcu-wb-brand{display:block;width:16px;height:16px}
.dcu-wb-project-title,.dcu-wb-session-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px}
.dcu-wb-project-title{flex:1;font-weight:400;color:var(--dcu-sidebar-primary)}
.dcu-wb-session{position:relative;min-width:0;min-height:30px;gap:0;overflow:hidden;padding-left:30px;padding-right:28px}
.dcu-wb-session-title{flex:1;margin-left:0}.dcu-wb-session-title-text{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media (prefers-reduced-motion:no-preference){.dcu-wb-session:hover .dcu-wb-session-title[data-overflow] .dcu-wb-session-title-text,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-session-title[data-overflow] .dcu-wb-session-title-text{display:inline-block;width:max-content;max-width:none;overflow:visible;text-overflow:clip;animation:dcu-wb-title-scroll var(--dcu-title-duration,2.4s) linear 320ms infinite alternate}}@keyframes dcu-wb-title-scroll{0%,18%{transform:translateX(0)}82%,100%{transform:translateX(calc(-1 * var(--dcu-title-shift,0px)))}}.dcu-wb-session-time{position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--dcu-sidebar-tertiary);font-size:12px;line-height:18px;font-weight:400;font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:none}.dcu-wb-session:has(.dcu-wb-session-time){padding-right:64px}.dcu-wb-session:has(.dcu-wb-unread) .dcu-wb-session-time{right:22px}.dcu-wb-session:has(.dcu-wb-unread):has(.dcu-wb-session-time){padding-right:78px}.dcu-wb-session-copy{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}.dcu-wb-session-sub{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dcu-sidebar-tertiary);font-size:12px;line-height:16px}.dcu-wb-session-flat,.dcu-wb-session-top{padding-left:8px}.dcu-wb-session-flat:has(.dcu-wb-running),.dcu-wb-session-top:has(.dcu-wb-running){padding-left:30px}
.dcu-wb-actions{display:none;align-items:center;gap:8px;flex:none}
.dcu-wb-quick-actions{position:absolute;right:8px;top:50%;display:flex;align-items:center;gap:2px;opacity:0;pointer-events:none;transform:translateY(-50%);background:var(--dcu-sidebar-hover);border-radius:6px}
.dcu-wb-project-head:hover .dcu-wb-actions,.dcu-wb-project-head.dcu-wb-menu-open .dcu-wb-actions,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-actions{display:flex}
.dcu-wb-session:hover .dcu-wb-quick-actions,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-quick-actions{opacity:1;pointer-events:auto}.dcu-wb-session:hover .dcu-wb-pending,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-pending,.dcu-wb-session:hover .dcu-wb-unread,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-unread,.dcu-wb-session:hover .dcu-wb-session-time,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-session-time{visibility:hidden}.dcu-wb-session:has(.dcu-wb-pending) .dcu-wb-session-time{display:none}
.dcu-wb-more{display:grid;place-items:center;width:20px;height:20px;border:0;border-radius:4px;padding:0;background:transparent;color:var(--dcu-sidebar-tertiary);cursor:pointer}
.dcu-wb-more:hover{color:var(--dcu-sidebar-primary)}
.dcu-wb-context-anchor{opacity:0;pointer-events:none}
.dcu-wb-tip{position:fixed;z-index:10050;min-width:220px;max-width:280px;padding:10px 12px;border:1px solid var(--dcu-sidebar-border);border-radius:12px;background:var(--dcu-tip-bg,#fff);box-shadow:var(--dcu-tip-shadow,0 8px 28px rgba(31,39,36,.16));color:var(--dcu-sidebar-primary);animation:dcu-tip-in 180ms cubic-bezier(.16,1,.3,1)}.dcu-wb-tip-workspace{width:316px;min-width:0;max-width:calc(100vw - 16px);padding:10px 8px 8px}@keyframes dcu-tip-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.dcu-wb-tip{animation:none}}.dcu-wb-tip-title{display:flex;align-items:center;gap:6px;min-width:0;min-height:20px;font-size:14px;line-height:20px;font-weight:500}.dcu-wb-tip-title-main{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-tip-time{flex:none;margin-left:auto;color:var(--dcu-sidebar-tertiary);font-size:12px;line-height:18px;font-weight:400}.dcu-wb-tip-pin{display:grid;place-items:center;flex:none;width:20px;height:20px;border:0;border-radius:4px;padding:0;background:transparent;color:var(--dcu-sidebar-tertiary);cursor:pointer}.dcu-wb-tip-pin:hover{background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary)}.dcu-wb-tip-meta,.dcu-wb-tip-row{display:flex;align-items:center;gap:6px;min-width:0;margin-top:4px;color:var(--dcu-sidebar-secondary);font-size:14px;line-height:20px}.dcu-wb-tip-meta svg,.dcu-wb-tip-row svg{flex:none}.dcu-wb-tip-row>span:not(.dcu-wb-folder){min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-tip-path{align-items:flex-start;margin-top:8px}.dcu-wb-tip-path-copy{min-width:0;overflow-wrap:anywhere;white-space:normal}.dcu-wb-tip-sep{height:1px;margin:8px 0 4px;background:var(--dcu-sidebar-border)}.dcu-wb-tip-edit{display:flex;align-items:center;gap:6px;width:100%;min-height:24px;border:0;padding:2px 0;background:transparent;color:var(--dcu-sidebar-primary);font:14px/20px var(--dsw-font-family);text-align:left;cursor:pointer}.dcu-wb-tip-edit svg{flex:none;color:var(--dcu-sidebar-secondary)}
.dcu-wb-session:has(.dcu-wb-pending){padding-right:112px}.dcu-wb-unread{position:absolute;right:13px;top:50%;width:7px;height:7px;margin:-3.5px 0 0;border-radius:50%;background:var(--dsw-alias-state-business-primary)}
.dcu-wb-pending{position:absolute;right:10px;top:50%;display:flex;align-items:center;gap:4px;max-width:88px;margin:0;transform:translateY(-50%);color:var(--dsw-alias-state-warn-label,#b45309);font-size:11px;line-height:16px;white-space:nowrap}.dcu-wb-pending-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-warn-primary,#f59e0b)}.dcu-wb-pending-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dcu-wb-empty{padding:14px 8px;color:var(--dcu-sidebar-tertiary);font-size:13px}
.dcu-wb-error{margin:4px 0;padding:6px 8px;border-radius:6px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px}
.dcu-wb-rail{display:none}
.dcu-wb-rename-actions{display:flex;justify-content:flex-end;gap:8px}
.dcu-wb-delete-button{color:var(--dsw-alias-state-error-primary)!important}
.dcu-wb-delete-copy{margin:0;color:var(--dcu-sidebar-secondary);font-size:13px;line-height:20px}
.dcu-wb-move-target{display:flex;min-width:0;align-items:center;gap:8px;margin-top:4px;color:var(--dcu-sidebar-primary);font:14px/20px var(--dsw-font-family)}.dcu-wb-move-target svg{flex:none;color:var(--dcu-sidebar-secondary)}.dcu-wb-move-target-copy{min-width:0}.dcu-wb-move-project,.dcu-wb-move-path{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-move-path{color:var(--dcu-sidebar-tertiary);font-size:12px}
.dcu-wb-rename-input{box-sizing:border-box;width:100%;height:36px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:7px 10px;outline:0;background:var(--dsw-alias-background-secondary);color:var(--dsw-alias-label-primary);font:14px/20px var(--dsw-font-family);caret-color:var(--dsw-alias-state-business-primary);transition:border-color 120ms ease,box-shadow 120ms ease}
.dcu-wb-rename-input:hover{border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 32%,var(--dsw-alias-border-l2))}
.dcu-wb-rename-input:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-state-business-primary) 28%,transparent)}
`;
		const runningStyles = `.dcu-wb-running{position:absolute;left:8px;top:50%;display:grid;place-items:center;flex:none;width:16px;height:20px;margin-top:-10px;border:0;background:transparent}.dcu-wb-running::after{content:"";box-sizing:border-box;width:12px;height:12px;border:2px solid color-mix(in srgb,var(--dcu-sidebar-secondary) 25%,transparent);border-top-color:var(--dcu-sidebar-secondary);border-radius:50%;animation:dcu-wb-spin .8s linear infinite}@keyframes dcu-wb-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.dcu-wb-running::after{animation:none}}`;
		const typographyStyles = `.dcu-wb{--dcu-wb-disclosure-duration:180ms;--dcu-wb-disclosure-ease:cubic-bezier(.16,1,.3,1);font:14px/20px var(--dsw-font-family)}.dcu-wb-section-label{color:var(--dcu-sidebar-secondary);font:13px/20px var(--dsw-font-family);font-weight:400;letter-spacing:0;padding-left:0}.dcu-wb-section-caret{transition:opacity var(--dcu-wb-disclosure-duration) var(--dcu-wb-disclosure-ease),transform var(--dcu-wb-disclosure-duration) var(--dcu-wb-disclosure-ease)}.dcu-wb-section-head .dcu-wb-section-caret{position:static;left:auto;top:auto;opacity:.78}.dcu-wb-section-body,.dcu-wb-project-body,.dcu-wb-collection-body{display:block;min-height:0;height:auto;overflow:clip;opacity:1;transform:none;visibility:visible}.dcu-wb-section-body[data-open=false],.dcu-wb-project-body[data-open=false],.dcu-wb-collection-body[data-open=false]{display:block;height:0;opacity:0;transform:translateY(-2px);pointer-events:none}.dcu-wb-section-body[data-open=true]:has(.dcu-wb-drop),.dcu-wb-project-body[data-open=true]:has(.dcu-wb-drop),.dcu-wb-collection-body[data-open=true]:has(.dcu-wb-drop){overflow:visible}.dcu-wb-section-body[data-open=true]>div{animation:none}@media (prefers-reduced-motion:reduce){.dcu-wb-section-caret{transition:none}}.dcu-wb-project-title{font-size:14px;line-height:20px;font-weight:400;color:var(--dcu-sidebar-primary)}.dcu-wb-session-title{font-size:14px;line-height:20px;font-weight:400;color:var(--dcu-sidebar-secondary)}.dcu-wb-session.dcu-wb-selected .dcu-wb-session-title,.dcu-wb-session:hover .dcu-wb-session-title{color:var(--dcu-sidebar-primary)}.dcu-wb-empty{color:var(--dcu-sidebar-tertiary);font-size:13px;line-height:18px}`;
		const collectionLayoutStyles = `
.dcu-wb-tree{position:relative}
.dcu-wb-tree[data-drop-indicator=measured] .dcu-wb-drop::before,.dcu-wb-tree[data-drop-indicator=measured] .dcu-wb-group-order-drop::before{display:none}
.dcu-wb-drop-indicator{position:absolute;z-index:3;height:8px;pointer-events:none;color:var(--dsw-alias-state-business-primary)}
.dcu-wb-drop-indicator::before{content:"";position:absolute;left:6px;right:0;top:3px;height:2px;border-radius:999px;background:currentColor}
.dcu-wb-drop-indicator::after{content:"";position:absolute;box-sizing:border-box;left:0;top:0;width:8px;height:8px;border:2px solid currentColor;border-radius:50%}
.dcu-wb-project-body:has(>.dcu-wb-session)::after{content:"";display:block;height:4px;pointer-events:none}
.dcu-wb-section-body[data-open=true]:has(.dcu-wb-group-order-drop),.dcu-wb-section-body[data-open=true]:has(.dcu-wb-pin-end),.dcu-wb-section-body[data-open=true]:has(.dcu-wb-pin-start){overflow:visible}
.dcu-wb-collection-body{padding-left:0}
.dcu-wb-collection-body>.dcu-wb-group-member:first-child{padding-top:4px}
.dcu-wb-collection-body .dcu-wb-project-head{padding-left:8px}
.dcu-wb-collection-body>.dcu-wb-empty{padding:8px 8px 8px 26px}
.dcu-wb-collection-body>.dcu-wb-empty,.dcu-wb-nochat{font-size:13px;line-height:18px;color:var(--dcu-sidebar-tertiary)}
.dcu-wb-nochat{padding:1px 8px 5px 30px}
.dcu-wb-session-more{display:flex;gap:4px;padding:2px 8px 2px 30px}
.dcu-wb-session-more button{height:28px;border:0;border-radius:8px;padding:0 8px;background:transparent;color:var(--dcu-sidebar-tertiary);font:13px/20px var(--dsw-font-family);cursor:pointer}
.dcu-wb-session-more button:hover{color:var(--dcu-sidebar-secondary)}
.dcu-wb-collection:has(+.dcu-wb-collection)>.dcu-wb-collection-body>.dcu-wb-empty,.dcu-wb-collection:has(+.dcu-wb-ungrouped)>.dcu-wb-collection-body>.dcu-wb-empty{padding-top:14px;padding-bottom:2px}
.dcu-wb-collection-body::before,.dcu-wb-group-member::after{display:none}
.dcu-wb-collections{gap:12px}
.dcu-wb-collections:has(>.dcu-wb-project){gap:0}
.dcu-wb-collection-head{min-height:32px}
.dcu-wb-collection-head:hover{background:var(--dcu-sidebar-hover)}
.dcu-wb-collection-head.dcu-wb-group-drop{background:var(--dcu-sidebar-hover)}
.dcu-wb-collection-head{background:color-mix(in srgb,var(--dcu-sidebar-hover) 55%,transparent)}
.dcu-wb-collection-label{gap:4px;min-height:32px;font-size:14px;font-weight:600}
.dcu-wb-collection-label .dcu-wb-section-caret{width:14px;height:14px;opacity:1;color:var(--dcu-sidebar-primary)}
.dcu-wb-collection-label .dcu-wb-section-caret svg{width:14px;height:14px}
.dcu-wb-collection-label .dcu-wb-section-caret svg path{stroke-width:2}
.dcu-wb-collection-count{flex:none;font-size:12px;font-weight:400;padding-left:8px}
.dcu-wb-ungrouped .dcu-wb-collection-label{color:var(--dcu-sidebar-secondary)}
.dcu-wb-collection-head:focus-within,.dcu-wb-collection-head:has(.dcu-wb-more[aria-expanded=true]){background:var(--dcu-sidebar-hover)}
.dcu-wb-workspace-move-drop>.dcu-wb-collection-head{background:transparent}
.dcu-wb-collection-label:focus-visible,.dcu-wb-project-head:focus-visible,.dcu-wb-session:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px;border-radius:6px}
@media (pointer:coarse){.dcu-wb-collection-head,.dcu-wb-collection-label{min-height:36px}.dcu-wb-collection-actions{width:28px}.dcu-wb-collection-actions .dcu-wb-more{width:28px;height:28px}}
`;
		stylesheet + runningStyles + typographyStyles + collectionLayoutStyles;
		function storage() {
			return browserStorage$1();
		}
		function sameIds(left, right) {
			return left.length === right.length && left.every((id, index) => id === right[index]);
		}
		function optionalText(value, key) {
			if (!(key in value)) return void 0;
			const next = value[key];
			return typeof next === "string" && next !== "" ? next : void 0;
		}
		/** 插件自有的工作区树：复刻原生层级和拖拽行为，并在每个会话菜单中增加管理操作。 */
		const noSubscription = () => () => {};
		const noBindings = () => void 0;
		const emptyShortcutRows = [];
		const noShortcuts = () => emptyShortcutRows;
		function CodexWorkspaceBrowser(props) {
			const snapshot = (0, react.useSyncExternalStore)(props.workspaceShortcuts?.subscribe ?? noSubscription, props.workspaceShortcuts?.getSnapshot ?? noBindings);
			const catalog = snapshot?.bindings?.hooks.shortcuts;
			const shortcuts = (0, react.useSyncExternalStore)(catalog?.subscribe ?? noSubscription, catalog?.getSnapshot ?? noShortcuts);
			const requestAddWorkspace = props.workspaceShortcuts ? snapshot?.bindings?.requestAddWorkspace : props.requestAddWorkspace;
			const addWorkspaceShortcutAria = shortcuts.find((row) => row.id === "workspace.add")?.aria ?? props.addWorkspaceShortcutAria;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HoverShell, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CodexWorkspaceTree, {
				...props,
				requestAddWorkspace,
				addWorkspaceShortcutAria
			}) });
		}
		function CodexWorkspaceTree({ wide, useSessions, useSessionPendingInteraction, useSessionStatus, useWorkspaces, t, archiveSession, deleteSession, deleteWorkspace, forkSession, insertSessionBefore, insertWorkspaceBefore, openSession, renameSession, renameWorkspace, startSession, canDeleteSession, panelActive = false, requestAddWorkspace, addWorkspaceShortcutAria }) {
			const sessions = useSessions((state) => state);
			const now = useSharedNow();
			const pendingInteractions = useHostPendingInteractions(useSessionPendingInteraction, useSessionStatus);
			const sessionStatus = useHostSessionStatus(useSessionStatus);
			const selectedId = visibleSelectedSessionId(sessions, panelActive);
			const workspaces = useWorkspaces((state) => state);
			const baselinesReady = workspaceBaselinesReady(workspaces, sessions);
			const [expanded, setExpanded] = (0, react.useState)(() => readTreeExpansionState(storage(), WORKSPACE_EXPANSION_STORAGE_KEY));
			const [sessionWindows, setSessionWindows] = (0, react.useState)({});
			const revealMoreSessions = (workspaceId) => {
				setSessionWindows((current) => ({
					...current,
					[workspaceId]: nextProjectSessionWindow(current[workspaceId])
				}));
			};
			const [pinnedWorkspaceIds, setPinnedWorkspaceIdsState] = (0, react.useState)(() => readPinnedWorkspaceIds(storage()));
			const initialWorkspaceGroups = (0, react.useMemo)(() => readWorkspaceGroupsCache(storage()), []);
			const [workspaceGroups, setWorkspaceGroupsState] = (0, react.useState)(() => initialWorkspaceGroups.workspaceGroups);
			const pinnedWorkspaceIdsRef = (0, react.useRef)(pinnedWorkspaceIds);
			pinnedWorkspaceIdsRef.current = pinnedWorkspaceIds;
			const workspaceGroupsRef = (0, react.useRef)(workspaceGroups);
			workspaceGroupsRef.current = workspaceGroups;
			const workspaceGroupsPendingHostSyncRef = (0, react.useRef)(initialWorkspaceGroups.pendingHostSync);
			const pinnedHostSupportsWorkspaceGroupsRef = (0, react.useRef)(false);
			const pinnedHostHydratedRef = (0, react.useRef)(false);
			const pinnedHostDirtyRef = (0, react.useRef)(false);
			const pinnedHostSkipWriteRef = (0, react.useRef)();
			const pinnedHostWriteRef = (0, react.useRef)(Promise.resolve());
			const [preferencesFailure, setPreferencesFailure] = (0, react.useState)();
			const workspaceBaselineRef = (0, react.useRef)({
				ready: false,
				validIds: []
			});
			workspaceBaselineRef.current = {
				ready: baselinesReady,
				validIds: workspaces.items.map((workspace) => String(workspace.workspaceId))
			};
			const queuePinnedHostWrite = (ids, groups) => {
				const snapshot = {
					pinnedWorkspaceIds: [...ids],
					workspaceGroups: groups.map((group) => ({
						...group,
						workspaceIds: [...group.workspaceIds]
					}))
				};
				const pending = pinnedHostWriteRef.current.then(async () => {
					await writeHostWorkspacePreferences(snapshot.pinnedWorkspaceIds, snapshot.workspaceGroups);
					setPreferencesFailure(void 0);
					if (!pinnedHostSupportsWorkspaceGroupsRef.current) return;
					if (!sameIds(pinnedWorkspaceIdsRef.current, snapshot.pinnedWorkspaceIds) || !sameWorkspaceGroups(workspaceGroupsRef.current, snapshot.workspaceGroups)) return;
					workspaceGroupsPendingHostSyncRef.current = false;
					saveWorkspaceGroupsCache(storage(), snapshot.workspaceGroups, false);
				});
				pinnedHostWriteRef.current = pending.catch((reason) => {
					setPreferencesFailure(reason);
				});
			};
			const setPinnedWorkspaceIds = (update) => {
				pinnedHostDirtyRef.current = true;
				const current = pinnedWorkspaceIdsRef.current;
				const next = typeof update === "function" ? update(current) : update;
				pinnedWorkspaceIdsRef.current = next;
				setPinnedWorkspaceIdsState(next);
			};
			const setWorkspaceGroups = (update) => {
				const current = workspaceGroupsRef.current;
				const next = typeof update === "function" ? update(current) : update;
				pinnedHostDirtyRef.current = true;
				workspaceGroupsPendingHostSyncRef.current = true;
				workspaceGroupsRef.current = next;
				setWorkspaceGroupsState(next);
			};
			const [unreadSessionIds, setUnreadSessionIds] = (0, react.useState)(() => readSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY));
			const rowUnread = (id) => sessionRowUnread(unreadSessionIds.includes(id), sessionStatus.get(id), selectedId === id);
			const rowRunning = (id, session) => sessionIsRunning(session ?? sessions.byId[id], sessionStatus.get(id));
			const previousSessionRunningRef = (0, react.useRef)();
			const [menu, setMenu] = (0, react.useState)();
			const [renameTarget, setRenameTarget] = (0, react.useState)();
			const [deleteTarget, setDeleteTarget] = (0, react.useState)();
			const [archiveWorkspaceTarget, setArchiveWorkspaceTarget] = (0, react.useState)();
			const { showTip: publishTip, hideTip, dismissTip, isShowing } = useHoverDispatch();
			const showTip = (tip, options) => {
				if (menu !== void 0) return;
				publishTip(tip, options);
			};
			const [renameDraft, setRenameDraft] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)();
			const busyRef = (0, react.useRef)();
			const [error, setError] = (0, react.useState)();
			const [workspaceDragId, setWorkspaceDragId] = (0, react.useState)();
			const [workspaceDropTarget, setWorkspaceDropTargetState] = (0, react.useState)();
			const [workspaceGroupDragId, setWorkspaceGroupDragId] = (0, react.useState)();
			const [workspaceGroupDropTarget, setWorkspaceGroupDropTargetState] = (0, react.useState)();
			const setWorkspaceGroupDropTarget = (target) => {
				setWorkspaceGroupDropTargetState((current) => {
					if (current === void 0 || target === void 0) return current === target ? current : target;
					return current.beforeId === target.beforeId ? current : target;
				});
			};
			const workspaceDropTargetRef = (0, react.useRef)();
			const setWorkspaceDropTarget = (target) => {
				if (sameWorkspaceDropTarget(workspaceDropTargetRef.current, target)) return;
				workspaceDropTargetRef.current = target;
				setWorkspaceDropTargetState(target);
			};
			const [headerMenu, setHeaderMenu] = (0, react.useState)();
			const headerMenuRef = (0, react.useRef)();
			headerMenuRef.current = headerMenu;
			(0, react.useRef)(0);
			const [sessionDrag, setSessionDrag] = (0, react.useState)();
			const [sessionDropTarget, setSessionDropTarget] = (0, react.useState)();
			const [createGroupOpen, setCreateGroupOpen] = (0, react.useState)(false);
			const [groupTitleDraft, setGroupTitleDraft] = (0, react.useState)("");
			const [deleteGroupId, setDeleteGroupId] = (0, react.useState)();
			const [groupMenuId, setGroupMenuId] = (0, react.useState)();
			const [renameGroupId, setRenameGroupId] = (0, react.useState)();
			const [renameGroupDraft, setRenameGroupDraft] = (0, react.useState)("");
			const [renameGroupError, setRenameGroupError] = (0, react.useState)();
			const groupActionTriggerRef = (0, react.useRef)();
			const projectsSectionButtonRef = (0, react.useRef)(null);
			const lastRevealedSessionIdRef = (0, react.useRef)();
			const pendingRevealScrollRef = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				writeTreeExpansionState(storage(), WORKSPACE_EXPANSION_STORAGE_KEY, expanded);
			}, [expanded]);
			(0, react.useEffect)(() => {
				savePinnedWorkspaceIds(storage(), pinnedWorkspaceIds);
				saveWorkspaceGroupsCache(storage(), workspaceGroups, workspaceGroupsPendingHostSyncRef.current);
				if (!pinnedHostHydratedRef.current) return;
				const skippedHydration = pinnedHostSkipWriteRef.current;
				pinnedHostSkipWriteRef.current = void 0;
				if (skippedHydration !== void 0 && sameIds(skippedHydration.pinnedWorkspaceIds, pinnedWorkspaceIds) && sameWorkspaceGroups(skippedHydration.workspaceGroups, workspaceGroups)) return;
				queuePinnedHostWrite(pinnedWorkspaceIds, workspaceGroups);
			}, [pinnedWorkspaceIds, workspaceGroups]);
			(0, react.useEffect)(() => {
				let alive = true;
				const local = {
					pinnedWorkspaceIds: [...pinnedWorkspaceIdsRef.current],
					workspaceGroups: workspaceGroupsRef.current
				};
				readHostPinnedWorkspaceIds().then((host) => {
					if (!alive) return;
					const dirty = pinnedHostDirtyRef.current ? {
						pinnedWorkspaceIds: pinnedWorkspaceIdsRef.current,
						workspaceGroups: workspaceGroupsRef.current
					} : void 0;
					const hydration = resolveWorkspacePreferencesHydration(local, host, dirty, workspaceGroupsPendingHostSyncRef.current);
					const baseline = workspaceBaselineRef.current;
					const ids = baseline.ready ? prunePinnedWorkspaceIds(hydration.pinnedWorkspaceIds, baseline.validIds) : hydration.pinnedWorkspaceIds;
					const groups = baseline.ready ? pruneWorkspaceGroups(hydration.workspaceGroups, baseline.validIds) : hydration.workspaceGroups;
					const writeHost = hydration.writeHost || !sameIds(ids, hydration.pinnedWorkspaceIds) || !sameWorkspaceGroups(groups, hydration.workspaceGroups);
					pinnedHostSupportsWorkspaceGroupsRef.current = host.workspaceGroupsSupported !== false;
					workspaceGroupsPendingHostSyncRef.current = workspaceGroupsPendingHostSyncRef.current || host.workspaceGroupsSupported === false && groups.length > 0 || !host.exists && local.workspaceGroups.length > 0;
					pinnedHostHydratedRef.current = true;
					if (!sameIds(pinnedWorkspaceIdsRef.current, ids) || !sameWorkspaceGroups(workspaceGroupsRef.current, groups)) {
						pinnedHostSkipWriteRef.current = {
							pinnedWorkspaceIds: [...ids],
							workspaceGroups: groups
						};
						pinnedWorkspaceIdsRef.current = ids;
						workspaceGroupsRef.current = groups;
						setPinnedWorkspaceIdsState(ids);
						setWorkspaceGroupsState(groups);
					}
					savePinnedWorkspaceIds(storage(), ids);
					if (writeHost) queuePinnedHostWrite(ids, groups);
				}).catch((reason) => {
					if (!alive) return;
					setPreferencesFailure(reason);
					pinnedHostHydratedRef.current = true;
				});
				return () => {
					alive = false;
				};
			}, []);
			(0, react.useEffect)(() => {
				writeSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY, unreadSessionIds);
			}, [unreadSessionIds]);
			(0, react.useEffect)(() => {
				if (!baselinesReady) return;
				const validIds = workspaces.items.map((workspace) => String(workspace.workspaceId));
				const nextPinned = prunePinnedWorkspaceIds(pinnedWorkspaceIdsRef.current, validIds);
				const nextGroups = pruneWorkspaceGroups(workspaceGroupsRef.current, validIds);
				if (!sameIds(pinnedWorkspaceIdsRef.current, nextPinned)) {
					pinnedWorkspaceIdsRef.current = nextPinned;
					setPinnedWorkspaceIdsState(nextPinned);
				}
				if (!sameWorkspaceGroups(workspaceGroupsRef.current, nextGroups)) {
					workspaceGroupsRef.current = nextGroups;
					setWorkspaceGroupsState(nextGroups);
				}
			}, [baselinesReady, workspaces.items]);
			(0, react.useEffect)(() => {
				if (selectedId !== void 0) setUnreadSessionIds((ids) => ids.filter((id) => id !== selectedId));
			}, [selectedId]);
			(0, react.useEffect)(() => {
				const next = sessionRunningFlags(sessions.byId, sessionStatus);
				const previous = previousSessionRunningRef.current;
				previousSessionRunningRef.current = next;
				if (previous === void 0) return;
				const completed = completedBackgroundSessionIds(previous, next, selectedId);
				if (completed.length > 0) setUnreadSessionIds((ids) => [...completed, ...ids.filter((id) => !completed.includes(id))]);
			}, [
				selectedId,
				sessionStatus,
				sessions.byId
			]);
			const groups = (0, react.useMemo)(() => {
				const archived = workspaces.archivedSessionIds;
				const visible = (ids) => visibleSessionIds(ids, sessions.byId, archived);
				return { items: workspaces.items.map((workspace) => ({
					...workspace,
					visibleIds: visible(workspace.sessionIds)
				})) };
			}, [
				sessions.byId,
				sessions.ids,
				workspaces.archivedSessionIds,
				workspaces.items
			]);
			const sourceWorkspaceIdForSession = (sessionId) => {
				if (sessionDrag?.sessionId === sessionId && sessionDrag.workspaceId !== "") return sessionDrag.workspaceId;
				const source = groups.items.find((workspace) => workspace.sessionIds.some((id) => String(id) === sessionId));
				return source === void 0 ? void 0 : String(source.workspaceId);
			};
			const projectPinned = (id) => pinnedWorkspaceIds.includes(String(id));
			const pinnedGroups = orderByIds(groups.items, pinnedWorkspaceIds, (workspace) => String(workspace.workspaceId));
			const regularGroups = groups.items.filter((workspace) => !projectPinned(workspace.workspaceId));
			const pinDragActive = workspaceDragId !== void 0;
			const pinnedGroupIds = pinnedGroups.map((workspace) => String(workspace.workspaceId));
			const regularGroupIds = regularGroups.map((workspace) => String(workspace.workspaceId));
			const groupedIds = new Set(groupedWorkspaceIds(workspaceGroups));
			const workspaceGroupIds = workspaceGroups.map((group) => group.id);
			const ungroupedGroups = regularGroups.filter((workspace) => !groupedIds.has(String(workspace.workspaceId)));
			const ungroupedGroupIds = ungroupedGroups.map((workspace) => String(workspace.workspaceId));
			const workspaceById = new Map(regularGroups.map((workspace) => [String(workspace.workspaceId), workspace]));
			const pinnedHeaderDrop = workspaceDropTarget?.zone === "pinned" && workspaceDropTarget.beforeId === pinnedGroupIds[0] ? pinnedHeaderDropIndicator(pinnedGroupIds) : void 0;
			const assignedIds = workspaces.items.flatMap((workspace) => workspace.sessionIds.map((id) => String(id)));
			const recentIds = ungroupedSessionIds(sessions.ids ?? Object.keys(sessions.byId), sessions.byId, assignedIds, workspaces.archivedSessionIds).sort((left, right) => (sessions.byId[right]?.updatedAt ?? 0) - (sessions.byId[left]?.updatedAt ?? 0));
			const run = async (key, action) => {
				if (busyRef.current !== void 0) return;
				busyRef.current = key;
				setBusy(key);
				setError(void 0);
				try {
					await action();
					setMenu(void 0);
				} catch (reason) {
					setError(userErrorText(reason, t));
				} finally {
					busyRef.current = void 0;
					setBusy(void 0);
				}
			};
			const beginRename = (kind, id, title) => {
				setRenameTarget({
					kind,
					id,
					title
				});
				setRenameDraft(title);
				setMenu(void 0);
			};
			const submitRename = () => {
				if (renameTarget === void 0 || renameDraft.trim() === "") return;
				run("rename", async () => {
					if (renameTarget.kind === "workspace") await renameWorkspace(renameTarget.id, renameDraft.trim());
					else await renameSession(renameTarget.id, renameDraft.trim());
					setRenameTarget(void 0);
				});
			};
			const submitDelete = () => {
				if (deleteTarget === void 0) return;
				const target = deleteTarget;
				const operation = target.kind === "session" ? "delete-session" : "delete-workspace";
				run(operation, async () => {
					if (target.kind === "session") {
						await deleteSession(target.id);
						setUnreadSessionIds((ids) => ids.filter((id) => id !== target.id));
					} else {
						await deleteWorkspace(target.id);
						setPinnedWorkspaceIds((ids) => ids.filter((id) => id !== target.id));
					}
					setDeleteTarget(void 0);
				});
			};
			const submitArchiveWorkspace = () => {
				if (archiveWorkspaceTarget === void 0) return;
				const target = archiveWorkspaceTarget;
				run("archive-workspace", async () => {
					await archiveWorkspaceSessions(target.sessionIds, (sessionId) => archiveSession(sessionId));
					setUnreadSessionIds((ids) => ids.filter((id) => !target.sessionIds.includes(id)));
					setArchiveWorkspaceTarget(void 0);
				});
			};
			const copy = (value) => {
				if (value === void 0 || value === "") return;
				run("copy", async () => {
					await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(value);
				});
			};
			const toggleGroup = (key, defaultOpen = true) => {
				setExpanded((current) => ({
					...current,
					[key]: !(current[key] ?? defaultOpen)
				}));
			};
			const toggleProject = (expandKey, id) => {
				if (expanded[expandKey] ?? true) setSessionWindows((current) => ({
					...current,
					[id]: collapseProjectSessionWindow()
				}));
				toggleGroup(expandKey, true);
			};
			const submitCreateGroup = () => {
				if (groupTitleDraft.trim() === "") return;
				try {
					setWorkspaceGroups((current) => createWorkspaceGroup(current, {
						id: newWorkspaceGroupId(),
						title: groupTitleDraft
					}));
					setCreateGroupOpen(false);
					setGroupTitleDraft("");
				} catch (reason) {
					setError(userErrorText(reason, t));
				}
			};
			const closeRenameGroup = () => {
				setRenameGroupId(void 0);
				setRenameGroupDraft("");
				setRenameGroupError(void 0);
				const trigger = groupActionTriggerRef.current;
				const focusTarget = trigger?.isConnected ? trigger : projectsSectionButtonRef.current;
				groupActionTriggerRef.current = void 0;
				focusTarget?.focus();
			};
			const submitRenameGroup = () => {
				if (renameGroupId === void 0 || renameGroupDraft.trim() === "") return;
				if (workspaceGroupsRef.current.find((group) => group.id === renameGroupId)?.title === renameGroupDraft.trim()) {
					closeRenameGroup();
					return;
				}
				try {
					setWorkspaceGroups((current) => renameWorkspaceGroup(current, renameGroupId, renameGroupDraft));
					closeRenameGroup();
				} catch (reason) {
					setRenameGroupError(userErrorText(reason, t));
				}
			};
			const triggerAddWorkspace = () => {
				requestAddWorkspace?.();
			};
			const sectionOpen = (id) => expanded[`section:${id}`] ?? true;
			const toggleSection = (id) => {
				setExpanded((current) => ({
					...current,
					[`section:${id}`]: !(current[`section:${id}`] ?? true)
				}));
			};
			const workspaceGroupIdFor = (workspaceId) => workspaceGroups.find((group) => group.workspaceIds.includes(workspaceId))?.id;
			const moveWorkspaceToGroup = (workspaceId, groupId) => {
				setWorkspaceGroups((current) => assignWorkspaceToGroup(current, workspaceId, groupId));
				if (pinnedWorkspaceIdsRef.current.includes(workspaceId)) setPinnedWorkspaceIds((ids) => ids.filter((id) => id !== workspaceId));
			};
			const projectMenu = (workspace) => {
				const workspaceId = String(workspace.workspaceId);
				const moveTargets = workspaceGroupMoveTargets(workspaceGroups, workspaceId).map((target) => ({
					id: workspaceGroupMoveActionId(target.groupId),
					label: target.title ?? t("workspace.removeFromGroup"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolderCloseMedium, { size: 16 })
				}));
				return [
					{
						id: "pin",
						label: t(projectPinned(workspace.workspaceId) ? "workspace.unpin" : "workspace.pin"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, {})
					},
					{
						id: "rename",
						label: t("workspace.rename"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconEditOutlineMedium, { size: 16 })
					},
					{
						type: "separator",
						id: "project-main-separator"
					},
					{
						id: "moveToGroup",
						label: t("workspace.moveToGroup"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolderCloseMedium, { size: 16 }),
						disabled: moveTargets.length === 0,
						submenu: moveTargets
					},
					{
						type: "separator",
						id: "project-archive-separator"
					},
					{
						id: "archiveWorkspace",
						label: t("workspace.archive"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconArchiveOutlineMedium, { size: 16 }),
						disabled: workspace.visibleIds.length === 0
					},
					{
						type: "separator",
						id: "project-delete-separator"
					},
					{
						id: "delete",
						label: t("workspace.delete"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconTrashOutlineMedium, { size: 16 }),
						danger: true
					}
				];
			};
			const handleProjectMenuAction = (workspace, id) => {
				if (busy !== void 0) return;
				const workspaceId = String(workspace.workspaceId);
				const targetGroup = workspaceGroups.find((group) => id === workspaceGroupMoveActionId(group.id));
				if (targetGroup !== void 0 || id === workspaceGroupMoveActionId()) {
					moveWorkspaceToGroup(workspaceId, targetGroup?.id);
					setMenu(void 0);
					return;
				}
				if (id === "rename") beginRename("workspace", workspace.workspaceId, workspace.title);
				if (id === "pin") {
					setPinnedWorkspaceIds((ids) => togglePinnedWorkspace(ids, workspace.workspaceId));
					setMenu(void 0);
				}
				if (id === "archiveWorkspace") {
					setArchiveWorkspaceTarget({
						id: workspaceId,
						title: workspace.title,
						sessionIds: [...workspace.visibleIds]
					});
					setError(void 0);
					setMenu(void 0);
				}
				if (id === "delete") {
					setDeleteTarget({
						id: workspace.workspaceId,
						kind: "workspace",
						title: workspace.title
					});
					setError(void 0);
					setMenu(void 0);
				}
			};
			const canDelete = canDeleteSession?.() === true;
			const sessionMenu = (sessionId) => sessionMenuItems(t, {
				unread: rowUnread(sessionId),
				canDelete
			});
			const pinWorkspaceAt = (id, beforeId) => {
				setPinnedWorkspaceIds((ids) => insertPinnedWorkspace(ids, id, beforeId));
			};
			const renderGroup = (workspace, zone) => {
				const expandKey = zone === "pinned" ? `pin:${workspace.workspaceId}` : String(workspace.workspaceId);
				const isExpanded = expanded[expandKey] ?? true;
				const currentSessionId = selectedId;
				const folder = projectFolderPresentation(isExpanded, workspace.visibleIds.some((id) => id === currentSessionId));
				const shownIds = workspace.visibleIds;
				const menuOpen = menu?.type === "workspace" && menu.id === workspace.workspaceId;
				const menuAt = menuOpen && menu.x !== void 0 && menu.y !== void 0 ? {
					x: menu.x,
					y: menu.y
				} : void 0;
				const isPinnedHeaderDrop = zone === "pinned" && pinnedHeaderDrop?.kind === "workspace" && pinnedHeaderDrop.workspaceId === String(workspace.workspaceId);
				const workspaceId = String(workspace.workspaceId);
				const sessionWindow = projectSessionWindow(shownIds, sessionWindows[workspaceId] ?? {
					expanded: false,
					page: 1
				}, currentSessionId !== void 0 && shownIds.includes(currentSessionId) ? currentSessionId : void 0);
				const renderedIds = sessionWindow.ids;
				const dropAfterSessionId = sessionDropTarget?.workspaceId === workspaceId && sessionDropTarget.ontoProject !== true ? sessionDropAfterRowId(sessionDropTarget, renderedIds) : void 0;
				const zoneIds = zone === "pinned" ? pinnedGroupIds : regularGroupIds;
				const dropsBefore = workspaceDropTarget?.zone === zone && workspaceDropTarget.beforeId === workspaceId;
				const dropsAfterLast = zone === "projects" && workspaceDropTarget?.zone === zone && workspaceDropTarget.beforeId === void 0 && zoneIds[zoneIds.length - 1] === workspaceId;
				const projectSessionDrop = sessionDropTarget?.workspaceId === workspaceId && sessionDropTarget?.ontoProject;
				const handleProjectDragOver = (event) => {
					const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
					if (draggedWorkspace !== void 0) {
						event.preventDefault();
						event.stopPropagation();
						event.dataTransfer.dropEffect = "move";
						const rect = event.currentTarget.getBoundingClientRect();
						const beforeId = reorderDropBeforeId(zoneIds, draggedWorkspace, workspaceId, event.clientY > rect.top + rect.height / 2);
						setSessionDropTarget(void 0);
						setWorkspaceDropTarget(beforeId === null ? void 0 : {
							zone,
							beforeId
						});
						return;
					}
					const draggedSessionId = readSessionDrag(event.dataTransfer, sessionDrag?.sessionId);
					if (draggedSessionId === void 0) return;
					event.preventDefault();
					event.stopPropagation();
					event.dataTransfer.dropEffect = "move";
					if (sessionDropAction(sourceWorkspaceIdForSession(draggedSessionId), workspaceId) !== "reorder") return;
					setWorkspaceDropTarget(void 0);
					setSessionDropTarget({
						workspaceId,
						beforeId: shownIds[0],
						ontoProject: true
					});
				};
				const handleProjectDrop = (event) => {
					const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
					if (draggedWorkspace !== void 0) {
						event.preventDefault();
						event.stopPropagation();
						const rect = event.currentTarget.getBoundingClientRect();
						const beforeId = reorderDropBeforeId(zoneIds, draggedWorkspace, workspaceId, event.clientY > rect.top + rect.height / 2);
						setWorkspaceDragId(void 0);
						setWorkspaceDropTarget(void 0);
						if (beforeId === null) return;
						if (zone === "pinned") {
							pinWorkspaceAt(draggedWorkspace, beforeId);
							return;
						}
						const hostIds = groups.items.map((item) => String(item.workspaceId));
						if (moveBefore(hostIds, draggedWorkspace, beforeId).some((id, index) => id !== hostIds[index])) run("workspace-order", () => insertWorkspaceBefore(draggedWorkspace, beforeId));
						return;
					}
					const draggedSessionId = readSessionDrag(event.dataTransfer, sessionDrag?.sessionId);
					if (draggedSessionId === void 0) return;
					event.preventDefault();
					event.stopPropagation();
					const action = sessionDropAction(sourceWorkspaceIdForSession(draggedSessionId), workspaceId);
					setSessionDrag(void 0);
					setSessionDropTarget(void 0);
					setWorkspaceDropTarget(void 0);
					if (action !== "reorder") return;
					run("session-order", () => insertSessionBefore(workspace.workspaceId, draggedSessionId, shownIds[0]));
				};
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `dcu-wb-project${isPinnedHeaderDrop || dropsBefore ? " dcu-wb-drop" : ""}${dropsAfterLast ? " dcu-wb-drop dcu-wb-drop-after" : ""}${projectSessionDrop ? " dcu-wb-session-drop" : ""}`,
					onDragOver: handleProjectDragOver,
					onDragLeave: (event) => {
						if (event.currentTarget.contains(event.relatedTarget)) return;
						setWorkspaceDropTarget(void 0);
						setSessionDropTarget(void 0);
					},
					onDrop: handleProjectDrop,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `dcu-wb-project-head${menuOpen ? " dcu-wb-menu-open" : ""}${workspaceDragId === workspaceId ? " dcu-wb-dragging" : ""}`,
						role: "treeitem",
						"aria-expanded": isExpanded,
						tabIndex: 0,
						draggable: true,
						onDragStart: (event) => {
							event.stopPropagation();
							setSessionDrag(void 0);
							setSessionDropTarget(void 0);
							setWorkspaceGroupDragId(void 0);
							setWorkspaceGroupDropTarget(void 0);
							writeWorkspaceDrag(event.dataTransfer, workspaceId, workspace.title);
							setDragPreview(event.dataTransfer, workspace.title, event.currentTarget.querySelector(".dcu-wb-folder"));
							setWorkspaceDragId(workspaceId);
						},
						onDragEnd: () => {
							setWorkspaceDragId(void 0);
							setWorkspaceDropTarget(void 0);
							setWorkspaceGroupDropTarget(void 0);
						},
						onClick: () => {
							toggleProject(expandKey, workspaceId);
						},
						onContextMenu: (event) => {
							event.preventDefault();
							event.stopPropagation();
							dismissTip();
							setMenu({
								id: workspace.workspaceId,
								type: "workspace",
								x: event.clientX,
								y: event.clientY
							});
						},
						onMouseEnter: (event) => {
							const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect());
							showTip({
								kind: "workspace",
								id: workspace.workspaceId,
								title: workspace.title,
								path: workspace.path,
								count: workspace.visibleIds.length,
								unreadCount: workspace.visibleIds.filter((id) => rowUnread(String(id))).length,
								pinned: projectPinned(workspace.workspaceId),
								left: box.left,
								top: box.top
							});
						},
						onMouseLeave: hideTip,
						onKeyDown: (event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								toggleProject(expandKey, workspaceId);
							}
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `dcu-wb-folder${folder.current ? " dcu-wb-folder-current" : ""}`,
								onClick: (event) => {
									event.stopPropagation();
									const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect());
									if (isShowing("workspace", workspace.workspaceId)) {
										dismissTip();
										return;
									}
									showTip({
										kind: "workspace",
										id: workspace.workspaceId,
										title: workspace.title,
										path: workspace.path,
										count: workspace.visibleIds.length,
										unreadCount: workspace.visibleIds.filter((id) => rowUnread(String(id))).length,
										pinned: projectPinned(workspace.workspaceId),
										left: box.left,
										top: box.top
									}, { immediate: true });
								},
								children: folder.open ? folder.current ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolderOpenMedium, { size: 16 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolderOpenOutlineMedium, { size: 16 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolderCloseMedium, { size: 16 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-project-title",
								children: workspace.title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-actions",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
									open: menuOpen,
									onClose: () => {
										setMenu(void 0);
									},
									items: projectMenu(workspace),
									onSelect: (id) => {
										handleProjectMenuAction(workspace, id);
									},
									portal: true,
									dense: true,
									getAnchorRect: menuAt === void 0 ? void 0 : () => pointerMenuRect(menuAt.x, menuAt.y),
									anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dcu-wb-more",
										"aria-label": t("workspace.actions", { name: workspace.title }),
										onClick: (event) => {
											event.stopPropagation();
											dismissTip();
											setMenu((current) => current?.id === workspace.workspaceId && current?.type === "workspace" ? void 0 : {
												id: workspace.workspaceId,
												type: "workspace"
											});
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconEllipsisOutlineMedium, { size: 16 })
									})
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-actions",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-wb-more",
									"aria-label": t("workspace.newSession"),
									onClick: (event) => {
										event.stopPropagation();
										startSession(workspace.workspaceId);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NewSessionIcon, {})
								})
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(DisclosureBody, {
						className: "dcu-wb-project-body",
						open: isExpanded,
						children: [
							shownIds.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-nochat",
								children: t("workspace.noChat")
							}),
							renderedIds.map((id) => {
								const session = sessions.byId[id];
								if (session === void 0) return null;
								const pendingInteraction = pendingInteractionForSession(id, pendingInteractions, legacyPendingInteraction(session));
								const path = session.cwd ?? workspace.path;
								const selected = selectedId === id;
								const sessionMenuOpen = menu?.type === "session" && menu.id === id;
								const sessionMenuAt = sessionMenuOpen && menu.x !== void 0 && menu.y !== void 0 ? {
									x: menu.x,
									y: menu.y
								} : void 0;
								const dropsBeforeSession = sessionDropTarget?.workspaceId === workspaceId && sessionDropTarget.ontoProject !== true && sessionDropTarget.beforeId === id;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-dcu-session": id,
									className: `dcu-wb-session${selected ? " dcu-wb-selected" : ""}${sessionMenuOpen ? " dcu-wb-menu-open" : ""}${dropsBeforeSession ? " dcu-wb-drop" : ""}${dropAfterSessionId !== void 0 && id === dropAfterSessionId ? " dcu-wb-drop dcu-wb-drop-after" : ""}`,
									role: "treeitem",
									"aria-selected": selected,
									draggable: true,
									onDragStart: (event) => {
										event.stopPropagation();
										setWorkspaceDragId(void 0);
										setWorkspaceDropTarget(void 0);
										setWorkspaceGroupDragId(void 0);
										setWorkspaceGroupDropTarget(void 0);
										writeSessionDrag(event.dataTransfer, id, session.displayTitle);
										setDragPreview(event.dataTransfer, session.displayTitle);
										setSessionDrag({
											sessionId: id,
											workspaceId
										});
									},
									onDragEnd: () => {
										setSessionDrag(void 0);
										setSessionDropTarget(void 0);
										setWorkspaceGroupDropTarget(void 0);
									},
									onDragOver: (event) => {
										const drag = sessionDrag;
										if (drag === void 0 || drag.workspaceId !== workspaceId) return;
										event.preventDefault();
										event.stopPropagation();
										event.dataTransfer.dropEffect = "move";
										const rect = event.currentTarget.getBoundingClientRect();
										const beforeId = reorderDropBeforeId(shownIds, drag.sessionId, id, event.clientY > rect.top + rect.height / 2);
										setSessionDropTarget(beforeId === null ? void 0 : {
											workspaceId,
											beforeId,
											hoveredId: id
										});
									},
									onDragLeave: (event) => {
										if (event.currentTarget.contains(event.relatedTarget)) return;
										setSessionDropTarget(void 0);
									},
									onDrop: (event) => {
										const drag = sessionDrag;
										if (drag === void 0 || drag.workspaceId !== workspaceId) return;
										event.preventDefault();
										event.stopPropagation();
										const rect = event.currentTarget.getBoundingClientRect();
										setSessionDrag(void 0);
										setSessionDropTarget(void 0);
										const beforeId = reorderDropBeforeId(shownIds, drag.sessionId, id, event.clientY > rect.top + rect.height / 2);
										if (beforeId !== null) run("session-order", () => insertSessionBefore(workspace.workspaceId, drag.sessionId, beforeId));
									},
									onClick: () => {
										if (openSession(id) !== false) setUnreadSessionIds((ids) => ids.filter((item) => item !== id));
									},
									onContextMenu: (event) => {
										event.preventDefault();
										event.stopPropagation();
										dismissTip();
										setMenu({
											id,
											type: "session",
											x: event.clientX,
											y: event.clientY
										});
									},
									onMouseEnter: (event) => {
										const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect());
										const branch = optionalText(session, "branch");
										showTip({
											kind: "session",
											id,
											title: session.displayTitle,
											project: workspace.title,
											path,
											branch,
											time: formatHoverTime(session.updatedAt, t, now),
											left: box.left,
											top: box.top
										});
									},
									onMouseLeave: hideTip,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRowTitle, { title: session.displayTitle }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionState, {
											pendingInteraction,
											unread: rowUnread(id),
											running: rowRunning(id, session),
											t
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionTime, { time: formatCompactTime(session.updatedAt, t, now) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-wb-quick-actions",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dcu-wb-more",
												"aria-label": t("sessions.archive"),
												onClick: (event) => {
													event.stopPropagation();
													run("archive", () => archiveSession(id));
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuickArchiveIcon, {})
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-wb-actions",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
												open: sessionMenuOpen,
												onClose: () => {
													setMenu(void 0);
												},
												items: sessionMenu(id),
												onSelect: (action) => {
													if (busy !== void 0) return;
													if (action === "rename") beginRename("session", id, session.displayTitle);
													if (action === "unread") {
														setUnreadSessionIds((ids) => toggleSessionId(ids, id));
														setMenu(void 0);
													}
													if (action === "archive") run("archive", () => archiveSession(id));
													if (action === "delete") {
														setDeleteTarget({
															id,
															kind: "session",
															title: session.displayTitle
														});
														setError(void 0);
														setMenu(void 0);
													}
													if (action === "fork") run("fork", () => forkSession(id));
													if (action === "copyPath") copy(path);
													if (action === "copyTitle") copy(session.displayTitle);
													if (action === "copyId") copy(id);
												},
												portal: true,
												dense: true,
												getAnchorRect: sessionMenuAt === void 0 ? void 0 : () => pointerMenuRect(sessionMenuAt.x, sessionMenuAt.y),
												anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "dcu-wb-more dcu-wb-context-anchor",
													"aria-label": t("sessions.actions", { name: session.displayTitle }),
													onClick: (event) => {
														event.stopPropagation();
														setMenu((current) => current?.id === id && current?.type === "session" ? void 0 : {
															id,
															type: "session"
														});
													},
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconEllipsisOutlineMedium, { size: 16 })
												})
											})
										})
									]
								}, id);
							}),
							sessionWindow.showMore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-session-more",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: (event) => {
										event.stopPropagation();
										revealMoreSessions(workspaceId);
									},
									children: t("workspace.showMore")
								})
							})
						]
					})]
				}, workspace.workspaceId);
			};
			const renderWorkspaceCollection = (group) => {
				const groupId = group.id;
				const expandKey = `workspace-group:${group.id}`;
				const isExpanded = expanded[expandKey] ?? true;
				const members = group.workspaceIds.flatMap((id) => {
					const workspace = workspaceById.get(id);
					return workspace === void 0 ? [] : [workspace];
				});
				const memberIds = members.map((workspace) => String(workspace.workspaceId));
				const groupWorkspaceMoveDrop = workspaceDropTarget?.zone === "group" && workspaceDropTarget.groupId === group.id && workspaceDropTarget.crossGroup === true;
				const groupOrderDrop = workspaceGroupDropTarget?.beforeId === groupId;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `dcu-wb-collection${groupOrderDrop ? " dcu-wb-group-order-drop" : ""}${groupWorkspaceMoveDrop ? " dcu-wb-workspace-move-drop" : ""}`,
					onDragOver: (event) => {
						const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId);
						if (draggedGroupId !== void 0) {
							event.preventDefault();
							event.stopPropagation();
							event.dataTransfer.dropEffect = "move";
							setWorkspaceDropTarget(void 0);
							const rect = event.currentTarget.querySelector(":scope > .dcu-wb-collection-head")?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
							const beforeId = reorderDropBeforeId(workspaceGroupIds, draggedGroupId, groupId, event.clientY > rect.top + rect.height / 2);
							setWorkspaceGroupDropTarget(beforeId === null ? void 0 : { beforeId });
							return;
						}
						const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
						if (dragged === void 0) return;
						event.preventDefault();
						event.stopPropagation();
						event.dataTransfer.dropEffect = "move";
						setWorkspaceGroupDropTarget(void 0);
						if (workspaceGroupIdFor(dragged) === groupId) {
							const lastId = memberIds[memberIds.length - 1];
							const beforeId = lastId === void 0 ? null : reorderDropBeforeId(memberIds, dragged, lastId, true);
							setWorkspaceDropTarget(beforeId === null ? void 0 : {
								zone: "group",
								groupId,
								beforeId
							});
							return;
						}
						setWorkspaceDropTarget({
							zone: "group",
							groupId,
							ontoGroup: true,
							crossGroup: true
						});
					},
					onDragLeave: (event) => {
						if (event.currentTarget.contains(event.relatedTarget)) return;
						setWorkspaceDropTarget(void 0);
						setWorkspaceGroupDropTarget(void 0);
					},
					onDrop: (event) => {
						const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId);
						if (draggedGroupId !== void 0) {
							event.preventDefault();
							event.stopPropagation();
							const rect = event.currentTarget.querySelector(":scope > .dcu-wb-collection-head")?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
							const beforeId = reorderDropBeforeId(workspaceGroupIds, draggedGroupId, groupId, event.clientY > rect.top + rect.height / 2);
							setWorkspaceGroupDragId(void 0);
							setWorkspaceGroupDropTarget(void 0);
							if (beforeId !== null) setWorkspaceGroups((current) => moveWorkspaceGroup(current, draggedGroupId, beforeId));
							return;
						}
						const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
						if (dragged === void 0) return;
						event.preventDefault();
						event.stopPropagation();
						setWorkspaceDragId(void 0);
						setWorkspaceDropTarget(void 0);
						setWorkspaceGroups((current) => current.find((candidate) => candidate.workspaceIds.includes(dragged))?.id === groupId ? moveWorkspaceGroupMember(current, dragged, groupId) : assignWorkspaceToGroup(current, dragged, groupId));
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `dcu-wb-collection-head${workspaceGroupDragId === groupId ? " dcu-wb-dragging" : ""}`,
						draggable: true,
						onDragStart: (event) => {
							event.stopPropagation();
							setSessionDrag(void 0);
							setSessionDropTarget(void 0);
							setWorkspaceDragId(void 0);
							setWorkspaceDropTarget(void 0);
							setWorkspaceGroupDropTarget(void 0);
							writeWorkspaceGroupDrag(event.dataTransfer, groupId, group.title);
							setDragPreview(event.dataTransfer, group.title);
							setWorkspaceGroupDragId(groupId);
						},
						onDragEnd: () => {
							setWorkspaceGroupDragId(void 0);
							setWorkspaceGroupDropTarget(void 0);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dcu-wb-collection-label",
							"aria-expanded": isExpanded,
							onClick: () => {
								toggleGroup(expandKey, true);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-wb-section-caret",
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										viewBox: "0 0 16 16",
										width: "12",
										height: "12",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											d: "M6.25 4.25 10.25 8 6.25 11.75",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "1.5",
											strokeLinecap: "round",
											strokeLinejoin: "round"
										})
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-wb-collection-title",
									children: group.title
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-wb-collection-count",
									children: members.length
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-collection-actions",
							onClick: (event) => {
								event.stopPropagation();
							},
							onDragStart: (event) => {
								event.preventDefault();
								event.stopPropagation();
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: groupMenuId === groupId,
								onClose: () => {
									setGroupMenuId(void 0);
								},
								items: [
									{
										id: "rename",
										label: t("workspace.renameGroup"),
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconEditOutlineMedium, { size: 16 })
									},
									{
										type: "separator",
										id: "group-delete-separator"
									},
									{
										id: "delete",
										label: t("workspace.deleteGroupAction"),
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconTrashOutlineMedium, { size: 16 }),
										danger: true
									}
								],
								onSelect: (action) => {
									setGroupMenuId(void 0);
									if (action === "rename") {
										setRenameGroupId(groupId);
										setRenameGroupDraft(group.title);
										setRenameGroupError(void 0);
									}
									if (action === "delete") setDeleteGroupId(groupId);
								},
								portal: true,
								dense: true,
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-wb-more",
									draggable: false,
									"aria-haspopup": "menu",
									"aria-expanded": groupMenuId === groupId,
									"aria-label": t("workspace.groupActions", { name: group.title }),
									title: t("workspace.groupActions", { name: group.title }),
									onClick: (event) => {
										groupActionTriggerRef.current = event.currentTarget;
										setGroupMenuId((current) => current === groupId ? void 0 : groupId);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconEllipsisOutlineMedium, { size: 16 })
								})
							})
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(DisclosureBody, {
						className: "dcu-wb-collection-body",
						open: isExpanded,
						children: [members.map((workspace) => {
							const workspaceId = String(workspace.workspaceId);
							const preciseTarget = workspaceDropTarget?.zone === "group" && workspaceDropTarget.groupId === groupId && workspaceDropTarget.ontoGroup !== true && workspaceDropTarget.crossGroup !== true;
							const orderDrop = preciseTarget && workspaceDropTarget.beforeId === workspaceId;
							const orderDropAfter = preciseTarget && workspaceDropTarget.beforeId === void 0 && memberIds[memberIds.length - 1] === workspaceId;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								"data-dcu-group-member": true,
								className: `dcu-wb-group-member${orderDrop ? " dcu-wb-drop" : ""}${orderDropAfter ? " dcu-wb-drop dcu-wb-drop-after" : ""}`,
								onDragOverCapture: (event) => {
									const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									if (dragged === void 0) return;
									event.preventDefault();
									event.stopPropagation();
									event.dataTransfer.dropEffect = "move";
									const rect = event.currentTarget.getBoundingClientRect();
									const beforeId = reorderDropBeforeId(memberIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2);
									setWorkspaceDropTarget(beforeId === null ? void 0 : {
										zone: "group",
										groupId,
										beforeId,
										crossGroup: workspaceGroupIdFor(dragged) !== groupId
									});
								},
								onDropCapture: (event) => {
									const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									if (dragged === void 0) return;
									event.preventDefault();
									event.stopPropagation();
									const rect = event.currentTarget.getBoundingClientRect();
									const beforeId = reorderDropBeforeId(memberIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2);
									setWorkspaceDragId(void 0);
									setWorkspaceDropTarget(void 0);
									if (beforeId === null) return;
									setWorkspaceGroups((current) => current.find((candidate) => candidate.workspaceIds.includes(dragged))?.id === groupId ? moveWorkspaceGroupMember(current, dragged, groupId, beforeId) : placeWorkspaceInGroup(current, dragged, groupId, beforeId));
								},
								children: renderGroup(workspace, "projects")
							}, workspaceId);
						}), members.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-wb-empty",
							children: t("workspace.empty")
						})]
					})]
				}, group.id);
			};
			const renderUngroupedCollection = () => {
				const ungroupedExpandKey = "workspace-group:ungrouped";
				const ungroupedExpanded = expanded[ungroupedExpandKey] ?? true;
				const ungroupedWorkspaceMoveDrop = workspaceDropTarget?.zone === "ungrouped" && workspaceDropTarget.crossGroup === true;
				const groupOrderDrop = workspaceGroupDropTarget !== void 0 && workspaceGroupDropTarget.beforeId === void 0;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `dcu-wb-ungrouped${groupOrderDrop ? " dcu-wb-group-order-drop" : ""}${ungroupedWorkspaceMoveDrop ? " dcu-wb-workspace-move-drop" : ""}`,
					onDragOver: (event) => {
						const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId);
						if (draggedGroupId !== void 0) {
							event.preventDefault();
							event.stopPropagation();
							event.dataTransfer.dropEffect = "move";
							setWorkspaceDropTarget(void 0);
							const lastGroupId = workspaceGroupIds[workspaceGroupIds.length - 1];
							const beforeId = lastGroupId === void 0 ? null : reorderDropBeforeId(workspaceGroupIds, draggedGroupId, lastGroupId, true);
							setWorkspaceGroupDropTarget(beforeId === null ? void 0 : { beforeId: void 0 });
							return;
						}
						const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
						if (dragged === void 0) return;
						event.preventDefault();
						event.stopPropagation();
						event.dataTransfer.dropEffect = "move";
						setWorkspaceGroupDropTarget(void 0);
						if (workspaceGroupIdFor(dragged) === void 0) {
							const lastId = ungroupedGroupIds[ungroupedGroupIds.length - 1];
							const beforeId = lastId === void 0 ? null : reorderDropBeforeId(ungroupedGroupIds, dragged, lastId, true);
							setWorkspaceDropTarget(beforeId === null ? void 0 : {
								zone: "ungrouped",
								beforeId
							});
							return;
						}
						setWorkspaceDropTarget({
							zone: "ungrouped",
							ontoSection: true,
							crossGroup: true
						});
					},
					onDragLeave: (event) => {
						if (event.currentTarget.contains(event.relatedTarget)) return;
						setWorkspaceDropTarget(void 0);
						setWorkspaceGroupDropTarget(void 0);
					},
					onDrop: (event) => {
						const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId);
						if (draggedGroupId !== void 0) {
							event.preventDefault();
							event.stopPropagation();
							const lastGroupId = workspaceGroupIds[workspaceGroupIds.length - 1];
							const beforeId = lastGroupId === void 0 ? null : reorderDropBeforeId(workspaceGroupIds, draggedGroupId, lastGroupId, true);
							setWorkspaceGroupDragId(void 0);
							setWorkspaceGroupDropTarget(void 0);
							if (beforeId !== null) setWorkspaceGroups((current) => moveWorkspaceGroup(current, draggedGroupId));
							return;
						}
						const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
						if (dragged === void 0) return;
						event.preventDefault();
						event.stopPropagation();
						setWorkspaceDragId(void 0);
						setWorkspaceDropTarget(void 0);
						setWorkspaceGroups((current) => assignWorkspaceToGroup(current, dragged));
						run("workspace-order", () => insertWorkspaceBefore(dragged));
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-collection-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dcu-wb-collection-label",
							"aria-expanded": ungroupedExpanded,
							onClick: () => {
								toggleGroup(ungroupedExpandKey, true);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-wb-section-caret",
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										viewBox: "0 0 16 16",
										width: "12",
										height: "12",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											d: "M6.25 4.25 10.25 8 6.25 11.75",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "1.5",
											strokeLinecap: "round",
											strokeLinejoin: "round"
										})
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("workspace.ungrouped") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-wb-collection-count",
									children: ungroupedGroups.length
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-collection-actions",
							"aria-hidden": "true"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DisclosureBody, {
						className: "dcu-wb-collection-body",
						open: ungroupedExpanded,
						children: ungroupedGroups.map((workspace) => {
							const workspaceId = String(workspace.workspaceId);
							const preciseTarget = workspaceDropTarget?.zone === "ungrouped" && workspaceDropTarget.ontoSection !== true && workspaceDropTarget.crossGroup !== true;
							const orderDrop = preciseTarget && workspaceDropTarget.beforeId === workspaceId;
							const orderDropAfter = preciseTarget && workspaceDropTarget.beforeId === void 0 && ungroupedGroupIds[ungroupedGroupIds.length - 1] === workspaceId;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								"data-dcu-ungrouped-member": true,
								className: `dcu-wb-group-member dcu-wb-ungrouped-member${orderDrop ? " dcu-wb-drop" : ""}${orderDropAfter ? " dcu-wb-drop dcu-wb-drop-after" : ""}`,
								onDragOverCapture: (event) => {
									const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									if (dragged === void 0) return;
									event.preventDefault();
									event.stopPropagation();
									event.dataTransfer.dropEffect = "move";
									const rect = event.currentTarget.getBoundingClientRect();
									const beforeId = reorderDropBeforeId(ungroupedGroupIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2);
									setWorkspaceDropTarget(beforeId === null ? void 0 : {
										zone: "ungrouped",
										beforeId,
										crossGroup: workspaceGroupIdFor(dragged) !== void 0
									});
								},
								onDropCapture: (event) => {
									const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									if (dragged === void 0) return;
									event.preventDefault();
									event.stopPropagation();
									const rect = event.currentTarget.getBoundingClientRect();
									const beforeId = reorderDropBeforeId(ungroupedGroupIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2);
									setWorkspaceDragId(void 0);
									setWorkspaceDropTarget(void 0);
									if (beforeId === null) return;
									if (groupedIds.has(dragged)) setWorkspaceGroups((current) => assignWorkspaceToGroup(current, dragged));
									run("workspace-order", () => insertWorkspaceBefore(dragged, beforeId));
								},
								children: renderGroup(workspace, "projects")
							}, workspaceId);
						})
					})]
				});
			};
			const treeRef = (0, react.useRef)(null);
			useSectionDisclosureMotion(treeRef);
			const sorting = workspaceDragId !== void 0 || workspaceGroupDragId !== void 0 || sessionDrag !== void 0;
			(0, react.useLayoutEffect)(() => {
				if (!wide || !sorting || treeRef.current === null) return;
				return mountWorkspaceDropIndicator(treeRef.current);
			}, [wide, sorting]);
			(0, react.useEffect)(() => {
				const current = selectedId;
				if (current === void 0 || lastRevealedSessionIdRef.current === current) return;
				const tree = {
					workspaces: workspaces.items.map((item) => ({
						workspaceId: String(item.workspaceId),
						sessionIds: item.sessionIds.map((id) => String(id))
					})),
					pinnedWorkspaceIds,
					groups: workspaceGroups.map((group) => ({
						id: group.id,
						workspaceIds: group.workspaceIds
					})),
					recentIds
				};
				if (!(tree.workspaces.some((item) => item.sessionIds.includes(current)) || tree.recentIds.includes(current))) return;
				lastRevealedSessionIdRef.current = current;
				pendingRevealScrollRef.current = true;
				setExpanded((currentExpanded) => expandedForCurrentSession(currentExpanded, current, tree));
			}, [
				pinnedWorkspaceIds,
				recentIds,
				selectedId,
				workspaceGroups,
				workspaces.items
			]);
			(0, react.useLayoutEffect)(() => {
				if (!pendingRevealScrollRef.current) return;
				pendingRevealScrollRef.current = false;
				treeRef.current?.querySelector(".dcu-wb-session.dcu-wb-selected")?.scrollIntoView?.({ block: "nearest" });
			}, [expanded]);
			if (!wide) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-wb dcu-wb-rail",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: stylesheet })
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-wb",
				"aria-label": t("workspace.label"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("style", { children: [
						stylesheet,
						runningStyles,
						typographyStyles,
						collectionLayoutStyles
					] }),
					preferencesFailure !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-error",
						role: "status",
						children: [t("workspace.preferencesLocalOnly"), businessRequestErrorKey(preferencesFailure) !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [" ", userErrorText(preferencesFailure, t)] })]
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-wb-error",
						role: "alert",
						children: t("sessions.failed", { message: error })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: treeRef,
						className: "dcu-wb-tree",
						role: "tree",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dcu-wb-section",
								"aria-label": t("workspace.pinned"),
								onDragOver: (event) => {
									if (!pinDragActive) return;
									event.preventDefault();
									event.dataTransfer.dropEffect = "move";
									if (pinnedGroups.length === 0 || event.target === event.currentTarget || event.target instanceof Element && event.target.closest(".dcu-wb-section-head") !== null) {
										const firstId = pinnedGroupIds[0];
										const beforeId = firstId === void 0 ? void 0 : reorderDropBeforeId(pinnedGroupIds, workspaceDragId, firstId, false);
										setWorkspaceDropTarget(beforeId === null ? void 0 : {
											zone: "pinned",
											beforeId
										});
									}
								},
								onDrop: (event) => {
									event.preventDefault();
									const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									const target = workspaceDropTargetRef.current;
									setWorkspaceDragId(void 0);
									setWorkspaceDropTarget(void 0);
									const drop = resolvePinnedSectionDrop(draggedWorkspace, target, pinnedGroups.length === 0);
									if (drop !== void 0) pinWorkspaceAt(drop.id, drop.beforeId);
								},
								onDragLeave: (event) => {
									if (!(event.relatedTarget instanceof Node) || event.currentTarget.contains(event.relatedTarget)) return;
									setWorkspaceDropTarget(void 0);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-wb-section-head",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dcu-wb-section-label",
										"aria-expanded": sectionOpen("pinned"),
										onClick: () => {
											toggleSection("pinned");
										},
										children: [t("workspace.pinned"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-wb-section-caret",
											"aria-hidden": "true",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
												viewBox: "0 0 16 16",
												width: "12",
												height: "12",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M6.25 4.25 10.25 8 6.25 11.75",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "1.5",
													strokeLinecap: "round",
													strokeLinejoin: "round"
												})
											})
										})]
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-wb-section-body",
									"data-open": sectionOpen("pinned"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-wb-pinned-list",
										children: [
											pinDragActive && pinnedGroups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: `dcu-wb-pin-start${pinnedHeaderDrop?.kind === "empty" ? " dcu-wb-drop" : ""}`,
												onDragOver: (event) => {
													event.preventDefault();
													event.stopPropagation();
													event.dataTransfer.dropEffect = "move";
													setWorkspaceDropTarget({
														zone: "pinned",
														beforeId: void 0
													});
												},
												onDrop: (event) => {
													event.preventDefault();
													event.stopPropagation();
													const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
													setWorkspaceDragId(void 0);
													setWorkspaceDropTarget(void 0);
													if (draggedWorkspace !== void 0) pinWorkspaceAt(draggedWorkspace);
												}
											}),
											pinnedGroups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dcu-wb-empty",
												onDragOver: (event) => {
													if (!pinDragActive) return;
													event.preventDefault();
													event.stopPropagation();
													event.dataTransfer.dropEffect = "move";
													setWorkspaceDropTarget({
														zone: "pinned",
														beforeId: void 0
													});
												},
												onDrop: (event) => {
													event.preventDefault();
													event.stopPropagation();
													const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
													setWorkspaceDragId(void 0);
													setWorkspaceDropTarget(void 0);
													if (draggedWorkspace !== void 0) pinWorkspaceAt(draggedWorkspace);
												},
												children: t("workspace.pinnedEmpty")
											}),
											pinnedGroups.map((workspace) => renderGroup(workspace, "pinned")),
											pinDragActive && pinnedGroups.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: `dcu-wb-pin-end${workspaceDropTarget?.zone === "pinned" && workspaceDropTarget.beforeId === void 0 ? " dcu-wb-drop" : ""}`,
												onDragOver: (event) => {
													if (!pinDragActive) return;
													event.preventDefault();
													event.stopPropagation();
													event.dataTransfer.dropEffect = "move";
													const lastId = pinnedGroupIds[pinnedGroupIds.length - 1];
													if (lastId === void 0 || workspaceDragId === void 0) return;
													const beforeId = reorderDropBeforeId(pinnedGroupIds, workspaceDragId, lastId, true);
													setWorkspaceDropTarget(beforeId === null ? void 0 : {
														zone: "pinned",
														beforeId
													});
												}
											})
										]
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dcu-wb-section",
								"aria-label": t("workspace.projects"),
								onDropCapture: (event) => {
									const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									if (dragged !== void 0 && projectPinned(dragged)) setPinnedWorkspaceIds((ids) => ids.filter((id) => id !== dragged));
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-wb-section-head",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dcu-wb-section-label",
										ref: projectsSectionButtonRef,
										"aria-expanded": sectionOpen("projects"),
										onClick: () => {
											toggleSection("projects");
										},
										children: [t("workspace.projects"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-wb-section-caret",
											"aria-hidden": "true",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
												viewBox: "0 0 16 16",
												width: "12",
												height: "12",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M6.25 4.25 10.25 8 6.25 11.75",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "1.5",
													strokeLinecap: "round",
													strokeLinejoin: "round"
												})
											})
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "dcu-wb-actions",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dcu-wb-more",
											"aria-label": t("workspace.createGroup"),
											title: t("workspace.createGroup"),
											onClick: (event) => {
												event.stopPropagation();
												setGroupTitleDraft("");
												setError(void 0);
												setCreateGroupOpen(true);
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateGroupIcon, {})
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dcu-wb-more",
											"aria-label": t("workspace.add"),
											title: t("workspace.add"),
											"aria-keyshortcuts": addWorkspaceShortcutAria,
											disabled: requestAddWorkspace === void 0,
											onClick: (event) => {
												event.stopPropagation();
												triggerAddWorkspace();
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AddWorkspaceIcon, {})
										})]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-wb-section-body",
									"data-open": sectionOpen("projects"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-wb-collections",
										children: [
											workspaceGroups.map(renderWorkspaceCollection),
											workspaceGroups.length > 0 && renderUngroupedCollection(),
											workspaceGroups.length === 0 && ungroupedGroups.map((workspace) => renderGroup(workspace, "projects")),
											workspaceGroups.length === 0 && ungroupedGroups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dcu-wb-empty",
												children: t("workspace.empty")
											})
										]
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dcu-wb-section",
								"aria-label": t("workspace.recent"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-wb-section-head",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dcu-wb-section-label",
										"aria-expanded": sectionOpen("recent"),
										onClick: () => {
											toggleSection("recent");
										},
										children: [t("workspace.recent"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-wb-section-caret",
											"aria-hidden": "true",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
												viewBox: "0 0 16 16",
												width: "12",
												height: "12",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M6.25 4.25 10.25 8 6.25 11.75",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "1.5",
													strokeLinecap: "round",
													strokeLinejoin: "round"
												})
											})
										})]
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-wb-section-body",
									"data-open": sectionOpen("recent"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [recentIds.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-wb-empty",
										children: t("workspace.recentEmpty")
									}), recentIds.map((id) => {
										const session = sessions.byId[id];
										if (session === void 0) return null;
										const title = session.displayTitle;
										const unread = rowUnread(id);
										const pendingInteraction = pendingInteractionForSession(id, pendingInteractions, legacyPendingInteraction(session));
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, {
											id,
											title,
											selected: selectedId === id,
											menuOpen: menu?.type === "session" && menu.id === id,
											unread,
											running: rowRunning(id, session),
											pendingInteraction,
											time: formatCompactTime(session.updatedAt, t, now),
											t,
											menuItems: sessionMenu(id),
											draggable: true,
											onDragStart: (event) => {
												event.stopPropagation();
												setWorkspaceDragId(void 0);
												setWorkspaceDropTarget(void 0);
												setWorkspaceGroupDragId(void 0);
												setWorkspaceGroupDropTarget(void 0);
												writeSessionDrag(event.dataTransfer, id, title);
												setDragPreview(event.dataTransfer, title);
												setSessionDrag({
													sessionId: id,
													workspaceId: ""
												});
											},
											onDragEnd: () => {
												setSessionDrag(void 0);
												setSessionDropTarget(void 0);
												setWorkspaceDropTarget(void 0);
												setWorkspaceGroupDropTarget(void 0);
											},
											menuPoint: menu?.type === "session" && menu.id === id && menu.x !== void 0 && menu.y !== void 0 ? {
												x: menu.x,
												y: menu.y
											} : void 0,
											onOpen: () => {
												if (openSession(id) !== false) setUnreadSessionIds((ids) => ids.filter((item) => item !== id));
											},
											onMenuChange: (open) => {
												setMenu(open ? {
													id,
													type: "session"
												} : void 0);
											},
											onArchive: () => {
												run("archive", () => archiveSession(id));
											},
											onHover: (event) => {
												const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect());
												showTip({
													kind: "session",
													id,
													title,
													time: formatHoverTime(session.updatedAt, t, now),
													left: box.left,
													top: box.top
												});
											},
											onLeave: hideTip,
											onContextMenu: (event) => {
												event.preventDefault();
												event.stopPropagation();
												dismissTip();
												setMenu({
													id,
													type: "session",
													x: event.clientX,
													y: event.clientY
												});
											},
											onSelectAction: (action) => {
												if (busy !== void 0) return;
												if (action === "rename") beginRename("session", id, title);
												if (action === "unread") {
													setUnreadSessionIds((ids) => toggleSessionId(ids, id));
													setMenu(void 0);
												}
												if (action === "archive") run("archive", () => archiveSession(id));
												if (action === "delete") {
													setDeleteTarget({
														id,
														kind: "session",
														title
													});
													setError(void 0);
													setMenu(void 0);
												}
												if (action === "fork") run("fork", () => forkSession(id));
												if (action === "copyPath") copy(session.cwd);
												if (action === "copyTitle") copy(title);
												if (action === "copyId") copy(id);
											}
										}, id);
									})] })
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspaceHoverCard, {
						t,
						onEditWorkspace: (id, title) => {
							beginRename("workspace", id, title);
						},
						onToggleWorkspacePin: (id) => {
							setPinnedWorkspaceIds((ids) => togglePinnedWorkspace(ids, id));
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: renameGroupId !== void 0,
						onClose: closeRenameGroup,
						closeLabel: t("sessions.close"),
						title: t("workspace.renameGroup"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: closeRenameGroup,
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: renameGroupDraft.trim() === "",
								onClick: submitRenameGroup,
								children: t("sessions.save")
							})]
						}),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "dcu-workspace-group-name",
								children: t("workspace.groupName")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: "dcu-workspace-group-name",
								className: "dcu-wb-rename-input",
								"aria-label": t("workspace.groupName"),
								maxLength: 80,
								value: renameGroupDraft,
								autoFocus: true,
								onFocus: (event) => {
									event.target.select();
								},
								onChange: (event) => {
									setRenameGroupDraft(event.target.value);
									setRenameGroupError(void 0);
								},
								onKeyDown: (event) => {
									if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) {
										event.preventDefault();
										submitRenameGroup();
									}
								}
							}),
							renameGroupError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "alert",
								children: t("sessions.failed", { message: renameGroupError })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: createGroupOpen,
						onClose: () => {
							setCreateGroupOpen(false);
							setGroupTitleDraft("");
							setError(void 0);
						},
						closeLabel: t("sessions.close"),
						title: t("workspace.createGroup"),
						description: t("workspace.createGroupDescription"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: () => {
									setCreateGroupOpen(false);
									setGroupTitleDraft("");
									setError(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: groupTitleDraft.trim() === "",
								onClick: submitCreateGroup,
								children: t("sessions.save")
							})]
						}),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dcu-wb-rename-input",
							"aria-label": t("workspace.groupName"),
							value: groupTitleDraft,
							autoFocus: true,
							onChange: (event) => {
								setGroupTitleDraft(event.target.value);
								setError(void 0);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) {
									event.preventDefault();
									submitCreateGroup();
								}
							}
						}), error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-wb-error",
							role: "alert",
							children: t("sessions.failed", { message: error })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: deleteGroupId !== void 0,
						onClose: () => {
							setDeleteGroupId(void 0);
						},
						closeLabel: t("sessions.close"),
						title: t("workspace.deleteGroup", { name: workspaceGroups.find((group) => group.id === deleteGroupId)?.title ?? "" }),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: () => {
									setDeleteGroupId(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								className: "dcu-wb-delete-button",
								onClick: () => {
									if (deleteGroupId !== void 0) setWorkspaceGroups((current) => deleteWorkspaceGroup(current, deleteGroupId));
									setDeleteGroupId(void 0);
								},
								children: t("workspace.deleteGroupAction")
							})]
						}),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dcu-wb-delete-copy",
							children: t("workspace.deleteGroupDescription")
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: renameTarget !== void 0,
						onClose: () => {
							setRenameTarget(void 0);
							setError(void 0);
						},
						closeLabel: t("sessions.close"),
						title: renameTarget?.kind === "workspace" ? t("workspace.rename") : t("sessions.rename"),
						description: t("sessions.renameDescription"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: () => {
									setRenameTarget(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: busy !== void 0 || renameDraft.trim() === "",
								onClick: submitRename,
								children: t("sessions.save")
							})]
						}),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dcu-wb-rename-input",
							"aria-label": renameTarget?.kind === "workspace" ? t("workspace.rename") : t("sessions.rename"),
							value: renameDraft,
							autoFocus: true,
							onFocus: (event) => {
								event.target.select();
							},
							onChange: (event) => {
								setRenameDraft(event.target.value);
								setError(void 0);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter") submitRename();
							}
						}), error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-wb-error",
							role: "alert",
							children: t("sessions.failed", { message: error })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: archiveWorkspaceTarget !== void 0,
						onClose: () => {
							if (busy !== "archive-workspace") {
								setArchiveWorkspaceTarget(void 0);
								setError(void 0);
							}
						},
						closeLabel: t("sessions.close"),
						title: t("workspace.archiveTitle", { count: archiveWorkspaceTarget?.sessionIds.length ?? 0 }),
						description: archiveWorkspaceTarget === void 0 ? void 0 : t("workspace.archiveDescription", { name: archiveWorkspaceTarget.title }),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: busy === "archive-workspace",
								onClick: () => {
									setArchiveWorkspaceTarget(void 0);
									setError(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: busy === "archive-workspace",
								onClick: submitArchiveWorkspace,
								children: t("workspace.archiveConfirm")
							})]
						}),
						children: [busy === "archive-workspace" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-wb-error",
							role: "status",
							children: t("workspace.archivePending")
						}), error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-wb-error",
							role: "alert",
							children: t("sessions.failed", { message: error })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: deleteTarget !== void 0,
						onClose: () => {
							if (busy !== "delete-workspace" && busy !== "delete-session") {
								setDeleteTarget(void 0);
								setError(void 0);
							}
						},
						closeLabel: t("sessions.close"),
						title: deleteTarget?.kind === "session" ? t("sessions.delete") : t("workspace.delete"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: busy === "delete-workspace" || busy === "delete-session",
								onClick: () => {
									setDeleteTarget(void 0);
									setError(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								className: "dcu-wb-delete-button",
								disabled: busy === "delete-workspace" || busy === "delete-session",
								onClick: submitDelete,
								children: deleteTarget?.kind === "session" ? t("sessions.delete") : t("workspace.delete")
							})]
						}),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dcu-wb-delete-copy",
								children: deleteTarget === void 0 ? "" : deleteTarget.kind === "session" ? t("sessions.deleteDescription", { name: deleteTarget.title }) : t("workspace.deleteDescription", { name: deleteTarget.title })
							}),
							busy === "delete-workspace" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "status",
								children: t("workspace.deletePending")
							}),
							busy === "delete-session" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "status",
								children: t("sessions.deletePending")
							}),
							error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "alert",
								children: t("sessions.failed", { message: error })
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
			"workspace.addFailed": "无法添加工作区",
			"workspace.add": "添加工作区",
			"workspace.retry": "重试",
			"workspace.chooseAgain": "重新选择",
			"home.resizeInput": "拖动调整输入区宽度",
			"home.projectSearch": "搜索项目",
			"home.projectEmpty": "没有匹配的项目",
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
			"sidebar.label": "DSH 导航",
			"sidebar.expand": "展开侧边栏",
			"sidebar.collapse": "收缩侧边栏",
			"sidebar.newTask": "新建任务",
			"sidebar.search": "搜索会话",
			"sidebar.mainMenu": "主菜单",
			"sidebar.extensions": "扩展管理",
			"sidebar.experts": "专家",
			"sidebar.skills": "技能",
			"sidebar.plugins": "插件管理",
			"sidebar.marketplace": "插件市场",
			"sidebar.builtinPlugins": "内置插件",
			"search.placeholder": "搜索会话、设置和操作",
			"search.empty": "没有匹配的结果。",
			"search.sessions": "会话",
			"search.settings": "设置",
			"search.actions": "快捷操作",
			"workspace.label": "工作区会话",
			"workspace.pinned": "置顶",
			"workspace.pinnedEmpty": "拖动项目到此处置顶",
			"workspace.projects": "项目",
			"workspace.ungrouped": "未分组",
			"workspace.createGroup": "新建分组",
			"workspace.createGroupDescription": "输入分组名称，项目不会自动移动。",
			"workspace.groupName": "分组名称",
			"workspace.moveToGroup": "移动到分组",
			"workspace.removeFromGroup": "移至未分组",
			"workspace.deleteGroup": "删除分组“{name}”",
			"workspace.deleteGroupAction": "删除分组",
			"workspace.deleteGroupDescription": "删除分组只会将其中项目移至未分组，不会删除项目或会话。",
			"workspace.groupActions": "分组“{name}”的操作",
			"workspace.renameGroup": "重命名分组",
			"workspace.recent": "最近",
			"workspace.recentEmpty": "无聊天",
			"workspace.noChat": "暂无聊天",
			"workspace.showMore": "展开显示",
			"workspace.empty": "暂无项目",
			"workspace.newSession": "新建会话",
			"workspace.rename": "重命名项目",
			"workspace.pin": "置顶项目",
			"workspace.unpin": "取消置顶",
			"workspace.archive": "归档所有会话",
			"workspace.archiveTitle": "归档 {count} 个会话？",
			"workspace.archiveDescription": "这会归档“{name}”中的全部会话，项目和文件夹仍会保留。",
			"workspace.archiveConfirm": "全部归档",
			"workspace.archivePending": "正在归档会话…",
			"workspace.delete": "移除项目",
			"workspace.deleteDescription": "将把“{name}”从项目列表中移除。文件夹和会话记录会保留。",
			"workspace.deletePending": "正在移除项目…",
			"workspace.actions": "{name} 的项目操作",
			"workspace.taskCount": "{count} 个任务",
			"workspace.taskSummary": "{count} 个任务 · {unreadCount} 条未读",
			"workspace.edit": "重命名项目",
			"sessions.close": "关闭",
			"sessions.cancel": "取消",
			"sessions.save": "保存",
			"sessions.failed": "操作失败：{message}",
			"sessions.unknown": "找不到该会话。",
			"sessions.actions": "{name} 的会话操作",
			"sessions.markUnread": "标记为未读",
			"sessions.markRead": "标记为已读",
			"sessions.unread": "未读",
			"sessions.waitingAnswer": "等待回答",
			"sessions.waitingApproval": "等待审批",
			"sessions.planReview": "计划待审",
			"sessions.rename": "重命名会话",
			"sessions.renameDescription": "保持简短且易于识别",
			"sessions.renameInvalid": "会话名称无效，请修改后重试。",
			"sessions.renameFailed": "暂时无法重命名该会话，请稍后重试。",
			"sessions.archive": "归档会话",
			"sessions.archiveFailed": "暂时无法归档该会话，请稍后重试。",
			"sessions.delete": "删除会话",
			"sessions.deleteDescription": "将永久删除会话“{name}”及其全部记录，此操作不可恢复。",
			"sessions.deletePending": "正在删除会话…",
			"sessions.deleteUnavailable": "未安装或无法连接归档管理插件。",
			"sessions.deleteFailed": "暂时无法删除该会话，请稍后重试。",
			"sessions.fork": "在新会话中继续",
			"sessions.forkUnavailable": "当前会话暂时无法在新会话中继续，请等待本轮结束后重试。",
			"sessions.forkFailed": "暂时无法创建新会话，请稍后重试。",
			"sessions.copyPath": "复制工作目录",
			"sessions.copyTitle": "复制会话标题",
			"sessions.copyId": "复制会话 ID",
			"about.nav": "Codex UI",
			"about.title": "Codex UI",
			"about.viewProject": "GitHub",
			"about.feedback": "问题反馈",
			"about.checkUpdate": "检查更新",
			"about.checking": "正在检查更新…",
			"about.description": "为 DSH 提供 Codex 风格的侧栏、工作区会话管理、搜索与会话轮次导航。",
			"about.features": "基本功能",
			"about.feature.sidebar": "Codex 风格侧栏、全局会话搜索与设置入口",
			"about.feature.search": "通过顶部搜索快速定位会话、设置页面和新建任务等快捷操作",
			"about.feature.workspace": "项目文件夹可展开、折叠、拖拽排序和置顶，并保留原生工作区能力",
			"about.feature.sessions": "会话支持重命名、置顶、未读标记、归档、删除及右键快捷操作",
			"about.feature.conversation": "保留原生消息、工具调用、输入、权限和模型选择，仅调整容器视觉",
			"about.feature.navigator": "当前会话提供轮次缩略导航，可快速跳转至每一次用户提问",
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
			"time.justNow": "刚刚",
			"time.justNowShort": "刚刚",
			"time.minutes": "{count}分",
			"time.hours": "{count}小时",
			"time.days": "{count}天",
			"time.weeks": "{count}周",
			"time.months": "{count}个月",
			"time.years": "{count}年",
			"errors.unauthorized": "请先登录 DSH，再重试。",
			"errors.forbidden": "请求被安全检查拒绝，请从可信的 DSH 地址重试。",
			"errors.serviceUnavailable": "服务暂不可用，请稍后重试。",
			"workspace.preferencesLocalOnly": "项目偏好尚未同步，当前使用本地缓存。",
			"errors.generic": "操作未完成，请重试。",
			"errors.groupInvalid": "分组信息无效。",
			"errors.workspaceInvalid": "项目标识无效。",
			"errors.groupMissing": "目标分组不存在。",
			"errors.orderAnchorMissing": "排序位置已失效，请重试。",
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
			"workspace.addFailed": "Could not add workspace",
			"workspace.add": "Add workspace",
			"workspace.retry": "Retry",
			"workspace.chooseAgain": "Choose again",
			"home.resizeInput": "Drag to resize the input area",
			"home.projectSearch": "Search projects",
			"home.projectEmpty": "No matching projects",
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
			"sidebar.label": "DSH navigation",
			"sidebar.expand": "Expand sidebar",
			"sidebar.collapse": "Collapse sidebar",
			"sidebar.newTask": "New task",
			"sidebar.search": "Search conversations",
			"sidebar.mainMenu": "Main menu",
			"sidebar.extensions": "Extensions",
			"sidebar.experts": "Experts",
			"sidebar.skills": "Skills",
			"sidebar.plugins": "Plugin manager",
			"sidebar.marketplace": "Plugin Market",
			"sidebar.builtinPlugins": "Built-in plugins",
			"search.placeholder": "Search conversations, settings, and actions",
			"search.empty": "No matching results.",
			"search.sessions": "Conversations",
			"search.settings": "Settings",
			"search.actions": "Quick actions",
			"workspace.label": "Workspace conversations",
			"workspace.projects": "Projects",
			"workspace.ungrouped": "Ungrouped",
			"workspace.createGroup": "Create group",
			"workspace.createGroupDescription": "Enter a group name. Projects will not move automatically.",
			"workspace.groupName": "Group name",
			"workspace.moveToGroup": "Move to group",
			"workspace.removeFromGroup": "Move to ungrouped",
			"workspace.deleteGroup": "Delete group {name}",
			"workspace.deleteGroupAction": "Delete group",
			"workspace.deleteGroupDescription": "Deleting this group moves its projects to Ungrouped. It does not delete projects or conversations.",
			"workspace.groupActions": "Actions for group {name}",
			"workspace.renameGroup": "Rename group",
			"workspace.recent": "Recents",
			"workspace.recentEmpty": "No chats",
			"workspace.noChat": "No chats",
			"workspace.showMore": "Show more",
			"workspace.empty": "No projects",
			"workspace.newSession": "New conversation",
			"workspace.rename": "Rename project",
			"workspace.pin": "Pin project",
			"workspace.unpin": "Unpin",
			"workspace.archive": "Archive all conversations",
			"workspace.archiveTitle": "Archive {count} conversations?",
			"workspace.archiveDescription": "This archives every conversation in “{name}”. The project and folder remain available.",
			"workspace.archiveConfirm": "Archive all",
			"workspace.archivePending": "Archiving conversations…",
			"workspace.pinned": "Pinned",
			"workspace.pinnedEmpty": "Drag a project here to pin it",
			"workspace.delete": "Remove project",
			"workspace.deleteDescription": "This removes “{name}” from the project list. The folder and conversation records remain.",
			"workspace.deletePending": "Removing project…",
			"workspace.actions": "Project actions for {name}",
			"workspace.taskCount": "{count} tasks",
			"workspace.taskSummary": "{count} tasks · {unreadCount} unread",
			"workspace.edit": "Rename project",
			"sessions.close": "Close",
			"sessions.cancel": "Cancel",
			"sessions.save": "Save",
			"sessions.failed": "Action failed: {message}",
			"sessions.unknown": "Conversation not found.",
			"sessions.actions": "Conversation actions for {name}",
			"sessions.markUnread": "Mark as unread",
			"sessions.markRead": "Mark as read",
			"sessions.unread": "Unread",
			"sessions.waitingAnswer": "Waiting for answer",
			"sessions.waitingApproval": "Waiting for approval",
			"sessions.planReview": "Plan awaiting review",
			"sessions.rename": "Rename conversation",
			"sessions.renameDescription": "Keep it short and easy to recognize.",
			"sessions.renameInvalid": "The conversation name is invalid. Change it and try again.",
			"sessions.renameFailed": "The conversation could not be renamed. Try again later.",
			"sessions.archive": "Archive conversation",
			"sessions.archiveFailed": "The conversation could not be archived. Try again later.",
			"sessions.delete": "Delete conversation",
			"sessions.deleteDescription": "This permanently deletes “{name}” and all of its records. This cannot be undone.",
			"sessions.deletePending": "Deleting conversation…",
			"sessions.deleteUnavailable": "The archive manager plugin is not installed or unavailable.",
			"sessions.deleteFailed": "The conversation could not be deleted. Try again later.",
			"sessions.fork": "Continue in new conversation",
			"sessions.forkUnavailable": "This conversation cannot be continued in a new conversation right now. Try again after the current turn finishes.",
			"sessions.forkFailed": "A new conversation could not be created. Try again later.",
			"sessions.copyPath": "Copy working directory",
			"sessions.copyTitle": "Copy conversation title",
			"sessions.copyId": "Copy conversation ID",
			"about.nav": "Codex UI",
			"about.title": "Codex UI",
			"about.viewProject": "GitHub",
			"about.feedback": "Issues",
			"about.checkUpdate": "Check for updates",
			"about.checking": "Checking…",
			"about.description": "Adds a Codex-style sidebar, workspace conversation management, search, and turn navigation to DSH.",
			"about.features": "Core features",
			"about.feature.sidebar": "Codex-style sidebar, global conversation search, and settings entry points",
			"about.feature.search": "Find conversations, settings pages, and quick actions from the top search panel",
			"about.feature.workspace": "Expand, collapse, reorder, and pin workspace folders while retaining native workspace behavior",
			"about.feature.sessions": "Rename, pin, mark unread, archive, delete, or use context actions for conversations",
			"about.feature.conversation": "Keeps native messages, tool calls, composer, permissions, and model selection while refining the container visuals",
			"about.feature.navigator": "Navigate directly to each user prompt with the current conversation turn navigator",
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
			"time.justNow": "Just now",
			"time.justNowShort": "now",
			"time.minutes": "{count}m",
			"time.hours": "{count}h",
			"time.days": "{count}d",
			"time.weeks": "{count}w",
			"time.months": "{count}mo",
			"time.years": "{count}y",
			"errors.unauthorized": "Sign in to DSH, then try again.",
			"errors.forbidden": "The security check rejected this request. Try again from a trusted DSH address.",
			"errors.serviceUnavailable": "The service is unavailable. Try again later.",
			"workspace.preferencesLocalOnly": "Workspace preferences are not synced. Using the local cache.",
			"errors.generic": "The action could not be completed. Try again.",
			"errors.groupInvalid": "The group information is invalid.",
			"errors.workspaceInvalid": "The project identifier is invalid.",
			"errors.groupMissing": "The target group no longer exists.",
			"errors.orderAnchorMissing": "The target position is no longer available. Try again.",
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
		const HIDDEN_FOOTER_ACTION_IDS = /* @__PURE__ */ new Set(["context-overview"]);
		function visibleFooterActions(slots) {
			return slots.entriesOfSlot("sidebar.footer.action").flatMap(({ options }) => {
				const id = options.id;
				if (id === void 0 || HIDDEN_FOOTER_ACTION_IDS.has(id)) return [];
				return [{
					id,
					order: options.order ?? 0
				}];
			}).sort((left, right) => left.order - right.order);
		}
		function sameFooterActions(left, right) {
			return left.length === right.length && left.every((action, index) => {
				const previous = right[index];
				return previous !== void 0 && action.id === previous.id && action.order === previous.order;
			});
		}
		/** 给 React useSyncExternalStore 用的底部动作快照；按 slot id 过滤，不靠 DOM class。 */
		function createFooterActionSource(slots) {
			let cached = [];
			return {
				getSnapshot() {
					const next = visibleFooterActions(slots);
					if (sameFooterActions(next, cached)) return cached;
					cached = next;
					return cached;
				},
				subscribe(listener) {
					return slots.subscribe("sidebar.footer.action", listener);
				}
			};
		}
		//#endregion
		//#region src/client/slot-mirror.tsx
		const bridges = /* @__PURE__ */ new WeakMap();
		const wrappers = /* @__PURE__ */ new WeakMap();
		function withSlotAliases(Component, aliases) {
			if (typeof Component !== "function" && (typeof Component !== "object" || Component === null)) return Component;
			const pairs = Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b));
			if (pairs.length === 0) return Component;
			const signature = JSON.stringify(pairs);
			let cached = wrappers.get(Component);
			if (!cached) wrappers.set(Component, cached = /* @__PURE__ */ new Map());
			const previous = cached.get(signature);
			if (previous) return previous;
			const map = new Map(pairs);
			function SlotAliases(props) {
				const face = props;
				const renderSlot = (0, react.useMemo)(() => face.renderSlot && ((key, ...args) => face.renderSlot(map.get(key) ?? key, ...args)), [face.renderSlot]);
				const renderSlotChain = (0, react.useMemo)(() => face.renderSlotChain && ((key, ...args) => face.renderSlotChain(map.get(key) ?? key, ...args)), [face.renderSlotChain]);
				return (0, react.createElement)(Component, {
					...props,
					...renderSlot && { renderSlot },
					...renderSlotChain && { renderSlotChain }
				});
			}
			SlotAliases.displayName = Component.displayName;
			cached.set(signature, SlotAliases);
			return SlotAliases;
		}
		/**
		* Mirror effective contributions into a predeclared, exclusive root-scope alias.
		* Supports single/list/keyed; chain and session scopes are deliberately rejected.
		* The parent owns the top-level alias declaration and must call the returned disposer
		* on unmount. Source declarations/entries are never changed. Children get new declarations.
		*/
		function mirrorSlot(ctx, source, target) {
			const slots = ctx.slots;
			const readSpec = slots.spec.bind(slots);
			const register = slots.register.bind(slots);
			const validate = (spec) => {
				if (spec.scope !== "root" || ![
					"single",
					"list",
					"keyed"
				].includes(spec.kind)) throw new Error("slot mirror supports only root single/list/keyed slots");
			};
			const install = (from, to, ancestors) => {
				if (from === to || ancestors.has(from)) throw new Error("recursive slot mirror");
				let graph = bridges.get(ctx);
				if (!graph) bridges.set(ctx, graph = /* @__PURE__ */ new Map());
				let cursor = from;
				while (cursor !== void 0) {
					if (cursor === to) throw new Error("recursive slot mirror");
					cursor = graph.get(cursor);
				}
				if (graph.has(to)) throw new Error(`mirror target '${to}' already has a bridge`);
				const targetSpec = readSpec(to);
				if (!targetSpec) throw new Error(`mirror target '${to}' must be declared by its parent`);
				validate(targetSpec);
				const branch = new Set(ancestors).add(from);
				const active = /* @__PURE__ */ new Map();
				let stopped = false;
				const clear = () => {
					for (const remove of active.values()) remove();
					active.clear();
				};
				graph.set(to, from);
				const stop = () => {
					if (stopped) return;
					stopped = true;
					unsubSource();
					unsubTarget();
					graph.delete(to);
					clear();
				};
				const sync = () => {
					if (stopped) return;
					if (!readSpec(to)) {
						stop();
						return;
					}
					const spec = readSpec(from);
					if (spec) {
						validate(spec);
						if (spec.kind !== targetSpec.kind) throw new Error("slot mirror kind mismatch");
					}
					const entries = slots.entriesOfSlot(from);
					for (const [entry, remove] of active) if (!entries.includes(entry)) {
						remove();
						active.delete(entry);
					}
					for (const entry of entries) {
						if (active.has(entry)) continue;
						const aliases = Object.create(null);
						const children = Object.create(null);
						for (const [child, childSpec] of Object.entries(entry.children ?? {})) {
							validate(childSpec);
							if (branch.has(child)) throw new Error("recursive slot mirror");
							const alias = `${to}.${encodeURIComponent(child)}`;
							if (readSpec(alias)) throw new Error(`mirror child alias '${alias}' is already declared`);
							aliases[child] = alias;
							children[alias] = childSpec;
						}
						const removes = [];
						try {
							removes.push(register({
								name: to,
								...entry.options,
								inject: entry.inject,
								store: entry.store,
								locale: entry.locale,
								registrant: entry.registrant,
								...entry.children && { children }
							}, withSlotAliases(entry.component, aliases)));
							for (const [child, alias] of Object.entries(aliases)) removes.push(install(child, alias, branch));
							active.set(entry, () => {
								for (const remove of removes.reverse()) remove();
							});
						} catch (error) {
							for (const remove of removes.reverse()) remove();
							throw error;
						}
					}
				};
				const safeSync = () => {
					try {
						sync();
					} catch (error) {
						console.warn(`[michengai-codex-ui] slot-mirror sync error on '${from}' -> '${to}':`, error);
						stop();
					}
				};
				const unsubSource = slots.subscribe(from, safeSync);
				const unsubTarget = slots.subscribe(to, safeSync);
				try {
					sync();
				} catch (error) {
					stop();
					throw error;
				}
				return stop;
			};
			const start = () => install(source, target, /* @__PURE__ */ new Set());
			return ctx.effect ? ctx.effect(start) : start();
		}
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
		//#region src/client/settings-skin/SettingsNavHeader.tsx
		let isSkinEnabled = true;
		const skinStateListeners = /* @__PURE__ */ new Set();
		function setSkinEnabledState(enabled) {
			if (isSkinEnabled !== enabled) {
				isSkinEnabled = enabled;
				skinStateListeners.forEach((fn) => fn(enabled));
			}
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

/* 左侧整列侧栏：240px 宽度 */
[data-shortcut-modal="settings"] > nav {
  box-sizing: border-box !important;
  width: 240px !important;
  min-width: 240px !important;
  max-width: 240px !important;
  flex-shrink: 0 !important;
  gap: 12px !important;
  padding: 16px 10px 24px !important;
  border-right: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08)) !important;
  background: var(--dsw-alias-bg-layer-1, #121214) !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

/* 顶部标题与搜索区插槽容器 */
[data-shortcut-modal="settings"] > nav > :first-child {
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  flex: none !important;
}

/* 顶部标题与返回栏 */
.dcu-settings-nav-header-top {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  height: 28px !important;
  padding: 0 2px !important;
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
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  letter-spacing: -0.01em !important;
  user-select: none !important;
}

/* 搜索框容器与输入框：对齐原生 Codex 风格 */
.dcu-settings-search-wrapper {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
}

.dcu-settings-search-icon {
  position: absolute !important;
  left: 9px !important;
  width: 14px !important;
  height: 14px !important;
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  pointer-events: none !important;
}

.dcu-settings-search-input {
  width: 100% !important;
  height: 32px !important;
  padding: 0 26px 0 28px !important;
  border-radius: var(--dsw-radius-sm, 6px) !important;
  border: 1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.08)) !important;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.05)) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  font-size: 13px !important;
  box-sizing: border-box !important;
  outline: none !important;
  transition: border-color 0.12s ease, background-color 0.12s ease !important;
}

.dcu-settings-search-input::placeholder {
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  font-size: 13px !important;
}

.dcu-settings-search-input:focus {
  border-color: var(--dsw-alias-state-focus-ring, var(--dsw-static-deepseek-500, #4176e6)) !important;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.08)) !important;
}

.dcu-settings-search-clear {
  position: absolute !important;
  right: 6px !important;
  width: 18px !important;
  height: 18px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  background: transparent !important;
  border: none !important;
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  cursor: pointer !important;
}

.dcu-settings-search-clear:hover {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
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
		* 对宿主动态生成的菜单按钮执行无侵入的已知项分组与搜索过滤
		*/
		function decorateSettingsNav(panelEl) {
			const navHeader = panelEl.querySelector("nav > :first-child");
			const navList = panelEl.querySelector("nav > :nth-child(2)");
			if (!navList) return () => {};
			const isZh = (document.documentElement.lang || "zh").startsWith("zh");
			const titleText = isZh ? zh["settings.title"] : en["settings.title"];
			const backText = isZh ? zh["settings.back"] : en["settings.back"];
			const searchText = isZh ? zh["settings.search"] : en["settings.search"];
			let cleanHeader = () => {};
			if (navHeader && !navHeader.querySelector(".dcu-settings-nav-header-root")) {
				const originalChildren = Array.from(navHeader.childNodes);
				originalChildren.forEach((child) => {
					if (child instanceof HTMLElement) child.style.display = "none";
				});
				const headerRoot = document.createElement("div");
				headerRoot.className = "dcu-settings-nav-header-root";
				const topRow = document.createElement("div");
				topRow.className = "dcu-settings-nav-header-top";
				const backBtn = document.createElement("button");
				backBtn.type = "button";
				backBtn.className = "dcu-settings-back-btn";
				backBtn.setAttribute("aria-label", backText);
				backBtn.setAttribute("title", backText);
				backBtn.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m12 19-7-7 7-7\"/><path d=\"M19 12H5\"/></svg>";
				backBtn.onclick = () => {
					const closeBtn = panelEl.querySelector("button[class*=\"close\"]");
					if (closeBtn) closeBtn.click();
					else window.dispatchEvent(new KeyboardEvent("keydown", {
						key: "Escape",
						code: "Escape",
						bubbles: true
					}));
				};
				const titleSpan = document.createElement("span");
				titleSpan.className = "dcu-settings-nav-header-title";
				titleSpan.textContent = titleText;
				topRow.appendChild(backBtn);
				topRow.appendChild(titleSpan);
				const searchWrapper = document.createElement("div");
				searchWrapper.className = "dcu-settings-search-wrapper";
				searchWrapper.innerHTML = "<svg class=\"dcu-settings-search-icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/></svg>";
				const searchInput = document.createElement("input");
				searchInput.type = "text";
				searchInput.className = "dcu-settings-search-input";
				searchInput.placeholder = searchText;
				searchInput.setAttribute("aria-label", searchText);
				searchInput.value = getNavSearchQuery();
				const clearBtn = document.createElement("button");
				clearBtn.type = "button";
				clearBtn.className = "dcu-settings-search-clear";
				clearBtn.setAttribute("aria-label", "清空搜索");
				clearBtn.style.display = searchInput.value ? "inline-flex" : "none";
				clearBtn.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/></svg>";
				searchInput.oninput = () => {
					setNavSearchQuery(searchInput.value);
					clearBtn.style.display = searchInput.value ? "inline-flex" : "none";
				};
				clearBtn.onclick = () => {
					searchInput.value = "";
					setNavSearchQuery("");
					clearBtn.style.display = "none";
					searchInput.focus();
				};
				searchWrapper.appendChild(searchInput);
				searchWrapper.appendChild(clearBtn);
				headerRoot.appendChild(topRow);
				headerRoot.appendChild(searchWrapper);
				navHeader.appendChild(headerRoot);
				cleanHeader = () => {
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
			style.textContent = `[data-phase=hero]:has([data-conversation-scroll]){position:relative}[data-dcu-width-handle]{position:absolute;top:0;bottom:0;width:32px;padding:0;border:0;background:transparent;cursor:col-resize;touch-action:none;z-index:8;outline-offset:-5px}[data-dcu-width-handle=left]{right:calc(50% + var(--dsh-chat-content-width) / 2 + 16px)}[data-dcu-width-handle=right]{left:calc(50% + var(--dsh-chat-content-width) / 2 + 16px)}[data-dcu-width-handle]::after{content:'';position:absolute;top:calc(var(--dcu-pointer-y,50%) - 50px);height:100px;width:3px;left:14px;border-radius:3px;background:linear-gradient(transparent,var(--dsw-alias-scrollbar-hover-l1,#888),transparent);opacity:0}[data-dcu-width-handle]:hover::after,[data-dcu-width-handle]:focus-visible::after,[data-dcu-width-handle][data-dragging]::after{opacity:1}[data-phase=hero]:has([data-conversation-composer-overlay]) [data-dcu-width-handle]{display:none}`;
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
						const raw = getComputedStyle(root).getPropertyValue("--dsh-chat-user-width");
						return clamp(parseFloat(raw) || 640);
					};
					const publish = (width, save) => {
						const value = clamp(width);
						root.style.setProperty("--dsh-chat-user-width", `${value}px`);
						if (save) try {
							localStorage.setItem("dsh.conversation.contentWidth", String(value));
						} catch (error) {
							console.warn("[codex-ui] 无法保存输入区宽度。", error);
						}
					};
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
		//#region src/client/composer/composer-tool-menus.ts
		/** 只适配由输入区工具触发的菜单；保留原条目、选择回调及目录创建流程。 */
		const TOOL = "[class*=\"_heroWorkspaceRow\"] button,[data-composer-card] button[aria-haspopup],[data-composer-card] button[aria-expanded]";
		const MENU = "[role=\"menu\"],[role=\"listbox\"]";
		const COMPOSER_TOOL_MENU_STYLE = `
[class*="_heroWorkspaceRow"] button{min-height:28px;border-radius:999px;font-size:13px;line-height:20px}
[class*="_heroWorkspaceRow"] button:hover,[class*="_heroWorkspaceRow"] button[aria-expanded=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]){box-sizing:border-box;max-height:var(--dcu-tool-menu-height,360px)!important;padding:5px!important;border-radius:18px!important;background:#fff!important;color:var(--dsw-alias-label-primary);box-shadow:0 8px 32px #0002,0 0 0 1px #0000000a!important;display:flex;flex-direction:column;gap:0;z-index:1100}
/* 原生菜单保留宿主宽度约束；Git 弹窗沿用独立尺寸，避免观察器标记前后跳变。 */
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover])[data-gitgraph-popover]{min-width:0!important;width:262px;max-width:calc(100vw - 24px)}
:is([data-dcu-tool-menu=inline],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal]))[data-gitgraph-popover]{width:320px}
[data-dcu-tool-menu=portal]{position:fixed!important;left:var(--dcu-tool-menu-x)!important;top:var(--dcu-tool-menu-y)!important;bottom:auto!important;right:auto!important}
:is([data-dcu-tool-menu=inline],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal])){translate:var(--dcu-tool-menu-shift,0px) 0}
[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal]){top:auto!important;bottom:calc(100% + 4px)!important}
body[data-ds-dark-theme] :is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]){background:#292929!important;box-shadow:0 8px 32px #0003,0 0 0 1px #ffffff08!important}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover])>[class*="_viewport"]{min-height:0;max-height:none;overflow-y:auto;scrollbar-width:thin}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) :is([role=menuitem],[role=menuitemradio],[role=menuitemcheckbox],[role=option]){box-sizing:border-box;min-height:28px;padding:4px 9px;gap:8px;border-radius:8px;font-size:13px;line-height:20px}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) :is([role=menuitem],[role=menuitemradio],[role=option]):hover:not(:disabled),:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_selected"],:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [aria-selected=true],:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [aria-checked=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_itemIcon"] svg{width:16px;height:16px}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_footer"]{flex:none;margin-top:5px;padding-top:5px;border-top:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
[data-dcu-tool-filter]{box-sizing:border-box;flex:none;width:100%;height:32px;padding:4px 10px;margin:0 0 1px;border:0;border-radius:8px;outline:none;background:transparent;color:inherit;font:13px/20px var(--dsw-font-family)}
[data-dcu-tool-filter]:focus-visible{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent)}
[data-dcu-tool-empty]{padding:8px 10px;font-size:13px;color:var(--dsw-alias-label-secondary)}
[data-dcu-tool-filtered]{display:none!important}
/* 建议菜单单独换肤：外框跟随宿主输入区，保留宿主定位和动态高度，不给内部列表套固定宽度。 */
[data-conversation-scroll] [data-trigger-menu]{box-sizing:border-box;left:0;right:0;width:auto;min-width:0;max-width:none;padding:5px;border-radius:18px;background:#fff;box-shadow:0 8px 32px #0002,0 0 0 1px #0000000a}
body[data-ds-dark-theme] [data-conversation-scroll] [data-trigger-menu]{background:#292929;box-shadow:0 8px 32px #0003,0 0 0 1px #ffffff08}
[data-conversation-scroll] [data-trigger-menu]>[role=listbox]{box-sizing:border-box;width:100%;min-width:0;align-self:stretch;scrollbar-width:thin}
[data-conversation-scroll] [data-trigger-menu] [role=option]{box-sizing:border-box;width:100%;min-width:0;min-height:28px;padding:4px 9px;gap:8px;border-radius:8px;font-size:13px;line-height:20px}
[data-conversation-scroll] [data-trigger-menu] [role=option][aria-selected=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
`;
		function observeComposerToolMenus(copy) {
			let anchor;
			let known = /* @__PURE__ */ new Set();
			let pendingUntil = 0;
			const mounted = /* @__PURE__ */ new Map();
			const now = () => Date.now();
			function capture(event) {
				const target = event.target instanceof Element ? event.target.closest(TOOL) : null;
				if (target === null || target.closest("[data-conversation-scroll]") === null) return;
				anchor = target;
				known = new Set(document.querySelectorAll(MENU));
				pendingUntil = now() + 1e3;
			}
			function mount(menu, trigger) {
				const portal = getComputedStyle(menu).position === "fixed";
				menu.setAttribute("data-dcu-tool-menu", portal ? "portal" : "inline");
				const isProject = trigger.matches("[class*=\"_heroWorkspaceRow\"]>button:first-child");
				const viewport = menu.querySelector(":scope>[class*=\"_viewport\"]");
				let input;
				let empty;
				if (isProject && viewport !== null && menu.querySelector("input") === null) {
					input = document.createElement("input");
					input.type = "search";
					input.placeholder = copy.search;
					input.setAttribute("aria-label", copy.search);
					input.setAttribute("data-dcu-tool-filter", "");
					empty = document.createElement("div");
					empty.setAttribute("data-dcu-tool-empty", "");
					empty.setAttribute("role", "status");
					empty.textContent = copy.empty;
					empty.hidden = true;
					menu.prepend(input);
					viewport.after(empty);
					input.addEventListener("input", () => {
						const query = input.value.trim().toLocaleLowerCase();
						let count = 0;
						for (const row of viewport.children) {
							const match = (row.textContent ?? "").toLocaleLowerCase().includes(query);
							row.toggleAttribute("data-dcu-tool-filtered", !match);
							if (match) count++;
						}
						empty.hidden = count > 0;
						place();
					});
					input.addEventListener("keydown", (event) => {
						if (event.key !== "ArrowDown" && event.key !== "Enter") return;
						const first = viewport.querySelector(":scope>:not([data-dcu-tool-filtered]) button:not(:disabled)");
						if (first !== null) {
							event.preventDefault();
							event.stopPropagation();
							first.focus();
							if (event.key === "Enter") first.click();
						}
					});
				}
				function place() {
					if (!trigger.isConnected || !menu.isConnected) return;
					const rect = trigger.getBoundingClientRect();
					const above = rect.top - 16;
					const below = window.innerHeight - rect.bottom - 16;
					const topSide = above >= Math.min(260, below);
					menu.style.setProperty("--dcu-tool-menu-height", `${Math.max(60, Math.min(360, topSide ? above : below))}px`);
					if (!portal) {
						const previous = parseFloat(menu.style.getPropertyValue("--dcu-tool-menu-shift")) || 0;
						const bounds = menu.getBoundingClientRect();
						const naturalLeft = bounds.left - previous;
						const left = Math.max(12, Math.min(naturalLeft, window.innerWidth - bounds.width - 12));
						menu.style.setProperty("--dcu-tool-menu-shift", `${left - naturalLeft}px`);
						return;
					}
					const bounds = menu.getBoundingClientRect();
					const x = Math.max(12, Math.min(rect.left, window.innerWidth - bounds.width - 12));
					const y = Math.max(12, topSide ? rect.top - bounds.height - 4 : rect.bottom + 4);
					menu.style.setProperty("--dcu-tool-menu-x", `${x}px`);
					menu.style.setProperty("--dcu-tool-menu-y", `${y}px`);
				}
				const resize = new ResizeObserver(place);
				resize.observe(menu);
				resize.observe(trigger);
				window.addEventListener("resize", place);
				window.addEventListener("scroll", place, true);
				place();
				mounted.set(menu, () => {
					resize.disconnect();
					window.removeEventListener("resize", place);
					window.removeEventListener("scroll", place, true);
					input?.remove();
					empty?.remove();
					menu.querySelectorAll("[data-dcu-tool-filtered]").forEach((row) => row.removeAttribute("data-dcu-tool-filtered"));
					menu.removeAttribute("data-dcu-tool-menu");
					for (const property of [
						"--dcu-tool-menu-x",
						"--dcu-tool-menu-y",
						"--dcu-tool-menu-height",
						"--dcu-tool-menu-shift"
					]) menu.style.removeProperty(property);
				});
			}
			let syncFrame;
			function syncNow() {
				syncFrame = void 0;
				for (const [menu, dispose] of mounted) if (!menu.isConnected) {
					dispose();
					mounted.delete(menu);
				}
				if (anchor === void 0 || now() > pendingUntil) return;
				for (const menu of document.querySelectorAll(MENU)) {
					if (menu.closest("[data-trigger-menu]") !== null) continue;
					if (known.has(menu) || mounted.has(menu) || menu.parentElement?.closest(MENU) !== null) continue;
					if (menu.getClientRects().length === 0) continue;
					mount(menu, anchor);
					pendingUntil = 0;
					break;
				}
			}
			function scheduleSync() {
				if (anchor === void 0 || now() > pendingUntil) {
					for (const [menu, dispose] of mounted) if (!menu.isConnected) {
						dispose();
						mounted.delete(menu);
					}
					return;
				}
				if (syncFrame !== void 0) return;
				syncFrame = window.requestAnimationFrame(syncNow);
			}
			const observer = new MutationObserver(scheduleSync);
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			document.addEventListener("pointerdown", capture, true);
			document.addEventListener("keydown", captureKey, true);
			function captureKey(event) {
				if ([
					"Enter",
					" ",
					"ArrowDown"
				].includes(event.key)) capture(event);
			}
			return () => {
				if (syncFrame !== void 0) window.cancelAnimationFrame(syncFrame);
				observer.disconnect();
				document.removeEventListener("pointerdown", capture, true);
				document.removeEventListener("keydown", captureKey, true);
				mounted.forEach((dispose) => dispose());
				mounted.clear();
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
		/** 只向宿主标题容器贡献自己的 React portal，不搬动标题、工具条或编辑器。 */
		function NewConversationSuggestions({ t, prefill, draftSource = emptyDraft }) {
			const hasDraft = (0, react.useSyncExternalStore)(draftSource.subscribe, draftSource.getSnapshot, emptyDraft.getSnapshot);
			const [target, setTarget] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const sync = () => setTarget(document.querySelector("[data-phase=hero] [class*=\"_composerHero\"]>:first-child>[class$=\"_stack\"]"));
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
[data-phase=hero] [class*="_heroWorkspaceRow"]{box-sizing:border-box;flex:none;width:min(calc(var(--dsh-composer-card-max-width) + 2 * var(--dsh-composer-side-clearance) - 56px),calc(100% - 56px));align-self:center;justify-content:flex-start;flex-wrap:wrap;gap:8px;min-height:48px;margin:0 28px -10px;padding:6px 12px 16px;border-radius:18px 18px 0 0;background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,var(--dsw-alias-bg-base))}
[data-phase=hero] [class*="_heroWorkspaceRow"]>[class$="_workspace"]{min-width:0;max-width:100%;font-weight:400}
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
				if (!response.ok) return false;
				return (await response.json())?.enabled === true;
			} catch {
				return false;
			}
		}
		/** 注入 Composer 相关增强样式（新会话卡片与工具菜单） */
		function installComposerStyles(doc = document) {
			const existing = doc.getElementById(COMPOSER_ENHANCEMENT_STYLE_ID);
			if (existing !== null) return () => {
				existing.remove();
			};
			const style = doc.createElement("style");
			style.id = COMPOSER_ENHANCEMENT_STYLE_ID;
			style.textContent = `\n${NEW_CONVERSATION_STYLE}\n${COMPOSER_TOOL_MENU_STYLE}\n`;
			(doc.head ?? doc.documentElement).appendChild(style);
			return () => {
				if (style.parentNode !== null) style.remove();
			};
		}
		/**
		* 启动并管理 Composer 输入框四大增强能力：
		* 1. 终端风格输入历史记录与召回 (↑/↓)
		* 2. 输入框宽度初始化与拖拽手柄
		* 3. 工具菜单优化与即时搜索
		* 4. 新建会话建议卡片
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
				cleaners.push(observeComposerToolMenus({
					search: t("home.projectSearch"),
					empty: t("home.projectEmpty")
				}));
				cleaners.push(registerInputHistory(ctx));
				function SuggestionsDock(props) {
					const sessionId = props.session.sessionId ?? currentSessionId(ctx.sessions.list.getSnapshot());
					const binding = sessionId ? ctx.sessions.binding(sessionId) : void 0;
					const input = binding ? ctx.conversation.input.for(binding.ctx) : void 0;
					const draftSource = (0, react.useMemo)(() => ({
						getSnapshot: () => {
							if (!input) return false;
							const s = input.state.getSnapshot();
							return (s?.draft?.trim()?.length ?? 0) > 0 || (s?.attachmentIds?.length ?? 0) > 0;
						},
						subscribe: (onChange) => input?.state.subscribe(onChange) ?? (() => {})
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
		//#region src/client/archive-session-delete.ts
		/** 永久删除会话由归档管理插件通过 remote.workspaceRegistry.deleteSession 提供。 */
		function hasArchiveSessionDelete(value) {
			return value !== null && typeof value === "object" && typeof value.deleteSession === "function";
		}
		//#endregion
		//#region src/client/index.ts
		const inject = [
			"slots",
			"sessions",
			"workspaces",
			"layout",
			"locale",
			"connection",
			"inputTriggers",
			"conversation"
		];
		function hasDeleteSession(value) {
			return hasArchiveSessionDelete(value);
		}
		async function runHostAction(action, execute) {
			try {
				return await execute();
			} catch (reason) {
				if (reason instanceof UserFacingError || reason instanceof HostActionError) throw reason;
				throw new HostActionError(action, reason);
			}
		}
		/** Archive Manager replaces the official ui-workspace row with this optional service. */
		async function startWorkspaceSession(ctx, workspaceId) {
			const uiWorkspace = probeService(ctx, "uiWorkspace");
			try {
				if (hasStartSession(uiWorkspace)) {
					await Promise.resolve(uiWorkspace.startSession(workspaceId));
					return true;
				}
				if (hasStartSession(ctx.workspaces)) {
					await Promise.resolve(ctx.workspaces.startSession(workspaceId));
					return true;
				}
				console.warn("DSH 工作空间服务尚未就绪，无法新建会话。");
				return false;
			} catch (error) {
				console.warn("新建会话失败：", error);
				return false;
			}
		}
		/** 替换 DSH 的官方 sidebar 插槽，不修改 DSH 源码或会话数据。 */
		function apply(ctx) {
			Object.assign(globalThis, { __dcuCurrentSessionId: currentSessionId });
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "michengai-codex-ui: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.effect(() => observeComposerEnhancements(ctx), "michengai-codex-ui: composer enhancements");
			ctx.effect(() => observeSettingsSkin(), "michengai-codex-ui: official settings skin");
			ctx.effect(() => observeSlimSidebar(), "michengai-codex-ui: slim sidebar");
			ctx.effect(() => observeSettingsNavIcon(() => t("about.nav")), "michengai-codex-ui: settings nav icon");
			const globalPanels = createGlobalPanelSource(ctx.slots, ctx.locale);
			const footerActions = createFooterActionSource(ctx.slots);
			const workspaceShortcuts = createWorkspaceShortcutSource(ctx.slots);
			ctx.effect(() => () => {
				workspaceShortcuts.dispose();
			}, "michengai-codex-ui: workspace shortcuts");
			registerWorkspaceDirectoryFlow(ctx);
			const ownSidebarChildren = { [WORKSPACE_DIRECTORY_FLOW]: {
				kind: "single",
				scope: "root"
			} };
			const sharedSidebarChildren = {
				"sidebar.panellist": {
					kind: "list",
					scope: "root"
				},
				"sidebar.workspaces": {
					kind: "single",
					scope: "root"
				},
				"sidebar.settings": {
					kind: "single",
					scope: "root"
				},
				"sidebar.footer.action": {
					kind: "list",
					scope: "root"
				}
			};
			const sidebarSlotAliases = {
				"sidebar.panellist": "sidebar.codex.panellist",
				"sidebar.workspaces": "sidebar.codex.workspaces",
				"sidebar.settings": "sidebar.codex.settings",
				"sidebar.footer.action": "sidebar.codex.footer.action"
			};
			const sidebarAliasChildren = {
				"sidebar.codex.panellist": {
					kind: "list",
					scope: "root"
				},
				"sidebar.codex.workspaces": {
					kind: "single",
					scope: "root"
				},
				"sidebar.codex.settings": {
					kind: "single",
					scope: "root"
				},
				"sidebar.codex.footer.action": {
					kind: "list",
					scope: "root"
				}
			};
			const aliasedSidebar = withSlotAliases(CodexSidebar, sidebarSlotAliases);
			const officialSidebarReady = () => ctx.slots.spec?.("sidebar.workspaces") !== void 0;
			ctx.slots.inject("sidebar", () => registerAfterOfficialWave(ctx.slots, "sidebar", officialSidebarReady, (timedOut = false) => {
				const declared = (name) => {
					const spec = ctx.slots.spec;
					return typeof spec === "function" && spec.call(ctx.slots, name) !== void 0;
				};
				const allSidebarChildren = {
					...sharedSidebarChildren,
					...ownSidebarChildren,
					...sidebarAliasChildren
				};
				const children = {};
				const candidates = timedOut ? {
					...ownSidebarChildren,
					...sidebarAliasChildren
				} : allSidebarChildren;
				for (const [name, spec] of Object.entries(candidates)) if (!declared(name)) Object.assign(children, { [name]: spec });
				const register = (next) => {
					try {
						const unregister = ctx.slots.register({
							name: "sidebar",
							priority: -1,
							registrant: "michengai-codex-ui",
							locale: NS,
							children: next,
							inject: () => ({
								workspaceShortcuts,
								openSession: (sessionId) => openConversation(ctx, ctx.layout, sessionId),
								startSession: (workspaceId) => {
									startWorkspaceSession(ctx, workspaceId);
								},
								toggleSidebar: () => {
									ctx.layout.toggleSidebar();
								},
								archiveSession,
								canDeleteSession: () => hasArchiveSessionDelete(ctx.get("remote.workspaceRegistry")),
								deleteSession,
								forkSession,
								renameSession,
								globalPanels,
								footerActions,
								selectPanel: (id) => {
									selectGlobalPanel(ctx.layout, id);
								}
							})
						}, aliasedSidebar);
						const mirrors = [];
						try {
							for (const [source, target] of Object.entries(sidebarSlotAliases)) if (typeof ctx.slots.spec === "function") mirrors.push(ctx.slots.inject(source, () => mirrorSlot({ slots: ctx.slots }, source, target)));
						} catch (error) {
							for (const dispose of mirrors.reverse()) dispose();
							unregister();
							throw error;
						}
						return () => {
							for (const dispose of mirrors.reverse()) dispose();
							unregister();
						};
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						const conflict = /slot "([^"]+)" is already declared/.exec(message);
						const conflictKey = conflict === null ? void 0 : Object.keys(next).find((key) => key === conflict[1]);
						if (conflictKey === void 0 || next[conflictKey] === void 0) throw error;
						const rest = { ...next };
						delete rest[conflictKey];
						return register(rest);
					}
				};
				return register(children);
			}, true));
			const forkSession = async (sessionId) => {
				await runHostAction("fork", () => forkHostSession(ctx, sessionId));
			};
			const renameSession = async (sessionId, title) => {
				await runHostAction("rename", async () => {
					try {
						await renameHostSession(ctx, sessionId, title);
					} catch (reason) {
						if (reason instanceof UnknownSessionError) throw new UserFacingError(t("sessions.unknown"));
						throw reason;
					}
				});
			};
			const deleteSession = async (sessionId) => {
				const registry = ctx.get("remote.workspaceRegistry");
				if (!hasDeleteSession(registry)) throw new UserFacingError(t("sessions.deleteUnavailable"));
				await runHostAction("delete", async () => {
					const result = await registry.deleteSession(sessionId);
					if (!result.ok) throw result.error === void 0 ? new UserFacingError(t("sessions.deleteUnavailable")) : result.error;
				});
			};
			const archiveSession = (sessionId) => runHostAction("archive", () => archiveHostSession(ctx, sessionId));
			ctx.slots.inject("sidebar.workspaces", () => ctx.slots.register({
				name: "sidebar.workspaces",
				priority: -1,
				locale: NS,
				inject: () => ({
					archiveSession,
					canDeleteSession: () => hasArchiveSessionDelete(ctx.get("remote.workspaceRegistry")),
					deleteSession,
					deleteWorkspace: (workspaceId) => ctx.workspaces.delete(workspaceId),
					forkSession,
					openSession: (sessionId) => openConversation(ctx, ctx.layout, sessionId),
					renameSession,
					renameWorkspace: (workspaceId, title) => ctx.workspaces.rename(workspaceId, title),
					insertWorkspaceBefore: (workspaceId, beforeWorkspaceId) => ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId),
					insertSessionBefore: (workspaceId, sessionId, beforeSessionId) => ctx.workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId),
					startSession: (workspaceId) => {
						startWorkspaceSession(ctx, workspaceId);
					},
					workspaceShortcuts
				})
			}, CodexWorkspaceBrowser));
			ctx.effect(() => {
				if (typeof window === "undefined") return () => {};
				const sessionId = new URL(window.location.href).searchParams.get("session");
				if (sessionId === null || sessionId === "") return () => {};
				const cleanSessionDeepLink = () => {
					try {
						const currentUrl = new URL(window.location.href);
						currentUrl.searchParams.delete("session");
						window.history.replaceState(null, "", currentUrl.pathname + currentUrl.search + currentUrl.hash);
					} catch {}
				};
				let opened = false;
				const openDeepLink = () => {
					if (opened) return;
					const decision = deepLinkAction(ctx.sessions.list.getSnapshot().byId, isSessionArchived(ctx, sessionId), sessionId);
					if (decision === "wait") return;
					opened = true;
					if (decision === "clean") {
						cleanSessionDeepLink();
						return;
					}
					if (!openConversation(ctx, ctx.layout, sessionId)) cleanSessionDeepLink();
				};
				openDeepLink();
				return ctx.sessions.list.subscribe(openDeepLink);
			}, "michengai-codex-ui: session deep link");
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
		exports.startWorkspaceSession = startWorkspaceSession;
		return module.exports;
	}
});
