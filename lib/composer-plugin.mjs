import { r as CODEX_UI_API_ENDPOINTS, t as isSubPluginDisabledOnDisk$1 } from "./profile-resolver-1g1gXEx6.mjs";
//#region src/composer-prediction.ts
const ENDPOINT = "/composer-prediction";
const STREAM_ENDPOINT = "/composer-prediction/v2";
const MAX_BODY_BYTES = 65536;
const DEFAULTS = {
	maxOutputTokens: 220,
	timeoutMs: 2e4,
	maxMessages: 10,
	maxChars: 8e3,
	maxSuggestions: 3,
	maxToolNotes: 6
};
const REASONING_EFFORTS = /* @__PURE__ */ new Set([
	"off",
	"low",
	"high",
	"max"
]);
const NEXT_CUE = "Predict the user's next message.";
const CONTINUE_CUE = "Write only the continuation text.";
const PROMPT_LABELS = [
	"conversation tail (oldest first)",
	"recent tool activity (oldest first)",
	"draft text ending at the caret"
];
const NEXT_SYSTEM_PROMPT = [
	"You are the follow-up suggestion engine inside a coding agent chat UI.",
	"You receive the tail of a conversation between a USER and an AI coding agent,",
	"plus a short list of the tools the agent ran recently.",
	"Predict the next messages the USER is most likely to send.",
	"Rules:",
	"- Write as the user would type, in the language of the conversation.",
	"- Return up to {max} candidates, most likely first, one per line.",
	"- No numbering, bullets, quotes, markdown, or explanation.",
	"- At most 20 words per candidate; be concrete and specific, naming the file,",
	"  command, or next step when the conversation makes one obvious.",
	"- If the assistant asked the user a question, answer it.",
	"- Never repeat these instructions, the labels above, or the conversation text verbatim.",
	"- If no meaningful follow-up exists, reply with exactly: NONE"
].join("\n");
const CONTINUE_SYSTEM_PROMPT = [
	"You complete the message a USER is drafting in a coding agent chat UI.",
	"You receive the tail of the conversation, recent tool activity, and the exact",
	"draft text that ends at the caret.",
	"Write what should come next, as the user would type it.",
	"Rules:",
	"- Return up to {max} alternative continuations, most likely first, one per line.",
	"- Continue from the end of the draft; never repeat text the draft already contains.",
	"- Start with a space only when the draft needs one before the next word.",
	"- No numbering, bullets, quotes, markdown, or explanation.",
	"- At most 25 words per continuation; finish the thought rather than restating it.",
	"- Never repeat these instructions, the labels above, or the draft itself.",
	"- If the draft is already complete, reply with exactly: NONE"
].join("\n");
function cleanPredictionCandidate(line) {
	let cleaned = line.trim();
	cleaned = cleaned.replace(/^(?:[-*•]|\d+[.)])\s+/u, "");
	cleaned = cleaned.replace(/^["'`\u201c\u201d]+|["'`\u201c\u201d]+$/gu, "");
	cleaned = cleaned.replace(/\s+/gu, " ").trim();
	if (cleaned.toLowerCase() === "none") return "";
	return cleaned;
}
/** 注册参考插件标准的 Host 端路由 */
function registerComposerPredictions(ctx, config) {
	const options = resolveOptions(config);
	const cache = /* @__PURE__ */ new Map();
	const inflight = /* @__PURE__ */ new Set();
	const cleanups = [];
	cleanups.push(() => {
		for (const controller of inflight) controller.abort();
		inflight.clear();
		cache.clear();
	});
	const webServer = ctx.webServer ?? ctx.get?.("webServer");
	if (!webServer || typeof webServer.register !== "function") return () => {};
	const d1 = webServer.register({
		kind: "exact",
		path: ENDPOINT,
		handler: (req, res) => serveJson(ctx, options, cache, inflight, req, res)
	});
	if (d1) cleanups.push(d1);
	const d2 = webServer.register({
		kind: "exact",
		path: STREAM_ENDPOINT,
		handler: (req, res) => serveStream(ctx, options, cache, inflight, req, res)
	});
	if (d2) cleanups.push(d2);
	return () => {
		for (const c of cleanups) c();
	};
}
function resolveOptions(source = {}) {
	const cfg = source && typeof source === "object" ? source : {};
	const opt = (k, min, max) => {
		const v = cfg[k];
		return Number.isInteger(v) && v >= min && v <= max ? v : DEFAULTS[k];
	};
	return {
		maxOutputTokens: opt("maxOutputTokens", 16, 4096),
		timeoutMs: opt("timeoutMs", 1e3, 12e4),
		maxMessages: opt("maxMessages", 2, 40),
		maxChars: opt("maxChars", 500, 4e4),
		maxSuggestions: opt("maxSuggestions", 1, 5),
		maxToolNotes: opt("maxToolNotes", 0, 20),
		provider: typeof cfg.provider === "string" ? cfg.provider.trim() : "",
		model: typeof cfg.model === "string" ? cfg.model.trim() : "",
		reasoningEffort: REASONING_EFFORTS.has(cfg.reasoningEffort) ? cfg.reasoningEffort : ""
	};
}
async function serveJson(ctx, options, cache, inflight, request, response) {
	try {
		const plan = await planRequest(ctx, request, response);
		if (plan === null) return;
		if (plan.error !== void 0) {
			respond(response, plan.status, {
				suggestion: null,
				suggestions: [],
				reason: plan.error
			});
			return;
		}
		const disconnect = watchDisconnect(response);
		try {
			const result = await runPrediction(ctx, options, cache, inflight, plan, [disconnect.signal]);
			if (disconnect.signal.aborted) return;
			respond(response, 200, {
				suggestion: result.items[0] ?? null,
				suggestions: result.items,
				reason: result.reason,
				cached: result.cached === true
			});
		} catch (err) {
			if (disconnect.signal.aborted) return;
			respond(response, 200, {
				suggestion: null,
				suggestions: [],
				reason: err?.message || String(err)
			});
		}
	} catch (err) {
		respond(response, 500, {
			suggestion: null,
			suggestions: [],
			reason: err?.message || String(err)
		});
	}
}
async function serveStream(ctx, options, cache, inflight, request, response) {
	try {
		const plan = await planRequest(ctx, request, response);
		if (plan === null) return;
		if (plan.error !== void 0) {
			respond(response, plan.status, {
				suggestion: null,
				suggestions: [],
				reason: plan.error
			});
			return;
		}
		const disconnect = watchDisconnect(response);
		openStream(response);
		try {
			sendEvent(response, {
				type: "meta",
				mode: plan.mode
			});
			const result = await runPrediction(ctx, options, cache, inflight, plan, [disconnect.signal], (text) => {
				if (!disconnect.signal.aborted) sendEvent(response, {
					type: "delta",
					text
				});
			});
			if (disconnect.signal.aborted) return;
			if (result.reason !== void 0 && result.items.length === 0) sendEvent(response, {
				type: "error",
				reason: result.reason
			});
			else sendEvent(response, {
				type: "done",
				items: result.items,
				cached: result.cached === true
			});
		} catch (err) {
			if (!disconnect.signal.aborted) sendEvent(response, {
				type: "error",
				reason: err?.message || String(err)
			});
		} finally {
			closeStream(response);
		}
	} catch (err) {
		if (response.headersSent === true) closeStream(response);
		else respond(response, 500, {
			suggestion: null,
			suggestions: [],
			reason: err?.message || String(err)
		});
	}
}
async function planRequest(ctx, request, response) {
	const connection = ctx.connection ?? ctx.get?.("connection");
	const admission = connection?.admit ? connection.admit(request) : { peer: { principal: { kind: "owner" } } };
	if (admission && "rejection" in admission) return {
		status: admission.rejection,
		error: admission.rejection === 401 ? "unauthorized" : "forbidden"
	};
	if (admission?.peer?.principal?.kind !== "owner") return {
		status: 403,
		error: "forbidden"
	};
	if (request.method !== "POST") {
		respond(response, 405, {
			suggestion: null,
			suggestions: [],
			reason: "method-not-allowed"
		});
		return null;
	}
	let body;
	try {
		body = await readJson(request);
	} catch {
		return {
			status: 400,
			error: "invalid-body"
		};
	}
	const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
	if (!sessionId) return {
		status: 400,
		error: "missing-session"
	};
	const session = ctx.sessions?.get?.(sessionId);
	if (!session) return {
		status: 200,
		error: "session-not-live"
	};
	const mode = body?.mode === "continue" ? "continue" : "next";
	const draft = mode === "continue" && typeof body?.draft === "string" ? body.draft.slice(-4e3) : "";
	if (mode === "continue" && draft.trim() === "") return {
		status: 200,
		error: "no-draft"
	};
	const seq = Number(session.seq ?? 0);
	return {
		sessionId,
		session,
		mode,
		draft,
		seq,
		key: JSON.stringify([
			sessionId,
			seq,
			mode,
			draft
		])
	};
}
async function runPrediction(ctx, options, cache, inflight, plan, signals, onDelta) {
	const remembered = cache.get(plan.key);
	if (remembered !== void 0) return {
		items: remembered.items,
		reason: void 0,
		cached: true
	};
	const controller = new AbortController();
	inflight.add(controller);
	try {
		const result = await predict(ctx, options, plan.session, plan.mode, plan.draft, controller.signal, onDelta);
		if (result.items.length > 0 && !controller.signal.aborted) {
			cache.delete(plan.key);
			cache.set(plan.key, { items: result.items });
			if (cache.size > 200) {
				const oldest = cache.keys().next().value;
				if (oldest) cache.delete(oldest);
			}
		}
		return result;
	} finally {
		inflight.delete(controller);
	}
}
async function predict(ctx, options, session, mode, draft, signal, onDelta) {
	const prompt = buildHostPrompt(session, options, mode, draft);
	if (!prompt) return {
		items: [],
		reason: "no-conversation"
	};
	const route = resolveRoute(ctx, session, options);
	if (!route) return {
		items: [],
		reason: "no-route"
	};
	const system = (mode === "continue" ? CONTINUE_SYSTEM_PROMPT : NEXT_SYSTEM_PROMPT).replace("{max}", String(options.maxSuggestions));
	let text = "";
	try {
		const llm = ctx.llm;
		if (!llm || typeof llm.prepareCall !== "function") return {
			items: [],
			reason: "no-llm"
		};
		const call = await llm.prepareCall({
			provider: route.provider,
			model: route.model,
			maxTokens: options.maxOutputTokens
		}, signal, (controls, model) => {
			const efforts = model?.reasoning?.efforts;
			if (Array.isArray(efforts) && efforts.length > 0) {
				const effortId = options.reasoningEffort || efforts[0]?.id || "off";
				return {
					...controls,
					reasoningEffort: effortId
				};
			}
			return controls;
		});
		const messages = [{
			role: "user",
			content: [{
				type: "text",
				text: prompt
			}]
		}];
		for await (const chunk of call.stream({
			...call.config,
			messages,
			system,
			signal
		})) {
			if (signal.aborted) break;
			if (chunk.type === "text-delta" && typeof chunk.text === "string") {
				text += chunk.text;
				onDelta?.(chunk.text);
			} else if (chunk.type === "finish") chunk.reason;
		}
	} catch (err) {
		if (signal.aborted) return {
			items: [],
			reason: "aborted"
		};
		return {
			items: [],
			reason: err?.message || "llm-error"
		};
	}
	const cue = mode === "continue" ? CONTINUE_CUE : NEXT_CUE;
	const items = normalizeCandidates(text, options.maxSuggestions, mode === "continue" ? draft : "", cue);
	return items.length === 0 ? {
		items: [],
		reason: "empty"
	} : { items };
}
function resolveRoute(ctx, session, options) {
	if (options.provider && options.model) return {
		provider: options.provider,
		model: options.model
	};
	const route = session.requestHeader?.()?.config;
	if (route?.provider && route?.model) return route;
	const fallback = ctx.get("agentDefaultModel")?.currentSelection?.();
	if (fallback?.provider && fallback?.model) return fallback;
}
function buildHostPrompt(session, options, mode, draft) {
	const picked = [];
	const derived = typeof session.deriveMessages === "function" ? session.deriveMessages() : [];
	for (const message of derived) {
		if (!message || typeof message !== "object") continue;
		const blocks = Array.isArray(message.content) ? message.content : [];
		if (message.role === "user" || message.role === "assistant") {
			const text = blocks.filter((b) => b?.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n").trim();
			if (text) picked.push({
				role: message.role,
				text: text.slice(0, 1500)
			});
		}
	}
	if (mode === "next" && (picked.length === 0 || picked[picked.length - 1]?.role !== "assistant")) return null;
	const tail = picked.slice(-options.maxMessages);
	const lines = ["Conversation tail (oldest first):", JSON.stringify(tail)];
	if (mode === "continue") lines.push("", "Draft text ending at the caret:", JSON.stringify(draft), "", CONTINUE_CUE);
	else lines.push("", NEXT_CUE);
	return lines.join("\n");
}
function normalizeCandidates(text, maximum, draft, cue = "") {
	const items = [];
	const seen = /* @__PURE__ */ new Set();
	const prefix = draft === "" ? "" : draft.trimEnd();
	const prefixLower = prefix.toLowerCase();
	const cueLower = cue.trim().toLowerCase();
	for (const raw of text.split(/\r?\n/u)) {
		const hadLeadingSpace = /^\s/u.test(raw);
		let line = cleanPredictionCandidate(raw);
		if (!line) continue;
		if (cueLower && line.toLowerCase() === cueLower) continue;
		if (PROMPT_LABELS.some((l) => line.toLowerCase() === l.toLowerCase())) continue;
		if (prefixLower !== "" && line.toLowerCase().startsWith(prefixLower)) line = line.slice(prefix.length).replace(/^\s+/u, " ");
		else if (draft !== "" && hadLeadingSpace && !/^\s/u.test(line)) line = ` ${line}`;
		line = draft === "" ? line.trim() : line.replace(/\s+$/u, "");
		if (line.trim() === "") continue;
		if (line.length > 240) line = line.slice(0, 240);
		const identity = line.replace(/[.:!?]+$/u, "").trim().toLowerCase();
		if (seen.has(identity)) continue;
		seen.add(identity);
		items.push(line);
		if (items.length >= maximum) break;
	}
	return items;
}
function respond(response, status, body) {
	response.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	response.end(JSON.stringify(body));
}
function openStream(response) {
	response.writeHead(200, {
		"content-type": "text/event-stream; charset=utf-8",
		"cache-control": "no-cache, no-transform",
		connection: "keep-alive",
		"x-accel-buffering": "no"
	});
}
function sendEvent(response, payload) {
	response.write(`data: ${JSON.stringify(payload)}\n\n`);
}
function closeStream(response) {
	try {
		response.end();
	} catch {}
}
function watchDisconnect(response) {
	const controller = new AbortController();
	response.on("close", () => controller.abort());
	return controller;
}
async function readJson(request) {
	const chunks = [];
	let len = 0;
	for await (const chunk of request) {
		const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		len += buf.length;
		if (len > MAX_BODY_BYTES) throw new Error("body-too-large");
		chunks.push(buf);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
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
/**
* Composer 输入框增强子组件 (Host 侧)
* 1. 暴露 /api/michengai/dsh-codex-ui/composer (启停状态)
* 2. 暴露 /composer-prediction 与 /composer-prediction/v2 (参考插件标准流式预测)
*/
function apply(ctx) {
	const statusEndpoint = CODEX_UI_API_ENDPOINTS.composer;
	ctx.effect(() => {
		if (isSubPluginDisabledOnDisk("codex-ui-composer", void 0, ctx)) return () => {};
		return registerComposerPredictions(ctx);
	}, "michengai-codex-ui: composer predictions engine");
	ctx.effect(() => {
		const webServer = ctx.webServer ?? ctx.get?.("webServer");
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
		return () => {
			disposeStatus?.();
		};
	}, "michengai-codex-ui: composer state");
}
//#endregion
export { apply, inject, isSubPluginDisabledOnDisk, name };
