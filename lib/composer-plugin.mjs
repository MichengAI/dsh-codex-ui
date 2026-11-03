import { r as CODEX_UI_API_ENDPOINTS, t as isSubPluginDisabledOnDisk$1 } from "./profile-resolver-1g1gXEx6.mjs";
//#region src/composer-prediction.ts
/** Same-origin endpoint the Client half posts to (JSON, kept for compatibility). */
const ENDPOINT = "/composer-prediction";
/** Streaming endpoint: SSE events `meta`, `delta`, `done`, `error`. */
const STREAM_ENDPOINT = "/composer-prediction/v2";
/** One request carries a session id, a mode, and a bounded draft. */
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
/** Closing task line of each prompt; the model sometimes echoes it. */
const NEXT_CUE = "Predict the user's next message.";
const CONTINUE_CUE = "Write only the continuation text.";
/** Prompt labels that must never surface as suggestions. */
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
/**
* Register both prediction endpoints.
* @param ctx - context exposing llm, sessions, and the web server.
* @param config - optional route, token, transcript, and candidate bounds.
*/
function apply$1(ctx, config) {
	const options = resolveOptions(config);
	const cache = /* @__PURE__ */ new Map();
	const inflight = /* @__PURE__ */ new Set();
	const getWebServer = () => ctx.webServer ?? ctx.get?.("webServer");
	ctx.effect(() => () => {
		for (const controller of inflight) controller.abort();
		inflight.clear();
		cache.clear();
	});
	ctx.effect(() => {
		const ws = getWebServer();
		if (!ws || typeof ws.register !== "function") return () => {};
		return ws.register({
			kind: "exact",
			path: ENDPOINT,
			handler: (request, response) => serveJson(ctx, options, cache, inflight, request, response)
		});
	});
	ctx.effect(() => {
		const ws = getWebServer();
		if (!ws || typeof ws.register !== "function") return () => {};
		return ws.register({
			kind: "exact",
			path: STREAM_ENDPOINT,
			handler: (request, response) => serveStream(ctx, options, cache, inflight, request, response)
		});
	});
}
function resolveOptions(config) {
	const source = config !== null && typeof config === "object" ? config : {};
	const option = (key, minimum, maximum) => {
		const value = source[key];
		return Number.isInteger(value) && value >= minimum && value <= maximum ? value : DEFAULTS[key];
	};
	const provider = textOption(source.provider, 200);
	const model = textOption(source.model, 200);
	return {
		maxOutputTokens: option("maxOutputTokens", 16, 4096),
		timeoutMs: option("timeoutMs", 1e3, 12e4),
		maxMessages: option("maxMessages", 2, 40),
		maxChars: option("maxChars", 500, 4e4),
		maxSuggestions: option("maxSuggestions", 1, 5),
		maxToolNotes: option("maxToolNotes", 0, 20),
		provider: provider !== "" && model !== "" ? provider : "",
		model: provider !== "" && model !== "" ? model : "",
		reasoningEffort: typeof source.reasoningEffort === "string" && REASONING_EFFORTS.has(source.reasoningEffort) ? source.reasoningEffort : ""
	};
}
function textOption(value, maximum) {
	return typeof value === "string" && value.length <= maximum ? value.trim() : "";
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
		} catch (error) {
			if (disconnect.signal.aborted) return;
			respond(response, 200, {
				suggestion: null,
				suggestions: [],
				reason: describeError(error)
			});
		}
	} catch (error) {
		respond(response, 500, {
			suggestion: null,
			suggestions: [],
			reason: describeError(error)
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
		} catch (error) {
			if (disconnect.signal.aborted) return;
			sendEvent(response, {
				type: "error",
				reason: describeError(error)
			});
		} finally {
			closeStream(response);
		}
	} catch (error) {
		if (response.headersSent === true) closeStream(response);
		else respond(response, 500, {
			suggestion: null,
			suggestions: [],
			reason: describeError(error)
		});
	}
}
/** Short, safe reason text for a client that only displays nothing. */
function describeError(error) {
	const message = error instanceof Error ? error.message : String(error);
	return message.length > 120 ? `${message.slice(0, 120)}…` : message;
}
/**
* Read and validate one request body, resolving the live Session it names.
* @returns `null` when the response was already written, a plan, or an error.
*/
async function planRequest(ctx, request, response) {
	const connection = ctx.connection ?? ctx.get?.("connection");
	const admission = connection?.admit ? connection.admit(request) : { peer: { principal: { kind: "owner" } } };
	if (admission && "rejection" in admission) return {
		status: admission.rejection,
		error: admission.rejection === 401 ? "unauthorized" : "forbidden"
	};
	if ((admission?.peer?.principal?.kind ?? "owner") !== "owner") return {
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
	if (request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return {
		status: 415,
		error: "unsupported-media-type"
	};
	let body;
	try {
		body = await readJsonBody(request);
	} catch {
		return {
			status: 400,
			error: "invalid-body"
		};
	}
	if (body === null || typeof body !== "object" || Array.isArray(body)) return {
		status: 400,
		error: "invalid-body"
	};
	if (body.mode !== void 0 && body.mode !== "next" && body.mode !== "continue") return {
		status: 400,
		error: "invalid-mode"
	};
	const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
	if (sessionId === "") return {
		status: 400,
		error: "missing-session"
	};
	const session = ctx.sessions.get(sessionId);
	if (session === void 0) return {
		status: 200,
		error: "session-not-live"
	};
	const mode = body?.mode === "continue" ? "continue" : "next";
	const draft = mode === "continue" && typeof body?.draft === "string" ? body.draft.slice(-4e3) : "";
	if (mode === "continue" && draft.trim() === "") return {
		status: 200,
		error: "no-draft"
	};
	const seq = Number(session.seq);
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
/**
* Run one prediction, serving from or filling the bounded result cache.
* @returns `{ items, reason }`.
*/
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
		const result = await predict(ctx, options, plan.session, plan.mode, plan.draft, joinSignals([controller.signal, ...signals]), onDelta);
		if (result.items.length > 0 && !controller.signal.aborted && !signals.some((signal) => signal.aborted)) remember(cache, plan.key, { items: result.items });
		return result;
	} finally {
		inflight.delete(controller);
	}
}
/**
* Run one auxiliary model call over the transcript tail and tool activity.
* @returns `{ items }` on success or `{ items: [], reason }` when none is usable.
*/
async function predict(ctx, options, session, mode, draft, signal, onDelta) {
	const prompt = buildPrompt(session, options, mode, draft);
	if (prompt === null) return {
		items: [],
		reason: "no-conversation"
	};
	const route = resolveRoute(ctx, session, options);
	if (route === void 0) return {
		items: [],
		reason: "no-route"
	};
	const system = (mode === "continue" ? CONTINUE_SYSTEM_PROMPT : NEXT_SYSTEM_PROMPT).replace("{max}", String(options.maxSuggestions));
	const deadline = timedSignal(signal, options.timeoutMs);
	let text = "";
	let finish;
	try {
		deadline.signal.throwIfAborted();
		const call = await ctx.llm.prepareCall({
			provider: route.provider,
			model: route.model,
			maxTokens: options.maxOutputTokens
		}, deadline.signal, (controls, model) => {
			const effort = selectEffort(model, options.reasoningEffort);
			return effort === void 0 ? controls : {
				...controls,
				reasoningEffort: effort
			};
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
			signal: deadline.signal
		})) {
			deadline.signal.throwIfAborted();
			if (chunk.type === "text-delta") {
				text += chunk.text;
				onDelta?.(chunk.text);
			} else if (chunk.type === "finish") finish = chunk.reason;
		}
		deadline.signal.throwIfAborted();
	} finally {
		deadline.dispose();
	}
	const failure = finishFailure(finish);
	if (failure !== void 0) return {
		items: [],
		reason: failure
	};
	if (finish.kind === "max-tokens") text = text.slice(0, text.lastIndexOf("\n") + 1);
	const cue = mode === "continue" ? CONTINUE_CUE : NEXT_CUE;
	const items = normalizeCandidates(text, options.maxSuggestions, mode === "continue" ? draft : "", cue);
	return items.length === 0 ? {
		items: [],
		reason: "empty"
	} : { items };
}
/**
* The llm service ends a failed or cancelled stream with a `finish` chunk whose
* reason carries the normalized failure; only a missing terminal chunk is
* genuinely "unfinished".
*/
function finishFailure(finish) {
	if (finish === void 0) return "unfinished";
	if (finish.kind === "stop" || finish.kind === "max-tokens") return void 0;
	const failure = finish.failure;
	if (typeof failure?.message === "string" && failure.message !== "") return shortReason(failure.message);
	if (typeof failure?.code === "string" && failure.code !== "") return failure.code;
	return typeof finish.kind === "string" ? finish.kind : "unfinished";
}
function shortReason(text) {
	return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}
/** Pick the requested effort when the model advertises it, else its lowest. */
function selectEffort(model, requested) {
	const efforts = model?.reasoning?.efforts;
	if (!Array.isArray(efforts) || efforts.length === 0) return void 0;
	const ids = efforts.map((effort) => effort?.id).filter((id) => typeof id === "string" && id !== "");
	if (ids.length === 0) return void 0;
	return requested !== "" && ids.includes(requested) ? requested : ids[0];
}
function remember(cache, key, entry) {
	cache.delete(key);
	cache.set(key, entry);
	if (cache.size <= 200) return;
	const oldest = cache.keys().next();
	if (!oldest.done) cache.delete(oldest.value);
}
/** Prefer the route the Session already used, unless a fixed route is configured. */
function resolveRoute(ctx, session, options) {
	if (options.provider !== "" && options.model !== "") return {
		provider: options.provider,
		model: options.model
	};
	const route = session.requestHeader()?.config;
	if (typeof route?.provider === "string" && typeof route.model === "string") return route;
	const fallback = ctx.get("agentDefaultModel")?.currentSelection();
	if (typeof fallback?.provider === "string" && typeof fallback.model === "string") return fallback;
}
/**
* Render the conversation tail, recent tool activity, and (in continuation
* mode) the draft as one bounded prompt.
* @returns `null` when `next` mode has no completed assistant reply to follow.
*/
function buildPrompt(session, options, mode, draft) {
	const picked = [];
	const notes = [];
	const callsById = /* @__PURE__ */ new Map();
	for (const message of session.deriveMessages()) {
		if (message === null || typeof message !== "object") continue;
		const blocks = Array.isArray(message.content) ? message.content : [];
		if (message.role === "user" || message.role === "assistant") {
			const text = plainText(blocks);
			if (text !== "") picked.push({
				role: message.role,
				text: clip(text, 1500)
			});
			if (message.role === "assistant" && options.maxToolNotes > 0) for (const block of blocks) {
				if (block === null || typeof block !== "object" || block.type !== "tool-call") continue;
				const note = {
					name: typeof block.name === "string" ? block.name : "tool",
					input: clip(typeof block.arguments === "string" ? block.arguments : "", 400),
					result: "",
					failed: false
				};
				notes.push(note);
				if (typeof block.id === "string") callsById.set(block.id, note);
			}
			continue;
		}
		if (message.role === "tool" && options.maxToolNotes > 0) {
			const text = clip(plainText(blocks), 500);
			const callId = typeof message.toolCallId === "string" ? message.toolCallId : "";
			const note = callId !== "" ? callsById.get(callId) : void 0;
			if (note !== void 0) {
				note.result = text;
				note.failed = message.isError === true;
			} else notes.push({
				name: "tool",
				input: "",
				result: text,
				failed: message.isError === true
			});
		}
	}
	if (mode === "next" && (picked.length === 0 || picked.at(-1)?.role !== "assistant")) return null;
	const tail = picked.slice(-options.maxMessages);
	const kept = [];
	let budget = options.maxChars;
	for (let index = tail.length - 1; index >= 0; index -= 1) {
		const message = tail[index];
		if (message.text.length > budget) {
			if (budget > 200) kept.unshift({
				role: message.role,
				text: `…${message.text.slice(-budget)}`
			});
			break;
		}
		budget -= message.text.length;
		kept.unshift(message);
	}
	const lines = ["Conversation tail (oldest first):", JSON.stringify(kept)];
	const recent = options.maxToolNotes > 0 ? notes.slice(-options.maxToolNotes) : [];
	if (recent.length > 0) {
		lines.push("", "Recent tool activity (oldest first):");
		for (const note of recent) {
			const status = note.failed ? "failed" : "ok";
			const result = note.result === "" ? "" : ` result=${JSON.stringify(clip(note.result, 320))}`;
			lines.push(`- ${note.name}(${clip(note.input, 320)}) -> ${status}${result}`);
		}
	}
	if (mode === "continue") lines.push("", "Draft text ending at the caret:", JSON.stringify(draft), "", CONTINUE_CUE);
	else lines.push("", NEXT_CUE);
	return lines.join("\n");
}
function plainText(blocks) {
	return blocks.filter((block) => block !== null && typeof block === "object" && block.type === "text" && typeof block.text === "string").map((block) => block.text).join("\n").trim();
}
function clip(text, maximum) {
	return text.length > maximum ? `${text.slice(0, maximum)}…` : text;
}
/** Split model output into clean, de-duplicated, bounded candidates. */
function normalizeCandidates(text, maximum, draft, cue = "") {
	const items = [];
	const seen = /* @__PURE__ */ new Set();
	const prefix = draft === "" ? "" : draft.trimEnd();
	const prefixLower = prefix.toLocaleLowerCase();
	const cueIdentity = identityOf(cue);
	for (const raw of text.split(/\r?\n/)) {
		const hadLeadingSpace = /^\s/u.test(raw);
		const line = raw.replace(/^(?:[-*•]|\d+[.)])\s+/u, "").replace(/^user\s*:\s*/iu, "").trim();
		if (line === "") continue;
		let body = line.replace(/^["'`\u201c\u201d]+|["'`\u201c\u201d]+$/gu, "").replace(/\s+/gu, " ");
		if (body === "" || /^none$/iu.test(body)) continue;
		if (prefixLower !== "" && body.toLocaleLowerCase().startsWith(prefixLower)) body = body.slice(prefix.length).replace(/^\s+/u, " ");
		else if (draft !== "" && hadLeadingSpace && !/^\s/u.test(body)) body = ` ${body}`;
		body = draft === "" ? body.trim() : body.replace(/\s+$/u, "");
		if (body.trim() === "") continue;
		body = boundSuggestion(body);
		if (body === "") continue;
		const identity = identityOf(body);
		if (isInstructionEcho(identity, cueIdentity)) continue;
		if (seen.has(identity)) continue;
		seen.add(identity);
		items.push(body);
		if (items.length >= maximum) break;
	}
	return items;
}
/** Normalize a line for echo comparison: lowercase, no trailing punctuation. */
function identityOf(text) {
	return text.replace(/[.:!?]+$/u, "").trim().toLocaleLowerCase();
}
/** Drop the prompt's own labels and task line when the model echoes them. */
function isInstructionEcho(identity, cueIdentity) {
	if (identity === "") return true;
	if (cueIdentity !== "" && (identity === cueIdentity || identity.startsWith(`${cueIdentity} `))) return true;
	return PROMPT_LABELS.some((label) => identity === label || identity.startsWith(`${label} `));
}
function boundSuggestion(line) {
	if (line.length <= 240) return line;
	const cut = line.slice(0, 240);
	const space = cut.lastIndexOf(" ");
	return space > 120 ? cut.slice(0, space) : cut;
}
function readJsonBody(request) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		let settled = false;
		const fail = (error) => {
			if (settled) return;
			settled = true;
			request.resume?.();
			reject(error);
		};
		request.on("data", (chunk) => {
			if (settled) return;
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				fail(/* @__PURE__ */ new Error("body-too-large"));
				return;
			}
			chunks.push(chunk);
		});
		request.on("end", () => {
			if (settled) return;
			settled = true;
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
			} catch (error) {
				reject(error);
			}
		});
		request.on("error", fail);
		request.on("aborted", () => fail(/* @__PURE__ */ new Error("request-aborted")));
		request.on("close", () => fail(/* @__PURE__ */ new Error("request-closed")));
	});
}
function openStream(response) {
	response.writeHead(200, {
		"content-type": "text/event-stream; charset=utf-8",
		"cache-control": "no-store, no-transform",
		"x-accel-buffering": "no"
	});
	response.flushHeaders?.();
}
function sendEvent(response, event) {
	if (response.writableEnded || response.destroyed) return;
	response.write(`data: ${JSON.stringify(event)}\n\n`);
}
function closeStream(response) {
	if (response.writableEnded || response.destroyed) return;
	response.end();
}
function watchDisconnect(response) {
	const controller = new AbortController();
	response.on("close", () => {
		if (!response.writableEnded) controller.abort();
	});
	return controller;
}
function respond(response, status, payload) {
	if (response.writableEnded || response.headersSent === true) return;
	response.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	response.end(JSON.stringify(payload));
}
function joinSignals(signals) {
	if (typeof AbortSignal.any === "function") return AbortSignal.any(signals);
	const controller = new AbortController();
	for (const signal of signals) {
		if (signal.aborted) {
			controller.abort();
			break;
		}
		signal.addEventListener("abort", () => controller.abort(), { once: true });
	}
	return controller.signal;
}
function timedSignal(signal, timeoutMs) {
	const controller = new AbortController();
	const abort = () => controller.abort();
	if (signal.aborted) controller.abort();
	else signal.addEventListener("abort", abort, { once: true });
	const timer = setTimeout(abort, timeoutMs);
	return {
		signal: controller.signal,
		dispose() {
			clearTimeout(timer);
			signal.removeEventListener("abort", abort);
		}
	};
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
		apply$1(ctx);
		return () => {};
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
