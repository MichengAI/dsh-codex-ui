import { r as CODEX_UI_API_ENDPOINTS, t as isSubPluginDisabledOnDisk$1 } from "./profile-resolver-1g1gXEx6.mjs";
//#region src/composer-prediction.ts
const CJK_REGEX = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u;
/** 判断单个字符是否为中日韩 CJK 字符 */
function isCjkCharacter(char) {
	if (!char || char.length === 0) return false;
	return CJK_REGEX.test(char);
}
/** 清洗大模型输出的一行候选项 */
function cleanPredictionCandidate(line) {
	if (!line) return "";
	let text = line.trim();
	if (text.toLowerCase() === "none") return "";
	text = text.replace(/^(?:[-*•]|\d+[.)])\s+/u, "");
	text = text.replace(/^["'`\u201c\u201d]+|["'`\u201c\u201d]+$/gu, "");
	text = text.replace(/\s+/gu, " ").trim();
	if (text.toLowerCase() === "none") return "";
	return text;
}
/** 格式化草稿与续写文本的连接：CJK 语言不加空格，英文在两词之间智能补空格 */
function formatContinuation(draft, continuation) {
	if (!draft || draft === "") return continuation;
	if (!continuation || continuation === "") return "";
	if (/\s$/u.test(draft) || /^\s/u.test(continuation)) return continuation;
	const lastChar = draft.slice(-1);
	const firstChar = continuation.slice(0, 1);
	if (isCjkCharacter(lastChar) || isCjkCharacter(firstChar)) return continuation;
	if (/^[,.;:!?\]}%]/u.test(firstChar)) return continuation;
	if ((/* @__PURE__ */ new Set([
		"(",
		"[",
		"{",
		"/",
		"\\",
		"\"",
		"'",
		"`",
		"—",
		"-"
	])).has(lastChar)) return continuation;
	return ` ${continuation}`;
}
/** 提取消息中的纯文本内容 */
function extractTextFromMessage(message) {
	if (typeof message.content === "string") return message.content;
	if (Array.isArray(message.content)) return message.content.filter((item) => item && (item.type === "text" || typeof item.text === "string")).map((item) => item.text ?? "").join("\n");
	return "";
}
const NEXT_SYSTEM_PROMPT = [
	"You are the follow-up suggestion engine inside an AI coding assistant chat UI.",
	"You receive the tail of a conversation between a USER and an AI coding agent.",
	"Predict the next messages the USER is most likely to send next.",
	"Rules:",
	"- Write as the user would type, in the language of the conversation (Chinese if user speaks Chinese).",
	"- Return up to {max} candidates, most likely first, one per line.",
	"- No numbering, bullets, quotes, markdown, or explanation.",
	"- At most 25 words per candidate; be concrete and specific.",
	"- If the assistant asked the user a question, answer it directly.",
	"- If no meaningful follow-up exists, reply with exactly: NONE"
].join("\n");
const CONTINUE_SYSTEM_PROMPT = [
	"You complete the message a USER is drafting in an AI coding assistant chat UI.",
	"You receive the tail of the conversation and the exact draft text the user is typing.",
	"Write what should come next, as the user would type it.",
	"Rules:",
	"- Return up to {max} alternative continuations, most likely first, one per line.",
	"- Continue strictly from the end of the draft; never repeat text the draft already contains.",
	"- No numbering, bullets, quotes, markdown, or explanation.",
	"- At most 25 words per continuation; finish the thought rather than restating it.",
	"- If the draft is already complete, reply with exactly: NONE"
].join("\n");
/** 构建送给模型的 Prompt */
function buildPredictionPrompt(options) {
	const max = Math.min(Math.max(options.maxSuggestions ?? 3, 1), 5);
	const maxChars = options.maxContextChars ?? 6e3;
	const system = (options.mode === "next" ? NEXT_SYSTEM_PROMPT : CONTINUE_SYSTEM_PROMPT).replace("{max}", String(max));
	const picked = [];
	let charsCount = 0;
	for (let i = options.messages.length - 1; i >= 0 && charsCount < maxChars; i--) {
		const msg = options.messages[i];
		if (!msg) continue;
		const role = msg.role === "user" ? "USER" : msg.role === "assistant" ? "ASSISTANT" : msg.role;
		const text = extractTextFromMessage(msg).trim();
		if (!text) continue;
		const budget = Math.min(2e3, maxChars - charsCount);
		const trimmed = text.length > budget ? msg.role === "user" ? text.slice(0, budget) + "…" : "…" + text.slice(-budget) : text;
		picked.unshift(`${role}: ${trimmed}`);
		charsCount += trimmed.length;
	}
	let user = `Conversation tail:\n${picked.join("\n\n")}`;
	if (options.mode === "continue") user += `\n\nUser current draft ending at caret:\n"${options.draft}"`;
	return {
		system,
		user
	};
}
/** 内存中的预测缓存 */
var PredictionCache = class {
	maxEntries;
	ttlMs;
	cache = /* @__PURE__ */ new Map();
	constructor(maxEntries = 100, ttlMs = 6e4) {
		this.maxEntries = maxEntries;
		this.ttlMs = ttlMs;
	}
	makeKey(sessionId, revision, mode, draft) {
		return `${sessionId}:${revision}:${mode}:${mode === "continue" ? draft.trim() : ""}`;
	}
	get(sessionId, revision, mode, draft) {
		const key = this.makeKey(sessionId, revision, mode, draft);
		const hit = this.cache.get(key);
		if (!hit) return void 0;
		if (Date.now() - hit.time > this.ttlMs) {
			this.cache.delete(key);
			return;
		}
		return hit.candidates;
	}
	set(sessionId, revision, mode, draft, candidates) {
		if (this.cache.size >= this.maxEntries) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey) this.cache.delete(oldestKey);
		}
		const key = this.makeKey(sessionId, revision, mode, draft);
		this.cache.set(key, {
			candidates,
			time: Date.now()
		});
	}
	clear() {
		this.cache.clear();
	}
};
//#endregion
//#region src/composer-plugin.ts
const name = "codex-ui-composer";
const inject = [
	"webServer",
	"connection",
	"llm",
	"sessions"
];
function isSubPluginDisabledOnDisk(id, homeDir, ctx) {
	return isSubPluginDisabledOnDisk$1(id, homeDir, ctx);
}
async function readJsonBody(request, maxBytes = 65536) {
	if (request[Symbol.asyncIterator] === void 0) return null;
	const chunks = [];
	let length = 0;
	for await (const chunk of request) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		length += buffer.length;
		if (length > maxBytes) return null;
		chunks.push(buffer);
	}
	try {
		const raw = Buffer.concat(chunks).toString("utf8");
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
/** 全局单例预测缓存 */
const predictionCache = new PredictionCache(120, 6e4);
/**
* Composer 输入框增强子组件 (Host 侧)
* 1. 暴露 /api/michengai/dsh-codex-ui/composer (启停状态)
* 2. 暴露 /api/michengai/dsh-codex-ui/composer/prediction (输入预测与续写)
*/
function apply(ctx) {
	const statusEndpoint = CODEX_UI_API_ENDPOINTS.composer;
	const predictionEndpoint = CODEX_UI_API_ENDPOINTS.composerPrediction;
	ctx.effect(() => {
		const webServer = ctx.get("webServer");
		if (!webServer || typeof webServer.register !== "function") return () => {};
		const disposeStatus = webServer.register({
			kind: "exact",
			path: statusEndpoint,
			handler: (_request, response) => {
				const disabled = isSubPluginDisabledOnDisk("codex-ui-composer", void 0, ctx);
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
					"cache-control": "no-store"
				});
				response.end(JSON.stringify({ enabled: !disabled }));
			}
		});
		const disposePrediction = webServer.register({
			kind: "exact",
			path: predictionEndpoint,
			handler: async (request, response) => {
				if (isSubPluginDisabledOnDisk("codex-ui-composer", void 0, ctx)) {
					response.writeHead(200, {
						"content-type": "application/json; charset=utf-8",
						"cache-control": "no-store"
					});
					response.end(JSON.stringify({
						candidates: [],
						reason: "disabled"
					}));
					return;
				}
				const rejection = ctx.get("connection")?.requestRejection?.(request);
				if (rejection !== void 0) {
					response.writeHead(rejection, {
						"content-type": "application/json; charset=utf-8",
						"cache-control": "no-store"
					});
					response.end(JSON.stringify({ error: rejection === 401 ? "Unauthorized" : "Forbidden" }));
					return;
				}
				if (request.method !== "POST") {
					response.writeHead(405, { "content-type": "application/json; charset=utf-8" });
					response.end(JSON.stringify({ error: "Method Not Allowed" }));
					return;
				}
				const body = await readJsonBody(request);
				if (!body || typeof body !== "object") {
					response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
					response.end(JSON.stringify({ error: "Invalid Body" }));
					return;
				}
				const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
				const mode = body.mode === "continue" ? "continue" : "next";
				const draft = typeof body.draft === "string" ? body.draft : "";
				if (!sessionId) {
					response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
					response.end(JSON.stringify({ candidates: [] }));
					return;
				}
				let revision = 0;
				const messages = [];
				try {
					const sessions = ctx.get("sessions");
					const binding = sessions?.binding?.(sessionId);
					revision = binding?.eventSource?.getSnapshot?.()?.revision ?? 0;
					if (binding?.session) {
						const derived = typeof sessions?.deriveMessages === "function" ? sessions.deriveMessages(binding.session) : binding.session.transcript ?? [];
						for (const item of derived) if (item && (item.role === "user" || item.role === "assistant")) messages.push({
							role: item.role,
							content: item.content
						});
					}
				} catch {}
				const cached = predictionCache.get(sessionId, revision, mode, draft);
				if (cached !== void 0) {
					response.writeHead(200, {
						"content-type": "application/json; charset=utf-8",
						"cache-control": "no-store"
					});
					response.end(JSON.stringify({
						candidates: cached,
						cached: true
					}));
					return;
				}
				if (messages.length === 0 && mode === "next") {
					response.writeHead(200, {
						"content-type": "application/json; charset=utf-8",
						"cache-control": "no-store"
					});
					response.end(JSON.stringify({ candidates: [] }));
					return;
				}
				try {
					const llm = ctx.get("llm");
					if (!llm || typeof llm.chat !== "function") {
						response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
						response.end(JSON.stringify({
							candidates: [],
							reason: "no-llm"
						}));
						return;
					}
					const prompt = buildPredictionPrompt({
						mode,
						messages,
						draft,
						maxSuggestions: 3
					});
					const llmRes = await Promise.race([llm.chat({
						system: prompt.system,
						messages: [{
							role: "user",
							content: prompt.user
						}],
						maxTokens: 120,
						reasoningEffort: "off"
					}), new Promise((_, reject) => setTimeout(() => reject(/* @__PURE__ */ new Error("timeout")), 8e3))]);
					const lines = (llmRes?.text ?? (typeof llmRes?.content === "string" ? llmRes.content : "")).split(/\r?\n/u);
					const candidates = [];
					for (const line of lines) {
						const cleaned = cleanPredictionCandidate(line);
						if (!cleaned) continue;
						const finalCandidate = mode === "continue" ? formatContinuation(draft, cleaned) : cleaned;
						if (finalCandidate && !candidates.includes(finalCandidate)) candidates.push(finalCandidate);
						if (candidates.length >= 3) break;
					}
					predictionCache.set(sessionId, revision, mode, draft, candidates);
					response.writeHead(200, {
						"content-type": "application/json; charset=utf-8",
						"cache-control": "no-store"
					});
					response.end(JSON.stringify({ candidates }));
				} catch {
					response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
					response.end(JSON.stringify({
						candidates: [],
						reason: "llm-error"
					}));
				}
			}
		});
		return () => {
			disposeStatus?.();
			disposePrediction?.();
		};
	}, "michengai-codex-ui: composer state & prediction");
}
//#endregion
export { apply, inject, isSubPluginDisabledOnDisk, name };
