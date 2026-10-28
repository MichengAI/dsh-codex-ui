//#region src/client/locales.ts
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
	"sessionTitle.type.research": "研究",
	"sidebar.more": "更多",
	"sidebar.newSession": "新会话",
	"sidebar.dragToMore": "拖至此处收入更多",
	"sidebar.fixed": "始终常驻",
	"sidebar.browsePlugins": "浏览更多插件",
	"sidebar.createPlugin": "创建你的插件",
	"sidebar.createPrompt": "创建一个带左侧栏入口的 DSH 插件。"
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
	"sessionTitle.type.research": "Research",
	"sidebar.more": "More",
	"sidebar.newSession": "New chat",
	"sidebar.dragToMore": "Drag here to collapse",
	"sidebar.fixed": "Always pinned",
	"sidebar.browsePlugins": "Browse other plugins",
	"sidebar.createPlugin": "Create your plugin",
	"sidebar.createPrompt": "Create a DSH plugin with a left sidebar entry."
};
//#endregion
//#region src/session-title.ts
const AUTOMATION_SESSION_PREFIX = "dsh-automation-session-";
const CHANNEL_SESSION_PREFIX = "im:";
const SESSION_TITLE_KINDS = [
	"feature",
	"design",
	"fix",
	"optimize",
	"release",
	"explore",
	"docs",
	"research"
];
const SESSION_TITLE_EMOJI = {
	feature: "✨",
	design: "🎨",
	fix: "🐛",
	optimize: "⚡",
	release: "🚀",
	explore: "🔍",
	docs: "📝",
	research: "🔬"
};
const TYPE_KEYS = {
	feature: "sessionTitle.type.feature",
	design: "sessionTitle.type.design",
	fix: "sessionTitle.type.fix",
	optimize: "sessionTitle.type.optimize",
	release: "sessionTitle.type.release",
	explore: "sessionTitle.type.explore",
	docs: "sessionTitle.type.docs",
	research: "sessionTitle.type.research"
};
const GENERIC_THEME_SUFFIXES = [
	"类型",
	"分类",
	"相关",
	"需求",
	"问题",
	"会话",
	"标题",
	"主题",
	"内容",
	"type",
	"category",
	"related",
	"request",
	"issue",
	"session",
	"title",
	"topic",
	"content"
];
const LEADING_EMOJI = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)+\s*/u;
const TITLE_SEPARATORS = /[|｜│]/g;
function typeLabel(kind, locale) {
	const key = TYPE_KEYS[kind];
	return locale === "en" ? en[key] : zh[key];
}
function typeAliasMap() {
	const aliases = /* @__PURE__ */ new Map();
	for (const kind of SESSION_TITLE_KINDS) {
		aliases.set(kind, kind);
		aliases.set(zh[TYPE_KEYS[kind]], kind);
		aliases.set(en[TYPE_KEYS[kind]].toLowerCase(), kind);
	}
	return aliases;
}
const TYPE_ALIASES = typeAliasMap();
function resolveKind(raw) {
	return TYPE_ALIASES.get(raw) ?? TYPE_ALIASES.get(raw.toLowerCase());
}
function sessionTitleTypeLabels(locale) {
	return SESSION_TITLE_KINDS.map((kind) => typeLabel(kind, locale)).join(locale === "en" ? ", " : "、");
}
function sessionTitlePrompt(locale) {
	const dict = locale === "en" ? en : zh;
	const types = sessionTitleTypeLabels(locale);
	return {
		system: dict["sessionTitle.system"].replaceAll("{types}", types),
		userFrame: dict["sessionTitle.userFrame"]
	};
}
function localeFromTag(tag) {
	const lower = tag.trim().toLowerCase();
	if (lower === "" || lower === "c" || lower === "posix") return void 0;
	if (lower === "en" || lower.startsWith("en-")) return "en";
	if (lower === "zh" || lower.startsWith("zh-")) return "zh";
}
function parseLocaleValue(value) {
	if (typeof value === "string") return localeFromTag(value);
	if (value === null || typeof value !== "object") return void 0;
	const row = value;
	if (typeof row.getSnapshot === "function") return parseLocaleValue(row.getSnapshot());
	for (const key of [
		"locale",
		"lang",
		"language",
		"current",
		"preference"
	]) {
		const parsed = parseLocaleValue(row[key]);
		if (parsed !== void 0) return parsed;
	}
}
function inferLocaleFromMessage(text) {
	if (text === void 0 || text.trim() === "") return void 0;
	if (/[㐀-鿿]/.test(text)) return "zh";
	if (/[A-Za-z]/.test(text)) return "en";
}
function compactMessageTheme(message) {
	const line = message.replace(/\s+/g, " ").trim();
	if (Buffer.byteLength(line, "utf8") <= 40) return line;
	let used = 0;
	let output = "";
	for (const character of line) {
		const bytes = Buffer.byteLength(character, "utf8");
		if (used + bytes > 40) break;
		output += character;
		used += bytes;
	}
	return output.trimEnd();
}
/** 主题必须跟用户消息同一语言；模型串语言时改用消息原文。 */
function alignThemeToMessage(theme, message) {
	const messageLocale = inferLocaleFromMessage(message);
	const themeLocale = inferLocaleFromMessage(theme);
	if (messageLocale === void 0 || themeLocale === void 0 || messageLocale === themeLocale) return theme;
	const fallback = compactMessageTheme(message);
	return fallback === "" ? theme : fallback;
}
function resolveSessionTitleLocale(source, message) {
	return parseLocaleValue(source) ?? inferLocaleFromMessage(message) ?? "zh";
}
function inferLocaleFromTypeToken(token) {
	const lower = token.toLowerCase();
	for (const kind of SESSION_TITLE_KINDS) {
		if (en[TYPE_KEYS[kind]].toLowerCase() === lower) return "en";
		if (zh[TYPE_KEYS[kind]] === token) return "zh";
	}
	return "zh";
}
function stripLeadingNoise(part) {
	const trimmed = part.trim();
	if (/^\d{4}$/.test(trimmed)) return "";
	return trimmed.replace(/^\d{4}\s*/, "").replace(LEADING_EMOJI, "").trim();
}
function parseTypeAndTheme(raw) {
	const parts = raw.trim().replace(/^["'`]+|["'`]+$/g, "").trim().replace(TITLE_SEPARATORS, "｜").split("｜").map(stripLeadingNoise).filter((part) => part !== "");
	const type = parts[0];
	const theme = parts[1];
	if (type === void 0 || theme === void 0) return void 0;
	const kind = resolveKind(type);
	if (kind === void 0) return void 0;
	return {
		type: kind,
		theme
	};
}
function compactToken(value) {
	return value.replace(/[\s·.\-_/]/g, "");
}
function isRedundantAgainst(type, theme) {
	const normalized = compactToken(theme);
	const typeNorm = compactToken(type);
	if (normalized === "" || typeNorm === "") return false;
	if (normalized.toLowerCase() === typeNorm.toLowerCase()) return true;
	if (normalized.toLowerCase() === `新${typeNorm}`.toLowerCase()) return true;
	if (normalized.toLowerCase() === `new${typeNorm}`.toLowerCase()) return true;
	if (typeNorm !== "" && normalized.length >= typeNorm.length * 2 && normalized.length % typeNorm.length === 0 && normalized.toLowerCase() === typeNorm.repeat(normalized.length / typeNorm.length).toLowerCase()) return true;
	return GENERIC_THEME_SUFFIXES.some((suffix) => {
		const compactSuffix = compactToken(suffix);
		return normalized.toLowerCase() === compactSuffix.toLowerCase() || normalized.toLowerCase() === `${typeNorm}${compactSuffix}`.toLowerCase();
	});
}
function isRedundantTheme(type, theme) {
	const kind = resolveKind(type);
	return (kind === void 0 ? [type] : [
		typeLabel(kind, "zh"),
		typeLabel(kind, "en"),
		kind
	]).some((label) => isRedundantAgainst(label, theme));
}
function assembleSessionTitle(type, theme, locale) {
	const parsed = parseTypeAndTheme(`${type}｜${theme}`);
	if (parsed === void 0) return void 0;
	const displayLocale = locale ?? inferLocaleFromTypeToken(type);
	const label = typeLabel(parsed.type, displayLocale);
	const title = isRedundantTheme(parsed.type, parsed.theme) ? `${SESSION_TITLE_EMOJI[parsed.type]} ${label}` : `${SESSION_TITLE_EMOJI[parsed.type]} ${label}｜${parsed.theme}`;
	if (Buffer.byteLength(title, "utf8") > 80) return void 0;
	return title;
}
function shouldSkipAutoTitle(session) {
	const origin = session.origin ?? session.header?.origin;
	return session.id.startsWith(AUTOMATION_SESSION_PREFIX) || session.id.startsWith(CHANNEL_SESSION_PREFIX) || origin === "subagent" || session.header?.parentSession !== void 0 && session.header.parentSession !== "";
}
//#endregion
//#region src/session-title-provider.ts
const SESSION_TITLE_PROVIDER_ID = "codex-ui-session-title";
const MAX_INPUT_BYTES = 4096;
const MAX_OUTPUT_TOKENS = 4096;
const TIMEOUT_MS = 6e4;
function isServiceValue(value) {
	return value !== null && (typeof value === "object" || typeof value === "function");
}
function asTitleService(value) {
	if (!isServiceValue(value)) return void 0;
	return typeof value.register === "function" ? value : void 0;
}
function asLlm(value) {
	if (!isServiceValue(value)) return void 0;
	return typeof value.stream === "function" ? value : void 0;
}
function abortableSignal(signal) {
	const timeout = AbortSignal.timeout(TIMEOUT_MS);
	return signal === void 0 ? timeout : AbortSignal.any([signal, timeout]);
}
/**
* Assemble the streamed text the way the host's `BlockAssembler` does: deltas
* accumulate per block index and a closing `block-end` replaces them, so the
* adapters that send both channels cannot duplicate the title text.
*/
function collectText(chunks) {
	return (async () => {
		const parts = /* @__PURE__ */ new Map();
		let finish = "stop";
		const part = (index) => {
			let existing = parts.get(index);
			if (existing === void 0) {
				existing = {
					text: "",
					closed: false
				};
				parts.set(index, existing);
			}
			return existing;
		};
		for await (const chunk of chunks) {
			if (chunk === null || typeof chunk !== "object") continue;
			const row = chunk;
			if (row.type === "tool-call-delta" || row.block?.type === "tool-call") throw new Error("codex-ui session title output must be text");
			if (row.type === "finish") {
				finish = typeof row.reason?.kind === "string" ? row.reason.kind : "unknown";
				continue;
			}
			if (row.type !== "text-delta" && row.type !== "block-end") continue;
			if (typeof row.index !== "number" || !Number.isSafeInteger(row.index)) continue;
			if (row.type === "text-delta") {
				if (typeof row.text !== "string") continue;
				const target = part(row.index);
				if (!target.closed) target.text += row.text;
				continue;
			}
			if (row.block?.type !== "text" || typeof row.block.text !== "string") continue;
			const target = part(row.index);
			if (target.closed) continue;
			target.text = row.block.text;
			target.closed = true;
		}
		if (finish !== "stop") throw new Error(`codex-ui session title output finished with "${finish}"`);
		return [...parts.values()].map((segment) => segment.text).join("").trim().split(/\r?\n/, 1)[0] ?? "";
	})();
}
function hostLocale(host, message) {
	const settings = host.get("settings");
	return resolveSessionTitleLocale((typeof settings?.get === "function" ? settings.get("locale") : void 0) ?? host.get("locale"), message);
}
async function generateCodexSessionTitle(llm, request, locale = "zh") {
	request.signal?.throwIfAborted();
	const session = request.session;
	if (session === void 0 || shouldSkipAutoTitle(session)) throw new Error("codex-ui session title skipped");
	const first = request.messages?.[0];
	const text = first?.text?.trim() ?? "";
	if (first === void 0 || text === "") throw new Error("codex-ui session title missing message");
	const route = request.route;
	if (route === void 0 || route.provider === "" || route.model === "") throw new Error("codex-ui session title missing route");
	const prompt = sessionTitlePrompt(locale);
	const framed = `${prompt.userFrame}\n${JSON.stringify([{
		seq: first.seq,
		text
	}])}`;
	if (Buffer.byteLength(framed, "utf8") > MAX_INPUT_BYTES) throw new Error("codex-ui session title input too large");
	const signal = abortableSignal(request.signal);
	const messages = [{
		id: crypto.randomUUID(),
		role: "user",
		content: [{
			type: "text",
			text: framed
		}],
		source: {
			kind: "plugin",
			plugin: "michengai-codex-ui"
		}
	}];
	let chunks;
	if (typeof llm.prepareCall === "function") {
		const call = await llm.prepareCall({
			provider: route.provider,
			model: route.model,
			maxTokens: MAX_OUTPUT_TOKENS
		}, signal, (controls, model) => ({
			...controls,
			...model.reasoning?.efforts?.[0]?.id !== void 0 ? { reasoningEffort: model.reasoning.efforts[0].id } : {}
		}));
		chunks = call.stream({
			...call.config,
			messages,
			system: prompt.system,
			sessionId: session.id,
			purpose: "session-title",
			signal
		});
	} else chunks = llm.stream({
		provider: route.provider,
		model: route.model,
		messages,
		system: prompt.system,
		maxTokens: MAX_OUTPUT_TOKENS,
		sessionId: session.id,
		purpose: "session-title",
		signal
	});
	const raw = await collectText(chunks);
	signal.throwIfAborted();
	const parsed = parseTypeAndTheme(raw);
	if (parsed === void 0) throw new Error("codex-ui session title invalid model output");
	const title = assembleSessionTitle(parsed.type, alignThemeToMessage(parsed.theme, text), locale);
	if (title === void 0) throw new Error("codex-ui session title rejected");
	return {
		title,
		messageSeqs: typeof first.seq === "number" ? [first.seq] : [],
		model: route
	};
}
function registerSessionTitleProvider(ctx) {
	const sessionTitle = asTitleService(ctx.get("sessionTitle"));
	const llm = asLlm(ctx.get("llm"));
	if (sessionTitle === void 0 || llm === void 0) {
		ctx.logger?.warn("Codex UI 未能注册会话标题提供方：sessionTitle 或 llm 尚未就绪");
		return;
	}
	try {
		const dispose = sessionTitle.register({
			id: SESSION_TITLE_PROVIDER_ID,
			automatic: "first-prompt",
			generate: (request) => generateCodexSessionTitle(llm, request, hostLocale(ctx, request.messages?.[0]?.text))
		});
		return typeof dispose === "function" ? dispose : void 0;
	} catch (error) {
		const reason = error instanceof Error ? error.message : typeof error;
		ctx.logger?.warn(`Codex UI 未能注册会话标题提供方：${reason}`);
		return;
	}
}
//#endregion
//#region src/session-title-lifecycle.ts
const OFFICIAL_TARGETS = [{
	id: "session-title-llm",
	name: "@deepseek-ai/dsh-session-title-first-prompt-llm"
}, {
	id: "optional-session-title-all-prompts",
	name: "@deepseek-ai/dsh-session-title-all-prompts-llm"
}];
function isOfficialTarget(options) {
	if (!options) return false;
	return OFFICIAL_TARGETS.some((t) => t.id === options.id && t.name === options.name);
}
const guardRegistry = /* @__PURE__ */ new WeakMap();
function silenceOfficialProvider(host, shouldSilence) {
	const sessionTitle = host.get?.("sessionTitle");
	if (!sessionTitle || typeof sessionTitle.register !== "function") return void 0;
	const target = Object.getPrototypeOf(sessionTitle);
	if (typeof target?.register !== "function") return void 0;
	let state = guardRegistry.get(target);
	if (!state) {
		state = {
			original: target.register,
			activeGuards: /* @__PURE__ */ new Set()
		};
		target.register = function(provider) {
			const candidate = provider;
			if (candidate && candidate.id !== "codex-ui-session-title") {
				if ([...state.activeGuards].some((g) => g.shouldSilence())) return () => {};
			}
			return state.original.apply(this, arguments);
		};
		guardRegistry.set(target, state);
	}
	const guardHandle = { shouldSilence };
	state.activeGuards.add(guardHandle);
	let released = false;
	return () => {
		if (released) return;
		released = true;
		state.activeGuards.delete(guardHandle);
		if (state.activeGuards.size === 0) {
			target.register = state.original;
			guardRegistry.delete(target);
		}
	};
}
const transitions = /* @__PURE__ */ new WeakMap();
function serialize(key, work) {
	const previous = transitions.get(key);
	const next = previous ? previous.catch(() => {}).then(work) : work();
	transitions.set(key, next);
	return next;
}
/** 不主动调用 loader.update 写盘；共享 options 仍可能被其他配置写入持久化。 */
function startSessionTitleLifecycle(host) {
	let cancelled = false;
	let provider;
	let restore;
	let silencing = false;
	const restoreGuard = silenceOfficialProvider(host, () => silencing);
	const loader = host.loader;
	const candidates = typeof loader?.entries === "function" ? [...loader.entries()].filter((entry) => isOfficialTarget(entry.options)) : [];
	const key = candidates.length === 1 ? candidates[0] : host;
	const ready = serialize(key, async () => {
		if (typeof loader?.entries !== "function") return;
		{
			const matches = [...loader.entries()].filter((entry) => isOfficialTarget(entry.options));
			const enabledMatches = matches.filter((entry) => !entry.disabled);
			if (enabledMatches.length === 1) {
				const entry = enabledMatches[0];
				if (typeof entry.update !== "function" || typeof entry.fiber?.dispose !== "function") return;
				const options = entry.options;
				const original = options.disabled;
				const fiber = entry.fiber;
				const ownsDisabledState = () => [...loader.entries()].includes(entry) && entry.options === options && options.disabled === true;
				const ownsEntry = () => ownsDisabledState() && isOfficialTarget(options);
				restore = async () => {
					if (!ownsDisabledState()) return;
					silencing = false;
					await entry.update({ disabled: original ?? null });
				};
				try {
					await entry.update({ disabled: true });
				} catch (error) {
					if (ownsDisabledState()) {
						await fiber.dispose();
						await restore();
					}
					restore = void 0;
					throw error;
				}
				await fiber.dispose();
				if (!ownsEntry()) {
					await restore();
					restore = void 0;
					return;
				}
			} else if (matches.length > 0 && enabledMatches.length === 0) {
				console.warn("[michengai-codex-ui] all official session title targets are already disabled; skipping takeover.");
				return;
			} else if (matches.length > 1) {
				console.warn("[michengai-codex-ui] multiple official session title targets found; skipping takeover.");
				return;
			}
		}
		if (!cancelled) {
			provider = registerSessionTitleProvider(host);
			if (provider) silencing = true;
		}
		if (!provider) {
			await restore?.();
			restore = void 0;
		}
	});
	let disposal;
	return {
		ready,
		dispose: () => {
			cancelled = true;
			silencing = false;
			const sessionTitle = host.get?.("sessionTitle");
			if (sessionTitle?.registration?.provider?.id === "codex-ui-session-title") sessionTitle.registration.closing = true;
			return disposal ??= serialize(key, async () => {
				try {
					await ready.catch(() => {});
					await provider?.();
					provider = void 0;
					if (sessionTitle?.registration?.provider?.id === "codex-ui-session-title" && sessionTitle.registration?.closing) delete sessionTitle.registration;
				} finally {
					restoreGuard?.();
					try {
						await restore?.();
					} finally {
						restore = void 0;
					}
				}
			});
		}
	};
}
//#endregion
//#region src/session-title-plugin.ts
const name = "codex-ui-session-title";
const inject = [
	"sessionTitle",
	"llm",
	"loader"
];
/** Register teardown before asynchronous official-provider draining. */
function apply(ctx) {
	const lifecycle = startSessionTitleLifecycle(ctx);
	ctx.effect(() => lifecycle.dispose, "michengai-codex-ui: session title");
	return lifecycle.ready;
}
//#endregion
export { apply, inject, name };
